import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { InterviewInvite } from "@/lib/types";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";

const Invites = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [invites, setInvites] = useState<InterviewInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Handle invite token claim from URL
  useEffect(() => {
    const token = searchParams.get("token");
    if (token && user) {
      claimInvite(token);
    }
  }, [searchParams, user]);

  const claimInvite = async (token: string) => {
    if (!user) return;
    const { data, error } = await supabase.rpc("claim_invite", {
      _token: token,
      _user_id: user.id,
    });
    if (error) {
      console.error("Failed to claim invite:", error);
      toast.error("Invalid or expired invite link");
    } else if (data) {
      toast.success("Invite accepted!");
      loadInvites();
    }
  };

  const loadInvites = async () => {
    if (!user) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("interview_invites")
      .select("*, job_roles(*)")
      .eq("interviewee_id", user.id)
      .order("sent_at", { ascending: false });
    if (!error && data) setInvites(data as unknown as InterviewInvite[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) loadInvites();
  }, [user, authLoading]);

  // Realtime subscription for new/updated invites
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-invites-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "interview_invites" },
        (payload) => {
          const row = payload.new as any;
          if (payload.eventType === "INSERT" && row.interviewee_id === user.id) {
            setInvites((prev) => {
              if (prev.some((i) => i.id === row.id)) return prev;
              // Reload to get joined job_roles data
              loadInvites();
              return prev;
            });
            toast.info("New interview invite received!");
          } else if (payload.eventType === "UPDATE" && row.interviewee_id === user.id) {
            loadInvites();
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const startCompanyInterview = (invite: InterviewInvite) => {
    if (!invite.job_roles) return;
    const jr = invite.job_roles;
    const topics = (jr.custom_topics || []);
    const firstTopic = topics[0];
    if (!firstTopic) { toast.error("No topics configured for this role"); return; }

    const encoded = encodeURIComponent(JSON.stringify({
      id: `company-${jr.id}`,
      title: firstTopic.title,
      coreConcepts: firstTopic.core_concepts,
    }));
    navigate(`/interview/custom?difficulty=${jr.difficulty_level}&resumeTopic=${encoded}&jobRoleId=${jr.id}&inviteId=${invite.id}`);
  };

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono text-sm animate-pulse">Loading invites...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground font-mono text-sm">Sign in to view your invites.</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-foreground mb-8">Interview Invites</h1>

          {invites.length === 0 ? (
            <div className="bg-card border border-border/50 rounded-lg p-12 text-center">
              <p className="text-muted-foreground font-mono text-sm">No invites yet.</p>
              <p className="text-xs text-muted-foreground/50 mt-2">Companies will send you invites here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div key={invite.id} className="bg-card border border-border/50 rounded-lg p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {invite.job_roles?.company_name} — {invite.job_roles?.job_title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{formatDate(invite.sent_at)}</span>
                      {invite.deadline && (
                        <span className="text-[10px] font-mono text-destructive">Due: {formatDate(invite.deadline)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      invite.status === "pending" ? "bg-concept-yellow/10 text-concept-yellow" :
                      invite.status === "accepted" ? "bg-primary/10 text-primary" :
                      invite.status === "completed" ? "bg-concept-green/10 text-concept-green" :
                      "bg-secondary text-muted-foreground"
                    }`}>
                      {invite.status}
                    </span>
                    {(invite.status === "accepted" || invite.status === "pending") && (
                      <button
                        onClick={() => startCompanyInterview(invite)}
                        className="px-4 py-2 rounded-md text-xs font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Start Interview
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Invites;
