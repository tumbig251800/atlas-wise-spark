import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateResearch, useComputeCurrentMetric } from "@/hooks/useClassroomResearch";
import type { ClassroomResearchSuggestion, ResearchIssueType } from "@/types/classroomResearch";

interface Props {
  research: ClassroomResearchSuggestion | null;
  open: boolean;
  onClose: () => void;
}

// Only PBL types have a source (pbl_assessments scores) verified safe to
// re-query directly. See useComputeCurrentMetric for why UnitBlindSpot,
// StayLong, GapRepeat, and RedZone are excluded.
const RECOMPUTE_SUPPORTED_TYPES: ResearchIssueType[] = [
  "PBLWeakCompetency",
  "PBLStudentFailing",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EndlineDataDialog({ research, open, onClose }: Props) {
  const { toast } = useToast();
  const updateResearch = useUpdateResearch();
  const computeMetric = useComputeCurrentMetric();

  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [capturedAt, setCapturedAt] = useState(todayIso());
  const [recomputeUnavailable, setRecomputeUnavailable] = useState(false);

  useEffect(() => {
    if (research) {
      setLabel(research.after_data?.label ?? "");
      setValue(research.after_data?.value != null ? String(research.after_data.value) : "");
      setCapturedAt(research.after_data?.captured_at ?? todayIso());
      setRecomputeUnavailable(false);
    }
  }, [research]);

  if (!research) return null;

  const canOfferRecompute =
    RECOMPUTE_SUPPORTED_TYPES.includes(research.issue_type) && !recomputeUnavailable;

  const handleRecompute = () => {
    computeMetric.mutate(research, {
      onSuccess: (result) => {
        if (!result) {
          setRecomputeUnavailable(true);
          return;
        }
        setLabel(result.label);
        setValue(String(result.value));
        setCapturedAt(todayIso());
      },
      onError: (error) => {
        toast({
          title: "คำนวณอัตโนมัติไม่สำเร็จ",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const metric = research.before_data?.metric ?? research.issue_type;

  const handleSave = () => {
    const numericValue = Number(value);

    updateResearch.mutate(
      {
        id: research.id,
        payload: {
          after_data: {
            metric,
            label: label.trim(),
            value: Number.isNaN(numericValue) ? value : numericValue,
            captured_at: capturedAt,
            source: "manual",
          },
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "บันทึกสำเร็จ",
            description: "บันทึกข้อมูลหลังทำ (Endline) เรียบร้อยแล้ว",
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>บันทึกข้อมูลหลังทำ (Endline)</DialogTitle>
          <DialogDescription>
            กรอกผลลัพธ์หลังทำวิจัยเพื่อเทียบกับข้อมูลก่อนทำ — ห้ามระบุชื่อนักเรียนรายบุคคล
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {canOfferRecompute ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleRecompute}
              disabled={computeMetric.isPending}
              className="w-full"
            >
              {computeMetric.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              คำนวณจากข้อมูล ATLAS อัตโนมัติ
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              หัวข้อประเภทนี้ยังไม่รองรับการคำนวณอัตโนมัติ กรอกข้อมูลเองได้ด้านล่าง
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="endline_label">คำอธิบายผลลัพธ์ *</Label>
            <Input
              id="endline_label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="เช่น จำนวนนักเรียนไม่ผ่านคะแนนหลังหน่วย"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endline_value">ค่าที่วัดได้ *</Label>
            <Input
              id="endline_value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="เช่น 5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endline_captured_at">วันที่เก็บข้อมูล *</Label>
            <Input
              id="endline_captured_at"
              type="date"
              value={capturedAt}
              onChange={(e) => setCapturedAt(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateResearch.isPending || !label.trim() || value.trim() === ""}
            className="w-full sm:w-auto"
          >
            {updateResearch.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                บันทึก
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
