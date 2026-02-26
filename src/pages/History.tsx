import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TeachingLog | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reassignLog, setReassignLog] = useState<TeachingLog | null>(null);
  const { toast } = useToast();
  const { role } = useAuth();
  const isDirector = role === "director";

  useEffect(() => {
    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from("teaching_logs")
        .select("*")
        .order("teaching_date", { ascending: false });

      if (!error && data) setLogs(data);
      setLoading(false);
    };
    fetchLogs();
  }, []);

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <HistoryIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">ประวัติการสอน</h1>
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
              <div className="space-y-3">
                {logs.map((log) => {
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
