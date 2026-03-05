/**
 * Phase D Stage 2 + 2026: Parse and upsert All-in-One competency template (CSV/XLSX)
 * Uses 8 capabilities (หลักสูตร 2569). Partial update; auth and date fallback.
 */
import * as XLSX from "xlsx";
import { COMPETENCY_TEMPLATE_HEADERS } from "@/lib/competencyTemplate";
import { CAPABILITY_KEYS_2026 } from "@/lib/capabilityConstants2026";
import { supabase } from "@/lib/atlasSupabase";

const db = supabase as any;

const CAP_COLS = CAPABILITY_KEYS_2026.map((k) => `${k}_score`);

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
  reading_score: string | number;
  writing_score: string | number;
  calculating_score: string | number;
  sci_tech_score: string | number;
  social_civic_score: string | number;
  economy_finance_score: string | number;
  health_score: string | number;
  art_culture_score: string | number;
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
  COMPETENCY_TEMPLATE_HEADERS.forEach((h) => {
    const idx = headerLine.findIndex((cell) => cell.trim().toLowerCase() === h.toLowerCase());
    if (idx >= 0) colIndex.set(h, idx);
  });

  const get = (cols: string[], key: string): string =>
    (colIndex.get(key) !== undefined ? cols[colIndex.get(key)!] : "").trim();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const student_id = get(cols, "student_id");
    const unit_name = get(cols, "unit_name");
    if (!student_id && !unit_name) continue;
    if (!student_id) {
      errors.push(`แถว ${i + 1}: ไม่มีรหัสนักเรียน`);
      continue;
    }
    if (!unit_name) {
      errors.push(`แถว ${i + 1}: ไม่มีหน่วยการเรียนรู้`);
      continue;
    }

    const getFrom = (k: string) => get(cols, k);
    rows.push({
      student_id,
      student_name: getFrom("student_name"),
      subject: getFrom("subject"),
      unit_name,
      grade_level: getFrom("grade_level"),
      classroom: getFrom("classroom"),
      academic_term: getFrom("academic_term"),
      score: getFrom("score") || "",
      total_score: getFrom("total_score") || "",
      assessed_date: getFrom("assessed_date"),
      reading_score: getFrom("reading_score") || "",
      writing_score: getFrom("writing_score") || "",
      calculating_score: getFrom("calculating_score") || "",
      sci_tech_score: getFrom("sci_tech_score") || "",
      social_civic_score: getFrom("social_civic_score") || "",
      economy_finance_score: getFrom("economy_finance_score") || "",
      health_score: getFrom("health_score") || "",
      art_culture_score: getFrom("art_culture_score") || "",
      competency_assessed_date: getFrom("competency_assessed_date"),
      competency_note: getFrom("competency_note"),
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
            reading_score: get(row, "reading_score") || "",
            writing_score: get(row, "writing_score") || "",
            calculating_score: get(row, "calculating_score") || "",
            sci_tech_score: get(row, "sci_tech_score") || "",
            social_civic_score: get(row, "social_civic_score") || "",
            economy_finance_score: get(row, "economy_finance_score") || "",
            health_score: get(row, "health_score") || "",
            art_culture_score: get(row, "art_culture_score") || "",
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

/** Validate row: score 0–total, total 0–1000, capabilities 1-4. Returns first error or null. */
export function validateAllInOneRow(row: ParsedAllInOneRow, rowIndex: number): string | null {
  const total = toNum(row.total_score) ?? 10;
  const score = toNum(row.score);
  if (score !== null) {
    if (score < 0) return `แถว ${rowIndex + 1}: คะแนนวิชาต้องไม่เป็นค่าลบ`;
    if (total < 0 || total > 1000) return `แถว ${rowIndex + 1}: คะแนนเต็มต้องอยู่ระหว่าง 0-1000`;
    if (score > total) return `แถว ${rowIndex + 1}: คะแนนต้องไม่เกินคะแนนเต็ม`;
  }
  for (const k of CAP_COLS) {
    const v = toNum((row as Record<string, string | number>)[k]);
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

const SELECT_COLS =
  "id,student_name,score,total_score,assessed_date,competency_note,competency_assessed_date," +
  CAP_COLS.join(",");

/** Upsert one row: match by teacher_id, student_id, subject, grade_level, classroom, academic_term, unit_name. */
export async function upsertAllInOne(
  rows: ParsedAllInOneRow[],
  teacherId: string
): Promise<UpsertResult> {
  const result: UpsertResult = { created: 0, updated: 0, errors: [] };

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
        .select(SELECT_COLS)
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
        for (const k of CAP_COLS) {
          const v = toNum((row as Record<string, string | number>)[k]);
          if (v !== null && v >= 1 && v <= 4) upd[k] = v;
        }
        if (row.competency_note !== "") upd.competency_note = row.competency_note;

        const { error: updateErr } = await db
          .from("unit_assessments")
          .update(upd)
          .eq("id", existing.id);
        if (updateErr) {
          result.errors.push(`แถว ${i + 1} (${row.student_id}): ${updateErr.message}`);
        } else {
          result.updated++;
        }
      } else {
        const insertPayload: Record<string, unknown> = {
          teacher_id: teacherId,
          assessed_by: teacherId,
          student_id: row.student_id,
          student_name: row.student_name || null,
          subject,
          grade_level,
          classroom,
          academic_term: academic_term || null,
          unit_name: row.unit_name,
          score: toNum(row.score) ?? 0,
          total_score: toNum(row.total_score) ?? 10,
          assessed_date: toISODate(row.assessed_date) || null,
          competency_assessed_date: competencyDate,
          competency_note: row.competency_note || null,
        };
        for (const k of CAP_COLS) {
          const v = toNum((row as Record<string, string | number>)[k]);
          if (v !== null && v >= 1 && v <= 4) insertPayload[k] = v;
        }

        const { error: insertErr } = await db
          .from("unit_assessments")
          .insert(insertPayload);
        if (insertErr) {
          result.errors.push(`แถว ${i + 1} (${row.student_id}): ${insertErr.message}`);
        } else {
          result.created++;
        }
      }
    } catch (e) {
      result.errors.push(
        `แถว ${i + 1}: ${e instanceof Error ? e.message : "ข้อผิดพลาดไม่ทราบสาเหตุ"}`
      );
    }
  }

  return result;
}
