import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SessionRow, JobRole, InterviewInvite } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { ChevronDown, ChevronUp, Clock, Video, Users, Send, CheckCircle, XCircle, Briefcase } from "lucide-react";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";

/* ── Signed-URL video player for private bucket ── */
const VideoPlayer = ({ videoPath }: { videoPath: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (videoPath.startsWith("http")) { setUrl(videoPath); return; }
    supabase.storage.from("interview-videos").createSignedUrl(videoPath, 3600)
      .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl); });
  }, [videoPath]);
  if (!url) return <p className="text-[10px] font-mono text-muted-foreground">Loading video…</p>;
  return <video src={url} controls className="w-full rounded-lg border border-border/50 bg-black" />;
};

/* ── Helpers ── */
const getScoreColor = (score: number) => {
  if (score < 30) return "text-concept-green";
  if (score < 60) return "text-concept-yellow";
  return "text-primary";
};

const getGrade = (score: number) => {
  if (score < 20) return { label: "Expert", desc: "Deep, authentic understanding" };
  if (score < 40) return { label: "Solid", desc: "Good grasp with minor gaps" };
  if (score < 60) return { label: "Surface", desc: "Shallow understanding detected" };
  if (score < 80) return { label: "Bluffer", desc: "Significant knowledge gaps" };
  return { label: "Exposed", desc: "Mostly bluffing detected" };
};

const getDuration = (s: SessionRow) => {
  const mins = Math.round((new Date(s.updated_at).getTime() - new Date(s.created_at).getTime()) / 60000);
  return mins < 1 ? "<1m" : `${mins}m`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

/* ════════════════════════════════════════════════════
   Interviewer-specific dashboard content
   ════════════════════════════════════════════════════ */
const InterviewerView = () => {
  const navigate = useNavigate();
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [invitesByRole, setInvitesByRole] = useState<Record<string, InterviewInvite[]>>({});
  const [sessionsByRole, setSessionsByRole] = useState<Record<string, SessionRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    const [jrRes, invRes, sessRes] = await Promise.all([
      supabase.from("job_roles").select("*").order("created_at", { ascending: false }),
      supabase.from("interview_invites").select("*, job_roles(*)").order("sent_at", { ascending: false }),
      supabase.from("interview_sessions").select("*").order("created_at", { ascending: false }),
    ]);

    const roles = (jrRes.data || []) as unknown as JobRole[];
    setJobRoles(roles);

    // Group invites by job_role_id
    const invMap: Record<string, InterviewInvite[]> = {};
    ((invRes.data || []) as unknown as InterviewInvite[]).forEach((inv) => {
      if (!invMap[inv.job_role_id]) invMap[inv.job_role_id] = [];
      invMap[inv.job_role_id].push(inv);
    });
    setInvitesByRole(invMap);

    // Group sessions by job_role_id
    const sessMap: Record<string, SessionRow[]> = {};
    ((sessRes.data || []) as unknown as SessionRow[]).forEach((s) => {
      if (s.job_role_id) {
        if (!sessMap[s.job_role_id]) sessMap[s.job_role_id] = [];
        sessMap[s.job_role_id].push(s);
      }
    });
    setSessionsByRole(sessMap);
    setLoading(false);
  };

  if (loading) {
    return <p className="text-muted-foreground font-mono text-sm animate-pulse text-center py-16">Loading dashboard…</p>;
  }

  // Aggregate stats
  const totalInvites = Object.values(invitesByRole).flat().length;
  const totalCompleted = Object.values(invitesByRole).flat().filter((i) => i.status === "completed").length;
  const totalRejected = Object.values(invitesByRole).flat().filter((i) => i.status === "rejected").length;
  const totalSessions = Object.values(sessionsByRole).flat().filter((s) => s.status === "completed").length;

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Job Roles</p>
          <p className="text-3xl font-bold font-mono text-foreground">{jobRoles.length}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Invites Sent</p>
          <p className="text-3xl font-bold font-mono text-foreground">{totalInvites}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Completed</p>
          <p className="text-3xl font-bold font-mono text-concept-green">{totalCompleted}</p>
        </div>
        <div className="bg-card border border-border/50 rounded-lg p-5 text-center">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">Interviews Done</p>
          <p className="text-3xl font-bold font-mono text-foreground">{totalSessions}</p>
        </div>
      </div>

      {/* Job Roles List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Your Job Roles</h2>
          <button onClick={() => navigate("/company")} className="text-[10px] font-mono text-primary hover:underline underline-offset-4">
            Manage Roles →
          </button>
        </div>

        {jobRoles.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-lg p-12 text-center">
            <Briefcase className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-mono">No job roles created yet.</p>
            <button onClick={() => navigate("/company")} className="mt-3 text-xs font-mono text-primary hover:underline underline-offset-4">
              Create your first role →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobRoles.map((jr) => {
              const invites = invitesByRole[jr.id] || [];
              const sessions = sessionsByRole[jr.id] || [];
              const completedSessions = sessions.filter((s) => s.status === "completed" || s.status === "disconnected");
              const activeSessions = sessions.filter((s) => s.status === "in_progress");
              const completedInvites = invites.filter((i) => i.status === "completed").length;
              const rejectedInvites = invites.filter((i) => i.status === "rejected").length;
              const pendingInvites = invites.filter((i) => i.status === "pending" || i.status === "accepted").length;
              const isExpanded = expandedRole === jr.id;
              const avgBluff = completedSessions.length > 0
                ? Math.round(completedSessions.reduce((sum, s) => sum + s.final_bluff_score, 0) / completedSessions.length)
                : null;

              return (
                <div key={jr.id} className="bg-card border border-border/50 rounded-lg overflow-hidden">
                  {/* Role Summary Row */}
                  <button
                    onClick={() => setExpandedRole(isExpanded ? null : jr.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{jr.job_title}</p>
                        <p className="text-[10px] font-mono text-muted-foreground">{jr.company_name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 flex-shrink-0">
                      {/* Mini stats */}
                      <div className="flex items-center gap-1.5" title="Invites sent">
                        <Send className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs font-mono text-muted-foreground">{invites.length}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Completed">
                        <CheckCircle className="w-3 h-3 text-concept-green" />
                        <span className="text-xs font-mono text-concept-green">{completedInvites}</span>
                      </div>
                      {rejectedInvites > 0 && (
                        <div className="flex items-center gap-1.5" title="Rejected">
                          <XCircle className="w-3 h-3 text-destructive" />
                          <span className="text-xs font-mono text-destructive">{rejectedInvites}</span>
                        </div>
                      )}
                      {activeSessions.length > 0 && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 animate-pulse">
                          LIVE · {activeSessions.length}
                        </span>
                      )}
                      {avgBluff !== null && (
                        <div className="text-right">
                          <p className={`text-sm font-bold font-mono ${getScoreColor(avgBluff)}`}>{avgBluff}%</p>
                          <p className="text-[9px] font-mono text-muted-foreground">avg bluff</p>
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {/* Expanded: Candidate list */}
                  {isExpanded && (
                    <div className="border-t border-border/30">
                      {/* Role quick stats */}
                      <div className="grid grid-cols-4 gap-3 p-5 bg-secondary/5">
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">Pending</p>
                          <p className="text-lg font-bold font-mono text-concept-yellow">{pendingInvites}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">Completed</p>
                          <p className="text-lg font-bold font-mono text-concept-green">{completedInvites}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">Rejected</p>
                          <p className="text-lg font-bold font-mono text-destructive">{rejectedInvites}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-mono text-muted-foreground uppercase">Interviews</p>
                          <p className="text-lg font-bold font-mono text-foreground">{completedSessions.length}</p>
                        </div>
                      </div>

                      {/* Completed candidates */}
                      {completedSessions.length === 0 ? (
                        <div className="p-5 text-center">
                          <p className="text-xs text-muted-foreground/50 font-mono italic">No completed interviews yet for this role.</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/20">
                          {completedSessions.map((s) => {
                            const concepts = s.concept_coverage || [];
                            const clearConcepts = concepts.filter((c) => c.status === "clear");
                            const shallowConcepts = concepts.filter((c) => c.status === "shallow");
                            const missingConcepts = concepts.filter((c) => c.status === "missing");
                            const clearPct = concepts.length > 0 ? Math.round((clearConcepts.length / concepts.length) * 100) : 0;
                            const grade = getGrade(s.final_bluff_score);
                            const duration = getDuration(s);
                            const isSessionExpanded = expandedSession === s.id;

                            // Find invite email for this candidate
                            const candidateInvite = invites.find((inv) => inv.interviewee_id === s.user_id);
                            const candidateLabel = candidateInvite?.invite_email || s.user_id.slice(0, 8) + "…";

                            return (
                              <div key={s.id}>
                                {/* Candidate row */}
                                <button
                                  onClick={() => setExpandedSession(isSessionExpanded ? null : s.id)}
                                  className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-secondary/10 transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                                      <span className="text-[10px] font-mono text-muted-foreground uppercase">
                                        {candidateLabel[0]}
                                      </span>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold text-foreground truncate">{candidateLabel}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-mono text-muted-foreground">{s.topic_title}</span>
                                        <span className="flex items-center gap-0.5 text-[10px] font-mono text-muted-foreground">
                                          <Clock className="w-2.5 h-2.5" /> {duration}
                                        </span>
                                        <span className="text-[10px] font-mono text-muted-foreground/60">{formatDate(s.created_at)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 flex-shrink-0">
                                    <div className="text-right">
                                      <p className={`text-lg font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{Math.round(s.final_bluff_score)}%</p>
                                      <p className={`text-[9px] font-mono ${getScoreColor(s.final_bluff_score)}`}>{grade.label}</p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-mono text-concept-green">{clearPct}%</p>
                                      <p className="text-[9px] font-mono text-muted-foreground">mastery</p>
                                    </div>
                                    {s.video_url && <Video className="w-3.5 h-3.5 text-primary" />}
                                    {isSessionExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                                  </div>
                                </button>

                                {/* Session drill-down */}
                                {isSessionExpanded && (
                                  <div className="px-5 pb-5 space-y-4 bg-secondary/5">
                                    {/* Stats grid */}
                                    <div className="grid grid-cols-4 gap-3">
                                      <div className="bg-card border border-border/30 rounded-lg p-3 text-center">
                                        <p className="text-[9px] font-mono text-muted-foreground uppercase">Bluff Score</p>
                                        <p className={`text-xl font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{Math.round(s.final_bluff_score)}%</p>
                                      </div>
                                      <div className="bg-card border border-border/30 rounded-lg p-3 text-center">
                                        <p className="text-[9px] font-mono text-muted-foreground uppercase">Duration</p>
                                        <p className="text-xl font-bold font-mono text-foreground">{duration}</p>
                                      </div>
                                      <div className="bg-card border border-border/30 rounded-lg p-3 text-center">
                                        <p className="text-[9px] font-mono text-muted-foreground uppercase">Mastery</p>
                                        <p className="text-xl font-bold font-mono text-concept-green">{clearPct}%</p>
                                      </div>
                                      <div className="bg-card border border-border/30 rounded-lg p-3 text-center">
                                        <p className="text-[9px] font-mono text-muted-foreground uppercase">Grade</p>
                                        <p className={`text-xl font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{grade.label}</p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Concept Breakdown */}
                                      <div>
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Concept Breakdown</p>
                                        <div className="space-y-1.5">
                                          {clearConcepts.length > 0 && (
                                            <div className="flex items-start gap-2">
                                              <span className="text-[10px] font-mono text-concept-green w-16 flex-shrink-0">✓ Clear</span>
                                              <div className="flex flex-wrap gap-1">
                                                {clearConcepts.map((c) => (
                                                  <span key={c.name} className="text-[10px] font-mono px-2 py-0.5 rounded bg-concept-green/10 text-concept-green">{c.name}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {shallowConcepts.length > 0 && (
                                            <div className="flex items-start gap-2">
                                              <span className="text-[10px] font-mono text-concept-yellow w-16 flex-shrink-0">~ Shallow</span>
                                              <div className="flex flex-wrap gap-1">
                                                {shallowConcepts.map((c) => (
                                                  <span key={c.name} className="text-[10px] font-mono px-2 py-0.5 rounded bg-concept-yellow/10 text-concept-yellow">{c.name}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                          {missingConcepts.length > 0 && (
                                            <div className="flex items-start gap-2">
                                              <span className="text-[10px] font-mono text-primary w-16 flex-shrink-0">✗ Missing</span>
                                              <div className="flex flex-wrap gap-1">
                                                {missingConcepts.map((c) => (
                                                  <span key={c.name} className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">{c.name}</span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Bluff Score Over Time */}
                                      {(s.bluff_history || []).length > 1 && (
                                        <div>
                                          <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Bluff Score Over Time</p>
                                          <ResponsiveContainer width="100%" height={120}>
                                            <LineChart data={s.bluff_history.map((p, i) => ({ index: i + 1, score: Math.round(p.score), label: `Q${i + 1}` }))}>
                                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 16%)" />
                                              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                                              <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "hsl(240, 5%, 55%)", fontFamily: "JetBrains Mono" }} />
                                              <Tooltip contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 16%)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "11px" }} />
                                              <Line type="monotone" dataKey="score" stroke="hsl(0, 72%, 51%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(0, 72%, 51%)" }} />
                                            </LineChart>
                                          </ResponsiveContainer>
                                        </div>
                                      )}
                                    </div>

                                    {/* AI Assessment */}
                                    <div className="bg-card border border-border/30 rounded-lg p-4">
                                      <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">AI Assessment</p>
                                      <p className="text-sm text-foreground leading-relaxed">
                                        Candidate scored <strong className={getScoreColor(s.final_bluff_score)}>{Math.round(s.final_bluff_score)}% bluff</strong> with{" "}
                                        <strong className="text-concept-green">{clearConcepts.length}</strong> clear,{" "}
                                        <strong className="text-concept-yellow">{shallowConcepts.length}</strong> shallow, and{" "}
                                        <strong className="text-primary">{missingConcepts.length}</strong> missing concepts.{" "}
                                        Grade: <strong className={getScoreColor(s.final_bluff_score)}>{grade.label}</strong> — {grade.desc}.{" "}
                                        Duration: {duration}.
                                      </p>
                                    </div>

                                    {/* Video */}
                                    {s.video_url && (
                                      <div>
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Interview Recording</p>
                                        <VideoPlayer videoPath={s.video_url} />
                                      </div>
                                    )}

                                    {/* Transcript Preview */}
                                    {(s.transcript || []).length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">
                                          Transcript ({(s.transcript || []).length} exchanges)
                                        </p>
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                          {(s.transcript || []).slice(0, 6).map((entry, i) => (
                                            <div key={i} className={`flex flex-col gap-0.5 ${entry.role === "agent" ? "items-start" : "items-end"}`}>
                                              <span className="text-[9px] font-mono text-muted-foreground/40 uppercase">
                                                {entry.role === "agent" ? "Interviewer" : "Candidate"}
                                              </span>
                                              <div className={`max-w-[75%] px-3 py-2 rounded-lg text-xs leading-relaxed ${
                                                entry.role === "agent" ? "bg-secondary text-secondary-foreground" : "bg-primary/10 text-foreground border border-primary/20"
                                              }`}>
                                                {entry.text}
                                              </div>
                                            </div>
                                          ))}
                                          {(s.transcript || []).length > 6 && (
                                            <button
                                              onClick={() => navigate(`/results/${s.id}`)}
                                              className="text-[10px] font-mono text-primary hover:underline"
                                            >
                                              View full transcript →
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    <button
                                      onClick={() => navigate(`/results/${s.id}`)}
                                      className="text-xs font-mono text-primary hover:underline underline-offset-4"
                                    >
                                      Open Full Report →
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Link to full role management */}
                      <div className="px-5 py-3 bg-secondary/5 border-t border-border/20">
                        <button
                          onClick={() => navigate(`/company/${jr.id}`)}
                          className="text-[10px] font-mono text-primary hover:underline underline-offset-4"
                        >
                          Manage Role & Invites →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

/* ════════════════════════════════════════════════════
   Interviewee dashboard content (existing logic)
   ════════════════════════════════════════════════════ */
const IntervieweeView = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("interview_sessions")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) setSessions(data as unknown as SessionRow[]);
      setLoading(false);
    };
    load();
  }, []);

  const completedSessions = sessions.filter((s) => s.status === "completed");

  const avgBluff = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + s.final_bluff_score, 0) / completedSessions.length)
    : 0;

  const trendData = completedSessions.slice(0, 10).reverse().map((s, i) => ({
    index: i + 1,
    score: Math.round(s.final_bluff_score),
    label: s.topic_title.slice(0, 12),
  }));

  const conceptCounts: Record<string, number> = {};
  completedSessions.forEach((s) => {
    (s.concept_coverage || []).forEach((c) => {
      if (c.status === "missing" || c.status === "shallow") {
        conceptCounts[c.name] = (conceptCounts[c.name] || 0) + 1;
      }
    });
  });
  const worstConcept = Object.entries(conceptCounts).sort((a, b) => b[1] - a[1])[0];

  if (loading) return <p className="text-muted-foreground font-mono text-sm animate-pulse text-center py-16">Loading dashboard…</p>;

  return (
    <div className="space-y-8">
      {/* Completed Interviews */}
      <section>
        <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4">
          Completed Interviews ({completedSessions.length})
        </h2>
        {completedSessions.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-lg p-8 text-center">
            <p className="text-xs text-muted-foreground/50 italic">No completed sessions yet.</p>
            <button onClick={() => navigate("/")} className="mt-3 text-xs font-mono text-primary hover:underline underline-offset-4">
              Start your first interview →
            </button>
          </div>
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
                  <div>
                    <p className="text-sm font-semibold text-foreground">{s.topic_title}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <p className={`text-lg font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>
                      {Math.round(s.final_bluff_score)}%
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground">{clear}/{concepts.length} clear</span>
                    <span className="text-muted-foreground text-xs">→</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Performance Overview */}
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
                  <Tooltip contentStyle={{ background: "hsl(240, 12%, 8%)", border: "1px solid hsl(240, 10%, 16%)", borderRadius: "8px", fontFamily: "JetBrains Mono", fontSize: "12px" }} />
                  <Area type="monotone" dataKey="score" stroke="hsl(0, 72%, 51%)" fill="url(#trendGrad)" strokeWidth={2} dot={{ r: 3, fill: "hsl(0, 72%, 51%)" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

/* ════════════════════════════════════════════════════
   Main Dashboard Page
   ════════════════════════════════════════════════════ */
const InterviewerDashboard = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();

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
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-6">
            {role === "interviewer" ? "Hiring Dashboard" : "Your Dashboard"}
          </h1>
          {role === "interviewer" ? <InterviewerView /> : <IntervieweeView />}
        </div>
      </main>
    </div>
  );
};

export default InterviewerDashboard;
