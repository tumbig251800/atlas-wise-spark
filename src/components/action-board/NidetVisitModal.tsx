import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useNidetVisits } from "@/hooks/useNidetVisits";
import {
  RUBRIC_DIMENSIONS,
  type NidetVisit,
  type RubricKey,
} from "@/types/nidet";

interface NidetVisitModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (visit: NidetVisit) => void;
  actionItem: {
    id: number;
    subject?: string;
    grade_level?: string;
    classroom?: string;
    issue_type?: string;
  };
  existingVisit?: NidetVisit | null;
}

const FOLLOW_UP_METHODS = [
  "นิเทศซ้ำในชั้นเรียน",
  "ประชุมย่อยกับครู",
  "ตรวจสอบ ATLAS",
];

function todayISO(): string {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

// Map issue_type (e.g. "k-gap", "p-gap", "a-gap") to the rubric dimensions
// that are most relevant to highlight for the supervisor.
function recommendedKeys(issueType?: string): Set<RubricKey> {
  const t = (issueType ?? "").toUpperCase();
  const keys = new Set<RubricKey>();
  if (t.includes("K")) {
    keys.add("rubric_activity_design");
    keys.add("rubric_formative_assess");
  }
  if (t.includes("P")) {
    keys.add("rubric_questioning");
    keys.add("rubric_collaborative");
  }
  if (t.includes("A")) {
    keys.add("rubric_individual_care");
    keys.add("rubric_feedback");
  }
  return keys;
}

type RubricState = Record<RubricKey, number | null>;

const EMPTY_RUBRIC: RubricState = {
  rubric_activity_design: null,
  rubric_questioning: null,
  rubric_media_tech: null,
  rubric_individual_care: null,
  rubric_collaborative: null,
  rubric_formative_assess: null,
  rubric_feedback: null,
  rubric_classroom_climate: null,
};

export function NidetVisitModal({
  open,
  onClose,
  onSaved,
  actionItem,
  existingVisit,
}: NidetVisitModalProps) {
  const { user } = useAuth();
  const { saving, saveVisit } = useNidetVisits();

  const authName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "";

  const [visitDate, setVisitDate] = useState(todayISO());
  const [supervisorName, setSupervisorName] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpMethod, setFollowUpMethod] = useState(FOLLOW_UP_METHODS[0]);
  const [rubric, setRubric] = useState<RubricState>(EMPTY_RUBRIC);

  const highlighted = useMemo(
    () => recommendedKeys(actionItem.issue_type),
    [actionItem.issue_type]
  );

  // (Re)initialize the form whenever the modal opens or its target changes.
  useEffect(() => {
    if (!open) return;
    if (existingVisit) {
      setVisitDate(existingVisit.visit_date || todayISO());
      setSupervisorName(existingVisit.supervisor_name || authName);
      setStrengths(existingVisit.strengths || "");
      setImprovements(existingVisit.improvements || "");
      setRecommendations(existingVisit.recommendations || "");
      setFollowUpDate(existingVisit.follow_up_date || "");
      setFollowUpMethod(existingVisit.follow_up_method || FOLLOW_UP_METHODS[0]);
      setRubric({
        rubric_activity_design: existingVisit.rubric_activity_design,
        rubric_questioning: existingVisit.rubric_questioning,
        rubric_media_tech: existingVisit.rubric_media_tech,
        rubric_individual_care: existingVisit.rubric_individual_care,
        rubric_collaborative: existingVisit.rubric_collaborative,
        rubric_formative_assess: existingVisit.rubric_formative_assess,
        rubric_feedback: existingVisit.rubric_feedback,
        rubric_classroom_climate: existingVisit.rubric_classroom_climate,
      });
    } else {
      setVisitDate(todayISO());
      setSupervisorName(authName);
      setStrengths("");
      setImprovements("");
      setRecommendations("");
      setFollowUpDate("");
      setFollowUpMethod(FOLLOW_UP_METHODS[0]);
      setRubric(EMPTY_RUBRIC);
    }
  }, [open, existingVisit, authName]);

  const setRubricValue = (key: RubricKey, value: number) => {
    setRubric((prev) => ({ ...prev, [key]: prev[key] === value ? null : value }));
  };

  const handleSave = async () => {
    try {
      const saved = await saveVisit({
        action_item_id: actionItem.id,
        visit_date: visitDate || todayISO(),
        supervisor_id: user?.id ?? null,
        supervisor_name: supervisorName,
        strengths,
        improvements,
        recommendations,
        follow_up_date: followUpDate || null,
        follow_up_method: followUpMethod,
        ...rubric,
      });
      toast.success("บันทึกการนิเทศเรียบร้อยแล้ว");
      onSaved(saved);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "บันทึกไม่สำเร็จ กรุณาลองใหม่";
      toast.error(msg);
    }
  };

  const contextBits = [
    actionItem.subject,
    actionItem.grade_level,
    actionItem.classroom,
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>บันทึกการนิเทศ (Supervision Visit)</DialogTitle>
        </DialogHeader>

        {/* Context header */}
        <div className="flex flex-wrap items-center gap-2 text-sm bg-muted/50 rounded-md p-2">
          {contextBits.length > 0 && (
            <span className="font-medium">{contextBits.join(" · ")}</span>
          )}
          {actionItem.issue_type && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              {actionItem.issue_type}
            </span>
          )}
        </div>

        <div className="space-y-4 py-1">
          {/* Date + supervisor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nidet-visit-date">วันที่นิเทศ</Label>
              <Input
                id="nidet-visit-date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nidet-supervisor">ผู้นิเทศ</Label>
              <Input
                id="nidet-supervisor"
                value={supervisorName}
                onChange={(e) => setSupervisorName(e.target.value)}
                placeholder="ชื่อผู้นิเทศ"
              />
            </div>
          </div>

          {/* Textareas */}
          <div className="space-y-1">
            <Label htmlFor="nidet-strengths">จุดเด่น</Label>
            <Textarea
              id="nidet-strengths"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nidet-improvements">จุดที่ควรพัฒนา</Label>
            <Textarea
              id="nidet-improvements"
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nidet-recommendations">ข้อเสนอแนะ</Label>
            <Textarea
              id="nidet-recommendations"
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              rows={2}
            />
          </div>

          {/* Rubric */}
          <div className="space-y-2">
            <Label>แบบประเมิน 8 มิติ (ให้คะแนน 1–4, ไม่บังคับ)</Label>
            <div className="space-y-1.5">
              {RUBRIC_DIMENSIONS.map((dim) => {
                const isRec = highlighted.has(dim.key);
                const current = rubric[dim.key];
                return (
                  <div
                    key={dim.key}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-md px-2 py-1.5",
                      isRec && "bg-amber-50 ring-1 ring-amber-200"
                    )}
                  >
                    <span className="text-sm flex items-center gap-1.5">
                      {dim.label}
                      {isRec && (
                        <span className="text-[10px] text-amber-600 border border-amber-300 rounded px-1">
                          แนะนำ
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {[1, 2, 3, 4].map((n) => {
                        const active = current === n;
                        return (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${dim.label} = ${n}`}
                            onClick={() => setRubricValue(dim.key, n)}
                            className={cn(
                              "h-7 w-7 rounded-full border text-xs font-medium transition-colors",
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-muted-foreground border-border hover:border-primary/60"
                            )}
                          >
                            {n}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Follow-up */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="nidet-followup-date">วันนัดติดตาม</Label>
              <Input
                id="nidet-followup-date"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>วิธีติดตาม</Label>
              <Select value={followUpMethod} onValueChange={setFollowUpMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
