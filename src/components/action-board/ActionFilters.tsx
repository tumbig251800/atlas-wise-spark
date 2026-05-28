import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export type ActionFilterChip = "all" | "overdue" | "open" | "verified" | "dismissed";

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  filter: ActionFilterChip;
  onFilterChange: (f: ActionFilterChip) => void;
  counts: Record<ActionFilterChip, number>;
}

const CHIPS: { value: ActionFilterChip; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "overdue", label: "เกินกำหนด" },
  { value: "open", label: "ค้างอยู่" },
  { value: "verified", label: "Verified" },
  { value: "dismissed", label: "Dismissed" },
];

export function ActionFilters({ search, onSearchChange, filter, onFilterChange, counts }: Props) {
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
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <Button
            key={c.value}
            size="sm"
            variant={filter === c.value ? "default" : "outline"}
            onClick={() => onFilterChange(c.value)}
          >
            {c.label}
            <span className="ml-2 inline-block min-w-[1.25rem] text-center text-xs opacity-80">
              {counts[c.value]}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
