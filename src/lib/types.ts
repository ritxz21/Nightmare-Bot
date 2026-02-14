import { ConceptNode } from "@/components/KnowledgeMap";

export interface SessionRow {
  id: string;
  user_id: string;
  topic_id: string;
  topic_title: string;
  transcript: { role: string; text: string; timestamp: string }[];
  bluff_history: { timestamp: string; score: number }[];
  concept_coverage: ConceptNode[];
  final_bluff_score: number;
  status: string;
  created_at: string;
  updated_at: string;
}
