import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SessionRow } from "@/lib/types";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<SessionRow | null>(null);
  const [user, setUser] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      setUser(true);
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        const rows = data as unknown as SessionRow[];
        setSessions(rows);
        if (rows.length > 0) setSelectedSession(rows[0]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-concept-green";
    if (score < 60) return "text-concept-yellow";
    return "text-primary";
  };

  const getScoreBg = (score: number) => {
    if (score < 30) return "bg-concept-green/10 border-concept-green/20";
    if (score < 60) return "bg-concept-yellow/10 border-concept-yellow/20";
    return "bg-primary/10 border-primary/20";
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getBluffSpikes = (history: SessionRow["bluff_history"]) => {
    if (!history || history.length < 2) return [];
    return history
      .map((point, i) => ({ ...point, index: i, delta: i > 0 ? point.score - history[i - 1].score : 0 }))
      .filter((p) => p.score > 60 || p.delta > 15);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono text-sm animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground font-mono text-sm">Sign in to access the interviewer dashboard.</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Sign In</button>
      </div>
    );
  }

  const spikeData = selectedSession ? getBluffSpikes(selectedSession.bluff_history) : [];
  const chartData = (selectedSession?.bluff_history || []).map((point, i) => ({
    index: i + 1,
    score: Math.round(point.score),
    label: `Q${i + 1}`,
    isSpike: spikeData.some((s) => s.index === i),
  }));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono">←</button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">Interviewer Dashboard</span>
            </div>
          </div>
          <span className="text-xs font-mono text-muted-foreground">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Candidate List */}
        <aside className="w-80 border-r border-border/50 overflow-y-auto bg-card/30">
          <div className="p-4">
            <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">Candidates</h3>
          </div>
          {sessions.length === 0 && (
            <p className="text-xs text-muted-foreground/50 italic text-center px-4">No sessions yet.</p>
          )}
          {sessions.map((s) => {
            const concepts = s.concept_coverage || [];
            const clear = concepts.filter((c) => c.status === "clear").length;
            const isSelected = selectedSession?.id === s.id;

            return (
              <button
                key={s.id}
                onClick={() => setSelectedSession(s)}
                className={`w-full px-4 py-3 text-left border-b border-border/20 transition-colors ${
                  isSelected ? "bg-secondary/50 border-l-2 border-l-primary" : "hover:bg-secondary/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground">{s.topic_title}</span>
                  <span className={`text-sm font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>
                    {Math.round(s.final_bluff_score)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">{formatDate(s.created_at)}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{clear}/{concepts.length} clear</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Right: Detail Panel */}
        <main className="flex-1 overflow-y-auto p-6">
          {!selectedSession ? (
            <p className="text-center text-muted-foreground font-mono text-sm mt-16">Select a session to review.</p>
          ) : (
            <div className="max-w-4xl mx-auto space-y-8">
              {/* Summary Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{selectedSession.topic_title}</h2>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{formatDate(selectedSession.created_at)}</p>
                </div>
                <div className={`px-4 py-3 rounded-lg border ${getScoreBg(selectedSession.final_bluff_score)} text-center`}>
                  <p className="text-[9px] font-mono text-muted-foreground uppercase">Bluff Score</p>
                  <p className={`text-3xl font-bold font-mono ${getScoreColor(selectedSession.final_bluff_score)}`}>
                    {Math.round(selectedSession.final_bluff_score)}%
                  </p>
                </div>
              </div>

              {/* Concept Summary Pills */}
              <div>
                <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Concept Coverage</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedSession.concept_coverage || []).map((c) => (
                    <span
                      key={c.name}
                      className={`px-2.5 py-1 rounded-md text-xs font-mono border ${
                        c.status === "clear"
                          ? "bg-concept-green/15 border-concept-green/30 text-concept-green"
                          : c.status === "shallow"
                          ? "bg-concept-yellow/15 border-concept-yellow/30 text-concept-yellow"
                          : "bg-secondary border-border text-muted-foreground/50"
                      }`}
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bluff Timeline with Spikes */}
              <div className="bg-card border border-border/50 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Bluff Score Timeline</h3>
                  {spikeData.length > 0 && (
                    <span className="text-[10px] font-mono text-primary">
                      ⚠ {spikeData.length} spike{spikeData.length !== 1 ? "s" : ""} detected
                    </span>
                  )}
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 16%)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "12px" }}
                        labelStyle={{ color: "hsl(240, 5%, 55%)" }}
                      />
                      <ReferenceLine y={60} stroke="hsl(0, 72%, 51%)" strokeDasharray="5 5" label={{ value: "Bluff threshold", position: "insideTopRight", fill: "hsl(0, 72%, 51%)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(0, 72%, 51%)"
                        strokeWidth={2}
                        dot={(props: any) => {
                          const { cx, cy, payload } = props;
                          if (payload.isSpike) {
                            return (
                              <g key={`spike-${payload.index}`}>
                                <circle cx={cx} cy={cy} r={6} fill="hsl(0, 72%, 51%)" fillOpacity={0.3} />
                                <circle cx={cx} cy={cy} r={4} fill="hsl(0, 72%, 51%)" />
                              </g>
                            );
                          }
                          return <circle key={`dot-${payload.index}`} cx={cx} cy={cy} r={3} fill="hsl(240, 10%, 14%)" stroke="hsl(0, 72%, 51%)" strokeWidth={2} />;
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground/50 italic text-center py-8">No bluff data recorded.</p>
                )}
              </div>

              {/* Spike Details */}
              {spikeData.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Bluff Spike Details</h3>
                  <div className="space-y-2">
                    {spikeData.map((spike, i) => {
                      const transcript = selectedSession.transcript || [];
                      // Find the user message closest to this spike
                      const userMessages = transcript.filter((t) => t.role === "user");
                      const relevantMsg = userMessages[spike.index] || userMessages[userMessages.length - 1];

                      return (
                        <div key={i} className="bg-primary/5 border border-primary/15 rounded-lg px-4 py-3 flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 text-center">
                            <p className="text-lg font-bold font-mono text-primary">{Math.round(spike.score)}%</p>
                            <p className="text-[9px] font-mono text-muted-foreground">Q{spike.index + 1}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground font-mono mb-1">
                              {spike.delta > 15 ? `↑${Math.round(spike.delta)}% spike` : "Above threshold"}
                            </p>
                            {relevantMsg && (
                              <p className="text-sm text-foreground/80 leading-relaxed truncate">
                                "{relevantMsg.text}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Full Transcript */}
              <div className="bg-card border border-border/50 rounded-lg p-5">
                <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Full Transcript</h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {(selectedSession.transcript || []).length === 0 && (
                    <p className="text-xs text-muted-foreground/50 italic text-center">No transcript recorded.</p>
                  )}
                  {(selectedSession.transcript || []).map((entry, i) => {
                    // Check if this user message coincides with a bluff spike
                    const isBluffMoment = entry.role === "user" && spikeData.some((s) => {
                      const userMessages = (selectedSession.transcript || []).filter((t) => t.role === "user");
                      const msgIndex = userMessages.indexOf(entry);
                      return msgIndex === s.index;
                    });

                    return (
                      <div key={i} className={`flex flex-col gap-0.5 ${entry.role === "agent" ? "items-start" : "items-end"}`}>
                        <span className="text-[9px] font-mono text-muted-foreground/40 uppercase">
                          {entry.role === "agent" ? "Interviewer" : "Candidate"}
                        </span>
                        <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm leading-relaxed relative ${
                          entry.role === "agent"
                            ? "bg-secondary text-secondary-foreground"
                            : isBluffMoment
                            ? "bg-primary/15 text-foreground border border-primary/30"
                            : "bg-primary/5 text-foreground border border-primary/10"
                        }`}>
                          {isBluffMoment && (
                            <span className="absolute -top-2 -right-2 text-[9px] font-mono bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                              BLUFF
                            </span>
                          )}
                          {entry.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Link to full results */}
              <div className="text-center pb-8">
                <button
                  onClick={() => navigate(`/results/${selectedSession.id}`)}
                  className="text-xs font-mono text-primary hover:underline underline-offset-4"
                >
                  View full results page →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default InterviewerDashboard;
