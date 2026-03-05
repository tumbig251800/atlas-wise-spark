/**
 * Phase D Stage 3: Individual competency report (spider/radar chart)
 */
import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { ReportFilters } from "@/components/smart-report/ReportFilters";
import { CompetencyRadarChart } from "@/components/competency/CompetencyRadarChart";
import { StudentSelector } from "@/components/competency/StudentSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useStudentList,
  useStudentCompetency,
  useCompetencyFilterOptions,
} from "@/hooks/useCompetencyReport";
import type { SmartReportFilter } from "@/types/smartReport";

const STORAGE_KEY = "atlas_competency_report_filters";

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

export default function CompetencyReport() {
  const [filters, setFiltersState] = useState<SmartReportFilter>(loadPersistedFilters);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const setFilters = useCallback((f: SmartReportFilter) => {
    setFiltersState(f);
    persistFilters(f);
    setSelectedStudentId(null);
  }, []);

  const { data: filterOptions, isLoading: optsLoading } = useCompetencyFilterOptions();
  const { data: students = [], isLoading: studentsLoading } = useStudentList(filters);
  const { data: competencyData, isLoading: dataLoading } = useStudentCompetency(
    selectedStudentId,
    filters
  );

  const options = filterOptions ?? {
    subjects: [],
    gradeLevels: [],
    classrooms: [],
    academicTerms: [],
  };

  return (
    <AppLayout>
      <div className="space-y-6 print:space-y-4">
        <div>
          <h1 className="text-2xl font-bold">รายงานสมรรถนะรายบุคคล</h1>
          <p className="text-sm text-muted-foreground mt-1">
            กราฟเรดาร์สมรรถนะ 8 ด้าน (หลักสูตร 2569) และสรุปผลการเรียนของนักเรียน
          </p>
        </div>

        <ReportFilters filters={filters} setFilters={setFilters} options={options} />

        <div className="flex flex-wrap items-end gap-4">
          <StudentSelector
            students={students}
            value={selectedStudentId}
            onChange={setSelectedStudentId}
            disabled={optsLoading || studentsLoading}
          />
          {selectedStudentId && (
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground underline"
              onClick={() => setSelectedStudentId(null)}
            >
              ล้างการเลือก
            </button>
          )}
        </div>

        {!selectedStudentId ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-6">
            <p className="text-sm text-muted-foreground">
              เลือกตัวกรองและนักเรียนเพื่อดูกราฟสมรรถนะ
            </p>
            {students.length === 0 && !studentsLoading && (
              <p className="text-xs text-muted-foreground max-w-md text-center">
                ไม่พบนักเรียน — เลือกตัวกรอง (วิชา ระดับชั้น ห้อง เทอม) ให้ตรงกับข้อมูล
                หรืออัปโหลดไฟล์ All-in-One ที่หน้า อัปโหลด CSV → แท็บ คะแนนประเมิน
              </p>
            )}
          </div>
        ) : dataLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-[320px] w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr,340px]">
            <Card className="print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base">
                  กราฟสมรรถนะ 8 ด้าน
                  {(() => {
                    const s = students.find((x) => x.student_id === selectedStudentId);
                    return s ? ` — ${s.student_name ?? s.student_id}` : "";
                  })()}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  คะแนนล่าสุดจากหน่วยการเรียนรู้ (1 = เริ่มต้น, 4 = เชี่ยวชาญ)
                </p>
              </CardHeader>
              <CardContent>
                <CompetencyRadarChart data={competencyData} />
              </CardContent>
            </Card>

            <Card className="bg-muted/30 border-muted print:shadow-none">
              <CardHeader>
                <CardTitle className="text-base">Academic Summary</CardTitle>
                <p className="text-xs text-muted-foreground">สรุปผลการเรียนเชิงตัวเลข</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {competencyData ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold tabular-nums">
                        {competencyData.academicSummary.avgScorePct}
                      </span>
                      <span className="text-muted-foreground">%</span>
                    </div>
                    <p className="text-sm">
                      คะแนนเฉลี่ยจากหน่วยทั้งหมด {competencyData.academicSummary.totalUnits} หน่วย
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ผลรวม {competencyData.academicSummary.sumScore} /
                      {competencyData.academicSummary.sumTotal} คะแนน
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">ไม่พบข้อมูล</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
