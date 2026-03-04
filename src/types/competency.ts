/**
 * Phase D + 2026: Competency tracking types
 */
import type { CapabilityKey2026 } from "@/lib/capabilityConstants2026";

export type CompetencyScore = 1 | 2 | 3 | 4;

export interface CompetencyTemplateRow {
  student_id: string;
  student_name: string;
  unit_name: string;
  subject: string;
  grade_level: string;
  classroom: string;
  academic_term: string;
  score?: number | "";
  total_score?: number | "";
  assessed_date?: string;
  reading_score?: CompetencyScore | "";
  writing_score?: CompetencyScore | "";
  calculating_score?: CompetencyScore | "";
  sci_tech_score?: CompetencyScore | "";
  social_civic_score?: CompetencyScore | "";
  economy_finance_score?: CompetencyScore | "";
  health_score?: CompetencyScore | "";
  art_culture_score?: CompetencyScore | "";
  competency_assessed_date?: string;
  competency_note?: string;
}

export interface CompetencyFilters {
  subject: string;
  gradeLevel: string;
  classroom: string;
  academicTerm: string;
}
