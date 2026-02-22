import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RotateCcw, Filter } from "lucide-react";

export interface ExecFilters {
  dateFrom: string;
  dateTo: string;
  gradeLevel: string;
  classroom: string;
  subject: string;
  teacherName: string;
}

interface Props {
  filters: ExecFilters;
  onChange: (f: ExecFilters) => void;
  gradeLevels: string[];
  classrooms: string[];
  subjects: string[];
  teacherNames: string[];
}

const ALL = "all";

export function ExecutiveFilters({ filters, onChange, gradeLevels, classrooms, subjects, teacherNames }: Props) {
  const update = (partial: Partial<ExecFilters>) => {
    const next = { ...filters, ...partial };
    if (partial.gradeLevel !== undefined) next.classroom = next.subject = next.teacherName = "";
    else if (partial.classroom !== undefined) next.subject = next.teacherName = "";
    else if (partial.subject !== undefined) next.teacherName = "";
    onChange(next);
  };
  const reset = () => onChange({
    dateFrom: "",
    dateTo: "",
    gradeLevel: "",
    classroom: "",
    subject: "",
    teacherName: "",
  });
  const hasActiveFilter = filters.dateFrom || filters.dateTo || filters.gradeLevel || filters.classroom || filters.subject || filters.teacherName;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>ตัวกรอง — ใช้กับเมตริก กราฟ และตารางทั้งหมดด้านล่าง</span>
      </div>
      <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">ตั้งแต่</label>
        <Input type="date" value={filters.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} className="w-36 h-9 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">ถึง</label>
        <Input type="date" value={filters.dateTo} onChange={(e) => update({ dateTo: e.target.value })} className="w-36 h-9 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">ระดับชั้น</label>
        <Select value={filters.gradeLevel || ALL} onValueChange={(v) => update({ gradeLevel: v === ALL ? "" : v })}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="ทั้งหมด" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทั้งหมด</SelectItem>
            {gradeLevels.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">ห้อง</label>
        <Select value={filters.classroom || ALL} onValueChange={(v) => update({ classroom: v === ALL ? "" : v })}>
          <SelectTrigger className="w-28 h-9"><SelectValue placeholder="ทั้งหมด" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทั้งหมด</SelectItem>
            {classrooms.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">วิชา</label>
        <Select value={filters.subject || ALL} onValueChange={(v) => update({ subject: v === ALL ? "" : v })}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="ทั้งหมด" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทั้งหมด</SelectItem>
            {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground" title="แสดงเฉพาะครูที่สอนชั้น/ห้อง/วิชาที่เลือก">ครูผู้สอน</label>
        <Select value={filters.teacherName || ALL} onValueChange={(v) => update({ teacherName: v === ALL ? "" : v })}>
          <SelectTrigger className="w-40 h-9" title="เลือกระดับชั้น ห้อง วิชา ก่อน เพื่อกรองรายชื่อครู"><SelectValue placeholder="ทั้งหมด" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>ทั้งหมด</SelectItem>
            {teacherNames.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-9 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />รีเซ็ต
          </Button>
        )}
      </div>
    </div>
  );
}
