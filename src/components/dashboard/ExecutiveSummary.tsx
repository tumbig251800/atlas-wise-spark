import { useQuery } from "@tanstack/react-query";
import { getAiSummaryUrl, invokeEdgeJson } from "@/lib/edgeFunctionFetch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import type { TeachingLog } from "@/hooks/useDashboardData";
import type { DiagnosticColorCounts } from "@/hooks/useDiagnosticData";
import { buildExecutiveLogsSummary } from "@/domain/executiveLogsSummary";
import { ValidationDisclaimer } from "@/components/shared/ValidationDisclaimer";
import type { SummaryValidation } from "@/types/validation";

interface ExecutiveSummaryProps {
  logs: TeachingLog[];
  colorCounts?: DiagnosticColorCounts;
  activeStrikeCount?: number;
}

export function ExecutiveSummary({ logs, colorCounts, activeStrikeCount }: ExecutiveSummaryProps) {
  const summaryText = buildExecutiveLogsSummary(logs, colorCounts, activeStrikeCount);

  const { data, isLoading } = useQuery({
    queryKey: ["executive-summary", summaryText],
    queryFn: async () => {
      const result = await invokeEdgeJson<{ summary?: string; validation?: SummaryValidation }>(
        getAiSummaryUrl(),
        { logs_summary: summaryText }
      );
      if (!result.ok) throw new Error(result.errorMessage ?? `HTTP ${result.status}`);
      return {
        summary: result.data?.summary ?? "ไม่สามารถสร้างสรุปได้",
        validation: result.data?.validation ?? null,
      };
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
        <div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {data?.summary || "กำลังวิเคราะห์..."}
          </p>
          <ValidationDisclaimer validation={data?.validation ?? null} />
        </div>
      )}
    </div>
  );
}
