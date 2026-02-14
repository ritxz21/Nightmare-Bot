import { Topic } from "@/lib/topics";

interface TopicCardProps {
  topic: Topic;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const TopicCard = ({ topic, selected, onSelect }: TopicCardProps) => {
  return (
    <button
      onClick={() => onSelect(topic.id)}
      className={`
        relative group w-full text-left p-6 rounded-lg border transition-all duration-300
        ${
          selected
            ? "border-primary bg-primary/10 card-glow-hover"
            : "border-border bg-card hover:border-primary/40 hover:card-glow"
        }
      `}
    >
      {/* Selection indicator */}
      <div
        className={`absolute top-4 right-4 w-3 h-3 rounded-full transition-all duration-300 ${
          selected ? "bg-primary animate-pulse-glow" : "bg-muted-foreground/20"
        }`}
      />

      <div className="text-4xl mb-4">{topic.icon}</div>

      <h3 className="text-xl font-semibold text-foreground mb-2 font-sans">
        {topic.title}
      </h3>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {topic.description}
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground font-mono">
        <span>{topic.coreConcepts.length} concepts</span>
        <span className="text-primary/40">•</span>
        <span>~10 min</span>
      </div>
    </button>
  );
};
