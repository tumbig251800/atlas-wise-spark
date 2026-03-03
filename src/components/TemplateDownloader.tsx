/**
 * Phase D Stage 1: Download blank All-in-One competency template (XLSX/CSV)
 * Independent download — works even when unit_assessments is empty.
 * Teachers copy-paste student lists and fill scores manually.
 */
import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { generateBlankCompetencyTemplate, downloadAsXLSX, downloadAsCSV } from "@/lib/competencyTemplate";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

export function TemplateDownloader() {
  const { user } = useAuth();

  const handleDownload = useCallback(
    (format: "xlsx" | "csv") => {
      const rows = generateBlankCompetencyTemplate();
      const base = `competency-template-${new Date().toISOString().slice(0, 10)}`;
      if (format === "xlsx") {
        downloadAsXLSX(rows, `${base}.xlsx`);
      } else {
        downloadAsCSV(rows, `${base}.csv`);
      }
    },
    []
  );

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Download className="h-4 w-4" />
        <span>ดาวน์โหลดแม่แบบ All-in-One (คะแนนวิชา + สมรรถนะ A1–A6) — กรอกหรือวางรายชื่อนักเรียนเอง</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!user}
          onClick={() => handleDownload("xlsx")}
        >
          <FileSpreadsheet className="h-4 w-4" />
          ดาวน์โหลด XLSX
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!user}
          onClick={() => handleDownload("csv")}
        >
          <FileText className="h-4 w-4" />
          ดาวน์โหลด CSV
        </Button>
      </div>
    </div>
  );
}
