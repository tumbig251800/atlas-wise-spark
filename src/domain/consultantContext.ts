/** Pure helpers for Consultant AI context (citation, QWR metrics, guard rules). */

export type ConsultantLogRow = {
  teaching_date: string;
  subject: string;
  grade_level: string;
  classroom: string | number;
  topic?: string;
  mastery_score: number;
  major_gap: string;
  key_issue?: string;
  next_strategy?: string;
  remedial_ids?: string;
  health_care_ids?: string | null;
  total_students?: number;
};

function mean(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

/** Align with Dashboard QWRTrendChart: baseline = first 20% sessions, current = last 20% (logs ordered by teaching_date asc). */
export function buildQwrMetricsBlock(logs: { mastery_score: number }[]): string {
  if (logs.length < 5) {
    return `\n\n## [QWR METRICS]\nข้อมูลยังไม่เพียงพอ (ต้องมีอย่างน้อย 5 คาบ)`;
  }

  const n = logs.length;
  const baselineSlice = logs.slice(0, Math.ceil(n * 0.2));
  const currentSlice = logs.slice(Math.floor(n * 0.8));

  const baselineAvg = mean(baselineSlice.map((l) => l.mastery_score));
  const currentAvg = mean(currentSlice.map((l) => l.mastery_score));
  const velocity = currentAvg - baselineAvg;
  const velocityPct = ((velocity / 5) * 100).toFixed(1);

  return `\n\n## [QWR METRICS]\nGrowth Velocity: ${velocityPct}%\nBaseline Avg: ${baselineAvg.toFixed(2)}\nCurrent Avg: ${currentAvg.toFixed(2)}\nจำนวนคาบ: ${n}\n\n[STRICT]\n- หากกล่าวถึง Growth Velocity / Baseline / Current ต้องอ้างอิงจากบล็อก [QWR METRICS] นี้เท่านั้น\n- ห้ามสร้างตัวเลข QWR เองเด็ดขาด`;
}

export function buildContextWithCitation(logs: ConsultantLogRow[]): string {
  if (logs.length === 0) return "ไม่พบข้อมูลการสอนที่ตรงกับเงื่อนไข";

  const slice = logs.slice(-20);
  const sessionDetails = slice
    .map((l, index) => {
      const refId = `[REF-${index + 1}]`;
      const remedialCount = (l.remedial_ids || "")
        .split(",")
        .filter((x) => x.trim() && x !== "[None]" && x !== "[N/A]").length;
      return `${refId} วันที่: ${l.teaching_date} | วิชา: ${l.subject} | ห้อง: ${l.grade_level}/${l.classroom} | หัวข้อ: ${l.topic || "ไม่ระบุ"} | Mastery: ${l.mastery_score}/5 | Gap: ${l.major_gap} | Remedial: ${remedialCount}/${l.total_students || 0} | Strategy: ${l.next_strategy || "ไม่ระบุ"} | Issue: ${l.key_issue || "ไม่ระบุ"}`;
    })
    .join("\n");

  const avgMastery = (logs.reduce((s, l) => s + l.mastery_score, 0) / logs.length).toFixed(1);

  const refList = slice.map((_, i) => `[REF-${i + 1}]`).join(", ");
  const extractedRemedialIds = [
    ...new Set(
      logs
        .flatMap((l) => (l.remedial_ids || "").split(","))
        .map((s) => s.trim())
        .filter((s) => s && s !== "[None]" && s !== "[N/A]")
    ),
  ];
  const extractedHealthCareIds = [
    ...new Set(
      logs
        .flatMap((l) => (l.health_care_ids || "").split(","))
        .map((s) => s.trim())
        .filter((s) => s && s !== "[None]" && s !== "[N/A]")
    ),
  ];
  const hasTotalStudents = slice.some((l) => (l.total_students ?? 0) > 0);
  const hasRemedialIds = extractedRemedialIds.length > 0;
  const hasHealthCareIds = extractedHealthCareIds.length > 0;

  const guardNote = `\n\n[GUARD RULES — enforce ทุกคำตอบ]\n- REF ที่ถูกต้องในการสนทนานี้: ${refList} (ใช้ได้เฉพาะรายการนี้เท่านั้น)\n- ห้ามสร้าง REF รูปแบบอื่น เช่น [REF-19ก.พ.] หรือ [REF-ชื่อเรื่อง]\n- Special Care IDs ที่พบใน context: ${hasHealthCareIds ? extractedHealthCareIds.join(", ") : "ไม่มี"}\n- Remedial IDs ที่พบใน context: ${hasRemedialIds ? extractedRemedialIds.join(", ") : "ไม่มี"}\n- total_students ใน context: ${hasTotalStudents ? "มี" : "ไม่มี — ห้ามสร้างตัวเลข X/Y หรือ %"}\n- ห้ามสร้าง student ID ขึ้นเองเด็ดขาด ถ้าไม่มี ID ใน context ให้ตอบว่า "ไม่พบรหัสนักเรียนในข้อมูล"`;

  return `## ข้อมูลการสอนที่กรองแล้ว (${logs.length} คาบ)
Mastery เฉลี่ย: ${avgMastery}/5

### รายละเอียด (ใช้ [REF-X] อ้างอิงเสมอ):
${sessionDetails}${guardNote}`;
}
