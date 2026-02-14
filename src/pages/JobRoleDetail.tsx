import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JobRole, InterviewInvite, SessionRow } from "@/lib/types";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { Mic, MicOff, Clock, Video, ChevronDown, ChevronUp } from "lucide-react";
import { useConversation } from "@elevenlabs/react";
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

  // Voice AI query
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const conversation = useConversation({
    onMessage: (message: any) => {
      if (message.type === "agent_response") {
        setAiResponse(message.agent_response_event?.agent_response || "");
      }
    },
    onError: (error) => {
      console.error("Voice error:", error);
      toast.error("Voice connection error");
    },
  });

  const startVoiceQuery = useCallback(async () => {
    setVoiceConnecting(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { data, error } = await supabase.functions.invoke("elevenlabs-signed-url");
      if (error || !data?.signed_url) throw new Error("Failed to get voice token");

      // Build context from sessions
      const sessionsSummary = sessions.slice(0, 20).map((s) => ({
        bluff_score: Math.round(s.final_bluff_score),
        concepts: (s.concept_coverage || []).map((c) => `${c.name}: ${c.status}`).join(", "),
        status: s.status,
      }));

      await conversation.startSession({
        signedUrl: data.signed_url,
        overrides: {
          agent: {
            prompt: {
              prompt: `You are an AI hiring intelligence assistant for the job role "${jobRole?.job_title}" at "${jobRole?.company_name}". Answer questions about candidate performance based on this data:\n${JSON.stringify(sessionsSummary)}`,
            },
            firstMessage: `Hi! I have data on ${sessions.length} candidate sessions for ${jobRole?.job_title}. What would you like to know?`,
          },
        },
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to start voice query");
    } finally {
      setVoiceConnecting(false);
    }
  }, [conversation, sessions, jobRole]);

  const stopVoiceQuery = useCallback(async () => {
    await conversation.endSession();
  }, [conversation]);

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

  const getGrade = (score: number) => {
    if (score < 20) return { label: "Expert", desc: "Deep, authentic understanding" };
    if (score < 40) return { label: "Solid", desc: "Good grasp with minor gaps" };
    if (score < 60) return { label: "Surface", desc: "Shallow understanding detected" };
    if (score < 80) return { label: "Bluffer", desc: "Significant knowledge gaps" };
    return { label: "Exposed", desc: "Mostly bluffing detected" };
  };

  const getDuration = (s: SessionRow) => {
    const start = new Date(s.created_at).getTime();
    const end = new Date(s.updated_at).getTime();
    const mins = Math.round((end - start) / 60000);
    return mins < 1 ? "<1m" : `${mins}m`;
  };

  const [expandedSession, setExpandedSession] = useState<string | null>(null);

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
                <div className="relative">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase absolute -top-4 left-0">Deadline</label>
                  <input
                    type="date"
                    value={inviteDeadline}
                    onChange={(e) => setInviteDeadline(e.target.value)}
                    className="px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
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
              <div className="space-y-3">
                {completedSessions.map((s) => {
                  const concepts = s.concept_coverage || [];
                  const clearPct = concepts.length > 0 ? Math.round((concepts.filter((c) => c.status === "clear").length / concepts.length) * 100) : 0;
                  const rec = getRecommendation(s.final_bluff_score);
                  const grade = getGrade(s.final_bluff_score);
                  const duration = getDuration(s);
                  const isExpanded = expandedSession === s.id;
                  const clearConcepts = concepts.filter((c) => c.status === "clear");
                  const shallowConcepts = concepts.filter((c) => c.status === "shallow");
                  const missingConcepts = concepts.filter((c) => c.status === "missing");

                  return (
                    <div key={s.id} className="bg-card border border-border/50 rounded-lg overflow-hidden">
                      {/* Summary Row */}
                      <div
                        className="flex items-center justify-between p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                        onClick={() => setExpandedSession(isExpanded ? null : s.id)}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-shrink-0">
                            <p className={`text-2xl font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{Math.round(s.final_bluff_score)}%</p>
                            <p className={`text-[10px] font-mono ${getScoreColor(s.final_bluff_score)}`}>{grade.label}</p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground">{s.topic_title}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] font-mono text-muted-foreground">{s.user_id.slice(0, 8)}…</span>
                              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                                <Clock className="w-3 h-3" /> {duration}
                              </span>
                              {s.video_url && (
                                <span className="flex items-center gap-1 text-[10px] font-mono text-primary">
                                  <Video className="w-3 h-3" /> Video
                                </span>
                              )}
                              <span className="text-[10px] font-mono text-muted-foreground/60">
                                {new Date(s.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs font-mono text-foreground">{clearPct}% mastery</span>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${rec.color}`}>{rec.label}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/results/${s.id}`); }}
                            className="text-[10px] font-mono text-primary hover:underline"
                          >
                            Full Report →
                          </button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="border-t border-border/30 p-5 space-y-4 bg-secondary/10">
                          {/* Summary Stats */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase">Bluff Score</p>
                              <p className={`text-xl font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{Math.round(s.final_bluff_score)}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase">Duration</p>
                              <p className="text-xl font-bold font-mono text-foreground">{duration}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase">Mastery</p>
                              <p className="text-xl font-bold font-mono text-concept-green">{clearPct}%</p>
                            </div>
                            <div className="text-center">
                              <p className="text-[10px] font-mono text-muted-foreground uppercase">Grade</p>
                              <p className={`text-xl font-bold font-mono ${getScoreColor(s.final_bluff_score)}`}>{grade.label}</p>
                            </div>
                          </div>

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

                          {/* Feedback Summary */}
                          <div className="bg-card border border-border/30 rounded-lg p-4">
                            <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">AI Assessment Summary</p>
                            <p className="text-sm text-foreground leading-relaxed">
                              Candidate scored <strong className={getScoreColor(s.final_bluff_score)}>{Math.round(s.final_bluff_score)}% bluff</strong> with{" "}
                              <strong className="text-concept-green">{clearConcepts.length}</strong> clear,{" "}
                              <strong className="text-concept-yellow">{shallowConcepts.length}</strong> shallow, and{" "}
                              <strong className="text-primary">{missingConcepts.length}</strong> missing concepts out of {concepts.length} total.{" "}
                              Overall grade: <strong className={getScoreColor(s.final_bluff_score)}>{grade.label}</strong> — {grade.desc}.{" "}
                              Interview lasted {duration}.
                              {s.video_url && " Video recording is available below."}
                            </p>
                          </div>

                          {/* Video Player */}
                          {s.video_url && (
                            <div>
                              <p className="text-[10px] font-mono text-muted-foreground uppercase mb-2">Interview Recording</p>
                              <video
                                src={s.video_url}
                                controls
                                className="w-full max-w-2xl rounded-lg border border-border/50 bg-black"
                              />
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
                                    onClick={(e) => { e.stopPropagation(); navigate(`/results/${s.id}`); }}
                                    className="text-[10px] font-mono text-primary hover:underline"
                                  >
                                    View full transcript →
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                {conversation.status === "disconnected" ? (
                  <button
                    onClick={startVoiceQuery}
                    disabled={voiceConnecting}
                    className="px-4 py-2 rounded-md bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/80 disabled:opacity-50 flex items-center gap-2"
                    title="Ask via voice"
                  >
                    <Mic className="w-4 h-4" />
                    {voiceConnecting ? "..." : "Voice"}
                  </button>
                ) : (
                  <button
                    onClick={stopVoiceQuery}
                    className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 flex items-center gap-2 animate-pulse"
                    title="Stop voice query"
                  >
                    <MicOff className="w-4 h-4" />
                    Stop
                  </button>
                )}
              </div>
              {conversation.status === "connected" && (
                <p className="text-xs font-mono text-primary animate-pulse">
                  🎙️ Voice active — {conversation.isSpeaking ? "AI is speaking..." : "Listening..."}
                </p>
              )}
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
