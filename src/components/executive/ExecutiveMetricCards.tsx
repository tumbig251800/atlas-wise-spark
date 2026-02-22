import { Card, CardContent } from "@/components/ui/card";
import { FileText, TrendingUp, AlertTriangle } from "lucide-react";
import type { TeachingLog } from "@/hooks/useDashboardData";

interface Props {
  logs: TeachingLog[];
}

export function ExecutiveMetricCards({ logs }: Props) {
  const totalLogs = logs.length;
  const avgMastery = totalLogs > 0
    ? Math.round(logs.reduce((s, l) => s + l.mastery_score, 0) / totalLogs)
    : 0;

  const gapCounts: Record<string, number> = {};
  logs.forEach((l) => {
    gapCounts[l.major_gap] = (gapCounts[l.major_gap] || 0) + 1;
  });
  const dominantGap = Object.entries(gapCounts).sort((a, b) => b[1] - a[1])[0];

  const gapLabels: Record<string, string> = {
    "k-gap": "K-Gap (ความรู้)",
    "p-gap": "P-Gap (ทักษะ)",
    "a-gap": "A-Gap (เจตคติ)",
    "system-gap": "System Gap",
    success: "Success",
  };

  const cards = [
    {
      icon: FileText,
      label: "จำนวน Log ทั้งหมด",
      value: totalLogs.toLocaleString(),
      color: "text-[hsl(var(--atlas-info))]",
      bg: "bg-[hsl(var(--atlas-info)/0.1)]",
    },
    {
      icon: TrendingUp,
      label: "Mastery เฉลี่ย",
      value: `${avgMastery}%`,
      color: "text-[hsl(var(--atlas-success))]",
      bg: "bg-[hsl(var(--atlas-success)/0.1)]",
    },
    {
      icon: AlertTriangle,
      label: "Gap ที่พบมากสุด",
      value: dominantGap ? `${gapLabels[dominantGap[0]] ?? dominantGap[0]} (${dominantGap[1]})` : "-",
      color: "text-[hsl(var(--atlas-warning))]",
      bg: "bg-[hsl(var(--atlas-warning)/0.1)]",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="glass-card">
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.bg}`}>
              <c.icon className={`h-6 w-6 ${c.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold">{c.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
