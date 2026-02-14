import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaderboardEntry {
  id: string;
  player_name: string;
  topic_id: string;
  topic_title: string;
  avg_bluff_score: number;
  sessions_count: number;
  best_bluff_score: number;
}

const getRankBadge = (rank: number) => {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
};

const getGradeLabel = (score: number) => {
  if (score < 20) return { label: "Expert", className: "text-concept-green" };
  if (score < 40) return { label: "Solid", className: "text-concept-green" };
  if (score < 60) return { label: "Surface", className: "text-concept-yellow" };
  if (score < 80) return { label: "Bluffer", className: "text-primary" };
  return { label: "Exposed", className: "text-primary" };
};

const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("leaderboard_entries")
        .select("*")
        .order("avg_bluff_score", { ascending: true });
      if (!error && data) setEntries(data as LeaderboardEntry[]);
      setLoading(false);
    };
    load();
  }, []);

  const topics = Array.from(new Set(entries.map((e) => e.topic_title)));
  const filtered = filter === "all" ? entries : entries.filter((e) => e.topic_title === filter);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight">
              🏆 Leaderboard
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Ranked by lowest average bluff score. Less bluffing = deeper understanding.
            </p>
          </div>

          {/* Topic Filter */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                filter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              All Topics
            </button>
            {topics.map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  filter === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground font-mono text-sm animate-pulse">
              Loading leaderboard...
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground font-mono text-sm py-12">
              No entries yet. Be the first!
            </p>
          ) : (
            <div className="bg-card border border-border/50 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="w-16 text-center">Rank</TableHead>
                    <TableHead>Player</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead className="text-center">Sessions</TableHead>
                    <TableHead className="text-center">Best Score</TableHead>
                    <TableHead className="text-center">Avg Score</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry, i) => {
                    const grade = getGradeLabel(entry.avg_bluff_score);
                    return (
                      <TableRow key={entry.id} className="border-border/20">
                        <TableCell className="text-center font-mono text-lg">
                          {getRankBadge(i + 1)}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground">
                          {entry.player_name}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                            {entry.topic_title}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {entry.sessions_count}
                        </TableCell>
                        <TableCell className="text-center font-mono text-concept-green">
                          {Math.round(entry.best_bluff_score)}%
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold">
                          {Math.round(entry.avg_bluff_score)}%
                        </TableCell>
                        <TableCell className={`text-center font-mono font-semibold ${grade.className}`}>
                          {grade.label}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
