import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { DifficultyLevel, DEFAULT_DIFFICULTY } from "@/lib/difficulty";
import type { JobDescription } from "@/lib/types";
import { Upload, FileText, ClipboardPaste } from "lucide-react";

const JdPrep = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jdText, setJdText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [jdData, setJdData] = useState<JobDescription | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [resumeMode, setResumeMode] = useState<"upload" | "paste">("upload");
  const [resumeFileName, setResumeFileName] = useState("");
  const [step, setStep] = useState<"jd" | "resume" | "results">("jd");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);
  const [isExtractingResume, setIsExtractingResume] = useState(false);

  const handleResumeFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    const validExtensions = [".pdf", ".doc", ".docx"];
    const hasValidExt = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!validTypes.includes(file.type) && !hasValidExt) {
      toast.error("Please upload a PDF or Word document");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setIsExtractingResume(true);
    setResumeFileName(file.name);
    try {
      // Upload to storage if authenticated
      if (user) {
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        await supabase.storage.from("resumes").upload(filePath, file);
      }

      // Extract text from the file
      const text = await file.text();
      setResumeText(text);
      toast.success(`${file.name} uploaded successfully!`);
    } catch (err) {
      console.error("File upload error:", err);
      toast.error("Failed to process file");
    } finally {
      setIsExtractingResume(false);
    }
  };

  const analyzeJd = async () => {
    if (!jdText.trim()) { toast.error("Please enter a job description"); return; }
    if (!user) { toast.error("Please sign in"); navigate("/auth"); return; }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-jd", {
        body: { jdText: jdText.trim(), resumeText: resumeText.trim() || null },
      });
      if (error) throw error;

      const { data: saved } = await supabase.from("job_descriptions").insert({
        user_id: user.id,
        title: data.title || "Untitled Role",
        raw_text: jdText.trim(),
        extracted_data: data.extracted_data,
        gap_analysis: data.gap_analysis || {},
      }).select().single();

      setJdData({ ...data, id: saved?.id } as JobDescription);
      setStep("results");
      toast.success("JD analyzed!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to analyze JD");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartMock = () => {
    if (!selectedTopic || !jdData) return;
    const topic = {
      id: `jd-${selectedTopic.toLowerCase().replace(/\s+/g, "-")}`,
      title: selectedTopic,
      coreConcepts: jdData.extracted_data.required_skills.slice(0, 8),
    };
    const encoded = encodeURIComponent(JSON.stringify(topic));
    navigate(`/interview/custom?difficulty=${difficulty}&resumeTopic=${encoded}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground font-mono text-sm">Sign in as a candidate to use JD Prep.</p>
          <button onClick={() => navigate("/auth")} className="px-6 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col items-center px-6 py-12">
        {step === "jd" && (
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-foreground mb-4">
                JD-Based <span className="text-primary text-glow">Mock Prep</span>
              </h1>
              <p className="text-muted-foreground">Paste a job description and we'll create a targeted mock interview.</p>
            </div>

            <div className="space-y-4">
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                placeholder="Paste the job description here..."
                className="w-full h-48 bg-card border border-border rounded-lg p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => setStep("resume")}
                disabled={!jdText.trim()}
                className="w-full px-6 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition-all"
              >
                Next: Add Resume (Optional) →
              </button>
            </div>
          </div>
        )}

        {step === "resume" && (
          <div className="max-w-2xl w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">Add Your Resume</h2>
              <p className="text-muted-foreground text-sm">Optional — add your resume for gap analysis against the JD.</p>
            </div>

            {/* Mode toggle */}
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setResumeMode("upload")}
                className={`px-4 py-2 rounded-lg text-sm font-mono transition-all flex items-center gap-2 ${
                  resumeMode === "upload" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
              <button
                onClick={() => setResumeMode("paste")}
                className={`px-4 py-2 rounded-lg text-sm font-mono transition-all flex items-center gap-2 ${
                  resumeMode === "paste" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <ClipboardPaste className="w-3.5 h-3.5" /> Paste Text
              </button>
            </div>

            {resumeMode === "upload" ? (
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/40 rounded-lg p-10 text-center cursor-pointer transition-all hover:bg-card/50"
                >
                  {resumeFileName ? (
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-10 h-10 text-primary" />
                      <p className="text-sm font-mono text-foreground">{resumeFileName}</p>
                      <p className="text-xs text-muted-foreground">Click to replace</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">Click to upload your resume</p>
                      <p className="text-xs text-muted-foreground/60">PDF or Word (.doc, .docx) • Max 10MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleResumeFileUpload}
                    className="hidden"
                  />
                </div>
                {isExtractingResume && (
                  <div className="text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground font-mono">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      Processing file...
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content here (optional)..."
                className="w-full h-48 bg-card border border-border rounded-lg p-4 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}

            <div className="flex gap-3">
              <button onClick={() => setStep("jd")} className="px-6 py-3 rounded-lg text-sm font-mono border border-border text-muted-foreground hover:text-foreground transition-colors">
                ← Back
              </button>
              <button
                onClick={analyzeJd}
                disabled={isAnalyzing}
                className="flex-1 px-6 py-3 rounded-lg font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze JD →"}
              </button>
            </div>
          </div>
        )}

        {step === "results" && jdData && (
          <div className="max-w-3xl w-full space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-2">Analysis Complete 🎯</h2>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {jdData.extracted_data.required_skills.map((s) => (
                  <span key={s} className="px-2.5 py-1 bg-secondary rounded-md text-xs font-mono text-foreground">{s}</span>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Technologies</h3>
              <div className="flex flex-wrap gap-2">
                {jdData.extracted_data.technologies.map((t) => (
                  <span key={t} className="px-2.5 py-1 bg-primary/10 rounded-md text-xs font-mono text-primary">{t}</span>
                ))}
              </div>
            </div>

            {jdData.gap_analysis?.missing_skills?.length > 0 && (
              <div className="bg-card border border-destructive/30 rounded-lg p-6">
                <h3 className="text-xs font-mono text-destructive uppercase tracking-widest mb-3">Skills Gap</h3>
                <div className="flex flex-wrap gap-2">
                  {jdData.gap_analysis.missing_skills.map((s) => (
                    <span key={s} className="px-2.5 py-1 bg-destructive/10 rounded-md text-xs font-mono text-destructive">{s}</span>
                  ))}
                </div>
                {jdData.gap_analysis.improvement_roadmap?.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-xs font-mono text-muted-foreground uppercase">Improvement Roadmap</h4>
                    {jdData.gap_analysis.improvement_roadmap.map((r, i) => (
                      <p key={i} className="text-xs text-muted-foreground">• {r}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DifficultyPicker selected={difficulty} onSelect={setDifficulty} />

            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 text-center">
                Start a mock interview on a JD topic
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {jdData.extracted_data.required_skills.slice(0, 6).map((skill) => (
                  <button
                    key={skill}
                    onClick={() => setSelectedTopic(skill)}
                    className={`text-left p-4 rounded-lg border transition-all ${
                      selectedTopic === skill
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <span className="text-sm font-semibold text-foreground">{skill}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleStartMock}
                disabled={!selectedTopic}
                className={`px-10 py-4 rounded-lg font-semibold text-base transition-all ${
                  selectedTopic ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"
                }`}
              >
                Start Mock Interview →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default JdPrep;
