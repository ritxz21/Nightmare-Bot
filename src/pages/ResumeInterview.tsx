import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { DifficultyLevel, DEFAULT_DIFFICULTY } from "@/lib/difficulty";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import type { AtsReport } from "@/lib/types";

interface ResumeProject {
  name: string;
  description: string;
  technologies: string[];
}

interface InterviewTopic {
  title: string;
  core_concepts: string[];
}

interface ResumeData {
  candidate_name: string;
  skills: string[];
  projects: ResumeProject[];
  interview_topics: InterviewTopic[];
}

const ResumeInterview = () => {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [resumeText, setResumeText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);

  // ATS
  const [atsReport, setAtsReport] = useState<AtsReport | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      toast.error("Please upload a PDF file"); return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error("File must be under 10MB"); return; }
    await uploadAndExtract(file);
  };

  const uploadAndExtract = async (file: File) => {
    setIsExtracting(true);
    try {
      if (user) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        await supabase.storage.from("resumes").upload(filePath, file);
      }
      const text = await file.text();
      await extractFromText(text);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to process resume");
    } finally {
      setIsExtracting(false);
    }
  };

  const extractFromText = async (text: string) => {
    setIsExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-resume", {
        body: { resumeText: text },
      });
      if (error) { toast.error("Failed to extract resume data"); return; }
      setResumeData(data as ResumeData);
      setResumeText(text);
      toast.success("Resume analyzed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze resume");
    } finally {
      setIsExtracting(false);
    }
  };

  const runAtsScore = async () => {
    if (!resumeText.trim() || !user) {
      toast.error(user ? "No resume text" : "Sign in for ATS scoring");
      return;
    }
    setAtsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ats-score", {
        body: { resumeText: resumeText.trim() },
      });
      if (error) throw error;
      setAtsReport(data as AtsReport);
      toast.success("ATS report generated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate ATS report");
    } finally {
      setAtsLoading(false);
    }
  };

  const handlePasteSubmit = () => {
    if (!resumeText.trim()) { toast.error("Please paste your resume content"); return; }
    extractFromText(resumeText);
  };

  const handleStartInterview = () => {
    if (!selectedTopic || !resumeData) return;
    const topic = resumeData.interview_topics.find((t) => t.title === selectedTopic);
    if (!topic) return;
    const encoded = encodeURIComponent(JSON.stringify({
      id: `resume-${selectedTopic.toLowerCase().replace(/\s+/g, "-")}`,
      title: selectedTopic,
      coreConcepts: topic.core_concepts,
    }));
    navigate(`/interview/custom?difficulty=${difficulty}&resumeTopic=${encoded}`);
  };

  const getAtsColor = (score: number) => {
    if (score >= 80) return "text-concept-green";
    if (score >= 60) return "text-concept-yellow";
    return "text-primary";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center px-6 py-12">
        {!resumeData ? (
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                Upload Your <span className="text-primary text-glow">Resume</span>
              </h1>
              <p className="text-muted-foreground">
                We'll extract your skills and projects, then grill you on what you claim to know.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setMode("upload")}
                className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${mode === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >📄 Upload PDF</button>
              <button
                onClick={() => setMode("paste")}
                className={`px-4 py-2 rounded-lg text-sm font-mono transition-all ${mode === "paste" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
              >📋 Paste Text</button>
            </div>

            {mode === "upload" ? (
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border hover:border-primary/40 rounded-lg p-12 text-center cursor-pointer transition-all hover:bg-card/50">
                <div className="text-4xl mb-4">📄</div>
                <p className="text-sm text-muted-foreground mb-2">Click to upload your resume (PDF)</p>
                <p className="text-xs text-muted-foreground/60">Max 10MB</p>
                <input ref={fileInputRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume content here..."
                  className="w-full h-64 bg-card border border-border rounded-lg p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handlePasteSubmit}
                  disabled={!resumeText.trim() || isExtracting}
                  className="w-full px-6 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-all"
                >
                  {isExtracting ? "Analyzing..." : "Analyze Resume →"}
                </button>
              </div>
            )}

            {isExtracting && (
              <div className="text-center">
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground font-mono">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Extracting skills and projects...
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-3xl w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">Hey, {resumeData.candidate_name} 👋</h2>
              <p className="text-muted-foreground">We found {resumeData.interview_topics.length} topics to grill you on.</p>
            </div>

            {/* ATS Score Button - only for interviewees */}
            {user && (role === "interviewee" || !role) && (
              <div className="text-center">
                {!atsReport ? (
                  <button
                    onClick={runAtsScore}
                    disabled={atsLoading}
                    className="px-6 py-2.5 rounded-md border border-primary/50 text-sm font-mono text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors"
                  >
                    {atsLoading ? "Scoring..." : "📊 Run ATS Score"}
                  </button>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-6 text-left space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">ATS Score</h3>
                      <span className={`text-4xl font-bold font-mono ${getAtsColor(atsReport.report.ats_score || atsReport.ats_score)}`}>
                        {Math.round(atsReport.report.ats_score || atsReport.ats_score)}%
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { label: "Keywords", val: atsReport.report.keyword_match },
                        { label: "Skills", val: atsReport.report.skill_completeness },
                        { label: "Impact", val: atsReport.report.project_impact },
                        { label: "Verbs", val: atsReport.report.action_verb_strength },
                        { label: "Metrics", val: atsReport.report.measurable_achievements },
                      ].map((m) => (
                        <div key={m.label} className="text-center">
                          <p className="text-[9px] font-mono text-muted-foreground uppercase">{m.label}</p>
                          <p className={`text-lg font-bold font-mono ${getAtsColor(m.val)}`}>{Math.round(m.val)}</p>
                        </div>
                      ))}
                    </div>
                    {atsReport.report.missing_skills?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono text-destructive uppercase mb-1">Missing Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {atsReport.report.missing_skills.map((s) => (
                            <span key={s} className="px-1.5 py-0.5 bg-destructive/10 rounded text-[10px] font-mono text-destructive">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {atsReport.report.improvement_recommendations?.length > 0 && (
                      <div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Recommendations</p>
                        {atsReport.report.improvement_recommendations.map((r, i) => (
                          <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground italic">{atsReport.report.role_fit_summary}</p>
                  </div>
                )}
              </div>
            )}

            {/* Skills */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Skills Detected</h3>
              <div className="flex flex-wrap gap-2">
                {resumeData.skills.map((skill) => (
                  <span key={skill} className="px-2.5 py-1 bg-secondary rounded-md text-xs font-mono text-foreground">{skill}</span>
                ))}
              </div>
            </div>

            {/* Projects */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Projects</h3>
              <div className="space-y-3">
                {resumeData.projects.map((project) => (
                  <div key={project.name} className="border-l-2 border-primary/30 pl-4">
                    <h4 className="text-sm font-semibold text-foreground">{project.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{project.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech) => (
                        <span key={tech} className="px-1.5 py-0.5 bg-primary/10 rounded text-[10px] font-mono text-primary">{tech}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <DifficultyPicker selected={difficulty} onSelect={setDifficulty} />

            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 text-center">Pick a topic to be interviewed on</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resumeData.interview_topics.map((topic) => (
                  <button
                    key={topic.title}
                    onClick={() => setSelectedTopic(topic.title)}
                    className={`text-left p-5 rounded-lg border transition-all duration-300 ${
                      selectedTopic === topic.title ? "border-primary bg-primary/10 card-glow-hover" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <h4 className="text-sm font-semibold text-foreground mb-2">{topic.title}</h4>
                    <div className="flex flex-wrap gap-1">
                      {topic.core_concepts.slice(0, 4).map((c) => (
                        <span key={c} className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono text-muted-foreground">{c}</span>
                      ))}
                      {topic.core_concepts.length > 4 && (
                        <span className="text-[10px] font-mono text-muted-foreground/50">+{topic.core_concepts.length - 4} more</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleStartInterview}
                disabled={!selectedTopic}
                className={`px-10 py-4 rounded-lg font-semibold text-base transition-all duration-300 ${
                  selectedTopic ? "bg-primary text-primary-foreground hover:bg-primary/90 card-glow-hover" : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                {selectedTopic ? "Start Interview →" : "Choose a topic"}
              </button>
            </div>

            <button
              onClick={() => { setResumeData(null); setResumeText(""); setSelectedTopic(null); setAtsReport(null); }}
              className="w-full text-xs font-mono text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              ← Upload a different resume
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ResumeInterview;
