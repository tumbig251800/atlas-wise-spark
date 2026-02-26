import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw, Filter } from "lucide-react";
import type { DashboardFilters as Filters, FilterOptions } from "@/hooks/useDashboardData";

interface Props {
  filters: Filters;
  setFilters: (f: Filters) => void;
  options: FilterOptions;
}

export function DashboardFilters({ filters, setFilters, options }: Props) {
  const hasActiveFilter = filters.gradeLevel || filters.classroom || filters.subject;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>ตัวกรอง — ใช้กับเมตริก กราฟ และแท็บ Data Pack, QWR, Diagnostic, AI Advice</span>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
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
      <FilterSelect
        label="วิชา"
        value={filters.subject}
        options={options.subjects}
        onChange={(v) => setFilters({ ...filters, subject: v })}
      />
      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setFilters({ gradeLevel: "", classroom: "", subject: "" })}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4 mr-1" />
          รีเซ็ต
        </Button>
      )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)} disabled={disabled}>
        <SelectTrigger className="bg-secondary/50 border-border">
          <SelectValue placeholder={`เลือก${label}`} />
        </SelectTrigger>
        <SelectContent>
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
