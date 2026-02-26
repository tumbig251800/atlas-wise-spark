import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TeachingLog } from "@/hooks/useDashboardData";
import ReactMarkdown from "react-markdown";

interface Props {
  logs: TeachingLog[];
}

export function PolicySummary({ logs }: Props) {
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!logs.length) return;
    setLoading(true);
    setSummary("");

    const gapCounts: Record<string, number> = {};
    logs.forEach((l) => { gapCounts[l.major_gap] = (gapCounts[l.major_gap] || 0) + 1; });

    const totalLogs = logs.length;
    const avgMasteryRaw = logs.reduce((s, l) => s + l.mastery_score, 0) / totalLogs;
    const avgMastery = Math.round((avgMasteryRaw / 5) * 100);

    const gradeSummary: Record<string, { total: number; count: number }> = {};
    logs.forEach((l) => {
      if (!gradeSummary[l.grade_level]) gradeSummary[l.grade_level] = { total: 0, count: 0 };
      gradeSummary[l.grade_level].total += l.mastery_score;
      gradeSummary[l.grade_level].count += 1;
    });

    const logsSummary = `
จำนวน Log ทั้งหมด: ${totalLogs}
Mastery เฉลี่ย: ${avgMastery}% (${(avgMasteryRaw).toFixed(1)}/5)
การกระจายตัว Gap: ${Object.entries(gapCounts).map(([k, v]) => `${k}: ${v}`).join(", ")}
Mastery ตามชั้น: ${Object.entries(gradeSummary).map(([g, v]) => `${g}: ${Math.round((v.total / v.count / 5) * 100)}% (${(v.total / v.count).toFixed(1)}/5)`).join(", ")}
    `.trim();

    try {
      const { data, error } = await supabase.functions.invoke("ai-summary", {
        body: { logs_summary: logsSummary, mode: "executive" },
      });
      if (error) throw error;
      setSummary(data.summary || "ไม่สามารถสร้างสรุปได้");
    } catch (e) {
      console.error(e);
      setSummary("เกิดข้อผิดพลาดในการสร้างสรุป");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--atlas-gold))]" />
          AI Policy Advice — พีท ร่างทอง
        </h3>
        <Button size="sm" onClick={generate} disabled={loading || !logs.length}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
          วิเคราะห์
        </Button>
      </div>
      {summary ? (
        <div className="prose prose-invert prose-sm max-w-none text-foreground">
          <ReactMarkdown>{summary}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">กดปุ่ม "วิเคราะห์" เพื่อให้ AI สรุปสถานการณ์ระดับโรงเรียน</p>
      )}
    </div>
  );
}
