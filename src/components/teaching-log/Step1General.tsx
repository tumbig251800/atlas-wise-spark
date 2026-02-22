import { format } from "date-fns";
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
  onChange: (field: string, value: any) => void;
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
  const dateValue = data.teachingDate ? new Date(data.teachingDate) : new Date();

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
              onSelect={(d) => d && onChange("teachingDate", d.toISOString().split("T")[0])}
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

      {/* Total Students */}
      <div className="space-y-2">
        <Label>จำนวนนักเรียนทั้งหมดในคาบนี้ <span className="text-destructive">*</span></Label>
        <Input
          type="number"
          placeholder="เช่น 35"
          min={1}
          max={60}
          value={data.totalStudents ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            onChange("totalStudents", val === "" ? null : Math.min(60, Math.max(1, parseInt(val) || 0)));
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
          value={data.learningUnit}
          onChange={(e) => onChange("learningUnit", e.target.value)}
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
          value={data.topic}
          onChange={(e) => onChange("topic", e.target.value)}
          className={cn(errors.topic && "border-destructive")}
          maxLength={200}
        />
        {errors.topic && <p className="text-xs text-destructive" data-error>{errors.topic}</p>}
      </div>
    </div>
  );
}
