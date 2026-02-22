import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { TeachingLog } from "@/hooks/useDashboardData";

interface Props {
  logs: TeachingLog[];
}

const GAP_CONFIG: Record<string, { label: string; color: string }> = {
  "k-gap": { label: "K-Gap", color: "hsl(0 84% 60%)" },
  "p-gap": { label: "P-Gap", color: "hsl(38 92% 50%)" },
  "a-gap": { label: "A-Gap", color: "hsl(280 60% 60%)" },
  "system-gap": { label: "System", color: "hsl(215 20% 50%)" },
  success: { label: "Success", color: "hsl(142 76% 36%)" },
};

export function GapPieChart({ logs }: Props) {
  const counts: Record<string, number> = {};
  logs.forEach((l) => {
    counts[l.major_gap] = (counts[l.major_gap] || 0) + 1;
  });

  const data = Object.entries(counts).map(([key, value]) => ({
    name: GAP_CONFIG[key]?.label ?? key,
    value,
    color: GAP_CONFIG[key]?.color ?? "hsl(215 20% 50%)",
  }));

  if (!data.length) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Gap Distribution</h3>
        <p className="text-muted-foreground text-sm">ยังไม่มีข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold mb-4">Gap Distribution</h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
