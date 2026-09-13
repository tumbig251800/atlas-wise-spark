import { describe, expect, it } from "vitest";
import {
  evaluateWf6Candidates,
  summarizeWf6Candidates,
} from "../../../supabase/functions/_shared/wf6CandidateAudit";

describe("evaluateWf6Candidates", () => {
  const assessment = {
    id: "assessment-1",
    student_id: "9001",
    student_name: "Student One",
    academic_term: "1/2569",
    assessed_date: "2026-08-28",
    created_at: "2026-08-28T03:00:00Z",
    score: 6,
    total_score: 10,
    grade_level: "ป.6",
    classroom: "KBW",
    subject: "ภาษาอังกฤษ",
    unit_name: "หน่วย 1",
    teacher_id: "teacher-1",
  };

  it("returns a low-score assessment after 14 days with no remediation or prior action", () => {
    const candidates = evaluateWf6Candidates({
      term: "2569-1",
      asOfDate: "2026-09-11",
      assessments: [assessment],
      teachingLogs: [],
      actionItems: [],
      profiles: [{ user_id: "teacher-1", full_name: "Teacher One" }],
    });

    expect(candidates).toEqual([
      expect.objectContaining({
        assessment_id: "assessment-1",
        student_id: "9001",
        academic_term: "2569-1",
        score_percent: 60,
        age_days: 14,
        teacher_name: "Teacher One",
      }),
    ]);
  });

  it("excludes an assessment when a same-term teaching log names the student for remediation", () => {
    const candidates = evaluateWf6Candidates({
      term: "2569-1",
      asOfDate: "2026-09-11",
      assessments: [assessment],
      teachingLogs: [{
        academic_term: "2569-1",
        teaching_date: "2026-09-02",
        grade_level: "ป.6",
        classroom: "KBW",
        subject: "ภาษาอังกฤษ",
        remedial_ids: "9000, 9001;9002",
        health_care_status: false,
      }],
      actionItems: [],
      profiles: [],
    });

    expect(candidates).toEqual([]);
  });

  it("excludes an assessment already linked to a UnitBlindSpot action item", () => {
    const candidates = evaluateWf6Candidates({
      term: "2569-1",
      asOfDate: "2026-09-11",
      assessments: [assessment],
      teachingLogs: [],
      actionItems: [{
        issue_type: "UnitBlindSpot",
        evidence_context: { wf6: { assessment_id: "assessment-1" } },
      }],
      profiles: [],
    });

    expect(candidates).toEqual([]);
  });

  it("uses the Bangkok calendar date when assessed_date is missing", () => {
    const candidates = evaluateWf6Candidates({
      term: "2569-1",
      asOfDate: "2026-09-11",
      assessments: [{
        ...assessment,
        assessed_date: null,
        created_at: "2026-08-27T18:30:00Z",
      }],
      teachingLogs: [],
      actionItems: [],
      profiles: [],
    });

    expect(candidates[0]).toMatchObject({ assessed_date: "2026-08-28", age_days: 14 });
  });

  it("excludes a legacy UnitBlindSpot action created after the assessment", () => {
    const candidates = evaluateWf6Candidates({
      term: "2569-1",
      asOfDate: "2026-09-11",
      assessments: [assessment],
      teachingLogs: [],
      actionItems: [{
        issue_type: "UnitBlindSpot",
        issue_key: "UNIT-BLIND-9001-ภาษาอังก-ป6-KBW-หน่วย1",
        subject: "ภาษาอังกฤษ",
        grade_level: "ป.6",
        classroom: "KBW",
        created_at: "2026-08-29T00:00:00Z",
      }],
      profiles: [],
    });

    expect(candidates).toEqual([]);
  });

  it("returns aggregate-only output unless details are explicitly requested", () => {
    const [candidate] = evaluateWf6Candidates({
      term: "2569-1",
      asOfDate: "2026-09-11",
      assessments: [assessment],
      teachingLogs: [],
      actionItems: [],
      profiles: [],
    });

    const summary = summarizeWf6Candidates([candidate], {
      term: "2569-1",
      asOfDate: "2026-09-11",
      includeDetails: false,
      limit: 20,
    });

    expect(summary).toMatchObject({
      term: "2569-1",
      as_of_date: "2026-09-11",
      candidate_count: 1,
      details_included: false,
      groups: [{ grade_level: "ป.6", classroom: "KBW", subject: "ภาษาอังกฤษ", count: 1 }],
    });
    expect(summary).not.toHaveProperty("candidates");
    expect(JSON.stringify(summary)).not.toContain("9001");
    expect(JSON.stringify(summary)).not.toContain("Student One");
  });
});