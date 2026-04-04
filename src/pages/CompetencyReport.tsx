/**
 * Phase D Stage 3: Individual competency report (spider/radar chart)
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ReportFilters } from "@/components/smart-report/ReportFilters";
import { CompetencyRadarChart } from "@/components/competency/CompetencyRadarChart";
import { StudentSelector } from "@/components/competency/StudentSelector";
import { ActiveClassroomAssessment } from "@/components/competency/ActiveClassroomAssessment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  useStudentList,
  useStudentCompetency,
  useCompetencyFilterOptions,
} from "@/hooks/useCompetencyReport";
import type { SmartReportFilter } from "@/types/smartReport";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/atlasSupabase";
import { useToast } from "@/hooks/use-toast";
import type { CapabilityKey2026 } from "@/lib/capabilityConstants2026";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFiltersState] = useState<SmartReportFilter>(loadPersistedFilters);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);
  const [unitName, setUnitName] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const setFilters = useCallback((f: SmartReportFilter) => {
    setFiltersState(f);
    persistFilters(f);
    setSelectedStudentId(null);
  }, []);

  const handleAssessmentSave = useCallback(async (payload: {
    scores: Record<CapabilityKey2026, number>;
    score: number;
    total_score: number;
  }) => {
    if (!user || !selectedStudentId) return;
    setSaveLoading(true);
    try {
      const { data: existing } = await supabase
        .from("unit_assessments")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("student_id", selectedStudentId)
        .eq("subject", filters.subject)
        .eq("grade_level", filters.gradeLevel)
        .eq("classroom", filters.classroom)
        .eq("academic_term", filters.academicTerm)
        .eq("unit_name", unitName)
        .maybeSingle();

      const capScores = {
        reading_score: payload.scores.reading,
        writing_score: payload.scores.writing,
        calculating_score: payload.scores.calculating,
        sci_tech_score: payload.scores.sci_tech,
        social_civic_score: payload.scores.social_civic,
        economy_finance_score: payload.scores.economy_finance,
        health_score: payload.scores.health,
        art_culture_score: payload.scores.art_culture,
        score: payload.score,
        total_score: payload.total_score,
        competency_assessed_date: new Date().toISOString().split("T")[0],
        assessed_by: user.id,
      };

      if (existing?.id) {
        const { error } = await supabase.from("unit_assessments").update(capScores).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("unit_assessments").insert({
          teacher_id: user.id,
          student_id: selectedStudentId,
          subject: filters.subject,
          grade_level: filters.gradeLevel,
          classroom: filters.classroom,
          academic_term: filters.academicTerm,
          unit_name: unitName,
          ...capScores,
        });
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["competency-student-data"] });
      toast({ title: "✅ บันทึกสมรรถนะสำเร็จ" });
      setAssessOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ไม่สามารถบันทึกได้";
      toast({ title: "❌ บันทึกไม่สำเร็จ", description: message, variant: "destructive" });
    } finally {
      setSaveLoading(false);
    }
  }, [user, selectedStudentId, filters, unitName, queryClient, toast]);

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

  if (!optsLoading && options.subjects.length === 0) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-lg font-medium text-foreground mb-1">ยังไม่มีข้อมูลสมรรถนะ</p>
              <p className="text-sm text-muted-foreground mb-6">
                อัปโหลดคะแนนประเมินจากแท็บ อัปโหลด CSV → คะแนนประเมิน ก่อน
              </p>
              <Button onClick={() => navigate("/upload")}>ไปอัปโหลด CSV</Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

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
          {selectedStudentId && filters.subject && filters.gradeLevel && filters.classroom && filters.academicTerm && (
            <Button size="sm" variant="outline" onClick={() => setAssessOpen(true)}>
              บันทึกสมรรถนะ
            </Button>
          )}
        </div>

        <Sheet open={assessOpen} onOpenChange={setAssessOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>บันทึกสมรรถนะ — รหัส {selectedStudentId}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground">หน่วยการเรียน</label>
                <Input
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                  placeholder="เช่น หน่วยที่ 1"
                />
              </div>
              {unitName.trim() && selectedStudentId && (
                <ActiveClassroomAssessment
                  studentId={selectedStudentId}
                  unitName={unitName}
                  subject={filters.subject}
                  gradeLevel={filters.gradeLevel}
                  classroom={filters.classroom}
                  academicTerm={filters.academicTerm}
                  onSave={handleAssessmentSave}
                />
              )}
              {saveLoading && (
                <p className="text-sm text-muted-foreground text-center">กำลังบันทึก...</p>
              )}
            </div>
          </SheetContent>
        </Sheet>

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
