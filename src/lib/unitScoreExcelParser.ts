/**
 * unitScoreExcelParser.ts
 * Parser สำหรับไฟล์ Excel template "แบบบันทึกคะแนนหลังหน่วย"
 * โครงสร้าง:
 * - แถว 2: metadata (วิชา, ชั้น/ห้อง, หน่วย, ภาคเรียน, วันที่สอบ)
 * - แถว 3: k_total (C3), p_total (F3), a_total (I3)
 * - แถว 7-36: ข้อมูลนักเรียน (30 คน)
 * - คอลัมน์: C=student_id, D=ชื่อ-สกุล, E-H=K รายข้อ, I-N=P รายข้อ, O=A score
 */
import * as XLSX from "xlsx";
import { validateExcelMetadata, validateStudentId } from "./dataValidator";

export type UnitScoreMetadata = {
  subject: string;
  grade_level: string;
  classroom: string;
  unit_name: string;
  academic_term: string;
  assessed_date: string;
  k_total: number;
  p_total: number;
  a_total: number;
};

export type StudentScoreData = {
  student_id: string;
  student_name: string;
  k_score: number;
  p_score: number;
  a_score: number;
  score: number; // k + p + a
};

export type UnitScoreParseResult = {
  metadata: UnitScoreMetadata | null;
  students: StudentScoreData[];
  errors: string[];
  warnings: string[];
};

/**
 * อ่านค่าจาก cell (รองรับทั้ง string และ number)
 */
function getCellValue(
  sheet: XLSX.WorkSheet,
  cellRef: string
): string | number | null {
  const cell = sheet[cellRef];
  if (!cell || cell.v === undefined || cell.v === null) return null;
  return cell.v;
}

/**
 * แปลง cell value เป็น string
 */
function getCellString(
  sheet: XLSX.WorkSheet,
  cellRef: string
): string {
  const val = getCellValue(sheet, cellRef);
  if (val === null) return "";
  return String(val).trim();
}

/**
 * แปลง cell value เป็น number (default 0 ถ้าอ่านไม่ได้)
 */
function getCellNumber(
  sheet: XLSX.WorkSheet,
  cellRef: string,
  defaultVal = 0
): number {
  const val = getCellValue(sheet, cellRef);
  if (val === null) return defaultVal;
  const num = Number(val);
  return Number.isFinite(num) ? num : defaultVal;
}

/**
 * อ่านค่า 0/1 จากรายข้อ K หรือ P
 */
function getItemScore(
  sheet: XLSX.WorkSheet,
  cellRef: string
): number {
  const val = getCellValue(sheet, cellRef);
  if (val === null || val === "") return 0;
  const num = Number(val);
  // ถ้าไม่ใช่ 0 หรือ 1 ให้ถือว่า 0 (validation จะจัดการแยก)
  if (num === 1) return 1;
  return 0;
}

/**
 * แปลงวันที่จาก Excel serial number หรือ string
 * รองรับปี พ.ศ. (> 2500 → ลบ 543)
 */
function parseExcelDate(val: any): string {
  if (!val) return new Date().toISOString().slice(0, 10);

  // ถ้าเป็น number (Excel serial date)
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      let y = date.y;
      // แปลง พ.ศ. เป็น ค.ศ. ถ้า > 2500
      if (y > 2500) y -= 543;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  // ถ้าเป็น string พยายามแปลง
  if (typeof val === "string") {
    const trimmed = val.trim();
    // ถ้าเป็น format DD/MM/YYYY (ภาษาไทย)
    const thaiDateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (thaiDateMatch) {
      const d = thaiDateMatch[1].padStart(2, "0");
      const m = thaiDateMatch[2].padStart(2, "0");
      let y = parseInt(thaiDateMatch[3]);
      // แปลง พ.ศ. เป็น ค.ศ. ถ้า > 2500
      if (y > 2500) y -= 543;
      return `${y}-${m}-${d}`;
    }
    // ถ้าเป็น ISO format แล้ว (อาจมี timestamp ต่อท้าย)
    const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      let y = parseInt(isoMatch[1]);
      if (y > 2500) y -= 543;
      return `${y}-${isoMatch[2]}-${isoMatch[3]}`;
    }
  }

  return new Date().toISOString().slice(0, 10);
}

/**
 * Parse Excel file
 */
export async function parseUnitScoreExcel(
  file: File
): Promise<UnitScoreParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // อ่านไฟล์
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });

    // ใช้ sheet แรก
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      errors.push("ไม่พบ sheet ในไฟล์");
      return { metadata: null, students: [], errors, warnings };
    }

    const sheet = workbook.Sheets[sheetName];

    // === อ่าน metadata จากแถว 2 ===
    // Template ปัจจุบัน (label + blank + value format):
    // A2 = "วิชา:"   B2 = blank  C2 = วิชา
    // D2 = "ชั้น/ห้อง:"  E2 = blank  F2 = ชั้น/ห้อง (เช่น "ป.4/KBW")
    // G2 = "หน่วยที่:"  H2 = blank  I2 = หน่วยที่
    // J2 = "ภาคเรียน:"  K2 = blank  L2 = ภาคเรียน
    // M2 = "วันที่สอบ:"  N2 = blank  O2 = วันที่สอบ

    const subjectRaw = getCellString(sheet, "C2");
    const gradeClassroomRaw = getCellString(sheet, "F2"); // "ป.4/KBW"
    const unitNameRaw = String(getCellValue(sheet, "I2") ?? "").trim();
    const academicTermRaw = String(getCellValue(sheet, "L2") ?? "").trim();
    const assessedDateRaw = getCellValue(sheet, "O2");
    const assessedDate = parseExcelDate(assessedDateRaw);

    // === Validate และ Normalize metadata ===
    const validationResult = validateExcelMetadata({
      subject: subjectRaw,
      gradeClassroom: gradeClassroomRaw,
      unitName: unitNameRaw,
      academicTerm: academicTermRaw,
    });

    // รวม warnings และ errors
    warnings.push(...validationResult.warnings);
    errors.push(...validationResult.errors);

    // === อ่าน K/P/A total จากแถว 3 ===
    const kTotal = getCellNumber(sheet, "C3");
    const pTotal = getCellNumber(sheet, "F3");
    const aTotal = getCellNumber(sheet, "I3");

    if (kTotal + pTotal + aTotal === 0) {
      errors.push("คะแนนเต็ม K+P+A ต้องมากกว่า 0");
    }

    // ใช้ค่าที่ normalize แล้ว
    const metadata: UnitScoreMetadata = {
      subject: validationResult.normalized.subject,
      grade_level: validationResult.normalized.gradeLevel,
      classroom: validationResult.normalized.classroom,
      unit_name: validationResult.normalized.unitName,
      academic_term: validationResult.normalized.academicTerm,
      assessed_date: assessedDate,
      k_total: kTotal,
      p_total: pTotal,
      a_total: aTotal,
    };

    // === อ่านข้อมูลนักเรียนแถว 7-36 ===
    const students: StudentScoreData[] = [];
    const DATA_START_ROW = 7;
    const DATA_END_ROW = 36;

    for (let rowNum = DATA_START_ROW; rowNum <= DATA_END_ROW; rowNum++) {
      // คอลัมน์ตามโจทย์:
      // C = student_id
      // D = ชื่อ-สกุล
      // E-H = K รายข้อ (4 ข้อ)
      // I-N = P รายข้อ (6 ข้อ)
      // O = A score

      const studentIdRaw = getCellString(sheet, `C${rowNum}`);
      if (!studentIdRaw) continue; // ข้ามแถวว่าง

      // Validate รหัสนักเรียน
      const studentIdResult = validateStudentId(studentIdRaw);
      if (!studentIdResult.isValid) {
        warnings.push(`แถว ${rowNum}: ${studentIdResult.errors.join(", ")}`);
        continue; // ข้ามนักเรียนที่รหัสไม่ถูกต้อง
      }

      const studentId = studentIdResult.normalized;
      const studentName = getCellString(sheet, `D${rowNum}`);

      // อ่านรายข้อ K (E-H) และคำนวณผลรวม (ไม่ใช้คอลัมน์ P)
      const k1 = getItemScore(sheet, `E${rowNum}`);
      const k2 = getItemScore(sheet, `F${rowNum}`);
      const k3 = getItemScore(sheet, `G${rowNum}`);
      const k4 = getItemScore(sheet, `H${rowNum}`);
      const kScore = k1 + k2 + k3 + k4;

      // อ่านรายข้อ P (I-N) และคำนวณผลรวม (ไม่ใช้คอลัมน์ Q)
      const p1 = getItemScore(sheet, `I${rowNum}`);
      const p2 = getItemScore(sheet, `J${rowNum}`);
      const p3 = getItemScore(sheet, `K${rowNum}`);
      const p4 = getItemScore(sheet, `L${rowNum}`);
      const p5 = getItemScore(sheet, `M${rowNum}`);
      const p6 = getItemScore(sheet, `N${rowNum}`);
      const pScore = p1 + p2 + p3 + p4 + p5 + p6;

      // อ่าน A score (O)
      const aScore = getCellNumber(sheet, `O${rowNum}`, 0);

      // Validate รายข้อ K/P (ต้องเป็น 0 หรือ 1)
      const kItems = [k1, k2, k3, k4];
      const pItems = [p1, p2, p3, p4, p5, p6];

      const invalidK = kItems.some(
        (val, idx) => {
          const cellVal = getCellValue(sheet, `${String.fromCharCode(69 + idx)}${rowNum}`);
          return cellVal !== null && cellVal !== "" && cellVal !== 0 && cellVal !== 1;
        }
      );
      const invalidP = pItems.some(
        (val, idx) => {
          const cellVal = getCellValue(sheet, `${String.fromCharCode(73 + idx)}${rowNum}`);
          return cellVal !== null && cellVal !== "" && cellVal !== 0 && cellVal !== 1;
        }
      );

      if (invalidK) {
        errors.push(`แถว ${rowNum} (${studentName || studentId}): ข้อ K บางข้อไม่ใช่ 0 หรือ 1`);
      }
      if (invalidP) {
        errors.push(`แถว ${rowNum} (${studentName || studentId}): ข้อ P บางข้อไม่ใช่ 0 หรือ 1`);
      }

      // Validate คะแนนไม่เกินเต็ม
      if (kScore > kTotal) {
        errors.push(`แถว ${rowNum} (${studentName || studentId}): K = ${kScore} เกินคะแนนเต็ม ${kTotal}`);
      }
      if (pScore > pTotal) {
        errors.push(`แถว ${rowNum} (${studentName || studentId}): P = ${pScore} เกินคะแนนเต็ม ${pTotal}`);
      }
      if (aScore > aTotal) {
        errors.push(`แถว ${rowNum} (${studentName || studentId}): A = ${aScore} เกินคะแนนเต็ม ${aTotal}`);
      }

      // Validate A score เป็นตัวเลข
      const aCellVal = getCellValue(sheet, `O${rowNum}`);
      if (aCellVal !== null && aCellVal !== "" && !Number.isFinite(Number(aCellVal))) {
        errors.push(`แถว ${rowNum} (${studentName || studentId}): A score ไม่ใช่ตัวเลข`);
      }

      // คำนวณคะแนนรวม
      const totalScore = kScore + pScore + aScore;

      students.push({
        student_id: studentId,
        student_name: studentName || `นักเรียน ${studentId}`,
        k_score: kScore,
        p_score: pScore,
        a_score: aScore,
        score: totalScore,
      });
    }

    if (students.length === 0) {
      warnings.push("ไม่พบข้อมูลนักเรียนในไฟล์ (แถว 7-36 ว่างทั้งหมด)");
    }

    return { metadata, students, errors, warnings };
  } catch (err) {
    errors.push(`อ่านไฟล์ไม่สำเร็จ: ${err instanceof Error ? err.message : "Unknown error"}`);
    return { metadata: null, students: [], errors, warnings };
  }
}
