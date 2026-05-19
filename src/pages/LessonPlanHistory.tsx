import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/atlasSupabase";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { BookOpen, Users, Calendar, RotateCcw } from "lucide-react";

interface SnapshotRow {
  id: string;
  user_id: string;
  label: string | null;
  subject: string;
  grade_level: string;
  classroom: string;
  snapshot_notes: string | null;
  created_at: string;
}

interface DisplayRow extends SnapshotRow {
  teacherName: string;
}

function shortId(id: string) {
  return id.slice(0, 8);
}

function formatThaiDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LessonPlanHistory() {
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [teacherFilter, setTeacherFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [snapshotsRes, profilesRes, teacherNamesRes] = await Promise.all([
        supabase
          .from("lesson_plan_snapshots")
          .select("id, user_id, label, subject, grade_level, classroom, snapshot_notes, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name"),
        supabase.from("teaching_logs").select("teacher_id, teacher_name").not("teacher_name", "is", null),
      ]);

      const profileMap = new Map<string, string>();
      for (const p of profilesRes.data ?? []) {
        if (p.full_name && p.full_name.trim()) profileMap.set(p.user_id, p.full_name.trim());
      }

      // Fallback name from teaching_logs.teacher_name (latest non-null per teacher_id)
      const fallbackMap = new Map<string, string>();
      for (const t of teacherNamesRes.data ?? []) {
        if (t.teacher_name && !fallbackMap.has(t.teacher_id)) {
          fallbackMap.set(t.teacher_id, t.teacher_name);
        }
      }

      const snapshots = (snapshotsRes.data ?? []) as SnapshotRow[];
      const display: DisplayRow[] = snapshots.map((s) => ({
        ...s,
        teacherName:
          profileMap.get(s.user_id) ||
          fallbackMap.get(s.user_id) ||
          `(ครูไม่ระบุชื่อ #${shortId(s.user_id)})`,
      }));

      setRows(display);
      setLoading(false);
    }
    fetchData();
  }, []);

  const teacherOptions = useMemo(
    () => [...new Set(rows.map((r) => r.teacherName))].sort(),
    [rows]
  );
  const subjectOptions = useMemo(
    () => [...new Set(rows.map((r) => r.subject).filter(Boolean))].sort(),
    [rows]
  );

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (teacherFilter && r.teacherName !== teacherFilter) return false;
      if (subjectFilter && r.subject !== subjectFilter) return false;
      if (dateFrom && r.created_at < dateFrom) return false;
      // dateTo is inclusive — bump by 1 day for boundary
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        if (new Date(r.created_at) >= end) return false;
      }
      return true;
    });
  }, [rows, teacherFilter, subjectFilter, dateFrom, dateTo]);

  const totalPlans = filteredRows.length;
  const uniqueTeachers = new Set(filteredRows.map((r) => r.user_id)).size;
  const subjectCounts = filteredRows.reduce<Record<string, number>>((acc, r) => {
    acc[r.subject] = (acc[r.subject] || 0) + 1;
    return acc;
  }, {});
  const topSubject = Object.entries(subjectCounts).sort((a, b) => b[1] - a[1])[0];

  const hasActiveFilter = teacherFilter || subjectFilter || dateFrom || dateTo;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ประวัติการสร้างแผนการสอน</h1>
          <p className="text-sm text-muted-foreground mt-1">
            บันทึกว่าครูคนใดสร้างแผนการสอนวิชาอะไรไว้บ้าง — เริ่มเก็บตั้งแต่ 2026-05-19
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">แผนการสอนทั้งหมด</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : totalPlans}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">จำนวนครูที่ใช้</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-12" /> : uniqueTeachers}</div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">วิชาที่สร้างบ่อย</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate" title={topSubject?.[0] ?? "—"}>
                {loading ? <Skeleton className="h-6 w-24" /> : topSubject ? `${topSubject[0]} (${topSubject[1]})` : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex flex-wrap gap-4 items-end">
              <FilterSelect
                label="ครู"
                value={teacherFilter}
                options={teacherOptions}
                onChange={setTeacherFilter}
              />
              <FilterSelect
                label="วิชา"
                value={subjectFilter}
                options={subjectOptions}
                onChange={setSubjectFilter}
              />
              <div className="space-y-1">
                <Label htmlFor="dateFrom" className="text-xs text-muted-foreground">ตั้งแต่วันที่</Label>
                <Input id="dateFrom" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateTo" className="text-xs text-muted-foreground">ถึงวันที่</Label>
                <Input id="dateTo" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
              </div>
              {hasActiveFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTeacherFilter("");
                    setSubjectFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  รีเซ็ต
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>รายการแผนการสอน</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {rows.length === 0
                  ? "ยังไม่มีครูใช้ฟีเจอร์สร้างแผนการสอนหลัง deploy — จะปรากฏที่นี่ทันทีที่มีการใช้งาน"
                  : "ไม่มีรายการที่ตรงกับ filter ที่เลือก"}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ครู</TableHead>
                    <TableHead>วิชา</TableHead>
                    <TableHead>ชั้น/ห้อง</TableHead>
                    <TableHead>หัวข้อ / หน่วยการเรียน</TableHead>
                    <TableHead className="text-right">เวลาที่สร้าง</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.teacherName}</TableCell>
                      <TableCell>{r.subject || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{r.grade_level}{r.classroom ? `/${r.classroom}` : ""}</TableCell>
                      <TableCell className="max-w-[300px] truncate" title={r.label ?? ""}>{r.label || "—"}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">{formatThaiDateTime(r.created_at)}</TableCell>
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
