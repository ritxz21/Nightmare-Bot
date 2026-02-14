import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TOPICS } from "@/lib/topics";
import { TopicCard } from "@/components/TopicCard";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { DifficultyLevel, DEFAULT_DIFFICULTY } from "@/lib/difficulty";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { motion } from "framer-motion";
import { FileText, Briefcase, Trophy, ArrowRight, Zap, Brain, Target } from "lucide-react";

const Index = () => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStart = () => {
    if (!selectedTopic) return;
    navigate(`/interview/${selectedTopic}?difficulty=${difficulty}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-6 pt-20 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl w-full text-center mb-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
            Do you <span className="text-primary text-glow">really</span>{" "}
            understand it?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            An adversarial AI interviewer that stress-tests your knowledge.
            No hand-waving. No bluffing. Just understanding.
          </p>
        </motion.div>

        {/* Quick Action Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full mb-16"
        >
          <button
            onClick={() => navigate("/resume")}
            className="group text-left p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Resume Review</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload your resume and get grilled on what you claim to know.
            </p>
            <div className="flex items-center gap-1 mt-3 text-[10px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Get started <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <button
            onClick={() => user ? navigate("/jd-prep") : navigate("/auth")}
            className="group text-left p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">JD Prep</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Paste a job description for a targeted mock interview.
            </p>
            <div className="flex items-center gap-1 mt-3 text-[10px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Get started <ArrowRight className="w-3 h-3" />
            </div>
          </button>

          <button
            onClick={() => navigate("/leaderboard")}
            className="group text-left p-5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-card/80 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Leaderboard</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              See who can survive the interrogation with the lowest bluff score.
            </p>
            <div className="flex items-center gap-1 mt-3 text-[10px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              View rankings <ArrowRight className="w-3 h-3" />
            </div>
          </button>
        </motion.div>
      </section>

      {/* How It Works */}
      <section className="px-6 pb-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-6 mb-10">
            {[
              { icon: Brain, label: "Pick a topic" },
              { icon: Zap, label: "AI interrogates you" },
              { icon: Target, label: "Get your bluff score" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <step.icon className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{step.label}</span>
                </div>
                {i < 2 && <ArrowRight className="w-3 h-3 text-muted-foreground/30" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Topic Selection */}
      <section className="flex-1 flex flex-col items-center px-6 pb-16">
        <div className="w-full max-w-3xl mb-6">
          <DifficultyPicker selected={difficulty} onSelect={setDifficulty} />
        </div>

        <div className="w-full max-w-3xl mb-12">
          <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-6 text-center">
            Select a topic to begin
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TOPICS.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                selected={selectedTopic === topic.id}
                onSelect={setSelectedTopic}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!selectedTopic}
          className={`
            relative px-10 py-4 rounded-lg font-semibold text-base font-sans
            transition-all duration-300 
            ${
              selectedTopic
                ? "bg-primary text-primary-foreground hover:bg-primary/90 card-glow-hover cursor-pointer"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }
          `}
        >
          {selectedTopic ? "Start Interview →" : "Choose a topic"}
        </button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 px-6 py-4">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs font-mono text-muted-foreground/40">
            Powered by adversarial prompting • No ML classifiers • Just clever reasoning
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
