import { describe, it, expect } from "vitest";
import {
  validateGaps,
  detectStudentRisks,
  aggregateTeachingLogs,
  aggregateAssessments,
} from "../smartReportEngine";
import type {
  UnitTeachingAggregate,
  UnitAssessmentAggregate,
  TeachingLogRaw,
  UnitAssessmentRaw,
} from "@/types/smartReport";

function makeLog(overrides: Partial<TeachingLogRaw> = {}): TeachingLogRaw {
  return {
    id: "1",
    learning_unit: "หน่วยที่ 1",
    next_strategy: "ใช้กิจกรรมกลุ่ม",
    major_gap: "k-gap",
    mastery_score: 3,
    remedial_ids: "s1,s2",
    teaching_date: "2025-01-10",
    subject: "คณิตศาสตร์",
    grade_level: "ป.4",
    classroom: "1",
    academic_term: "1/2567",
    topic: null,
    key_issue: null,
    total_students: 30,
    teacher_id: "t1",
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<UnitAssessmentRaw> = {}): UnitAssessmentRaw {
  return {
    id: "a1",
    student_id: "s1",
    student_name: "สมชาย",
    unit_name: "หน่วยที่ 1",
    score: 7,
    total_score: 10,
    subject: "คณิตศาสตร์",
    grade_level: "ป.4",
    classroom: "1",
    academic_term: "1/2567",
    assessed_date: "2025-01-15",
    ...overrides,
  };
}

describe("validateGaps", () => {
  it("returns aligned when success + high score", () => {
    const teaching: UnitTeachingAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        logs: [makeLog({ major_gap: "success" })],
        dominantGap: "success",
        avgMastery: 5,
        strategies: [],
      },
    ];
    const assessments: UnitAssessmentAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        assessments: [makeAssessment({ score: 8, total_score: 10 })],
        avgScorePct: 80,
        studentCount: 1,
      },
    ];
    const result = validateGaps(teaching, assessments);
    expect(result).toHaveLength(1);
    expect(result[0].verdict).toBe("aligned");
    expect(result[0].teachingGap).toBe("success");
    expect(result[0].assessmentAvgPct).toBe(80);
  });

  it("returns overperformed when gap + high score", () => {
    const teaching: UnitTeachingAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        logs: [makeLog({ major_gap: "k-gap" })],
        dominantGap: "k-gap",
        avgMastery: 3,
        strategies: [],
      },
    ];
    const assessments: UnitAssessmentAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        assessments: [makeAssessment({ score: 9, total_score: 10 })],
        avgScorePct: 90,
        studentCount: 1,
      },
    ];
    const result = validateGaps(teaching, assessments);
    expect(result[0].verdict).toBe("overperformed");
  });

  it("returns needs_work when low score", () => {
    const teaching: UnitTeachingAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        logs: [makeLog({ major_gap: "success" })],
        dominantGap: "success",
        avgMastery: 5,
        strategies: [],
      },
    ];
    const assessments: UnitAssessmentAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        assessments: [makeAssessment({ score: 3, total_score: 10 })],
        avgScorePct: 30,
        studentCount: 1,
      },
    ];
    const result = validateGaps(teaching, assessments);
    expect(result[0].verdict).toBe("needs_work");
  });

  it("includes units with only assessments", () => {
    const teaching: UnitTeachingAggregate[] = [];
    const assessments: UnitAssessmentAggregate[] = [
      {
        unitKey: "unit-2",
        displayName: "Unit 2",
        assessments: [makeAssessment({ unit_name: "Unit 2", score: 6, total_score: 10 })],
        avgScorePct: 60,
        studentCount: 1,
      },
    ];
    const result = validateGaps(teaching, assessments);
    expect(result).toHaveLength(1);
    expect(result[0].teachingGap).toBe("ไม่มีข้อมูลการสอน");
    expect(result[0].assessmentAvgPct).toBe(60);
    expect(result[0].verdict).toBe("aligned");
  });
});

describe("detectStudentRisks", () => {
  it("marks high risk when remedial count high and score low", () => {
    const teaching: UnitTeachingAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        logs: [
          makeLog({ remedial_ids: "s1" }),
          makeLog({ remedial_ids: "s1" }),
          makeLog({ remedial_ids: "s1" }),
        ],
        dominantGap: "k-gap",
        avgMastery: 3,
        strategies: [],
      },
    ];
    const assessments: UnitAssessmentAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        assessments: [makeAssessment({ student_id: "s1", score: 2, total_score: 10 })],
        avgScorePct: 20,
        studentCount: 1,
      },
    ];
    const result = detectStudentRisks(teaching, assessments);
    const s1 = result.find((r) => r.studentId === "s1");
    expect(s1).toBeDefined();
    expect(s1?.remedialCount).toBe(3);
    expect(s1?.scorePct).toBe(20);
    expect(s1?.risk).toBe("high");
  });

  it("marks low risk when no remedial and high score", () => {
    const teaching: UnitTeachingAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        logs: [makeLog({ remedial_ids: null })],
        dominantGap: "success",
        avgMastery: 5,
        strategies: [],
      },
    ];
    const assessments: UnitAssessmentAggregate[] = [
      {
        unitKey: "unit-1",
        displayName: "หน่วยที่ 1",
        assessments: [makeAssessment({ student_id: "s1", score: 9, total_score: 10 })],
        avgScorePct: 90,
        studentCount: 1,
      },
    ];
    const result = detectStudentRisks(teaching, assessments);
    const s1 = result.find((r) => r.studentId === "s1");
    expect(s1?.risk).toBe("low");
  });
});

describe("aggregateTeachingLogs", () => {
  it("uses latest log for dominantGap on tie (mode tie-break)", () => {
    const logs: TeachingLogRaw[] = [
      makeLog({ teaching_date: "2025-01-01", major_gap: "k-gap" }),
      makeLog({ teaching_date: "2025-01-10", major_gap: "success" }),
    ];
    const result = aggregateTeachingLogs(logs);
    expect(result).toHaveLength(1);
    expect(result[0].dominantGap).toBe("success");
  });

  it("collects unique strategies", () => {
    const logs: TeachingLogRaw[] = [
      makeLog({ next_strategy: "กิจกรรมกลุ่ม" }),
      makeLog({ next_strategy: "กิจกรรมกลุ่ม" }),
      makeLog({ next_strategy: "ทำแบบฝึก" }),
    ];
    const result = aggregateTeachingLogs(logs);
    expect(result[0].strategies).toContain("กิจกรรมกลุ่ม");
    expect(result[0].strategies).toContain("ทำแบบฝึก");
    expect(result[0].strategies).toHaveLength(2);
  });
});

describe("aggregateAssessments", () => {
  it("computes avgScorePct and studentCount", () => {
    const assessments: UnitAssessmentRaw[] = [
      makeAssessment({ student_id: "s1", score: 8, total_score: 10 }),
      makeAssessment({ student_id: "s2", score: 6, total_score: 10 }),
    ];
    const result = aggregateAssessments(assessments);
    expect(result).toHaveLength(1);
    expect(result[0].avgScorePct).toBe(70);
    expect(result[0].studentCount).toBe(2);
  });
});
