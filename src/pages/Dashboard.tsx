import { useState, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardFilters } from "@/components/dashboard/DashboardFilters";
import { DataPackChart } from "@/components/dashboard/DataPackChart";
import { QWRTrendChart } from "@/components/dashboard/QWRTrendChart";
import { AIAdvicePanel } from "@/components/dashboard/AIAdvicePanel";
import { ExecutiveSummary } from "@/components/dashboard/ExecutiveSummary";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { DiagnosticStatusPanel } from "@/components/dashboard/DiagnosticStatusPanel";
import { useDiagnosticData } from "@/hooks/useDiagnosticData";
import {
  useDashboardData,
  loadPersistedFilters,
  persistFilters,
  type DashboardFilters as FiltersType,
} from "@/hooks/useDashboardData";

export default function Dashboard() {
  const [filters, setFiltersState] = useState<FiltersType>(loadPersistedFilters);

  const setFilters = useCallback((f: FiltersType) => {
    setFiltersState(f);
    persistFilters(f);
  }, []);

  const { filteredLogs, filterOptions, isLoading } = useDashboardData(filters);
  const { diagnosticEvents, colorCounts, activeStrikes, isLoading: diagLoading } = useDiagnosticData();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">แดชบอร์ดอัจฉริยะ</h1>
          <ExportButton logs={filteredLogs} />
        </div>

        <ExecutiveSummary
          logs={filteredLogs}
          colorCounts={colorCounts}
          activeStrikeCount={activeStrikes.length}
        />

        <DashboardFilters filters={filters} setFilters={setFilters} options={filterOptions} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[350px] w-full" />
          </div>
        ) : (
          <Tabs defaultValue="datapack" className="w-full">
            <TabsList className="glass-card w-full justify-start">
              <TabsTrigger value="datapack">📊 Data Pack</TabsTrigger>
              <TabsTrigger value="qwr">📈 QWR Trend</TabsTrigger>
              <TabsTrigger value="diagnostic">🔬 Diagnostic</TabsTrigger>
              <TabsTrigger value="advice">🤖 AI Advice</TabsTrigger>
            </TabsList>
            <TabsContent value="datapack">
              <DataPackChart logs={filteredLogs} diagnosticEvents={diagnosticEvents} />
            </TabsContent>
            <TabsContent value="qwr">
              <QWRTrendChart logs={filteredLogs} />
            </TabsContent>
            <TabsContent value="diagnostic">
              {diagLoading ? (
                <Skeleton className="h-[200px] w-full" />
              ) : (
                <DiagnosticStatusPanel colorCounts={colorCounts} activeStrikes={activeStrikes} />
              )}
            </TabsContent>
            <TabsContent value="advice">
              <AIAdvicePanel logs={filteredLogs} diagnosticEvents={diagnosticEvents} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
