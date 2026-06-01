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
      action_plan_items: {
        Row: {
          ai_owner: string | null
          ai_priority: string | null
          ai_summary: string | null
          auto_resolved: boolean
          calendar_event_id: string | null
          calendar_html_link: string | null
          classroom: string | null
          created_at: string
          detail: string | null
          due_date: string | null
          due_in_days: number | null
          grade_level: string | null
          id: number
          issue_key: string
          issue_type: string
          mastery_avg_previous: number | null
          mastery_avg_recent: number | null
          metric_label: string | null
          metric_value: number | null
          resolution_note: string | null
          resolved_at: string | null
          run_date: string | null
          severity: string
          status: string
          subject: string | null
          teacher_id: string | null
          teacher_name: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          watch_checked_at: string | null
          watch_started_at: string | null
          wf4_logged_at: string | null
        }
        Insert: {
          ai_owner?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          auto_resolved?: boolean
          calendar_event_id?: string | null
          calendar_html_link?: string | null
          classroom?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          due_in_days?: number | null
          grade_level?: string | null
          id?: number
          issue_key: string
          issue_type: string
          mastery_avg_previous?: number | null
          mastery_avg_recent?: number | null
          metric_label?: string | null
          metric_value?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          run_date?: string | null
          severity: string
          status?: string
          subject?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          watch_checked_at?: string | null
          watch_started_at?: string | null
          wf4_logged_at?: string | null
        }
        Update: {
          ai_owner?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          auto_resolved?: boolean
          calendar_event_id?: string | null
          calendar_html_link?: string | null
          classroom?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          due_in_days?: number | null
          grade_level?: string | null
          id?: number
          issue_key?: string
          issue_type?: string
          mastery_avg_previous?: number | null
          mastery_avg_recent?: number | null
          metric_label?: string | null
          metric_value?: number | null
          resolution_note?: string | null
          resolved_at?: string | null
          run_date?: string | null
          severity?: string
          status?: string
          subject?: string | null
          teacher_id?: string | null
          teacher_name?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          watch_checked_at?: string | null
          watch_started_at?: string | null
          wf4_logged_at?: string | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          function_name: string
          last_request_at: string
          user_id: string
        }
        Insert: {
          function_name: string
          last_request_at?: string
          user_id: string
        }
        Update: {
          function_name?: string
          last_request_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnostic_events: {
        Row: {
          classroom: string | null
          created_at: string
          decision_object: Json
          decision_status: string | null
          event_kind: string
          gap_type: string | null
          grade_level: string | null
          id: string
          intervention_size: string | null
          normalized_topic: string | null
          priority_level: number | null
          status_color: string | null
          status_label: string | null
          student_id: string | null
          subject: string | null
          tags: string[] | null
          teacher_id: string
          teaching_log_id: string
          threshold_pct: number | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          classroom?: string | null
          created_at?: string
          decision_object?: Json
          decision_status?: string | null
          event_kind?: string
          gap_type?: string | null
          grade_level?: string | null
          id?: string
          intervention_size?: string | null
          normalized_topic?: string | null
          priority_level?: number | null
          status_color?: string | null
          status_label?: string | null
          student_id?: string | null
          subject?: string | null
          tags?: string[] | null
          teacher_id: string
          teaching_log_id: string
          threshold_pct?: number | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          classroom?: string | null
          created_at?: string
          decision_object?: Json
          decision_status?: string | null
          event_kind?: string
          gap_type?: string | null
          grade_level?: string | null
          id?: string
          intervention_size?: string | null
          normalized_topic?: string | null
          priority_level?: number | null
          status_color?: string | null
          status_label?: string | null
          student_id?: string | null
          subject?: string | null
          tags?: string[] | null
          teacher_id?: string
          teaching_log_id?: string
          threshold_pct?: number | null
          topic?: string | null
          updated_at?: string
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
      lesson_plan_snapshots: {
        Row: {
          classroom: string
          created_at: string
          grade_level: string
          id: string
          label: string | null
          snapshot_class_profile: string
          snapshot_focus: string
          snapshot_notes: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          classroom?: string
          created_at?: string
          grade_level?: string
          id?: string
          label?: string | null
          snapshot_class_profile?: string
          snapshot_focus?: string
          snapshot_notes?: string
          subject?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          classroom?: string
          created_at?: string
          grade_level?: string
          id?: string
          label?: string | null
          snapshot_class_profile?: string
          snapshot_focus?: string
          snapshot_notes?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nidet_visits: {
        Row: {
          action_item_id: number
          created_at: string
          follow_up_date: string | null
          follow_up_method: string | null
          id: string
          improvements: string | null
          recommendations: string | null
          rubric_activity_design: number | null
          rubric_classroom_climate: number | null
          rubric_collaborative: number | null
          rubric_feedback: number | null
          rubric_formative_assess: number | null
          rubric_individual_care: number | null
          rubric_media_tech: number | null
          rubric_questioning: number | null
          strengths: string | null
          supervisor_id: string | null
          supervisor_name: string
          updated_at: string
          visit_date: string
        }
        Insert: {
          action_item_id: number
          created_at?: string
          follow_up_date?: string | null
          follow_up_method?: string | null
          id?: string
          improvements?: string | null
          recommendations?: string | null
          rubric_activity_design?: number | null
          rubric_classroom_climate?: number | null
          rubric_collaborative?: number | null
          rubric_feedback?: number | null
          rubric_formative_assess?: number | null
          rubric_individual_care?: number | null
          rubric_media_tech?: number | null
          rubric_questioning?: number | null
          strengths?: string | null
          supervisor_id?: string | null
          supervisor_name?: string
          updated_at?: string
          visit_date?: string
        }
        Update: {
          action_item_id?: number
          created_at?: string
          follow_up_date?: string | null
          follow_up_method?: string | null
          id?: string
          improvements?: string | null
          recommendations?: string | null
          rubric_activity_design?: number | null
          rubric_classroom_climate?: number | null
          rubric_collaborative?: number | null
          rubric_feedback?: number | null
          rubric_formative_assess?: number | null
          rubric_individual_care?: number | null
          rubric_media_tech?: number | null
          rubric_questioning?: number | null
          strengths?: string | null
          supervisor_id?: string | null
          supervisor_name?: string
          updated_at?: string
          visit_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "nidet_visits_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      pivot_events: {
        Row: {
          classroom: string
          created_at: string
          decision_object: Json | null
          gap_type: string | null
          grade_level: string
          id: string
          intervention_size: string | null
          normalized_topic: string | null
          priority_level: number | null
          status_color: string
          status_label: string | null
          student_id: string
          subject: string
          teacher_id: string
          teaching_log_id: string
          threshold_pct: number | null
          topic: string
        }
        Insert: {
          classroom: string
          created_at?: string
          decision_object?: Json | null
          gap_type?: string | null
          grade_level: string
          id?: string
          intervention_size?: string | null
          normalized_topic?: string | null
          priority_level?: number | null
          status_color?: string
          status_label?: string | null
          student_id: string
          subject: string
          teacher_id: string
          teaching_log_id: string
          threshold_pct?: number | null
          topic: string
        }
        Update: {
          classroom?: string
          created_at?: string
          decision_object?: Json | null
          gap_type?: string | null
          grade_level?: string
          id?: string
          intervention_size?: string | null
          normalized_topic?: string | null
          priority_level?: number | null
          status_color?: string
          status_label?: string | null
          student_id?: string
          subject?: string
          teacher_id?: string
          teaching_log_id?: string
          threshold_pct?: number | null
          topic?: string
        }
        Relationships: [
          {
            foreignKeyName: "pivot_events_teaching_log_id_fkey"
            columns: ["teaching_log_id"]
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
      strike_counter: {
        Row: {
          classroom: string | null
          first_strike_at: string | null
          gap_type: string | null
          grade_level: string | null
          id: string
          last_session_id: string | null
          last_updated: string
          normalized_topic: string | null
          scope: string | null
          scope_id: string | null
          status: string
          strike_count: number
          student_id: string | null
          subject: string
          teacher_id: string
          topic: string
        }
        Insert: {
          classroom?: string | null
          first_strike_at?: string | null
          gap_type?: string | null
          grade_level?: string | null
          id?: string
          last_session_id?: string | null
          last_updated?: string
          normalized_topic?: string | null
          scope?: string | null
          scope_id?: string | null
          status?: string
          strike_count?: number
          student_id?: string | null
          subject: string
          teacher_id: string
          topic: string
        }
        Update: {
          classroom?: string | null
          first_strike_at?: string | null
          gap_type?: string | null
          grade_level?: string | null
          id?: string
          last_session_id?: string | null
          last_updated?: string
          normalized_topic?: string | null
          scope?: string | null
          scope_id?: string | null
          status?: string
          strike_count?: number
          student_id?: string | null
          subject?: string
          teacher_id?: string
          topic?: string
        }
        Relationships: []
      }
      student_support_plans: {
        Row: {
          care_plan: string | null
          concern: string | null
          created_at: string
          follow_up_date: string | null
          gap_type: string
          id: number
          resolved_at: string | null
          resolved_note: string | null
          source_log_id: string | null
          status: string
          student_id: string
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          care_plan?: string | null
          concern?: string | null
          created_at?: string
          follow_up_date?: string | null
          gap_type: string
          id?: number
          resolved_at?: string | null
          resolved_note?: string | null
          source_log_id?: string | null
          status?: string
          student_id: string
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          care_plan?: string | null
          concern?: string | null
          created_at?: string
          follow_up_date?: string | null
          gap_type?: string
          id?: number
          resolved_at?: string | null
          resolved_note?: string | null
          source_log_id?: string | null
          status?: string
          student_id?: string
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "special_care_plans_source_log_id_fkey"
            columns: ["source_log_id"]
            isOneToOne: false
            referencedRelation: "teaching_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          classroom: string | null
          created_at: string
          first_name: string
          grade_level: string | null
          id: string
          is_active: boolean
          last_name: string
          student_code: string | null
          updated_at: string
        }
        Insert: {
          classroom?: string | null
          created_at?: string
          first_name: string
          grade_level?: string | null
          id?: string
          is_active?: boolean
          last_name: string
          student_code?: string | null
          updated_at?: string
        }
        Update: {
          classroom?: string | null
          created_at?: string
          first_name?: string
          grade_level?: string | null
          id?: string
          is_active?: boolean
          last_name?: string
          student_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      teachers: {
        Row: {
          created_at: string
          display_name: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      teaching_logs: {
        Row: {
          academic_term: string | null
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
          lesson_topic: string | null
          major_gap: Database["public"]["Enums"]["major_gap"]
          mastery_score: number
          meta: Json
          minor_gaps: Database["public"]["Enums"]["major_gap"][]
          next_strategy: string | null
          notes: string | null
          reflection: string | null
          remedial_ids: string | null
          subject: string
          teacher_id: string
          teacher_name: string | null
          teaching_date: string
          topic: string | null
          total_students: number | null
          unit_name: string | null
          updated_at: string
        }
        Insert: {
          academic_term?: string | null
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
          lesson_topic?: string | null
          major_gap?: Database["public"]["Enums"]["major_gap"]
          mastery_score?: number
          meta?: Json
          minor_gaps?: Database["public"]["Enums"]["major_gap"][]
          next_strategy?: string | null
          notes?: string | null
          reflection?: string | null
          remedial_ids?: string | null
          subject: string
          teacher_id: string
          teacher_name?: string | null
          teaching_date: string
          topic?: string | null
          total_students?: number | null
          unit_name?: string | null
          updated_at?: string
        }
        Update: {
          academic_term?: string | null
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
          lesson_topic?: string | null
          major_gap?: Database["public"]["Enums"]["major_gap"]
          mastery_score?: number
          meta?: Json
          minor_gaps?: Database["public"]["Enums"]["major_gap"][]
          next_strategy?: string | null
          notes?: string | null
          reflection?: string | null
          remedial_ids?: string | null
          subject?: string
          teacher_id?: string
          teacher_name?: string | null
          teaching_date?: string
          topic?: string | null
          total_students?: number | null
          unit_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      topic_aliases: {
        Row: {
          alias: string
          canonical: string
          created_at: string
          id: string
          subject: string | null
        }
        Insert: {
          alias: string
          canonical: string
          created_at?: string
          id?: string
          subject?: string | null
        }
        Update: {
          alias?: string
          canonical?: string
          created_at?: string
          id?: string
          subject?: string | null
        }
        Relationships: []
      }
      unit_assessments: {
        Row: {
          a1_score: number | null
          a2_score: number | null
          a3_score: number | null
          a4_score: number | null
          a5_score: number | null
          a6_score: number | null
          academic_term: string | null
          art_culture_score: number | null
          assessed_by: string | null
          assessed_date: string | null
          calculating_score: number | null
          classroom: string
          competency_assessed_date: string | null
          competency_note: string | null
          created_at: string | null
          economy_finance_score: number | null
          grade_level: string
          health_score: number | null
          id: string
          reading_score: number | null
          sci_tech_score: number | null
          score: number
          social_civic_score: number | null
          student_id: string
          student_name: string | null
          subject: string
          teacher_id: string
          teaching_log_ref: string | null
          total_score: number
          unit_name: string | null
          writing_score: number | null
        }
        Insert: {
          a1_score?: number | null
          a2_score?: number | null
          a3_score?: number | null
          a4_score?: number | null
          a5_score?: number | null
          a6_score?: number | null
          academic_term?: string | null
          art_culture_score?: number | null
          assessed_by?: string | null
          assessed_date?: string | null
          calculating_score?: number | null
          classroom: string
          competency_assessed_date?: string | null
          competency_note?: string | null
          created_at?: string | null
          economy_finance_score?: number | null
          grade_level: string
          health_score?: number | null
          id?: string
          reading_score?: number | null
          sci_tech_score?: number | null
          score: number
          social_civic_score?: number | null
          student_id: string
          student_name?: string | null
          subject: string
          teacher_id: string
          teaching_log_ref?: string | null
          total_score?: number
          unit_name?: string | null
          writing_score?: number | null
        }
        Update: {
          a1_score?: number | null
          a2_score?: number | null
          a3_score?: number | null
          a4_score?: number | null
          a5_score?: number | null
          a6_score?: number | null
          academic_term?: string | null
          art_culture_score?: number | null
          assessed_by?: string | null
          assessed_date?: string | null
          calculating_score?: number | null
          classroom?: string
          competency_assessed_date?: string | null
          competency_note?: string | null
          created_at?: string | null
          economy_finance_score?: number | null
          grade_level?: string
          health_score?: number | null
          id?: string
          reading_score?: number | null
          sci_tech_score?: number | null
          score?: number
          social_civic_score?: number | null
          student_id?: string
          student_name?: string | null
          subject?: string
          teacher_id?: string
          teaching_log_ref?: string | null
          total_score?: number
          unit_name?: string | null
          writing_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "unit_assessments_teaching_log_ref_fkey"
            columns: ["teaching_log_ref"]
            isOneToOne: false
            referencedRelation: "teaching_logs"
            referencedColumns: ["id"]
          },
        ]
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
      check_and_set_rate_limit: {
        Args: {
          p_function_name: string
          p_limit_seconds?: number
          p_user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      promote_to_director_by_email: {
        Args: { user_email: string }
        Returns: undefined
      }
    }
    Enums: {
      activity_mode: "active" | "passive" | "constructive"
      app_role: "teacher" | "director"
      major_gap:
        | "k-gap"
        | "p-gap"
        | "a-gap"
        | "a2-gap"
        | "system-gap"
        | "success"
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
      major_gap: ["k-gap", "p-gap", "a-gap", "a2-gap", "system-gap", "success"],
    },
  },
} as const
