export type ConceptStatus = "missing" | "shallow" | "clear";

export interface ConceptNode {
  name: string;
  status: ConceptStatus;
}

interface KnowledgeMapProps {
  concepts: ConceptNode[];
}

export const KnowledgeMap = ({ concepts }: KnowledgeMapProps) => {
  const getStatusColor = (status: ConceptStatus) => {
    switch (status) {
      case "clear": return "bg-concept-green/20 border-concept-green/40 text-concept-green";
      case "shallow": return "bg-concept-yellow/15 border-concept-yellow/30 text-concept-yellow";
      case "missing": return "bg-secondary border-border text-muted-foreground/50";
    }
  };

  const getStatusDot = (status: ConceptStatus) => {
    switch (status) {
      case "clear": return "bg-concept-green";
      case "shallow": return "bg-concept-yellow";
      case "missing": return "bg-muted-foreground/30";
    }
  };

  const clearCount = concepts.filter((c) => c.status === "clear").length;
  const shallowCount = concepts.filter((c) => c.status === "shallow").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Knowledge Map
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {clearCount}/{concepts.length} mastered
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-concept-green" />
          <span className="text-[10px] font-mono text-muted-foreground">Clear</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-concept-yellow" />
          <span className="text-[10px] font-mono text-muted-foreground">Shallow</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <span className="text-[10px] font-mono text-muted-foreground">Missing</span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2">
        {concepts.map((concept) => (
          <div
            key={concept.name}
            className={`
              px-3 py-2.5 rounded-md border text-xs font-mono
              flex items-center gap-2 transition-all duration-500
              ${getStatusColor(concept.status)}
            `}
          >
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(concept.status)}`} />
            <span className="truncate">{concept.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
