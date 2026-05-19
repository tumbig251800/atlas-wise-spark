import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUp, ArrowDown, Minus, Info } from "lucide-react";
import type { TeachingLog } from "@/hooks/useDashboardData";

const MASTERY_COLOR = "hsl(45 93% 58%)";
const BASELINE_COLOR = "hsl(215 20% 65%)";
const CURRENT_COLOR = "hsl(142 76% 36%)";

/**
 * Minimum logs required to compute Baseline/Current/Velocity meaningfully.
 * Below this, the 20%/20% slices collapse to single points and "velocity"
 * becomes "difference between two random sessions" — not a trend.
 */
const VELOCITY_MIN_LOGS = 5;
/** Minimum logs needed to render the line chart at all (need at least 2 dots). */
const CHART_MIN_LOGS = 2;

interface Props {
  logs: TeachingLog[];
}

function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function buildChartData(logs: TeachingLog[]) {
  return logs.map((log, i) => ({
    name: log.teaching_date,
    mastery: (log.mastery_score / 5) * 100,
    index: i + 1,
  }));
}

export function QWRTrendChart({ logs }: Props) {
  const n = logs.length;

  // Tier 1 (n=0-1): not enough to draw any line — give actionable empty state
  if (n < CHART_MIN_LOGS) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground space-y-2">
        <p className="text-lg">📈 ข้อมูลยังไม่เพียงพอ</p>
        <p className="text-sm">
          Filter ที่เลือกมีแค่ {n} คาบ — ต้องการอย่างน้อย {CHART_MIN_LOGS} คาบจึงจะวาดเส้น trend ได้
          และ {VELOCITY_MIN_LOGS} คาบจึงคำนวณ Growth Velocity ได้
        </p>
        <p className="text-xs">
          ลองลด filter (เอาวิชาออก หรือเลือกชั้นเดียว) หรือเปลี่ยนเป็นเทอมเก่าที่มีข้อมูลครบกว่า
        </p>
      </div>
    );
  }

  const canComputeVelocity = n >= VELOCITY_MIN_LOGS;

  const baselineSlice = logs.slice(0, Math.ceil(n * 0.2));
  const currentSlice = logs.slice(Math.floor(n * 0.8));
  const baselineAvg = mean(baselineSlice.map((l) => l.mastery_score));
  const currentAvg = mean(currentSlice.map((l) => l.mastery_score));
  const velocity = currentAvg - baselineAvg;
  const baselinePct = (baselineAvg / 5) * 100;
  const currentPct = (currentAvg / 5) * 100;

  const chartData = buildChartData(logs);

  return (
    <div className="space-y-4">
      {canComputeVelocity ? (
        <>
          {/* Velocity hero */}
          <div className="glass-card p-6 flex items-center justify-center gap-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Growth Velocity</p>
              <div className="flex items-center gap-2 justify-center">
                {velocity > 0 ? (
                  <ArrowUp className="h-8 w-8 text-emerald-400" />
                ) : velocity < 0 ? (
                  <ArrowDown className="h-8 w-8 text-red-400" />
                ) : (
                  <Minus className="h-8 w-8 text-muted-foreground" />
                )}
                <span
                  className={`text-4xl font-bold ${
                    velocity > 0 ? "text-emerald-400" : velocity < 0 ? "text-red-400" : "text-muted-foreground"
                  }`}
                >
                  {velocity > 0 ? "+" : ""}
                  {((velocity / 5) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Summary cards (Baseline/Current/Count) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Baseline Avg</p>
              <p className="text-2xl font-bold mt-1">{baselineAvg.toFixed(2)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground">Current Avg</p>
              <p className="text-2xl font-bold mt-1">{currentAvg.toFixed(2)}</p>
            </div>
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground">จำนวนคาบ</p>
              <p className="text-2xl font-bold mt-1">{n}</p>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Tier 2 (n=2-4): show count + caveat, hide velocity/baseline/current to avoid misleading stats */}
          <Alert className="border-[hsl(var(--atlas-info))]/50 bg-[hsl(var(--atlas-info))]/10">
            <Info className="h-4 w-4 text-[hsl(var(--atlas-info))]" />
            <AlertDescription className="text-muted-foreground">
              📊 ดูเฉพาะการกระจาย Mastery ({n} คาบ) — ต้องการอย่างน้อย {VELOCITY_MIN_LOGS} คาบจึงคำนวณ Growth Velocity / Baseline / Current ได้
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-1 gap-3">
            <div className="glass-card p-4 text-center">
              <p className="text-xs text-muted-foreground">จำนวนคาบ</p>
              <p className="text-2xl font-bold mt-1">{n}</p>
            </div>
          </div>
        </>
      )}

      {/* Trend chart — rendered in both tiers; baseline/current reference lines only when computable */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Mastery Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 65%)", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(215 20% 65%)", fontSize: 12 }} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(222 47% 13%)",
                    border: "1px solid hsl(217 33% 25%)",
                    borderRadius: "8px",
                    color: "hsl(210 40% 98%)",
                  }}
                />
                {canComputeVelocity && (
                  <>
                    <ReferenceLine y={baselinePct} stroke={BASELINE_COLOR} strokeDasharray="5 5" label={{ value: "Baseline", fill: BASELINE_COLOR, fontSize: 11 }} />
                    <ReferenceLine y={currentPct} stroke={CURRENT_COLOR} strokeDasharray="5 5" label={{ value: "Current", fill: CURRENT_COLOR, fontSize: 11 }} />
                  </>
                )}
                <Line type="monotone" dataKey="mastery" stroke={MASTERY_COLOR} strokeWidth={2.5} dot={{ fill: MASTERY_COLOR, r: 4 }} name="Mastery %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
