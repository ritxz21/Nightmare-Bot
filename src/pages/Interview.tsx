import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useConversation } from "@elevenlabs/react";
import { TOPICS } from "@/lib/topics";
import { VoiceOrb } from "@/components/VoiceOrb";
import { TranscriptPanel, TranscriptEntry } from "@/components/TranscriptPanel";
import { BluffMeter } from "@/components/BluffMeter";
import { KnowledgeMap, ConceptNode } from "@/components/KnowledgeMap";
import { supabase } from "@/integrations/supabase/client";

const Interview = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  const topic = TOPICS.find((t) => t.id === topicId);

  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "listening" | "speaking">("idle");
  const [bluffScore, setBluffScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const transcriptRef = useRef<TranscriptEntry[]>([]);

  // Initialize concepts from topic
  useEffect(() => {
    if (topic) {
      setConcepts(
        topic.coreConcepts.map((name) => ({
          name,
          status: "missing" as const,
        }))
      );
    }
  }, [topic]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("Connected to ElevenLabs agent");
      setVoiceStatus("listening");
      setError(null);
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs agent");
      setVoiceStatus("idle");
    },
    onMessage: (payload) => {
      console.log("Message from agent:", payload);
      const entry: TranscriptEntry = {
        role: payload.role === "agent" ? "agent" : "user",
        text: payload.message,
        timestamp: new Date(),
      };
      if (entry.text) {
        transcriptRef.current = [...transcriptRef.current, entry];
        setTranscript([...transcriptRef.current]);
      }
    },
    onError: (err) => {
      console.error("ElevenLabs error:", err);
      setError("Voice connection failed. Please try again.");
      setVoiceStatus("idle");
    },
  });

  // Track speaking state
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

      const { data, error: fnError } = await supabase.functions.invoke(
        "elevenlabs-signed-url"
      );

      if (fnError || !data?.signed_url) {
        throw new Error(fnError?.message || "Failed to get signed URL");
      }

      await conversation.startSession({
        signedUrl: data.signed_url,
      });
    } catch (err) {
      console.error("Failed to start interview:", err);
      setError(
        err instanceof Error ? err.message : "Failed to start interview"
      );
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
          <button
            onClick={() => navigate("/")}
            className="text-primary font-mono text-sm underline underline-offset-4"
          >
            ← Back to topics
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (voiceStatus !== "idle") {
                  handleEndInterview();
                }
                navigate("/");
              }}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono"
            >
              ←
            </button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
                {topic.title}
              </span>
            </div>
          </div>

          {voiceStatus !== "idle" && (
            <button
              onClick={handleEndInterview}
              className="px-4 py-1.5 rounded-md text-xs font-mono bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-colors"
            >
              End Interview
            </button>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Voice + Controls */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <VoiceOrb status={voiceStatus} />

          {voiceStatus === "idle" && (
            <div className="flex flex-col items-center gap-4 mt-12">
              <button
                onClick={handleStartInterview}
                className="px-8 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 card-glow-hover transition-all duration-300"
              >
                Begin Interview
              </button>
              {error && (
                <p className="text-xs text-destructive font-mono max-w-sm text-center">
                  {error}
                </p>
              )}
            </div>
          )}

          {/* Bluff Meter - below orb when active */}
          {voiceStatus !== "idle" && (
            <div className="w-full max-w-sm mt-12">
              <BluffMeter score={bluffScore} />
            </div>
          )}
        </div>

        {/* Right Sidebar: Transcript + Knowledge Map */}
        <aside className="w-96 border-l border-border/50 flex flex-col bg-card/50">
          {/* Transcript - top half */}
          <div className="flex-1 overflow-hidden border-b border-border/30">
            <TranscriptPanel entries={transcript} />
          </div>

          {/* Knowledge Map - bottom */}
          <div className="p-4 overflow-y-auto max-h-[45%]">
            <KnowledgeMap concepts={concepts} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Interview;
