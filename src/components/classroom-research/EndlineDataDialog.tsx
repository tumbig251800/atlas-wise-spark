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
import { Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUpdateResearch } from "@/hooks/useClassroomResearch";
import type { ClassroomResearchSuggestion } from "@/types/classroomResearch";

interface Props {
  research: ClassroomResearchSuggestion | null;
  open: boolean;
  onClose: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EndlineDataDialog({ research, open, onClose }: Props) {
  const { toast } = useToast();
  const updateResearch = useUpdateResearch();

  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [capturedAt, setCapturedAt] = useState(todayIso());

  useEffect(() => {
    if (research) {
      setLabel(research.after_data?.label ?? "");
      setValue(research.after_data?.value != null ? String(research.after_data.value) : "");
      setCapturedAt(research.after_data?.captured_at ?? todayIso());
    }
  }, [research]);

  if (!research) return null;

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
