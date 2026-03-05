import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/atlasSupabase";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { History as HistoryIcon, Eye, BookOpen, Trash2, Loader2, UserCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ReassignTeacherDialog } from "@/components/history/ReassignTeacherDialog";
import {
  HistoryFilters,
  type HistoryFiltersState,
  type HistoryFilterOptions,
} from "@/components/history/HistoryFilters";
import type { Tables } from "@/integrations/supabase/types";

type TeachingLog = Tables<"teaching_logs">;

const gapConfig: Record<string, { label: string; className: string }> = {
  "k-gap": { label: "K-Gap", className: "bg-red-100 text-red-700 border-red-200" },
  "p-gap": { label: "P-Gap", className: "bg-orange-100 text-orange-700 border-orange-200" },
  "a-gap": { label: "A-Gap", className: "bg-purple-100 text-purple-700 border-purple-200" },
  "a2-gap": { label: "A2-Gap 🚨", className: "bg-destructive/20 text-destructive border-destructive/30" },
  "system-gap": { label: "System-Gap", className: "bg-gray-100 text-gray-700 border-gray-200" },
  success: { label: "Success", className: "bg-green-100 text-green-700 border-green-200" },
};

const activityModeLabel: Record<string, string> = {
  active: "Active (Level 2)",
  passive: "Passive (Level 1)",
  constructive: "Constructive (Level 3)",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function History() {
  const [logs, setLogs] = useState<TeachingLog[]>([]);
  const [filters, setFilters] = useState<HistoryFiltersState>({
    subject: "",
    gradeLevel: "",
    classroom: "",
    teacherName: "",
  });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeachingLog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);
  const [reassignLog, setReassignLog] = useState<TeachingLog | null>(null);
  const { toast } = useToast();
  const { user, role } = useAuth();
  const isDirector = role === "director";

  useEffect(() => {
    const fetchLogs = async () => {
      if (!user && !isDirector) {
        setLoading(false);
        return;
      }
      let q = supabase.from("teaching_logs").select("*").order("teaching_date", { ascending: false });
      if (user && !isDirector) {
        q = q.eq("teacher_id", user.id);
      }
      const { data, error } = await q;
      if (!error && data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, [user?.id, isDirector]);

  const handleClearAll = async () => {
    if (!user) return;
    setClearingAll(true);
    try {
      let q = supabase.from("teaching_logs").select("id");
      if (!isDirector) q = q.eq("teacher_id", user.id);
      const { data: logRows } = await q;
      const ids = (logRows ?? []).map((l) => l.id);
      if (ids.length === 0) {
        toast({ title: "ไม่มีข้อมูล", description: "ไม่มีประวัติการสอนให้ลบ" });
        setClearingAll(false);
        return;
      }
      // ลบ pivot_events ก่อน (FK ไม่มี CASCADE) — ใส่ teacher_id เพื่อให้ผ่าน RLS
      let pivotQ = supabase.from("pivot_events").delete().in("trigger_session_id", ids);
      if (!isDirector) pivotQ = pivotQ.eq("teacher_id", user.id);
      const { error: errPivot } = await pivotQ;
      if (errPivot) throw new Error(`ลบ pivot_events ไม่สำเร็จ: ${errPivot.message}`);

      // ลบ strike_counter
      if (isDirector) {
        const { error: errStrike } = await supabase.from("strike_counter").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        if (errStrike) throw new Error(`ลบ strike_counter ไม่สำเร็จ: ${errStrike.message}`);
      } else {
        const { error: errStrike } = await supabase.from("strike_counter").delete().eq("teacher_id", user.id);
        if (errStrike) throw new Error(`ลบ strike_counter ไม่สำเร็จ: ${errStrike.message}`);
      }

      // ลบ teaching_logs (CASCADE จะลบ diagnostic_events, remedial_tracking)
      let deleted: { id: string }[] = [];
      if (isDirector) {
        const res = await supabase.from("teaching_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000").select("id");
        if (res.error) throw new Error(`ลบ teaching_logs ไม่สำเร็จ: ${res.error.message}`);
        deleted = res.data ?? [];
      } else {
        const res = await supabase.from("teaching_logs").delete().eq("teacher_id", user.id).select("id");
        if (res.error) throw new Error(`ลบ teaching_logs ไม่สำเร็จ: ${res.error.message}`);
        deleted = res.data ?? [];
      }
      if (deleted.length === 0) {
        throw new Error(
          "ลบได้ 0 รายการ — สิทธิ์ RLS อาจไม่อนุญาต หรือ teacher_id ไม่ตรงกับผู้ล็อกอิน (ตรวจสอบ Supabase)"
        );
      }
      setLogs([]);
      toast({ title: "ล้างสำเร็จ", description: `ลบประวัติการสอน ${deleted.length} รายการแล้ว` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "ไม่สามารถลบได้ กรุณาลองใหม่อีกครั้ง";
      toast({
        title: "ลบไม่สำเร็จ",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setClearingAll(false);
    }
  };

  const handleDelete = async (log: TeachingLog) => {
    setDeletingId(log.id);
    try {
      // Cascade delete related records first
      await Promise.all([
        supabase.from("diagnostic_events").delete().eq("teaching_log_id", log.id),
        supabase.from("remedial_tracking").delete().eq("teaching_log_id", log.id),
        supabase.from("pivot_events").delete().eq("trigger_session_id", log.id),
      ]);

      // Delete strike_counter by teacher + subject (best effort)
      await supabase.from("strike_counter").delete()
        .eq("teacher_id", log.teacher_id)
        .eq("subject", log.subject)
        .eq("last_session_id", log.id);

      // Finally delete the teaching log itself
      const { error } = await supabase.from("teaching_logs").delete().eq("id", log.id);
      if (error) throw error;

      setLogs((prev) => prev.filter((l) => l.id !== log.id));
      toast({ title: "ลบสำเร็จ", description: `ลบบันทึก ${formatDate(log.teaching_date)} ${log.subject} แล้ว` });
    } catch (err: any) {
      toast({ title: "ลบไม่สำเร็จ", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const filterOptions: HistoryFilterOptions = useMemo(() => {
    const subjects = [...new Set(logs.map((l) => l.subject))].filter(Boolean).sort();
    const gradeLevels = [...new Set(logs.map((l) => l.grade_level))].filter(Boolean).sort();
    const classrooms = [...new Set(logs.map((l) => String(l.classroom ?? "")))].filter(Boolean).sort();
    const teacherNames = [...new Set(logs.map((l) => l.teacher_name).filter(Boolean) as string[])].sort();
    return { subjects, gradeLevels, classrooms, teacherNames };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (filters.subject && l.subject !== filters.subject) return false;
      if (filters.gradeLevel && l.grade_level !== filters.gradeLevel) return false;
      if (filters.classroom && String(l.classroom ?? "") !== filters.classroom) return false;
      if (filters.teacherName && l.teacher_name !== filters.teacherName) return false;
      return true;
    });
  }, [logs, filters]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <HistoryIcon className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">ประวัติการสอน</h1>
              </div>
              {logs.length > 0 && user && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive" disabled={clearingAll}>
                      {clearingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      ล้างทั้งหมด
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>ยืนยันการล้างประวัติ</AlertDialogTitle>
                      <AlertDialogDescription>
                        จะลบประวัติการสอนของคุณทั้งหมด ({logs.length} รายการ) พร้อมข้อมูลวินิจฉัยและซ่อมเสริมที่เกี่ยวข้อง ไม่สามารถกู้คืนได้
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleClearAll}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        ล้างทั้งหมด
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-pulse-glow h-10 w-10 rounded-full bg-primary/20" />
              </div>
            ) : logs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mb-3 opacity-40" />
                  <p>ยังไม่มีบันทึกหลังสอน</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="sticky top-0 z-10 py-2 mb-2 bg-background/95 backdrop-blur-sm border-b border-border/50">
                  <HistoryFilters
                    filters={filters}
                    setFilters={setFilters}
                    options={filterOptions}
                    isDirector={isDirector}
                  />
                </div>
                {filteredLogs.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center py-12 text-muted-foreground gap-3">
                      <p>ไม่พบข้อมูลตรงกับ filter นี้</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFilters({ subject: "", gradeLevel: "", classroom: "", teacherName: "" })}
                      >
                        รีเซ็ต filter
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                <div className="space-y-3">
                  {filteredLogs.map((log) => {
                  const gap = gapConfig[log.major_gap] ?? gapConfig.success;
                  const isDeleting = deletingId === log.id;
                  return (
                    <Card key={log.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-medium text-foreground">
                              {formatDate(log.teaching_date)}
                            </span>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-foreground">{log.subject}</span>
                            <span className="text-muted-foreground">|</span>
                            <span className="text-muted-foreground">
                              {log.grade_level}/{log.classroom}
                            </span>
                            {log.teacher_name && (
                              <>
                                <span className="text-muted-foreground">|</span>
                                <span className="text-muted-foreground">{log.teacher_name}</span>
                              </>
                            )}
                            {log.total_students && (
                              <>
                                <span className="text-muted-foreground">|</span>
                                <span className="text-muted-foreground">{log.total_students} คน</span>
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm text-muted-foreground">
                              Mastery: <strong className="text-foreground">{log.mastery_score}</strong>
                            </span>
                            <Badge className={gap.className}>{gap.label}</Badge>
                          </div>
                          {log.topic && (
                            <p className="text-sm text-muted-foreground truncate">
                              {log.topic}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          {isDirector && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReassignLog(log)}
                              title="เปลี่ยนครูผู้สอน"
                            >
                              <UserCog className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelected(log)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            ดูรายละเอียด
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10"
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                                <AlertDialogDescription>
                                  ลบบันทึก {formatDate(log.teaching_date)} วิชา {log.subject} ({log.grade_level}/{log.classroom})?
                                  <br />
                                  ข้อมูลวินิจฉัย, สถิติ Strike และข้อมูลซ่อมเสริมที่เกี่ยวข้องจะถูกลบด้วย
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(log)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  ลบบันทึก
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                </div>
                )}
              </>
            )}
          </div>

          {/* Detail Modal */}
          <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              {selected && (
                <>
                  <DialogHeader>
                    <DialogTitle>รายละเอียดบันทึกหลังสอน</DialogTitle>
                    <DialogDescription>
                      {formatDate(selected.teaching_date)} — {selected.subject}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm">
                    <Row label="ผู้สอน" value={selected.teacher_name} />
                    <Row label="ระดับชั้น / ห้อง" value={`${selected.grade_level} / ${selected.classroom}`} />
                    <Row label="จำนวนนักเรียน" value={selected.total_students ? `${selected.total_students} คน` : null} />
                    <Row label="หน่วยการเรียนรู้" value={selected.learning_unit} />
                    <Row label="หัวข้อ" value={selected.topic} />
                    <Separator />
                    <Row label="Mastery Score" value={String(selected.mastery_score)} />
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground w-36 shrink-0">Gap</span>
                      <Badge className={gapConfig[selected.major_gap]?.className}>
                        {gapConfig[selected.major_gap]?.label}
                      </Badge>
                    </div>
                    <Row label="รูปแบบกิจกรรม" value={activityModeLabel[selected.activity_mode]} />
                    <Separator />
                    <Row label="Key Issue" value={selected.key_issue} />
                    <Row label="Next Strategy" value={selected.next_strategy} />
                    <Row label="นักเรียนซ่อมเสริม" value={selected.remedial_ids} />
                    <Row label="Health Care" value={selected.health_care_ids} />
                    <Row label="Classroom Mgmt" value={selected.classroom_management} />
                    <Separator />
                    <div>
                      <span className="text-muted-foreground block mb-1">Reflection</span>
                      <p className="whitespace-pre-wrap text-foreground">
                        {selected.reflection || "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* Reassign Teacher Dialog */}
          <ReassignTeacherDialog
            log={reassignLog}
            open={!!reassignLog}
            onOpenChange={(open) => { if (!open) setReassignLog(null); }}
            onSuccess={(logId, newTeacherId, newTeacherName) => {
              setLogs((prev) =>
                prev.map((l) =>
                  l.id === logId
                    ? { ...l, teacher_id: newTeacherId, teacher_name: newTeacherName }
                    : l
                )
              );
            }}
          />
        </main>
      </div>
    </SidebarProvider>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground w-36 shrink-0">{label}</span>
      <span className="text-foreground">{value || "—"}</span>
    </div>
  );
}
