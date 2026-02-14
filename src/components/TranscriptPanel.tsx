export interface TranscriptEntry {
  role: "user" | "agent";
  text: string;
  timestamp: Date;
}

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

export const TranscriptPanel = ({ entries }: TranscriptPanelProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Transcript
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground/50 italic text-center mt-8">
            Conversation will appear here...
          </p>
        )}

        {entries.map((entry, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${
              entry.role === "agent" ? "items-start" : "items-end"
            }`}
          >
            <span className="text-[10px] font-mono text-muted-foreground/40 uppercase">
              {entry.role === "agent" ? "Interviewer" : "You"}
            </span>
            <div
              className={`
                max-w-[90%] px-3 py-2 rounded-lg text-sm leading-relaxed
                ${
                  entry.role === "agent"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-primary/10 text-foreground border border-primary/20"
                }
              `}
            >
              {entry.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
