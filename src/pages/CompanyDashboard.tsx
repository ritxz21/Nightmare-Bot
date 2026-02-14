import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { JobRole } from "@/lib/types";
import Navbar from "@/components/Navbar";
import { toast } from "sonner";
import { DifficultyLevel, DIFFICULTIES, DEFAULT_DIFFICULTY } from "@/lib/difficulty";

const CompanyDashboard = () => {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);
  const [topicsInput, setTopicsInput] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (user && role === "interviewer") loadRoles();
      else setLoading(false);
    }
  }, [user, authLoading, role]);

  const loadRoles = async () => {
    const { data, error } = await supabase
      .from("job_roles")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setJobRoles(data as unknown as JobRole[]);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!user || !companyName.trim() || !jobTitle.trim()) {
      toast.error("Company name and job title are required");
      return;
    }
    setCreating(true);
    // Parse topics: each line = topic, concepts separated by commas
    const customTopics = topicsInput.trim().split("\n").filter(Boolean).map((line) => {
      const parts = line.split(":");
      return {
        title: parts[0]?.trim() || line.trim(),
        core_concepts: parts[1]?.split(",").map((c) => c.trim()).filter(Boolean) || [],
      };
    });

    const { error } = await supabase.from("job_roles").insert({
      interviewer_id: user.id,
      company_name: companyName.trim(),
      job_title: jobTitle.trim(),
      difficulty_level: difficulty,
      custom_topics: customTopics,
      evaluation_weights: {},
    });

    if (error) {
      console.error(error);
      toast.error("Failed to create job role");
    } else {
      toast.success("Job role created!");
      setShowCreate(false);
      setCompanyName("");
      setJobTitle("");
      setTopicsInput("");
      loadRoles();
    }
    setCreating(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-mono text-sm animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!user || role !== "interviewer") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground font-mono text-sm">
            {!user ? "Sign in as an interviewer to access company features." : "Only interviewer accounts can access this page."}
          </p>
          <button onClick={() => navigate("/auth")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">
            {user ? "← Home" : "Sign In"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-foreground">Company Dashboard</h1>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-5 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {showCreate ? "Cancel" : "+ Create Job Role"}
            </button>
          </div>

          {/* Create Form */}
          {showCreate && (
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase block mb-1.5">Company Name</label>
                  <input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Acme Corp"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-muted-foreground uppercase block mb-1.5">Job Title</label>
                  <input
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-md bg-secondary border border-border text-foreground text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Senior Backend Engineer"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase block mb-1.5">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-all ${
                        difficulty === d.id ? "border-primary bg-primary/10 text-foreground" : "border-border bg-secondary text-muted-foreground"
                      }`}
                    >
                      {d.emoji} {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-mono text-muted-foreground uppercase block mb-1.5">
                  Topics (one per line, format: Topic: concept1, concept2)
                </label>
                <textarea
                  value={topicsInput}
                  onChange={(e) => setTopicsInput(e.target.value)}
                  placeholder={"System Design: Load Balancing, Caching, CDN\nDatabases: ACID, Indexing, Sharding"}
                  className="w-full h-24 bg-secondary border border-border rounded-lg p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {creating ? "Creating..." : "Create Job Role"}
              </button>
            </div>
          )}

          {/* Job Roles List */}
          {jobRoles.length === 0 && !showCreate ? (
            <div className="bg-card border border-border/50 rounded-lg p-12 text-center">
              <p className="text-muted-foreground font-mono text-sm">No job roles created yet.</p>
              <button onClick={() => setShowCreate(true)} className="mt-3 text-xs font-mono text-primary hover:underline">
                Create your first job role →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobRoles.map((jr) => {
                const diffConfig = DIFFICULTIES.find((d) => d.id === jr.difficulty_level);
                return (
                  <button
                    key={jr.id}
                    onClick={() => navigate(`/company/${jr.id}`)}
                    className="bg-card border border-border/50 rounded-lg p-5 text-left hover:border-primary/40 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-foreground">{jr.job_title}</h3>
                      {diffConfig && (
                        <span className="text-xs font-mono text-muted-foreground">{diffConfig.emoji} {diffConfig.label}</span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground">{jr.company_name}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        {(jr.custom_topics || []).length} topics
                      </span>
                      <span className="text-muted-foreground/30">•</span>
                      <span className="text-[10px] font-mono text-muted-foreground/60">
                        {new Date(jr.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default CompanyDashboard;
