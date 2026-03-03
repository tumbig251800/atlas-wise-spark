import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SmartReport } from "@/types/smartReport";

interface Props {
  report: SmartReport;
}

const safe = (val: unknown, fallback = "—"): string => {
  if (val === null || val === undefined || String(val).trim() === "") return fallback;
  return String(val);
};

export function SmartReportExportButton({ report }: Props) {
  const exportCSV = () => {
    const { gapValidations, unitTeaching, unitAssessments } = report;
    const teachingMap = new Map(unitTeaching.map((u) => [u.unitKey, u]));
    const assessmentMap = new Map(unitAssessments.map((a) => [a.unitKey, a]));

    const headers = [
      "หน่วย",
      "Gap หลัก",
      "Mastery เฉลี่ย",
      "คะแนนสอบเฉลี่ย (%)",
      "Verdict",
    ];

    const rows = gapValidations.map((g) => {
      const t = teachingMap.get(g.unitKey);
      const a = assessmentMap.get(g.unitKey);
      return [
        g.displayName,
        g.teachingGap,
        t ? t.avgMastery.toFixed(1) : "—",
        g.assessmentAvgPct != null ? g.assessmentAvgPct.toFixed(1) : "—",
        g.verdict,
      ];
    });

    const csv =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasData = report.gapValidations.length > 0;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={exportCSV}
      disabled={!hasData}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
