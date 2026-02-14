import { DIFFICULTIES, DifficultyLevel } from "@/lib/difficulty";

interface DifficultyPickerProps {
  selected: DifficultyLevel;
  onSelect: (level: DifficultyLevel) => void;
}

export const DifficultyPicker = ({ selected, onSelect }: DifficultyPickerProps) => {
  return (
    <div className="w-full max-w-3xl">
      <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 text-center">
        Choose your heat level
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DIFFICULTIES.map((diff) => (
          <button
            key={diff.id}
            onClick={() => onSelect(diff.id)}
            className={`
              relative text-left p-4 rounded-lg border transition-all duration-300
              ${
                selected === diff.id
                  ? "border-primary bg-primary/10 card-glow-hover"
                  : "border-border bg-card hover:border-primary/40"
              }
            `}
          >
            <div
              className={`absolute top-3 right-3 w-2 h-2 rounded-full transition-all duration-300 ${
                selected === diff.id ? "bg-primary animate-pulse-glow" : "bg-muted-foreground/20"
              }`}
            />
            <div className="text-2xl mb-2">{diff.emoji}</div>
            <h4 className="text-sm font-semibold text-foreground mb-1">{diff.label}</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{diff.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
