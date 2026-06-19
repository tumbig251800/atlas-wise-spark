import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Layout of the "📝 กรอกคะแนน" sheet ──────────────────────────────────────
// The COLUMN layout is fixed, but the ROW positions are detected at runtime:
// teachers sometimes insert/delete blank rows above the table, which shifts the
// header + data block up or down. We locate the header row (the one containing
// "รหัสนักเรียน") and the metadata row (containing "ชื่อโปรเจกต์") by content.
//   Metadata row:  C=project_name  F=grade/classroom  I=teacher_name
//                  J=year  K=month (placeholder "เดือน")  L=semester
//   Header row, then student data below it:
//   B=student_id  C=student_name  D=com  E=think  F=problem  G=life  H=tech
//   I=total (formula, ignore)  J=result (formula, ignore)  K=notes
const MONTH_PLACEHOLDER = "เดือน";
// Fallbacks if the marker labels can't be found (matches the original template).
const META_ROW_FALLBACK = 2;
const HEADER_ROW_FALLBACK = 4;
// How far below the header to keep scanning for students.
const MAX_DATA_ROWS = 60;
// Stop after this many consecutive blank student rows (footer / end of table).
const MAX_BLANK_RUN = 5;

interface PBLAssessment {
  student_id: string;
  student_name: string;
  com_score: number;
  think_score: number;
  problem_score: number;
  life_score: number;
  tech_score: number;
  overall_result: "excellent" | "pass" | "fail";
  notes?: string;
}

// Prefer the formatted text (.w) so numeric student IDs never render as
// scientific notation; fall back to the raw value.
function cellStr(ws: XLSX.WorkSheet, ref: string): string {
  const cell = ws[ref];
  if (!cell) return "";
  if (cell.w !== undefined && cell.w !== null) return String(cell.w).trim();
  if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
  return "";
}

function cellNum(ws: XLSX.WorkSheet, ref: string): number | null {
  const cell = ws[ref];
  if (!cell || cell.v === undefined || cell.v === null || cell.v === "") return null;
  const n = typeof cell.v === "number" ? cell.v : Number(String(cell.v).trim());
  return Number.isFinite(n) ? n : null;
}

// Normalise to "YYYY-S" (e.g. 2569-1) regardless of how the teacher typed the
// year/semester. Handles "1/2569", "1-2569", swapped cells, extra spaces — we
// pull the Buddhist year (25xx) and the term digit (1–3) out of both cells.
function normalizeTerm(yearRaw: string, semRaw: string): string {
  const blob = `${yearRaw} ${semRaw}`;
  const yearMatch = blob.match(/25\d\d/);
  const year = yearMatch ? yearMatch[0] : yearRaw.trim();
  const rest = year ? blob.replace(year, " ") : blob;
  const semMatch = rest.match(/[1-3]/);
  const semester = semMatch ? semMatch[0] : semRaw.trim();
  return `${year}-${semester}`;
}

// excellent: no score of 1 AND at least three scores of 3
// fail:      any score of 1
// pass:      everything else
function computeResult(scores: number[]): "excellent" | "pass" | "fail" {
  if (scores.some((s) => s === 1)) return "fail";
  const threes = scores.filter((s) => s === 3).length;
  if (threes >= 3) return "excellent";
  return "pass";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      throw new Error("No file uploaded");
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

    // Read the input tab directly. Match by Thai substring (sheet names carry an
    // emoji prefix "📝" so an exact === comparison fails); fall back to the first
    // sheet, which is always the data-entry tab in this template.
    const sheetName =
      workbook.SheetNames.find((n) => n.includes("กรอกคะแนน")) ??
      workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("ไม่พบแท็บ '📝 กรอกคะแนน' ในไฟล์");
    }
    const ws = workbook.Sheets[sheetName];

    const warnings: string[] = [];
    const errors: string[] = [];

    // ─── Locate rows by content (robust to inserted/deleted rows) ────────────
    // Scan a generous window for the row whose given column cell contains a
    // marker substring. Returns -1 if not found.
    const findRow = (col: string, marker: string): number => {
      for (let r = 1; r <= 20; r++) {
        if (cellStr(ws, `${col}${r}`).includes(marker)) return r;
      }
      return -1;
    };

    // Metadata sits on the row labelled "ชื่อโปรเจกต์" in column A.
    const metaRowFound = findRow("A", "ชื่อโปรเจกต์");
    const META_ROW = metaRowFound > 0 ? metaRowFound : META_ROW_FALLBACK;

    // The student table starts on the row AFTER the "รหัสนักเรียน" header.
    const headerRow = findRow("B", "รหัสนักเรียน");
    const DATA_FIRST_ROW = (headerRow > 0 ? headerRow : HEADER_ROW_FALLBACK) + 1;
    const DATA_LAST_ROW = DATA_FIRST_ROW + MAX_DATA_ROWS - 1;

    // ─── Metadata ────────────────────────────────────────────────────────────
    const project_name = cellStr(ws, `C${META_ROW}`);
    const gradeClass = cellStr(ws, `F${META_ROW}`);
    const teacher_name = cellStr(ws, `I${META_ROW}`);
    const year = cellStr(ws, `J${META_ROW}`);
    const monthRaw = cellStr(ws, `K${META_ROW}`);
    const semester = cellStr(ws, `L${META_ROW}`);

    // Split "ป.4/KBW" → grade_level + classroom
    const [grade_level = "", classroom = ""] = gradeClass
      .split("/")
      .map((s) => s.trim());

    // GUARD: the template ships with the word "เดือน" sitting in the month cell
    // as a placeholder/label. Teachers fill it either as "มิถุนายน" or by
    // appending after the label ("เดือน มิถุนายน") — strip the leading label so
    // we store just the month name. If nothing remains, it wasn't filled.
    let month = monthRaw.replace(/^เดือน\s*/, "").trim();
    if (!month) {
      warnings.push(
        'ยังไม่ได้กรอกเดือนในช่องเดือน (พบค่าว่างหรือ placeholder "เดือน") — บันทึกโดยไม่มีเดือน',
      );
    }

    const academic_term = normalizeTerm(year, semester);

    // ─── Validate the header block, naming exactly which cell is blank ────────
    // Required fields block the import (they're upsert keys / drive the dashboard
    // filter); optional fields only warn so a small omission doesn't stop import.
    const missing: string[] = [];
    if (!project_name) missing.push(`ชื่อโปรเจกต์ (ช่อง C${META_ROW})`);
    if (!gradeClass) {
      missing.push(`ชั้น/ห้อง (ช่อง F${META_ROW})`);
    } else if (!grade_level || !classroom) {
      missing.push(`ชั้น/ห้อง ต้องอยู่ในรูป "ป.4/KBW" (ช่อง F${META_ROW})`);
    }
    if (!year) missing.push(`ปีการศึกษา (ช่อง J${META_ROW})`);
    if (!semester) missing.push(`ภาคเรียน (ช่อง L${META_ROW})`);

    if (missing.length > 0) {
      throw new Error(
        `ยังกรอกข้อมูลส่วนหัวไม่ครบ — กรุณาเติม: ${missing.join(" / ")}`,
      );
    }

    // Year + semester are present but the combined term still looks wrong — warn,
    // don't block (otherwise the data imports but won't match the term filter).
    if (!/^25\d\d-[1-3]$/.test(academic_term)) {
      warnings.push(
        `รูปแบบภาคเรียนผิดปกติ (อ่านได้ "${academic_term}") — ตรวจช่องปีการศึกษา (J${META_ROW}) และภาคเรียน (L${META_ROW}) ให้เป็นเลขปี เช่น 2569 และเทอม 1–2`,
      );
    }

    // Optional field: warn but still import.
    if (!teacher_name) {
      warnings.push(`ยังไม่ได้กรอกชื่อครูผู้รับผิดชอบ (ช่อง I${META_ROW})`);
    }

    // ─── Student rows (from the row after the header) ────────────────────────
    const assessments: PBLAssessment[] = [];
    let incompleteCount = 0;
    let blankRun = 0;

    for (let r = DATA_FIRST_ROW; r <= DATA_LAST_ROW; r++) {
      const student_id = cellStr(ws, `B${r}`);
      if (!student_id) {
        // A run of blank rows means we've reached the end of the table.
        if (++blankRun >= MAX_BLANK_RUN) break;
        continue;
      }
      blankRun = 0;

      const student_name = cellStr(ws, `C${r}`);
      const com_score = cellNum(ws, `D${r}`);
      const think_score = cellNum(ws, `E${r}`);
      const problem_score = cellNum(ws, `F${r}`);
      const life_score = cellNum(ws, `G${r}`);
      const tech_score = cellNum(ws, `H${r}`);
      const notes = cellStr(ws, `K${r}`);

      const scores = [com_score, think_score, problem_score, life_score, tech_score];

      // Incomplete: has a student but not all 5 scores → skip + count (mirrors
      // the template, which only summarises a row once all 5 are entered).
      if (scores.some((s) => s === null)) {
        incompleteCount++;
        continue;
      }

      // Range check: scores must be 1–3.
      const nums = scores as number[];
      const outOfRange = nums.some((s) => s < 1 || s > 3);
      if (outOfRange) {
        errors.push(
          `แถว ${r} (รหัส ${student_id}): คะแนนต้องอยู่ระหว่าง 1–3 เท่านั้น`,
        );
        continue;
      }

      assessments.push({
        student_id,
        student_name,
        com_score: nums[0],
        think_score: nums[1],
        problem_score: nums[2],
        life_score: nums[3],
        tech_score: nums[4],
        overall_result: computeResult(nums),
        notes: notes || undefined,
      });
    }

    if (incompleteCount > 0) {
      warnings.push(
        `ข้าม ${incompleteCount} แถวที่กรอกคะแนนไม่ครบทั้ง 5 ด้าน`,
      );
    }

    if (assessments.length === 0) {
      throw new Error(
        errors.length > 0
          ? `ไม่มีแถวที่ถูกต้อง — ${errors.join("; ")}`
          : "ไม่พบข้อมูลนักเรียนที่กรอกคะแนนครบในแท็บ '📝 กรอกคะแนน'",
      );
    }

    // ─── Upsert project ──────────────────────────────────────────────────────
    const { data: project, error: projectError } = await supabase
      .from("pbl_projects")
      .upsert(
        { project_name, grade_level, classroom, teacher_name, academic_term, month },
        { onConflict: "project_name,grade_level,classroom,academic_term" },
      )
      .select("id")
      .single();

    if (projectError) throw projectError;
    if (!project) throw new Error("ไม่สามารถสร้าง/อัปเดตโปรเจกต์ได้");

    const projectId = project.id;

    // ─── Upsert assessments (total_score is GENERATED — never send it) ───────
    const rows = assessments.map((a) => ({ ...a, project_id: projectId }));
    const { data: insertedAssessments, error: assessmentError } = await supabase
      .from("pbl_assessments")
      .upsert(rows, { onConflict: "project_id,student_id" })
      .select("id");

    if (assessmentError) throw assessmentError;

    return new Response(
      JSON.stringify({
        success: true,
        project_id: projectId,
        project_name,
        grade_level,
        classroom,
        academic_term,
        month: month || null,
        inserted: insertedAssessments?.length || 0,
        total: assessments.length,
        skipped_incomplete: incompleteCount,
        warnings,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
