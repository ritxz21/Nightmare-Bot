export type DifficultyLevel = "lightly-grilled" | "medium-rare" | "slow-burnt" | "roasted";

export interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  emoji: string;
  description: string;
  /** Multiplier for vagueness weight in bluff formula (lower = more lenient) */
  vaguenessWeight: number;
  /** Multiplier for missing concepts weight */
  missingWeight: number;
  /** Multiplier for confidence language weight */
  confidenceWeight: number;
  /** How adversarial the follow-up questions should be */
  adversarialLevel: string;
}

export const DIFFICULTIES: DifficultyConfig[] = [
  {
    id: "lightly-grilled",
    label: "Lightly Grilled",
    emoji: "🍳",
    description: "Warm and encouraging. Great for beginners.",
    vaguenessWeight: 0.25,
    missingWeight: 0.3,
    confidenceWeight: 0.1,
    adversarialLevel: "gentle",
  },
  {
    id: "medium-rare",
    label: "Medium Rare",
    emoji: "🔥",
    description: "Fair but probing. Expects some depth.",
    vaguenessWeight: 0.35,
    missingWeight: 0.35,
    confidenceWeight: 0.15,
    adversarialLevel: "moderate",
  },
  {
    id: "slow-burnt",
    label: "Slow Burnt",
    emoji: "🌶️",
    description: "Relentless follow-ups. No hand-waving.",
    vaguenessWeight: 0.4,
    missingWeight: 0.4,
    confidenceWeight: 0.2,
    adversarialLevel: "aggressive",
  },
  {
    id: "roasted",
    label: "Roasted",
    emoji: "💀",
    description: "Brutal. Will find every gap and exploit it.",
    vaguenessWeight: 0.45,
    missingWeight: 0.45,
    confidenceWeight: 0.25,
    adversarialLevel: "ruthless",
  },
];

export const DEFAULT_DIFFICULTY: DifficultyLevel = "medium-rare";
