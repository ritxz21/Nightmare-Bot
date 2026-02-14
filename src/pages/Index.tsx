import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TOPICS } from "@/lib/topics";
import { TopicCard } from "@/components/TopicCard";
import { DifficultyPicker } from "@/components/DifficultyPicker";
import { DifficultyLevel, DEFAULT_DIFFICULTY } from "@/lib/difficulty";

const Index = () => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>(DEFAULT_DIFFICULTY);
  const navigate = useNavigate();

  const handleStart = () => {
    if (!selectedTopic) return;
    navigate(`/interview/${selectedTopic}?difficulty=${difficulty}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-sm font-mono text-muted-foreground tracking-wider uppercase">
              DeepFake Interviewer
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/resume")} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              Resume
            </button>
            <button onClick={() => navigate("/dashboard")} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              Interviewer
            </button>
            <button onClick={() => navigate("/history")} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              History
            </button>
            <button onClick={() => navigate("/auth")} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="max-w-3xl w-full text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
            Do you <span className="text-primary text-glow">really</span>{" "}
            understand it?
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            An adversarial AI interviewer that stress-tests your knowledge.
            No hand-waving. No bluffing. Just understanding.
          </p>
        </div>

        {/* Difficulty Selection */}
        <div className="w-full max-w-3xl mb-10">
          <DifficultyPicker selected={difficulty} onSelect={setDifficulty} />
        </div>

        {/* Topic Selection */}
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

        {/* Start Button */}
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
      </main>

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
