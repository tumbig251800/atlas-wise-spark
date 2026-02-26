/**
 * CSV Import utilities for teaching_logs
 * Supports format matching Export (Thai headers) + Google Forms multi-line headers
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
  teacher_name: string | null;
}

export interface ParseResult {
  rows: ParsedCSVRow[];
  errors: string[];
}

/**
 * Split CSV text into logical rows, respecting quoted fields that contain newlines.
 * A row is "complete" when the number of unescaped quotes seen so far is even.
 */
function splitCSVRows(text: string): string[] {
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  const rawLines = text.split(/\r?\n/);
  for (const line of rawLines) {
    if (current) {
      current += "\n" + line;
    } else {
      current = line;
    }

    // Count unescaped quotes to determine if we're still inside a quoted field
    for (const ch of line) {
      if (ch === '"') inQuotes = !inQuotes;
    }

    if (!inQuotes) {
      if (current.trim()) rows.push(current);
      current = "";
    }
  }
  // Flush any remaining content
  if (current.trim()) rows.push(current);
  return rows;
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
  date: ["วันที่สอน", "date", "teaching_date", "วันที่เรียน"],
  grade: ["ระดับชั้น", "grade", "grade_level", "คอลัมน์ 4"],
  room: ["ห้องเรียน", "room", "classroom", "ห้อง"],
  total: ["จำนวนนักเรียน", "total", "total_students", "column 19"],
  subject: ["วิชา", "subject", "วิชาที่สอน"],
  unit: ["หน่วยการเรียนรู้", "unit", "learning_unit", "หน่วยการเรียน"],
  topic: ["เรื่องที่สอน", "topic"],
  mastery: ["mastery score", "mastery", "mastery_score", "ระดับความสำเร็จ"],
  activity: ["activity mode", "activity", "activity_mode", "รูปแบบกิจกรรม"],
  keyIssue: ["key issue", "key_issue", "จุดที่นักเรียน"],
  majorGap: ["major gap", "major_gap", "gap", "สาเหตุหลัก", "gap analysis"],
  classMgmt: ["classroom management", "classroom_management", "ปัญหาพฤติกรรม", "การจัดการชั้นเรียน"],
  healthStatus: ["health care status", "health_care_status", "health care", "นักเรียนกลุ่ม health"],
  healthIds: ["health care ids", "health_care_ids", "ระบุเลขประจำตัวนักเรียนกลุ่ม health"],
  remedial: ["remedial ids", "remedial", "remedial_ids", "ซ่อมเสริม", "ติดตามพิเศษ"],
  strategy: ["next strategy", "next_strategy", "กลยุทธ์"],
  reflection: ["สะท้อนคิด", "reflection", "สะท้อนผล"],
  teacherName: ["รหัสครู", "ชื่อครู", "ชื่อ-สกุล", "teacher_name", "ผู้สอน", "รหัสครูผู้สอน"],
};

/** Convert DD/MM/YYYY or MM/DD/YYYY (with optional time) to YYYY-MM-DD for PostgreSQL */
function toISODate(s: string): string {
  const cleaned = s.replace(/\uFEFF/g, "").replace(/\r/g, "").trim();
  const datePart = cleaned.split(/\s+/)[0];
  if (!datePart) return cleaned || s;
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const m = datePart.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})$/);
  if (m) {
    const [, a, b, y] = m;
    let month: string;
    let day: string;
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    if (aNum > 12) {
      day = a;
      month = b;
    } else if (bNum > 12) {
      month = a;
      day = b;
    } else {
      month = a;
      day = b;
    }
    let yearNum = parseInt(y, 10);
    if (yearNum > 2400) yearNum -= 543;
    return `${yearNum}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const parts = datePart.split(/\D+/).filter(Boolean);
  if (parts.length === 3) {
    const [a, b, y] = parts;
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    const yNum = parseInt(y, 10);
    if (!isNaN(aNum) && !isNaN(bNum) && !isNaN(yNum) && a.length <= 2 && b.length <= 2 && y.length === 4) {
      let month: string;
      let day: string;
      if (aNum > 12) {
        day = a.padStart(2, "0");
        month = b.padStart(2, "0");
      } else if (bNum > 12) {
        month = a.padStart(2, "0");
        day = b.padStart(2, "0");
      } else {
        month = a.padStart(2, "0");
        day = b.padStart(2, "0");
      }
      const yearNum = yNum > 2400 ? yNum - 543 : yNum;
      return `${yearNum}-${month}-${day}`;
    }
  }
  return datePart;
}

/** Safety: ให้แน่ใจว่าค่าวันที่เป็น YYYY-MM-DD ก่อนส่งไป insert */
export function ensureISODate(s: string): string {
  if (!s) return s;
  const t = s.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  return toISODate(s);
}

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

/** Detect if a CSV field value looks like a date/timestamp (data row indicator) */
const DATE_PATTERN = /^\d{1,2}\/\d{1,2}\/\d{4}|^\d{4}-\d{2}-\d{2}/;

/**
 * Find the first data row index and the header row index.
 * For Google Forms CSVs, the header is a single logical row (possibly multi-line quoted)
 * followed by data rows starting with a timestamp/date.
 * For standard CSVs, header is row 0 and data starts at row 1.
 */
function findDataStart(rows: string[]): { headerIdx: number; dataStartIdx: number } {
  for (let i = 1; i < rows.length; i++) {
    const firstField = parseCSVLine(rows[i])[0]?.trim().replace(/^"/, "") || "";
    if (DATE_PATTERN.test(firstField)) {
      return { headerIdx: i - 1, dataStartIdx: i };
    }
  }
  // Fallback: standard CSV
  return { headerIdx: 0, dataStartIdx: 1 };
}

export function parseCSVFile(text: string): ParseResult {
  const errors: string[] = [];
  const rows = splitCSVRows(text);
  if (rows.length < 2) {
    return { rows: [], errors: ["ไฟล์ว่างหรือมีเฉพาะหัวคอลัมน์"] };
  }

  const { headerIdx, dataStartIdx } = findDataStart(rows);
  const headerCols = parseCSVLine(rows[headerIdx]);
  const colMap = buildColumnMap(headerCols);

  const parsed: ParsedCSVRow[] = [];
  for (let i = dataStartIdx; i < rows.length; i++) {
    const cols = parseCSVLine(rows[i]);
    if (cols.length < 5) continue;

    const get = (key: string) => {
      const j = colMap[key] ?? -1;
      return (j >= 0 && cols[j] !== undefined ? String(cols[j]).trim() : "") || "";
    };

    const teaching_date = toISODate(get("date"));
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
    const mastery_score = Math.min(5, Math.max(1, parseInt(masteryStr, 10) || 1));

    let major_gap = "success" as (typeof MAJOR_GAP_VALUES)[number];
    const gapStr = get("majorGap").toLowerCase().replace(/\s/g, "");
    if (gapStr.includes("a2-gap") || gapStr.includes("a2gap")) major_gap = "a2-gap";
    else if (gapStr.includes("k-gap") || gapStr.includes("kgap") || gapStr.includes("ความรู้") || gapStr === "k") major_gap = "k-gap";
    else if (gapStr.includes("p-gap") || gapStr.includes("pgap") || gapStr.includes("ทักษะ") || gapStr === "p") major_gap = "p-gap";
    else if (gapStr.includes("a-gap") || gapStr.includes("agap") || gapStr.includes("เจตคติ") || gapStr === "a") major_gap = "a-gap";
    else if (gapStr.includes("system") || gapStr.includes("ระบบ")) major_gap = "system-gap";

    let activity_mode = "active" as (typeof ACTIVITY_MODE_VALUES)[number];
    const actStr = get("activity").toLowerCase();
    if (actStr.includes("passive") || actStr.includes("รับสาร") || actStr.includes("ฟังครู")) {
      activity_mode = "passive";
    } else if (actStr.includes("constructive") || actStr.includes("วิเคราะห์") || actStr.includes("สร้างสรรค์")) {
      activity_mode = "constructive";
    } else if (actStr.includes("active") || actStr.includes("ลงมือทำ") || actStr.includes("ฝึกฝน")) {
      activity_mode = "active";
    }

    const healthStatusStr = get("healthStatus").toLowerCase();
    const health_care_status = healthStatusStr.includes("มี") || healthStatusStr === "true" || healthStatusStr === "yes" || healthStatusStr === "1";

    let health_care_ids: string | null = get("healthIds").trim() || null;
    if (health_care_ids === "[None]" || health_care_ids === "[N/A]") health_care_ids = null;

    let remedial_ids = get("remedial").trim();
    if (remedial_ids === "[None]" || remedial_ids === "[N/A]" || remedial_ids === "-") remedial_ids = "";

    parsed.push({
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
      teacher_name: get("teacherName") || null,
    });
  }

  return { rows: parsed, errors };
}
