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
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { TeachingLog } from "@/hooks/useDashboardData";

const MASTERY_COLOR = "hsl(45 93% 58%)";
const BASELINE_COLOR = "hsl(215 20% 65%)";
const CURRENT_COLOR = "hsl(142 76% 36%)";

interface Props {
  logs: TeachingLog[];
}

function mean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function QWRTrendChart({ logs }: Props) {
  if (logs.length < 5) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        <p className="text-lg">📈 ข้อมูลยังไม่เพียงพอ</p>
        <p className="text-sm mt-2">ต้องมีอย่างน้อย 5 คาบจึงจะคำนวณ Learning Velocity ได้</p>
      </div>
    );
  }

  const n = logs.length;
  const baselineSlice = logs.slice(0, Math.ceil(n * 0.2));
  const currentSlice = logs.slice(Math.floor(n * 0.8));

  const baselineAvg = mean(baselineSlice.map((l) => l.mastery_score));
  const currentAvg = mean(currentSlice.map((l) => l.mastery_score));
  const velocity = currentAvg - baselineAvg;

  const chartData = logs.map((log, i) => ({
    name: log.teaching_date,
    mastery: (log.mastery_score / 5) * 100,
    index: i + 1,
  }));

  const baselinePct = (baselineAvg / 5) * 100;
  const currentPct = (currentAvg / 5) * 100;

  return (
    <div className="space-y-4">
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

      {/* Summary cards */}
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

      {/* Trend chart */}
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
                <ReferenceLine y={baselinePct} stroke={BASELINE_COLOR} strokeDasharray="5 5" label={{ value: "Baseline", fill: BASELINE_COLOR, fontSize: 11 }} />
                <ReferenceLine y={currentPct} stroke={CURRENT_COLOR} strokeDasharray="5 5" label={{ value: "Current", fill: CURRENT_COLOR, fontSize: 11 }} />
                <Line type="monotone" dataKey="mastery" stroke={MASTERY_COLOR} strokeWidth={2.5} dot={{ fill: MASTERY_COLOR, r: 4 }} name="Mastery %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
