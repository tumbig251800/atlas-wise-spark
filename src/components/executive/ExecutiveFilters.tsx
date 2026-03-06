import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { RotateCcw, Filter } from "lucide-react";

export interface ExecFilters {
  dateFrom: string;
  dateTo: string;
  gradeLevel: string;
  classroom: string;
  subject: string;
  teacherName: string;
  academicTerm: string;
}

interface Props {
  filters: ExecFilters;
  onChange: (f: ExecFilters) => void;
  gradeLevels: string[];
  classrooms: string[];
  subjects: string[];
  teacherNames: string[];
  academicTerms: string[];
}

export function ExecutiveFilters({ filters, onChange, gradeLevels, classrooms, subjects, teacherNames, academicTerms }: Props) {
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
    academicTerm: "",
  });
  const hasActiveFilter = filters.dateFrom || filters.dateTo || filters.gradeLevel || filters.classroom || filters.subject || filters.teacherName || filters.academicTerm;

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
        <FilterSelect
          label="ปีการศึกษา/เทอม"
          value={filters.academicTerm}
          options={academicTerms}
          onChange={(v) => update({ academicTerm: v })}
          triggerClassName="w-36 h-9"
        />
        <FilterSelect
          label="ระดับชั้น"
          value={filters.gradeLevel}
          options={gradeLevels}
          onChange={(v) => update({ gradeLevel: v })}
          triggerClassName="w-32 h-9"
        />
        <FilterSelect
          label="ห้อง"
          value={filters.classroom}
          options={classrooms}
          onChange={(v) => update({ classroom: v })}
          triggerClassName="w-28 h-9"
        />
        <FilterSelect
          label="วิชา"
          value={filters.subject}
          options={subjects}
          onChange={(v) => update({ subject: v })}
          triggerClassName="w-36 h-9"
        />
        <FilterSelect
          label="ครูผู้สอน"
          value={filters.teacherName}
          options={teacherNames}
          onChange={(v) => update({ teacherName: v })}
          triggerClassName="w-40 h-9"
          placeholder="ทั้งหมด"
        />
        {hasActiveFilter && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-9 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5 mr-1" />รีเซ็ต
          </Button>
        )}
      </div>
    </div>
  );
}
