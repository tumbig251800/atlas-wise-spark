// Data contract for all ATLAS MCP tools.
// Both executive-report and nidet-report skills consume these shapes.

export interface ClassFilter {
  dateFrom?: string;    // ISO date "2026-01-01"
  dateTo?: string;      // ISO date "2026-05-09"
  term?: string;        // academic_term e.g. "1/2568"
  teacherIds?: string[];
  gradeLevel?: string;
  classroom?: string;
  subject?: string;
}

export interface TeachingLog {
  id: string;
  teacher_id: string;
  teacher_name: string | null;
  subject: string;
  grade_level: string;
  classroom: string;
  topic: string | null;
  mastery_score: number;
  major_gap: string;
  remedial_ids: string | null;
  total_students: number | null;
  teaching_date: string;
  academic_term: string | null;
  key_issue: string | null;
  reflection: string | null;
  next_strategy: string | null;
  health_care_status: boolean;
  health_care_ids: string | null;
  activity_mode: string;
  learning_unit: string | null;
  is_red_zone: boolean;  // computed: mastery_score <= 2.5
}

export interface FetchLogsResult {
  logs: TeachingLog[];
  total: number;
  limit: number;
  offset: number;
  filters_applied: ClassFilter & { limit?: number; offset?: number };
}

export interface PreflightStats {
  log_count: number;
  teacher_count: number;
  date_range: { min: string | null; max: string | null };
  terms: string[];
  subjects: string[];
  grade_levels: string[];
  red_zone_count: number;
  red_zone_pct: number;
  system_gap_count: number;
  gap_distribution: Record<string, number>;
  filters_applied: ClassFilter;
}

export interface RedZoneTeacher {
  teacher_id: string;
  teacher_name: string | null;
  red_zone_count: number;
  subjects: string[];
  avg_mastery: number;
  recent_date: string;
}

export interface RedZoneSummary {
  total_red_zone_logs: number;
  affected_teachers: RedZoneTeacher[];
  by_grade: Record<string, number>;
  by_subject: Record<string, number>;
  filters_applied: ClassFilter;
}

export interface TeacherProfile {
  id: string;
  full_name: string;
  teacher_code: string | null;
}

export interface SpecialCareEntry {
  student_id: string;
  teacher_id: string;
  teacher_name: string | null;
  subject: string;
  grade_level: string;
  classroom: string;
  topic: string | null;
  care_type: "a2-gap" | "health-care";
  teaching_date: string;
  log_id: string;
}

export interface SpecialCareResult {
  students: SpecialCareEntry[];
  count: number;
  log_count: number;
  filters_applied: ClassFilter;
}
