import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Layout of the "📝 กรอกคะแนน" sheet (fixed positions, verified from XML) ──
// Metadata row 2:  C2=project_name  F2=grade/classroom  I2=teacher_name
//                  J2=year  K2=month (placeholder "เดือน")  L2=semester
// Header row 4 (Thai). Student data rows 5–34 (max 30):
//   B=student_id  C=student_name  D=com  E=think  F=problem  G=life  H=tech
//   I=total (formula, ignore)  J=result (formula, ignore)  K=notes
const META_ROW = 2;
const DATA_FIRST_ROW = 5;
const DATA_LAST_ROW = 34;
const MONTH_PLACEHOLDER = "เดือน";

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

    // ─── Metadata (row 2) ────────────────────────────────────────────────────
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

    // GUARD: the template ships with the word "เดือน" sitting in K2 as a
    // placeholder. If it's still there (or empty), the teacher hasn't filled it.
    let month = monthRaw;
    if (!monthRaw || monthRaw === MONTH_PLACEHOLDER) {
      month = "";
      warnings.push(
        'ยังไม่ได้กรอกเดือนในช่อง K2 (พบค่าว่างหรือ placeholder "เดือน") — บันทึกโดยไม่มีเดือน',
      );
    }

    const academic_term = `${year}-${semester}`;

    if (!project_name || !grade_level || !classroom) {
      throw new Error(
        "ข้อมูลโปรเจกต์ไม่ครบ — ต้องมีชื่อโปรเจกต์ (C2), ชั้น/ห้อง (F2) ให้ครบ",
      );
    }

    // ─── Student rows (5–34) ─────────────────────────────────────────────────
    const assessments: PBLAssessment[] = [];
    let incompleteCount = 0;

    for (let r = DATA_FIRST_ROW; r <= DATA_LAST_ROW; r++) {
      const student_id = cellStr(ws, `B${r}`);
      if (!student_id) continue; // empty student_id → skip silently

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
