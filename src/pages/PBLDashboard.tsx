import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, TrendingUp, Award, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

const PBLDashboard = () => {
  const { toast } = useToast();
  const [academicTerm, setAcademicTerm] = useState("2568-2");
  const [gradeLevel, setGradeLevel] = useState<string>("all");
  const [classroom, setClassroom] = useState<string>("all");
  const [uploading, setUploading] = useState(false);

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

      toast({
        title: "นำเข้าสำเร็จ",
        description: `นำเข้าคะแนน ${result.inserted} คน สำหรับโปรเจกต์ "${result.project_name}"`,
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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">PBL Assessment Dashboard</h1>
            <p className="text-muted-foreground">การประเมินสมรรถนะ Project-Based Learning</p>
          </div>
          <div>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: "none" }}
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button asChild disabled={uploading}>
                <span>
                  {uploading ? (
                    "กำลังนำเข้า..."
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      นำเข้าคะแนน PBL
                    </>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>

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
                  <SelectItem value="2568-2">2568-2</SelectItem>
                  <SelectItem value="2568-1">2568-1</SelectItem>
                  <SelectItem value="2567-2">2567-2</SelectItem>
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
                  <SelectItem value="ป.1">ป.1</SelectItem>
                  <SelectItem value="ป.2">ป.2</SelectItem>
                  <SelectItem value="ป.3">ป.3</SelectItem>
                  <SelectItem value="ป.4">ป.4</SelectItem>
                  <SelectItem value="ป.5">ป.5</SelectItem>
                  <SelectItem value="ป.6">ป.6</SelectItem>
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
                  <SelectItem value="KBW">KBW</SelectItem>
                  <SelectItem value="VKW">VKW</SelectItem>
                  <SelectItem value="KW1">KW1</SelectItem>
                  <SelectItem value="KW2">KW2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </AppLayout>
  );
};

export default PBLDashboard;
