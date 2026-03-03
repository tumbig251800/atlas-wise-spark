/**
 * Phase C: Smart Report Engine
 * Aggregates teaching logs + assessments, validates gaps, detects risks, analyzes strategies
 */
import { normalizeUnit, sortByUnitKey } from "./unitNormalization";
import type {
  TeachingLogRaw,
  UnitAssessmentRaw,
  UnitTeachingAggregate,
  UnitAssessmentAggregate,
  GapValidationResult,
  GapVerdict,
  StudentRiskProfile,
  StudentRiskLevel,
  StrategyEffectivenessResult,
  StrategyEffectiveness,
  SmartReport,
  SmartReportFilter,
} from "@/types/smartReport";

/** Parse remedial_ids to array of student IDs */
function parseRemedialIds(remedialIds: string | null): string[] {
  if (!remedialIds || !remedialIds.trim()) return [];
  return remedialIds
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x && x !== "[None]" && x !== "[N/A]");
}

/**
 * Get dominant major_gap. On tie, use value from log with latest teaching_date (mode tie-break).
 */
function getDominantGap(logs: TeachingLogRaw[]): string {
  if (logs.length === 0) return "success";
  const counts: Record<string, number> = {};
  for (const log of logs) {
    const g = log.major_gap || "success";
    counts[g] = (counts[g] ?? 0) + 1;
  }
  const maxCount = Math.max(...Object.values(counts));
  const tied = Object.entries(counts)
    .filter(([, c]) => c === maxCount)
    .map(([g]) => g);
  if (tied.length === 1) return tied[0];
  const sorted = [...logs].sort(
    (a, b) =>
      new Date(b.teaching_date).getTime() - new Date(a.teaching_date).getTime()
  );
  for (const log of sorted) {
    const g = log.major_gap || "success";
    if (tied.includes(g)) return g;
  }
  return tied[0] ?? "success";
}

export function aggregateTeachingLogs(
  logs: TeachingLogRaw[]
): UnitTeachingAggregate[] {
  const byKey = new Map<
    string,
    { displayName: string; logs: TeachingLogRaw[] }
  >();
  for (const log of logs) {
    const norm = normalizeUnit(log.learning_unit);
    if (!norm) continue;
    const existing = byKey.get(norm.unitKey);
    if (existing) {
      existing.logs.push(log);
      if (norm.displayName.length > (existing.displayName?.length ?? 0)) {
        existing.displayName = norm.displayName;
      }
    } else {
      byKey.set(norm.unitKey, { displayName: norm.displayName, logs: [log] });
    }
  }
  return Array.from(byKey.entries()).map(([unitKey, { displayName, logs }]) => {
    const strategies = [
      ...new Set(
        logs
          .map((l) => l.next_strategy?.trim())
          .filter((s): s is string => !!s)
      ),
    ];
    const avgMastery =
      logs.length > 0
        ? logs.reduce((s, l) => s + l.mastery_score, 0) / logs.length
        : 0;
    return {
      unitKey,
      displayName,
      logs,
      dominantGap: getDominantGap(logs),
      avgMastery,
      strategies,
    };
  });
}

export function aggregateAssessments(
  assessments: UnitAssessmentRaw[]
): UnitAssessmentAggregate[] {
  const byKey = new Map<
    string,
    { displayName: string; assessments: UnitAssessmentRaw[] }
  >();
  for (const a of assessments) {
    const norm = normalizeUnit(a.unit_name);
    if (!norm) continue;
    const existing = byKey.get(norm.unitKey);
    if (existing) {
      existing.assessments.push(a);
      if (norm.displayName.length > (existing.displayName?.length ?? 0)) {
        existing.displayName = norm.displayName;
      }
    } else {
      byKey.set(norm.unitKey, {
        displayName: norm.displayName,
        assessments: [a],
      });
    }
  }
  return Array.from(byKey.entries()).map(
    ([unitKey, { displayName, assessments }]) => {
      let sumPct = 0;
      for (const a of assessments) {
        const pct =
          a.total_score > 0 ? (a.score / a.total_score) * 100 : 0;
        sumPct += pct;
      }
      const avgScorePct =
        assessments.length > 0 ? sumPct / assessments.length : 0;
      const studentCount = new Set(assessments.map((a) => a.student_id)).size;
      return {
        unitKey,
        displayName,
        assessments,
        avgScorePct,
        studentCount,
      };
    }
  );
}

export function validateGaps(
  teachingAgg: UnitTeachingAggregate[],
  assessmentAgg: UnitAssessmentAggregate[]
): GapValidationResult[] {
  const teachingMap = new Map(
    teachingAgg.map((t) => [t.unitKey, t])
  );
  const assessmentMap = new Map(
    assessmentAgg.map((a) => [a.unitKey, a])
  );
  const allKeys = sortByUnitKey([
    ...new Set([...teachingMap.keys(), ...assessmentMap.keys()]),
  ]);

  return allKeys.map((unitKey) => {
    const t = teachingMap.get(unitKey);
    const a = assessmentMap.get(unitKey);
    const teachingGap = t?.dominantGap ?? "ไม่มีข้อมูลการสอน";
    const assessmentAvgPct = a?.avgScorePct ?? null;
    let verdict: GapVerdict = "aligned";

    if (assessmentAvgPct !== null) {
      if (assessmentAvgPct >= 70) {
        verdict =
          t?.dominantGap === "success" ? "aligned" : "overperformed";
      } else if (assessmentAvgPct < 50) {
        verdict = "needs_work";
      }
    }

    const displayName = t?.displayName ?? a?.displayName ?? unitKey;
    return {
      unitKey,
      displayName,
      teachingGap,
      assessmentAvgPct,
      verdict,
    };
  });
}

/** Count how many times a student appears in remedial_ids across logs for a unit */
function countRemedialForUnit(
  logs: TeachingLogRaw[],
  studentId: string
): number {
  let count = 0;
  for (const log of logs) {
    const ids = parseRemedialIds(log.remedial_ids);
    if (ids.includes(studentId)) count++;
  }
  return count;
}

/**
 * Detect student risks. Single-unit term: relax threshold (require more remedial
 * to mark high risk when only 1 unit of data).
 */
export function detectStudentRisks(
  teachingAgg: UnitTeachingAggregate[],
  assessmentAgg: UnitAssessmentAggregate[]
): StudentRiskProfile[] {
  const result: StudentRiskProfile[] = [];
  const unitCount = new Set([
    ...teachingAgg.map((t) => t.unitKey),
    ...assessmentAgg.map((a) => a.unitKey),
  ]).size;
  const isSingleUnit = unitCount <= 1;
  const highThreshold = isSingleUnit ? 3 : 2;

  for (const agg of assessmentAgg) {
    const t = teachingAgg.find((x) => x.unitKey === agg.unitKey);
    const logs = t?.logs ?? [];
    const byStudent = new Map<
      string,
      { name: string | null; score: number; total: number }
    >();
    for (const a of agg.assessments) {
      const existing = byStudent.get(a.student_id);
      if (!existing) {
        byStudent.set(a.student_id, {
          name: a.student_name,
          score: a.score,
          total: a.total_score,
        });
      } else {
        existing.score += a.score;
        existing.total += a.total_score;
      }
    }

    for (const [studentId, { name, score, total }] of byStudent) {
      const remedialCount = countRemedialForUnit(logs, studentId);
      const scorePct = total > 0 ? (score / total) * 100 : null;

      let risk: StudentRiskLevel = "low";
      if (remedialCount >= highThreshold) {
        risk = scorePct !== null && scorePct < 50 ? "high" : "medium";
      } else if (remedialCount >= 1 || (scorePct !== null && scorePct < 70)) {
        risk = remedialCount >= 1 && scorePct !== null && scorePct < 50 ? "high" : "medium";
      }

      result.push({
        studentId,
        studentName: name,
        unitKey: agg.unitKey,
        remedialCount,
        scorePct,
        risk,
      });
    }
  }
  return result;
}

export function analyzeStrategyEffectiveness(
  teachingAgg: UnitTeachingAggregate[]
): StrategyEffectivenessResult[] {
  const result: StrategyEffectivenessResult[] = [];
  for (const agg of teachingAgg) {
    const sorted = [...agg.logs].sort(
      (a, b) =>
        new Date(a.teaching_date).getTime() - new Date(b.teaching_date).getTime()
    );
    if (sorted.length < 2) continue;
    const gapBefore = sorted[0].major_gap ?? "success";
    const gapAfter = sorted[sorted.length - 1].major_gap ?? "success";
    const strategy =
      sorted[sorted.length - 1].next_strategy?.trim() ||
      agg.strategies[agg.strategies.length - 1] ||
      "—";

    let effectiveness: StrategyEffectiveness = "neutral";
    const successOrder = [
      "k-gap",
      "p-gap",
      "a-gap",
      "a2-gap",
      "system-gap",
      "success",
    ];
    const idxBefore = successOrder.indexOf(gapBefore);
    const idxAfter = successOrder.indexOf(gapAfter);
    if (idxAfter > idxBefore) effectiveness = "positive";
    else if (idxAfter < idxBefore) effectiveness = "negative";

    result.push({
      unitKey: agg.unitKey,
      strategy,
      gapBefore,
      gapAfter,
      effectiveness,
    });
  }
  return result;
}

export function buildSmartReport(
  filter: SmartReportFilter,
  logs: TeachingLogRaw[],
  assessments: UnitAssessmentRaw[]
): SmartReport {
  const unitTeaching = aggregateTeachingLogs(logs);
  const unitAssessments = aggregateAssessments(assessments);
  const gapValidations = validateGaps(unitTeaching, unitAssessments);
  const studentRisks = detectStudentRisks(unitTeaching, unitAssessments);
  const strategyEffectiveness = analyzeStrategyEffectiveness(unitTeaching);

  return {
    filter,
    unitTeaching,
    unitAssessments,
    gapValidations,
    studentRisks,
    strategyEffectiveness,
  };
}
