/**
 * CSV Import utilities for unit_assessments
 * Format: Student_ID, Score, Total, Subject, Grade, Classroom, Term, Unit, Date
 * Headers are flexible (Thai/English) — order detected automatically
 */

export interface ParsedAssessmentRow {
  student_id: string;
  score: number;
  total_score: number;
  subject: string;
  grade_level: string;
  classroom: string;
  academic_term: string | null;
  unit_name: string | null;
  assessed_date: string | null;
}

export interface AssessmentParseResult {
  rows: ParsedAssessmentRow[];
  errors: string[];
}

const ASSESSMENT_HEADER_MAP: Record<string, string[]> = {
  student_id: ["student_id", "รหัสนักเรียน", "เลขที่", "id นักเรียน", "student id", "เลขประจำตัว"],
  score: ["score", "คะแนน", "คะแนนที่ได้", "raw score", "คะแนนสอบ"],
  total_score: ["total", "total_score", "คะแนนเต็ม", "full score", "max score", "คะแนนรวม"],
  subject: ["subject", "วิชา", "วิชาที่สอน"],
  grade_level: ["grade", "grade_level", "ระดับชั้น", "ชั้น"],
  classroom: ["classroom", "room", "ห้องเรียน", "ห้อง"],
  academic_term: ["term", "academic_term", "ปีการศึกษา", "เทอม", "semester"],
  unit_name: ["unit", "unit_name", "หน่วยการเรียนรู้", "หน่วย", "learning_unit"],
  assessed_date: ["date", "assessed_date", "วันที่สอบ", "วันที่ประเมิน", "test_date"],
};

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

function toISODate(s: string): string | null {
  if (!s) return null;
  const cleaned = s.replace(/\uFEFF/g, "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const m = cleaned.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})$/);
  if (m) {
    const [, a, b, y] = m;
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    let day: string, month: string;
    if (aNum > 12) { day = a; month = b; }
    else if (bNum > 12) { month = a; day = b; }
    else { day = a; month = b; } // Thai: DD/MM/YYYY
    let yearNum = parseInt(y, 10);
    if (yearNum > 2400) yearNum -= 543;
    return `${yearNum}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
}

function buildColMap(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const [key, candidates] of Object.entries(ASSESSMENT_HEADER_MAP)) {
    for (const c of candidates) {
      const i = headers.findIndex((h) =>
        h.trim().toLowerCase().includes(c.toLowerCase())
      );
      if (i >= 0) { map[key] = i; break; }
    }
  }
  return map;
}

export function parseAssessmentCSV(text: string): AssessmentParseResult {
  const BOM = "\uFEFF";
  const cleaned = text.replace(BOM, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    return { rows: [], errors: ["ไฟล์ว่างหรือมีเฉพาะหัวคอลัมน์"] };
  }

  const headers = parseCSVLine(lines[0]);
  const colMap = buildColMap(headers);

  // Require at minimum: student_id and score
  if (colMap["student_id"] === undefined || colMap["score"] === undefined) {
    return {
      rows: [],
      errors: [
        "ไม่พบคอลัมน์ที่จำเป็น: ต้องมี 'รหัสนักเรียน' และ 'คะแนน' ในหัวคอลัมน์",
      ],
    };
  }

  const rows: ParsedAssessmentRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 2) continue;

    const get = (key: string) => {
      const j = colMap[key] ?? -1;
      return j >= 0 && cols[j] !== undefined ? String(cols[j]).trim() : "";
    };

    const student_id = get("student_id");
    const scoreStr = get("score");
    const totalStr = get("total_score");
    const subject = get("subject");
    const grade_level = get("grade_level");
    const classroom = get("classroom");

    if (!student_id || !scoreStr) {
      errors.push(`แถว ${i + 1}: ขาดรหัสนักเรียนหรือคะแนน`);
      continue;
    }

    const score = parseFloat(scoreStr.replace(/[^\d.]/g, ""));
    if (isNaN(score)) {
      errors.push(`แถว ${i + 1}: คะแนน "${scoreStr}" ไม่ใช่ตัวเลข`);
      continue;
    }

    const total_score = totalStr
      ? parseFloat(totalStr.replace(/[^\d.]/g, "")) || 10
      : 10;

    rows.push({
      student_id,
      score,
      total_score,
      subject: subject || "",
      grade_level: grade_level || "",
      classroom: classroom || "",
      academic_term: get("academic_term") || null,
      unit_name: get("unit_name") || null,
      assessed_date: toISODate(get("assessed_date")),
    });
  }

  return { rows, errors };
}
