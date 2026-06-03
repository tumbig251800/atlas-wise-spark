/**
 * Unit 1 Excel Parser - Parse roster and Unit 1 scores from template
 * Format: /Users/tum_macmini/Downloads/เก็บคะแนน.xlsx
 * Sheet structure:
 * - Row 1 (index 0): title (skip)
 * - Row 2 (index 1): merged header (skip)
 * - Row 3 (index 2): column headers
 * - Row 4+ (index 3+): data
 *
 * Sheet name format: "ป.X.Y" → grade_level="ป.X", classroom="Y"
 */
import * as XLSX from "xlsx";

// ==================== Types ====================

export interface Unit1Student {
  student_code: string;      // รหัสประจำตัว → maps to students.student_code AND students.student_id
  student_number?: string;   // เลขที่ (for UI preview only, not saved to DB)
  first_name: string;        // ชื่อ (includes คำนำหน้า)
  last_name: string;         // นามสกุล
  grade_level: string;       // from sheet name "ป.4.1" → "ป.4"
  classroom: string;         // from sheet name "ป.4.1" → "1"
}

export interface Unit1Score {
  student_code: string;
  score: number | null;      // null if empty, number if provided
}

export interface Unit1ParseResult {
  matchedSheets: string[];        // all sheets matching /^ป\.\d+\..+$/
  selectedSheet: string;          // sheet actually parsed
  students: Unit1Student[];
  unit1Scores: Unit1Score[] | null;  // null = all empty (roster seed only)
  errors: string[];
  warnings: string[];
  metadata: {
    grade_level: string;
    classroom: string;
    totalRows: number;
    scoresProvided: number;
  };
}

export interface ParseUnit1Options {
  sheetName?: string;  // if provided, parse only this sheet
}

// ==================== Helper Functions ====================

/**
 * Convert string/number to number | null. Empty → null.
 */
function toNum(v: string | number | undefined | null): number | null {
  if (v === "" || v === undefined || v === null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
}

/**
 * Parse sheet name "ป.X.Y" → {grade_level: "ป.X", classroom: "Y"}
 */
function parseSheetName(name: string): { grade_level: string; classroom: string } | null {
  const trimmedName = name.trim();
  const m = trimmedName.match(/^ป\.(\d+)\.(.+)$/);
  if (!m) return null;
  return {
    grade_level: `ป.${m[1]}`,
    classroom: m[2].trim(),
  };
}

/**
 * Split full name: last name = last token, first name = everything before it.
 * Handles Thai names with title prefixes correctly.
 *
 * Examples:
 * "เด็กหญิงปาณิสรา  เชยชูชาติ" → first="เด็กหญิงปาณิสรา", last="เชยชูชาติ"
 * "เด็กหญิง ปาณิสรา เชยชูชาติ" → first="เด็กหญิง ปาณิสรา", last="เชยชูชาติ"
 * "Madonna" → first="Madonna", last=""
 */
function splitFullName(fullName: string): { first: string; last: string } {
  const trimmed = fullName.trim();
  if (!trimmed) return { first: "", last: "" };

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first: trimmed, last: "" };
  }

  const last = parts[parts.length - 1];
  const first = parts.slice(0, -1).join(" ");
  return { first, last };
}

// ==================== Main Parse Function ====================

/**
 * Parse Unit 1 Excel template.
 *
 * Multi-sheet handling:
 * - Scans all sheets, collects names matching /^ป\.\d+\..+$/
 * - If options.sheetName provided, parse that sheet only
 * - Else parse first matching sheet
 * - If multiple sheets found, add warning
 *
 * Column mapping (0-indexed):
 * - col 0: รหัสประจำตัว (student_code) - REQUIRED
 * - col 1: เลขที่ (student_number) - optional
 * - col 2: ชื่อ-สกุล (full_name) - REQUIRED
 * - col 3: ชั้น (ignored, use sheet name)
 * - col 4: หน่วยที่ 1 score
 *
 * Returns:
 * - matchedSheets: all sheet names matching pattern
 * - selectedSheet: the sheet actually parsed
 * - students: all parsed roster
 * - unit1Scores: null if all empty, else array
 * - errors: hard errors (invalid sheet, missing fields, duplicates)
 * - warnings: soft issues (multiple sheets, empty rows)
 */
export function parseUnit1Excel(
  file: File,
  options?: ParseUnit1Options
): Promise<Unit1ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = reader.result;
        const wb = XLSX.read(data, { type: "array" });

        const errors: string[] = [];
        const warnings: string[] = [];

        // Step 1: Scan for matching sheets
        const matchedSheets = wb.SheetNames.filter((name) =>
          /^ป\.\d+\..+$/.test(name.trim())
        );

        if (matchedSheets.length === 0) {
          resolve({
            matchedSheets: [],
            selectedSheet: "",
            students: [],
            unit1Scores: null,
            errors: ['ไม่พบชีตที่ตรงรูปแบบ "ป.X.Y" (เช่น "ป.4.1")'],
            warnings: [],
            metadata: {
              grade_level: "",
              classroom: "",
              totalRows: 0,
              scoresProvided: 0,
            },
          });
          return;
        }

        // Step 2: Select sheet
        let selectedSheet: string;
        if (options?.sheetName) {
          if (!wb.SheetNames.includes(options.sheetName)) {
            resolve({
              matchedSheets,
              selectedSheet: "",
              students: [],
              unit1Scores: null,
              errors: [`ไม่พบชีต "${options.sheetName}" ในไฟล์`],
              warnings: [],
              metadata: {
                grade_level: "",
                classroom: "",
                totalRows: 0,
                scoresProvided: 0,
              },
            });
            return;
          }
          if (!matchedSheets.includes(options.sheetName)) {
            resolve({
              matchedSheets,
              selectedSheet: "",
              students: [],
              unit1Scores: null,
              errors: [`ชีต "${options.sheetName}" ไม่ตรงรูปแบบ "ป.X.Y"`],
              warnings: [],
              metadata: {
                grade_level: "",
                classroom: "",
                totalRows: 0,
                scoresProvided: 0,
              },
            });
            return;
          }
          selectedSheet = options.sheetName;
        } else {
          selectedSheet = matchedSheets[0];
          if (matchedSheets.length > 1) {
            warnings.push(
              `พบ ${matchedSheets.length} sheets: ${matchedSheets.join(", ")} — ใช้ sheet แรก`
            );
          }
        }

        // Step 3: Parse sheet name
        const parsed = parseSheetName(selectedSheet);
        if (!parsed) {
          resolve({
            matchedSheets,
            selectedSheet,
            students: [],
            unit1Scores: null,
            errors: [`ชื่อ sheet "${selectedSheet}" ไม่ตรงรูปแบบ "ป.X.Y"`],
            warnings,
            metadata: {
              grade_level: "",
              classroom: "",
              totalRows: 0,
              scoresProvided: 0,
            },
          });
          return;
        }

        const { grade_level, classroom } = parsed;

        // Step 4: Read sheet data
        const ws = wb.Sheets[selectedSheet];
        const json = XLSX.utils.sheet_to_json<string[]>(ws, {
          header: 1,
          defval: "",
        });

        if (json.length < 4) {
          resolve({
            matchedSheets,
            selectedSheet,
            students: [],
            unit1Scores: null,
            errors: ["ไฟล์มีข้อมูลไม่ครบ (ต้องมีอย่างน้อย 4 แถว)"],
            warnings,
            metadata: {
              grade_level,
              classroom,
              totalRows: 0,
              scoresProvided: 0,
            },
          });
          return;
        }

        // Step 5: Parse data rows (start from index 3, skip rows 0-2)
        const students: Unit1Student[] = [];
        const seenCodes = new Set<string>();
        const scoreMap = new Map<string, number | null>();

        for (let i = 3; i < json.length; i++) {
          const row = json[i] || [];
          const rowNum = i + 1;

          const student_code = String(row[0] || "").trim();
          const student_number = String(row[1] || "").trim();
          const full_name = String(row[2] || "").trim();
          const unit1RawScore = row[4];

          // Skip if both student_code and full_name are empty
          if (!student_code && !full_name) continue;

          // Error if only one is empty
          if (!student_code) {
            errors.push(`แถว ${rowNum}: ไม่มีรหัสประจำตัว`);
            continue;
          }
          if (!full_name) {
            errors.push(`แถว ${rowNum}: ไม่มีชื่อ-สกุล`);
            continue;
          }

          // Check duplicate
          if (seenCodes.has(student_code)) {
            errors.push(`แถว ${rowNum}: รหัส ${student_code} ซ้ำใน sheet เดียวกัน`);
            continue;
          }
          seenCodes.add(student_code);

          // Split name
          const { first, last } = splitFullName(full_name);

          // Parse score
          const scoreNum = toNum(unit1RawScore);
          scoreMap.set(student_code, scoreNum);

          // Add student
          students.push({
            student_code,
            student_number: student_number || undefined,
            first_name: first,
            last_name: last,
            grade_level,
            classroom,
          });
        }

        // Step 6: Build unit1Scores
        let unit1Scores: Unit1Score[] | null = null;
        const hasAnyScore = Array.from(scoreMap.values()).some((s) => s !== null);
        if (hasAnyScore) {
          unit1Scores = students.map((s) => ({
            student_code: s.student_code,
            score: scoreMap.get(s.student_code) ?? null,
          }));
        }

        // Step 7: Metadata
        const scoresProvided = hasAnyScore
          ? Array.from(scoreMap.values()).filter((s) => s !== null).length
          : 0;

        resolve({
          matchedSheets,
          selectedSheet,
          students,
          unit1Scores,
          errors,
          warnings,
          metadata: {
            grade_level,
            classroom,
            totalRows: students.length,
            scoresProvided,
          },
        });
      } catch (e) {
        resolve({
          matchedSheets: [],
          selectedSheet: "",
          students: [],
          unit1Scores: null,
          errors: [e instanceof Error ? e.message : "อ่านไฟล์ไม่สำเร็จ"],
          warnings: [],
          metadata: {
            grade_level: "",
            classroom: "",
            totalRows: 0,
            scoresProvided: 0,
          },
        });
      }
    };

    reader.onerror = () => {
      resolve({
        matchedSheets: [],
        selectedSheet: "",
        students: [],
        unit1Scores: null,
        errors: ["อ่านไฟล์ไม่สำเร็จ"],
        warnings: [],
        metadata: {
          grade_level: "",
          classroom: "",
          totalRows: 0,
          scoresProvided: 0,
        },
      });
    };

    reader.readAsArrayBuffer(file);
  });
}
