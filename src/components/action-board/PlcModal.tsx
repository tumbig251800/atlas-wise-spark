import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlcSessions, useTeacherList } from "@/hooks/usePlcSessions";
import type { PlcSession } from "@/types/plc";
import { PLC_OUTCOME_LABELS, GRADE_BANDS } from "@/types/plc";
import type { ActionItem } from "@/hooks/useActionItems";

interface PlcModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (session: PlcSession) => void;
  actionItem: ActionItem;
  existingSession?: PlcSession | null;
}

function todayISO(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

export function PlcModal({
  open,
  onClose,
  onSaved,
  actionItem,
  existingSession,
}: PlcModalProps) {
  const { user } = useAuth();
  const { savePlcSession } = usePlcSessions();
  const { data: teachers = [], isLoading: teachersLoading } = useTeacherList();

  const authName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "";

  const [sessionDate, setSessionDate] = useState(todayISO());
  const [durationMinutes, setDurationMinutes] = useState("");
  const [plcType, setPlcType] = useState<"subject" | "grade_band">("subject");
  const [gradeBand, setGradeBand] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [facilitatorName, setFacilitatorName] = useState("");
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

    if (existingSession) {
      setSessionDate(existingSession.session_date || todayISO());
      setDurationMinutes(existingSession.duration_minutes?.toString() ?? "");
      setPlcType(existingSession.plc_type);
      setGradeBand(existingSession.grade_band ?? "");
      setSubject(existingSession.subject ?? "");
      setFacilitatorName(existingSession.facilitator_name || authName);
      setSelectedMembers(new Set(existingSession.members.map((m) => m.teacher_id)));
      setTopic(existingSession.topic || "");
      setProblemStatement(existingSession.problem_statement || "");
      setRootCause(existingSession.root_cause || "");
      setApproach(existingSession.approach || "");
      setActionSteps(existingSession.action_steps || "");
      setOutcomeType(existingSession.outcome_type);
      setNextPlcDate(existingSession.next_plc_date || "");
    } else {
      setSessionDate(todayISO());
      setDurationMinutes("");
      setPlcType("subject");
      setGradeBand("");
      setSubject(actionItem.subject ?? "");
      setFacilitatorName(authName);
      setSelectedMembers(new Set());
      setTopic("");
      setProblemStatement("");
      setRootCause("");
      setApproach("");
      setActionSteps("");
      setOutcomeType("continue_plc");
      setNextPlcDate("");
    }
  }, [open, existingSession, actionItem, authName]);

  const handleSave = async () => {
    if (!topic.trim()) {
      alert("กรุณากรอกหัวข้อ PLC");
      return;
    }

    const members = Array.from(selectedMembers).map((tid) => {
      const t = teachers.find((x) => x.user_id === tid);
      return { teacher_id: tid, teacher_name: t?.full_name ?? "" };
    });

    const payload: Partial<PlcSession> & { id?: string } = {
      session_date: sessionDate,
      duration_minutes: durationMinutes ? parseInt(durationMinutes, 10) : null,
      plc_type: plcType,
      grade_band: plcType === "grade_band" && gradeBand ? (gradeBand as PlcSession["grade_band"]) : null,
      subject: plcType === "subject" ? subject : null,
      facilitator_name: facilitatorName,
      members,
      topic,
      problem_statement: problemStatement,
      root_cause: rootCause,
      approach,
      action_steps: actionSteps,
      outcome_type: outcomeType,
      next_plc_date: outcomeType === "continue_plc" && nextPlcDate ? nextPlcDate : null,
      linked_action_item_ids: [actionItem.id],
      created_by: user?.id ?? null,
    };

    if (existingSession) {
      payload.id = existingSession.id;
    }

    savePlcSession.mutate(payload, {
      onSuccess: (result) => {
        onSaved(result);
        onClose();
      },
    });
  };

  const toggleMember = (teacherId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(teacherId)) {
        next.delete(teacherId);
      } else {
        next.add(teacherId);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingSession ? "แก้ไขบันทึก PLC" : "บันทึก PLC (Professional Learning Community)"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section 1 — Session info */}
          <div className="space-y-4 border-b border-border pb-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">ข้อมูล PLC</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="session_date">วันที่ทำ PLC</Label>
                <Input
                  id="session_date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="duration">ระยะเวลา (นาที)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="เช่น 60"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>ประเภท PLC</Label>
              <RadioGroup value={plcType} onValueChange={(v) => setPlcType(v as "subject" | "grade_band")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="subject" id="plc_subject" />
                  <Label htmlFor="plc_subject" className="font-normal cursor-pointer">
                    ตามวิชา
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="grade_band" id="plc_grade_band" />
                  <Label htmlFor="plc_grade_band" className="font-normal cursor-pointer">
                    ตามช่วงชั้น
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {plcType === "subject" && (
              <div>
                <Label htmlFor="subject">วิชา</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="เช่น คณิตศาสตร์"
                />
              </div>
            )}

            {plcType === "grade_band" && (
              <div>
                <Label htmlFor="grade_band">ช่วงชั้น</Label>
                <Select value={gradeBand} onValueChange={setGradeBand}>
                  <SelectTrigger id="grade_band">
                    <SelectValue placeholder="เลือกช่วงชั้น" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_BANDS.map((gb) => (
                      <SelectItem key={gb} value={gb}>
                        {gb}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="facilitator">ผู้นำ PLC</Label>
              <Input
                id="facilitator"
                value={facilitatorName}
                onChange={(e) => setFacilitatorName(e.target.value)}
                placeholder="ชื่อผู้นำ PLC"
              />
            </div>

            <div>
              <Label>สมาชิก PLC</Label>
              <div className="border border-border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                {teachersLoading ? (
                  <p className="text-sm text-muted-foreground">กำลังโหลดรายชื่อครู...</p>
                ) : teachers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">ไม่มีรายชื่อครู</p>
                ) : (
                  teachers.map((t) => (
                    <div key={t.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`teacher_${t.user_id}`}
                        checked={selectedMembers.has(t.user_id)}
                        onCheckedChange={() => toggleMember(t.user_id)}
                      />
                      <label
                        htmlFor={`teacher_${t.user_id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {t.full_name || t.user_id}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Section 2 — PLC content */}
          <div className="space-y-4 border-b border-border pb-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">เนื้อหา PLC</h3>

            <div>
              <Label htmlFor="topic">
                หัวข้อ PLC <span className="text-destructive">*</span>
              </Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="หัวข้อ PLC"
              />
            </div>

            <div>
              <Label htmlFor="problem_statement">ประเด็นปัญหา</Label>
              <Textarea
                id="problem_statement"
                rows={2}
                value={problemStatement}
                onChange={(e) => setProblemStatement(e.target.value)}
                placeholder="อธิบายปัญหาที่พบ..."
              />
            </div>

            <div>
              <Label htmlFor="root_cause">สาเหตุของปัญหา</Label>
              <Textarea
                id="root_cause"
                rows={2}
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="วิเคราะห์สาเหตุ..."
              />
            </div>

            <div>
              <Label htmlFor="approach">แนวทางแก้ไข</Label>
              <Textarea
                id="approach"
                rows={2}
                value={approach}
                onChange={(e) => setApproach(e.target.value)}
                placeholder="แนวทางการแก้ไข..."
              />
            </div>

            <div>
              <Label htmlFor="action_steps">สิ่งที่ตกลงจะทำ</Label>
              <Textarea
                id="action_steps"
                rows={2}
                value={actionSteps}
                onChange={(e) => setActionSteps(e.target.value)}
                placeholder="Action items ที่ตกลงกัน..."
              />
            </div>
          </div>

          {/* Section 3 — Outcome */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase text-muted-foreground">ผลการทำ PLC</h3>

            <div>
              <Label>ผลการทำ PLC</Label>
              <RadioGroup value={outcomeType} onValueChange={(v) => setOutcomeType(v as PlcSession["outcome_type"])}>
                {Object.entries(PLC_OUTCOME_LABELS).map(([value, label]) => (
                  <div key={value} className="flex items-center space-x-2">
                    <RadioGroupItem value={value} id={`outcome_${value}`} />
                    <Label htmlFor={`outcome_${value}`} className="font-normal cursor-pointer">
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {outcomeType === "continue_plc" && (
              <div>
                <Label htmlFor="next_plc_date">วันนัด PLC ครั้งต่อไป</Label>
                <Input
                  id="next_plc_date"
                  type="date"
                  value={nextPlcDate}
                  onChange={(e) => setNextPlcDate(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={savePlcSession.isPending}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={savePlcSession.isPending}>
            {savePlcSession.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            บันทึก PLC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
