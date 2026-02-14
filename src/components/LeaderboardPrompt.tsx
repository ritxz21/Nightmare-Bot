import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface LeaderboardPromptProps {
  open: boolean;
  topicId: string;
  topicTitle: string;
  bluffScore: number;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}

export const LeaderboardPrompt = ({
  open,
  topicTitle,
  bluffScore,
  onSubmit,
  onSkip,
}: LeaderboardPromptProps) => {
  const [name, setName] = useState("");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onSkip()}>
      <DialogContent className="bg-card border-border/50 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground text-center">
            🏆 Submit to Leaderboard?
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            You scored <span className="font-mono font-bold text-primary">{Math.round(bluffScore)}%</span> bluff
            on <span className="font-semibold text-foreground">{topicTitle}</span>.
            Enter your name to appear on the global leaderboard.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            maxLength={30}
            className="w-full px-4 py-2.5 rounded-md bg-secondary border border-border/50 text-foreground font-mono text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onSubmit(name.trim());
            }}
          />
          <div className="flex gap-3">
            <button
              onClick={() => name.trim() && onSubmit(name.trim())}
              disabled={!name.trim()}
              className={`flex-1 px-4 py-2.5 rounded-md text-sm font-semibold transition-colors ${
                name.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              Submit Score
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-2.5 rounded-md text-sm font-mono text-muted-foreground border border-border/50 hover:text-foreground transition-colors"
            >
              Skip
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
