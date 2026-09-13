export interface Wf6AssessmentRow {
  id: string | number;
  student_id: string;
  student_name?: string | null;
  academic_term: string;
  assessed_date?: string | null;
  created_at: string;
  score: number | string;
  total_score: number | string;
  grade_level: string;
  classroom: string;
  subject: string;
  unit_name?: string | null;
  teacher_id?: string | null;
}

export interface Wf6TeachingLogRow {
  academic_term: string;
  teaching_date: string;
  grade_level: string;
  classroom: string;
  subject: string;
  remedial_ids?: string | null;
  health_care_status?: boolean | null;
}

export interface Wf6ActionItemRow {
  issue_type: string;
  issue_key?: string | null;
  subject?: string | null;
  grade_level?: string | null;
  classroom?: string | null;
  created_at?: string | null;
  evidence_context?: Record<string, unknown> | null;
}

export interface Wf6ProfileRow {
  user_id: string;
  full_name?: string | null;
}

export interface Wf6Candidate {
  assessment_id: string;
  student_id: string;
  student_name: string;
  academic_term: string;
  assessed_date: string;
  age_days: number;
  score_percent: number;
  grade_level: string;
  classroom: string;
  subject: string;
  unit_name: string;
  teacher_id: string | null;
  teacher_name: string;
}

export interface EvaluateWf6CandidatesInput {
  term: string;
  asOfDate: string;
  assessments: Wf6AssessmentRow[];
  teachingLogs: Wf6TeachingLogRow[];
  actionItems: Wf6ActionItemRow[];
  profiles: Wf6ProfileRow[];
}

export interface SummarizeWf6CandidatesOptions {
  term: string;
  asOfDate: string;
  includeDetails: boolean;
  limit: number;
}

export function normalizeAcademicTerm(term: string): string {
  const match = term.trim().match(/^(\d+)\/(\d+)$/);
  return match ? `${match[2]}-${match[1]}` : term.trim();
}

function dayDifference(later: string, earlier: string): number {
  const laterMs = Date.parse(`${later}T00:00:00Z`);
  const earlierMs = Date.parse(`${earlier}T00:00:00Z`);
  return Math.floor((laterMs - earlierMs) / 86_400_000);
}

export function bangkokCalendarDate(timestamp: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function hasRemediationEvidence(
  assessment: Wf6AssessmentRow,
  assessedDate: string,
  asOfDate: string,
  teachingLogs: Wf6TeachingLogRow[],
): boolean {
  return teachingLogs.some((log) =>
    log.health_care_status === false
    && normalizeAcademicTerm(log.academic_term) === normalizeAcademicTerm(assessment.academic_term)
    && log.grade_level === assessment.grade_level
    && log.classroom === assessment.classroom
    && log.subject === assessment.subject
    && log.teaching_date >= assessedDate
    && log.teaching_date <= asOfDate
    && (log.remedial_ids || "").trim().split(/[\s,;.]+/).includes(assessment.student_id.trim())
  );
}

function linkedAssessmentId(action: Wf6ActionItemRow): string | undefined {
  const wf6 = action.evidence_context?.wf6;
  if (!wf6 || typeof wf6 !== "object") return undefined;
  const assessmentId = (wf6 as Record<string, unknown>).assessment_id;
  return assessmentId === undefined || assessmentId === null ? undefined : String(assessmentId);
}

function legacyIssueKey(assessment: Wf6AssessmentRow): string {
  const subject = assessment.subject.replace(/\s+/g, "").slice(0, 8).toUpperCase();
  const grade = assessment.grade_level.replaceAll(".", "");
  const unit = (assessment.unit_name || "U1").replace(/\s+/g, "");
  return ["UNIT-BLIND", assessment.student_id, subject, grade, assessment.classroom, unit].join("-");
}

function hasPriorAction(assessment: Wf6AssessmentRow, actionItems: Wf6ActionItemRow[]): boolean {
  const legacyKey = legacyIssueKey(assessment);
  return actionItems.some((action) => {
    if (action.issue_type !== "UnitBlindSpot") return false;
    if (linkedAssessmentId(action) === String(assessment.id)) return true;
    return action.issue_key === legacyKey
      && action.subject === assessment.subject
      && action.grade_level === assessment.grade_level
      && action.classroom === assessment.classroom
      && Boolean(action.created_at)
      && action.created_at! >= assessment.created_at;
  });
}

export function evaluateWf6Candidates(input: EvaluateWf6CandidatesInput): Wf6Candidate[] {
  const profiles = new Map(input.profiles.map((profile) => [profile.user_id, profile.full_name || "ไม่ระบุครู"]));

  return input.assessments.flatMap((assessment) => {
    const score = Number(assessment.score);
    const total = Number(assessment.total_score);
    const term = normalizeAcademicTerm(assessment.academic_term);
    const assessedDate = assessment.assessed_date && assessment.assessed_date > "2000-01-01"
      ? assessment.assessed_date
      : bangkokCalendarDate(assessment.created_at);
    const ageDays = dayDifference(input.asOfDate, assessedDate);

    if (term !== normalizeAcademicTerm(input.term)) return [];
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0 || score < 0 || score > total) return [];
    const scorePercent = Math.round((score / total) * 1000) / 10;
    if (ageDays < 14 || ageDays > 28 || scorePercent > 60) return [];
    if (hasRemediationEvidence(assessment, assessedDate, input.asOfDate, input.teachingLogs)) return [];
    if (hasPriorAction(assessment, input.actionItems)) return [];

    return [{
      assessment_id: String(assessment.id),
      student_id: assessment.student_id,
      student_name: assessment.student_name || "",
      academic_term: term,
      assessed_date: assessedDate,
      age_days: ageDays,
      score_percent: scorePercent,
      grade_level: assessment.grade_level,
      classroom: assessment.classroom,
      subject: assessment.subject,
      unit_name: assessment.unit_name || "",
      teacher_id: assessment.teacher_id || null,
      teacher_name: assessment.teacher_id ? profiles.get(assessment.teacher_id) || "ไม่ระบุครู" : "ไม่ระบุครู",
    }];
  });
}

export function summarizeWf6Candidates(
  candidates: Wf6Candidate[],
  options: SummarizeWf6CandidatesOptions,
): Record<string, unknown> {
  const grouped = new Map<string, { grade_level: string; classroom: string; subject: string; count: number }>();
  for (const candidate of candidates) {
    const key = JSON.stringify([candidate.grade_level, candidate.classroom, candidate.subject]);
    const current = grouped.get(key);
    if (current) current.count += 1;
    else grouped.set(key, {
      grade_level: candidate.grade_level,
      classroom: candidate.classroom,
      subject: candidate.subject,
      count: 1,
    });
  }

  const result: Record<string, unknown> = {
    term: normalizeAcademicTerm(options.term),
    as_of_date: options.asOfDate,
    criteria: {
      score_percent_lte: 60,
      assessment_age_days: { min: 14, max: 28 },
      excludes_documented_remediation: true,
      excludes_existing_action_items: true,
    },
    candidate_count: candidates.length,
    details_included: options.includeDetails,
    groups: [...grouped.values()].sort((a, b) =>
      a.grade_level.localeCompare(b.grade_level, "th")
      || a.classroom.localeCompare(b.classroom, "th")
      || a.subject.localeCompare(b.subject, "th")
    ),
  };
  if (options.includeDetails) {
    const limit = Math.max(1, Math.min(Math.trunc(options.limit), 100));
    result.candidates = candidates.slice(0, limit);
    result.details_limit = limit;
    result.details_truncated = candidates.length > limit;
  }
  return result;
}
