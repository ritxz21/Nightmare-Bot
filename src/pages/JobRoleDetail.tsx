import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JobRole, InterviewInvite, SessionRow } from "@/lib/types";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
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

const JobRoleDetail = () => {
  const { jobRoleId } = useParams<{ jobRoleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [jobRole, setJobRole] = useState<JobRole | null>(null);
  const [invites, setInvites] = useState<InterviewInvite[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDeadline, setInviteDeadline] = useState("");
  const [sending, setSending] = useState(false);

  // AI query
  const [aiQuery, setAiQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (jobRoleId) loadAll();
  }, [jobRoleId]);

  // Realtime subscription for sessions
  useEffect(() => {
    if (!jobRoleId) return;
    const channel = supabase
      .channel(`job-role-${jobRoleId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "interview_sessions", filter: `job_role_id=eq.${jobRoleId}` }, (payload) => {
        if (payload.eventType === "INSERT") setSessions((prev) => [payload.new as unknown as SessionRow, ...prev]);
        else if (payload.eventType === "UPDATE") setSessions((prev) => prev.map((s) => s.id === (payload.new as any).id ? payload.new as unknown as SessionRow : s));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobRoleId]);

  const loadAll = async () => {
    const [jrRes, invRes, sessRes] = await Promise.all([
      supabase.from("job_roles").select("*").eq("id", jobRoleId!).single(),
      supabase.from("interview_invites").select("*").eq("job_role_id", jobRoleId!).order("sent_at", { ascending: false }),
      supabase.from("interview_sessions").select("*").eq("job_role_id", jobRoleId!).order("created_at", { ascending: false }),
    ]);
    if (jrRes.data) setJobRole(jrRes.data as unknown as JobRole);
    if (invRes.data) setInvites(invRes.data as unknown as InterviewInvite[]);
    if (sessRes.data) setSessions(sessRes.data as unknown as SessionRow[]);
    setLoading(false);
  };

  const sendInvite = async () => {
    if (!inviteEmail.trim() || !jobRoleId) return;
    setSending(true);
    const { data, error } = await supabase.from("interview_invites").insert({
      job_role_id: jobRoleId,
      invite_email: inviteEmail.trim(),
      deadline: inviteDeadline || null,
    }).select().single();
    if (error) { toast.error("Failed to send invite"); console.error(error); }
    else {
      toast.success("Invite created!");
      setInvites((prev) => [data as unknown as InterviewInvite, ...prev]);
      setInviteEmail("");
      setInviteDeadline("");
    }
    setSending(false);
  };

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invites?token=${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied!");
  };

  const askAI = async () => {
    if (!aiQuery.trim() || !jobRoleId) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("company-ai-query", {
        body: { query: aiQuery, jobRoleId, sessions: sessions.map((s) => ({
          id: s.id,
          final_bluff_score: s.final_bluff_score,
          concept_coverage: s.concept_coverage,
          status: s.status,
          created_at: s.created_at,
        })) },
      });
      if (error) throw error;
      setAiResponse(data.response || data.summary || JSON.stringify(data));
    } catch (err) {
      console.error(err);
      toast.error("AI query failed");
    }
    setAiLoading(false);
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-concept-green";
    if (score < 60) return "text-concept-yellow";
    return "text-primary";
  };

  const getRecommendation = (score: number) => {
    if (score < 25) return { label: "Strong", color: "bg-concept-green/10 text-concept-green" };
    if (score < 50) return { label: "Moderate", color: "bg-concept-yellow/10 text-concept-yellow" };
    return { label: "Weak", color: "bg-primary/10 text-primary" };
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-mono text-sm animate-pulse">Loading...</p></div>;
  if (!jobRole) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Job role not found.</p></div>;

  const activeSessions = sessions.filter((s) => s.status === "in_progress");
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const avgBluff = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + s.final_bluff_score, 0) / completedSessions.length)
    : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => navigate("/company")} className="text-xs font-mono text-muted-foreground hover:text-foreground mb-2 block">← Back to roles</button>
              <h1 className="text-3xl font-bold text-foreground">{jobRole.job_title}</h1>
              <p className="text-sm text-muted-foreground font-mono">{jobRole.company_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-mono text-muted-foreground">{invites.length} invites · {completedSessions.length} completed</p>
            </div>
          </div>

          {/* Live Sessions */}
          {activeSessions.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Live Interviews</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-primary/20 text-primary border border-primary/30 animate-pulse">
                  LIVE · {activeSessions.length}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSessions.map((s) => {
                  const chartData = (s.bluff_history || []).map((p, i) => ({ index: i + 1, score: Math.round(p.score) }));
                  const concepts = s.concept_coverage || [];
                  const clearPct = concepts.length > 0 ? Math.round((concepts.filter((c) => c.status === "clear").length / concepts.length) * 100) : 0;
                  const elapsed = Math.round((Date.now() - new Date(s.created_at).getTime()) / 60000);
                  return (
                    <div key={s.id} className="bg-card border border-primary/20 rounded-lg p-5 card-glow">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{s.topic_title}</h3>
                          <p className="text-[10px] font-mono text-muted-foreground">{elapsed}m elapsed</p>
                        </div>
                        <p className={`text-2xl font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{Math.round(s.final_bluff_score)}%</p>
                      </div>
                      {chartData.length > 1 && (
                        <ResponsiveContainer width="100%" height={80}>
                          <LineChart data={chartData}>
                            <Line type="monotone" dataKey="score" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={false} />
                            <ReferenceLine y={60} stroke="hsl(0, 72%, 51%)" strokeDasharray="3 3" strokeOpacity={0.4} />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-concept-green rounded-full" style={{ width: `${clearPct}%` }} />
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">{clearPct}% mastery</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Invite Candidates */}
          <section>
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Invite Candidates</h2>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex gap-3">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="candidate@email.com"
                  className="flex-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="date"
                  value={inviteDeadline}
                  onChange={(e) => setInviteDeadline(e.target.value)}
                  className="px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button onClick={sendInvite} disabled={sending} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {sending ? "..." : "Send Invite"}
                </button>
              </div>
              {invites.length > 0 && (
                <div className="mt-4 space-y-2">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                      <span className="text-xs font-mono text-muted-foreground">{inv.invite_email || "Link invite"}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          inv.status === "completed" ? "bg-concept-green/10 text-concept-green" :
                          inv.status === "accepted" ? "bg-primary/10 text-primary" :
                          "bg-concept-yellow/10 text-concept-yellow"
                        }`}>{inv.status}</span>
                        <button onClick={() => copyInviteLink(inv.invite_token)} className="text-[10px] font-mono text-primary hover:underline">
                          Copy Link
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Candidate Ranking */}
          {completedSessions.length > 0 && (
            <section>
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Candidate Ranking</h2>
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left px-5 py-3 text-[10px] font-mono text-muted-foreground uppercase">Candidate</th>
                      <th className="text-right px-5 py-3 text-[10px] font-mono text-muted-foreground uppercase">Bluff Score</th>
                      <th className="text-right px-5 py-3 text-[10px] font-mono text-muted-foreground uppercase">Mastery</th>
                      <th className="text-right px-5 py-3 text-[10px] font-mono text-muted-foreground uppercase">Recommendation</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedSessions.map((s) => {
                      const concepts = s.concept_coverage || [];
                      const clearPct = concepts.length > 0 ? Math.round((concepts.filter((c) => c.status === "clear").length / concepts.length) * 100) : 0;
                      const rec = getRecommendation(s.final_bluff_score);
                      return (
                        <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-secondary/20">
                          <td className="px-5 py-3 text-foreground font-mono text-xs">{s.user_id.slice(0, 8)}…</td>
                          <td className={`px-5 py-3 text-right font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{Math.round(s.final_bluff_score)}%</td>
                          <td className="px-5 py-3 text-right font-mono text-foreground">{clearPct}%</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${rec.color}`}>{rec.label}</span>
                          </td>
                          <td className="px-5 py-3">
                            <button onClick={() => navigate(`/results/${s.id}`)} className="text-[10px] font-mono text-primary hover:underline">View →</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Trend Analytics */}
          {completedSessions.length > 1 && (
            <section>
              <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">Trend Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Avg Bluff Score</p>
                  <p className={`text-3xl font-bold font-mono ${getScoreColor(avgBluff)}`}>{avgBluff}%</p>
                </div>
                <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Completion Rate</p>
                  <p className="text-3xl font-bold font-mono text-foreground">
                    {sessions.length > 0 ? Math.round((completedSessions.length / sessions.length) * 100) : 0}%
                  </p>
                </div>
                <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Total Candidates</p>
                  <p className="text-3xl font-bold font-mono text-foreground">{sessions.length}</p>
                </div>
              </div>
            </section>
          )}

          {/* AI Query */}
          <section>
            <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">🧠 AI Intelligence</h2>
            <div className="bg-card border border-border rounded-lg p-5 space-y-4">
              <div className="flex gap-3">
                <input
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="Ask about candidates... e.g. 'Who performed best?'"
                  className="flex-1 px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => e.key === "Enter" && askAI()}
                />
                <button onClick={askAI} disabled={aiLoading} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                  {aiLoading ? "Thinking..." : "Ask AI"}
                </button>
              </div>
              {aiResponse && (
                <div className="bg-secondary/50 rounded-lg p-4 text-sm text-foreground whitespace-pre-wrap font-mono">
                  {aiResponse}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default JobRoleDetail;
