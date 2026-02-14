import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { SessionRow } from "@/lib/types";
import { exportResultsPdf } from "@/lib/exportPdf";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
// Video player that generates signed URLs for private bucket
const ResultsVideoPlayer = ({ videoPath }: { videoPath: string }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  useEffect(() => {
    const load = async () => {
      if (videoPath.startsWith("http")) { setSignedUrl(videoPath); return; }
      const { data, error } = await supabase.storage.from("interview-videos").createSignedUrl(videoPath, 3600);
      if (!error && data?.signedUrl) setSignedUrl(data.signedUrl);
    };
    load();
  }, [videoPath]);
  if (!signedUrl) return <p className="text-[10px] font-mono text-muted-foreground">Loading video...</p>;
  return (
    <div className="bg-card border border-border/50 rounded-lg p-5">
      <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Interview Recording</h3>
      <video src={signedUrl} controls className="w-full max-w-3xl mx-auto rounded-lg border border-border/50 bg-black" />
    </div>
  );
};

const Results = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!sessionId) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (!error && data) setSession(data as unknown as SessionRow);
      setLoading(false);
    };
    load();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono text-sm animate-pulse">Loading results...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Session not found.</p>
          <button onClick={() => navigate("/")} className="text-primary font-mono text-sm underline underline-offset-4">← Back to home</button>
        </div>
      </div>
    );
  }

  const bluffData = (session.bluff_history || []).map((point, i) => ({
    index: i + 1,
    score: Math.round(point.score),
    label: `Q${i + 1}`,
  }));

  const concepts = session.concept_coverage || [];
  const clearCount = concepts.filter((c) => c.status === "clear").length;
  const shallowCount = concepts.filter((c) => c.status === "shallow").length;
  const missingCount = concepts.filter((c) => c.status === "missing").length;

  const radarData = concepts.map((c) => ({
    concept: c.name.length > 12 ? c.name.slice(0, 12) + "…" : c.name,
    depth: c.status === "clear" ? 100 : c.status === "shallow" ? 50 : 10,
  }));

  const getGrade = (score: number) => {
    if (score < 20) return { label: "Expert", color: "text-concept-green", desc: "Deep, authentic understanding" };
    if (score < 40) return { label: "Solid", color: "text-concept-green", desc: "Good grasp with minor gaps" };
    if (score < 60) return { label: "Surface", color: "text-concept-yellow", desc: "Shallow understanding detected" };
    if (score < 80) return { label: "Bluffer", color: "text-primary", desc: "Significant knowledge gaps" };
    return { label: "Exposed", color: "text-primary", desc: "Mostly bluffing detected" };
  };

  const grade = getGrade(session.final_bluff_score);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/history")} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono">←</button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">Results</span>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{session.topic_title}</span>
        </div>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="max-w-5xl mx-auto space-y-10">
          {/* Hero Score */}
          <div className="text-center space-y-3">
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Final Bluff Score</p>
            <div className={`text-8xl font-bold font-mono ${grade.color} text-glow`}>
              {Math.round(session.final_bluff_score)}%
            </div>
            <div className="space-y-1">
              <p className={`text-2xl font-bold ${grade.color}`}>{grade.label}</p>
              <p className="text-sm text-muted-foreground">{grade.desc}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Concepts Clear</p>
              <p className="text-3xl font-bold font-mono text-concept-green">{clearCount}</p>
              <p className="text-xs text-muted-foreground mt-1">of {concepts.length}</p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Shallow</p>
              <p className="text-3xl font-bold font-mono text-concept-yellow">{shallowCount}</p>
              <p className="text-xs text-muted-foreground mt-1">needs depth</p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Missing</p>
              <p className="text-3xl font-bold font-mono text-primary">{missingCount}</p>
              <p className="text-xs text-muted-foreground mt-1">not covered</p>
            </div>
            <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
              <p className="text-3xl font-bold font-mono text-foreground">{(() => {
                const mins = Math.round((new Date(session.updated_at).getTime() - new Date(session.created_at).getTime()) / 60000);
                return mins < 1 ? "<1m" : `${mins}m`;
              })()}</p>
              <p className="text-xs text-muted-foreground mt-1">interview time</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bluff Progression */}
            <div className="bg-card border border-border/50 rounded-lg p-5">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Bluff Score Over Time</h3>
              {bluffData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={bluffData}>
                    <defs>
                      <linearGradient id="bluffGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 16%)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "12px" }}
                      labelStyle={{ color: "hsl(240, 5%, 55%)" }}
                      itemStyle={{ color: "hsl(0, 72%, 51%)" }}
                    />
                    <Area type="monotone" dataKey="score" stroke="hsl(0, 72%, 51%)" fill="url(#bluffGrad)" strokeWidth={2} dot={{ r: 4, fill: "hsl(0, 72%, 51%)" }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic text-center py-12">No bluff data recorded.</p>
              )}
            </div>

            {/* Depth Radar */}
            <div className="bg-card border border-border/50 rounded-lg p-5">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Concept Depth Radar</h3>
              {radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="hsl(240, 10%, 16%)" />
                    <PolarAngleAxis dataKey="concept" tick={{ fontSize: 9, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                    <Radar name="Depth" dataKey="depth" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-muted-foreground/50 italic text-center py-12">No concept data.</p>
              )}
            </div>
          </div>

          {/* Video Recording */}
          {session.video_url && <ResultsVideoPlayer videoPath={session.video_url} />}

          {/* Knowledge Map */}
          <div className="bg-card border border-border/50 rounded-lg p-5">
            <KnowledgeMap concepts={concepts} />
          </div>

          {/* Transcript */}
          <div className="bg-card border border-border/50 rounded-lg p-5">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Full Transcript</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {(session.transcript || []).map((entry, i) => (
                <div key={i} className={`flex flex-col gap-0.5 ${entry.role === "agent" ? "items-start" : "items-end"}`}>
                  <span className="text-[9px] font-mono text-muted-foreground/40 uppercase">
                    {entry.role === "agent" ? "Interviewer" : "Candidate"}
                  </span>
                  <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    entry.role === "agent" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-foreground border border-primary/20"
                  }`}>
                    {entry.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-4 pb-8">
            <button onClick={() => navigate("/")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Try Another Topic
            </button>
            <button onClick={() => exportResultsPdf(session)} className="px-6 py-2.5 rounded-md border border-primary/50 text-sm font-mono text-primary hover:bg-primary/10 transition-colors">
              Export PDF
            </button>
            <button onClick={() => navigate("/history")} className="px-6 py-2.5 rounded-md border border-border text-sm font-mono text-muted-foreground hover:text-foreground transition-colors">
              View History
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Results;
