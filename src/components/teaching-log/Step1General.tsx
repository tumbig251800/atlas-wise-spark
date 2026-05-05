import { format } from "date-fns";
import { useState, useEffect } from "react";
import { CalendarIcon, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Step1Props {
  data: {
    teachingDate: string;
    gradeLevel: string;
    classroom: string;
    subject: string;
    learningUnit: string;
    topic: string;
    totalStudents: number | null;
  };
  onChange: (field: string, value: unknown) => void;
  errors: Record<string, string>;
  teacherName?: string;
}

const GRADES = ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"];
const CLASSROOMS = ["1", "2", "3", "4", "5", "6", "7", "8"];

const SUBJECTS = [
  "ภาษาไทย",
  "คณิตศาสตร์",
  "วิทยาศาสตร์",
  "การงานอาชีพ",
  "ศิลปะ",
  "สังคมศึกษา",
  "ภาษาจีน",
  "ภาษาอังกฤษเพื่อการสื่อสาร",
  "ประวัติศาสตร์",
  "หน้าที่พลเมือง",
  "ต้านทุจริต",
  "การอ่านและการเขียนเพื่อการสื่อสาร",
  "การคิดคำนวณ",
  "การเรียนรู้เพื่อเข้าใจธรรมชาติและวิทยาศาสตร์",
  "ความเป็นพลเมืองและชีวิตในสังคม",
  "การเรียนรู้ทักษะศิลปะและวัฒนธรรม",
  "พลศึกษาและสุขภาวะ",
  "สุขศึกษาและพลศึกษา",
  "ภาษาอังกฤษ",
  "ภาษาอังกฤษ KWB",
  "การอ่านและการเขียนเพื่อการสื่อสารภาษาอังกฤษ",
];

export function Step1General({ data, onChange, errors, teacherName }: Step1Props) {
  const dateValue = data.teachingDate ? new Date(`${data.teachingDate}T00:00:00`) : new Date();

  // Local state prevents parent re-renders from interrupting typing
  const [rawStudents, setRawStudents] = useState(data.totalStudents?.toString() ?? "");
  const [localUnit, setLocalUnit] = useState(data.learningUnit);
  const [localTopic, setLocalTopic] = useState(data.topic);

  // Sync down from parent only when parent resets (e.g. after submit)
  useEffect(() => { setRawStudents(data.totalStudents?.toString() ?? ""); }, [data.totalStudents]);
  useEffect(() => { setLocalUnit(data.learningUnit); }, [data.learningUnit]);
  useEffect(() => { setLocalTopic(data.topic); }, [data.topic]);

  return (
    <div className="space-y-4">
      {/* Teacher Name (Read-only) */}
      {teacherName && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">ผู้สอน:</span>
          <span className="text-sm font-medium">{teacherName}</span>
        </div>
      )}

      {/* Date */}
      <div className="space-y-2">
        <Label>วันที่สอน</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data.teachingDate && "text-muted-foreground")}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(dateValue, "dd/MM/yyyy")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={(d) => {
                if (!d) return;
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                const day = String(d.getDate()).padStart(2, "0");
                onChange("teachingDate", `${y}-${m}-${day}`);
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Grade */}
      <div className="space-y-2">
        <Label>ระดับชั้น <span className="text-destructive">*</span></Label>
        <Select value={data.gradeLevel} onValueChange={(v) => onChange("gradeLevel", v)}>
          <SelectTrigger className={cn(errors.gradeLevel && "border-destructive")}>
            <SelectValue placeholder="เลือกระดับชั้น" />
          </SelectTrigger>
          <SelectContent>
            {GRADES.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.gradeLevel && <p className="text-xs text-destructive" data-error>{errors.gradeLevel}</p>}
      </div>

      {/* Classroom */}
      <div className="space-y-2">
        <Label>ห้องเรียน <span className="text-destructive">*</span></Label>
        <Select value={data.classroom} onValueChange={(v) => onChange("classroom", v)}>
          <SelectTrigger className={cn(errors.classroom && "border-destructive")}>
            <SelectValue placeholder="เลือกห้องเรียน" />
          </SelectTrigger>
          <SelectContent>
            {CLASSROOMS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.classroom && <p className="text-xs text-destructive" data-error>{errors.classroom}</p>}
      </div>

      {/* Total Students — text+inputMode avoids the number-spinner jumping issue */}
      <div className="space-y-2">
        <Label>จำนวนนักเรียนทั้งหมดในคาบนี้ <span className="text-destructive">*</span></Label>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="เช่น 35"
          value={rawStudents}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "");
            setRawStudents(raw);
            const num = parseInt(raw);
            onChange("totalStudents", isNaN(num) ? null : Math.min(60, num));
          }}
          onBlur={() => {
            const num = parseInt(rawStudents);
            if (!isNaN(num)) {
              const clamped = Math.min(60, Math.max(1, num));
              setRawStudents(clamped.toString());
              onChange("totalStudents", clamped);
            } else {
              setRawStudents("");
              onChange("totalStudents", null);
            }
          }}
          className={cn(errors.totalStudents && "border-destructive")}
        />
        {errors.totalStudents && <p className="text-xs text-destructive" data-error>{errors.totalStudents}</p>}
      </div>

      {/* Subject - Dropdown */}
      <div className="space-y-2">
        <Label>วิชาที่สอน <span className="text-destructive">*</span></Label>
        <Select value={data.subject} onValueChange={(v) => onChange("subject", v)}>
          <SelectTrigger className={cn(errors.subject && "border-destructive")}>
            <SelectValue placeholder="เลือกวิชา" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {SUBJECTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {errors.subject && <p className="text-xs text-destructive" data-error>{errors.subject}</p>}
      </div>

      {/* Learning Unit */}
      <div className="space-y-2">
        <Label>หน่วยการเรียนรู้ <span className="text-destructive">*</span></Label>
        <Input
          placeholder="เช่น หน่วยที่ 3 เศษส่วน"
          value={localUnit}
          autoComplete="off"
          onChange={(e) => {
            setLocalUnit(e.target.value);
            onChange("learningUnit", e.target.value);
          }}
          className={cn(errors.learningUnit && "border-destructive")}
          maxLength={200}
        />
        {errors.learningUnit && <p className="text-xs text-destructive" data-error>{errors.learningUnit}</p>}
      </div>

      {/* Topic */}
      <div className="space-y-2">
        <Label>เรื่องที่สอน <span className="text-destructive">*</span></Label>
        <Input
          placeholder="เช่น การบวกเศษส่วน"
          value={localTopic}
          autoComplete="off"
          onChange={(e) => {
            setLocalTopic(e.target.value);
            onChange("topic", e.target.value);
          }}
          className={cn(errors.topic && "border-destructive")}
          maxLength={200}
        />
        {errors.topic && <p className="text-xs text-destructive" data-error>{errors.topic}</p>}
      </div>
    </div>
  );
}
