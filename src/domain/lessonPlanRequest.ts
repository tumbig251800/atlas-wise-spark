import type { LessonPlanConfig } from "@/components/lesson-plan/LessonPlanForm";

/** Labels for snapshot equipment keys (domain — used when building Edge payload). */
export const LESSON_PLAN_EQUIPMENT_LABELS: Record<string, string> = {
  whiteboard: "กระดานไว / กระดานดำ",
  projector: "โปรเจกเตอร์ / จอแสดงผล",
  manipulatives: "สื่อสัมผัส (แท่ง เศษส่วน ฯลฯ)",
  computers: "คอมพิวเตอร์ / ห้องคอม",
  tablets: "แท็บเล็ต",
  limited: "อุปกรณ์จำกัด / ไม่มีห้องพิเศษ",
};

export type ReflectionLogRow = {
  major_gap: string;
  mastery_score: number;
  remedial_ids: string | null;
  health_care_ids: string | null;
  topic: string | null;
};

export function buildReflectionContextFromLogs(recentLogs: ReflectionLogRow[]): string {
  if (!recentLogs.length) {
    return "ไม่มีข้อมูลคาบก่อนหน้า";
  }
  const gapCounts: Record<string, number> = {};
  const specialIds = new Set<string>();
  let masterySum = 0;

  recentLogs.forEach((log) => {
    gapCounts[log.major_gap] = (gapCounts[log.major_gap] || 0) + 1;
    masterySum += log.mastery_score;
    if (log.remedial_ids) {
      log.remedial_ids.split(",").forEach((id) => specialIds.add(id.trim()));
    }
    if (log.health_care_ids) {
      log.health_care_ids.split(",").forEach((id) => specialIds.add(id.trim()));
    }
  });

  const sortedGaps = Object.entries(gapCounts).sort((a, b) => b[1] - a[1]);
  const dominantGap = sortedGaps[0] ?? ["ไม่ระบุ", 0];
  const avgMastery = (masterySum / recentLogs.length).toFixed(1);

  return `จาก ${recentLogs.length} คาบล่าสุด:
- Gap หลัก: ${dominantGap[0]} (${dominantGap[1]} ครั้ง)
- Mastery เฉลี่ย: ${avgMastery}%
- Gap Distribution: ${JSON.stringify(gapCounts)}
- Special Care IDs: ${specialIds.size > 0 ? [...specialIds].join(", ") : "ไม่มี"}
- หัวข้อล่าสุด: ${recentLogs.map((l) => l.topic).filter(Boolean).join(", ")}`;
}

export function buildSnapshotPayload(config: LessonPlanConfig): Record<string, unknown> {
  const levels: string[] = [];
  if (config.snapshotStrong) levels.push("กลุ่มเด็กเรียนดี/เก่ง");
  if (config.snapshotWeak) levels.push("กลุ่มเด็กที่ต้องเสริม/อ่อน");
  if (config.snapshotBalanced) levels.push("กลุ่มเด็กระดับปานกลาง");

  const equipmentSelected = Object.entries(config.snapshotEquipment)
    .filter(([, v]) => v)
    .map(([k]) => LESSON_PLAN_EQUIPMENT_LABELS[k] ?? k);

  const out: Record<string, unknown> = {
    student_levels: levels,
    equipment_available: equipmentSelected,
  };

  if (config.snapshotClassNotes.trim()) {
    out.class_profile = config.snapshotClassNotes.trim();
  }
  if (config.snapshotFocusNotes.trim()) {
    out.focus = config.snapshotFocusNotes.trim();
  }

  return out;
}

export function buildLessonPlanRequestBody(config: LessonPlanConfig, reflectionContext: string) {
  const base = {
    version: 2 as const,
    planType: config.planType,
    gradeLevel: config.gradeLevel,
    classroom: config.classroom,
    subject: config.subject,
    learningUnit: config.learningUnit,
    hours: config.hours,
    topic: config.topic,
    includeWorksheets: config.includeWorksheets,
  };

  if (config.generationMode === "reflection") {
    return {
      ...base,
      mode: "reflection" as const,
      context: reflectionContext,
    };
  }

  const snapshot = buildSnapshotPayload(config);
  const contextParts: string[] = [];
  if (config.snapshotClassNotes.trim()) {
    contextParts.push(`สภาพห้องและนักเรียน:\n${config.snapshotClassNotes.trim()}`);
  }
  if (config.snapshotFocusNotes.trim()) {
    contextParts.push(`จุดเน้น/ข้อจำกัด:\n${config.snapshotFocusNotes.trim()}`);
  }
  const contextCombined = contextParts.join("\n\n");

  return {
    ...base,
    mode: "context_snapshot" as const,
    context: contextCombined,
    snapshot,
  };
}
