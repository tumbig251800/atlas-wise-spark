import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

export type ActionFilterChip = "all" | "overdue" | "open" | "verified" | "dismissed";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filter: ActionFilterChip;
  onFilterChange: (f: ActionFilterChip) => void;
  counts: Record<ActionFilterChip, number>;
}

const TABS: { value: ActionFilterChip; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "open", label: "ต้องนิเทศ" },
  { value: "overdue", label: "กำลังติดตาม" },
  { value: "verified", label: "ปิดแล้ว" },
];

export function ActionFilters({ search, onSearchChange, filter, onFilterChange, counts }: Props) {
  // Combine counts for 'ต้องนิเทศ' (open+watching status items) and 'ปิดแล้ว' (verified+dismissed)
  const tabCounts = {
    all: counts.all,
    open: counts.open,
    overdue: counts.overdue,
    verified: counts.verified + counts.dismissed,
  };

  return (
    <div className="glass-card p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="ค้นหาชื่อครู / ห้อง / วิชา..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as ActionFilterChip)}>
        <TabsList className="w-full grid grid-cols-4">
          {TABS.map((tab) => (
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
