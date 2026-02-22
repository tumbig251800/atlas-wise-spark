import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import type { TeachingLog } from "@/hooks/useDashboardData";
import type { DiagnosticColorCounts } from "@/hooks/useDiagnosticData";

interface ExecutiveSummaryProps {
  logs: TeachingLog[];
  colorCounts?: DiagnosticColorCounts;
  activeStrikeCount?: number;
}

function getRemedialCount(log: TeachingLog): number {
  return (log.remedial_ids || "").split(",").filter((x) => x.trim() && x !== "[None]" && x !== "[N/A]").length;
}

function buildLogsSummary(logs: TeachingLog[], diagnosticCounts?: DiagnosticColorCounts, activeStrikeCount?: number): string {
  if (logs.length === 0) return "ยังไม่มีข้อมูลการสอน";

  const total = logs.length;
  const avgMastery = (logs.reduce((s, l) => s + l.mastery_score, 0) / total).toFixed(1);

  // Build per-session detail for last 5 sessions
  const last5 = logs.slice(-5);
  const sessionDetails = last5.map((l) => {
    const remedialCount = getRemedialCount(l);
    const remedialIds = (l.remedial_ids || "").split(",").map((x) => x.trim()).filter((x) => x && x !== "[None]" && x !== "[N/A]").join(", ");
    const totalStudents = l.total_students || 0;
    const pct = totalStudents > 0 ? ((remedialCount / totalStudents) * 100).toFixed(1) : "0";
    const pivotFlag = totalStudents > 0 && (remedialCount / totalStudents) * 100 > 40 ? " ⚠️ Gap>40% (อาจ trigger PIVOT)" : "";
    const successFlag = l.mastery_score === 5 && l.major_gap === "success" ? " ✅ Success Path" : "";
    const idsSuffix = remedialIds ? ` [${remedialIds}]` : "";
    return `- ${l.teaching_date} ${l.subject} ${l.grade_level}/${l.classroom}: Mastery ${l.mastery_score}/5, Gap: ${l.major_gap}, Remedial: ${remedialCount}/${totalStudents} (${pct}%)${idsSuffix}${pivotFlag}${successFlag}, Key Issue: ${l.key_issue || "ไม่ระบุ"}, Strategy: ${l.next_strategy || "ไม่ระบุ"}`;
  }).join("\n");

  const gapCounts: Record<string, number> = {};
  logs.forEach((l) => {
    gapCounts[l.major_gap] = (gapCounts[l.major_gap] || 0) + 1;
  });
  const gapStr = Object.entries(gapCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([g, c]) => `${g} (${c} คาบ)`)
    .join(", ");

  const sorted = [...logs].sort(
    (a, b) => new Date(a.teaching_date).getTime() - new Date(b.teaching_date).getTime()
  );
  const half = Math.ceil(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  const avgFirst = firstHalf.reduce((s, l) => s + l.mastery_score, 0) / firstHalf.length;
  const avgSecond = secondHalf.length > 0
    ? secondHalf.reduce((s, l) => s + l.mastery_score, 0) / secondHalf.length
    : avgFirst;
  const velocity = avgFirst > 0 ? (((avgSecond - avgFirst) / avgFirst) * 100).toFixed(1) : "0";

  let result = `จำนวนคาบทั้งหมด: ${total}
Mastery เฉลี่ย: ${avgMastery}/5
Gap หลัก: ${gapStr}
Growth Velocity: ${velocity}%

รายละเอียด 5 คาบล่าสุด:
${sessionDetails}`;

  if (diagnosticCounts) {
    result += `\nDiagnostic: RED=${diagnosticCounts.red} ORANGE=${diagnosticCounts.orange} YELLOW=${diagnosticCounts.yellow} BLUE=${diagnosticCounts.blue} GREEN=${diagnosticCounts.green}`;
  }
  if (activeStrikeCount && activeStrikeCount > 0) {
    result += `\nActive Strikes (≥2): ${activeStrikeCount} รายการ`;
  }

  return result;
}

export function ExecutiveSummary({ logs, colorCounts, activeStrikeCount }: ExecutiveSummaryProps) {
  const summaryText = buildLogsSummary(logs, colorCounts, activeStrikeCount);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["executive-summary", summaryText],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-summary", {
        body: { logs_summary: summaryText },
      });
      if (error) throw error;
      return data.summary as string;
    },
    enabled: logs.length > 0,
    staleTime: 5 * 60 * 1000, // cache 5 mins
  });

  if (logs.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="font-semibold">Executive Summary</h2>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {summary || "กำลังวิเคราะห์..."}
        </p>
      )}
    </div>
  );
}

export { buildLogsSummary };
