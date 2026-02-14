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
  job_role_id?: string | null;
  mode: string;
  ats_snapshot?: Record<string, unknown> | null;
  video_url?: string | null;
}

export interface AtsReport {
  id: string;
  user_id: string;
  resume_hash: string;
  ats_score: number;
  report: {
    ats_score: number;
    keyword_match: number;
    skill_completeness: number;
    project_impact: number;
    action_verb_strength: number;
    measurable_achievements: number;
    missing_skills: string[];
    improvement_recommendations: string[];
    role_fit_summary: string;
  };
  created_at: string;
}

export interface JobRole {
  id: string;
  interviewer_id: string;
  company_name: string;
  job_title: string;
  difficulty_level: string;
  custom_topics: { title: string; core_concepts: string[] }[];
  evaluation_weights: Record<string, number>;
  min_ats_score?: number | null;
  created_at: string;
}

export interface InterviewInvite {
  id: string;
  job_role_id: string;
  interviewee_id?: string | null;
  invite_email?: string | null;
  invite_token: string;
  status: string;
  sent_at: string;
  completed_at?: string | null;
  deadline?: string | null;
  // Joined fields
  job_roles?: JobRole;
}

export interface JobDescription {
  id: string;
  user_id: string;
  title: string;
  raw_text: string;
  extracted_data: {
    required_skills: string[];
    technologies: string[];
    seniority_level: string;
    core_responsibilities: string[];
  };
  gap_analysis: {
    matching_skills: string[];
    missing_skills: string[];
    improvement_roadmap: string[];
    resume_suggestions: string[];
  };
  created_at: string;
}
