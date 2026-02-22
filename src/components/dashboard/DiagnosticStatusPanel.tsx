import { AlertTriangle, TrendingDown, Clock, Settings, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DiagnosticColorCounts, StrikeCounter } from "@/hooks/useDiagnosticData";

interface Props {
  colorCounts: DiagnosticColorCounts;
  activeStrikes: StrikeCounter[];
}

const STATUS_CONFIG = [
  { key: "red" as const, label: "วิกฤต (RED)", icon: TrendingDown, bgClass: "bg-destructive/15", textClass: "text-destructive", borderClass: "border-destructive/30" },
  { key: "orange" as const, label: "เฝ้าระวัง (ORANGE)", icon: Clock, bgClass: "bg-[hsl(var(--atlas-warning)/.15)]", textClass: "text-[hsl(var(--atlas-warning))]", borderClass: "border-[hsl(var(--atlas-warning)/.3)]" },
  { key: "yellow" as const, label: "Learning Curve", icon: AlertTriangle, bgClass: "bg-[hsl(45_93%_58%/.15)]", textClass: "text-[hsl(var(--atlas-gold))]", borderClass: "border-[hsl(var(--atlas-gold)/.3)]" },
  { key: "blue" as const, label: "System Gap", icon: Settings, bgClass: "bg-[hsl(var(--atlas-info)/.15)]", textClass: "text-[hsl(var(--atlas-info))]", borderClass: "border-[hsl(var(--atlas-info)/.3)]" },
  { key: "green" as const, label: "สำเร็จ (GREEN)", icon: CheckCircle, bgClass: "bg-[hsl(160_84%_30%/0.15)]", textClass: "text-[hsl(160_84%_30%)]", borderClass: "border-[hsl(160_84%_30%/0.3)]" },
];

export function DiagnosticStatusPanel({ colorCounts, activeStrikes }: Props) {
  return (
    <div className="space-y-4">
      {/* Strike Alert Banner */}
      {activeStrikes.length > 0 && (
        <div className="glass-card p-4 border-destructive/50 bg-destructive/10 animate-pulse-glow">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-destructive">
              ⚠️ {activeStrikes.length} รายการอยู่ใน Strike ระดับ 2+
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeStrikes.slice(0, 5).map((s) => (
              <Badge key={s.id} variant="destructive" className="text-xs">
                {s.topic || s.normalized_topic} — Strike {s.strike_count} ({s.scope === "student" ? "รายคน" : "รายห้อง"})
              </Badge>
            ))}
            {activeStrikes.length > 5 && (
              <Badge variant="outline" className="text-xs">+{activeStrikes.length - 5} อื่นๆ</Badge>
            )}
          </div>
        </div>
      )}

      {/* Color Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STATUS_CONFIG.map(({ key, label, icon: Icon, bgClass, textClass, borderClass }) => (
          <Card key={key} className={`${bgClass} ${borderClass} border`}>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Icon className={`h-6 w-6 ${textClass}`} />
              <span className={`text-2xl font-bold ${textClass}`}>{colorCounts[key]}</span>
              <span className="text-xs text-muted-foreground text-center">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
