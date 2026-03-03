/**
 * Phase C: Smart Report types
 * Correlation between teaching_logs (mastery, gap) and unit_assessments (scores)
 */

/** Raw teaching log row from DB (remedial_ids as string | null per DB type) */
export interface TeachingLogRaw {
  id: string;
  learning_unit: string | null;
  next_strategy: string | null;
  major_gap: string;
  mastery_score: number;
  remedial_ids: string | null;
  teaching_date: string;
  subject: string;
  grade_level: string;
  classroom: string;
  academic_term: string | null;
  topic: string | null;
  key_issue: string | null;
  total_students: number | null;
  teacher_id: string;
}

/** Raw unit assessment row from DB */
export interface UnitAssessmentRaw {
  id: string;
  student_id: string;
  student_name: string | null;
  unit_name: string | null;
  score: number;
  total_score: number;
  subject: string;
  grade_level: string;
  classroom: string;
  academic_term: string | null;
  assessed_date: string | null;
  a1_score?: number | null;
  a2_score?: number | null;
  a3_score?: number | null;
  a4_score?: number | null;
  a5_score?: number | null;
  a6_score?: number | null;
  competency_note?: string | null;
  assessed_by?: string | null;
  competency_assessed_date?: string | null;
}

/** Aggregated teaching data per unit */
export interface UnitTeachingAggregate {
  unitKey: string;
  displayName: string;
  logs: TeachingLogRaw[];
  dominantGap: string;
  avgMastery: number;
  strategies: string[];
}

/** Aggregated assessment data per unit */
export interface UnitAssessmentAggregate {
  unitKey: string;
  displayName: string;
  assessments: UnitAssessmentRaw[];
  avgScorePct: number;
  studentCount: number;
}

/** Gap validation verdict: teaching gap vs assessment score */
export type GapVerdict = "aligned" | "overperformed" | "needs_work";

export interface GapValidationResult {
  unitKey: string;
  displayName: string;
  teachingGap: string;
  assessmentAvgPct: number | null;
  verdict: GapVerdict;
}

/** Student risk level */
export type StudentRiskLevel = "high" | "medium" | "low";

export interface StudentRiskProfile {
  studentId: string;
  studentName: string | null;
  unitKey: string;
  remedialCount: number;
  scorePct: number | null;
  risk: StudentRiskLevel;
}

/** Strategy effectiveness */
export type StrategyEffectiveness = "positive" | "neutral" | "negative";

export interface StrategyEffectivenessResult {
  unitKey: string;
  strategy: string;
  gapBefore: string;
  gapAfter: string;
  effectiveness: StrategyEffectiveness;
}

/** Smart report filter */
export interface SmartReportFilter {
  subject: string;
  gradeLevel: string;
  classroom: string;
  academicTerm: string;
  teacherId?: string;
}

/** Full Smart Report output */
export interface SmartReport {
  filter: SmartReportFilter;
  unitTeaching: UnitTeachingAggregate[];
  unitAssessments: UnitAssessmentAggregate[];
  gapValidations: GapValidationResult[];
  studentRisks: StudentRiskProfile[];
  strategyEffectiveness: StrategyEffectivenessResult[];
}
