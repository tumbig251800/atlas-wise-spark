// Pure helpers for the read-only academic-record MCP tools (v2.11.0):
// atlas_unit_assessments_zero, atlas_exam_results, atlas_reading_results, atlas_student_lookup.
// No database access here — index.ts fetches rows and passes them in, so this file is unit-testable under vitest.
import { normalizeAcademicTerm } from "./wf6CandidateAudit.ts";

// ---------------------------------------------------------------- common

export function academicTermVariants(term: string): string[] {
  const canonical = normalizeAcademicTerm(term);
  const match = canonical.match(/^(\d{4})-(\d+)$/);
  if (!match) return [canonical];
  return [...new Set([canonical, `${match[2]}/${match[1]}`])];
}

const NAME_PREFIX = /^(เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|นางสาว|น\.ส\.|นาย)/;

/** Comparison key for a person's name: drops whitespace, a leading title (เด็กชาย/ด.ช./…) and placeholder dashes. */
export function normalizePersonName(name: string | null | undefined): string {
  return (name ?? "").replace(/\s+/g, "").replace(NAME_PREFIX, "").replace(/-/g, "");
}

/** Collapse runs of whitespace for display. */
export function tidyName(name: string | null | undefined): string {
  return (name ?? "").replace(/\s+/g, " ").trim();
}

export interface StudentRow {
  id: string;
  student_id: string | null;
  first_name: string | null;
  last_name: string | null;
  grade_level: string | null;
  classroom: string | null;
  is_active: boolean | null;
}

export interface ProfileRow {
  id: string;
  user_id: string | null;
  full_name: string | null;
}

export interface StudentIdentity {
  student_code: string;
  first_name: string | null;
  last_name: string | null;
  matched: boolean;
}

/**
 * Resolves student_id values found in record tables (4-digit code, or students.id uuid) to a students row.
 * When a code is shared by several students, the one in the same grade/classroom wins.
 */
export class StudentDirectory {
  private byCode = new Map<string, StudentRow[]>();
  private byUuid = new Map<string, StudentRow>();

  constructor(students: StudentRow[]) {
    for (const s of students) {
      this.byUuid.set(String(s.id), s);
      if (s.student_id) {
        const code = String(s.student_id).trim();
        const list = this.byCode.get(code) ?? [];
        list.push(s);
        this.byCode.set(code, list);
      }
    }
  }

  find(studentId: string | null | undefined, gradeLevel?: string | null, classroom?: string | null): StudentRow | null {
    const key = String(studentId ?? "").trim();
    if (!key) return null;
    const uuidHit = this.byUuid.get(key);
    if (uuidHit) return uuidHit;
    const list = this.byCode.get(key);
    if (!list || list.length === 0) return null;
    return list.find((s) => s.grade_level === gradeLevel && s.classroom === classroom)
      ?? list.find((s) => s.is_active)
      ?? list[0];
  }

  identify(studentId: string | null | undefined, fallbackName: string | null | undefined, gradeLevel?: string | null, classroom?: string | null): StudentIdentity {
    const s = this.find(studentId, gradeLevel, classroom);
    if (s) {
      return { student_code: String(s.student_id ?? studentId ?? ""), first_name: s.first_name, last_name: s.last_name, matched: true };
    }
    const parts = tidyName(fallbackName).split(" ").filter(Boolean);
    return {
      student_code: String(studentId ?? ""),
      first_name: parts.length > 1 ? parts.slice(0, -1).join(" ") : (parts[0] ?? null),
      last_name: parts.length > 1 ? parts[parts.length - 1] : null,
      matched: false,
    };
  }
}

export function buildTeacherNameLookup(profiles: ProfileRow[]): (teacherId: string | null | undefined) => string | null {
  const byUserId = new Map<string, string>();
  const byId = new Map<string, string>();
  for (const p of profiles) {
    if (!p.full_name) continue;
    if (p.user_id) byUserId.set(String(p.user_id), p.full_name);
    byId.set(String(p.id), p.full_name);
  }
  return (teacherId) => {
    if (!teacherId) return null;
    return byUserId.get(String(teacherId)) ?? byId.get(String(teacherId)) ?? null;
  };
}

const collator = new Intl.Collator("th", { numeric: true });
const cmp = (a: unknown, b: unknown) => collator.compare(String(a ?? ""), String(b ?? ""));

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

function mode<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  let best: T | null = null;
  let bestCount = 0;
  for (const v of values) {
    if (v === null || v === undefined || v === "") continue;
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
}

// ---------------------------------------------------------------- atlas_unit_assessments_zero

export type AssessmentKindFilter = "unit" | "midterm" | "all";

export interface UnitAssessmentRow {
  id?: string | number;
  student_id: string;
  student_name?: string | null;
  grade_level: string;
  classroom: string;
  subject: string;
  unit_name: string | null;
  academic_term: string;
  score: number | string | null;
  total_score: number | string | null;
  assessed_date: string | null;
  teacher_id: string | null;
  assessment_kind?: string | null;
  is_absent?: boolean | null;
}

export interface UnitSetupRow {
  academic_term: string;
  subject: string;
  grade_level: string;
  classroom: string;
  unit_name: string | null;
  unit_display_name: string | null;
  total_score?: number | string | null;
}

export type ZeroStatus = "zero" | "null_score" | "not_recorded";

export interface ZeroReportItem {
  student_code: string;
  first_name: string | null;
  last_name: string | null;
  grade_level: string;
  classroom: string;
  subject: string;
  unit_name: string | null;
  unit_display_name: string | null;
  assessment_kind: string;
  score: number | null;
  total_score: number | null;
  assessed_date: string | null;
  is_absent: boolean | null;
  teacher_name: string | null;
  status: ZeroStatus;
}

export interface ZeroReport {
  zero_count: number;
  zero_student_count: number;
  missing_count: number;
  null_score_count: number;
  not_recorded_count: number;
  by_class: { class: string; zero: number; missing: number }[];
  by_teacher: { teacher_name: string; zero: number; missing: number }[];
  items: ZeroReportItem[];
}

export function matchesAssessmentKind(kind: string | null | undefined, filter: AssessmentKindFilter): boolean {
  if (filter === "all") return true;
  return (kind ?? "unit") === filter;
}

function unitKey(term: string, grade: string, classroom: string, subject: string, unit: string | null, kind: string | null | undefined): string {
  return [normalizeAcademicTerm(term), grade, classroom, subject, unit ?? "", kind ?? "unit"].join("");
}

export interface BuildZeroReportInput {
  /** Every unit_assessments row in scope (term + filters + kind). Must include non-zero rows when includeMissing is true. */
  rows: UnitAssessmentRow[];
  students: StudentRow[];
  profiles: ProfileRow[];
  setups: UnitSetupRow[];
  includeMissing: boolean;
}

export function buildZeroReport(input: BuildZeroReportInput): ZeroReport {
  const directory = new StudentDirectory(input.students);
  const teacherName = buildTeacherNameLookup(input.profiles);

  const displayNames = new Map<string, string>();
  for (const s of input.setups) {
    const key = [normalizeAcademicTerm(s.academic_term), s.grade_level, s.classroom, s.subject, s.unit_name ?? ""].join("");
    if (s.unit_display_name && !displayNames.has(key)) displayNames.set(key, s.unit_display_name);
  }
  const displayNameFor = (r: { academic_term: string; grade_level: string; classroom: string; subject: string; unit_name: string | null }) =>
    displayNames.get([normalizeAcademicTerm(r.academic_term), r.grade_level, r.classroom, r.subject, r.unit_name ?? ""].join("")) ?? null;

  const toItem = (r: UnitAssessmentRow, status: ZeroStatus): ZeroReportItem => {
    const who = directory.identify(r.student_id, r.student_name, r.grade_level, r.classroom);
    return {
      student_code: who.student_code,
      first_name: who.first_name,
      last_name: who.last_name,
      grade_level: r.grade_level,
      classroom: r.classroom,
      subject: r.subject,
      unit_name: r.unit_name,
      unit_display_name: displayNameFor(r),
      assessment_kind: r.assessment_kind ?? "unit",
      score: toNumber(r.score),
      total_score: toNumber(r.total_score),
      assessed_date: r.assessed_date,
      is_absent: r.is_absent ?? null,
      teacher_name: teacherName(r.teacher_id),
      status,
    };
  };

  const items: ZeroReportItem[] = [];
  for (const r of input.rows) {
    const score = toNumber(r.score);
    if (score === 0) items.push(toItem(r, "zero"));
    else if (score === null && input.includeMissing) items.push(toItem(r, "null_score"));
  }

  if (input.includeMissing) {
    // A unit "exists" for a classroom once at least one classmate has a recorded score.
    const groups = new Map<string, UnitAssessmentRow[]>();
    for (const r of input.rows) {
      const key = unitKey(r.academic_term, r.grade_level, r.classroom, r.subject, r.unit_name, r.assessment_kind);
      const list = groups.get(key) ?? [];
      list.push(r);
      groups.set(key, list);
    }
    const activeByClass = new Map<string, StudentRow[]>();
    for (const s of input.students) {
      if (!s.is_active) continue;
      const key = `${s.grade_level}${s.classroom}`;
      const list = activeByClass.get(key) ?? [];
      list.push(s);
      activeByClass.set(key, list);
    }
    for (const groupRows of groups.values()) {
      if (!groupRows.some((r) => toNumber(r.score) !== null)) continue;
      const sample = groupRows[0];
      const recorded = new Set(groupRows.map((r) => String(r.student_id).trim()));
      for (const s of activeByClass.get(`${sample.grade_level}${sample.classroom}`) ?? []) {
        if (recorded.has(String(s.id)) || (s.student_id && recorded.has(String(s.student_id).trim()))) continue;
        items.push({
          student_code: String(s.student_id ?? s.id),
          first_name: s.first_name,
          last_name: s.last_name,
          grade_level: sample.grade_level,
          classroom: sample.classroom,
          subject: sample.subject,
          unit_name: sample.unit_name,
          unit_display_name: displayNameFor(sample),
          assessment_kind: sample.assessment_kind ?? "unit",
          score: null,
          total_score: mode(groupRows.map((r) => toNumber(r.total_score))),
          assessed_date: mode(groupRows.map((r) => r.assessed_date)),
          is_absent: null,
          teacher_name: teacherName(mode(groupRows.map((r) => r.teacher_id))),
          status: "not_recorded",
        });
      }
    }
  }

  items.sort((a, b) =>
    cmp(a.grade_level, b.grade_level) || cmp(a.classroom, b.classroom) || cmp(a.student_code, b.student_code)
    || cmp(a.assessed_date, b.assessed_date) || cmp(a.subject, b.subject) || cmp(a.unit_name, b.unit_name));

  const byClass = new Map<string, { class: string; zero: number; missing: number }>();
  const byTeacher = new Map<string, { teacher_name: string; zero: number; missing: number }>();
  for (const item of items) {
    const cls = `${item.grade_level}/${item.classroom}`;
    const c = byClass.get(cls) ?? { class: cls, zero: 0, missing: 0 };
    const tName = item.teacher_name ?? "(ไม่พบชื่อครู)";
    const t = byTeacher.get(tName) ?? { teacher_name: tName, zero: 0, missing: 0 };
    if (item.status === "zero") { c.zero++; t.zero++; } else { c.missing++; t.missing++; }
    byClass.set(cls, c);
    byTeacher.set(tName, t);
  }

  const zeroItems = items.filter((i) => i.status === "zero");
  return {
    zero_count: zeroItems.length,
    zero_student_count: new Set(zeroItems.map((i) => i.student_code)).size,
    missing_count: items.length - zeroItems.length,
    null_score_count: items.filter((i) => i.status === "null_score").length,
    not_recorded_count: items.filter((i) => i.status === "not_recorded").length,
    by_class: [...byClass.values()].sort((a, b) => cmp(a.class, b.class)),
    by_teacher: [...byTeacher.values()].sort((a, b) => (b.zero + b.missing) - (a.zero + a.missing) || cmp(a.teacher_name, b.teacher_name)),
    items,
  };
}

// ---------------------------------------------------------------- atlas_exam_results

/* ---------- atlas_unit_scores (เพิ่ม 23 ก.ย. 2569 สำหรับ IRIS) ---------- */

export interface UnitScoreItem {
  student_code: string;
  first_name: string | null;
  last_name: string | null;
  grade_level: string;
  classroom: string;
  subject: string;
  unit_name: string | null;
  unit_display_name: string | null;
  assessment_kind: string;
  score: number | null;
  total_score: number | null;
  percent: number | null;
  status: "pass" | "not_pass" | "absent" | "no_score";
  assessed_date: string | null;
  teacher_name: string | null;
}

export interface BuildUnitScoresInput {
  rows: UnitAssessmentRow[];
  students: StudentRow[];
  profiles: ProfileRow[];
  setups: UnitSetupRow[];
  /** เกณฑ์ผ่านเป็นร้อยละ (default 50 — เท่ากับ pass_threshold 0.5 ของข้อสอบ) */
  passPercent?: number;
}

/**
 * คะแนนหลังหน่วย/กลางภาคแบบเต็มทุกคน (ไม่ใช่เฉพาะ 0) — สรุปรายหน่วยและรายคน
 * ชื่อนักเรียนแก้จากตาราง students (ตามรหัส) ถ้าไม่พบใช้ student_name ในแถวนั้น
 */
export function buildUnitScoresReport(input: BuildUnitScoresInput) {
  const passPercent = input.passPercent ?? 50;
  const teacherName = buildTeacherNameLookup(input.profiles);

  const byCode = new Map<string, StudentRow>();
  for (const s of input.students) {
    if (s.student_id) byCode.set(String(s.student_id).trim(), s);
    byCode.set(String(s.id).trim(), s);
  }
  const identify = (r: UnitAssessmentRow) => {
    const key = String(r.student_id ?? "").trim();
    const s = byCode.get(key);
    if (s) return { student_code: String(s.student_id ?? s.id), first_name: s.first_name ?? null, last_name: s.last_name ?? null };
    const parts = String(r.student_name ?? "").trim().split(/\s+/);
    const last = parts.length > 1 ? parts.pop()! : null;
    return { student_code: key, first_name: parts.join(" ") || null, last_name: last };
  };

  const displayNames = new Map<string, string>();
  for (const s of input.setups) {
    const key = [normalizeAcademicTerm(s.academic_term), s.grade_level, s.classroom, s.subject, s.unit_name ?? ""].join("");
    if (s.unit_display_name && !displayNames.has(key)) displayNames.set(key, s.unit_display_name);
  }

  const items: UnitScoreItem[] = input.rows.map((r) => {
    const who = identify(r);
    const score = toNumber(r.score);
    const total = toNumber(r.total_score);
    const percent = score !== null && total !== null && total > 0 ? round1((score / total) * 100) : null;
    const status: UnitScoreItem["status"] = r.is_absent ? "absent" : percent === null ? "no_score" : percent >= passPercent ? "pass" : "not_pass";
    return {
      student_code: who.student_code,
      first_name: who.first_name,
      last_name: who.last_name,
      grade_level: r.grade_level,
      classroom: r.classroom,
      subject: r.subject,
      unit_name: r.unit_name,
      unit_display_name: displayNames.get([normalizeAcademicTerm(r.academic_term), r.grade_level, r.classroom, r.subject, r.unit_name ?? ""].join("")) ?? null,
      assessment_kind: r.assessment_kind ?? "unit",
      score,
      total_score: total,
      percent,
      status,
      assessed_date: r.assessed_date ?? null,
      teacher_name: teacherName(r.teacher_id),
    };
  });
  items.sort((x, y) => x.grade_level.localeCompare(y.grade_level) || x.classroom.localeCompare(y.classroom) || x.subject.localeCompare(y.subject) || String(x.unit_name ?? "").localeCompare(String(y.unit_name ?? "")) || x.student_code.localeCompare(y.student_code));

  const avg = (xs: number[]) => (xs.length ? round1(xs.reduce((p, c) => p + c, 0) / xs.length) : null);

  const unitGroups = new Map<string, UnitScoreItem[]>();
  for (const it of items) {
    const key = [it.grade_level, it.classroom, it.subject, it.unit_name ?? "", it.assessment_kind].join("");
    const list = unitGroups.get(key) ?? [];
    list.push(it);
    unitGroups.set(key, list);
  }
  const by_unit = [...unitGroups.values()].map((list) => {
    const scored = list.filter((x) => x.percent !== null);
    const pcts = scored.map((x) => x.percent as number);
    return {
      grade_level: list[0].grade_level,
      classroom: list[0].classroom,
      subject: list[0].subject,
      unit_name: list[0].unit_name,
      unit_display_name: list[0].unit_display_name,
      assessment_kind: list[0].assessment_kind,
      total_score: mode(list.map((x) => x.total_score)),
      assessed_date: mode(list.map((x) => x.assessed_date)),
      teacher_name: mode(list.map((x) => x.teacher_name)),
      n: list.length,
      n_scored: scored.length,
      avg_percent: avg(pcts),
      min_percent: pcts.length ? Math.min(...pcts) : null,
      max_percent: pcts.length ? Math.max(...pcts) : null,
      pass: list.filter((x) => x.status === "pass").length,
      not_pass: list.filter((x) => x.status === "not_pass").length,
      absent: list.filter((x) => x.status === "absent").length,
      no_score: list.filter((x) => x.status === "no_score").length,
    };
  });

  const studentGroups = new Map<string, UnitScoreItem[]>();
  for (const it of items) {
    const list = studentGroups.get(it.student_code) ?? [];
    list.push(it);
    studentGroups.set(it.student_code, list);
  }
  const by_student = [...studentGroups.values()].map((list) => {
    const scored = list.filter((x) => x.percent !== null);
    const weakest = scored.length ? scored.reduce((m, x) => ((x.percent as number) < (m.percent as number) ? x : m)) : null;
    return {
      student_code: list[0].student_code,
      first_name: list[0].first_name,
      last_name: list[0].last_name,
      grade_level: list[0].grade_level,
      classroom: list[0].classroom,
      units: list.length,
      avg_percent: avg(scored.map((x) => x.percent as number)),
      pass: list.filter((x) => x.status === "pass").length,
      not_pass: list.filter((x) => x.status === "not_pass").length,
      absent: list.filter((x) => x.status === "absent").length,
      weakest: weakest ? { subject: weakest.subject, unit_name: weakest.unit_name, unit_display_name: weakest.unit_display_name, percent: weakest.percent } : null,
    };
  }).sort((x, y) => (x.avg_percent ?? 999) - (y.avg_percent ?? 999));

  const scoredAll = items.filter((x) => x.percent !== null);
  return {
    pass_percent: passPercent,
    totals: {
      rows: items.length,
      students: studentGroups.size,
      units: unitGroups.size,
      avg_percent: avg(scoredAll.map((x) => x.percent as number)),
      pass: items.filter((x) => x.status === "pass").length,
      not_pass: items.filter((x) => x.status === "not_pass").length,
      absent: items.filter((x) => x.status === "absent").length,
      no_score: items.filter((x) => x.status === "no_score").length,
    },
    by_unit,
    by_student,
    items,
  };
}

export interface ExamPaperRow {
  id: string;
  academic_term: string;
  exam_type: string | null;
  grade_level: string;
  classroom: string;
  subject: string;
  subject_display: string | null;
  teacher_name: string | null;
  exam_date: string | null;
  k_total: number | string | null;
  p_total: number | string | null;
  a_total: number | string | null;
  total_score: number | string | null;
  pass_threshold: number | string | null;
  status: string | null;
}

export interface ExamResultRow {
  paper_id: string;
  student_id: string;
  student_name: string | null;
  k_score: number | string | null;
  p_score: number | string | null;
  a_score: number | string | null;
  total: number | string | null;
  is_absent: boolean | null;
  gap_flag: string | null;
  result: string | null;
}

export function isFlaggedExamResult(r: Pick<ExamResultRow, "result" | "is_absent" | "total">): boolean {
  return r.is_absent === true || r.result !== "pass" || toNumber(r.total) === 0;
}

export function buildExamReport(papers: ExamPaperRow[], results: ExamResultRow[], students: StudentRow[], onlyFlagged: boolean) {
  const directory = new StudentDirectory(students);
  const byPaper = new Map<string, ExamResultRow[]>();
  for (const r of results) {
    const list = byPaper.get(r.paper_id) ?? [];
    list.push(r);
    byPaper.set(r.paper_id, list);
  }

  const sortedPapers = [...papers].sort((a, b) =>
    cmp(a.grade_level, b.grade_level) || cmp(a.classroom, b.classroom) || cmp(a.subject, b.subject) || cmp(a.exam_type, b.exam_type));

  const out = sortedPapers.map((p) => {
    const rows = byPaper.get(p.id) ?? [];
    const fullScore = toNumber(p.total_score);
    const present = rows.filter((r) => r.is_absent !== true && toNumber(r.total) !== null);
    const totals = present.map((r) => toNumber(r.total) as number);
    const avg = totals.length ? round2(totals.reduce((s, v) => s + v, 0) / totals.length) : null;
    const summary = {
      n: rows.length,
      n_present: present.length,
      average: avg,
      average_percent: avg !== null && fullScore ? round1((avg / fullScore) * 100) : null,
      pass: rows.filter((r) => r.result === "pass").length,
      not_pass: rows.filter((r) => r.is_absent !== true && r.result !== "pass").length,
      absent: rows.filter((r) => r.is_absent === true).length,
      flagged: rows.filter(isFlaggedExamResult).length,
    };
    const students_out = rows
      .filter((r) => !onlyFlagged || isFlaggedExamResult(r))
      .map((r) => {
        const who = directory.identify(r.student_id, r.student_name, p.grade_level, p.classroom);
        const total = toNumber(r.total);
        return {
          student_code: who.student_code,
          first_name: who.first_name,
          last_name: who.last_name,
          k_score: toNumber(r.k_score),
          p_score: toNumber(r.p_score),
          a_score: toNumber(r.a_score),
          total,
          percent: total !== null && fullScore ? round1((total / fullScore) * 100) : null,
          is_absent: r.is_absent ?? false,
          gap_flag: r.gap_flag,
          result: r.result,
        };
      })
      .sort((a, b) => cmp(a.student_code, b.student_code));
    return {
      paper: {
        id: p.id, academic_term: p.academic_term, exam_type: p.exam_type,
        grade_level: p.grade_level, classroom: p.classroom, subject: p.subject, subject_display: p.subject_display,
        teacher_name: p.teacher_name, exam_date: p.exam_date,
        k_total: toNumber(p.k_total), p_total: toNumber(p.p_total), a_total: toNumber(p.a_total),
        total_score: fullScore, pass_threshold: toNumber(p.pass_threshold), status: p.status,
      },
      summary,
      students: students_out,
    };
  });

  const all = out.map((o) => o.summary);
  return {
    paper_count: out.length,
    overall: {
      n: all.reduce((s, x) => s + x.n, 0),
      pass: all.reduce((s, x) => s + x.pass, 0),
      not_pass: all.reduce((s, x) => s + x.not_pass, 0),
      absent: all.reduce((s, x) => s + x.absent, 0),
      flagged: all.reduce((s, x) => s + x.flagged, 0),
    },
    papers: out,
  };
}

// ---------------------------------------------------------------- atlas_reading_results

/** Reading levels from best to worst, as stored in reading_results.level. */
export const READING_LEVELS = ["ดีมาก", "ดี", "พอใช้", "ปรับปรุง"] as const;
export const LOWEST_READING_LEVEL = READING_LEVELS[READING_LEVELS.length - 1];

export interface ReadingRoundRow {
  id: string;
  academic_term: string;
  round_code: string;
  round_name: string | null;
  grade_level: string;
  test_date: string | null;
  aloud_total: number | string | null;
  comprehend_total: number | string | null;
  status: string | null;
}

export interface ReadingResultRow {
  round_id: string;
  student_id: string;
  student_name: string | null;
  classroom: string | null;
  aloud_score: number | string | null;
  comprehend_score: number | string | null;
  total: number | string | null;
  is_absent: boolean | null;
  level: string | null;
  is_nonreader: boolean | null;
}

export function isFlaggedReadingResult(r: Pick<ReadingResultRow, "is_nonreader" | "is_absent" | "level">): boolean {
  return r.is_nonreader === true || r.is_absent === true || r.level === LOWEST_READING_LEVEL;
}

export function buildReadingReport(rounds: ReadingRoundRow[], results: ReadingResultRow[], students: StudentRow[], onlyFlagged: boolean) {
  const directory = new StudentDirectory(students);
  const byRound = new Map<string, ReadingResultRow[]>();
  for (const r of results) {
    const list = byRound.get(r.round_id) ?? [];
    list.push(r);
    byRound.set(r.round_id, list);
  }
  const sortedRounds = [...rounds].sort((a, b) => cmp(a.grade_level, b.grade_level) || cmp(a.test_date, b.test_date) || cmp(a.round_code, b.round_code));
  return {
    round_count: sortedRounds.length,
    rounds: sortedRounds.map((round) => {
      const rows = byRound.get(round.id) ?? [];
      const levelCounts: Record<string, number> = {};
      for (const lv of READING_LEVELS) levelCounts[lv] = 0;
      let noLevel = 0;
      for (const r of rows) {
        if (r.level) levelCounts[r.level] = (levelCounts[r.level] ?? 0) + 1;
        else noLevel++;
      }
      return {
        round: {
          id: round.id, academic_term: round.academic_term, round_code: round.round_code, round_name: round.round_name,
          grade_level: round.grade_level, test_date: round.test_date,
          aloud_total: toNumber(round.aloud_total), comprehend_total: toNumber(round.comprehend_total), status: round.status,
        },
        summary: {
          n: rows.length,
          by_level: levelCounts,
          no_level: noLevel,
          nonreader: rows.filter((r) => r.is_nonreader === true).length,
          absent: rows.filter((r) => r.is_absent === true).length,
          flagged: rows.filter(isFlaggedReadingResult).length,
        },
        students: rows
          .filter((r) => !onlyFlagged || isFlaggedReadingResult(r))
          .map((r) => {
            const who = directory.identify(r.student_id, r.student_name, round.grade_level, r.classroom);
            return {
              student_code: who.student_code,
              first_name: who.first_name,
              last_name: who.last_name,
              classroom: r.classroom,
              aloud_score: toNumber(r.aloud_score),
              comprehend_score: toNumber(r.comprehend_score),
              total: toNumber(r.total),
              level: r.level,
              is_nonreader: r.is_nonreader ?? false,
              is_absent: r.is_absent ?? false,
            };
          })
          .sort((a, b) => cmp(a.classroom, b.classroom) || cmp(a.student_code, b.student_code)),
      };
    }),
  };
}

// ---------------------------------------------------------------- atlas_student_lookup

export interface LookupFilters {
  grade_level?: string;
  classroom?: string;
  include_inactive?: boolean;
}

function passesClassFilter(grade: string | null | undefined, classroom: string | null | undefined, f: LookupFilters): boolean {
  if (f.grade_level && grade !== f.grade_level) return false;
  if (f.classroom && classroom !== f.classroom) return false;
  return true;
}

export function searchStudents(students: StudentRow[], query: string | undefined, filters: LookupFilters, limit = 50) {
  const q = (query ?? "").trim();
  const qName = normalizePersonName(q);
  const isCode = /^\d+$/.test(q);
  const matched = students.filter((s) => {
    if (!filters.include_inactive && !s.is_active) return false;
    if (!passesClassFilter(s.grade_level, s.classroom, filters)) return false;
    if (!q) return true;
    if (isCode) return String(s.student_id ?? "").startsWith(q);
    const full = normalizePersonName(`${s.first_name ?? ""}${s.last_name ?? ""}`);
    return full.includes(qName) || String(s.student_id ?? "") === q;
  }).sort((a, b) => cmp(a.grade_level, b.grade_level) || cmp(a.classroom, b.classroom) || cmp(a.student_id, b.student_id));
  return {
    total_matched: matched.length,
    truncated: matched.length > limit,
    students: matched.slice(0, limit).map((s) => ({
      student_code: s.student_id,
      first_name: s.first_name,
      last_name: s.last_name,
      grade_level: s.grade_level,
      classroom: s.classroom,
      is_active: s.is_active ?? false,
    })),
  };
}

/** A student_id + name as it appears in a record table (unit_assessments / pbl_assessments). */
export interface RecordIdentityRow {
  source: "unit_assessments" | "pbl_assessments";
  student_id: string;
  student_name: string | null;
  grade_level: string | null;
  classroom: string | null;
}

export function findStudentDuplicates(students: StudentRow[], records: RecordIdentityRow[], filters: LookupFilters) {
  const directory = new StudentDirectory(students);
  const scopedStudents = students.filter((s) => (filters.include_inactive || s.is_active) && passesClassFilter(s.grade_level, s.classroom, filters));
  const scopedRecords = records.filter((r) => passesClassFilter(r.grade_level, r.classroom, filters));

  // (ก) same student_id on more than one students row
  const codeGroups = new Map<string, StudentRow[]>();
  for (const s of scopedStudents) {
    if (!s.student_id) continue;
    const list = codeGroups.get(s.student_id) ?? [];
    list.push(s);
    codeGroups.set(s.student_id, list);
  }
  const duplicate_student_ids = [...codeGroups.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([code, list]) => ({
      student_code: code,
      students: list.map((s) => ({ first_name: s.first_name, last_name: s.last_name, grade_level: s.grade_level, classroom: s.classroom, is_active: s.is_active ?? false })),
    }))
    .sort((a, b) => cmp(a.student_code, b.student_code));

  // Resolve a record's student_id to a student code (uuid -> code) so the same child isn't counted twice.
  const codeOf = (studentId: string, grade: string | null, classroom: string | null) =>
    String(directory.find(studentId, grade, classroom)?.student_id ?? studentId).trim();

  // (ข) same normalised name in the same classroom under different student codes
  type NameEntry = { grade_level: string | null; classroom: string | null; display: string; codes: Map<string, Set<string>> };
  const nameGroups = new Map<string, NameEntry>();
  const addName = (grade: string | null, classroom: string | null, rawName: string, code: string, source: string) => {
    const norm = normalizePersonName(rawName);
    if (!norm || !code) return;
    const key = `${grade}${classroom}${norm}`;
    const entry = nameGroups.get(key) ?? { grade_level: grade, classroom, display: tidyName(rawName), codes: new Map() };
    const sources = entry.codes.get(code) ?? new Set<string>();
    sources.add(source);
    entry.codes.set(code, sources);
    nameGroups.set(key, entry);
  };
  for (const s of scopedStudents) addName(s.grade_level, s.classroom, `${s.first_name ?? ""} ${s.last_name ?? ""}`, String(s.student_id ?? s.id), "students");
  for (const r of scopedRecords) addName(r.grade_level, r.classroom, r.student_name ?? "", codeOf(r.student_id, r.grade_level, r.classroom), r.source);
  const duplicate_names_in_class = [...nameGroups.values()]
    .filter((e) => e.codes.size > 1)
    .map((e) => ({
      grade_level: e.grade_level,
      classroom: e.classroom,
      name: e.display,
      student_codes: [...e.codes.entries()].map(([code, src]) => ({ student_code: code, sources: [...src].sort() })).sort((a, b) => cmp(a.student_code, b.student_code)),
    }))
    .sort((a, b) => cmp(a.grade_level, b.grade_level) || cmp(a.classroom, b.classroom) || cmp(a.name, b.name));

  // (ค) student_id in record tables with no students row
  const orphanGroups = new Map<string, { student_id: string; source: string; names: Set<string>; classes: Set<string>; rows: number }>();
  for (const r of scopedRecords) {
    if (directory.find(r.student_id, r.grade_level, r.classroom)) continue;
    const key = `${r.source}${r.student_id}`;
    const g = orphanGroups.get(key) ?? { student_id: r.student_id, source: r.source, names: new Set(), classes: new Set(), rows: 0 };
    if (r.student_name) g.names.add(tidyName(r.student_name));
    g.classes.add(`${r.grade_level}/${r.classroom}`);
    g.rows++;
    orphanGroups.set(key, g);
  }
  const ids_not_in_students = [...orphanGroups.values()]
    .map((g) => ({ student_id: g.student_id, source: g.source, names: [...g.names], classes: [...g.classes], rows: g.rows }))
    .sort((a, b) => cmp(a.source, b.source) || cmp(a.student_id, b.student_id));

  // (ง) one student code used with more than one (normalised) name across students + record tables
  type Variant = { name: string; source: string; grade_level: string | null; classroom: string | null; rows: number };
  const idGroups = new Map<string, Map<string, Map<string, Variant>>>();
  const addVariant = (code: string, rawName: string, source: string, grade: string | null, classroom: string | null) => {
    const norm = normalizePersonName(rawName);
    if (!norm || !code) return;
    const byName = idGroups.get(code) ?? new Map<string, Map<string, Variant>>();
    const variants = byName.get(norm) ?? new Map<string, Variant>();
    const vKey = `${source}${grade}${classroom}`;
    const v = variants.get(vKey) ?? { name: tidyName(rawName), source, grade_level: grade, classroom, rows: 0 };
    v.rows++;
    variants.set(vKey, v);
    byName.set(norm, variants);
    idGroups.set(code, byName);
  };
  for (const s of scopedStudents) if (s.student_id) addVariant(String(s.student_id), `${s.first_name ?? ""} ${s.last_name ?? ""}`, "students", s.grade_level, s.classroom);
  for (const r of scopedRecords) addVariant(codeOf(r.student_id, r.grade_level, r.classroom), r.student_name ?? "", r.source, r.grade_level, r.classroom);
  const id_name_conflicts = [...idGroups.entries()]
    .filter(([, byName]) => byName.size > 1)
    .map(([code, byName]) => ({
      student_code: code,
      distinct_names: byName.size,
      variants: [...byName.values()].flatMap((m) => [...m.values()]).sort((a, b) => cmp(a.source, b.source) || cmp(a.name, b.name)),
    }))
    .sort((a, b) => cmp(a.student_code, b.student_code));

  return {
    counts: {
      duplicate_student_ids: duplicate_student_ids.length,
      duplicate_names_in_class: duplicate_names_in_class.length,
      ids_not_in_students: ids_not_in_students.length,
      id_name_conflicts: id_name_conflicts.length,
    },
    duplicate_student_ids,
    duplicate_names_in_class,
    ids_not_in_students,
    id_name_conflicts,
  };
}
