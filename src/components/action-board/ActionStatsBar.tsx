import { Card, CardContent } from "@/components/ui/card";
import { ListChecks, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ActionItem } from "@/hooks/useActionItems";
import { daysRemaining } from "@/hooks/useActionItems";

interface Props {
  items: ActionItem[];
}

export function ActionStatsBar({ items }: Props) {
  const total = items.length;
  const open = items.filter((i) => i.status === "open" || i.status === "resolved").length;
  const overdue = items.filter((i) => {
    if (i.status !== "open" && i.status !== "resolved") return false;
    const d = daysRemaining(i.due_date);
    return d !== null && d <= 0;
  }).length;
  const verified = items.filter((i) => i.status === "verified").length;
  const dismissed = items.filter((i) => i.status === "dismissed").length;

  const stats = [
    { label: "ทั้งหมด", value: total, icon: ListChecks, color: "text-foreground" },
    { label: "ค้างอยู่", value: open, icon: Clock, color: "text-sky-600" },
    { label: "เกินกำหนด", value: overdue, icon: AlertTriangle, color: "text-destructive" },
    { label: "Verified", value: verified, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Dismissed", value: dismissed, icon: XCircle, color: "text-muted-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
