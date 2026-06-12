export type ResearchIssueType =
  | "GapRepeat"
  | "UnitBlindSpot"
  | "StayLong"
  | "RedZone";

export type ResearchStatus =
  | "suggested"
  | "selected"
  | "in_progress"
  | "completed"
  | "abandoned";

export interface BeforeData {
  metric: string;
  value: number | string;
  label: string;
  period_days?: number;
  source?: string;
  captured_at: string;
}

export interface ClassroomResearchSuggestion {
  id: string;
  suggestion_key: string;
  teacher_id: string;
  teacher_name: string | null;
  grade_level: string | null;
  classroom: string | null;
  subject: string | null;
  academic_term: string;

  issue_type: ResearchIssueType;
  detected_problem: string;
  evidence_summary: string;

  research_title: string;
  research_question: string;
  objective: string;
  target_group: string;
  intervention: string;
  tools: string;
  data_collection_method: string;
  analysis_method: string;
  success_indicator: string;

  before_data: BeforeData | null;

  status: ResearchStatus;
  doc_format: string; // Always 'short' - not editable in UI
  doc_draft_url: string | null;
  doc_final_url: string | null;
  ethics_confirmed: boolean;

  created_at: string;
  updated_at: string;
}

export interface UpdateResearchPayload {
  research_title?: string;
  research_question?: string;
  objective?: string;
  target_group?: string;
  intervention?: string;
  tools?: string;
  data_collection_method?: string;
  analysis_method?: string;
  success_indicator?: string;
  status?: ResearchStatus;
  ethics_confirmed?: boolean;
}
