import { describe, expect, it } from "vitest";
import {
  academicTermVariants,
  buildExamReport,
  buildReadingReport,
  buildZeroReport,
  findStudentDuplicates,
  isFlaggedExamResult,
  isFlaggedReadingResult,
  matchesAssessmentKind,
  normalizePersonName,
  searchStudents,
  type RecordIdentityRow,
  type StudentRow,
  type UnitAssessmentRow,
} from "../../../supabase/functions/_shared/academicRecords";

// Fictional students only.
const students: StudentRow[] = [
  { id: "u-1001", student_id: "1001", first_name: "เด็กชายสมชาย", last_name: "ใจดี", grade_level: "ป.3", classroom: "KBW", is_active: true },
  { id: "u-1002", student_id: "1002", first_name: "เด็กหญิงสมหญิง", last_name: "รักเรียน", grade_level: "ป.3", classroom: "KBW", is_active: true },
  { id: "u-1003", student_id: "1003", first_name: "เด็กชายมานะ", last_name: "ขยัน", grade_level: "ป.3", classroom: "KBW", is_active: true },
  { id: "u-1004", student_id: "1004", first_name: "เด็กชายย้ายออก", last_name: "ไปแล้ว", grade_level: "ป.3", classroom: "KBW", is_active: false },
  { id: "u-2001", student_id: "2001", first_name: "เด็กหญิงดวงดาว", last_name: "สว่าง", grade_level: "ป.2", classroom: "2", is_active: true },
  { id: "u-2002", student_id: "2002", first_name: "เด็กชายภูผา", last_name: "สูงใหญ่", grade_level: "ป.4", classroom: "2", is_active: true },
];
const profiles = [
  { id: "p-a", user_id: "t-a", full_name: "ครูเอ ทดสอบ" },
  { id: "t-b", user_id: null, full_name: "ครูบี ทดสอบ" },
];

const ua = (over: Partial<UnitAssessmentRow>): UnitAssessmentRow => ({
  student_id: "1001", student_name: "เด็กชาย สมชาย  ใจดี", grade_level: "ป.3", classroom: "KBW",
  subject: "ภาษาไทย", unit_name: "1", academic_term: "2569-1", score: 8, total_score: 10,
  assessed_date: "2026-09-01", teacher_id: "t-a", assessment_kind: "unit", is_absent: false, ...over,
});

describe("term + name helpers", () => {
  it("accepts both term formats", () => {
    expect(academicTermVariants("1/2569")).toEqual(["2569-1", "1/2569"]);
    expect(academicTermVariants("2569-1")).toEqual(["2569-1", "1/2569"]);
  });
  it("normalises titles, spacing and dashes", () => {
    expect(normalizePersonName("เด็กชาย สมชาย  ใจดี")).toBe(normalizePersonName("ด.ช.สมชาย ใจดี"));
    expect(normalizePersonName("เด็กชาย เหมา อังโซ  -")).toBe(normalizePersonName("เด็กชายเหมา อังโซ"));
    expect(normalizePersonName("เด็กชายสมชาย ใจดี")).not.toBe(normalizePersonName("เด็กชายสมศักดิ์ ใจดี"));
  });
  it("treats a null assessment_kind as unit", () => {
    expect(matchesAssessmentKind(null, "unit")).toBe(true);
    expect(matchesAssessmentKind("midterm", "unit")).toBe(false);
    expect(matchesAssessmentKind("midterm", "all")).toBe(true);
  });
});

describe("buildZeroReport", () => {
  const rows = [
    ua({ student_id: "1001", score: 0, assessed_date: "2026-09-03" }),
    ua({ student_id: "1001", score: 0, unit_name: "2", assessed_date: "2026-09-02", teacher_id: "t-b" }),
    ua({ student_id: "u-1002", student_name: "สมหญิง", score: null }),
    // unit 2: 1001 recorded, 1002/1003 have no row -> not_recorded; inactive 1004 is ignored
    ua({ student_id: "1003", score: 5 }),
  ];
  const setups = [{ academic_term: "2569-1", subject: "ภาษาไทย", grade_level: "ป.3", classroom: "KBW", unit_name: "1", unit_display_name: "หน่วยที่ 1 เสียงและตัวอักษร" }];

  it("lists zeros only by default, with names from students and teacher names from profiles", () => {
    const r = buildZeroReport({ rows, students, profiles, setups, includeMissing: false });
    expect(r.zero_count).toBe(2);
    expect(r.zero_student_count).toBe(1);
    expect(r.missing_count).toBe(0);
    expect(r.items.map((i) => i.assessed_date)).toEqual(["2026-09-02", "2026-09-03"]); // sorted by date within student
    const first = r.items[1];
    expect(first).toMatchObject({ student_code: "1001", first_name: "เด็กชายสมชาย", last_name: "ใจดี", unit_display_name: "หน่วยที่ 1 เสียงและตัวอักษร", teacher_name: "ครูเอ ทดสอบ", status: "zero" });
    expect(r.items[0].teacher_name).toBe("ครูบี ทดสอบ"); // profiles.id = teacher_id fallback
    expect(r.by_class).toEqual([{ class: "ป.3/KBW", zero: 2, missing: 0 }]);
  });

  it("adds null_score rows and not_recorded classmates when include_missing", () => {
    const r = buildZeroReport({ rows, students, profiles, setups, includeMissing: true });
    expect(r.null_score_count).toBe(1);
    const notRecorded = r.items.filter((i) => i.status === "not_recorded");
    expect(notRecorded.map((i) => `${i.student_code}:${i.unit_name}`).sort()).toEqual(["1002:2", "1003:2"]);
    expect(notRecorded[0]).toMatchObject({ score: null, total_score: 10, teacher_name: "ครูบี ทดสอบ" });
    expect(r.items.find((i) => i.status === "null_score")?.student_code).toBe("1002"); // uuid resolved to code
    expect(r.missing_count).toBe(3);
    expect(r.by_class).toEqual([{ class: "ป.3/KBW", zero: 2, missing: 3 }]);
  });

  it("does not create not_recorded rows for a unit nobody has scored", () => {
    const r = buildZeroReport({ rows: [ua({ score: null })], students, profiles, setups: [], includeMissing: true });
    expect(r.not_recorded_count).toBe(0);
    expect(r.null_score_count).toBe(1);
  });
});

describe("buildExamReport", () => {
  const papers = [{
    id: "e1", academic_term: "2569-1", exam_type: "midterm", grade_level: "ป.3", classroom: "KBW", subject: "คณิต",
    subject_display: "คณิตศาสตร์", teacher_name: "ครูเอ", exam_date: "2026-08-20", k_total: 10, p_total: 6, a_total: 4,
    total_score: 20, pass_threshold: 50, status: "synced",
  }];
  const base = { paper_id: "e1", k_score: 5, p_score: 3, a_score: 2, gap_flag: "success" };
  const results = [
    { ...base, student_id: "1001", student_name: null, total: 15, is_absent: false, result: "pass" },
    { ...base, student_id: "1002", student_name: null, total: 5, is_absent: false, result: "stay", gap_flag: "k-gap" },
    { ...base, student_id: "1003", student_name: null, total: null, is_absent: true, result: null },
  ];
  it("summarises each paper and flags stay/absent/zero", () => {
    const r = buildExamReport(papers, results, students, false);
    expect(r.papers[0].summary).toEqual({ n: 3, n_present: 2, average: 10, average_percent: 50, pass: 1, not_pass: 1, absent: 1, flagged: 2 });
    expect(r.papers[0].students[0]).toMatchObject({ student_code: "1001", first_name: "เด็กชายสมชาย", percent: 75 });
    expect(isFlaggedExamResult({ result: "pass", is_absent: false, total: 0 })).toBe(true);
    const flagged = buildExamReport(papers, results, students, true);
    expect(flagged.papers[0].students.map((s) => s.student_code)).toEqual(["1002", "1003"]);
    expect(flagged.overall).toMatchObject({ n: 3, pass: 1, absent: 1, flagged: 2 });
  });
});

describe("buildReadingReport", () => {
  const rounds = [{ id: "r1", academic_term: "2569-1", round_code: "pre", round_name: "ก่อนเรียน", grade_level: "ป.3", test_date: "2026-06-01", aloud_total: 10, comprehend_total: 10, status: "completed" }];
  const base = { round_id: "r1", student_name: null, classroom: "KBW", aloud_score: 8, comprehend_score: 8, total: 16, is_absent: false, is_nonreader: false };
  const results = [
    { ...base, student_id: "1001", level: "ดีมาก" },
    { ...base, student_id: "1002", level: "ปรับปรุง" },
    { ...base, student_id: "1003", level: null, is_absent: true, total: null },
    { ...base, student_id: "1004", level: "พอใช้", is_nonreader: true },
  ];
  it("counts levels and flags nonreader/absent/lowest level", () => {
    const r = buildReadingReport(rounds, results, students, false);
    expect(r.rounds[0].summary).toEqual({ n: 4, by_level: { "ดีมาก": 1, "ดี": 0, "พอใช้": 1, "ปรับปรุง": 1 }, no_level: 1, nonreader: 1, absent: 1, flagged: 3 });
    expect(isFlaggedReadingResult({ level: "ดี", is_absent: false, is_nonreader: false })).toBe(false);
    const flagged = buildReadingReport(rounds, results, students, true);
    expect(flagged.rounds[0].students.map((s) => s.student_code)).toEqual(["1002", "1003", "1004"]);
  });
});

describe("student lookup", () => {
  it("searches by code prefix or partial name, active only by default", () => {
    expect(searchStudents(students, "100", {}).students.map((s) => s.student_code)).toEqual(["1001", "1002", "1003"]);
    expect(searchStudents(students, "100", { include_inactive: true }).total_matched).toBe(4);
    expect(searchStudents(students, "สมหญิง รัก", {}).students[0].student_code).toBe("1002");
    expect(searchStudents(students, "", { grade_level: "ป.2", classroom: "2" }).students).toHaveLength(1);
  });

  it("finds duplicate ids, same-name/different-code, orphans and id-name conflicts across record tables", () => {
    const dupStudents: StudentRow[] = [
      ...students,
      { id: "u-9999a", student_id: "9999", first_name: "เด็กชายหนึ่ง", last_name: "ก", grade_level: "ป.1", classroom: "1", is_active: true },
      { id: "u-9999b", student_id: "9999", first_name: "เด็กชายสอง", last_name: "ข", grade_level: "ป.1", classroom: "1", is_active: true },
    ];
    const records: RecordIdentityRow[] = [
      // same pattern as the real case: a ป.2/2 child recorded in PBL under a ป.4/2 child's code
      { source: "pbl_assessments", student_id: "2002", student_name: "เด็กหญิง ดวงดาว  สว่าง", grade_level: "ป.2", classroom: "2" },
      { source: "unit_assessments", student_id: "2002", student_name: "ด.ช.ภูผา สูงใหญ่", grade_level: "ป.4", classroom: "2" },
      { source: "unit_assessments", student_id: "u-2001", student_name: "เด็กหญิงดวงดาว สว่าง", grade_level: "ป.2", classroom: "2" },
      { source: "unit_assessments", student_id: "7777", student_name: "เด็กชายไม่มี ในระบบ", grade_level: "ป.3", classroom: "KBW" },
    ];
    const r = findStudentDuplicates(dupStudents, records, {});
    expect(r.duplicate_student_ids.map((d) => d.student_code)).toEqual(["9999"]);
    const sameName = r.duplicate_names_in_class.find((d) => d.grade_level === "ป.2");
    expect(sameName?.student_codes.map((c) => c.student_code)).toEqual(["2001", "2002"]);
    expect(r.ids_not_in_students).toEqual([{ student_id: "7777", source: "unit_assessments", names: ["เด็กชายไม่มี ในระบบ"], classes: ["ป.3/KBW"], rows: 1 }]);
    const conflict = r.id_name_conflicts.find((c) => c.student_code === "2002");
    expect(conflict?.distinct_names).toBe(2);
    expect(conflict?.variants.map((v) => v.source).sort()).toEqual(["pbl_assessments", "students", "unit_assessments"]);
    // title/spacing variants alone are not conflicts
    expect(r.id_name_conflicts.find((c) => c.student_code === "2001")).toBeUndefined();
  });
});
