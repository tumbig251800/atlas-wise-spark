import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TeacherSummary {
  userId: string;
  fullName: string;
  logCount: number;
  lastLogDate: string | null;
}

export default function AdminSettings() {
  const [teachers, setTeachers] = useState<TeacherSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      // Fetch all profiles (director can see all via RLS)
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name");

      // Fetch all roles to filter teachers
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // Fetch all teaching logs
      const { data: logs } = await supabase
        .from("teaching_logs")
        .select("teacher_id, teaching_date");

      const teacherUserIds = new Set(
        (roles ?? []).filter((r) => r.role === "teacher").map((r) => r.user_id)
      );

      // Count logs per teacher
      const logMap = new Map<string, { count: number; lastDate: string | null }>();
      for (const log of logs ?? []) {
        const existing = logMap.get(log.teacher_id);
        if (existing) {
          existing.count++;
          if (!existing.lastDate || log.teaching_date > existing.lastDate) {
            existing.lastDate = log.teaching_date;
          }
        } else {
          logMap.set(log.teacher_id, { count: 1, lastDate: log.teaching_date });
        }
      }

      const result: TeacherSummary[] = (profiles ?? [])
        .filter((p) => teacherUserIds.has(p.user_id))
        .map((p) => {
          const info = logMap.get(p.user_id);
          return {
            userId: p.user_id,
            fullName: p.full_name || "ไม่ระบุชื่อ",
            logCount: info?.count ?? 0,
            lastLogDate: info?.lastDate ?? null,
          };
        })
        .sort((a, b) => b.logCount - a.logCount);

      setTeachers(result);
      setLoading(false);
    }

    fetchData();
  }, []);

  const totalLogs = teachers.reduce((sum, t) => sum + t.logCount, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">จำนวนครู</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : teachers.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Log ทั้งหมด</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : totalLogs}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle>รายชื่อครูในระบบ</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : teachers.length === 0 ? (
              <p className="text-muted-foreground text-sm">ยังไม่มีครูลงทะเบียนในระบบ</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อ-นามสกุล</TableHead>
                    <TableHead className="text-center">จำนวน Log</TableHead>
                    <TableHead className="text-center">บันทึกล่าสุด</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.userId}>
                      <TableCell className="font-medium">{t.fullName}</TableCell>
                      <TableCell className="text-center">{t.logCount}</TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {t.lastLogDate ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
