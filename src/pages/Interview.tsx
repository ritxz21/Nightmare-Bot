import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { TOPICS } from "@/lib/topics";
import { VoiceOrb } from "@/components/VoiceOrb";
import { TranscriptPanel, TranscriptEntry } from "@/components/TranscriptPanel";
import { BluffMeter } from "@/components/BluffMeter";
import { KnowledgeMap, ConceptNode } from "@/components/KnowledgeMap";

const Interview = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

  const topic = TOPICS.find((t) => t.id === topicId);

  const [voiceStatus, setVoiceStatus] = useState<"idle" | "connecting" | "listening" | "speaking">("idle");
  const [bluffScore, setBluffScore] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  const concepts: ConceptNode[] = useMemo(() => {
    if (!topic) return [];
    return topic.coreConcepts.map((name) => ({
      name,
      status: "missing" as const,
    }));
  }, [topic]);

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

  const handleStartInterview = () => {
    setVoiceStatus("connecting");
    // TODO: Connect to ElevenLabs voice agent
    setTimeout(() => {
      setVoiceStatus("listening");
      setTranscript([
        {
          role: "agent",
          text: `Let's test your understanding of ${topic.title}. Start by explaining the core concept in your own words.`,
          timestamp: new Date(),
        },
      ]);
    }, 1500);
  };

  const handleEndInterview = () => {
    setVoiceStatus("idle");
    // TODO: Navigate to results
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
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
            <button
              onClick={handleStartInterview}
              className="mt-12 px-8 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 card-glow-hover transition-all duration-300"
            >
              Begin Interview
            </button>
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
