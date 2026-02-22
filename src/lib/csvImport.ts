/**
 * CSV Import utilities for teaching_logs
 * Supports format matching Export (Thai headers) + optional columns
 */
import { cleanClassroomData } from "./utils";

const MAJOR_GAP_VALUES = ["k-gap", "p-gap", "a-gap", "a2-gap", "system-gap", "success"] as const;
const ACTIVITY_MODE_VALUES = ["active", "passive", "constructive"] as const;

export interface ParsedCSVRow {
  teaching_date: string;
  grade_level: string;
  classroom: string;
  total_students: number | null;
  subject: string;
  learning_unit: string | null;
  topic: string | null;
  mastery_score: number;
  activity_mode: "active" | "passive" | "constructive";
  key_issue: string | null;
  major_gap: "k-gap" | "p-gap" | "a-gap" | "a2-gap" | "system-gap" | "success";
  classroom_management: string | null;
  health_care_status: boolean;
  health_care_ids: string | null;
  remedial_ids: string | null;
  next_strategy: string | null;
  reflection: string | null;
}

export interface ParseResult {
  rows: ParsedCSVRow[];
  errors: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (inQuotes) current += c;
    else if (c === ",") {
      result.push(current.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
      current = "";
    } else current += c;
  }
  result.push(current.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
  return result;
}

const EXPORT_ORDER: Record<string, number> = {
  date: 0,
  grade: 1,
  room: 2,
  total: 3,
  subject: 4,
  unit: 5,
  topic: 6,
  mastery: 7,
  activity: 8,
  keyIssue: 9,
  majorGap: 10,
  classMgmt: 11,
  healthStatus: 12,
  healthIds: 13,
  remedial: 14,
  strategy: 15,
  reflection: 16,
};

const HEADER_MAP: Record<string, string[]> = {
  date: ["วันที่สอน", "date", "teaching_date"],
  grade: ["ระดับชั้น", "grade", "grade_level"],
  room: ["ห้องเรียน", "room", "classroom", "ห้อง"],
  total: ["จำนวนนักเรียน", "total", "total_students"],
  subject: ["วิชา", "subject"],
  unit: ["หน่วยการเรียนรู้", "unit", "learning_unit"],
  topic: ["เรื่องที่สอน", "topic"],
  mastery: ["mastery score", "mastery", "mastery_score"],
  activity: ["activity mode", "activity", "activity_mode"],
  keyIssue: ["key issue", "key_issue"],
  majorGap: ["major gap", "major_gap", "gap"],
  classMgmt: ["classroom management", "classroom_management"],
  healthStatus: ["health care status", "health_care_status"],
  healthIds: ["health care ids", "health_care_ids"],
  remedial: ["remedial ids", "remedial", "remedial_ids"],
  strategy: ["next strategy", "next_strategy"],
  reflection: ["สะท้อนคิด", "reflection"],
};

function buildColumnMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = { ...EXPORT_ORDER };
  for (const [key, candidates] of Object.entries(HEADER_MAP)) {
    for (const c of candidates) {
      const i = headers.findIndex((h) => h.trim().toLowerCase().includes(c.toLowerCase()));
      if (i >= 0) {
        map[key] = i;
        break;
      }
    }
  }
  return map;
}

export function parseCSVFile(text: string): ParseResult {
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { rows: [], errors: ["ไฟล์ว่างหรือมีเฉพาะหัวคอลัมน์"] };
  }

  const headerCols = parseCSVLine(lines[0]);
  const colMap = buildColumnMap(headerCols);
  const startRow = 1;

  const rows: ParsedCSVRow[] = [];
  for (let i = startRow; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;

    const get = (key: string) => {
      const j = colMap[key] ?? -1;
      return (j >= 0 && cols[j] !== undefined ? String(cols[j]).trim() : "") || "";
    };

    const teaching_date = get("date");
    const grade_level = get("grade");
    const roomRaw = get("room");
    const classroom = cleanClassroomData(roomRaw) || roomRaw || "";
    const subject = get("subject");

    if (!teaching_date || !grade_level || !classroom || !subject) {
      errors.push(`แถว ${i + 1}: ขาดข้อมูลจำเป็น (วันที่ ระดับชั้น ห้อง วิชา)`);
      continue;
    }

    const totalStr = get("total");
    let total_students: number | null = null;
    if (totalStr && totalStr !== "[N/A]" && totalStr !== "-") {
      const n = parseInt(totalStr.replace(/[^\d]/g, ""), 10);
      if (!isNaN(n) && n >= 0) total_students = n;
    }

    const masteryStr = get("mastery");
    const mastery_score = Math.min(5, Math.max(0, parseInt(masteryStr, 10) || 0));

    let major_gap = "success" as (typeof MAJOR_GAP_VALUES)[number];
    const gapStr = get("majorGap").toLowerCase().replace(/\s/g, "");
    if (gapStr.includes("a2-gap")) major_gap = "a2-gap";
    else if (gapStr.includes("k-gap") || gapStr === "k") major_gap = "k-gap";
    else if (gapStr.includes("p-gap") || gapStr === "p") major_gap = "p-gap";
    else if (gapStr.includes("a-gap") || gapStr === "a") major_gap = "a-gap";
    else if (gapStr.includes("system")) major_gap = "system-gap";

    let activity_mode = "active" as (typeof ACTIVITY_MODE_VALUES)[number];
    const actStr = get("activity").toLowerCase();
    if (ACTIVITY_MODE_VALUES.some((a) => actStr.includes(a))) {
      activity_mode = ACTIVITY_MODE_VALUES.find((a) => actStr.includes(a)) ?? "active";
    }

    const healthStatusStr = get("healthStatus").toLowerCase();
    const health_care_status = healthStatusStr.includes("มี") || healthStatusStr === "true" || healthStatusStr === "yes" || healthStatusStr === "1";

    let health_care_ids: string | null = get("healthIds").trim() || null;
    if (health_care_ids === "[None]" || health_care_ids === "[N/A]") health_care_ids = null;

    let remedial_ids = get("remedial").trim();
    if (remedial_ids === "[None]" || remedial_ids === "[N/A]") remedial_ids = "";

    rows.push({
      teaching_date,
      grade_level,
      classroom,
      total_students,
      subject,
      learning_unit: get("unit") || null,
      topic: get("topic") || null,
      mastery_score,
      activity_mode,
      key_issue: get("keyIssue") || null,
      major_gap,
      classroom_management: get("classMgmt") || null,
      health_care_status,
      health_care_ids,
      remedial_ids: remedial_ids || null,
      next_strategy: get("strategy") || null,
      reflection: get("reflection") || null,
    });
  }

  return { rows, errors };
}
