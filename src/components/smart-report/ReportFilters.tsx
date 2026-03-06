import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { RotateCcw, Filter } from "lucide-react";
import type { SmartReportFilter } from "@/types/smartReport";
import type { SmartReportFilterOptions } from "@/lib/smartReportQueries";

interface Props {
  filters: SmartReportFilter;
  setFilters: (f: SmartReportFilter) => void;
  options: SmartReportFilterOptions;
}

export function ReportFilters({ filters, setFilters, options }: Props) {
  const hasActive =
    filters.subject || filters.gradeLevel || filters.classroom || filters.academicTerm;

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>ตัวกรอง — ใช้กับรายงานสมรรถนะและ Gap Validation</span>
      </div>
      <div className="flex flex-wrap gap-4 items-end">
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
        <FilterSelect
          label="เทอม"
          value={filters.academicTerm}
          options={options.academicTerms}
          onChange={(v) => setFilters({ ...filters, academicTerm: v })}
        />
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              setFilters({
                subject: "",
                gradeLevel: "",
                classroom: "",
                academicTerm: "",
              })
            }
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
