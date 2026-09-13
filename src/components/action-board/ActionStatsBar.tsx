import type { ActionItem } from "@/hooks/useActionItems";
import { daysRemaining } from "@/hooks/useActionItems";
import { excludeSuspended, getIssueTypeSuspension } from "@/lib/issueTypeSuspension";

interface Props {
  items: ActionItem[];
}

const ISSUE_CONFIGS = [
  { key: "RedZone",       label: "เสี่ยงสูง",           icon: "🔴", bar: "bg-red-500" },
  { key: "MasteryDrop",   label: "คะแนนร่วง",            icon: "📉", bar: "bg-orange-400" },
  { key: "UnitBlindSpot", label: "คะแนนหลังหน่วยต่ำรายนักเรียน", icon: "📦", bar: "bg-blue-500" },
  { key: "IntegrityFlag", label: "ข้อมูลผิดปกติ",        icon: "🚩", bar: "bg-gray-400" },
  { key: "FlatScore",     label: "คะแนนนิ่ง",            icon: "🎯", bar: "bg-teal-500" },
] as const;

export function ActionStatsBar({ items }: Props) {
  const counted = excludeSuspended(items);
  const suspendedCount = items.length - counted.length;
  const total = counted.length;
  const closed = counted.filter((i) => i.status === "verified" || i.status === "dismissed").length;
  const open = counted.filter((i) => i.status === "open" || i.status === "watching" || i.status === "resolved").length;
  const overdue = counted.filter((i) => {
    if (i.status !== "open" && i.status !== "resolved" && i.status !== "watching") return false;
    const d = daysRemaining(i.due_date);
    return d !== null && d <= 0;
  }).length;

  const closedPct = total > 0 ? Math.round((closed / total) * 100) : 0;

  return (
    <div className="glass-card p-4 space-y-4">
      {/* Overall progress */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold">ความคืบหน้าภาพรวม</span>
          <span className="text-sm text-muted-foreground">
            ปิดแล้ว <span className="font-bold text-emerald-600">{closed}</span> / {total} รายการ
            {overdue > 0 && (
              <span className="ml-2 text-destructive font-medium">⚠ เกินกำหนด {overdue}</span>
            )}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${closedPct}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>ค้างอยู่ {open} รายการ</span>
          <span className="font-medium text-emerald-600">{closedPct}%</span>
        </div>
        {suspendedCount > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            ไม่รวมประเภทที่ระงับแล้ว {suspendedCount} รายการ
          </div>
        )}
      </div>

      {/* Per issue type breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ISSUE_CONFIGS.map(({ key, label, icon, bar }) => {
          const typeItems = items.filter((i) => i.issue_type === key);
          const typeClosed = typeItems.filter((i) => i.status === "verified" || i.status === "dismissed").length;
          const typeTotal = typeItems.length;
          const typePct = typeTotal > 0 ? Math.round((typeClosed / typeTotal) * 100) : 0;
          const suspension = getIssueTypeSuspension(key);
          return (
            <div
              key={key}
              className={`rounded-lg border border-border/60 p-3 space-y-1.5 ${suspension ? "bg-muted/40" : "bg-background"}`}
              title={suspension?.reason}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{icon} {label}</span>
                <span className="text-xs text-muted-foreground">{typePct}%</span>
              </div>
              {suspension && (
                <div className="text-[11px] font-medium text-slate-600">
                  ⏸ {suspension.label} ตั้งแต่ {suspension.sinceLabel} · ไม่นับในยอดรวม
                </div>
              )}
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${bar} transition-all duration-500`} style={{ width: `${typePct}%` }} />
              </div>
              <div className="text-xs text-muted-foreground">
                {typeClosed}/{typeTotal} ปิด
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
