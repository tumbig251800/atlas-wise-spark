import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Loader2, History, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultSnapshotEquipment, SNAPSHOT_EQUIPMENT_OPTIONS } from "./lessonPlanSnapshotConstants";

export type LessonPlanGenerationMode = "reflection" | "context_snapshot";

export interface LessonPlanConfig {
  planType: "hourly" | "weekly";
  gradeLevel: string;
  classroom: string;
  subject: string;
  learningUnit: string;
  hours: number;
  topic: string;
  includeWorksheets: boolean;
  generationMode: LessonPlanGenerationMode;
  /** โหมดบริบทห้อง: กลุ่มเด็กเรียนดี */
  snapshotStrong: boolean;
  /** โหมดบริบทห้อง: กลุ่มเด็กต้องเสริม */
  snapshotWeak: boolean;
  /** โหมดบริบทห้อง: กลุ่มปานกลาง */
  snapshotBalanced: boolean;
  snapshotEquipment: Record<string, boolean>;
  snapshotClassNotes: string;
  snapshotFocusNotes: string;
}

interface Props {
  config: LessonPlanConfig;
  onChange: (c: LessonPlanConfig) => void;
  gradeLevels: string[];
  classrooms: string[];
  subjects: string[];
  hasLogOptions: boolean;
  onGenerate: () => void;
  loading: boolean;
}

function snapshotSectionFilled(c: LessonPlanConfig): boolean {
  if (c.generationMode !== "context_snapshot") return true;
  const hasLevel = c.snapshotStrong || c.snapshotWeak || c.snapshotBalanced;
  const hasEquip = Object.values(c.snapshotEquipment).some(Boolean);
  return (
    hasLevel ||
    hasEquip ||
    !!c.snapshotClassNotes.trim() ||
    !!c.snapshotFocusNotes.trim()
  );
}

export function LessonPlanForm({
  config,
  onChange,
  gradeLevels,
  classrooms,
  subjects,
  hasLogOptions,
  onGenerate,
  loading,
}: Props) {
  const [manualOverride, setManualOverride] = useState(false);
  const update = (p: Partial<LessonPlanConfig>) => onChange({ ...config, ...p });

  const useManualFilters = !hasLogOptions || manualOverride;

  const baseFilled =
    !!config.gradeLevel.trim() &&
    !!config.classroom.trim() &&
    !!config.subject.trim() &&
    !!config.learningUnit.trim() &&
    !!config.topic.trim();

  const canSubmit = baseFilled && snapshotSectionFilled(config);

  const toggleEquipment = (id: string, checked: boolean) => {
    update({
      snapshotEquipment: { ...config.snapshotEquipment, [id]: checked },
    });
  };

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="space-y-3">
        <Label className="text-base font-semibold">โหมดการสร้างแผน</Label>
        <RadioGroup
          value={config.generationMode}
          onValueChange={(v) => update({ generationMode: v as LessonPlanGenerationMode })}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <label
            className={cn(
              "flex gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all items-start",
              config.generationMode === "reflection"
                ? "border-primary/60 bg-primary/5"
                : "border-transparent bg-secondary/40 hover:bg-secondary/70",
            )}
          >
            <RadioGroupItem value="reflection" className="mt-1 shrink-0" />
            <div className="space-y-1 min-w-0">
              <span className="flex items-center gap-2 font-medium text-sm">
                <History className="h-4 w-4 shrink-0 text-primary" />
                ต่อยอดจากบันทึกหลังสอน
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ใช้สถิติ Gap / Mastery และหัวข้อจาก Teaching Logs ล่าสุดของชั้น ห้อง วิชาที่เลือก
              </p>
            </div>
          </label>
          <label
            className={cn(
              "flex gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all items-start",
              config.generationMode === "context_snapshot"
                ? "border-primary/60 bg-primary/5"
                : "border-transparent bg-secondary/40 hover:bg-secondary/70",
            )}
          >
            <RadioGroupItem value="context_snapshot" className="mt-1 shrink-0" />
            <div className="space-y-1 min-w-0">
              <span className="flex items-center gap-2 font-medium text-sm">
                <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                ปรับตามบริบทห้อง
              </span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                ระบุกลุ่มเด็ก อุปกรณ์ และข้อความบริบทเอง ไม่จำเป็นต้องมีบันทึกหลังสอนในระบบ
              </p>
            </div>
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">ตั้งค่าแผนการสอน</h2>
          <p className="text-xs text-muted-foreground">
            {config.generationMode === "reflection"
              ? "เมื่อมีข้อมูลในระบบ จะดึงชั้น ห้อง วิชาจาก Teaching Logs — หรือกรอกเองด้านล่าง"
              : "กรอกชั้น ห้อง วิชา และบริบทห้องด้านล่างให้ครบถ้าเป็นไปได้"}
          </p>
        </div>
        {hasLogOptions && (
          <button
            type="button"
            onClick={() => setManualOverride(!manualOverride)}
            className="text-xs text-primary hover:underline font-medium"
          >
            {manualOverride ? "กลับไปใช้ตัวเลือกจากที่มีในระบบ" : "กรอกชั้น ห้อง วิชาเอง (แนะนำถ้าสอนระดับ ป.)"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">ประเภทแผน</label>
          <Select value={config.planType} onValueChange={(v) => update({ planType: v as "hourly" | "weekly" })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hourly">แผนรายชั่วโมง</SelectItem>
              <SelectItem value="weekly">แผนรายสัปดาห์</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1 sm:col-span-1 lg:col-span-2">
          <label className="text-xs text-muted-foreground">หน่วยการเรียน</label>
          <Input
            value={config.learningUnit}
            onChange={(e) => update({ learningUnit: e.target.value })}
            placeholder="เช่น หน่วยการเรียนที่ 1 (ป.1)"
          />
        </div>

        {useManualFilters ? (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ชั้นเรียน</label>
              <Input
                value={config.gradeLevel}
                onChange={(e) => update({ gradeLevel: e.target.value })}
                placeholder="เช่น ป.1/1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ห้อง</label>
              <Input
                value={config.classroom}
                onChange={(e) => update({ classroom: e.target.value })}
                placeholder="ห้อง 1"
              />
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs text-muted-foreground">วิชา</label>
              <Input
                value={config.subject}
                onChange={(e) => update({ subject: e.target.value })}
                placeholder="เช่น คณิตศาสตร์"
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-muted-foreground">ชั้นเรียน</label>
              <Select value={config.gradeLevel} onValueChange={(v) => update({ gradeLevel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือก" />
                </SelectTrigger>
                <SelectContent>
                  {gradeLevels.filter(Boolean).map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ห้อง</label>
              <Select value={config.classroom} onValueChange={(v) => update({ classroom: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือก" />
                </SelectTrigger>
                <SelectContent>
                  {classrooms.filter(Boolean).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">วิชา</label>
              <Select value={config.subject} onValueChange={(v) => update({ subject: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือก" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.filter(Boolean).map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-1 sm:col-span-2 lg:col-span-3 pt-1">
              <p className="text-[11px] text-muted-foreground italic">
                * ค่าดึงจากบันทึกหลังสอน — ถ้าต้องการรูปแบบ ป. ให้กด &quot;กรอกชั้น ห้อง วิชาเอง&quot; ด้านบน
              </p>
            </div>
          </>
        )}

        {config.planType === "weekly" && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">จำนวนชั่วโมง</label>
            <Input
              type="number"
              min={1}
              max={5}
              value={config.hours}
              onChange={(e) => update({ hours: Number(e.target.value) })}
            />
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">หัวข้อ/เนื้อหาที่จะสอน</label>
        <Textarea
          value={config.topic}
          onChange={(e) => update({ topic: e.target.value })}
          placeholder="เช่น ระบบนิเวศ, การอ่านจับใจความ..."
          rows={2}
        />
      </div>

      {config.generationMode === "context_snapshot" && (
        <div className="space-y-4 rounded-lg border border-border/80 bg-muted/20 p-4">
          <p className="text-sm font-medium">บริบทห้องเรียน (Phase 3)</p>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">กลุ่มนักเรียน (เลือกได้มากกว่าหนึ่ง)</p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={config.snapshotStrong}
                  onCheckedChange={(x) => update({ snapshotStrong: !!x })}
                />
                กลุ่มเรียนดี / เก่ง
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={config.snapshotWeak}
                  onCheckedChange={(x) => update({ snapshotWeak: !!x })}
                />
                กลุ่มต้องเสริม / อ่อน
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={config.snapshotBalanced}
                  onCheckedChange={(x) => update({ snapshotBalanced: !!x })}
                />
                กลุ่มปานกลาง
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">อุปกรณ์ที่มีในห้อง / ใช้ได้</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SNAPSHOT_EQUIPMENT_OPTIONS.map(({ id, label }) => (
                <label key={id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={!!config.snapshotEquipment[id]}
                    onCheckedChange={(x) => toggleEquipment(id, !!x)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">สภาพห้อง / จำนวนนักเรียน / รายละเอียดเพิ่มเติม</label>
            <Textarea
              value={config.snapshotClassNotes}
              onChange={(e) => update({ snapshotClassNotes: e.target.value })}
              placeholder="เช่น นักเรียน 32 คน พื้นฐานคณิตดี แต่เทียบเศษส่วนยังสับสน..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">จุดเน้น / ข้อจำกัด (ถ้ามี)</label>
            <Textarea
              value={config.snapshotFocusNotes}
              onChange={(e) => update({ snapshotFocusNotes: e.target.value })}
              placeholder="เช่น คาบ 50 นาที ต้องการทั้งฝึกฝนคล่ายและโจทย์เปิด..."
              rows={2}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            เลือกอย่างน้อยหนึ่งอย่าง: กลุ่มนักเรียน อุปกรณ์ หรือกรอกข้อความในช่องใดช่องหนึ่งด้านบน
          </p>
        </div>
      )}

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

      <Button onClick={onGenerate} disabled={loading || !canSubmit} className="w-full sm:w-auto">
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
        สร้างแผนการสอน
      </Button>
    </div>
  );
}
