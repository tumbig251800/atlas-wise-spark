import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
  Header,
  PageNumber,
} from "docx";
import type { Tables } from "@/integrations/supabase/types";
import { isEmptyIdsValue } from "@/lib/studentIds";

type TeachingLog = Tables<"teaching_logs">;

const FONT = "TH SarabunPSK";
const CW = 9746; // A4 content width (DXA)
const LABEL_W = 2600;

// ครูอ่านไฟล์นี้เอง → ใช้คำไทยนำ วงเล็บชื่อย่อเดิมไว้ให้เชื่อมกับหน้าจอ ATLAS ได้
export const GAP_LABEL_TH: Record<string, string> = {
  success: "สอนได้ตามเป้าหมาย (Success)",
  "k-gap": "ด้านความรู้ (K-Gap)",
  "p-gap": "ด้านทักษะ/กระบวนการ (P-Gap)",
  "a-gap": "ด้านเจตคติ/แรงจูงใจ (A1-Gap)",
  "a2-gap": "พฤติกรรมเสี่ยงสูง (A2-Gap)",
  "system-gap": "ด้านระบบ/สภาพแวดล้อม (System-Gap)",
};

export const ACTIVITY_LABEL_TH: Record<string, string> = {
  passive: "ฟัง/รับความรู้ (ระดับ 1)",
  active: "ลงมือปฏิบัติ (ระดับ 2)",
  constructive: "สร้างสรรค์ชิ้นงาน/ความรู้ (ระดับ 3)",
};

export interface TeachingLogsDocxMeta {
  ownerLabel: string;
  filterLines?: string[];
  filenameHint?: string;
}

function thaiDate(dateStr: string | null | undefined) {
  if (!dateStr) return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });
}

function run(text: string, opts: { size?: number; bold?: boolean; color?: string } = {}) {
  return new TextRun({ text, font: FONT, size: opts.size ?? 30, bold: opts.bold, color: opts.color });
}

/** Keeps teacher-typed line breaks instead of collapsing them into one line. */
function multiline(text: string, opts: { size?: number; bold?: boolean } = {}) {
  const lines = text.split(/\r?\n/);
  return lines.map((line, i) =>
    new TextRun({ text: line, font: FONT, size: opts.size ?? 30, bold: opts.bold, break: i > 0 ? 1 : undefined }),
  );
}

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" } as const;
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 120, right: 120 };

function fieldRow(label: string, value: string) {
  return new TableRow({
    cantSplit: false,
    children: [
      new TableCell({
        width: { size: LABEL_W, type: WidthType.DXA },
        borders,
        margins: cellMargins,
        shading: { fill: "EEF3FB", type: ShadingType.CLEAR },
        children: [new Paragraph({ children: [run(label, { bold: true })] })],
      }),
      new TableCell({
        width: { size: CW - LABEL_W, type: WidthType.DXA },
        borders,
        margins: cellMargins,
        children: [new Paragraph({ children: multiline(value || "-") })],
      }),
    ],
  });
}

function logTable(log: TeachingLog) {
  const minor = (log.minor_gaps ?? []).filter((g) => g !== log.major_gap).map((g) => GAP_LABEL_TH[g] ?? g);

  const rows: [string, string][] = [
    ["วันที่สอน", thaiDate(log.teaching_date)],
    ["ผู้สอน", log.teacher_name ?? "-"],
    ["วิชา", log.subject ?? "-"],
    ["ระดับชั้น / ห้อง", `${log.grade_level ?? "-"} / ${log.classroom ?? "-"}`],
    ["หน่วยการเรียนรู้", log.learning_unit ?? log.unit_name ?? "-"],
    ["หัวข้อ / เรื่องที่สอน", log.topic ?? log.lesson_topic ?? "-"],
    ["จำนวนนักเรียน", log.total_students != null ? `${log.total_students} คน` : "-"],
    ["ระดับความเข้าใจของนักเรียน", log.mastery_score != null ? `${log.mastery_score} จาก 5` : "-"],
    ["ปัญหาหลักที่พบ", GAP_LABEL_TH[log.major_gap] ?? log.major_gap],
  ];
  if (minor.length > 0) rows.push(["ปัญหารอง", minor.join(", ")]);
  rows.push(
    ["รูปแบบกิจกรรม", ACTIVITY_LABEL_TH[log.activity_mode] ?? log.activity_mode ?? "-"],
    ["ประเด็นปัญหาสำคัญ", log.key_issue ?? "-"],
    ["แนวทางแก้ไขครั้งต่อไป", log.next_strategy ?? "-"],
  );
  if (!isEmptyIdsValue(log.remedial_ids)) rows.push(["นักเรียนที่ต้องสอนซ่อมเสริม", log.remedial_ids ?? ""]);
  if (!isEmptyIdsValue(log.health_care_ids)) rows.push(["นักเรียนที่ต้องดูแลเป็นพิเศษ", log.health_care_ids ?? ""]);
  if (log.classroom_management) rows.push(["การบริหารจัดการชั้นเรียน", log.classroom_management]);
  rows.push(["สะท้อนผลการสอน", log.reflection ?? "-"]);

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [LABEL_W, CW - LABEL_W],
    rows: rows.map(([l, v]) => fieldRow(l, v)),
  });
}

export function buildTeachingLogsDocument(logs: TeachingLog[], meta: TeachingLogsDocxMeta) {
  const sorted = [...logs].sort((a, b) => a.teaching_date.localeCompare(b.teaching_date));
  const first = sorted[0]?.teaching_date;
  const last = sorted[sorted.length - 1]?.teaching_date;

  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [run("บันทึกหลังการสอน", { size: 40, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [run("ระบบ ATLAS · โรงเรียนวรนาถวิทยากำแพงเพชร", { size: 28, color: "555555" })],
    }),
    new Paragraph({ children: [run("ผู้สอน : ", { bold: true }), run(meta.ownerLabel || "-")] }),
    new Paragraph({ children: [run("จำนวนบันทึก : ", { bold: true }), run(`${logs.length} รายการ`)] }),
    new Paragraph({
      children: [run("ช่วงวันที่ : ", { bold: true }), run(first ? `${thaiDate(first)} ถึง ${thaiDate(last)}` : "-")],
    }),
    ...(meta.filterLines ?? []).map((line) => new Paragraph({ children: [run(line)] })),
  ];

  sorted.forEach((log, idx) => {
    children.push(
      new Paragraph({
        spacing: { before: 360, after: 120 },
        keepNext: true,
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E40AF", space: 1 } },
        children: [run(`รายการที่ ${idx + 1}  ·  ${thaiDate(log.teaching_date)}  ·  ${log.subject ?? ""}`, { size: 32, bold: true, color: "1E3A8A" })],
      }),
      logTable(log),
    );
  });

  return new Document({
    styles: { default: { document: { run: { font: FONT, size: 30 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  run("บันทึกหลังการสอน · หน้า ", { size: 22, color: "9CA3AF" }),
                  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 22, color: "9CA3AF" }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

export async function downloadTeachingLogsDocx(logs: TeachingLog[], meta: TeachingLogsDocxMeta) {
  const blob = await Packer.toBlob(buildTeachingLogsDocument(logs, meta));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  const hint = (meta.filenameHint ?? "").trim().replace(/[\\/:*?"<>|\s]+/g, "-");
  a.href = url;
  a.download = `บันทึกหลังสอน${hint ? `-${hint}` : ""}-${stamp}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
