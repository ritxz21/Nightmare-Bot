import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useConversation } from "@elevenlabs/react";
import { TOPICS } from "@/lib/topics";
import { VoiceOrb } from "@/components/VoiceOrb";
import { TranscriptPanel, TranscriptEntry } from "@/components/TranscriptPanel";
import { BluffMeter } from "@/components/BluffMeter";
import { KnowledgeMap, ConceptNode } from "@/components/KnowledgeMap";
import { supabase } from "@/integrations/supabase/client";
import { DifficultyLevel, DEFAULT_DIFFICULTY, DIFFICULTIES } from "@/lib/difficulty";
import { LeaderboardPrompt } from "@/components/LeaderboardPrompt";

interface AnalysisResult {
  concepts_mentioned_clearly: string[];
  concepts_mentioned_shallowly: string[];
  concepts_missing: string[];
  vagueness_score: number;
  confidence_language_detected: boolean;
  depth_score: number;
  follow_up_question: string;
  bluff_probability: number;
}

const Interview = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const difficulty = (searchParams.get("difficulty") as DifficultyLevel) || DEFAULT_DIFFICULTY;
  const diffConfig = DIFFICULTIES.find((d) => d.id === difficulty);
  const jobRoleId = searchParams.get("jobRoleId") || null;
  const inviteId = searchParams.get("inviteId") || null;

  const topic = (() => {
    const predefined = TOPICS.find((t) => t.id === topicId);
    if (predefined) return predefined;
    const resumeTopicParam = searchParams.get("resumeTopic");
    if (resumeTopicParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(resumeTopicParam));
        return { id: parsed.id, title: parsed.title, description: "", icon: "📄", coreConcepts: parsed.coreConcepts };
      } catch { return null; }
    }
    return null;
  })();

  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "listening" | "speaking">("idle");
  const [bluffScore, setBluffScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showLeaderboardPrompt, setShowLeaderboardPrompt] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const lastAnalysisRef = useRef<AnalysisResult | null>(null);
  const pendingUserTextRef = useRef("");
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const bluffHistoryRef = useRef<{ timestamp: string; score: number }[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const startingRef = useRef(false);
  const intentionalEndRef = useRef(false);

  // Use refs for callbacks to avoid infinite re-render loops with useConversation
  const scheduleAnalysisRef = useRef<(text: string) => void>(() => {});
  const persistSessionRef = useRef<(updates: Record<string, unknown>) => Promise<void>>(async () => {});

  useEffect(() => {
    if (topic) {
      setConcepts(topic.coreConcepts.map((name) => ({ name, status: "missing" as const })));
    }
  }, [topic]);

  const persistSession = useCallback(async (updates: Record<string, unknown>) => {
    if (!sessionIdRef.current) return;
    const { error: updateError } = await supabase
      .from("interview_sessions")
      .update(updates)
      .eq("id", sessionIdRef.current);
    if (updateError) console.error("Failed to persist session:", updateError);
  }, []);

  persistSessionRef.current = persistSession;

  const createSession = useCallback(async () => {
    if (!topic) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Mark any old in-progress sessions as disconnected first
    await supabase
      .from("interview_sessions")
      .update({ status: "disconnected" })
      .eq("user_id", user.id)
      .eq("topic_id", topic.id)
      .eq("status", "in_progress");

    const { data, error: insertError } = await supabase
      .from("interview_sessions")
      .insert({
        user_id: user.id,
        topic_id: topic.id,
        topic_title: topic.title,
        concept_coverage: topic.coreConcepts.map((name) => ({ name, status: "missing" })) as unknown as import("@/integrations/supabase/types").Json,
        mode: jobRoleId ? "company" : "mock",
        ...(jobRoleId ? { job_role_id: jobRoleId } : {}),
      })
      .select("id")
      .single();
    if (insertError) { console.error("Failed to create session:", insertError); return; }
    sessionIdRef.current = data.id;
  }, [topic, jobRoleId]);

  const analyzeUserResponse = useCallback(async (userText: string) => {
    if (!topic || !userText.trim()) return;
    setIsAnalyzing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-response", {
        body: {
          userResponse: userText,
          topic: topic.title,
          coreConcepts: topic.coreConcepts,
          difficulty,
          previousAnalysis: lastAnalysisRef.current
            ? { bluff_probability: lastAnalysisRef.current.bluff_probability, missing_concepts: lastAnalysisRef.current.concepts_missing }
            : null,
        },
      });
      if (fnError) { console.error("Analysis error:", fnError); return; }
      const analysis = data as AnalysisResult;
      lastAnalysisRef.current = analysis;
      setBluffScore(analysis.bluff_probability);
      bluffHistoryRef.current = [...bluffHistoryRef.current, { timestamp: new Date().toISOString(), score: analysis.bluff_probability }];
      setConcepts((prev) => {
        const updated: ConceptNode[] = prev.map((concept) => {
          if (analysis.concepts_mentioned_clearly.some((c) => c.toLowerCase() === concept.name.toLowerCase())) return { name: concept.name, status: "clear" as const };
          if (analysis.concepts_mentioned_shallowly.some((c) => c.toLowerCase() === concept.name.toLowerCase())) return { name: concept.name, status: concept.status === "clear" ? "clear" as const : "shallow" as const };
          return concept;
        });
        persistSessionRef.current({ bluff_history: bluffHistoryRef.current, concept_coverage: updated, final_bluff_score: analysis.bluff_probability });
        return updated;
      });
      if (analysis.follow_up_question && conversationRef.current?.status === "connected") {
        conversationRef.current.sendContextualUpdate(
          `Based on the user's response, ask this follow-up question: "${analysis.follow_up_question}". Be direct and slightly adversarial. ${analysis.bluff_probability > 60 ? "The user appears to be bluffing — call it out subtly." : ""}`
        );
      }
    } catch (err) {
      console.error("Failed to analyze:", err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [topic, difficulty]);

  const scheduleAnalysis = useCallback((text: string) => {
    pendingUserTextRef.current += " " + text;
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    analyzeTimeoutRef.current = setTimeout(() => {
      const fullText = pendingUserTextRef.current.trim();
      if (fullText) { analyzeUserResponse(fullText); pendingUserTextRef.current = ""; }
    }, 2000);
  }, [analyzeUserResponse]);

  scheduleAnalysisRef.current = scheduleAnalysis;

  // Stable callbacks via refs to prevent useConversation from re-initializing
  const conversation = useConversation({
    onConnect: () => { setVoiceStatus("listening"); setError(null); },
    onDisconnect: () => {
      setVoiceStatus("idle");
      // Only mark as disconnected if it wasn't an intentional end
      if (sessionIdRef.current && !intentionalEndRef.current) {
        persistSessionRef.current({ status: "disconnected" });
      }
    },
    onMessage: (payload) => {
      const entry: TranscriptEntry = { role: payload.role === "agent" ? "agent" : "user", text: payload.message, timestamp: new Date() };
      if (entry.text) {
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);
        persistSessionRef.current({ transcript: transcriptRef.current.map((e) => ({ role: e.role, text: e.text, timestamp: e.timestamp.toISOString() })) });
        if (payload.role === "user") scheduleAnalysisRef.current(entry.text);
      }
    },
    onError: (err) => { console.error("ElevenLabs error:", err); setError("Voice connection failed. Please try again."); setVoiceStatus("idle"); },
  });

  conversationRef.current = conversation;

  useEffect(() => {
    if (conversation.status === "connected") {
      setVoiceStatus(conversation.isSpeaking ? "speaking" : "listening");
    }
  }, [conversation.isSpeaking, conversation.status]);

  // Mark session as disconnected if user closes/navigates away
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        supabase.from("interview_sessions").update({ status: "disconnected" }).eq("id", sessionIdRef.current).then();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Video recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Recording failed:", err);
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    setIsRecording(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && sessionIdRef.current && recordedChunksRef.current.length > 0) {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const path = `${user.id}/${sessionIdRef.current}.webm`;
      const { error: uploadErr } = await supabase.storage.from("interview-videos").upload(path, blob);
      if (!uploadErr) {
        await persistSession({ video_url: path });
      }
    }
  };

  const handleStartInterview = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    intentionalEndRef.current = false;
    setVoiceStatus("connecting");
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await createSession();
      const { data, error: fnError } = await supabase.functions.invoke("elevenlabs-signed-url");
      if (fnError || !data?.signed_url) throw new Error(fnError?.message || "Failed to get signed URL");

      let overrides: Record<string, any> | undefined;
      if (jobRoleId) {
        const { data: roleData } = await supabase.from("job_roles").select("*").eq("id", jobRoleId).single();
        const roleName = roleData ? `${roleData.job_title} at ${roleData.company_name}` : "";
        const firstTopic = topic?.coreConcepts?.[0] || topic?.title || "";
        overrides = {
          agent: {
            prompt: {
              prompt: `You are conducting a technical interview for the role of "${roleName}". The candidate is being assessed on "${topic?.title}". Core concepts to probe: ${topic?.coreConcepts?.join(", ")}. Start by asking about "${firstTopic}" and progressively go deeper. Be professional but slightly adversarial — probe for genuine understanding vs surface-level answers.`,
            },
            firstMessage: `Hello! I'll be your interviewer today for the ${roleName ? roleName + " position" : "interview"}. Let's start with ${topic?.title} — can you walk me through your understanding of ${firstTopic}?`,
          },
        };
      } else {
        overrides = {
          agent: {
            prompt: {
              prompt: `You are conducting a technical interview on "${topic?.title}". Core concepts to probe: ${topic?.coreConcepts?.join(", ")}. Start with "${topic?.coreConcepts?.[0] || topic?.title}" and progressively go deeper. Be professional but slightly adversarial.`,
            },
            firstMessage: `Hi there! Today we'll dive into ${topic?.title}. Let's start — can you tell me about ${topic?.coreConcepts?.[0] || topic?.title}?`,
          },
        };
      }

      await conversation.startSession({ signedUrl: data.signed_url, overrides });
      startRecording();
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(err instanceof Error ? err.message : "Failed to start interview");
      setVoiceStatus("idle");
    } finally {
      startingRef.current = false;
    }
  }, [conversation, createSession, topic, jobRoleId]);

  const handleEndInterview = useCallback(async () => {
    intentionalEndRef.current = true;
    const sid = sessionIdRef.current;
    sessionIdRef.current = null;
    await stopRecording();
    await conversation.endSession();
    if (inviteId) {
      await supabase.from("interview_invites").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", inviteId);
    }
    if (sid) {
      await supabase.from("interview_sessions").update({ status: "completed" }).eq("id", sid);
    }
    
    const score = bluffHistoryRef.current.length > 0
      ? bluffHistoryRef.current[bluffHistoryRef.current.length - 1].score
      : bluffScore;
    setFinalScore(score);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user && topic) {
      setShowLeaderboardPrompt(true);
    } else {
      setVoiceStatus("idle");
      if (sid) navigate(`/results/${sid}`);
      else navigate("/");
    }
  }, [conversation, navigate, inviteId, bluffScore, topic]);

  const handleLeaderboardSubmit = async (name: string) => {
    if (!topic) return;
    await supabase.from("leaderboard_entries").insert({
      player_name: name,
      topic_id: topic.id,
      topic_title: topic.title,
      avg_bluff_score: finalScore,
      best_bluff_score: finalScore,
      sessions_count: 1,
    });
    setShowLeaderboardPrompt(false);
    setVoiceStatus("idle");
    navigate("/leaderboard");
  };

  const handleLeaderboardSkip = () => {
    setShowLeaderboardPrompt(false);
    setVoiceStatus("idle");
    navigate("/");
  };

  if (!topic) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Topic not found.</p>
          <button onClick={() => navigate("/")} className="text-primary font-mono text-sm underline underline-offset-4">← Back to topics</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { if (voiceStatus !== "idle") handleEndInterview(); navigate("/"); }} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono">←</button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">{topic.title}</span>
            </div>
            {diffConfig && (
              <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">{diffConfig.emoji} {diffConfig.label}</span>
            )}
            {jobRoleId && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">COMPANY</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isRecording && <span className="text-[10px] font-mono text-primary animate-pulse flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary" />REC</span>}
            {isAnalyzing && <span className="text-[10px] font-mono text-muted-foreground animate-pulse">analyzing...</span>}
            {voiceStatus !== "idle" && (
              <button onClick={handleEndInterview} className="px-4 py-1.5 rounded-md text-xs font-mono bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors">
                End Interview
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <VoiceOrb status={voiceStatus} />
          {voiceStatus === "idle" && (
            <div className="flex flex-col items-center gap-4 mt-12">
              <button onClick={handleStartInterview} className="px-8 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 card-glow-hover transition-all duration-300">
                Begin Interview
              </button>
              {error && <p className="text-xs text-destructive font-mono max-w-sm text-center">{error}</p>}
            </div>
          )}
          {voiceStatus !== "idle" && (
            <div className="w-full max-w-sm mt-12">
              <BluffMeter score={bluffScore} />
            </div>
          )}
        </div>

        <aside className="w-96 border-l border-border/50 flex flex-col bg-card/50">
          <div className="flex-1 overflow-hidden border-b border-border/30">
            <TranscriptPanel entries={transcript} />
          </div>
          <div className="p-4 overflow-y-auto max-h-[45%]">
            <KnowledgeMap concepts={concepts} />
          </div>
        </aside>
      </div>

      {topic && (
        <LeaderboardPrompt
          open={showLeaderboardPrompt}
          topicId={topic.id}
          topicTitle={topic.title}
          bluffScore={finalScore}
          onSubmit={handleLeaderboardSubmit}
          onSkip={handleLeaderboardSkip}
        />
      )}
    </div>
  );
};

export default Interview;
