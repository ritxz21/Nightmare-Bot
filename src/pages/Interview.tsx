import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConversation } from "@elevenlabs/react";
import { TOPICS } from "@/lib/topics";
import { VoiceOrb } from "@/components/VoiceOrb";
import { TranscriptPanel, TranscriptEntry } from "@/components/TranscriptPanel";
import { BluffMeter } from "@/components/BluffMeter";
import { KnowledgeMap, ConceptNode } from "@/components/KnowledgeMap";
import { supabase } from "@/integrations/supabase/client";

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
  const navigate = useNavigate();
  const topic = TOPICS.find((t) => t.id === topicId);

  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "listening" | "speaking">("idle");
  const [bluffScore, setBluffScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const transcriptRef = useRef<TranscriptEntry[]>([]);
  const lastAnalysisRef = useRef<AnalysisResult | null>(null);
  const pendingUserTextRef = useRef("");
  const analyzeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conversationRef = useRef<ReturnType<typeof useConversation> | null>(null);

  useEffect(() => {
    if (topic) {
      setConcepts(topic.coreConcepts.map((name) => ({ name, status: "missing" as const })));
    }
  }, [topic]);

  const analyzeUserResponse = useCallback(async (userText: string) => {
    if (!topic || !userText.trim()) return;

    setIsAnalyzing(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("analyze-response", {
        body: {
          userResponse: userText,
          topic: topic.title,
          coreConcepts: topic.coreConcepts,
          previousAnalysis: lastAnalysisRef.current
            ? { bluff_probability: lastAnalysisRef.current.bluff_probability, missing_concepts: lastAnalysisRef.current.concepts_missing }
            : null,
        },
      });

      if (fnError) { console.error("Analysis error:", fnError); return; }

      const analysis = data as AnalysisResult;
      lastAnalysisRef.current = analysis;
      setBluffScore(analysis.bluff_probability);

      setConcepts((prev) =>
        prev.map((concept) => {
          if (analysis.concepts_mentioned_clearly.some((c) => c.toLowerCase() === concept.name.toLowerCase())) {
            return { ...concept, status: "clear" as const };
          }
          if (analysis.concepts_mentioned_shallowly.some((c) => c.toLowerCase() === concept.name.toLowerCase())) {
            return { ...concept, status: concept.status === "clear" ? "clear" : "shallow" as const };
          }
          return concept;
        })
      );

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
  }, [topic]);

  const scheduleAnalysis = useCallback((text: string) => {
    pendingUserTextRef.current += " " + text;
    if (analyzeTimeoutRef.current) clearTimeout(analyzeTimeoutRef.current);
    analyzeTimeoutRef.current = setTimeout(() => {
      const fullText = pendingUserTextRef.current.trim();
      if (fullText) {
        analyzeUserResponse(fullText);
        pendingUserTextRef.current = "";
      }
    }, 2000);
  }, [analyzeUserResponse]);

  const conversation = useConversation({
    onConnect: () => { setVoiceStatus("listening"); setError(null); },
    onDisconnect: () => { setVoiceStatus("idle"); },
    onMessage: (payload) => {
      const entry: TranscriptEntry = {
        role: payload.role === "agent" ? "agent" : "user",
        text: payload.message,
        timestamp: new Date(),
      };
      if (entry.text) {
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);
        if (payload.role === "user") scheduleAnalysis(entry.text);
      }
    },
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      setError("Voice connection failed. Please try again.");
      setVoiceStatus("idle");
    },
  });

  // Keep ref in sync
  conversationRef.current = conversation;

  useEffect(() => {
    if (conversation.status === "connected") {
      setVoiceStatus(conversation.isSpeaking ? "speaking" : "listening");
    }
  }, [conversation.isSpeaking, conversation.status]);

  const handleStartInterview = useCallback(async () => {
    setVoiceStatus("connecting");
    setError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error: fnError } = await supabase.functions.invoke("elevenlabs-signed-url");
      if (fnError || !data?.signed_url) throw new Error(fnError?.message || "Failed to get signed URL");
      await conversation.startSession({ signedUrl: data.signed_url });
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(err instanceof Error ? err.message : "Failed to start interview");
      setVoiceStatus("idle");
    }
  }, [conversation]);

  const handleEndInterview = useCallback(async () => {
    await conversation.endSession();
    setVoiceStatus("idle");
  }, [conversation]);

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
            <button
              onClick={() => { if (voiceStatus !== "idle") handleEndInterview(); navigate("/"); }}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono"
            >←</button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">{topic.title}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
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
    </div>
  );
};

export default Interview;
