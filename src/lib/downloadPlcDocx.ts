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
  VerticalAlign,
  Header,
  PageNumber,
} from "docx";
import type { PlcSession } from "@/types/plc";
import type { ActionItem } from "@/hooks/useActionItems";

const CW = 9746; // A4 content width (DXA)

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borderLight = { style: BorderStyle.SINGLE, size: 1, color: "BFDBFE" } as const;
const borderGray = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" } as const;
const allBlue = { top: borderLight, bottom: borderLight, left: borderLight, right: borderLight };
const allGray = { top: borderGray, bottom: borderGray, left: borderGray, right: borderGray };
const noAllBorder = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellPad = { top: 80, bottom: 80, left: 120, right: 120 };

function tr(text: string, size = 22, color = "374151", bold = false) {
  return new TextRun({ text, size, font: "TH SarabunPSK", color, bold });
}
function b(text: string, size = 22, color = "111827") {
  return tr(text, size, color, true);
}

function para(children: TextRun[], opts: Record<string, unknown> = {}) {
  return new Paragraph({ children, ...opts });
}

function blank(after = 80) {
  return new Paragraph({ spacing: { after }, children: [] });
}

function sectionTitle(text: string) {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    shading: { fill: "EFF6FF", type: ShadingType.CLEAR },
    children: [b("  " + text, 22, "1E3A8A")],
  });
}

function hLine(color = "1E40AF", size = 8) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
    spacing: { after: 0 },
    children: [],
  });
}

function fieldLine(label: string, value: string) {
  return para([tr(label + " : ", 21, "6B7280"), b(value || "—", 21)], {
    spacing: { after: 60 },
    indent: { left: 200 },
  });
}

function textBlock(text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 200 },
    children: [tr(text || "—", 22)],
  });
}

function actionItemsTable(items: ActionItem[]) {
  const cols = [480, 1200, 2300, 2566, 700, 820];
  const headers = ["#", "ชั้น/ห้อง", "วิชา", "ตัวชี้วัด", "ค่า", "ระดับ"];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: cols[i], type: WidthType.DXA },
        borders: allBlue,
        shading: { fill: "1E40AF", type: ShadingType.CLEAR },
        margins: cellPad,
        children: [para([b(h, 20, "FFFFFF")], { alignment: AlignmentType.CENTER })],
      })
    ),
  });

  const dataRows = items.map((item, idx) => {
    const cells = [
      { text: String(idx + 1), align: AlignmentType.CENTER },
      { text: `${item.grade_level ?? ""}/${item.classroom ?? ""}`, align: AlignmentType.CENTER },
      { text: item.subject ?? "—", align: AlignmentType.LEFT },
      { text: item.metric_label ?? "—", align: AlignmentType.LEFT },
      { text: item.metric_value != null ? String(item.metric_value) : "—", align: AlignmentType.CENTER },
      { text: (item.severity ?? "—").toUpperCase(), align: AlignmentType.CENTER },
    ];
    return new TableRow({
      children: cells.map((c, i) =>
        new TableCell({
          width: { size: cols[i], type: WidthType.DXA },
          borders: allGray,
          shading: { fill: idx % 2 === 0 ? "F9FAFB" : "FFFFFF", type: ShadingType.CLEAR },
          margins: cellPad,
          children: [para([tr(c.text, 21)], { alignment: c.align })],
        })
      ),
    });
  });

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: cols,
    rows: [headerRow, ...dataRows],
  });
}

function signatureTable() {
  const third = Math.floor(CW / 3);
  const signCell = (label: string, name: string, position: string) =>
    new TableCell({
      width: { size: third, type: WidthType.DXA },
      borders: noAllBorder,
      margins: cellPad,
      verticalAlign: VerticalAlign.TOP,
      children: [
        para([tr(label, 20, "6B7280")], { alignment: AlignmentType.CENTER }),
        blank(160),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: "374151" } },
          spacing: { before: 0, after: 40 },
          children: [tr("( " + name + " )", 21)],
        }),
        para([tr(position, 20, "6B7280")], { alignment: AlignmentType.CENTER }),
      ],
    });

  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: [third, third, CW - third * 2],
    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
    rows: [
      new TableRow({
        children: [
          signCell("ลงชื่อผู้บันทึก", ".....................................", "ครูผู้รับผิดชอบ"),
          signCell("ลงชื่อผู้รับรอง", ".....................................", "หัวหน้าฝ่ายวิชาการ"),
          signCell("ลงชื่อผู้ตรวจ", ".....................................", "ผู้อำนวยการโรงเรียน"),
        ],
      }),
    ],
  });
}

function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

export async function downloadPlcDocx(session: Partial<PlcSession>, items: ActionItem[]) {
  const memberNames = (session.members ?? []).map((m) => m.teacher_name || m.teacher_id).join(", ");
  const outcomeMap: Record<string, string> = {
    continue_plc: "ดำเนินการต่อเนื่อง (Continue PLC)",
    resolved: "แก้ไขแล้ว (Resolved)",
    need_supervision: "ต้องติดตาม (Need Supervision)",
  };

  const doc = new Document({
    styles: {
      default: { document: { run: { font: "TH SarabunPSK", size: 22 } } },
    },
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
                spacing: { after: 0 },
                children: [
                  tr("ระบบ ATLAS · โรงเรียนวรนาถวิทยากำแพงเพชร   หน้า", 18, "9CA3AF"),
                  new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "TH SarabunPSK", color: "9CA3AF" }),
                ],
              }),
            ],
          }),
        },
        children: [
          // Title
          para([b("บันทึกกิจกรรมชุมชนแห่งการเรียนรู้ทางวิชาชีพ", 32, "1E3A8A")],
            { alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
          para([b("(Professional Learning Community : PLC)", 26, "3B82F6")],
            { alignment: AlignmentType.CENTER, spacing: { after: 20 } }),
          para([tr("โรงเรียนวรนาถวิทยากำแพงเพชร  สำนักงานคณะกรรมการส่งเสริมการศึกษาเอกชน", 22, "374151")],
            { alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
          hLine("1E40AF", 12),
          blank(80),

          // Info
          new Table({
            width: { size: CW, type: WidthType.DXA },
            columnWidths: [Math.floor(CW / 2), CW - Math.floor(CW / 2)],
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
            rows: [
              new TableRow({ children: [
                new TableCell({ width: { size: Math.floor(CW/2), type: WidthType.DXA }, borders: noAllBorder, margins: { top:40, bottom:40, left:0, right:200 },
                  children: [para([tr("ชื่อกลุ่มกิจกรรม : ", 21, "6B7280"), b(session.topic ? session.topic.slice(0, 30) : "—", 21)])] }),
                new TableCell({ width: { size: CW - Math.floor(CW/2), type: WidthType.DXA }, borders: noAllBorder, margins: { top:40, bottom:40, left:0, right:0 },
                  children: [para([tr("วันที่ : ", 21, "6B7280"), b(formatThaiDate(session.session_date), 21)])] }),
              ]}),
              new TableRow({ children: [
                new TableCell({ width: { size: Math.floor(CW/2), type: WidthType.DXA }, borders: noAllBorder, margins: { top:40, bottom:40, left:0, right:200 },
                  children: [para([tr("ผู้นำ PLC : ", 21, "6B7280"), b(session.facilitator_name || "—", 21)])] }),
                new TableCell({ width: { size: CW - Math.floor(CW/2), type: WidthType.DXA }, borders: noAllBorder, margins: { top:40, bottom:40, left:0, right:0 },
                  children: [para([tr("เวลา : ", 21, "6B7280"), b(session.duration_minutes ? `${session.duration_minutes} นาที` : "—", 21)])] }),
              ]}),
            ],
          }),
          blank(80),
          hLine("BFDBFE", 4),
          blank(60),

          // Members
          sectionTitle("รายชื่อสมาชิกที่เข้าร่วมกิจกรรม"),
          fieldLine("จำนวนสมาชิก", `${(session.members ?? []).length} คน`),
          para([tr("สมาชิก : ", 21, "6B7280"), b(memberNames || "—", 21)],
            { spacing: { after: 80 }, indent: { left: 200 } }),
          blank(60),

          // ATLAS data
          sectionTitle("ข้อมูลจากระบบ ATLAS — รายการปัญหาที่เชื่อมโยง"),
          para([tr("ข้อมูลนี้ดึงอัตโนมัติจากระบบ ATLAS ณ วันที่ประชุม", 18, "9CA3AF")],
            { spacing: { after: 60 }, indent: { left: 200 } }),
          items.length > 0 ? actionItemsTable(items) : textBlock("—"),
          blank(100),

          // Problem
          sectionTitle("1. ประเด็นปัญหาที่จะพัฒนา  (เน้นคุณภาพผู้เรียน)"),
          textBlock(session.problem_statement || "—"),
          blank(80),

          // Cause
          sectionTitle("2. สาเหตุของปัญหา"),
          textBlock(session.root_cause || "—"),
          blank(80),

          // Knowledge
          sectionTitle("3. ความรู้ / หลักการที่นำมาใช้ / แนวทางการแก้ปัญหา"),
          textBlock(session.approach || "—"),
          blank(80),

          // Action
          sectionTitle("4. การออกแบบกิจกรรม / เครื่องมือ / วิธีการเพื่อแก้ปัญหา"),
          textBlock(session.action_steps || "—"),
          blank(80),

          // Outcome + follow up
          sectionTitle("5. ผลลัพธ์และการติดตาม"),
          fieldLine("ผลลัพธ์ PLC", outcomeMap[session.outcome_type ?? "continue_plc"] ?? "—"),
          fieldLine("วันนัด PLC ครั้งต่อไป", formatThaiDate(session.next_plc_date)),
          blank(80),

          // Evidence
          sectionTitle("6. ภาพ / ร่องรอย / หลักฐานประกอบการ PLC"),
          para([tr("(แนบภาพถ่าย / เอกสารประกอบด้านหลัง)", 18, "9CA3AF")],
            { spacing: { after: 20 }, indent: { left: 200 } }),
          new Table({
            width: { size: CW, type: WidthType.DXA },
            columnWidths: [CW],
            rows: [new TableRow({ children: [new TableCell({
              width: { size: CW, type: WidthType.DXA },
              borders: allGray,
              margins: cellPad,
              children: [blank(400)],
            })]})],
          }),
          blank(160),
          hLine("BFDBFE", 4),
          blank(120),

          // Signatures
          signatureTable(),

          blank(80),
          para([tr("* เอกสารนี้สร้างอัตโนมัติจากระบบ ATLAS Intelligence Platform · โรงเรียนวรนาถวิทยากำแพงเพชร", 18, "9CA3AF")],
            { alignment: AlignmentType.CENTER }),
          para([tr("ใช้เป็นหลักฐานประกอบแฟ้ม SAR และการนิเทศภายใน", 18, "9CA3AF")],
            { alignment: AlignmentType.CENTER }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = (session.session_date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const firstItem = items[0];
  const grade = firstItem?.grade_level ?? "";
  const classroom = firstItem?.classroom ?? "";
  const subject = firstItem?.subject ?? "";
  const teacher = (session.facilitator_name ?? "").replace(/\s+/g, "-");
  const gradeClass = [grade, classroom].filter(Boolean).join("");
  const parts = [teacher, "PLC", dateStr, gradeClass, subject].filter(Boolean);
  a.href = url;
  a.download = `${parts.join("_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
