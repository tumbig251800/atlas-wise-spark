import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, CheckCircle2, XCircle, FileText, Loader2, ClipboardCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateResearchStatus } from "@/hooks/useClassroomResearch";
import { StatusBadge, IssueTypeBadge } from "./StatusBadge";
import { EndlineDataDialog } from "./EndlineDataDialog";
import type { ClassroomResearchSuggestion } from "@/types/classroomResearch";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  research: ClassroomResearchSuggestion | null;
  open: boolean;
  onClose: () => void;
  onEdit: (research: ClassroomResearchSuggestion) => void;
  canEdit: boolean;
  /** Count of teaching_logs linked to this research. Undefined while still loading. */
  logCount?: number;
}

function formatThaiDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ResearchDetailDialog({
  research,
  open,
  onClose,
  onEdit,
  canEdit,
  logCount,
}: Props) {
  const { toast } = useToast();
  const updateStatus = useUpdateResearchStatus();
  const [confirmAbandonOpen, setConfirmAbandonOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [endlineDialogOpen, setEndlineDialogOpen] = useState(false);

  if (!research) return null;

  const handleSelectResearch = () => {
    updateStatus.mutate(
      { id: research.id, status: "selected" },
      {
        onSuccess: () => {
          toast({
            title: "เลือกหัวข้อแล้ว",
            description: "คุณสามารถแก้ไขเนื้อหาหรือสร้างเค้าโครงวิจัยได้",
          });
          onClose();
        },
        onError: (error) => {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleAbandon = () => {
    updateStatus.mutate(
      { id: research.id, status: "abandoned" },
      {
        onSuccess: () => {
          toast({
            title: "ไม่ทำหัวข้อนี้",
            description: "หัวข้อถูกย้ายไปยังรายการที่ไม่ทำแล้ว",
          });
          setConfirmAbandonOpen(false);
          onClose();
        },
        onError: (error) => {
          toast({
            title: "เกิดข้อผิดพลาด",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleGenerateDocument = async () => {
    // เปิด window ทันที (ต้องอยู่ใน user gesture context ก่อน await)
    const win = window.open("", "_blank");
    if (!win) {
      toast({
        title: "ป๊อปอัปถูกบล็อก",
        description: "กรุณาอนุญาตป๊อปอัปสำหรับเว็บไซต์นี้แล้วลองใหม่",
        variant: "destructive",
      });
      return;
    }
    win.document.write("<html><body style='font-family:sans-serif;padding:40px;'>⏳ กำลังสร้างเอกสาร กรุณารอสักครู่...</body></html>");

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-research-docx`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            suggestion_id: research.id,
            director_name: "ผู้อำนวยการโรงเรียนวรนาถวิทยากำแพงเพชร",
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        win.close();
        throw new Error(errText || `HTTP ${res.status}`);
      }

      const html = await res.text();
      win.document.open();
      win.document.write(html);
      win.document.close();
    } catch (err) {
      toast({
        title: "สร้างเอกสารไม่สำเร็จ",
        description: String(err),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const isReadOnly = research.status === "in_progress" || research.status === "completed";

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl pr-8">
              {research.research_title}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <div className="flex flex-wrap gap-2">
                <IssueTypeBadge issueType={research.issue_type} />
                <StatusBadge status={research.status} />
                {research.after_data && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    ✅ พร้อมเขียนงานวิจัยแล้ว
                  </Badge>
                )}
              </div>
              <div className="text-sm">
                {research.grade_level}/{research.classroom} · {research.subject}
              </div>
              {logCount !== undefined && (
                <div className="text-sm">
                  📝 บันทึกหลังสอนที่เชื่อมโยงแล้ว: <strong>{logCount}</strong> คาบ
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Evidence Section */}
            <div className="bg-muted/50 p-3 rounded-md space-y-2">
              <h4 className="font-semibold text-foreground">ปัญหาที่ตรวจพบ</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {research.detected_problem}
              </p>
              <Separator className="my-2" />
              <h4 className="font-semibold text-foreground">หลักฐาน</h4>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {research.evidence_summary}
              </p>
              {research.before_data && (
                <div className="pt-2 text-xs space-y-1">
                  <div className="font-medium text-foreground">ข้อมูลก่อนทำวิจัย:</div>
                  <div>
                    {research.before_data.label}: <strong>{research.before_data.value}</strong>
                  </div>
                  <div className="text-muted-foreground">
                    วันที่บันทึก: {formatThaiDate(research.before_data.captured_at)}
                  </div>
                </div>
              )}

              {research.after_data ? (
                <div className="pt-2 text-xs space-y-1">
                  <div className="font-medium text-foreground">ข้อมูลหลังทำวิจัย (Endline):</div>
                  <div>
                    {research.after_data.label}: <strong>{research.after_data.value}</strong>
                    {research.before_data && (
                      <span className="text-muted-foreground">
                        {" "}
                        (ก่อนทำ: {research.before_data.value})
                      </span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    วันที่บันทึก: {formatThaiDate(research.after_data.captured_at)}
                  </div>
                </div>
              ) : (
                <div className="pt-2 text-xs text-muted-foreground">
                  ยังไม่ได้บันทึกข้อมูลหลังทำ (Endline)
                </div>
              )}
            </div>

            <Separator />

            {/* Research Details */}
            <div className="space-y-3">
              <DetailRow label="คำถามวิจัย" value={research.research_question} />
              <DetailRow label="วัตถุประสงค์" value={research.objective} />
              <DetailRow label="กลุ่มเป้าหมาย" value={research.target_group} />
              <DetailRow label="การจัดการเรียนรู้/นวัตกรรม" value={research.intervention} />
              <DetailRow label="เครื่องมือ" value={research.tools} />
              <DetailRow
                label="วิธีเก็บข้อมูล"
                value={research.data_collection_method}
              />
              <DetailRow label="วิธีวิเคราะห์ข้อมูล" value={research.analysis_method} />
              <DetailRow
                label="ตัวชี้วัดความสำเร็จ"
                value={research.success_indicator}
              />
            </div>

            {/* Endline capture — independent of isReadOnly: completed research must
                still be editable/correctable here. */}
            {canEdit &&
              (research.status === "selected" ||
                research.status === "in_progress" ||
                research.status === "completed") && (
                <>
                  <Separator />
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEndlineDialogOpen(true)}
                      className="w-full sm:w-auto"
                    >
                      <ClipboardCheck className="h-4 w-4 mr-1" />
                      บันทึกข้อมูลหลังทำ (Endline)
                    </Button>
                  </div>
                </>
              )}

            {/* Action Buttons */}
            {canEdit && !isReadOnly && (
              <>
                <Separator />
                <div className="flex flex-col sm:flex-row gap-2">
                  {research.status === "suggested" && (
                    <>
                      <Button
                        onClick={handleSelectResearch}
                        className="w-full sm:flex-1"
                        disabled={updateStatus.isPending}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        เลือกทำหัวข้อนี้
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onEdit(research)}
                        className="w-full sm:flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        ปรับแก้
                      </Button>
                    </>
                  )}

                  {research.status === "selected" && (
                    <>
                      <Button
                        onClick={handleGenerateDocument}
                        disabled={isGenerating}
                        className="w-full sm:flex-1"
                      >
                        {isGenerating ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-1" />
                        )}
                        {isGenerating ? "กำลังสร้างเอกสาร..." : "สร้างเค้าโครงวิจัย"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => onEdit(research)}
                        className="w-full sm:flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        ปรับแก้
                      </Button>
                    </>
                  )}

                  {(research.status === "suggested" || research.status === "selected") && (
                    <Button
                      variant="outline"
                      onClick={() => setConfirmAbandonOpen(true)}
                      className="w-full sm:w-auto text-destructive hover:bg-destructive/10"
                      disabled={updateStatus.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      ไม่ทำหัวข้อนี้
                    </Button>
                  )}
                </div>
              </>
            )}

            {isReadOnly && (
              <div className="bg-muted/50 p-3 rounded-md text-center text-sm text-muted-foreground">
                หัวข้อนี้อยู่ในสถานะ "{research.status === "in_progress" ? "กำลังทำวิจัย" : "เสร็จสมบูรณ์"}" — ดูได้อย่างเดียว
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Abandon Dialog */}
      <AlertDialog open={confirmAbandonOpen} onOpenChange={setConfirmAbandonOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันไม่ทำหัวข้อนี้</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการไม่ทำหัวข้อวิจัย "{research.research_title}"
              หัวข้อจะถูกย้ายไปยังรายการที่ไม่ทำ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAbandon}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ยืนยัน ไม่ทำ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Endline Data Dialog */}
      <EndlineDataDialog
        research={research}
        open={endlineDialogOpen}
        onClose={() => setEndlineDialogOpen(false)}
      />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="font-medium text-foreground">{label}</div>
      <div className="text-muted-foreground whitespace-pre-wrap">{value}</div>
    </div>
  );
}
