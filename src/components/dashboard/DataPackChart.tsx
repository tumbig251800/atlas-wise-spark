import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TeachingLog } from "@/hooks/useDashboardData";
import type { DiagnosticEvent } from "@/hooks/useDiagnosticData";
import type { DecisionObject } from "@/lib/atlasStrictNarrator";

const GAP_COLORS = {
  kGap: "hsl(0 84% 60%)",
  pGap: "hsl(25 95% 53%)",
  aGap: "hsl(270 70% 60%)",
  systemGap: "hsl(215 20% 65%)",
};
const MASTERY_COLOR = "hsl(45 93% 58%)";

interface Props {
  logs: TeachingLog[];
  diagnosticEvents?: DiagnosticEvent[];
}

export function DataPackChart({ logs, diagnosticEvents = [] }: Props) {
  if (logs.length < 2) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        <p className="text-lg">📊 ข้อมูลยังไม่เพียงพอ</p>
        <p className="text-sm mt-2">ต้องมีอย่างน้อย 2 คาบจึงจะแสดง Data Pack ได้</p>
      </div>
    );
  }

  const last5 = logs.slice(-5);

  const decisionLookup = new Map<string, DecisionObject>();
  (diagnosticEvents ?? []).forEach((de: any) => {
    if (de.decision_object && !de.student_id && !decisionLookup.has(de.teaching_log_id)) {
      decisionLookup.set(de.teaching_log_id, de.decision_object as DecisionObject);
    }
  });

  const hasPivotEvent = last5.some((log) => {
    const d = decisionLookup.get(log.id);
    return d?.pivot_triggered === true;
  });
  const hasPlanFail = !hasPivotEvent && last5.some((log) => {
    const d = decisionLookup.get(log.id);
    return d && (d.class_strike_count === 1 || d.intervention_size === "plan-fail");
  });

  const chartData = last5.map((log, i) => ({
    name: `คาบ ${i + 1}\n${log.teaching_date}`,
    kGap: log.major_gap === "k-gap" ? 1 : 0,
    pGap: log.major_gap === "p-gap" ? 1 : 0,
    aGap: log.major_gap === "a-gap" ? 1 : 0,
    systemGap: log.major_gap === "system-gap" ? 1 : 0,
    mastery: log.mastery_score,
  }));

  // Find dominant gap
  const gapCounts: Record<string, number> = {};
  last5.forEach((l) => {
    gapCounts[l.major_gap] = (gapCounts[l.major_gap] || 0) + 1;
  });
  const dominantGap = Object.entries(gapCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-4">
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2 flex-wrap">
            <span>Data Pack — 5 คาบล่าสุด</span>
            {hasPivotEvent && (
              <Badge variant="destructive" className="animate-pivot-blink text-xs">
                🔴 PIVOT MODE TRIGGERED
              </Badge>
            )}
            {hasPlanFail && (
              <Badge variant="outline" className="text-xs border-orange-400 bg-orange-100 text-orange-700">
                🟠 PLAN FAIL SIGNAL
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 65%)", fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fill: "hsl(215 20% 65%)", fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fill: "hsl(45 93% 58%)", fontSize: 12 }} label={{ value: "Mastery (0-5)", angle: -90, position: "insideRight", fill: "hsl(45 93% 58%)", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222 47% 13%)",
                    border: "1px solid hsl(217 33% 25%)",
                    borderRadius: "8px",
                    color: "hsl(210 40% 98%)",
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="kGap" stackId="gap" fill={GAP_COLORS.kGap} name="K-Gap" radius={[0, 0, 0, 0]} />
                <Bar yAxisId="left" dataKey="pGap" stackId="gap" fill={GAP_COLORS.pGap} name="P-Gap" />
                <Bar yAxisId="left" dataKey="aGap" stackId="gap" fill={GAP_COLORS.aGap} name="A-Gap" />
                <Bar yAxisId="left" dataKey="systemGap" stackId="gap" fill={GAP_COLORS.systemGap} name="System-Gap" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="mastery" stroke={MASTERY_COLOR} strokeWidth={3} dot={{ fill: MASTERY_COLOR, r: 5 }} name="Mastery Score" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {dominantGap && (
        <div className="glass-card p-4">
          <p className="text-sm text-muted-foreground">Gap ที่พบบ่อยที่สุด</p>
          <p className="text-lg font-semibold mt-1">
            <span className="uppercase">{dominantGap[0]}</span>
            <span className="text-muted-foreground ml-2">({dominantGap[1]} จาก {last5.length} คาบ)</span>
          </p>
        </div>
      )}
    </div>
  );
}
