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
import { RUBRIC_DIMENSIONS, NIDET_TYPE_LABELS, type NidetVisit } from "@/types/nidet";
import type { ActionItem } from "@/hooks/useActionItems";

const CW = 9746; // A4 content width (DXA)

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const borderSky = { style: BorderStyle.SINGLE, size: 1, color: "BAE6FD" } as const;
const borderGray = { style: BorderStyle.SINGLE, size: 1, color: "D1D5DB" } as const;
const allSky = { top: borderSky, bottom: borderSky, left: borderSky, right: borderSky };
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
    shading: { fill: "F0F9FF", type: ShadingType.CLEAR },
    children: [b("  " + text, 22, "075985")],
  });
}
function hLine(color = "0369A1", size = 8) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size, color, space: 1 } },
    spacing: { after: 0 },
    children: [],
  });
}
function textBlock(text: string) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 200 },
    children: [tr(text || "—", 22)],
  });
}

function infoCell(label: string, value: string, rightPad = 200) {
  return new TableCell({
    width: { size: Math.floor(CW / 2), type: WidthType.DXA },
    borders: noAllBorder,
    margins: { top: 40, bottom: 40, left: 0, right: rightPad },
    children: [para([tr(label + " : ", 21, "6B7280"), b(value || "—", 21)])],
  });
}

// ── ตารางผลประเมิน 8 มิติ (คะแนน 1–4) ───────────────────────────────────────
function rubricTable(visit: NidetVisit) {
  const cols = [600, 6446, 1350, 1350];
  const headers = ["#", "มิติการจัดการเรียนรู้", "คะแนน", "ระดับ"];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: cols[i], type: WidthType.DXA },
        borders: allSky,
        shading: { fill: "0369A1", type: ShadingType.CLEAR },
        margins: cellPad,
        children: [para([b(h, 20, "FFFFFF")], { alignment: i === 1 ? AlignmentType.LEFT : AlignmentType.CENTER })],
      })
    ),
  });

  const levelLabel = (n: number | null): string => {
    if (n == null) return "—";
    if (n >= 4) return "ดีเยี่ยม";
    if (n === 3) return "ดี";
    if (n === 2) return "พอใช้";
    return "ปรับปรุง";
  };

  const dataRows = RUBRIC_DIMENSIONS.map((dim, idx) => {
    const score = visit[dim.key];
    const cells = [
      { text: String(idx + 1), align: AlignmentType.CENTER },
      { text: dim.label, align: AlignmentType.LEFT },
      { text: score != null ? `${score}/4` : "—", align: AlignmentType.CENTER },
      { text: levelLabel(score), align: AlignmentType.CENTER },
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
          signCell("ลงชื่อครูผู้รับการนิเทศ", ".....................................", "ครูผู้สอน"),
          signCell("ลงชื่อผู้นิเทศ", ".....................................", "ผู้นิเทศ / ครูแกนนำ"),
          signCell("ลงชื่อผู้รับรอง", ".....................................", "ผู้อำนวยการโรงเรียน"),
        ],
      }),
    ],
  });
}

function formatThaiDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  const months = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน",
                  "กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export async function downloadNidetDocx(visit: NidetVisit, item: ActionItem) {
  const isConversation = visit.nidet_type === "conversation";
  const scored = RUBRIC_DIMENSIONS.map((d) => visit[d.key]).filter((v): v is number => v != null);
  const avg = scored.length > 0 ? (scored.reduce((s, n) => s + n, 0) / scored.length).toFixed(2) : "—";
  const gradeClass = [item.grade_level, item.classroom].filter(Boolean).join("/");
  const titleTh = isConversation ? "แบบบันทึกการนิเทศแบบพูดคุย" : "แบบบันทึกการนิเทศการจัดการเรียนรู้";
  const titleEn = isConversation ? "(Coaching Conversation Record)" : "(Classroom Supervision Record)";
  const methodLabel = visit.nidet_type ? NIDET_TYPE_LABELS[visit.nidet_type] : "สังเกตการจัดการเรียนรู้";

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
          para([b(titleTh, 32, "075985")],
            { alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
          para([b(titleEn, 26, "0EA5E9")],
            { alignment: AlignmentType.CENTER, spacing: { after: 20 } }),
          para([tr("โรงเรียนวรนาถวิทยากำแพงเพชร  สำนักงานคณะกรรมการส่งเสริมการศึกษาเอกชน", 22, "374151")],
            { alignment: AlignmentType.CENTER, spacing: { after: 40 } }),
          hLine("0369A1", 12),
          blank(80),

          // Info
          new Table({
            width: { size: CW, type: WidthType.DXA },
            columnWidths: [Math.floor(CW / 2), CW - Math.floor(CW / 2)],
            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideH: noBorder, insideV: noBorder },
            rows: [
              new TableRow({ children: [
                infoCell("ครูผู้รับการนิเทศ", item.teacher_name ?? "—"),
                infoCell("วันที่นิเทศ", formatThaiDate(visit.visit_date), 0),
              ]}),
              new TableRow({ children: [
                infoCell("กลุ่มสาระ / วิชา", item.subject ?? "—"),
                infoCell("ชั้น / ห้อง", gradeClass || "—", 0),
              ]}),
              new TableRow({ children: [
                infoCell("ผู้นิเทศ", visit.supervisor_name ?? "—"),
                infoCell("รูปแบบการนิเทศ", methodLabel, 0),
              ]}),
            ],
          }),
          blank(60),
          para([tr("ประเด็นจากระบบ ATLAS : ", 20, "6B7280"), tr(item.metric_label || item.ai_summary || "—", 20)],
            { indent: { left: 200 }, spacing: { after: 60 } }),
          hLine("BAE6FD", 4),
          blank(60),

          // Section 1 — observation: ตารางคะแนน 8 มิติ; conversation: หมายเหตุ
          ...(isConversation
            ? [
                sectionTitle("๑. รูปแบบการนิเทศ"),
                para([b(NIDET_TYPE_LABELS.conversation, 21, "075985"),
                      tr("  — เน้นการสนทนาแลกเปลี่ยนเพื่อพัฒนาการจัดการเรียนรู้ ไม่มีการให้คะแนนรายมิติ", 19, "6B7280")],
                  { indent: { left: 200 }, spacing: { after: 60 } }),
                blank(60),
              ]
            : [
                sectionTitle("๑. ผลการประเมินการจัดการเรียนรู้ (๘ มิติ · คะแนน ๑–๔)"),
                rubricTable(visit),
                para([tr("คะแนนเฉลี่ยที่ประเมิน : ", 21, "6B7280"), b(`${avg}`, 21, "075985"),
                      tr(scored.length > 0 ? `  (ประเมิน ${scored.length}/8 มิติ)` : "  (ยังไม่ได้ให้คะแนน)", 19, "9CA3AF")],
                  { indent: { left: 200 }, spacing: { before: 80, after: 60 } }),
                blank(60),
              ]),

          // Strengths
          sectionTitle(isConversation ? "๒. สิ่งที่พบ / จุดเด่นจากการพูดคุย" : "๒. จุดเด่น / สิ่งที่ปฏิบัติได้ดี"),
          textBlock(visit.strengths),
          blank(60),

          // Improvements
          sectionTitle(isConversation ? "๓. สาเหตุ / จุดที่ควรพัฒนา" : "๓. จุดที่ควรพัฒนา"),
          textBlock(visit.improvements),
          blank(60),

          // Recommendations
          sectionTitle(isConversation ? "๔. แนวทางที่ตกลงร่วมกัน" : "๔. ข้อเสนอแนะ / แนวทางการพัฒนา"),
          textBlock(visit.recommendations),
          blank(60),

          // Follow-up
          sectionTitle("๕. การติดตามผล"),
          para([tr("วันนัดติดตาม : ", 21, "6B7280"), b(formatThaiDate(visit.follow_up_date), 21),
                tr("    วิธีติดตาม : ", 21, "6B7280"), b(visit.follow_up_method || "—", 21)],
            { indent: { left: 200 }, spacing: { after: 80 } }),
          blank(120),
          hLine("BAE6FD", 4),
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
  const dateStr = (visit.visit_date ?? new Date().toISOString().slice(0, 10)).replace(/-/g, "");
  const teacher = (item.teacher_name ?? "").replace(/\s+/g, "-");
  const gc = [item.grade_level, item.classroom].filter(Boolean).join("");
  const parts = [teacher, "นิเทศ", dateStr, gc, item.subject ?? ""].filter(Boolean);
  a.href = url;
  a.download = `${parts.join("_")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
