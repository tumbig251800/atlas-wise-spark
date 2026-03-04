/**
 * Phase D Stage 1: Generate blank 'All-in-One' competency template
 * Unified headers: Academic Score (10) + Competency (A1–A6)
 * Manual entry mode: empty rows for teachers to copy-paste student lists
 */
import * as XLSX from "xlsx";
import type { CompetencyTemplateRow } from "@/types/competency";

const BLANK_ROW_COUNT = 50;

/** Teacher-logical order. Matches unit_assessments columns for Stage 2 upload. No teacher_id/assessed_by (set from Auth). */
export const COMPETENCY_TEMPLATE_HEADERS = [
  "student_id",
  "student_name",
  "subject",
  "unit_name",
  "grade_level",
  "classroom",
  "academic_term",
  "score",
  "total_score",
  "assessed_date",
  "a1_score",
  "a2_score",
  "a3_score",
  "a4_score",
  "a5_score",
  "a6_score",
  "competency_assessed_date",
  "competency_note",
];

/**
 * Generate blank template rows. No fetch — teachers fill manually.
 * Stage 2: if competency_assessed_date blank, use assessed_date or upload date.
 */
export function generateBlankCompetencyTemplate(): CompetencyTemplateRow[] {
  return Array.from({ length: BLANK_ROW_COUNT }, () => ({
    student_id: "",
    student_name: "",
    subject: "",
    unit_name: "",
    grade_level: "",
    classroom: "",
    academic_term: "",
    score: "",
    total_score: "",
    assessed_date: "",
    a1_score: "",
    a2_score: "",
    a3_score: "",
    a4_score: "",
    a5_score: "",
    a6_score: "",
    competency_assessed_date: "",
    competency_note: "",
  }));
}

function rowsToSheet(rows: CompetencyTemplateRow[]): XLSX.WorkSheet {
  const headerRow = COMPETENCY_TEMPLATE_HEADERS;
  const dataRows = rows.map((r) =>
    headerRow.map((h) => {
      const v = (r as Record<string, unknown>)[h];
      return v === undefined || v === null ? "" : v;
    })
  );
  return XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
}

export function downloadAsXLSX(rows: CompetencyTemplateRow[], filename?: string): void {
  const ws = rowsToSheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "All-in-One Template");
  const name = filename ?? `competency-template-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, name);
}

export function downloadAsCSV(rows: CompetencyTemplateRow[], filename?: string): void {
  const ws = rowsToSheet(rows);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `competency-template-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
