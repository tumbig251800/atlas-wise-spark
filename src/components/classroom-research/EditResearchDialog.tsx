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
import { Textarea } from "@/components/ui/textarea";
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

export function EditResearchDialog({ research, open, onClose }: Props) {
  const { toast } = useToast();
  const updateResearch = useUpdateResearch();

  const [formData, setFormData] = useState({
    research_title: "",
    research_question: "",
    objective: "",
    target_group: "",
    intervention: "",
    tools: "",
    data_collection_method: "",
    analysis_method: "",
    success_indicator: "",
  });

  useEffect(() => {
    if (research) {
      setFormData({
        research_title: research.research_title,
        research_question: research.research_question,
        objective: research.objective,
        target_group: research.target_group,
        intervention: research.intervention,
        tools: research.tools,
        data_collection_method: research.data_collection_method,
        analysis_method: research.analysis_method,
        success_indicator: research.success_indicator,
      });
    }
  }, [research]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!research) return;

    updateResearch.mutate(
      { id: research.id, payload: formData },
      {
        onSuccess: () => {
          toast({
            title: "บันทึกสำเร็จ",
            description: "แก้ไขหัวข้อวิจัยเรียบร้อยแล้ว",
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

  if (!research) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ปรับแก้หัวข้อวิจัย</DialogTitle>
          <DialogDescription>
            แก้ไขรายละเอียดหัวข้อวิจัยตามต้องการ (หลักฐานและข้อมูลต้นฉบับแก้ไขไม่ได้)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="research_title">ชื่อเรื่องวิจัย *</Label>
            <Input
              id="research_title"
              value={formData.research_title}
              onChange={(e) => handleChange("research_title", e.target.value)}
              placeholder="ระบุชื่อเรื่องวิจัย"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="research_question">คำถามวิจัย *</Label>
            <Textarea
              id="research_question"
              value={formData.research_question}
              onChange={(e) => handleChange("research_question", e.target.value)}
              placeholder="ระบุคำถามวิจัย"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective">วัตถุประสงค์ *</Label>
            <Textarea
              id="objective"
              value={formData.objective}
              onChange={(e) => handleChange("objective", e.target.value)}
              placeholder="ระบุวัตถุประสงค์"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_group">กลุ่มเป้าหมาย *</Label>
            <Input
              id="target_group"
              value={formData.target_group}
              onChange={(e) => handleChange("target_group", e.target.value)}
              placeholder="เช่น นักเรียนชั้น ป.3/2 ที่มีผล Mastery ต่ำกว่า 3"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intervention">การจัดการเรียนรู้/นวัตกรรม *</Label>
            <Textarea
              id="intervention"
              value={formData.intervention}
              onChange={(e) => handleChange("intervention", e.target.value)}
              placeholder="ระบุวิธีการหรือนวัตกรรมที่จะใช้"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tools">เครื่องมือ *</Label>
            <Textarea
              id="tools"
              value={formData.tools}
              onChange={(e) => handleChange("tools", e.target.value)}
              placeholder="เช่น แบบทดสอบ, แบบสังเกตพฤติกรรม"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_collection_method">วิธีเก็บข้อมูล *</Label>
            <Textarea
              id="data_collection_method"
              value={formData.data_collection_method}
              onChange={(e) => handleChange("data_collection_method", e.target.value)}
              placeholder="ระบุวิธีการเก็บรวบรวมข้อมูล"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analysis_method">วิธีวิเคราะห์ข้อมูล *</Label>
            <Textarea
              id="analysis_method"
              value={formData.analysis_method}
              onChange={(e) => handleChange("analysis_method", e.target.value)}
              placeholder="เช่น เปรียบเทียบค่าเฉลี่ย, วิเคราะห์เชิงเนื้อหา"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="success_indicator">ตัวชี้วัดความสำเร็จ *</Label>
            <Textarea
              id="success_indicator"
              value={formData.success_indicator}
              onChange={(e) => handleChange("success_indicator", e.target.value)}
              placeholder="เช่น นักเรียนมี Mastery เพิ่มขึ้นอย่างน้อย 1 ระดับ"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            ยกเลิก
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateResearch.isPending || !formData.research_title.trim()}
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
