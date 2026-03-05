import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportFilters } from "@/components/smart-report/ReportFilters";
import { SummaryStatsBar } from "@/components/smart-report/SummaryStatsBar";
import { UnitReportTable } from "@/components/smart-report/UnitReportTable";
import { StudentRiskList } from "@/components/smart-report/StudentRiskList";
import { StrategyEffectivenessCard } from "@/components/smart-report/StrategyEffectivenessCard";
import { SmartReportExportButton } from "@/components/smart-report/SmartReportExportButton";
import { useSmartReport } from "@/hooks/useSmartReport";
import type { SmartReportFilter } from "@/types/smartReport";

const STORAGE_KEY = "atlas_smart_report_filters";

function loadPersistedFilters(): SmartReportFilter {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const parsed = JSON.parse(s) as SmartReportFilter;
      return {
        subject: parsed.subject ?? "",
        gradeLevel: parsed.gradeLevel ?? "",
        classroom: parsed.classroom ?? "",
        academicTerm: parsed.academicTerm ?? "",
      };
    }
  } catch {
    /* ignore */
  }
  return { subject: "", gradeLevel: "", classroom: "", academicTerm: "" };
}

function persistFilters(f: SmartReportFilter) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(f));
}

export default function SmartReportView() {
  const navigate = useNavigate();
  const [filters, setFiltersState] = useState<SmartReportFilter>(loadPersistedFilters);

  const setFilters = useCallback((f: SmartReportFilter) => {
    setFiltersState(f);
    persistFilters(f);
  }, []);

  const { report, logs, filterOptions, isLoading, error } = useSmartReport(filters);

  const hasNoData =
    !isLoading &&
    !error &&
    filterOptions.subjects.length === 0 &&
    filterOptions.gradeLevels.length === 0;

  if (hasNoData) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-lg font-medium text-foreground mb-1">
                ยังไม่มีข้อมูลการสอนหรือสมรรถนะ
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                บันทึกหลังสอนหรืออัปโหลด CSV ก่อน
              </p>
              <div className="flex gap-3">
                <Button onClick={() => navigate("/log")}>บันทึกหลังสอน</Button>
                <Button variant="outline" onClick={() => navigate("/upload")}>
                  อัปโหลด CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">รายงานสมรรถนะ</h1>
          <SmartReportExportButton report={report} />
        </div>

        <ReportFilters filters={filters} setFilters={setFilters} options={filterOptions} />

        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {String(error)}
          </div>
        )}

        {!isLoading && !error && report.gapValidations.length > 0 && logs.length < 5 && (
          <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
            <strong>ข้อมูลน้อย:</strong> หากอัปโหลด CSV แล้ว — ให้เลือก <strong>เทอม</strong> ตรงกับตอนอัปโหลด (เช่น 2568-2 หรือ 2569-1)
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-[300px] w-full" />
          </div>
        ) : (
          <>
            <SummaryStatsBar report={report} />

            <div>
              <h2 className="text-lg font-semibold mb-3">ตารางรายหน่วย</h2>
              <UnitReportTable report={report} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <StudentRiskList report={report} />
              <StrategyEffectivenessCard report={report} />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
