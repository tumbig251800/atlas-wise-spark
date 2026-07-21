import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileDown, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePlcSessions, useTeacherList } from "@/hooks/usePlcSessions";
import type { ActionItem } from "@/hooks/useActionItems";
import type { PlcSession } from "@/types/plc";
import { PLC_OUTCOME_LABELS, GRADE_BANDS } from "@/types/plc";
import { downloadPlcDocx } from "@/lib/downloadPlcDocx";

const INPUT = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

interface Props {
  open: boolean;
  teacherName: string;
  items: ActionItem[];
  onClose: () => void;
}

type GroupKey = string;

function groupItems(items: ActionItem[]): Record<GroupKey, ActionItem[]> {
  const map: Record<GroupKey, ActionItem[]> = {};
  for (const item of items.filter((i) => i.status === "open" || i.status === "watching")) {
    const key = `${item.grade_level ?? ""}|${item.classroom ?? ""}|${item.subject ?? ""}`;
    (map[key] ??= []).push(item);
  }
  return map;
}

function labelForKey(key: GroupKey) {
  const [g, c, s] = key.split("|");
  return `${g}/${c} — ${s}`;
}

const OUTCOME_OPTIONS = Object.entries(PLC_OUTCOME_LABELS) as [PlcSession["outcome_type"], string][];
const TODAY = new Date().toISOString().slice(0, 10);

export function PlcBundleDialog({ open, teacherName, items, onClose }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { savePlcSession } = usePlcSessions();
  const { data: teacherList = [] } = useTeacherList();

  const groups = useMemo(() => groupItems(items), [items]);
  const groupKeys = Object.keys(groups);

  const [selectedKeys, setSelectedKeys] = useState<Set<GroupKey>>(new Set());
  const toggleKey = (key: GroupKey) =>
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const [sessionDate, setSessionDate] = useState(TODAY);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [plcType, setPlcType] = useState<"subject" | "grade_band">("subject");
  const [gradeBand, setGradeBand] = useState<string>("ป.4-6");
  const [subject, setSubject] = useState("");
  const [facilitatorName, setFacilitatorName] = useState(teacherName);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [topic, setTopic] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [approach, setApproach] = useState("");
  const [actionSteps, setActionSteps] = useState("");
  const [outcomeType, setOutcomeType] = useState<PlcSession["outcome_type"]>("continue_plc");
  const [nextPlcDate, setNextPlcDate] = useState("");

  useEffect(() => {
    if (!open) return;
    setSelectedKeys(new Set(groupKeys));
    setSessionDate(TODAY);
    setDurationMinutes(60);
    setPlcType("subject");
    setGradeBand("ป.4-6");
    setSubject("");
    setFacilitatorName(teacherName);
    setSelectedMembers(new Set());
    setTopic("");
    setProblemStatement("");
    setRootCause("");
    setApproach("");
    setActionSteps("");
    setOutcomeType("continue_plc");
    setNextPlcDate("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleMember = (id: string) =>
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedItems = useMemo(
    () => [...selectedKeys].flatMap((k) => groups[k] ?? []),
    [selectedKeys, groups],
  );

  const membersPayload = [
    { teacher_id: user?.id ?? "", teacher_name: facilitatorName },
    ...[...selectedMembers]
      .filter((id) => id !== user?.id)
      .map((id) => ({
        teacher_id: id,
        teacher_name: teacherList.find((t) => t.user_id === id)?.full_name ?? id,
      })),
  ];

  const isFormValid =
    topic.trim().length > 0 && problemStatement.trim().length > 0 && selectedKeys.size > 0;

  const isBusy = savePlcSession.isPending;

  const handleSave = async (andDownload = false) => {
    if (!isFormValid) {
      toast({ title: "กรุณากรอกหัวข้อและปัญหา", variant: "destructive" });
      return;
    }

    const sessionPayload: Omit<PlcSession, "id" | "created_at" | "updated_at"> = {
      session_date: sessionDate,
      duration_minutes: durationMinutes || null,
      plc_type: plcType,
      grade_band: plcType === "grade_band" ? (gradeBand as PlcSession["grade_band"]) : null,
      subject: plcType === "subject" ? subject || null : null,
      facilitator_name: facilitatorName,
      members: membersPayload,
      topic,
      problem_statement: problemStatement,
      root_cause: rootCause,
      approach,
      action_steps: actionSteps,
      outcome_type: outcomeType,
      next_plc_date: nextPlcDate || null,
      linked_action_item_ids: selectedItems.map((i) => i.id),
      created_by: user?.id ?? null,
    };

    try {
      const savedSession = await savePlcSession.mutateAsync(sessionPayload);

      // WP-S0 Safety Containment: this PLC-save path must NOT close/dismiss any
      // action item — it records the PLC session only. The DB-enforced closure
      // guard (verified requires a monitoring result) lands in WP6.
      if (andDownload) {
        await downloadPlcDocx({ ...sessionPayload, id: savedSession?.id }, selectedItems);
      }

      toast({
        title: "บันทึก PLC สำเร็จ",
        description: `บันทึก PLC พร้อมผูก ${selectedItems.length} รายการที่เกี่ยวข้อง${andDownload ? " + ดาวน์โหลดเอกสาร" : ""}`,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาด";
      toast({ title: "บันทึกไม่สำเร็จ", description: message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            บันทึก PLC — {teacherName}
          </DialogTitle>
          <DialogDescription>
            เลือกกลุ่มปัญหา กรอก PLC แล้วกด "บันทึก + ดาวน์โหลด .docx" เพื่อบันทึกการประชุมและรับหลักฐาน สพฐ.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-1">
          {/* กลุ่มปัญหา */}
          <section>
            <h3 className="text-xs font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
              กลุ่มปัญหาที่คุยในวันนี้
            </h3>
            {groupKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">ไม่มีรายการ open</p>
            ) : (
              <div className="space-y-2">
                {groupKeys.map((key) => (
                  <label
                    key={key}
                    className="flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <Checkbox
                      checked={selectedKeys.has(key)}
                      onCheckedChange={() => toggleKey(key)}
                      className="mt-0.5"
                    />
                    <div className="text-sm">
                      <span className="font-medium">{labelForKey(key)}</span>
                      <span className="ml-2 text-muted-foreground">({groups[key].length} รายการ)</span>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {groups[key].slice(0, 3).map((i) => i.metric_label).join(", ")}
                        {groups[key].length > 3 && "…"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* ข้อมูล PLC */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
              ข้อมูล PLC
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <Field label="วันที่ประชุม">
                <input type="date" className={INPUT} value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </Field>
              <Field label="ระยะเวลา (นาที)">
                <input type="number" className={INPUT} value={durationMinutes} min={15} max={480}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="ประเภท PLC">
                <select className={INPUT} value={plcType} onChange={(e) => setPlcType(e.target.value as "subject" | "grade_band")}>
                  <option value="subject">ตามวิชา</option>
                  <option value="grade_band">ตามระดับชั้น</option>
                </select>
              </Field>
              {plcType === "grade_band" ? (
                <Field label="ระดับชั้น">
                  <select className={INPUT} value={gradeBand} onChange={(e) => setGradeBand(e.target.value)}>
                    {GRADE_BANDS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="วิชา">
                  <input type="text" className={INPUT} placeholder="เช่น ภาษาไทย"
                    value={subject} onChange={(e) => setSubject(e.target.value)} />
                </Field>
              )}
            </div>

            <Field label="ผู้นำ PLC">
              <input type="text" className={INPUT} value={facilitatorName} onChange={(e) => setFacilitatorName(e.target.value)} />
            </Field>

            <Field label="สมาชิกที่เข้าร่วม">
              <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto border rounded-md p-2">
                {teacherList
                  .filter((t) => t.user_id !== user?.id)
                  .map((t) => (
                    <label key={t.user_id} className="flex items-center gap-2 text-sm cursor-pointer py-0.5">
                      <Checkbox checked={selectedMembers.has(t.user_id)} onCheckedChange={() => toggleMember(t.user_id)} />
                      {t.full_name}
                    </label>
                  ))}
              </div>
            </Field>
          </section>

          {/* เนื้อหา */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold mb-1 text-muted-foreground uppercase tracking-wide">
              เนื้อหาการประชุม
            </h3>

            <Field label="หัวข้อ PLC" required>
              <input type="text" className={INPUT} placeholder="เช่น แนวทางพัฒนาทักษะการอ่าน ป.4"
                value={topic} onChange={(e) => setTopic(e.target.value)} />
            </Field>

            <Field label="ปัญหา / ประเด็นที่พูดคุย" required>
              <textarea rows={3} className={`${INPUT} resize-none`}
                placeholder="อธิบายปัญหาจากข้อมูล ATLAS..."
                value={problemStatement} onChange={(e) => setProblemStatement(e.target.value)} />
            </Field>

            <Field label="สาเหตุของปัญหา">
              <textarea rows={2} className={`${INPUT} resize-none`} placeholder="วิเคราะห์ต้นเหตุ..."
                value={rootCause} onChange={(e) => setRootCause(e.target.value)} />
            </Field>

            <Field label="แนวทาง / ความรู้ที่นำมาใช้">
              <textarea rows={2} className={`${INPUT} resize-none`} placeholder="วิธีการ หลักการ หรือกลยุทธ์..."
                value={approach} onChange={(e) => setApproach(e.target.value)} />
            </Field>

            <Field label="แผนปฏิบัติการ">
              <textarea rows={3} className={`${INPUT} resize-none`} placeholder="ครูจะทำอะไร เมื่อไหร่ อย่างไร..."
                value={actionSteps} onChange={(e) => setActionSteps(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="ผลลัพธ์">
                <select className={INPUT} value={outcomeType}
                  onChange={(e) => setOutcomeType(e.target.value as PlcSession["outcome_type"])}>
                  {OUTCOME_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="วันนัด PLC ครั้งต่อไป">
                <input type="date" className={INPUT} value={nextPlcDate} onChange={(e) => setNextPlcDate(e.target.value)} />
              </Field>
            </div>
          </section>

          {selectedKeys.size > 0 && (
            <div className="rounded-md bg-purple-50 border border-purple-200 px-4 py-3 text-sm text-purple-800">
              บันทึกนี้จะ <strong>ผูก {selectedItems.length} รายการ</strong> จาก {selectedKeys.size} กลุ่ม เข้ากับ PLC นี้ (ไม่ปิดเคสอัตโนมัติ)
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button variant="ghost" onClick={onClose} disabled={isBusy} className="sm:mr-auto">
            ยกเลิก
          </Button>
          <Button variant="outline" onClick={() => handleSave(false)} disabled={isBusy || !isFormValid}>
            {savePlcSession.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            บันทึก PLC
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={isBusy || !isFormValid}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileDown className="w-4 h-4 mr-2" />}
            บันทึก + ดาวน์โหลด .docx
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
