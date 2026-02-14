interface VoiceOrbProps {
  status: "idle" | "connecting" | "listening" | "speaking";
}

export const VoiceOrb = ({ status }: VoiceOrbProps) => {
  const getStatusLabel = () => {
    switch (status) {
      case "idle": return "Ready";
      case "connecting": return "Connecting...";
      case "listening": return "Listening";
      case "speaking": return "Speaking";
    }
  };

  const isActive = status === "listening" || status === "speaking";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Orb */}
      <div className="relative flex items-center justify-center">
        {/* Outer glow rings */}
        {isActive && (
          <>
            <div
              className="absolute w-40 h-40 rounded-full border border-primary/20 animate-ping"
              style={{ animationDuration: "2s" }}
            />
            <div
              className="absolute w-48 h-48 rounded-full border border-primary/10 animate-ping"
              style={{ animationDuration: "3s" }}
            />
          </>
        )}

        {/* Main orb */}
        <div
          className={`
            relative w-28 h-28 rounded-full flex items-center justify-center
            transition-all duration-700
            ${status === "idle" ? "bg-muted" : ""}
            ${status === "connecting" ? "bg-muted animate-pulse" : ""}
            ${status === "listening" ? "bg-primary/20 shadow-[0_0_60px_20px_hsl(var(--primary)/0.2)]" : ""}
            ${status === "speaking" ? "bg-primary/30 shadow-[0_0_80px_30px_hsl(var(--primary)/0.3)]" : ""}
          `}
        >
          {/* Inner core */}
          <div
            className={`
              w-16 h-16 rounded-full transition-all duration-500
              ${status === "idle" ? "bg-muted-foreground/20" : ""}
              ${status === "connecting" ? "bg-muted-foreground/30 animate-pulse" : ""}
              ${status === "listening" ? "bg-primary/50 animate-pulse-glow" : ""}
              ${status === "speaking" ? "bg-primary animate-pulse-glow" : ""}
            `}
          />
        </div>
      </div>

      {/* Status label */}
      <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
        {getStatusLabel()}
      </span>
    </div>
  );
};
