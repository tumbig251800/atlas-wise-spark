import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, PageBreak, AlignmentType } from "docx";
import { saveAs } from "file-saver";

interface Props {
  content: string;
  title: string;
}

function parseMarkdownTable(lines: string[]): Table | null {
  if (lines.length < 2) return null;

  const parseRow = (line: string) =>
    line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);

  const headerCells = parseRow(lines[0]);
  // Skip separator line (lines[1])
  const dataRows = lines.slice(2).map(parseRow);

  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, space: 1 },
    bottom: { style: BorderStyle.SINGLE, size: 1, space: 1 },
    left: { style: BorderStyle.SINGLE, size: 1, space: 1 },
    right: { style: BorderStyle.SINGLE, size: 1, space: 1 },
  };

  const createCell = (text: string, isHeader = false) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text, bold: isHeader, size: isHeader ? 22 : 20 })],
          alignment: AlignmentType.CENTER,
        }),
      ],
      width: { size: Math.floor(100 / headerCells.length), type: WidthType.PERCENTAGE },
      shading: isHeader ? { fill: "D9E2F3" } : undefined,
      borders: cellBorders,
    });

  const rows = [
    new TableRow({ children: headerCells.map((c) => createCell(c, true)) }),
    ...dataRows.map(
      (cells) =>
        new TableRow({
          children: cells.map((c) => createCell(c)),
        })
    ),
  ];

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

export function ExportDocButton({ content, title }: Props) {
  const exportDoc = async () => {
    const lines = content.split("\n");
    const children: (Paragraph | Table)[] = [];
    let i = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trim();

      // Page break / horizontal rule
      if (/^-{3,}$/.test(trimmed)) {
        children.push(
          new Paragraph({
            children: [new PageBreak()],
          })
        );
        i++;
        continue;
      }

      // Markdown table detection
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
          tableLines.push(lines[i].trim());
          i++;
        }
        const table = parseMarkdownTable(tableLines);
        if (table) {
          children.push(table);
          children.push(new Paragraph({ text: "" }));
        }
        continue;
      }

      if (trimmed.startsWith("### ")) {
        children.push(new Paragraph({ text: trimmed.slice(4), heading: HeadingLevel.HEADING_3 }));
      } else if (trimmed.startsWith("## ")) {
        children.push(new Paragraph({ text: trimmed.slice(3), heading: HeadingLevel.HEADING_2 }));
      } else if (trimmed.startsWith("# ")) {
        children.push(new Paragraph({ text: trimmed.slice(2), heading: HeadingLevel.HEADING_1 }));
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        children.push(new Paragraph({
          children: [new TextRun(trimmed.slice(2))],
          bullet: { level: 0 },
        }));
      } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2, -2), bold: true })],
        }));
      } else if (trimmed.includes("**")) {
        // Mixed bold inline: parse **bold** and normal text
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        const runs = parts.filter(Boolean).map((part) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return new TextRun({ text: part.slice(2, -2), bold: true });
          }
          return new TextRun(part);
        });
        children.push(new Paragraph({ children: runs }));
    } else if (trimmed.includes("[กรอบวาดรูป]") || trimmed.includes("[DRAW_BOX]")) {
        // Drawing box — bordered paragraph with ~5-7cm spacing for Special Care students
        children.push(new Paragraph({
          children: [new TextRun({ text: "พื้นที่สำหรับวาดรูป / ระบายสี", italics: true, size: 20, color: "888888" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 2800 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, space: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1, space: 1 },
            left: { style: BorderStyle.SINGLE, size: 1, space: 1 },
            right: { style: BorderStyle.SINGLE, size: 1, space: 1 },
          },
        }));
      } else if (trimmed.includes("[DOTTED_LINE]")) {
        // Dotted line — hint line for students
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.replace("[DOTTED_LINE]", "").trim() || "...", size: 20 })],
          spacing: { after: 400 },
          border: {
            bottom: { style: BorderStyle.DOTTED, size: 1, space: 1 },
          },
        }));
      } else if (/\[Canva Element:/.test(trimmed)) {
        // Canva Element placeholder — italic grey text in dotted border
        const elementName = trimmed.match(/\[Canva Element:\s*(.*?)\]/)?.[1] || "";
        children.push(new Paragraph({
          children: [new TextRun({ text: `[แทรกรูป: ${elementName}]`, italics: true, size: 18, color: "666666" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 600 },
          border: {
            top: { style: BorderStyle.DOTTED, size: 1, space: 1 },
            bottom: { style: BorderStyle.DOTTED, size: 1, space: 1 },
            left: { style: BorderStyle.DOTTED, size: 1, space: 1 },
            right: { style: BorderStyle.DOTTED, size: 1, space: 1 },
          },
        }));
      } else if (/^\d+\.\s/.test(trimmed)) {
        // Numbered list detection
        const text = trimmed.replace(/^\d+\.\s/, "");
        const num = trimmed.match(/^(\d+)\./)?.[1] || "1";
        children.push(new Paragraph({
          children: [new TextRun(`${num}. ${text}`)],
          indent: { left: 360 },
        }));
      } else if (trimmed.includes("____________")) {
        // Answer lines — add extra spacing for writing
        children.push(new Paragraph({
          children: [new TextRun(trimmed)],
          spacing: { after: 800 },
        }));
      } else if (trimmed) {
        children.push(new Paragraph({ children: [new TextRun(trimmed)] }));
      } else {
        children.push(new Paragraph({ text: "" }));
      }

      i++;
    }

    const doc = new Document({
      sections: [{ properties: {}, children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title || "แผนการสอน"}.docx`);
  };

  if (!content) return null;

  return (
    <Button variant="outline" size="sm" onClick={exportDoc}>
      <FileDown className="h-4 w-4 mr-2" />
      ดาวน์โหลด .docx
    </Button>
  );
}
