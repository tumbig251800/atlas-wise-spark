import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface Step3Props {
  data: {
    majorGap: "k-gap" | "p-gap" | "a-gap" | "a2-gap" | "system-gap" | "success" | null;
    classroomManagement: string;
    classroomManagementOther: string;
    healthCareStatus: "" | "none" | "has";
    healthCareIds: string;
  };
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
  masteryScore: number | null;
}

const GAPS = [
  { value: "k-gap" as const, label: "K-Gap", desc: "ความรู้: เนื้อหายากไป / พื้นฐานไม่แน่น / จำสูตรไม่ได้", icon: "📚", color: "border-destructive/50 bg-destructive/10" },
  { value: "p-gap" as const, label: "P-Gap", desc: "ทักษะ: ทำไม่เป็น / อ่านไม่คล่อง / คำนวณไม่คล่อง", icon: "🔧", color: "border-[hsl(var(--atlas-warning))]/50 bg-[hsl(var(--atlas-warning))]/10" },
  { value: "a-gap" as const, label: "A1-Gap", desc: "Engagement: ขาดสมาธิ / เบื่อหน่าย / ไม่ส่งงาน", icon: "💔", color: "border-[hsl(var(--atlas-purple))]/50 bg-[hsl(var(--atlas-purple))]/10" },
  { value: "a2-gap" as const, label: "A2-Gap", desc: "High Risk: พฤติกรรมก้าวร้าว / ทำร้ายตัวเอง-ผู้อื่น", icon: "🚨", color: "border-destructive bg-destructive/20" },
  { value: "system-gap" as const, label: "System-Gap", desc: "ระบบ: เวลาไม่พอ / สื่อไม่มี / เน็ตหลุด", icon: "⚙️", color: "border-[hsl(var(--atlas-info))]/50 bg-[hsl(var(--atlas-info))]/10" },
];

const SUCCESS_OPTION = { value: "success" as const, label: "Success", desc: "สอนได้ตามเป้าหมาย (คะแนน 4-5)", icon: "✅", color: "border-[hsl(var(--atlas-success))]/50 bg-[hsl(var(--atlas-success))]/10" };

const MANAGEMENT_OPTIONS = [
  "ลืมเตรียมอุปกรณ์การเรียน/หนังสือ",
  "คุยกันเสียงดัง/เล่นกันในเวลาเรียน",
  "งานกลุ่มล่ม/เกี่ยงกันทำงาน",
  "มาสาย/เข้าห้องเรียนช้า",
  "เรียบร้อยดี (No Issues)",
  "อื่นๆ (โปรดระบุ)",
];

export function Step3Gap({ data, onChange, errors, masteryScore }: Step3Props) {
  const showSmartWarning = masteryScore != null && masteryScore <= 2 && data.majorGap === "success";
  const showA2Alert = data.majorGap === "a2-gap";

  return (
    <div className="space-y-5">
      {/* Major Gap */}
      <div className="space-y-2" data-error={errors.majorGap ? true : undefined}>
        <Label>Major Learning Gap <span className="text-destructive">*</span></Label>
        <div className="grid grid-cols-2 gap-3">
          {GAPS.map((gap) => (
            <button
              key={gap.value}
              type="button"
              onClick={() => onChange("majorGap", gap.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
                data.majorGap === gap.value
                  ? cn(gap.color, "ring-2 ring-primary/30 scale-[1.02]")
                  : "border-transparent bg-secondary/50 hover:bg-secondary"
              )}
            >
              <span className="text-2xl">{gap.icon}</span>
              <span className="font-semibold">{gap.label}</span>
              <span className="text-xs text-muted-foreground text-center">{gap.desc}</span>
            </button>
          ))}
        </div>
        {/* Success card - full width */}
        <button
          type="button"
          onClick={() => onChange("majorGap", SUCCESS_OPTION.value)}
          className={cn(
            "w-full flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all",
            data.majorGap === SUCCESS_OPTION.value
              ? cn(SUCCESS_OPTION.color, "ring-2 ring-primary/30 scale-[1.02]")
              : "border-transparent bg-secondary/50 hover:bg-secondary"
          )}
        >
          <span className="text-2xl">{SUCCESS_OPTION.icon}</span>
          <span className="font-semibold">{SUCCESS_OPTION.label}</span>
          <span className="text-xs text-muted-foreground">{SUCCESS_OPTION.desc}</span>
        </button>
        {errors.majorGap && <p className="text-xs text-destructive">{errors.majorGap}</p>}
      </div>

      {/* Smart Warning */}
      {showSmartWarning && (
        <Alert className="border-[hsl(var(--atlas-warning))]/50 bg-[hsl(var(--atlas-warning))]/10">
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--atlas-warning))]" />
          <AlertDescription className="text-muted-foreground">
            คะแนนค่อนข้างต่ำ ({masteryScore}/5) แต่เลือกว่าไม่มีปัญหา — ข้อมูลสอดคล้องกันหรือไม่?
          </AlertDescription>
        </Alert>
      )}

      {/* A2-Gap Red Alert Banner */}
      {showA2Alert && (
        <Alert className="border-destructive bg-destructive/15 animate-pulse">
          <AlertTriangle className="h-5 w-5 text-destructive animate-bounce" />
          <AlertDescription className="text-destructive font-bold">
            ⚠️ กรณีความปลอดภัย: ระบบจะส่งต่อข้อมูลไปยังผู้บริหารทันที (Immediate Referral)
            นี่ไม่ใช่ปัญหาการเรียนปกติ — ต้องดำเนินการทันที
          </AlertDescription>
        </Alert>
      )}

      {/* Classroom Management */}
      <div className="space-y-2" data-error={errors.classroomManagement ? true : undefined}>
        <Label>การจัดการชั้นเรียน <span className="text-destructive">*</span></Label>
        <Select value={data.classroomManagement} onValueChange={(v) => {
          onChange("classroomManagement", v);
          if (v !== "อื่นๆ (โปรดระบุ)") onChange("classroomManagementOther", "");
        }}>
          <SelectTrigger className={cn(errors.classroomManagement && "border-destructive")}>
            <SelectValue placeholder="เลือกสถานะ" />
          </SelectTrigger>
          <SelectContent>
            {MANAGEMENT_OPTIONS.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
          </SelectContent>
        </Select>
        {data.classroomManagement === "อื่นๆ (โปรดระบุ)" && (
          <Input
            placeholder="โปรดระบุรายละเอียด"
            value={data.classroomManagementOther}
            onChange={(e) => onChange("classroomManagementOther", e.target.value)}
            className={cn(errors.classroomManagementOther && "border-destructive")}
            maxLength={200}
          />
        )}
        {errors.classroomManagement && <p className="text-xs text-destructive">{errors.classroomManagement}</p>}
        {errors.classroomManagementOther && <p className="text-xs text-destructive">{errors.classroomManagementOther}</p>}
      </div>

      {/* Health Care - Radio Group */}
      <div className="space-y-3" data-error={errors.healthCareStatus ? true : undefined}>
        <Label>มีนักเรียนไม่สบาย <span className="text-destructive">*</span></Label>
        <RadioGroup
          value={data.healthCareStatus}
          onValueChange={(v) => {
            onChange("healthCareStatus", v);
            if (v === "none") {
              onChange("healthCareIds", "");
            }
          }}
          className="space-y-2"
        >
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
            data.healthCareStatus === "none"
              ? "border-[hsl(var(--atlas-success))]/50 bg-[hsl(var(--atlas-success))]/10"
              : "border-transparent bg-secondary/50 hover:bg-secondary"
          )}>
            <RadioGroupItem value="none" />
            <span className="text-sm">ไม่มี (นักเรียนทุกคนสุขภาพดี/หายป่วยแล้ว)</span>
          </label>
          <label className={cn(
            "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
            data.healthCareStatus === "has"
              ? "border-[hsl(var(--atlas-warning))]/50 bg-[hsl(var(--atlas-warning))]/10"
              : "border-transparent bg-secondary/50 hover:bg-secondary"
          )}>
            <RadioGroupItem value="has" />
            <span className="text-sm">มี (โปรดระบุ ID)</span>
          </label>
        </RadioGroup>
        {data.healthCareStatus === "has" && (
          <Input
            placeholder="ระบุเลขประจำตัว (ใช้ , คั่นหากมีหลายคน)"
            value={data.healthCareIds}
            onChange={(e) => onChange("healthCareIds", e.target.value)}
            className={cn(errors.healthCareIds && "border-destructive")}
            maxLength={200}
          />
        )}
        {errors.healthCareStatus && <p className="text-xs text-destructive">{errors.healthCareStatus}</p>}
        {errors.healthCareIds && <p className="text-xs text-destructive">{errors.healthCareIds}</p>}
      </div>
    </div>
  );
}
