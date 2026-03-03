import { BarChart3, BookOpen, Users } from "lucide-react";
import type { SmartReport } from "@/types/smartReport";

interface Props {
  report: SmartReport;
}

export function SummaryStatsBar({ report }: Props) {
  const unitCount =
    new Set([
      ...report.unitTeaching.map((u) => u.unitKey),
      ...report.unitAssessments.map((u) => u.unitKey),
    ]).size;

  const avgScore =
    report.unitAssessments.length > 0
      ? report.unitAssessments.reduce((s, u) => s + u.avgScorePct, 0) /
        report.unitAssessments.length
      : null;

  const highRisk = report.studentRisks.filter((r) => r.risk === "high").length;

  return (
    <div className="flex flex-wrap gap-4">
      <div className="glass-card px-4 py-3 flex items-center gap-3 min-w-[140px]">
        <BookOpen className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">หน่วยการเรียนรู้</p>
          <p className="text-lg font-semibold">{unitCount}</p>
        </div>
      </div>
      <div className="glass-card px-4 py-3 flex items-center gap-3 min-w-[140px]">
        <BarChart3 className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">คะแนนเฉลี่ย</p>
          <p className="text-lg font-semibold">
            {avgScore != null ? `${avgScore.toFixed(1)}%` : "—"}
          </p>
        </div>
      </div>
      <div className="glass-card px-4 py-3 flex items-center gap-3 min-w-[140px]">
        <Users className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">นักเรียนเสี่ยงสูง</p>
          <p className="text-lg font-semibold">{highRisk}</p>
        </div>
      </div>
    </div>
  );
}
