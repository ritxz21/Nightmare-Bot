import { motion, AnimatePresence } from "framer-motion";

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

  const getGlow = (status: ConceptStatus) => {
    switch (status) {
      case "clear": return "0 0 12px hsl(var(--concept-green) / 0.4)";
      case "shallow": return "0 0 8px hsl(var(--concept-yellow) / 0.3)";
      case "missing": return "none";
    }
  };

  const clearCount = concepts.filter((c) => c.status === "clear").length;
  const shallowCount = concepts.filter((c) => c.status === "shallow").length;
  const total = concepts.length;
  const progress = total > 0 ? ((clearCount + shallowCount * 0.5) / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Knowledge Map
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {clearCount}/{total} mastered
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-concept-yellow to-concept-green rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
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
        <AnimatePresence mode="popLayout">
          {concepts.map((concept, i) => (
            <motion.div
              key={concept.name}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{
                opacity: 1,
                scale: 1,
                boxShadow: getGlow(concept.status),
              }}
              transition={{
                duration: 0.5,
                delay: i * 0.03,
                boxShadow: { duration: 0.8 },
              }}
              className={`
                px-3 py-2.5 rounded-md border text-xs font-mono
                flex items-center gap-2 transition-colors duration-500
                ${getStatusColor(concept.status)}
              `}
            >
              <motion.div
                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStatusDot(concept.status)}`}
                animate={
                  concept.status !== "missing"
                    ? { scale: [1, 1.4, 1] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <span className="truncate">{concept.name}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
