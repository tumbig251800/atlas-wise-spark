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
          children: [new TextRun({ text, bold: isHeader, size: 32, font: "TH Sarabun New" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 0, line: 276 },
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
    let consecutiveBlankCount = 0;

    while (i < lines.length) {
      const trimmed = lines[i].trim();

      // Page break only for worksheet separators (ใบงานชุดที่ 2)
      if (/^-{3,}$/.test(trimmed)) {
        // Check if next few lines contain "ใบงานชุดที่" or "Layer"
        const nextLines = lines.slice(i + 1, i + 5).join(" ");
        if (nextLines.includes("ใบงานชุดที่") || nextLines.includes("Layer")) {
          children.push(
            new Paragraph({
              children: [new PageBreak()],
              spacing: { after: 0, line: 276 },
            })
          );
        }
        // Otherwise ignore the --- line (don't add page break)
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
          children.push(new Paragraph({
            children: [new TextRun({ text: "", size: 32, font: "TH Sarabun New" })],
            spacing: { after: 0, line: 276 },
          }));
        }
        continue;
      }

      // Numbered section headings (1. 2. 3. etc.)
      if (/^[0-9]+\.\s/.test(trimmed) && !/^[0-9]+\.\s.*:/.test(trimmed)) {
        consecutiveBlankCount = 0;
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed, bold: true, size: 32, font: "TH Sarabun New" })],
          spacing: { before: 120, after: 0, line: 276 },
        }));
      } else if (trimmed.startsWith("### ")) {
        consecutiveBlankCount = 0;
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.slice(4), bold: true, size: 32, font: "TH Sarabun New" })],
          spacing: { before: 120, after: 0, line: 276 },
        }));
      } else if (trimmed.startsWith("## ")) {
        consecutiveBlankCount = 0;
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.slice(3), bold: true, size: 32, font: "TH Sarabun New" })],
          spacing: { before: 120, after: 0, line: 276 },
        }));
      } else if (trimmed.startsWith("# ")) {
        consecutiveBlankCount = 0;
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2), bold: true, size: 32, font: "TH Sarabun New" })],
          spacing: { before: 120, after: 0, line: 276 },
        }));
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        consecutiveBlankCount = 0;
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2), size: 32, font: "TH Sarabun New" })],
          bullet: { level: 0 },
          spacing: { after: 0, line: 276 },
        }));
      } else if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        consecutiveBlankCount = 0;
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.slice(2, -2), bold: true, size: 32, font: "TH Sarabun New" })],
          spacing: { after: 0, line: 276 },
        }));
      } else if (trimmed.includes("**")) {
        consecutiveBlankCount = 0;
        // Mixed bold inline: parse **bold** and normal text
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        const runs = parts.filter(Boolean).map((part) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return new TextRun({ text: part.slice(2, -2), bold: true, size: 32, font: "TH Sarabun New" });
          }
          return new TextRun({ text: part, size: 32, font: "TH Sarabun New" });
        });
        children.push(new Paragraph({ children: runs, spacing: { after: 0, line: 276 } }));
    } else if (trimmed.includes("[กรอบวาดรูป]") || trimmed.includes("[DRAW_BOX]")) {
        consecutiveBlankCount = 0;
        // Drawing box — bordered paragraph with ~5-7cm spacing for Special Care students
        children.push(new Paragraph({
          children: [new TextRun({ text: "พื้นที่สำหรับวาดรูป / ระบายสี", italics: true, size: 28, color: "888888", font: "TH Sarabun New" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 2800, line: 276 },
          border: {
            top: { style: BorderStyle.SINGLE, size: 1, space: 1 },
            bottom: { style: BorderStyle.SINGLE, size: 1, space: 1 },
            left: { style: BorderStyle.SINGLE, size: 1, space: 1 },
            right: { style: BorderStyle.SINGLE, size: 1, space: 1 },
          },
        }));
      } else if (trimmed.includes("[DOTTED_LINE]")) {
        consecutiveBlankCount = 0;
        // Dotted line — hint line for students
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed.replace("[DOTTED_LINE]", "").trim() || "...", size: 32, font: "TH Sarabun New" })],
          spacing: { after: 0, line: 276 },
          border: {
            bottom: { style: BorderStyle.DOTTED, size: 1, space: 1 },
          },
        }));
      } else if (/\[Canva Element:/.test(trimmed)) {
        consecutiveBlankCount = 0;
        // Canva Element placeholder — italic grey text in dotted border
        const elementName = trimmed.match(/\[Canva Element:\s*(.*?)\]/)?.[1] || "";
        children.push(new Paragraph({
          children: [new TextRun({ text: `[แทรกรูป: ${elementName}]`, italics: true, size: 28, color: "666666", font: "TH Sarabun New" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 600, line: 276 },
          border: {
            top: { style: BorderStyle.DOTTED, size: 1, space: 1 },
            bottom: { style: BorderStyle.DOTTED, size: 1, space: 1 },
            left: { style: BorderStyle.DOTTED, size: 1, space: 1 },
            right: { style: BorderStyle.DOTTED, size: 1, space: 1 },
          },
        }));
      } else if (/^\d+\.\s/.test(trimmed)) {
        consecutiveBlankCount = 0;
        // Numbered list detection (inside content, not section headings)
        const text = trimmed.replace(/^\d+\.\s/, "");
        const num = trimmed.match(/^(\d+)\./)?.[1] || "1";
        children.push(new Paragraph({
          children: [new TextRun({ text: `${num}. ${text}`, size: 32, font: "TH Sarabun New" })],
          indent: { left: 360 },
          spacing: { after: 0, line: 276 },
        }));
      } else if (trimmed.includes("____________")) {
        consecutiveBlankCount = 0;
        // Answer lines — add extra spacing for writing
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed, size: 32, font: "TH Sarabun New" })],
          spacing: { after: 800, line: 276 },
        }));
      } else if (trimmed) {
        consecutiveBlankCount = 0;
        children.push(new Paragraph({
          children: [new TextRun({ text: trimmed, size: 32, font: "TH Sarabun New" })],
          spacing: { after: 0, line: 276 },
        }));
      } else {
        // Blank line - only add if not consecutive
        consecutiveBlankCount++;
        if (consecutiveBlankCount === 1) {
          children.push(new Paragraph({
            children: [new TextRun({ text: "", size: 32, font: "TH Sarabun New" })],
            spacing: { after: 0, line: 276 },
          }));
        }
      }

      i++;
    }

    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "TH Sarabun New",
              size: 32, // 16pt = 32 half-points
            },
            paragraph: {
              spacing: {
                line: 276, // 1.15 line spacing (276 / 240 = 1.15)
                after: 0,
                before: 0,
              },
            },
          },
          heading1: {
            run: {
              font: "TH Sarabun New",
              size: 32,
              bold: true,
            },
            paragraph: {
              spacing: {
                line: 276,
                after: 0,
                before: 120,
              },
            },
          },
          heading2: {
            run: {
              font: "TH Sarabun New",
              size: 32,
              bold: true,
            },
            paragraph: {
              spacing: {
                line: 276,
                after: 0,
                before: 120,
              },
            },
          },
          heading3: {
            run: {
              font: "TH Sarabun New",
              size: 32,
              bold: true,
            },
            paragraph: {
              spacing: {
                line: 276,
                after: 0,
                before: 120,
              },
            },
          },
          listParagraph: {
            run: {
              font: "TH Sarabun New",
              size: 32,
            },
            paragraph: {
              spacing: {
                line: 276,
                after: 0,
              },
            },
          },
        },
      },
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
