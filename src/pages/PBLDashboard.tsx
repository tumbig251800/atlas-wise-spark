import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, TrendingUp, Award, AlertCircle, Download, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PBLProject {
  id: string;
  project_name: string;
  grade_level: string;
  classroom: string;
  teacher_name: string;
  month: string;
  total_students: number;
  excellent: number;
  pass: number;
  fail: number;
  avg_com: number;
  avg_think: number;
  avg_problem: number;
  avg_life: number;
  avg_tech: number;
}

interface FailedStudent {
  student_id: string;
  student_name: string;
  project_name: string;
  grade_level: string;
  classroom: string;
  overall_result: string;
  notes: string;
  com_score: number;
  think_score: number;
  problem_score: number;
  life_score: number;
  tech_score: number;
}

const DIMENSIONS = [
  { key: "com_score", label: "การสื่อสาร", color: "#8884d8" },
  { key: "think_score", label: "การคิด", color: "#82ca9d" },
  { key: "problem_score", label: "การแก้ปัญหา", color: "#ffc658" },
  { key: "life_score", label: "ทักษะชีวิต", color: "#ff8042" },
  { key: "tech_score", label: "เทคโนโลยี", color: "#a4de6c" },
] as const;

const PBLDashboard = () => {
  const { toast } = useToast();
  // Default for the empty-table state; once data exists, an effect below
  // switches this to the newest term that actually has data.
  const [academicTerm, setAcademicTerm] = useState("2569-1");
  const [gradeLevel, setGradeLevel] = useState<string>("all");
  const [classroom, setClassroom] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Fetch distinct filter values from real data (no hardcoded options).
  const { data: filterRows } = useQuery({
    queryKey: ["pbl-filter-options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pbl_projects")
        .select("academic_term, grade_level, classroom");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Term options: always include the currently selected term so the Select is
  // never blank, even when the table is empty. Newest term first.
  const termOptions = useMemo(() => {
    const set = new Set<string>(
      (filterRows ?? []).map((r) => r.academic_term).filter(Boolean)
    );
    set.add(academicTerm);
    return [...set].sort().reverse();
  }, [filterRows, academicTerm]);

  // Grades available within the selected term.
  const gradeOptions = useMemo(() => {
    const rows = (filterRows ?? []).filter((r) => r.academic_term === academicTerm);
    return [...new Set(rows.map((r) => r.grade_level).filter(Boolean))].sort();
  }, [filterRows, academicTerm]);

  // Classrooms available within the selected term + grade.
  const classroomOptions = useMemo(() => {
    const rows = (filterRows ?? []).filter(
      (r) =>
        r.academic_term === academicTerm &&
        (gradeLevel === "all" || r.grade_level === gradeLevel)
    );
    return [...new Set(rows.map((r) => r.classroom).filter(Boolean))].sort();
  }, [filterRows, academicTerm, gradeLevel]);

  // On first load (or when data arrives), default to the newest term that
  // actually has data if the current selection has none.
  useEffect(() => {
    const terms = [
      ...new Set((filterRows ?? []).map((r) => r.academic_term).filter(Boolean)),
    ]
      .sort()
      .reverse();
    if (terms.length > 0 && !terms.includes(academicTerm)) {
      setAcademicTerm(terms[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterRows]);

  // Reset grade/classroom to "all" when the current pick no longer exists
  // (e.g. after switching term/grade) to avoid filtering on a phantom value.
  useEffect(() => {
    if (gradeLevel !== "all" && !gradeOptions.includes(gradeLevel)) {
      setGradeLevel("all");
    }
  }, [gradeOptions, gradeLevel]);

  useEffect(() => {
    if (classroom !== "all" && !classroomOptions.includes(classroom)) {
      setClassroom("all");
    }
  }, [classroomOptions, classroom]);

  // Fetch project summary
  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ["pbl-projects", academicTerm, gradeLevel, classroom],
    queryFn: async () => {
      let query = supabase
        .from("pbl_projects")
        .select(`
          *,
          pbl_assessments(
            id,
            overall_result,
            com_score,
            think_score,
            problem_score,
            life_score,
            tech_score
          )
        `)
        .eq("academic_term", academicTerm);

      if (gradeLevel !== "all") query = query.eq("grade_level", gradeLevel);
      if (classroom !== "all") query = query.eq("classroom", classroom);

      const { data, error } = await query;
      if (error) throw error;

      // Process data
      return data?.map((project: any) => ({
        id: project.id,
        project_name: project.project_name,
        grade_level: project.grade_level,
        classroom: project.classroom,
        teacher_name: project.teacher_name,
        month: project.month,
        total_students: project.pbl_assessments?.length || 0,
        excellent: project.pbl_assessments?.filter((a: any) => a.overall_result === "excellent").length || 0,
        pass: project.pbl_assessments?.filter((a: any) => a.overall_result === "pass").length || 0,
        fail: project.pbl_assessments?.filter((a: any) => a.overall_result === "fail").length || 0,
        avg_com: project.pbl_assessments?.reduce((sum: number, a: any) => sum + (a.com_score || 0), 0) / (project.pbl_assessments?.length || 1),
        avg_think: project.pbl_assessments?.reduce((sum: number, a: any) => sum + (a.think_score || 0), 0) / (project.pbl_assessments?.length || 1),
        avg_problem: project.pbl_assessments?.reduce((sum: number, a: any) => sum + (a.problem_score || 0), 0) / (project.pbl_assessments?.length || 1),
        avg_life: project.pbl_assessments?.reduce((sum: number, a: any) => sum + (a.life_score || 0), 0) / (project.pbl_assessments?.length || 1),
        avg_tech: project.pbl_assessments?.reduce((sum: number, a: any) => sum + (a.tech_score || 0), 0) / (project.pbl_assessments?.length || 1),
      })) as PBLProject[];
    },
  });

  // Fetch failed students
  const { data: failedStudents } = useQuery({
    queryKey: ["pbl-failed-students", academicTerm, gradeLevel, classroom],
    queryFn: async () => {
      let projectQuery = supabase
        .from("pbl_projects")
        .select("id")
        .eq("academic_term", academicTerm);

      if (gradeLevel !== "all") projectQuery = projectQuery.eq("grade_level", gradeLevel);
      if (classroom !== "all") projectQuery = projectQuery.eq("classroom", classroom);

      const { data: projectIds, error: projectError } = await projectQuery;
      if (projectError) throw projectError;

      const ids = projectIds?.map((p) => p.id) || [];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("pbl_assessments")
        .select(`
          student_id,
          student_name,
          overall_result,
          notes,
          com_score,
          think_score,
          problem_score,
          life_score,
          tech_score,
          pbl_projects(project_name, grade_level, classroom)
        `)
        .in("project_id", ids)
        .eq("overall_result", "fail");

      if (error) throw error;

      return data?.map((s: any) => ({
        ...s,
        project_name: s.pbl_projects?.project_name,
        grade_level: s.pbl_projects?.grade_level,
        classroom: s.pbl_projects?.classroom,
      })) as FailedStudent[];
    },
  });

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-pbl`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Import failed");
      }

      // Build a readable summary from the function response, surfacing the
      // skip/warning/error details so the teacher isn't left guessing.
      const lines: string[] = [
        `นำเข้าคะแนน ${result.inserted} คน → "${result.project_name}"`,
      ];
      if (result.skipped_incomplete > 0) {
        lines.push(`⏭️ ข้าม ${result.skipped_incomplete} แถวที่กรอกไม่ครบ 5 ด้าน`);
      }
      if (Array.isArray(result.warnings) && result.warnings.length > 0) {
        lines.push(...result.warnings.map((w: string) => `⚠️ ${w}`));
      }
      if (Array.isArray(result.errors) && result.errors.length > 0) {
        lines.push(...result.errors.map((e: string) => `❌ ${e}`));
      }

      const hasIssues =
        (Array.isArray(result.errors) && result.errors.length > 0) ||
        (Array.isArray(result.warnings) && result.warnings.length > 0);

      toast({
        title: hasIssues ? "นำเข้าสำเร็จ (มีข้อควรตรวจสอบ)" : "นำเข้าสำเร็จ",
        description: lines.join("\n"),
        variant: hasIssues ? "default" : "default",
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  // Calculate summary stats
  const totalProjects = projects?.length || 0;
  const totalStudents = projects?.reduce((sum, p) => sum + p.total_students, 0) || 0;
  const totalExcellent = projects?.reduce((sum, p) => sum + p.excellent, 0) || 0;
  const totalPass = projects?.reduce((sum, p) => sum + p.pass, 0) || 0;
  const totalFail = projects?.reduce((sum, p) => sum + p.fail, 0) || 0;

  const excellentPercent = totalStudents > 0 ? ((totalExcellent / totalStudents) * 100).toFixed(1) : "0";
  const passPercent = totalStudents > 0 ? ((totalPass / totalStudents) * 100).toFixed(1) : "0";
  const failPercent = totalStudents > 0 ? ((totalFail / totalStudents) * 100).toFixed(1) : "0";

  // Prepare chart data
  const chartData = projects?.map((p) => ({
    name: `${p.project_name.substring(0, 20)}...`,
    การสื่อสาร: parseFloat(p.avg_com.toFixed(2)),
    การคิด: parseFloat(p.avg_think.toFixed(2)),
    การแก้ปัญหา: parseFloat(p.avg_problem.toFixed(2)),
    ทักษะชีวิต: parseFloat(p.avg_life.toFixed(2)),
    เทคโนโลยี: parseFloat(p.avg_tech.toFixed(2)),
  })) || [];

  // ── Phase 2: per-student & per-class detail ──────────────────────────────
  // All assessments in the current filter scope, with their project's name/month.
  const { data: detail } = useQuery({
    queryKey: ["pbl-detail", academicTerm, gradeLevel, classroom],
    queryFn: async () => {
      let pq = supabase
        .from("pbl_projects")
        .select("id, project_name, month")
        .eq("academic_term", academicTerm);
      if (gradeLevel !== "all") pq = pq.eq("grade_level", gradeLevel);
      if (classroom !== "all") pq = pq.eq("classroom", classroom);

      const { data: projs, error: pe } = await pq;
      if (pe) throw pe;

      const projMap = new Map((projs ?? []).map((p: any) => [p.id, p]));
      const ids = [...projMap.keys()];
      if (ids.length === 0) return [];

      const { data, error } = await supabase
        .from("pbl_assessments")
        .select(
          "student_id, student_name, com_score, think_score, problem_score, life_score, tech_score, overall_result, project_id"
        )
        .in("project_id", ids);
      if (error) throw error;

      return (data ?? []).map((a: any) => {
        const p: any = projMap.get(a.project_id);
        return { ...a, project_name: p?.project_name ?? "", month: p?.month ?? "" };
      });
    },
  });

  // Distinct students for the dropdown (sorted by Thai name).
  const studentList = useMemo(() => {
    const m = new Map<string, string>();
    (detail ?? []).forEach((a: any) => {
      if (!m.has(a.student_id)) m.set(a.student_id, a.student_name);
    });
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [detail]);

  // Keep the selected student valid as the scope changes.
  useEffect(() => {
    if (studentList.length > 0 && !studentList.some((s) => s.id === selectedStudentId)) {
      setSelectedStudentId(studentList[0].id);
    }
  }, [studentList, selectedStudentId]);

  // Selected student's score per dimension (averaged over their projects)
  // alongside the class average — for a side-by-side comparison bar chart.
  const studentCompare = useMemo(() => {
    const rows = (detail ?? []).filter((a: any) => a.student_id === selectedStudentId);
    if (rows.length === 0) return [] as { dim: string; นักเรียน: number; เฉลี่ยห้อง: number }[];
    return DIMENSIONS.map((d) => ({
      dim: d.label,
      นักเรียน: parseFloat(
        (rows.reduce((s: number, a: any) => s + (a[d.key] || 0), 0) / rows.length).toFixed(2)
      ),
      เฉลี่ยห้อง: classRadar.find((c) => c.dim === d.label)?.value ?? 0,
    }));
  }, [detail, selectedStudentId, classRadar]);

  const studentProjectCount = useMemo(
    () => (detail ?? []).filter((a: any) => a.student_id === selectedStudentId).length,
    [detail, selectedStudentId]
  );

  // Class average per dimension (radar).
  const classRadar = useMemo(() => {
    const rows = detail ?? [];
    if (rows.length === 0) return [] as { dim: string; value: number }[];
    return DIMENSIONS.map((d) => ({
      dim: d.label,
      value: parseFloat(
        (rows.reduce((s: number, a: any) => s + (a[d.key] || 0), 0) / rows.length).toFixed(2)
      ),
    }));
  }, [detail]);

  const classStrength = classRadar.length
    ? classRadar.reduce((a, b) => (b.value > a.value ? b : a))
    : null;
  const classWeakness = classRadar.length
    ? classRadar.reduce((a, b) => (b.value < a.value ? b : a))
    : null;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">PBL Assessment Dashboard</h1>
          <p className="text-muted-foreground">การประเมินสมรรถนะ Project-Based Learning</p>
        </div>

        {/* Import workflow — 3 clear steps */}
        <Card className="border-primary/30 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              นำเข้าคะแนน PBL
            </CardTitle>
            <CardDescription>ทำตาม 3 ขั้นตอน — ดาวน์โหลดเทมเพลต กรอกคะแนน แล้วอัปโหลดกลับ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {/* Step 1: Download */}
              <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                  <span className="font-medium">ดาวน์โหลดเทมเพลต</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  ไฟล์ Excel สำหรับกรอกคะแนน — กรอกเฉพาะชีต <span className="font-medium">"📝 กรอกคะแนน"</span>
                </p>
                <Button
                  variant="outline"
                  className="mt-auto"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = "/templates/PBL_Template_วรนาถ.xlsx";
                    link.download = "PBL_Template_วรนาถ.xlsx";
                    link.click();
                  }}
                >
                  <Download className="mr-2 h-4 w-4" />
                  ดาวน์โหลดเทมเพลต
                </Button>
              </div>

              {/* Step 2: Fill in */}
              <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                  <span className="font-medium">กรอกคะแนนในไฟล์</span>
                </div>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> กรอกข้อมูลโปรเจกต์ที่แถวบนสุด (ชื่อ/ชั้น-ห้อง/เดือน)</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> ให้คะแนน 5 ด้าน ด้านละ 1–3</li>
                  <li className="flex gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" /> ระบบสรุปผล (ผ่าน/ดีเยี่ยม/ไม่ผ่าน) ให้อัตโนมัติ</li>
                </ul>
              </div>

              {/* Step 3: Upload */}
              <div className="flex flex-col gap-3 rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">3</span>
                  <span className="font-medium">อัปโหลดกลับเข้าระบบ</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  เลือกไฟล์ที่กรอกเสร็จแล้ว ระบบจะนำเข้าและสรุปผลให้ทันที
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="mt-auto">
                  <Button asChild disabled={uploading} className="w-full">
                    <span>
                      {uploading ? (
                        "กำลังนำเข้า..."
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          เลือกไฟล์เพื่ออัปโหลด
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>ตัวกรอง</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div>
              <label className="text-sm font-medium">ภาคเรียน</label>
              <Select value={academicTerm} onValueChange={setAcademicTerm}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {termOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">ระดับชั้น</label>
              <Select value={gradeLevel} onValueChange={setGradeLevel}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {gradeOptions.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">ห้องเรียน</label>
              <Select value={classroom} onValueChange={setClassroom}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  {classroomOptions.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">ภาพรวมโปรเจกต์</TabsTrigger>
            <TabsTrigger value="student">รายนักเรียน</TabsTrigger>
            <TabsTrigger value="classroom">รายห้อง</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">โปรเจกต์ทั้งหมด</CardTitle>
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-xs text-muted-foreground">{totalStudents} นักเรียน</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ดีเยี่ยม</CardTitle>
              <Award className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalExcellent}</div>
              <p className="text-xs text-muted-foreground">{excellentPercent}% ของนักเรียนทั้งหมด</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ผ่าน</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPass}</div>
              <p className="text-xs text-muted-foreground">{passPercent}% ของนักเรียนทั้งหมด</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ไม่ผ่าน</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFail}</div>
              <p className="text-xs text-muted-foreground">{failPercent}% ของนักเรียนทั้งหมด</p>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>คะแนนเฉลี่ย 5 ด้านสมรรถนะ</CardTitle>
            <CardDescription>เปรียบเทียบรายโปรเจกต์</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[400px] flex items-center justify-center">กำลังโหลด...</div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 3]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="การสื่อสาร" fill="#8884d8" />
                  <Bar dataKey="การคิด" fill="#82ca9d" />
                  <Bar dataKey="การแก้ปัญหา" fill="#ffc658" />
                  <Bar dataKey="ทักษะชีวิต" fill="#ff8042" />
                  <Bar dataKey="เทคโนโลยี" fill="#a4de6c" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                ไม่มีข้อมูล
              </div>
            )}
          </CardContent>
        </Card>

        {/* Failed Students Table */}
        {failedStudents && failedStudents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>นักเรียนที่ไม่ผ่านเกณฑ์</CardTitle>
              <CardDescription>รายชื่อนักเรียนที่ต้องเฝ้าระวังและพัฒนา</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>รหัสนักเรียน</TableHead>
                    <TableHead>ชื่อ-สกุล</TableHead>
                    <TableHead>โปรเจกต์</TableHead>
                    <TableHead>ห้อง</TableHead>
                    <TableHead className="text-center">สื่อสาร</TableHead>
                    <TableHead className="text-center">คิด</TableHead>
                    <TableHead className="text-center">แก้ปัญหา</TableHead>
                    <TableHead className="text-center">ชีวิต</TableHead>
                    <TableHead className="text-center">เทค</TableHead>
                    <TableHead>หมายเหตุ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedStudents.map((student, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{student.student_id}</TableCell>
                      <TableCell>{student.student_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{student.project_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {student.grade_level}-{student.classroom}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={student.com_score === 1 ? "destructive" : "secondary"}>
                          {student.com_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={student.think_score === 1 ? "destructive" : "secondary"}>
                          {student.think_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={student.problem_score === 1 ? "destructive" : "secondary"}>
                          {student.problem_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={student.life_score === 1 ? "destructive" : "secondary"}>
                          {student.life_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={student.tech_score === 1 ? "destructive" : "secondary"}>
                          {student.tech_score}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{student.notes || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          {/* ── Per-student view ── */}
          <TabsContent value="student" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>พัฒนาการรายนักเรียน</CardTitle>
                <CardDescription>
                  เลือกนักเรียนเพื่อดูคะแนน 5 ด้านข้ามโปรเจกต์ในภาคเรียนที่เลือก
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {studentList.length === 0 ? (
                  <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                    ไม่มีข้อมูลนักเรียนในตัวกรองนี้
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium">นักเรียน</label>
                      <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                        <SelectTrigger className="w-[300px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {studentList.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.id})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ResponsiveContainer width="100%" height={360}>
                      <BarChart data={studentCompare}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="dim" />
                        <YAxis domain={[0, 3]} ticks={[0, 1, 2, 3]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="นักเรียน" fill="#6366f1" />
                        <Bar dataKey="เฉลี่ยห้อง" fill="#cbd5e1" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground">
                      เทียบคะแนน 5 ด้านของนักเรียนกับค่าเฉลี่ยทั้งห้อง
                      {studentProjectCount > 1 &&
                        ` — นักเรียนมี ${studentProjectCount} โปรเจกต์ในภาคเรียนนี้ แสดงค่าเฉลี่ยของทุกโปรเจกต์`}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Per-classroom view ── */}
          <TabsContent value="classroom" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>ภาพรวมรายห้อง</CardTitle>
                <CardDescription>
                  คะแนนเฉลี่ย 5 ด้านของห้องที่เลือก (ตามตัวกรองด้านบน) — ไว้ดูจุดแข็ง/จุดที่ควรพัฒนา
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classRadar.length === 0 ? (
                  <div className="h-[320px] flex items-center justify-center text-muted-foreground">
                    ไม่มีข้อมูลในตัวกรองนี้
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="md:col-span-2">
                      <ResponsiveContainer width="100%" height={360}>
                        <RadarChart data={classRadar}>
                          <PolarGrid />
                          <PolarAngleAxis dataKey="dim" />
                          <PolarRadiusAxis domain={[0, 3]} tickCount={4} />
                          <Radar
                            name="คะแนนเฉลี่ย"
                            dataKey="value"
                            stroke="#6366f1"
                            fill="#6366f1"
                            fillOpacity={0.4}
                            strokeWidth={2}
                          />
                          <Tooltip />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {classStrength && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">จุดแข็ง</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-lg font-bold text-green-600">
                              {classStrength.dim}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              เฉลี่ย {classStrength.value.toFixed(2)} / 3
                            </p>
                          </CardContent>
                        </Card>
                      )}
                      {classWeakness && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">จุดที่ควรพัฒนา</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-lg font-bold text-orange-600">
                              {classWeakness.dim}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              เฉลี่ย {classWeakness.value.toFixed(2)} / 3
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default PBLDashboard;
