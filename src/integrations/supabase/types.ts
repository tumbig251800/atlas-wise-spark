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
      diagnostic_events: {
        Row: {
          classroom: string | null
          created_at: string
          decision_object: Json | null
          gap_type: string | null
          grade_level: string | null
          id: string
          intervention_size: string | null
          normalized_topic: string | null
          priority_level: number | null
          status_color: string
          status_label: string | null
          student_id: string | null
          subject: string | null
          teacher_id: string
          teaching_log_id: string
          threshold_pct: number | null
          topic: string | null
        }
        Insert: {
          classroom?: string | null
          created_at?: string
          decision_object?: Json | null
          gap_type?: string | null
          grade_level?: string | null
          id?: string
          intervention_size?: string | null
          normalized_topic?: string | null
          priority_level?: number | null
          status_color: string
          status_label?: string | null
          student_id?: string | null
          subject?: string | null
          teacher_id: string
          teaching_log_id: string
          threshold_pct?: number | null
          topic?: string | null
        }
        Update: {
          classroom?: string | null
          created_at?: string
          decision_object?: Json | null
          gap_type?: string | null
          grade_level?: string | null
          id?: string
          intervention_size?: string | null
          normalized_topic?: string | null
          priority_level?: number | null
          status_color?: string
          status_label?: string | null
          student_id?: string | null
          subject?: string | null
          teacher_id?: string
          teaching_log_id?: string
          threshold_pct?: number | null
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_events_teaching_log_id_fkey"
            columns: ["teaching_log_id"]
            isOneToOne: false
            referencedRelation: "teaching_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      pivot_events: {
        Row: {
          class_id: string
          created_at: string
          evidence_refs: string[]
          id: string
          normalized_topic: string
          reason_code: string
          subject: string
          teacher_id: string
          trigger_session_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          evidence_refs?: string[]
          id?: string
          normalized_topic: string
          reason_code?: string
          subject: string
          teacher_id: string
          trigger_session_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          evidence_refs?: string[]
          id?: string
          normalized_topic?: string
          reason_code?: string
          subject?: string
          teacher_id?: string
          trigger_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pivot_events_trigger_session_id_fkey"
            columns: ["trigger_session_id"]
            isOneToOne: false
            referencedRelation: "teaching_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          teacher_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          teacher_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          teacher_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      remedial_tracking: {
        Row: {
          classroom: string | null
          created_at: string
          grade_level: string | null
          id: string
          normalized_topic: string | null
          remedial_status: string
          student_id: string
          subject: string | null
          teacher_id: string
          teaching_log_id: string
          topic: string | null
        }
        Insert: {
          classroom?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          normalized_topic?: string | null
          remedial_status: string
          student_id: string
          subject?: string | null
          teacher_id: string
          teaching_log_id: string
          topic?: string | null
        }
        Update: {
          classroom?: string | null
          created_at?: string
          grade_level?: string | null
          id?: string
          normalized_topic?: string | null
          remedial_status?: string
          student_id?: string
          subject?: string | null
          teacher_id?: string
          teaching_log_id?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "remedial_tracking_teaching_log_id_fkey"
            columns: ["teaching_log_id"]
            isOneToOne: false
            referencedRelation: "teaching_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      strike_counter: {
        Row: {
          first_strike_at: string | null
          gap_type: string | null
          id: string
          last_session_id: string | null
          last_updated: string
          normalized_topic: string | null
          scope: string
          scope_id: string
          status: string
          strike_count: number
          subject: string | null
          teacher_id: string
          topic: string | null
        }
        Insert: {
          first_strike_at?: string | null
          gap_type?: string | null
          id?: string
          last_session_id?: string | null
          last_updated?: string
          normalized_topic?: string | null
          scope: string
          scope_id: string
          status?: string
          strike_count?: number
          subject?: string | null
          teacher_id: string
          topic?: string | null
        }
        Update: {
          first_strike_at?: string | null
          gap_type?: string | null
          id?: string
          last_session_id?: string | null
          last_updated?: string
          normalized_topic?: string | null
          scope?: string
          scope_id?: string
          status?: string
          strike_count?: number
          subject?: string | null
          teacher_id?: string
          topic?: string | null
        }
        Relationships: []
      }
      teaching_logs: {
        Row: {
          activity_mode: Database["public"]["Enums"]["activity_mode"]
          classroom: string
          classroom_management: string | null
          created_at: string
          grade_level: string
          health_care_ids: string | null
          health_care_status: boolean
          id: string
          key_issue: string | null
          learning_unit: string | null
          major_gap: Database["public"]["Enums"]["major_gap"]
          mastery_score: number
          next_strategy: string | null
          reflection: string | null
          remedial_ids: string | null
          subject: string
          teacher_id: string
          teaching_date: string
          topic: string | null
          total_students: number | null
          updated_at: string
        }
        Insert: {
          activity_mode?: Database["public"]["Enums"]["activity_mode"]
          classroom: string
          classroom_management?: string | null
          created_at?: string
          grade_level: string
          health_care_ids?: string | null
          health_care_status?: boolean
          id?: string
          key_issue?: string | null
          learning_unit?: string | null
          major_gap?: Database["public"]["Enums"]["major_gap"]
          mastery_score: number
          next_strategy?: string | null
          reflection?: string | null
          remedial_ids?: string | null
          subject: string
          teacher_id: string
          teaching_date?: string
          topic?: string | null
          total_students?: number | null
          updated_at?: string
        }
        Update: {
          activity_mode?: Database["public"]["Enums"]["activity_mode"]
          classroom?: string
          classroom_management?: string | null
          created_at?: string
          grade_level?: string
          health_care_ids?: string | null
          health_care_status?: boolean
          id?: string
          key_issue?: string | null
          learning_unit?: string | null
          major_gap?: Database["public"]["Enums"]["major_gap"]
          mastery_score?: number
          next_strategy?: string | null
          reflection?: string | null
          remedial_ids?: string | null
          subject?: string
          teacher_id?: string
          teaching_date?: string
          topic?: string | null
          total_students?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_class_strike: {
        Args: {
          p_gap_rate: number
          p_gap_type: string
          p_is_a2_gap: boolean
          p_is_system_gap: boolean
          p_normalized_topic: string
          p_scope_id: string
          p_session_id: string
          p_subject: string
          p_teacher_id: string
          p_topic: string
        }
        Returns: Json
      }
    }
    Enums: {
      activity_mode: "active" | "passive" | "constructive"
      app_role: "teacher" | "director"
      major_gap:
        | "k-gap"
        | "p-gap"
        | "a-gap"
        | "success"
        | "system-gap"
        | "a2-gap"
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
      activity_mode: ["active", "passive", "constructive"],
      app_role: ["teacher", "director"],
      major_gap: ["k-gap", "p-gap", "a-gap", "success", "system-gap", "a2-gap"],
    },
  },
} as const
