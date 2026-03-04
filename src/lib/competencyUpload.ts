/**
 * Phase D Stage 2: Parse and upsert All-in-One competency template (CSV/XLSX)
 * Uses COMPETENCY_TEMPLATE_HEADERS. Partial update; auth and date fallback.
 */
import * as XLSX from "xlsx";
import { COMPETENCY_TEMPLATE_HEADERS } from "@/lib/competencyTemplate";
import { supabase } from "@/lib/atlasSupabase";

const db = supabase as any;

export interface ParsedAllInOneRow {
  student_id: string;
  student_name: string;
  subject: string;
  unit_name: string;
  grade_level: string;
  classroom: string;
  academic_term: string;
  score: string | number;
  total_score: string | number;
  assessed_date: string;
  a1_score: string | number;
  a2_score: string | number;
  a3_score: string | number;
  a4_score: string | number;
  a5_score: string | number;
  a6_score: string | number;
  competency_assessed_date: string;
  competency_note: string;
}

export interface AllInOneParseResult {
  rows: ParsedAllInOneRow[];
  errors: string[];
}

export interface UpsertResult {
  created: number;
  updated: number;
  errors: string[];
}

function toNum(v: string | number): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

function toISODate(s: string): string | null {
  if (!s || typeof s !== "string") return null;
  const cleaned = String(s).replace(/\uFEFF/g, "").trim();
  if (!cleaned) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  const m = cleaned.match(/^(\d{1,2})\D(\d{1,2})\D(\d{4})$/);
  if (m) {
    const [, a, b, y] = m;
    const aNum = parseInt(a, 10);
    const bNum = parseInt(b, 10);
    let day: string, month: string;
    if (aNum > 12) {
      day = a;
      month = b;
    } else if (bNum > 12) {
      month = a;
      day = b;
    } else {
      day = a;
      month = b;
    }
    let yearNum = parseInt(y, 10);
    if (yearNum > 2400) yearNum -= 543;
    return `${yearNum}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return null;
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

/** Parse CSV text using COMPETENCY_TEMPLATE_HEADERS. */
export function parseAllInOneCSV(text: string): AllInOneParseResult {
  const BOM = "\uFEFF";
  const cleaned = text.replace(BOM, "");
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  const rows: ParsedAllInOneRow[] = [];

  if (lines.length < 2) {
    return { rows: [], errors: ["ไฟล์ว่างหรือมีเฉพาะหัวคอลัมน์"] };
  }

  const headerLine = parseCSVLine(lines[0]);
  const colIndex = new Map<string, number>();
  COMPETENCY_TEMPLATE_HEADERS.forEach((h, i) => {
    const idx = headerLine.findIndex((cell) => cell.trim().toLowerCase() === h.toLowerCase());
    if (idx >= 0) colIndex.set(h, idx);
  });

  const get = (cols: string[], key: string): string =>
    (colIndex.get(key) !== undefined ? cols[colIndex.get(key)!] : "").trim();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const student_id = get(cols, "student_id");
    const unit_name = get(cols, "unit_name");
    if (!student_id && !unit_name) continue; // skip empty row
    if (!student_id) {
      errors.push(`แถว ${i + 1}: ไม่มีรหัสนักเรียน`);
      continue;
    }
    if (!unit_name) {
      errors.push(`แถว ${i + 1}: ไม่มีหน่วยการเรียนรู้`);
      continue;
    }

    rows.push({
      student_id,
      student_name: get(cols, "student_name"),
      subject: get(cols, "subject"),
      unit_name,
      grade_level: get(cols, "grade_level"),
      classroom: get(cols, "classroom"),
      academic_term: get(cols, "academic_term"),
      score: get(cols, "score") || "",
      total_score: get(cols, "total_score") || "",
      assessed_date: get(cols, "assessed_date"),
      a1_score: get(cols, "a1_score") || "",
      a2_score: get(cols, "a2_score") || "",
      a3_score: get(cols, "a3_score") || "",
      a4_score: get(cols, "a4_score") || "",
      a5_score: get(cols, "a5_score") || "",
      a6_score: get(cols, "a6_score") || "",
      competency_assessed_date: get(cols, "competency_assessed_date"),
      competency_note: get(cols, "competency_note"),
    });
  }

  return { rows, errors };
}

/** Parse XLSX file (first sheet) using COMPETENCY_TEMPLATE_HEADERS. */
export function parseAllInOneXLSX(file: File): Promise<AllInOneParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = reader.result;
        const wb = XLSX.read(data, { type: "array" });
        const first = wb.SheetNames[0];
        if (!first) {
          resolve({ rows: [], errors: ["ไม่มีชีตในไฟล์"] });
          return;
        }
        const ws = wb.Sheets[first];
        const json = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
        if (!json.length) {
          resolve({ rows: [], errors: ["ไฟล์ว่าง"] });
          return;
        }
        const headerRow = (json[0] || []).map((c) => String(c).trim());
        const colIndex = new Map<string, number>();
        COMPETENCY_TEMPLATE_HEADERS.forEach((h) => {
          const idx = headerRow.findIndex((cell) => cell.toLowerCase() === h.toLowerCase());
          if (idx >= 0) colIndex.set(h, idx);
        });

        const errors: string[] = [];
        const rows: ParsedAllInOneRow[] = [];
        const get = (row: string[], key: string): string =>
          (colIndex.get(key) !== undefined ? row[colIndex.get(key)!] : "").trim();

        for (let i = 1; i < json.length; i++) {
          const row = (json[i] || []).map((c) => (c != null ? String(c).trim() : ""));
          const student_id = get(row, "student_id");
          const unit_name = get(row, "unit_name");
          if (!student_id && !unit_name) continue;
          if (!student_id) {
            errors.push(`แถว ${i + 1}: ไม่มีรหัสนักเรียน`);
            continue;
          }
          if (!unit_name) {
            errors.push(`แถว ${i + 1}: ไม่มีหน่วยการเรียนรู้`);
            continue;
          }
          rows.push({
            student_id,
            student_name: get(row, "student_name"),
            subject: get(row, "subject"),
            unit_name,
            grade_level: get(row, "grade_level"),
            classroom: get(row, "classroom"),
            academic_term: get(row, "academic_term"),
            score: get(row, "score") || "",
            total_score: get(row, "total_score") || "",
            assessed_date: get(row, "assessed_date"),
            a1_score: get(row, "a1_score") || "",
            a2_score: get(row, "a2_score") || "",
            a3_score: get(row, "a3_score") || "",
            a4_score: get(row, "a4_score") || "",
            a5_score: get(row, "a5_score") || "",
            a6_score: get(row, "a6_score") || "",
            competency_assessed_date: get(row, "competency_assessed_date"),
            competency_note: get(row, "competency_note"),
          });
        }
        resolve({ rows, errors });
      } catch (e) {
        resolve({ rows: [], errors: [e instanceof Error ? e.message : "อ่านไฟล์ไม่สำเร็จ"] });
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

/** Validate row: score 0-10 (or 0 to total_score), a1-a6 in 1-4. Returns first error or null. */
export function validateAllInOneRow(row: ParsedAllInOneRow, rowIndex: number): string | null {
  const total = toNum(row.total_score) ?? 10;
  const score = toNum(row.score);
  if (score !== null) {
    if (score < 0 || score > 10) return `แถว ${rowIndex + 1}: คะแนนวิชาต้องอยู่ระหว่าง 0-10`;
    if (total < 0 || total > 100) return `แถว ${rowIndex + 1}: คะแนนเต็มต้องอยู่ระหว่าง 0-100`;
    if (score > total) return `แถว ${rowIndex + 1}: คะแนนต้องไม่เกินคะแนนเต็ม`;
  }
  const compKeys = ["a1_score", "a2_score", "a3_score", "a4_score", "a5_score", "a6_score"] as const;
  for (const k of compKeys) {
    const v = toNum(row[k]);
    if (v !== null && (v < 1 || v > 4 || Math.floor(v) !== v)) {
      return `แถว ${rowIndex + 1}: ${k} ต้องเป็นจำนวนเต็ม 1-4`;
    }
  }
  return null;
}

/** Resolve competency_assessed_date: file value, else assessed_date, else today. */
function resolveCompetencyDate(row: ParsedAllInOneRow): string | null {
  const d = toISODate(row.competency_assessed_date) || toISODate(row.assessed_date);
  return d || new Date().toISOString().slice(0, 10);
}

/** Upsert one row: match by teacher_id, student_id, subject, grade_level, classroom, academic_term, unit_name. Partial update. */
export async function upsertAllInOne(
  rows: ParsedAllInOneRow[],
  teacherId: string
): Promise<UpsertResult> {
  const result: UpsertResult = { created: 0, updated: 0, errors: [] };
  const today = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const err = validateAllInOneRow(row, i);
    if (err) {
      result.errors.push(err);
      continue;
    }

    const subject = row.subject || "";
    const grade_level = row.grade_level || "";
    const classroom = row.classroom || "";
    const academic_term = row.academic_term || "";

    try {
      const { data: existing, error: findErr } = await db
        .from("unit_assessments")
        .select("id, student_name, score, total_score, assessed_date, a1_score, a2_score, a3_score, a4_score, a5_score, a6_score, competency_note, competency_assessed_date")
        .eq("teacher_id", teacherId)
        .eq("student_id", row.student_id)
        .eq("subject", subject)
        .eq("grade_level", grade_level)
        .eq("classroom", classroom)
        .eq("academic_term", academic_term)
        .eq("unit_name", row.unit_name)
        .maybeSingle();

      if (findErr) {
        result.errors.push(`แถว ${i + 1} (${row.student_id}): ${findErr.message}`);
        continue;
      }

      const competencyDate = resolveCompetencyDate(row);

      if (existing) {
        const upd: Record<string, unknown> = {
          assessed_by: teacherId,
          competency_assessed_date: competencyDate,
        };
        if (row.student_name !== "") upd.student_name = row.student_name;
        const scoreNum = toNum(row.score);
        if (scoreNum !== null) upd.score = scoreNum;
        const totalNum = toNum(row.total_score);
        if (totalNum !== null) upd.total_score = totalNum;
        const ad = toISODate(row.assessed_date);
        if (ad) upd.assessed_date = ad;
        for (const k of ["a1_score", "a2_score", "a3_score", "a4_score", "a5_score", "a6_score"] as const) {
          const v = toNum(row[k]);
          if (v !== null && v >= 1 && v <= 4) upd[k] = v;
        }
        if (row.competency_note !== "") upd.competency_note = row.competency_note;

        const { error: updateErr } = await db.from("unit_assessments").update(upd).eq("id", existing.id);
        if (updateErr) {
          result.errors.push(`แถว ${i + 1} (${row.student_id}): ${updateErr.message}`);
        } else {
          result.updated++;
        }
      } else {
        const scoreNum = toNum(row.score);
        const totalNum = toNum(row.total_score);
        const insertPayload = {
          teacher_id: teacherId,
          assessed_by: teacherId,
          student_id: row.student_id,
          student_name: row.student_name || null,
          subject,
          grade_level,
          classroom,
          academic_term: academic_term || null,
          unit_name: row.unit_name,
          score: scoreNum ?? 0,
          total_score: totalNum ?? 10,
          assessed_date: toISODate(row.assessed_date) || null,
          competency_assessed_date: competencyDate,
          competency_note: row.competency_note || null,
        };
        const a1 = toNum(row.a1_score);
        const a2 = toNum(row.a2_score);
        const a3 = toNum(row.a3_score);
        const a4 = toNum(row.a4_score);
        const a5 = toNum(row.a5_score);
        const a6 = toNum(row.a6_score);
        if (a1 !== null && a1 >= 1 && a1 <= 4) (insertPayload as any).a1_score = a1;
        if (a2 !== null && a2 >= 1 && a2 <= 4) (insertPayload as any).a2_score = a2;
        if (a3 !== null && a3 >= 1 && a3 <= 4) (insertPayload as any).a3_score = a3;
        if (a4 !== null && a4 >= 1 && a4 <= 4) (insertPayload as any).a4_score = a4;
        if (a5 !== null && a5 >= 1 && a5 <= 4) (insertPayload as any).a5_score = a5;
        if (a6 !== null && a6 >= 1 && a6 <= 4) (insertPayload as any).a6_score = a6;

        const { error: insertErr } = await db.from("unit_assessments").insert(insertPayload);
        if (insertErr) {
          result.errors.push(`แถว ${i + 1} (${row.student_id}): ${insertErr.message}`);
        } else {
          result.created++;
        }
      }
    } catch (e) {
      result.errors.push(`แถว ${i + 1}: ${e instanceof Error ? e.message : "ข้อผิดพลาดไม่ทราบสาเหตุ"}`);
    }
  }

  return result;
}
