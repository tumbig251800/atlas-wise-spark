import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Filter } from "lucide-react";

export interface HistoryFiltersState {
  subject: string;
  gradeLevel: string;
  classroom: string;
  teacherName: string;
  academicTerm: string;
}

export interface HistoryFilterOptions {
  subjects: string[];
  gradeLevels: string[];
  classrooms: string[];
  teacherNames: string[];
  academicTerms: string[];
}

interface Props {
  filters: HistoryFiltersState;
  setFilters: (f: HistoryFiltersState) => void;
  options: HistoryFilterOptions;
  isDirector: boolean;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
        <SelectTrigger className="bg-secondary/50 border-border h-9">
          <SelectValue placeholder={`เลือก${label}`} />
        </SelectTrigger>
        <SelectContent className="z-[200]" collisionPadding={8}>
          <SelectItem value="all">ทั้งหมด</SelectItem>
          {options.filter(Boolean).map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function HistoryFilters({ filters, setFilters, options, isDirector }: Props) {
  const hasActive =
    filters.subject ||
    filters.gradeLevel ||
    filters.classroom ||
    filters.teacherName ||
    filters.academicTerm;

  const resetFilters = () =>
    setFilters({
      subject: "",
      gradeLevel: "",
      classroom: "",
      teacherName: "",
      academicTerm: "",
    });

  return (
    <div className="glass-card p-4 space-y-3 mb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>ตัวกรองประวัติการสอน</span>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
        <FilterSelect
          label="เทอม"
          value={filters.academicTerm}
          options={options.academicTerms}
          onChange={(v) => setFilters({ ...filters, academicTerm: v })}
        />
        {isDirector && (
          <FilterSelect
            label="ครู"
            value={filters.teacherName}
            options={options.teacherNames}
            onChange={(v) => setFilters({ ...filters, teacherName: v, subject: "" })}
          />
        )}
        <FilterSelect
          label="วิชา"
          value={filters.subject}
          options={options.subjects}
          onChange={(v) => setFilters({ ...filters, subject: v })}
        />
        <FilterSelect
          label="ระดับชั้น"
          value={filters.gradeLevel}
          options={options.gradeLevels}
          onChange={(v) => setFilters({ ...filters, gradeLevel: v })}
        />
        <FilterSelect
          label="ห้อง"
          value={filters.classroom}
          options={options.classrooms}
          onChange={(v) => setFilters({ ...filters, classroom: v })}
        />
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-muted-foreground h-9"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            รีเซ็ต
          </Button>
        )}
      </div>
    </div>
  );
}
