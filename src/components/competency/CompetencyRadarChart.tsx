/**
 * Phase D Stage 3 + 2026: Competency radar chart (8 capabilities)
 */
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { RUBRIC_LABELS } from "@/lib/competencyConstants";
import {
  CAPABILITY_LABELS_2026,
  CAPABILITY_KEYS_2026,
  type CapabilityKey2026,
} from "@/lib/capabilityConstants2026";
import type { StudentCompetencyData } from "@/lib/competencyReportQueries";

function toRadarData(avgCompetency: StudentCompetencyData["avgCompetency"]) {
  return CAPABILITY_KEYS_2026.map((k) => ({
    subject: CAPABILITY_LABELS_2026[k],
    key: k,
    value: avgCompetency[k] || 0,
    fullMark: 4,
  }));
}

export interface CompetencyRadarChartProps {
  data: StudentCompetencyData | null;
  className?: string;
}

export function CompetencyRadarChart({ data, className = "" }: CompetencyRadarChartProps) {
  const radarData = data ? toRadarData(data.avgCompetency) : [];

  if (radarData.length === 0) {
    return (
      <div
        className={`flex min-h-[280px] items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 ${className}`}
      >
        <p className="text-sm text-muted-foreground">ไม่พบข้อมูลสมรรถนะ</p>
      </div>
    );
  }

  return (
    <div className={`min-h-[280px] ${className}`}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 10 }}
            tickLine={false}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[1, 4]}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            tickCount={4}
          />
          <Radar
            name="สมรรถนะ"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.4}
            strokeWidth={2}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0]?.payload;
              if (!p) return null;
              const level = p.value as number;
              const label =
                RUBRIC_LABELS[Math.round(level) as 1 | 2 | 3 | 4] ?? level;
              return (
                <div className="rounded-md border bg-background px-3 py-2 shadow-md">
                  <p className="font-medium">{p.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    ระดับ: {label} ({level.toFixed(1)})
                  </p>
                </div>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
