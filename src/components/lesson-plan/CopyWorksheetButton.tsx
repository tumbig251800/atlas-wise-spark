import { Button } from "@/components/ui/button";
import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  content: string;
}

function extractWorksheet(content: string, sheetNumber: 1 | 2): string | null {
  const patterns = [
    new RegExp(`## ใบงานชุดที่ ${sheetNumber}[^\\n]*\\n([\\s\\S]*?)(?=\\n## ใบงานชุดที่ |\\n---\\s*$|$)`),
    new RegExp(`## ใบงานชุดที่ ${sheetNumber}[^\\n]*\\n([\\s\\S]*?)$`),
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1]?.trim()) {
      return match[1].trim();
    }
  }
  return null;
}

function formatAsLayers(raw: string): string {
  const lines = raw.split("\n");
  const headerLines: string[] = [];
  const instructionLines: string[] = [];
  const questionLines: string[] = [];
  const designNotes: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    // Layer 4: Design notes (collect first, don't skip — line may also match other layers)
    if (/\[Canva Element:/.test(t) || t.includes("[DRAW_BOX]") || t.includes("[DOTTED_LINE]")) {
      designNotes.push(t);
    }
    // Layer 1: Header fields
    if (/^\*\*(ชื่อ|เลขที่|ชั้น|ห้อง|วิชา|เรื่อง)/.test(t) || /^--- Layer 1/.test(t)) {
      headerLines.push(t.replace(/^--- Layer \d.*---\s*/, ""));
      continue;
    }
    // Layer 2: Instructions
    if (/^\*\*คำชี้แจง/.test(t) || /^--- Layer 2/.test(t)) {
      instructionLines.push(t.replace(/^--- Layer \d.*---\s*/, ""));
      continue;
    }
    // Layer markers (skip)
    if (/^--- Layer \d/.test(t)) continue;
    // Layer 3: Numbered questions
    if (/^\d+\./.test(t)) {
      questionLines.push(t);
      continue;
    }
  }

  let result = "";
  if (headerLines.length) result += `=== Layer 1: Header ===\n${headerLines.join("\n")}\n\n`;
  if (instructionLines.length) result += `=== Layer 2: Instructions ===\n${instructionLines.join("\n")}\n\n`;
  if (questionLines.length) result += `=== Layer 3: Questions ===\n${questionLines.join("\n")}\n\n`;
  if (designNotes.length) result += `=== Layer 4: Design Notes ===\n${designNotes.join("\n")}\n`;

  return result.trim() || raw; // fallback to raw if parsing fails
}

export function CopyWorksheetButton({ content }: Props) {
  const worksheet1 = extractWorksheet(content, 1);
  const worksheet2 = extractWorksheet(content, 2);

  if (!worksheet1 && !worksheet2) return null;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      const formatted = formatAsLayers(text);
      await navigator.clipboard.writeText(formatted);
      toast.success(`ATLAS Smart-Copy: คัดลอก${label}แล้ว พร้อมวางใน Canva`);
    } catch {
      toast.error("ไม่สามารถคัดลอกได้");
    }
  };

  return (
    <>
      {worksheet1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(worksheet1, "ใบงานปกติ")}
        >
          <ClipboardCopy className="h-4 w-4 mr-2" />
          ATLAS Smart-Copy ใบงานปกติ
        </Button>
      )}
      {worksheet2 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(worksheet2, "ใบงาน Scaffolding")}
        >
          <ClipboardCopy className="h-4 w-4 mr-2" />
          ATLAS Smart-Copy ใบงาน Scaffolding
        </Button>
      )}
    </>
  );
}
