/**
 * Phase D: Competency tracking types
 */

import type { CompetencyKey } from "@/lib/competencyConstants";

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
  a1_score?: CompetencyScore | "";
  a2_score?: CompetencyScore | "";
  a3_score?: CompetencyScore | "";
  a4_score?: CompetencyScore | "";
  a5_score?: CompetencyScore | "";
  a6_score?: CompetencyScore | "";
  competency_assessed_date?: string;
  competency_note?: string;
}

export interface CompetencyFilters {
  subject: string;
  gradeLevel: string;
  classroom: string;
  academicTerm: string;
}
