import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PBLRow {
  student_id: string;
  student_name: string;
  grade_level: string;
  classroom: string;
  teacher_name: string;
  project_name: string;
  academic_term: string;
  month: string;
  com_score: number;
  think_score: number;
  problem_score: number;
  life_score: number;
  tech_score: number;
  overall_result: "excellent" | "pass" | "fail";
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new Error("No file uploaded");
    }

    // Read Excel file
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });

    // Find "ATLAS Import" sheet
    const sheetName = workbook.SheetNames.find(
      (name) => name === "ATLAS Import"
    );

    if (!sheetName) {
      throw new Error('Sheet "ATLAS Import" not found in workbook');
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    // Parse rows (row 0 might be empty, row 1 is header, row 2+ is data)
    const headerRowIndex = rawData.findIndex((row) =>
      row.some((cell) => cell === "student_id")
    );

    if (headerRowIndex === -1) {
      throw new Error("Header row with 'student_id' column not found");
    }

    const headers = rawData[headerRowIndex];
    const dataRows = rawData.slice(headerRowIndex + 1);

    // Map headers to indices
    const colMap: Record<string, number> = {};
    headers.forEach((header: string, index: number) => {
      if (header) colMap[header.trim()] = index;
    });

    // Parse rows into structured data
    const rows: PBLRow[] = dataRows
      .filter((row) => row[colMap["student_id"]]) // Skip rows without student_id
      .map((row) => ({
        student_id: String(row[colMap["student_id"]] || "").trim(),
        student_name: String(row[colMap["student_name"]] || "").trim(),
        grade_level: String(row[colMap["grade_level"]] || "").trim(),
        classroom: String(row[colMap["classroom"]] || "").trim(),
        teacher_name: String(row[colMap["teacher_name"]] || "").trim(),
        project_name: String(row[colMap["project_name"]] || "").trim(),
        academic_term: String(row[colMap["academic_term"]] || "").trim(),
        month: String(row[colMap["month"]] || "").trim(),
        com_score: parseInt(row[colMap["com_score"]]),
        think_score: parseInt(row[colMap["think_score"]]),
        problem_score: parseInt(row[colMap["problem_score"]]),
        life_score: parseInt(row[colMap["life_score"]]),
        tech_score: parseInt(row[colMap["tech_score"]]),
        overall_result: String(row[colMap["overall_result"]] || "").toLowerCase() as "excellent" | "pass" | "fail",
        notes: row[colMap["notes"]] ? String(row[colMap["notes"]]).trim() : undefined,
      }));

    if (rows.length === 0) {
      throw new Error("No valid data rows found");
    }

    // Extract project info from first row (all rows share same project info)
    const firstRow = rows[0];
    const projectData = {
      project_name: firstRow.project_name,
      grade_level: firstRow.grade_level,
      classroom: firstRow.classroom,
      teacher_name: firstRow.teacher_name,
      academic_term: firstRow.academic_term,
      month: firstRow.month,
    };

    // Validate project data
    if (!projectData.project_name || !projectData.grade_level || !projectData.classroom) {
      throw new Error("Missing required project information in first row");
    }

    // Upsert project
    const { data: project, error: projectError } = await supabase
      .from("pbl_projects")
      .upsert(projectData, {
        onConflict: "project_name,grade_level,classroom,academic_term",
      })
      .select("id")
      .single();

    if (projectError) throw projectError;
    if (!project) throw new Error("Failed to create/update project");

    const projectId = project.id;

    // Prepare assessments
    const assessments = rows.map((row) => ({
      project_id: projectId,
      student_id: row.student_id,
      student_name: row.student_name,
      com_score: row.com_score,
      think_score: row.think_score,
      problem_score: row.problem_score,
      life_score: row.life_score,
      tech_score: row.tech_score,
      overall_result: row.overall_result,
      notes: row.notes,
    }));

    // Upsert assessments (batch)
    const { data: insertedAssessments, error: assessmentError } = await supabase
      .from("pbl_assessments")
      .upsert(assessments, {
        onConflict: "project_id,student_id",
      })
      .select("id");

    if (assessmentError) throw assessmentError;

    // Count new vs updated
    const inserted = insertedAssessments?.length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        project_id: projectId,
        project_name: projectData.project_name,
        inserted,
        total: rows.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
