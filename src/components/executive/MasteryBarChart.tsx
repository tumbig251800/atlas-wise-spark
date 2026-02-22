import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { TeachingLog } from "@/hooks/useDashboardData";

interface Props {
  logs: TeachingLog[];
  groupBy: "grade" | "subject";
}

export function MasteryBarChart({ logs, groupBy }: Props) {
  const grouped: Record<string, { total: number; count: number }> = {};
  logs.forEach((l) => {
    const key = groupBy === "grade" ? l.grade_level : l.subject;
    if (!grouped[key]) grouped[key] = { total: 0, count: 0 };
    grouped[key].total += l.mastery_score;
    grouped[key].count += 1;
  });

  const data = Object.entries(grouped)
    .map(([name, v]) => ({ name, avg: Math.round(v.total / v.count) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!data.length) {
    return (
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold mb-4">Mastery เฉลี่ยตาม{groupBy === "grade" ? "ชั้นเรียน" : "วิชา"}</h3>
        <p className="text-muted-foreground text-sm">ยังไม่มีข้อมูล</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-sm font-semibold mb-4">Mastery เฉลี่ยตาม{groupBy === "grade" ? "ชั้นเรียน" : "วิชา"}</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217 33% 20%)" />
          <XAxis dataKey="name" tick={{ fill: "hsl(215 20% 65%)", fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fill: "hsl(215 20% 65%)", fontSize: 12 }} />
          <Tooltip contentStyle={{ background: "hsl(222 47% 13%)", border: "1px solid hsl(217 33% 25%)", borderRadius: 8, color: "hsl(210 40% 98%)" }} />
          <Bar dataKey="avg" name="Mastery เฉลี่ย %" fill="hsl(234 89% 74%)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
