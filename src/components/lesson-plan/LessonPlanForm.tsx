import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Loader2 } from "lucide-react";

export interface LessonPlanConfig {
  planType: "hourly" | "weekly";
  gradeLevel: string;
  classroom: string;
  subject: string;
  hours: number;
  topic: string;
  includeWorksheets: boolean;
}

interface Props {
  config: LessonPlanConfig;
  onChange: (c: LessonPlanConfig) => void;
  gradeLevels: string[];
  classrooms: string[];
  subjects: string[];
  onGenerate: () => void;
  loading: boolean;
}

export function LessonPlanForm({ config, onChange, gradeLevels, classrooms, subjects, onGenerate, loading }: Props) {
  const update = (p: Partial<LessonPlanConfig>) => onChange({ ...config, ...p });

  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-lg font-semibold">ตั้งค่าแผนการสอน</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">ประเภทแผน</label>
          <Select value={config.planType} onValueChange={(v) => update({ planType: v as "hourly" | "weekly" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">แผนรายชั่วโมง</SelectItem>
              <SelectItem value="weekly">แผนรายสัปดาห์</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">ชั้นเรียน</label>
          <Select value={config.gradeLevel} onValueChange={(v) => update({ gradeLevel: v })}>
            <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
            <SelectContent>
              {gradeLevels.filter(Boolean).map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">ห้อง</label>
          <Select value={config.classroom} onValueChange={(v) => update({ classroom: v })}>
            <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
            <SelectContent>
              {classrooms.filter(Boolean).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">วิชา</label>
          <Select value={config.subject} onValueChange={(v) => update({ subject: v })}>
            <SelectTrigger><SelectValue placeholder="เลือก" /></SelectTrigger>
            <SelectContent>
              {subjects.filter(Boolean).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {config.planType === "weekly" && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">จำนวนชั่วโมง</label>
            <Input type="number" min={1} max={5} value={config.hours} onChange={(e) => update({ hours: Number(e.target.value) })} />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">หัวข้อ/เนื้อหาที่จะสอน</label>
        <Textarea value={config.topic} onChange={(e) => update({ topic: e.target.value })} placeholder="เช่น สมการเชิงเส้นตัวแปรเดียว, การอ่านจับใจความ..." rows={2} />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="includeWorksheets"
          checked={config.includeWorksheets}
          onCheckedChange={(checked) => update({ includeWorksheets: !!checked })}
        />
        <label htmlFor="includeWorksheets" className="text-sm cursor-pointer">
          ต้องการใบงานประกอบแผนการสอน (Normal + Scaffolding)
        </label>
      </div>

      <Button onClick={onGenerate} disabled={loading || !config.gradeLevel || !config.classroom || !config.subject || !config.topic} className="w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
        สร้างแผนการสอน
      </Button>
    </div>
  );
}
