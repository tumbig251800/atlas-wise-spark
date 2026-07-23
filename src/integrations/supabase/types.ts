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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      action_item_students: {
        Row: {
          action_item_id: number
          created_at: string
          created_by: string
          selection_source: string
          student_id: string
        }
        Insert: {
          action_item_id: number
          created_at?: string
          created_by: string
          selection_source: string
          student_id: string
        }
        Update: {
          action_item_id?: number
          created_at?: string
          created_by?: string
          selection_source?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_item_students_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_item_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      action_plan_items: {
        Row: {
          ai_draft: Json | null
          ai_owner: string | null
          ai_priority: string | null
          ai_summary: string | null
          auto_resolved: boolean
          calendar_event_id: string | null
          calendar_html_link: string | null
          case_confirmed_at: string | null
          case_confirmed_by: string | null
          classroom: string | null
          closed_after_monitoring_at: string | null
          created_at: string
          detail: string | null
          due_date: string | null
          due_in_days: number | null
          evidence_context: Json | null
          grade_level: string | null
          id: number
          impact_loop_status: string | null
          issue_key: string
          issue_type: string
          mastery_avg_previous: number | null
          mastery_avg_recent: number | null
          metric_label: string | null
          metric_value: number | null
          notify_channel: string | null
          notify_date: string | null
          notify_note: string | null
          project_id: string | null
          referral_agency: string | null
          referral_date: string | null
          referral_note: string | null
          referral_owner: string | null
          resolution_note: string | null
          resolved_at: string | null
          run_date: string | null
          severity: string
          status: string
          student_scope_type: string | null
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
          ai_draft?: Json | null
          ai_owner?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          auto_resolved?: boolean
          calendar_event_id?: string | null
          calendar_html_link?: string | null
          case_confirmed_at?: string | null
          case_confirmed_by?: string | null
          classroom?: string | null
          closed_after_monitoring_at?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          due_in_days?: number | null
          evidence_context?: Json | null
          grade_level?: string | null
          id?: number
          impact_loop_status?: string | null
          issue_key: string
          issue_type?: string
          mastery_avg_previous?: number | null
          mastery_avg_recent?: number | null
          metric_label?: string | null
          metric_value?: number | null
          notify_channel?: string | null
          notify_date?: string | null
          notify_note?: string | null
          project_id?: string | null
          referral_agency?: string | null
          referral_date?: string | null
          referral_note?: string | null
          referral_owner?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          run_date?: string | null
          severity?: string
          status?: string
          student_scope_type?: string | null
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
          ai_draft?: Json | null
          ai_owner?: string | null
          ai_priority?: string | null
          ai_summary?: string | null
          auto_resolved?: boolean
          calendar_event_id?: string | null
          calendar_html_link?: string | null
          case_confirmed_at?: string | null
          case_confirmed_by?: string | null
          classroom?: string | null
          closed_after_monitoring_at?: string | null
          created_at?: string
          detail?: string | null
          due_date?: string | null
          due_in_days?: number | null
          evidence_context?: Json | null
          grade_level?: string | null
          id?: number
          impact_loop_status?: string | null
          issue_key?: string
          issue_type?: string
          mastery_avg_previous?: number | null
          mastery_avg_recent?: number | null
          metric_label?: string | null
          metric_value?: number | null
          notify_channel?: string | null
          notify_date?: string | null
          notify_note?: string | null
          project_id?: string | null
          referral_agency?: string | null
          referral_date?: string | null
          referral_note?: string | null
          referral_owner?: string | null
          resolution_note?: string | null
          resolved_at?: string | null
          run_date?: string | null
          severity?: string
          status?: string
          student_scope_type?: string | null
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
        Relationships: [
          {
            foreignKeyName: "action_plan_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "annual_projects"
            referencedColumns: ["id"]
          },
        ]
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
      annual_projects: {
        Row: {
          academic_year: string
          budget: number | null
          created_at: string | null
          end_quarter: number | null
          id: string
          objective: string | null
          owner_name: string | null
          project_code: string
          project_name: string
          start_quarter: number | null
        }
        Insert: {
          academic_year?: string
          budget?: number | null
          created_at?: string | null
          end_quarter?: number | null
          id?: string
          objective?: string | null
          owner_name?: string | null
          project_code: string
          project_name: string
          start_quarter?: number | null
        }
        Update: {
          academic_year?: string
          budget?: number | null
          created_at?: string | null
          end_quarter?: number | null
          id?: string
          objective?: string | null
          owner_name?: string | null
          project_code?: string
          project_name?: string
          start_quarter?: number | null
        }
        Relationships: []
      }
      classroom_research_suggestions: {
        Row: {
          academic_term: string
          after_data: Json | null
          analysis_method: string | null
          before_data: Json | null
          classroom: string
          created_at: string | null
          data_collection_method: string | null
          detected_problem: string
          doc_draft_url: string | null
          doc_final_url: string | null
          doc_format: string | null
          ethics_confirmed: boolean | null
          ethics_confirmed_at: string | null
          evidence_summary: string
          grade_level: string
          id: string
          intervention: string | null
          issue_type: string
          linked_action_plan_id: number | null
          objective: string | null
          research_question: string | null
          research_title: string
          status: string
          subject: string
          success_indicator: string | null
          suggestion_key: string
          target_group: string | null
          teacher_id: string | null
          teacher_name: string
          tools: string | null
          updated_at: string | null
        }
        Insert: {
          academic_term: string
          after_data?: Json | null
          analysis_method?: string | null
          before_data?: Json | null
          classroom: string
          created_at?: string | null
          data_collection_method?: string | null
          detected_problem: string
          doc_draft_url?: string | null
          doc_final_url?: string | null
          doc_format?: string | null
          ethics_confirmed?: boolean | null
          ethics_confirmed_at?: string | null
          evidence_summary: string
          grade_level: string
          id?: string
          intervention?: string | null
          issue_type: string
          linked_action_plan_id?: number | null
          objective?: string | null
          research_question?: string | null
          research_title: string
          status?: string
          subject: string
          success_indicator?: string | null
          suggestion_key: string
          target_group?: string | null
          teacher_id?: string | null
          teacher_name: string
          tools?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_term?: string
          after_data?: Json | null
          analysis_method?: string | null
          before_data?: Json | null
          classroom?: string
          created_at?: string | null
          data_collection_method?: string | null
          detected_problem?: string
          doc_draft_url?: string | null
          doc_final_url?: string | null
          doc_format?: string | null
          ethics_confirmed?: boolean | null
          ethics_confirmed_at?: string | null
          evidence_summary?: string
          grade_level?: string
          id?: string
          intervention?: string | null
          issue_type?: string
          linked_action_plan_id?: number | null
          objective?: string | null
          research_question?: string | null
          research_title?: string
          status?: string
          subject?: string
          success_indicator?: string | null
          suggestion_key?: string
          target_group?: string | null
          teacher_id?: string | null
          teacher_name?: string
          tools?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_research_suggestions_linked_action_plan_id_fkey"
            columns: ["linked_action_plan_id"]
            isOneToOne: false
            referencedRelation: "action_plan_items"
            referencedColumns: ["id"]
          },
        ]
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
      intervention_plan_students: {
        Row: {
          created_at: string
          intervention_plan_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          intervention_plan_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          intervention_plan_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_plan_students_plan_fkey"
            columns: ["intervention_plan_id"]
            isOneToOne: false
            referencedRelation: "intervention_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_plan_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_plans: {
        Row: {
          action_item_id: number
          baseline_summary: Json | null
          created_at: string
          created_by: string
          id: string
          intervention_method: string | null
          objective: string
          plc_session_id: string | null
          responsible_user_id: string | null
          start_date: string | null
          status: string
          target_date: string | null
          target_outcome: Json | null
          updated_at: string
        }
        Insert: {
          action_item_id: number
          baseline_summary?: Json | null
          created_at?: string
          created_by: string
          id?: string
          intervention_method?: string | null
          objective: string
          plc_session_id?: string | null
          responsible_user_id?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_outcome?: Json | null
          updated_at?: string
        }
        Update: {
          action_item_id?: number
          baseline_summary?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          intervention_method?: string | null
          objective?: string
          plc_session_id?: string | null
          responsible_user_id?: string | null
          start_date?: string | null
          status?: string
          target_date?: string | null
          target_outcome?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_plans_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_plans_plc_session_id_fkey"
            columns: ["plc_session_id"]
            isOneToOne: false
            referencedRelation: "plc_sessions"
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
      monitoring_results: {
        Row: {
          after_evidence: Json
          before_evidence: Json
          created_at: string
          id: string
          intervention_plan_id: string
          monitoring_date: string
          notes: string | null
          recorded_by: string
          result_status: string
          student_id: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          after_evidence: Json
          before_evidence: Json
          created_at?: string
          id?: string
          intervention_plan_id: string
          monitoring_date?: string
          notes?: string | null
          recorded_by: string
          result_status: string
          student_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          after_evidence?: Json
          before_evidence?: Json
          created_at?: string
          id?: string
          intervention_plan_id?: string
          monitoring_date?: string
          notes?: string | null
          recorded_by?: string
          result_status?: string
          student_id?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_results_plan_fkey"
            columns: ["intervention_plan_id"]
            isOneToOne: false
            referencedRelation: "intervention_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monitoring_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      nidet_visits: {
        Row: {
          action_item_id: number
          created_at: string
          follow_up_date: string | null
          follow_up_method: string | null
          id: string
          improvements: string | null
          linked_action_item_ids: number[]
          nidet_type: string
          outcome_type: string | null
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
          linked_action_item_ids?: number[]
          nidet_type?: string
          outcome_type?: string | null
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
          linked_action_item_ids?: number[]
          nidet_type?: string
          outcome_type?: string | null
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
      pbl_assessments: {
        Row: {
          com_score: number | null
          created_at: string | null
          id: string
          life_score: number | null
          notes: string | null
          overall_result: string | null
          problem_score: number | null
          project_id: string
          student_id: string
          student_name: string | null
          tech_score: number | null
          think_score: number | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          com_score?: number | null
          created_at?: string | null
          id?: string
          life_score?: number | null
          notes?: string | null
          overall_result?: string | null
          problem_score?: number | null
          project_id: string
          student_id: string
          student_name?: string | null
          tech_score?: number | null
          think_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          com_score?: number | null
          created_at?: string | null
          id?: string
          life_score?: number | null
          notes?: string | null
          overall_result?: string | null
          problem_score?: number | null
          project_id?: string
          student_id?: string
          student_name?: string | null
          tech_score?: number | null
          think_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pbl_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "pbl_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pbl_projects: {
        Row: {
          academic_term: string
          classroom: string
          created_at: string | null
          grade_level: string
          id: string
          month: string
          project_name: string
          teacher_name: string
          updated_at: string | null
        }
        Insert: {
          academic_term: string
          classroom: string
          created_at?: string | null
          grade_level: string
          id?: string
          month: string
          project_name: string
          teacher_name: string
          updated_at?: string | null
        }
        Update: {
          academic_term?: string
          classroom?: string
          created_at?: string | null
          grade_level?: string
          id?: string
          month?: string
          project_name?: string
          teacher_name?: string
          updated_at?: string | null
        }
        Relationships: []
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
      plc_session_action_items: {
        Row: {
          action_item_id: number
          created_at: string
          linked_by: string
          plc_session_id: string
        }
        Insert: {
          action_item_id: number
          created_at?: string
          linked_by: string
          plc_session_id: string
        }
        Update: {
          action_item_id?: number
          created_at?: string
          linked_by?: string
          plc_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plc_session_action_items_action_item_id_fkey"
            columns: ["action_item_id"]
            isOneToOne: false
            referencedRelation: "action_plan_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plc_session_action_items_plc_session_id_fkey"
            columns: ["plc_session_id"]
            isOneToOne: false
            referencedRelation: "plc_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      plc_sessions: {
        Row: {
          action_steps: string | null
          actions_closed_at: string | null
          approach: string | null
          calendar_event_id: string | null
          created_at: string
          created_by: string | null
          discussion_points: Json | null
          duration_minutes: number | null
          facilitator_name: string
          grade_band: string | null
          id: string
          linked_action_item_ids: number[]
          members: Json
          next_plc_date: string | null
          outcome_type: string
          plc_type: string
          problem_statement: string | null
          root_cause: string | null
          session_date: string
          subject: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          action_steps?: string | null
          actions_closed_at?: string | null
          approach?: string | null
          calendar_event_id?: string | null
          created_at?: string
          created_by?: string | null
          discussion_points?: Json | null
          duration_minutes?: number | null
          facilitator_name?: string
          grade_band?: string | null
          id?: string
          linked_action_item_ids?: number[]
          members?: Json
          next_plc_date?: string | null
          outcome_type?: string
          plc_type: string
          problem_statement?: string | null
          root_cause?: string | null
          session_date?: string
          subject?: string | null
          topic?: string
          updated_at?: string
        }
        Update: {
          action_steps?: string | null
          actions_closed_at?: string | null
          approach?: string | null
          calendar_event_id?: string | null
          created_at?: string
          created_by?: string | null
          discussion_points?: Json | null
          duration_minutes?: number | null
          facilitator_name?: string
          grade_band?: string | null
          id?: string
          linked_action_item_ids?: number[]
          members?: Json
          next_plc_date?: string | null
          outcome_type?: string
          plc_type?: string
          problem_statement?: string | null
          root_cause?: string | null
          session_date?: string
          subject?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          teacher_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          teacher_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          teacher_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_kpis: {
        Row: {
          atlas_metric: string | null
          created_at: string | null
          id: string
          kpi_name: string
          project_id: string | null
          target_value: number
          unit: string | null
        }
        Insert: {
          atlas_metric?: string | null
          created_at?: string | null
          id?: string
          kpi_name: string
          project_id?: string | null
          target_value: number
          unit?: string | null
        }
        Update: {
          atlas_metric?: string | null
          created_at?: string | null
          id?: string
          kpi_name?: string
          project_id?: string | null
          target_value?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_kpis_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "annual_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_progress: {
        Row: {
          actual_value: number | null
          id: string
          kpi_id: string | null
          measured_at: string | null
          notes: string | null
          period: string
          project_id: string | null
          status: string | null
        }
        Insert: {
          actual_value?: number | null
          id?: string
          kpi_id?: string | null
          measured_at?: string | null
          notes?: string | null
          period: string
          project_id?: string | null
          status?: string | null
        }
        Update: {
          actual_value?: number | null
          id?: string
          kpi_id?: string | null
          measured_at?: string | null
          notes?: string | null
          period?: string
          project_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_progress_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "project_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_progress_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "annual_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      remedial_tracking: {
        Row: {
          academic_term: string | null
          classroom: string | null
          created_at: string | null
          grade_level: string | null
          id: string
          recorded_at: string | null
          status: string
          student_id: string
          subject: string | null
          teacher_id: string | null
          teaching_log_id: string
          term: string | null
          unit_name: string | null
        }
        Insert: {
          academic_term?: string | null
          classroom?: string | null
          created_at?: string | null
          grade_level?: string | null
          id?: string
          recorded_at?: string | null
          status: string
          student_id: string
          subject?: string | null
          teacher_id?: string | null
          teaching_log_id: string
          term?: string | null
          unit_name?: string | null
        }
        Update: {
          academic_term?: string | null
          classroom?: string | null
          created_at?: string | null
          grade_level?: string | null
          id?: string
          recorded_at?: string | null
          status?: string
          student_id?: string
          subject?: string | null
          teacher_id?: string | null
          teaching_log_id?: string
          term?: string | null
          unit_name?: string | null
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
          student_id: string | null
          teacher_id: string | null
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
          student_id?: string | null
          teacher_id?: string | null
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
          student_id?: string | null
          teacher_id?: string | null
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
          days_late: number | null
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
          research_id: string | null
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
          days_late?: number | null
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
          research_id?: string | null
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
          days_late?: number | null
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
          research_id?: string | null
          subject?: string
          teacher_id?: string
          teacher_name?: string | null
          teaching_date?: string
          topic?: string | null
          total_students?: number | null
          unit_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_logs_research_id_fkey"
            columns: ["research_id"]
            isOneToOne: false
            referencedRelation: "classroom_research_suggestions"
            referencedColumns: ["id"]
          },
        ]
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
      unit_assessment_setups: {
        Row: {
          a_total: number
          academic_term: string
          assessed_date: string | null
          classroom: string
          created_at: string | null
          grade_level: string
          id: string
          k_total: number
          p_total: number
          subject: string
          teacher_id: string
          total_score: number | null
          unit_display_name: string | null
          unit_name: string
          updated_at: string | null
        }
        Insert: {
          a_total?: number
          academic_term: string
          assessed_date?: string | null
          classroom: string
          created_at?: string | null
          grade_level: string
          id?: string
          k_total?: number
          p_total?: number
          subject: string
          teacher_id: string
          total_score?: number | null
          unit_display_name?: string | null
          unit_name: string
          updated_at?: string | null
        }
        Update: {
          a_total?: number
          academic_term?: string
          assessed_date?: string | null
          classroom?: string
          created_at?: string | null
          grade_level?: string
          id?: string
          k_total?: number
          p_total?: number
          subject?: string
          teacher_id?: string
          total_score?: number | null
          unit_display_name?: string | null
          unit_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unit_assessments: {
        Row: {
          a_score: number | null
          a_total: number | null
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
          k_score: number | null
          k_total: number | null
          p_score: number | null
          p_total: number | null
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
          a_score?: number | null
          a_total?: number | null
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
          k_score?: number | null
          k_total?: number | null
          p_score?: number | null
          p_total?: number | null
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
          a_score?: number | null
          a_total?: number | null
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
          k_score?: number | null
          k_total?: number | null
          p_score?: number | null
          p_total?: number | null
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
      zz_remedial_dedup_backup_20260715: {
        Row: {
          academic_term: string | null
          classroom: string | null
          created_at: string | null
          grade_level: string | null
          id: string | null
          recorded_at: string | null
          status: string | null
          student_id: string | null
          subject: string | null
          teacher_id: string | null
          teaching_log_id: string | null
        }
        Insert: {
          academic_term?: string | null
          classroom?: string | null
          created_at?: string | null
          grade_level?: string | null
          id?: string | null
          recorded_at?: string | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          teacher_id?: string | null
          teaching_log_id?: string | null
        }
        Update: {
          academic_term?: string | null
          classroom?: string | null
          created_at?: string | null
          grade_level?: string | null
          id?: string | null
          recorded_at?: string | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          teacher_id?: string | null
          teaching_log_id?: string | null
        }
        Relationships: []
      }
      zz_subject_fix_backup_20260715: {
        Row: {
          old_subject: string | null
          row_id: string | null
          tbl: string | null
        }
        Insert: {
          old_subject?: string | null
          row_id?: string | null
          tbl?: string | null
        }
        Update: {
          old_subject?: string | null
          row_id?: string | null
          tbl?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_research_candidates: {
        Row: {
          academic_term: string | null
          age_days: number | null
          candidate_source: string | null
          classroom: string | null
          grade_level: string | null
          issue_type: string | null
          pbl_competency: string | null
          pbl_failing_count: number | null
          pbl_score: number | null
          severity: string | null
          subject: string | null
          teacher_id: string | null
          teacher_name: string | null
        }
        Relationships: []
      }
      v_research_candidates_n8n: {
        Row: {
          classroom: string | null
          detected_problem: string | null
          evidence_summary: string | null
          gap_focus: string | null
          grade_level: string | null
          issue_type: string | null
          metric_value: number | null
          severity: string | null
          subject: string | null
          teacher_id: string | null
          teacher_name: string | null
        }
        Relationships: []
      }
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
      exec_sql: { Args: { sql: string }; Returns: Json }
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
      run_mastery_watch_batch: { Args: never; Returns: Json }
    }
    Enums: {
      activity_mode: "active" | "passive" | "constructive"
      app_role: "teacher" | "director" | "lead"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      activity_mode: ["active", "passive", "constructive"],
      app_role: ["teacher", "director", "lead"],
      major_gap: ["k-gap", "p-gap", "a-gap", "a2-gap", "system-gap", "success"],
    },
  },
} as const
