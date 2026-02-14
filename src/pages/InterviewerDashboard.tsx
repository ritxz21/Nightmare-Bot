import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SessionRow } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
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
        setSessions(data as unknown as SessionRow[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  // Real-time subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel("live-sessions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interview_sessions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setSessions((prev) => [payload.new as unknown as SessionRow, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setSessions((prev) =>
              prev.map((s) => (s.id === (payload.new as any).id ? (payload.new as unknown as SessionRow) : s))
            );
          } else if (payload.eventType === "DELETE") {
            setSessions((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeSessions = sessions.filter((s) => s.status === "in_progress");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-concept-green";
    if (score < 60) return "text-concept-yellow";
    return "text-primary";
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  // Performance metrics
  const avgBluff = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + s.final_bluff_score, 0) / completedSessions.length)
    : 0;

  const trendData = completedSessions.slice(0, 10).reverse().map((s, i) => ({
    index: i + 1,
    score: Math.round(s.final_bluff_score),
    label: s.topic_title.slice(0, 12),
  }));

  // Find most problematic concept
  const conceptCounts: Record<string, number> = {};
  completedSessions.forEach((s) => {
    (s.concept_coverage || []).forEach((c) => {
      if (c.status === "missing" || c.status === "shallow") {
        conceptCounts[c.name] = (conceptCounts[c.name] || 0) + 1;
      }
    });
  });
  const worstConcept = Object.entries(conceptCounts).sort((a, b) => b[1] - a[1])[0];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono text-sm animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground font-mono text-sm">Sign in to access the dashboard.</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">

          {/* Section A: Live Interviews (interviewer only) */}
          {role === "interviewer" && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Live Interviews</h2>
                {activeSessions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 animate-pulse">
                    LIVE · {activeSessions.length}
                  </span>
                )}
              </div>
              {activeSessions.length === 0 ? (
                <div className="bg-card border border-border/50 rounded-lg p-8 text-center">
                  <p className="text-sm text-muted-foreground font-mono">No active interviews right now.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSessions.map((s) => {
                    const chartData = (s.bluff_history || []).map((p, i) => ({ index: i + 1, score: Math.round(p.score) }));
                    const concepts = s.concept_coverage || [];
                    const clearPct = concepts.length > 0
                      ? Math.round((concepts.filter((c) => c.status === "clear").length / concepts.length) * 100)
                      : 0;
                    const elapsed = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);

                    return (
                      <div key={s.id} className="bg-card border border-primary/20 rounded-lg p-5 card-glow">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{s.topic_title}</h3>
                            <p className="text-[10px] font-mono text-muted-foreground">{elapsed}m elapsed</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>
                              {Math.round(s.final_bluff_score)}%
                            </p>
                            <p className="text-[9px] font-mono text-muted-foreground uppercase">bluff</p>
                          </div>
                        </div>
                        {chartData.length > 1 && (
                          <ResponsiveContainer width="100%" height={80}>
                            <LineChart data={chartData}>
                              <Line type="monotone" dataKey="score" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
                              <ReferenceLine y={60} stroke="hsl(0, 72%, 51%)" strokeDasharray="3 3" strokeOpacity={0.4} />
                            </LineChart>
                          </ResponsiveContainer>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-full max-w-[120px] h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-concept-green rounded-full transition-all" style={{ width: `${clearPct}%` }} />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">{clearPct}% mastery</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Section B: Completed Interviews */}
          <section>
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Completed Interviews ({completedSessions.length})
            </h2>
            {completedSessions.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 italic">No completed sessions yet.</p>
            ) : (
              <div className="space-y-2">
                {completedSessions.map((s) => {
                  const concepts = s.concept_coverage || [];
                  const clear = concepts.filter((c) => c.status === "clear").length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => navigate(`/results/${s.id}`)}
                      className="w-full px-5 py-4 bg-card border border-border/50 rounded-lg flex items-center justify-between hover:bg-secondary/30 transition-colors text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{s.topic_title}</p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{formatDate(s.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className={`text-lg font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>
                            {Math.round(s.final_bluff_score)}%
                          </p>
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{clear}/{concepts.length} clear</span>
                        <span className="text-muted-foreground text-xs">→</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section C: Performance Overview */}
          {completedSessions.length > 0 && (
            <section>
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Performance Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Avg Bluff Score</p>
                  <p className={`text-3xl font-bold font-mono ${getScoreColor(avgBluff)}`}>{avgBluff}%</p>
                </div>
                <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Total Sessions</p>
                  <p className="text-3xl font-bold font-mono text-foreground">{completedSessions.length}</p>
                </div>
                <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Weakest Concept</p>
                  <p className="text-sm font-bold font-mono text-primary truncate">{worstConcept?.[0] || "N/A"}</p>
                  {worstConcept && <p className="text-[10px] text-muted-foreground mt-1">flagged {worstConcept[1]}×</p>}
                </div>
              </div>
              {trendData.length > 1 && (
                <div className="bg-card border border-border/50 rounded-lg p-5">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Last 10 Sessions Trend</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                      <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 16%)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "12px" }}
                      />
                      <Area type="monotone" dataKey="score" stroke="hsl(0, 72%, 51%)" fill="url(#trendGrad)" strokeWidth={2} dot={{ r: 3, fill: "hsl(0, 72%, 51%)" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default InterviewerDashboard;
