interface BluffMeterProps {
  score: number; // 0-100
}

export const BluffMeter = ({ score }: BluffMeterProps) => {
  const getColor = () => {
    if (score < 30) return "bg-concept-green";
    if (score < 60) return "bg-concept-yellow";
    return "bg-concept-red";
  };

  const getLabel = () => {
    if (score < 20) return "Genuine";
    if (score < 40) return "Mostly Clear";
    if (score < 60) return "Getting Vague";
    if (score < 80) return "Likely Bluffing";
    return "Full Bluff";
  };

  const getGlow = () => {
    if (score < 30) return "shadow-[0_0_20px_-4px_hsl(var(--concept-green)/0.4)]";
    if (score < 60) return "shadow-[0_0_20px_-4px_hsl(var(--concept-yellow)/0.4)]";
    return "shadow-[0_0_20px_-4px_hsl(var(--concept-red)/0.5)]";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Bluff Score
        </h3>
        <span className="text-2xl font-bold font-mono text-foreground">
          {score}%
        </span>
      </div>

      {/* Bar */}
      <div className={`h-3 bg-secondary rounded-full overflow-hidden ${getGlow()}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className="text-xs font-mono text-muted-foreground text-right">
        {getLabel()}
      </p>
    </div>
  );
};
