import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

export type ActionFilterChip = "all" | "overdue" | "open" | "verified" | "dismissed";
export type IssueTypeFilter = "all" | "RedZone" | "MasteryDrop" | "UnitBlindSpot" | "IntegrityFlag" | "FlatScore";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filter: ActionFilterChip;
  onFilterChange: (f: ActionFilterChip) => void;
  counts: Record<ActionFilterChip, number>;
  issueType: IssueTypeFilter;
  onIssueTypeChange: (t: IssueTypeFilter) => void;
  issueCounts: Record<IssueTypeFilter, number>;
}

const STATUS_TABS: { value: ActionFilterChip; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "open", label: "ต้องนิเทศ" },
  { value: "overdue", label: "เกินกำหนด" },
  { value: "verified", label: "ปิดแล้ว" },
];

const ISSUE_TABS: { value: IssueTypeFilter; label: string; color: string }[] = [
  { value: "all",            label: "ทุกประเภท",              color: "" },
  { value: "RedZone",        label: "🔴 เสี่ยงสูง",           color: "data-[state=active]:bg-red-100 data-[state=active]:text-red-800" },
  { value: "MasteryDrop",    label: "📉 คะแนนร่วง",           color: "data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800" },
  { value: "UnitBlindSpot",  label: "📦 คะแนนหลังหน่วยต่ำ",   color: "data-[state=active]:bg-blue-100 data-[state=active]:text-blue-800" },
  { value: "IntegrityFlag",  label: "🚩 ข้อมูลผิดปกติ",       color: "data-[state=active]:bg-gray-100 data-[state=active]:text-gray-800" },
  { value: "FlatScore",      label: "🎯 คะแนนนิ่ง",           color: "data-[state=active]:bg-teal-100 data-[state=active]:text-teal-800" },
];

export function ActionFilters({ search, onSearchChange, filter, onFilterChange, counts, issueType, onIssueTypeChange, issueCounts }: Props) {
  const tabCounts = {
    all: counts.all,
    open: counts.open,
    overdue: counts.overdue,
    verified: counts.verified + counts.dismissed,
  };

  return (
    <div className="glass-card p-4 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อครู / ห้อง / วิชา..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Issue type tabs */}
      <Tabs value={issueType} onValueChange={(v) => onIssueTypeChange(v as IssueTypeFilter)}>
        <TabsList className="w-full grid grid-cols-6">
          {ISSUE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className={`gap-1 text-xs ${tab.color}`}>
              {tab.label}
              <Badge variant="secondary" className="text-xs px-1">
                {issueCounts[tab.value]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Status tabs */}
      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as ActionFilterChip)}>
        <TabsList className="w-full grid grid-cols-4">
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
              {tab.label}
              <Badge variant="secondary" className="text-xs">
                {tabCounts[tab.value as keyof typeof tabCounts]}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
