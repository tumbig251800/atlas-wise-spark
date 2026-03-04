/**
 * Phase D Stage 1 + 2026: Generate blank 'All-in-One' competency template
 * Unified headers: Academic Score + 8 capabilities (หลักสูตร 2569)
 */
import * as XLSX from "xlsx";
import type { CompetencyTemplateRow } from "@/types/competency";

const BLANK_ROW_COUNT = 50;

const CAPABILITY_HEADERS_2026 = [
  "reading_score",
  "writing_score",
  "calculating_score",
  "sci_tech_score",
  "social_civic_score",
  "economy_finance_score",
  "health_score",
  "art_culture_score",
];

/** Teacher-logical order. Matches unit_assessments columns for Stage 2 upload. */
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
  ...CAPABILITY_HEADERS_2026,
  "competency_assessed_date",
  "competency_note",
];

/**
 * Generate blank template rows. Teachers fill manually.
 * Stage 2: if competency_assessed_date blank, use assessed_date or upload date.
 */
export function generateBlankCompetencyTemplate(): CompetencyTemplateRow[] {
  const blankCap = Object.fromEntries(
    CAPABILITY_HEADERS_2026.map((h) => [h, ""])
  ) as Record<string, string>;
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
    ...blankCap,
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
