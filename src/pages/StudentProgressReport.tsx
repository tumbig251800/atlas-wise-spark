/**
 * StudentProgressReport.tsx
 * รายงานภาพรวมพัฒนาการนักเรียนรายบุคคล (คะแนนหลังหน่วย K/P/A + PBL) — 1 หน้า A4
 * คำนวณจากคะแนนจริงล้วนๆ ไม่ใช้ AI ตามกฎ 3 ชั้นใน studentReportRules.ts
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { AppLayout } from "@/components/AppLayout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Printer } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  buildStudentReport,
  levelFromPercent,
  UNIT_SCORE_EXPLANATION,
  PBL_EXPLANATION,
  type UnitRow,
  type PblRow,
  type Level,
} from "@/lib/studentReportRules";

const LEVEL_COLOR: Record<Level, string> = {
  "ดีเยี่ยม": "#3b6d11",
  "ดี": "#854f0b",
  "กำลังพัฒนา": "#a32d2d",
};
const LEVEL_BG: Record<Level, string> = {
  "ดีเยี่ยม": "#eaf3de",
  "ดี": "#faeeda",
  "กำลังพัฒนา": "#fcebeb",
};

type FilterRow = { grade_level: string; classroom: string; academic_term: string };

export default function StudentProgressReport() {
  const [academicTerm, setAcademicTerm] = useState("2569-1");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [selectedClassroom, setSelectedClassroom] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // ห้องที่ "พร้อม" = มีทั้งคะแนนหลังหน่วย (unit_assessment_setups) และ PBL (pbl_projects) ในเทอมเดียวกัน
  const { data: unitScopeRows } = useQuery({
    queryKey: ["report-unit-scope"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_assessment_setups")
        .select("grade_level, classroom, academic_term");
      if (error) throw error;
      return (data ?? []) as FilterRow[];
    },
  });

  const { data: pblScopeRows } = useQuery({
    queryKey: ["report-pbl-scope"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pbl_projects")
        .select("grade_level, classroom, academic_term");
      if (error) throw error;
      return (data ?? []) as FilterRow[];
    },
  });

  const readyCombos = useMemo(() => {
    const unitKeys = new Set((unitScopeRows ?? []).map((r) => `${r.grade_level}|${r.classroom}|${r.academic_term}`));
    const pblKeys = new Set((pblScopeRows ?? []).map((r) => `${r.grade_level}|${r.classroom}|${r.academic_term}`));
    const combos: FilterRow[] = [];
    for (const key of unitKeys) {
      if (pblKeys.has(key)) {
        const [grade_level, classroom, academic_term] = key.split("|");
        combos.push({ grade_level, classroom, academic_term });
      }
    }
    return combos;
  }, [unitScopeRows, pblScopeRows]);

  const termOptions = useMemo(
    () => [...new Set(readyCombos.map((c) => c.academic_term))].sort().reverse(),
    [readyCombos]
  );
  const gradeOptions = useMemo(
    () =>
      [...new Set(readyCombos.filter((c) => c.academic_term === academicTerm).map((c) => c.grade_level))].sort(
        (a, b) => a.localeCompare(b, "th")
      ),
    [readyCombos, academicTerm]
  );
  const classroomOptions = useMemo(
    () =>
      [
        ...new Set(
          readyCombos
            .filter((c) => c.academic_term === academicTerm && c.grade_level === selectedGrade)
            .map((c) => c.classroom)
        ),
      ].sort((a, b) => a.localeCompare(b, "th")),
    [readyCombos, academicTerm, selectedGrade]
  );

  // นักเรียนที่ "พร้อม" = มีทั้งคะแนนหลังหน่วยและคะแนน PBL คนคนนั้นจริง
  const { data: unitStudents } = useQuery({
    queryKey: ["report-unit-students", academicTerm, selectedGrade, selectedClassroom],
    enabled: !!selectedGrade && !!selectedClassroom,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_assessments")
        .select("student_id, student_name")
        .eq("academic_term", academicTerm)
        .eq("grade_level", selectedGrade)
        .eq("classroom", selectedClassroom);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: pblStudents } = useQuery({
    queryKey: ["report-pbl-students", academicTerm, selectedGrade, selectedClassroom],
    enabled: !!selectedGrade && !!selectedClassroom,
    queryFn: async () => {
      const { data: projects, error: projErr } = await supabase
        .from("pbl_projects")
        .select("id")
        .eq("academic_term", academicTerm)
        .eq("grade_level", selectedGrade)
        .eq("classroom", selectedClassroom);
      if (projErr) throw projErr;
      const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
      if (projectIds.length === 0) return [];
      const { data, error } = await supabase
        .from("pbl_assessments")
        .select("student_id, student_name")
        .in("project_id", projectIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  const readyStudents = useMemo(() => {
    const pblIds = new Set((pblStudents ?? []).map((s: { student_id: string }) => s.student_id));
    const seen = new Map<string, string>();
    for (const s of unitStudents ?? []) {
      if (pblIds.has(s.student_id) && !seen.has(s.student_id)) {
        seen.set(s.student_id, s.student_name ?? s.student_id);
      }
    }
    return [...seen.entries()]
      .map(([student_id, student_name]) => ({ student_id, student_name }))
      .sort((a, b) => a.student_id.localeCompare(b.student_id));
  }, [unitStudents, pblStudents]);

  // ข้อมูลของนักเรียนที่เลือก
  const { data: studentUnitRows } = useQuery({
    queryKey: ["report-student-units", academicTerm, selectedGrade, selectedClassroom, selectedStudentId],
    enabled: !!selectedStudentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_assessments")
        .select("subject, unit_name, k_score, k_total, p_score, p_total, a_score, a_total, assessed_date")
        .eq("academic_term", academicTerm)
        .eq("grade_level", selectedGrade)
        .eq("classroom", selectedClassroom)
        .eq("student_id", selectedStudentId);
      if (error) throw error;
      return (data ?? []) as UnitRow[];
    },
  });

  const { data: studentPblRow } = useQuery({
    queryKey: ["report-student-pbl", academicTerm, selectedGrade, selectedClassroom, selectedStudentId],
    enabled: !!selectedStudentId,
    queryFn: async () => {
      const { data: projects, error: projErr } = await supabase
        .from("pbl_projects")
        .select("id, project_name")
        .eq("academic_term", academicTerm)
        .eq("grade_level", selectedGrade)
        .eq("classroom", selectedClassroom);
      if (projErr) throw projErr;
      const projectIds = (projects ?? []).map((p: { id: string }) => p.id);
      if (projectIds.length === 0) return null;
      const { data, error } = await supabase
        .from("pbl_assessments")
        .select("project_id, com_score, think_score, problem_score, life_score, tech_score, total_score, overall_result, notes")
        .eq("student_id", selectedStudentId)
        .in("project_id", projectIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const project = (projects as { id: string; project_name: string }[]).find((p) => p.id === data.project_id);
      return { ...data, project_name: project?.project_name ?? "" } as PblRow;
    },
  });

  const report = useMemo(() => {
    if (!studentUnitRows) return null;
    return buildStudentReport(studentUnitRows, studentPblRow ?? null, selectedGrade);
  }, [studentUnitRows, studentPblRow]);

  const selectedStudentName =
    readyStudents.find((s) => s.student_id === selectedStudentId)?.student_name ?? "";

  const BAR_FILL = "#D9D9D3"; // สีเทาอ่อนมาก — ประหยัดหมึกตอนพิมพ์ ระดับสีดูจากคอลัมน์ "ระดับ" ในตารางแทน
  const barData = report?.subjects.map((s) => ({
    name: s.friendlyName ?? s.subject,
    percent: s.percent,
    fill: BAR_FILL,
  })) ?? [];

  const radarData = report?.pbl?.axes.map((a) => ({ dim: a.label, value: a.score })) ?? [];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold">รายงานภาพรวมพัฒนาการนักเรียน</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              สรุปคะแนนหลังหน่วย (K/P/A) และ PBL รายบุคคล — คำนวณจากคะแนนจริงล้วนๆ ไม่ใช้ AI
            </p>
          </div>
          {report && (
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-2" />
              พิมพ์ / บันทึก PDF
            </Button>
          )}
        </div>

        <div className="flex flex-wrap gap-3 no-print">
          <div>
            <p className="text-sm font-medium mb-1">ภาคเรียน</p>
            <Select value={academicTerm} onValueChange={(v) => { setAcademicTerm(v); setSelectedGrade(""); setSelectedClassroom(""); setSelectedStudentId(""); }}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {termOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">ชั้น (พร้อมทำรายงาน)</p>
            <Select value={selectedGrade} onValueChange={(v) => { setSelectedGrade(v); setSelectedClassroom(""); setSelectedStudentId(""); }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="เลือกชั้น" /></SelectTrigger>
              <SelectContent>
                {gradeOptions.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">ห้อง</p>
            <Select value={selectedClassroom} onValueChange={(v) => { setSelectedClassroom(v); setSelectedStudentId(""); }} disabled={!selectedGrade}>
              <SelectTrigger className="w-[120px]"><SelectValue placeholder="เลือกห้อง" /></SelectTrigger>
              <SelectContent>
                {classroomOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">นักเรียน ({readyStudents.length} คนพร้อม)</p>
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassroom}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="เลือกนักเรียน" /></SelectTrigger>
              <SelectContent>
                {readyStudents.map((s) => (
                  <SelectItem key={s.student_id} value={s.student_id}>{s.student_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {gradeOptions.length === 0 && (
          <Card className="no-print">
            <CardContent className="py-8 text-center text-muted-foreground">
              ยังไม่มีชั้น/ห้องที่มีทั้งคะแนนหลังหน่วยและ PBL ครบในเทอมนี้
            </CardContent>
          </Card>
        )}

        {report && (
          <div id="report-print-area" className="mx-auto bg-white border rounded-lg p-5" style={{ maxWidth: "720px" }}>
            <div className="text-center border-b-2 pb-2 mb-3" style={{ borderColor: "#1a4d3e" }}>
              <div className="text-sm text-gray-500">โรงเรียนวรนาถวิทยากำแพงเพชร</div>
              <div className="text-xl font-medium mt-1" style={{ color: "#1a4d3e" }}>รายงานภาพรวมพัฒนาการนักเรียน</div>
              <div className="text-xs text-gray-500 mt-1">
                ชั้นประถมศึกษาปีที่ {selectedGrade}/{selectedClassroom} &middot; ภาคเรียน {academicTerm}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md p-2 mb-3" style={{ background: "#f4f4f0" }}>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {selectedStudentName}
                  <span className="text-xs text-gray-500 font-normal"> &middot; รหัสนักเรียน {selectedStudentId}</span>
                </div>
              </div>
              <div
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ background: LEVEL_BG[report.overallLevel], color: LEVEL_COLOR[report.overallLevel] }}
              >
                ภาพรวม: {report.overallLevel}
              </div>
            </div>

            <div className="text-sm font-medium" style={{ color: "#1a4d3e" }}>
              คะแนนหลังหน่วยการเรียน ({report.subjects.length} วิชา)
            </div>
            <div className="text-xs text-gray-500 mb-1">{UNIT_SCORE_EXPLANATION}</div>
            <div style={{ height: 125 }} className="mb-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="percent" radius={3}>
                    {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="w-full text-xs mb-3" style={{ borderCollapse: "collapse", tableLayout: "fixed" }}>
              <thead>
                <tr className="text-gray-500 border-b">
                  <td className="py-1 pl-1 pr-2" style={{ width: "27%" }}>วิชา</td>
                  <td className="py-1 px-2 text-right" style={{ width: "16%" }}>คะแนน</td>
                  <td className="py-1 pl-2 pr-3 text-right" style={{ width: "9%" }}>ระดับ</td>
                  <td className="py-1 pl-4 pr-2 border-l" style={{ width: "27%" }}>วิชา</td>
                  <td className="py-1 px-2 text-right" style={{ width: "16%" }}>คะแนน</td>
                  <td className="py-1 pl-2 pr-1 text-right" style={{ width: "9%" }}>ระดับ</td>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.ceil(report.subjects.length / 2) }).map((_, rowIdx) => {
                  const left = report.subjects[rowIdx * 2];
                  const right = report.subjects[rowIdx * 2 + 1];
                  const renderSubjectCells = (s: typeof left | undefined, borderLeft: boolean) =>
                    s ? (
                      <>
                        <td className={borderLeft ? "py-1 pl-4 pr-2 border-l" : "py-1 pl-1 pr-2"}>
                          {s.friendlyName ? `${s.friendlyName} ` : ""}
                          <span className="text-gray-400">{s.friendlyName ? `(${s.subject})` : s.subject}</span>
                        </td>
                        <td className="py-1 px-2 text-right">
                          {s.score}/{s.maxScore} &middot; {s.percent}%
                          {s.prevPercent !== null && s.percent > s.prevPercent && (
                            <span style={{ color: "#3b6d11" }}> &uarr;{s.prevPercent}%</span>
                          )}
                        </td>
                        <td className={borderLeft ? "py-1 pl-2 pr-1 text-right" : "py-1 pl-2 pr-3 text-right"} style={{ color: LEVEL_COLOR[s.level] }}>{s.level}</td>
                      </>
                    ) : (
                      <>
                        <td className={borderLeft ? "pl-4 border-l" : ""}></td>
                        <td></td>
                        <td></td>
                      </>
                    );
                  return (
                    <tr key={rowIdx} style={rowIdx % 2 === 1 ? { background: "#fafaf7" } : undefined}>
                      {renderSubjectCells(left, false)}
                      {renderSubjectCells(right, true)}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {report.pbl && (
              <div className="flex gap-4 mb-3">
                <div className="flex-1">
                  <div className="text-sm font-medium" style={{ color: "#993c1d" }}>
                    ผลงาน PBL &mdash; &ldquo;{report.pbl.projectName}&rdquo;
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{PBL_EXPLANATION}</div>
                  <div style={{ height: 125 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 3]} tickCount={4} tick={{ fontSize: 9 }} />
                        <Radar
                          name="คะแนน"
                          dataKey="value"
                          stroke="#993c1d"
                          fill="#993c1d"
                          fillOpacity={0.25}
                          strokeWidth={2}
                          label={(props: { x: number; y: number; cx: number; cy: number; value: number }) => {
                            const { x, y, cx, cy, value } = props;
                            const dx = (x - cx) * 0.18;
                            const dy = (y - cy) * 0.18;
                            return (
                              <text x={x + dx} y={y + dy} textAnchor="middle" fontSize={10} fontWeight={500} fill="#993c1d">
                                {value}/3
                              </text>
                            );
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="flex-shrink-0 w-[110px] flex flex-col items-center justify-center gap-2">
                  <div className="text-xs text-gray-500">ผลรวม</div>
                  <div
                    className="text-sm font-medium px-3 py-1.5 rounded-full text-center"
                    style={{ background: LEVEL_BG[report.pbl.overallLevel], color: LEVEL_COLOR[report.pbl.overallLevel] }}
                  >
                    {report.pbl.overallLevel}
                  </div>
                  <div className="text-xs text-gray-500">{report.pbl.totalScore}/{report.pbl.maxTotal} คะแนน</div>
                </div>
              </div>
            )}

            <div className="rounded-md p-2 mb-3" style={{ background: "#f4f4f0" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "#1a4d3e" }}>จุดเด่นของน้อง</div>
              <div className="text-xs leading-snug">{report.highlightText}</div>
              <div className="text-xs font-medium mt-1.5 mb-1" style={{ color: "#993c1d" }}>จุดที่โรงเรียนตั้งใจพัฒนาเพิ่มเติม</div>
              <div className="text-xs leading-snug">{report.improvementText}</div>
            </div>

            <div className="rounded-md p-2 mb-3" style={{ background: "#eaf3de" }}>
              <div className="text-xs font-medium mb-1" style={{ color: "#27500a" }}>ชวนส่งเสริมที่บ้าน</div>
              {report.homeTips.map((tip, i) => (
                <div key={i} className="text-xs leading-snug">&bull; {tip}</div>
              ))}
            </div>

            <div className="border-t pt-2 text-xs text-gray-500">
              <div className="font-medium text-gray-700 mb-1">ส่วนตอบกลับจากผู้ปกครอง</div>
              <div>ข้อคิดเห็น / ข้อเสนอแนะ: ......................................................................................</div>
              <div className="mt-3">ลงชื่อ ................................... (ผู้ปกครอง) &nbsp;&nbsp;&nbsp; วันที่ ......................</div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area {
            position: absolute; top: 0; left: 0; width: 100% !important; max-width: none !important;
            padding: 0 !important; margin: 0 !important; border: none !important;
          }
          .recharts-tooltip-wrapper { display: none !important; }
        }
      `}</style>
    </AppLayout>
  );
}
