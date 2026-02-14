import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { KnowledgeMap } from "@/components/KnowledgeMap";
import { SessionRow } from "@/lib/types";

const History = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [user, setUser] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setLoading(false); return; }
      setUser(true);
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setSessions(data as unknown as SessionRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-concept-green";
    if (score < 60) return "text-concept-yellow";
    return "text-primary";
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-mono">←</button>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">Session History</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {loading && (
            <p className="text-center text-muted-foreground font-mono text-sm animate-pulse mt-16">Loading sessions...</p>
          )}

          {!loading && !user && (
            <div className="text-center mt-16 space-y-4">
              <p className="text-muted-foreground font-mono text-sm">Sign in to view your interview history.</p>
              <button onClick={() => navigate("/auth")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Sign In
              </button>
            </div>
          )}

          {!loading && user && sessions.length === 0 && (
            <div className="text-center mt-16 space-y-4">
              <p className="text-muted-foreground font-mono text-sm">No interviews yet.</p>
              <button onClick={() => navigate("/")} className="text-primary text-sm font-mono underline underline-offset-4">Start your first interview →</button>
            </div>
          )}

          {!loading && sessions.length > 0 && (
            <div className="space-y-3">
              {sessions.map((session) => {
                const expanded = expandedId === session.id;
                const conceptsClear = (session.concept_coverage || []).filter((c) => c.status === "clear").length;
                const conceptsTotal = (session.concept_coverage || []).length;

                return (
                  <div key={session.id} className="border border-border/50 rounded-lg bg-card/50 overflow-hidden">
                    {/* Summary row */}
                    <button
                      onClick={() => setExpandedId(expanded ? null : session.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-lg">{session.topic_id === "neural-networks" ? "🧠" : session.topic_id === "databases" ? "🗄️" : "⚙️"}</span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{session.topic_title}</p>
                          <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{formatDate(session.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">Bluff</p>
                          <p className={`text-lg font-bold font-mono ${getScoreColor(session.final_bluff_score)}`}>
                            {Math.round(session.final_bluff_score)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">Concepts</p>
                          <p className="text-sm font-mono text-foreground">{conceptsClear}/{conceptsTotal}</p>
                        </div>
                        <span className={`text-xs font-mono px-2 py-0.5 rounded ${session.status === "completed" ? "bg-concept-green/10 text-concept-green" : "bg-concept-yellow/10 text-concept-yellow"}`}>
                          {session.status}
                        </span>
                        <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {expanded && (
                      <div className="border-t border-border/30 px-5 py-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Knowledge Map */}
                          <div>
                            <KnowledgeMap concepts={session.concept_coverage || []} />
                          </div>

                          {/* Transcript */}
                          <div>
                            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Transcript</h4>
                            <div className="max-h-80 overflow-y-auto space-y-3 pr-2">
                              {(session.transcript || []).length === 0 && (
                                <p className="text-xs text-muted-foreground/50 italic">No transcript recorded.</p>
                              )}
                              {(session.transcript || []).map((entry, i) => (
                                <div key={i} className={`flex flex-col gap-0.5 ${entry.role === "agent" ? "items-start" : "items-end"}`}>
                                  <span className="text-[9px] font-mono text-muted-foreground/40 uppercase">
                                    {entry.role === "agent" ? "Interviewer" : "You"}
                                  </span>
                                  <div className={`max-w-[90%] px-2.5 py-1.5 rounded-md text-xs leading-relaxed ${
                                    entry.role === "agent" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-foreground border border-primary/20"
                                  }`}>
                                    {entry.text}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Bluff History */}
                        {(session.bluff_history || []).length > 0 && (
                          <div className="mt-6">
                            <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Bluff Score Over Time</h4>
                            <div className="flex items-end gap-1 h-16">
                              {session.bluff_history.map((point, i) => (
                                <div
                                  key={i}
                                  className="flex-1 rounded-t-sm transition-all"
                                  style={{
                                    height: `${Math.max(point.score, 4)}%`,
                                    backgroundColor: point.score < 30 ? "hsl(var(--concept-green))" : point.score < 60 ? "hsl(var(--concept-yellow))" : "hsl(var(--primary))",
                                  }}
                                  title={`${Math.round(point.score)}%`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default History;
