import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, Clock, Users } from "lucide-react";

interface TodaySubmission {
  type: "pbl" | "unit";
  teacher_name: string;
  grade_level: string;
  classroom: string;
  subject?: string;
  project_name?: string;
  unit_name?: string;
  student_count: number;
  submitted_at: string;
  time_formatted: string;
}

interface SubmissionStats {
  total_teachers: number;
  pbl_submissions: number;
  unit_submissions: number;
  total_students_assessed: number;
}

const TodaysSubmissions = () => {
  const today = new Date().toISOString().split("T")[0];

  // Fetch PBL submissions
  const { data: pblSubmissions = [], isLoading: pblLoading } = useQuery({
    queryKey: ["todays-pbl-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pbl_assessments")
        .select(
          `
          updated_at,
          project_id,
          pbl_projects(
            project_name,
            grade_level,
            classroom,
            teacher_name
          )
        `
        )
        .gte("updated_at", `${today}T00:00:00`)
        .lte("updated_at", `${today}T23:59:59`);

      if (error) throw error;

      // Group by teacher/project
      const grouped = new Map<string, any>();
      data?.forEach((item: any) => {
        const key = `${item.pbl_projects.teacher_name}|${item.project_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            type: "pbl",
            teacher_name: item.pbl_projects.teacher_name,
            grade_level: item.pbl_projects.grade_level,
            classroom: item.pbl_projects.classroom,
            project_name: item.pbl_projects.project_name,
            student_count: 0,
            submitted_at: item.updated_at,
            time_formatted: new Date(item.updated_at).toLocaleTimeString("th-TH"),
          });
        }
        grouped.get(key)!.student_count++;
      });

      return Array.from(grouped.values());
    },
  });

  // Fetch Unit assessment submissions
  const { data: unitSubmissions = [], isLoading: unitLoading } = useQuery({
    queryKey: ["todays-unit-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_assessments")
        .select("teacher_id, student_id, subject, unit_name, grade_level, classroom, competency_assessed_date, updated_at")
        .gte("updated_at", `${today}T00:00:00`)
        .lte("updated_at", `${today}T23:59:59`);

      if (error) throw error;

      // Get teacher names
      const teacherIds = [...new Set(data?.map((d: any) => d.teacher_id) || [])];
      let teacherMap: Record<string, string> = {};

      if (teacherIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", teacherIds);

        teacherMap = Object.fromEntries(
          profiles?.map((p: any) => [p.user_id, p.full_name]) || []
        );
      }

      // Group by teacher/unit
      const grouped = new Map<string, any>();
      data?.forEach((item: any) => {
        const key = `${item.teacher_id}|${item.subject}|${item.unit_name}`;
        const teacher_name = teacherMap[item.teacher_id] || "Unknown";
        if (!grouped.has(key)) {
          grouped.set(key, {
            type: "unit",
            teacher_name,
            grade_level: item.grade_level,
            classroom: item.classroom,
            subject: item.subject,
            unit_name: item.unit_name,
            student_count: 0,
            submitted_at: item.updated_at,
            time_formatted: new Date(item.updated_at).toLocaleTimeString("th-TH"),
          });
        }
        grouped.get(key)!.student_count++;
      });

      return Array.from(grouped.values());
    },
  });

  const allSubmissions = [...pblSubmissions, ...unitSubmissions].sort(
    (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  );

  const stats: SubmissionStats = {
    total_teachers: new Set([
      ...pblSubmissions.map((s) => s.teacher_name),
      ...unitSubmissions.map((s) => s.teacher_name),
    ]).size,
    pbl_submissions: pblSubmissions.length,
    unit_submissions: unitSubmissions.length,
    total_students_assessed: allSubmissions.reduce((sum, s) => sum + s.student_count, 0),
  };

  const isLoading = pblLoading || unitLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">วันนี้ใครกรอกคะแนน 📋</h1>
            <p className="text-gray-600 mt-1">
              {new Date(today).toLocaleDateString("th-TH", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                ครูที่กรอก
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_teachers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                🎓 PBL
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pbl_submissions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                📊 Unit Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unit_submissions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                👥 นักเรียนทั้งหมด
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_students_assessed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions Table */}
        <Card>
          <CardHeader>
            <CardTitle>รายละเอียดการกรอก</CardTitle>
            <CardDescription>
              {allSubmissions.length === 0
                ? "ไม่มีการกรอกคะแนนวันนี้"
                : `พบการกรอก ${allSubmissions.length} รายการ`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : allSubmissions.length === 0 ? (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <AlertCircle className="w-5 h-5 mr-2" />
                ยังไม่มีการกรอกคะแนนวันนี้
              </div>
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">ทั้งหมด ({allSubmissions.length})</TabsTrigger>
                  <TabsTrigger value="pbl">PBL ({pblSubmissions.length})</TabsTrigger>
                  <TabsTrigger value="unit">Unit Test ({unitSubmissions.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <SubmissionsTable submissions={allSubmissions} />
                </TabsContent>

                <TabsContent value="pbl">
                  <SubmissionsTable submissions={pblSubmissions} />
                </TabsContent>

                <TabsContent value="unit">
                  <SubmissionsTable submissions={unitSubmissions} />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

interface SubmissionsTableProps {
  submissions: TodaySubmission[];
}

function SubmissionsTable({ submissions }: SubmissionsTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead>ชื่อครู</TableHead>
            <TableHead>ชั้น</TableHead>
            <TableHead>ห้อง</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>ชื่อเรื่อง</TableHead>
            <TableHead className="text-center">นักเรียน</TableHead>
            <TableHead className="text-right">เวลา</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {submissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                ไม่มีข้อมูล
              </TableCell>
            </TableRow>
          ) : (
            submissions.map((submission, idx) => (
              <TableRow key={idx} className="hover:bg-gray-50">
                <TableCell className="font-medium">{submission.teacher_name}</TableCell>
                <TableCell>{submission.grade_level}</TableCell>
                <TableCell>
                  <Badge variant="outline">{submission.classroom}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={submission.type === "pbl" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}>
                    {submission.type === "pbl" ? "🎓 PBL" : "📊 Unit"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {submission.type === "pbl" ? submission.project_name : submission.unit_name}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{submission.student_count}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    {submission.time_formatted}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default TodaysSubmissions;
