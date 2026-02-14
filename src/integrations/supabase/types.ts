export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ats_reports: {
        Row: {
          ats_score: number
          created_at: string
          id: string
          report: Json
          resume_hash: string
          user_id: string
        }
        Insert: {
          ats_score?: number
          created_at?: string
          id?: string
          report?: Json
          resume_hash: string
          user_id: string
        }
        Update: {
          ats_score?: number
          created_at?: string
          id?: string
          report?: Json
          resume_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_invites: {
        Row: {
          completed_at: string | null
          deadline: string | null
          id: string
          interviewee_id: string | null
          invite_email: string | null
          invite_token: string | null
          job_role_id: string
          sent_at: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          deadline?: string | null
          id?: string
          interviewee_id?: string | null
          invite_email?: string | null
          invite_token?: string | null
          job_role_id: string
          sent_at?: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          deadline?: string | null
          id?: string
          interviewee_id?: string | null
          invite_email?: string | null
          invite_token?: string | null
          job_role_id?: string
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_invites_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          ats_snapshot: Json | null
          bluff_history: Json
          concept_coverage: Json
          created_at: string
          final_bluff_score: number
          id: string
          job_role_id: string | null
          mode: string
          status: string
          topic_id: string
          topic_title: string
          transcript: Json
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          ats_snapshot?: Json | null
          bluff_history?: Json
          concept_coverage?: Json
          created_at?: string
          final_bluff_score?: number
          id?: string
          job_role_id?: string | null
          mode?: string
          status?: string
          topic_id: string
          topic_title: string
          transcript?: Json
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          ats_snapshot?: Json | null
          bluff_history?: Json
          concept_coverage?: Json
          created_at?: string
          final_bluff_score?: number
          id?: string
          job_role_id?: string | null
          mode?: string
          status?: string
          topic_id?: string
          topic_title?: string
          transcript?: Json
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_job_role_id_fkey"
            columns: ["job_role_id"]
            isOneToOne: false
            referencedRelation: "job_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_descriptions: {
        Row: {
          created_at: string
          extracted_data: Json
          gap_analysis: Json
          id: string
          raw_text: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_data?: Json
          gap_analysis?: Json
          id?: string
          raw_text: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_data?: Json
          gap_analysis?: Json
          id?: string
          raw_text?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      job_roles: {
        Row: {
          company_name: string
          created_at: string
          custom_topics: Json
          difficulty_level: string
          evaluation_weights: Json
          id: string
          interviewer_id: string
          job_title: string
          min_ats_score: number | null
        }
        Insert: {
          company_name: string
          created_at?: string
          custom_topics?: Json
          difficulty_level?: string
          evaluation_weights?: Json
          id?: string
          interviewer_id: string
          job_title: string
          min_ats_score?: number | null
        }
        Update: {
          company_name?: string
          created_at?: string
          custom_topics?: Json
          difficulty_level?: string
          evaluation_weights?: Json
          id?: string
          interviewer_id?: string
          job_title?: string
          min_ats_score?: number | null
        }
        Relationships: []
      }
      leaderboard_entries: {
        Row: {
          avg_bluff_score: number
          best_bluff_score: number
          created_at: string
          id: string
          player_name: string
          sessions_count: number
          topic_id: string
          topic_title: string
          updated_at: string
        }
        Insert: {
          avg_bluff_score?: number
          best_bluff_score?: number
          created_at?: string
          id?: string
          player_name: string
          sessions_count?: number
          topic_id: string
          topic_title: string
          updated_at?: string
        }
        Update: {
          avg_bluff_score?: number
          best_bluff_score?: number
          created_at?: string
          id?: string
          player_name?: string
          sessions_count?: number
          topic_id?: string
          topic_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      resume_topics: {
        Row: {
          created_at: string
          extracted_data: Json
          generated_topics: Json
          id: string
          resume_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          extracted_data?: Json
          generated_topics?: Json
          id?: string
          resume_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          extracted_data?: Json
          generated_topics?: Json
          id?: string
          resume_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invite: {
        Args: { _token: string; _user_id: string }
        Returns: string
      }
      get_user_email: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_session_owner: { Args: { session_id: string }; Returns: boolean }
      lookup_invite_by_token: {
        Args: { _token: string }
        Returns: {
          company_name: string
          deadline: string
          difficulty_level: string
          id: string
          job_role_id: string
          job_title: string
          status: string
        }[]
      }
    }
    Enums: {
      app_role: "interviewer" | "interviewee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["interviewer", "interviewee"],
    },
  },
} as const
