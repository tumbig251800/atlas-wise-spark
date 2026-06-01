import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ListChecks, RefreshCw, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActionItems, usePassActionItem, ACTION_ITEMS_KEY, daysRemaining, type ActionItem } from "@/hooks/useActionItems";
import { ActionStatsBar } from "@/components/action-board/ActionStatsBar";
import { ActionFilters, type ActionFilterChip } from "@/components/action-board/ActionFilters";
import { ActionTable } from "@/components/action-board/ActionTable";
import { TeacherActionView } from "@/components/action-board/TeacherActionView";
import { VerifyDismissDialog } from "@/components/action-board/VerifyDismissDialog";
import { PlcModal } from "@/components/action-board/PlcModal";
import { PlcPlannerModal } from "@/components/action-board/PlcPlannerModal";
import { useUserRole } from "@/hooks/useUserRole";
import { usePlcPlanner } from "@/hooks/usePlcPlanner";
import type { PlcPlan } from "@/types/plc";
import type { PlcSession } from "@/types/plc";

const PAGE_SIZE = 20;

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2 };

function matchesFilter(item: ActionItem, filter: ActionFilterChip): boolean {
  switch (filter) {
    case "all":
      return true;
    case "overdue": {
      if (item.status !== "open" && item.status !== "resolved") return false;
      const d = daysRemaining(item.due_date);
      return d !== null && d <= 0;
    }
    case "open":
      return item.status === "open" || item.status === "resolved";
    case "verified":
      return item.status === "verified";
    case "dismissed":
      return item.status === "dismissed";
  }
}

function matchesSearch(item: ActionItem, q: string): boolean {
  if (!q) return true;
  const hay = `${item.teacher_name ?? ""} ${item.classroom ?? ""} ${item.subject ?? ""} ${item.grade_level ?? ""}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function sortItems(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    const da = daysRemaining(a.due_date);
    const db = daysRemaining(b.due_date);
    const aOverdue = da !== null && da <= 0 && (a.status === "open" || a.status === "resolved");
    const bOverdue = db !== null && db <= 0 && (b.status === "open" || b.status === "resolved");
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    const aDate = a.due_date ?? "9999-12-31";
    const bDate = b.due_date ?? "9999-12-31";
    if (aDate !== bDate) return aDate < bDate ? -1 : 1;

    return (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9);
  });
}

export default function ActionBoard() {
  const { data: items, isLoading, error } = useActionItems();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ActionFilterChip>("all");
  const [page, setPage] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);

  const [dialogMode, setDialogMode] = useState<"verify" | "dismiss">("verify");
  const [dialogItem, setDialogItem] = useState<ActionItem | null>(null);

  // PLC Planner state
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [plcModalOpen, setPlcModalOpen] = useState(false);
  const [prefilledPlcData, setPrefilledPlcData] = useState<Partial<PlcSession> | null>(null);
  const [plcPlans, setPlcPlans] = useState<PlcPlan[]>([]);
  const plcPlanner = usePlcPlanner();

  const all = items ?? [];

  const counts: Record<ActionFilterChip, number> = useMemo(() => ({
    all: all.length,
    overdue: all.filter((i) => matchesFilter(i, "overdue")).length,
    open: all.filter((i) => matchesFilter(i, "open")).length,
    verified: all.filter((i) => matchesFilter(i, "verified")).length,
    dismissed: all.filter((i) => matchesFilter(i, "dismissed")).length,
  }), [all]);

  const filtered = useMemo(() => {
    return sortItems(all.filter((i) => matchesFilter(i, filter) && matchesSearch(i, search)));
  }, [all, filter, search]);

  // Split into queue (open/watching) and history (verified/dismissed/resolved)
  const queueItems = useMemo(() => {
    return filtered.filter((i) => i.status === "open" || i.status === "watching");
  }, [filtered]);

  const historyItems = useMemo(() => {
    return filtered.filter((i) => i.status === "verified" || i.status === "dismissed" || i.status === "resolved");
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const passItem = usePassActionItem();
  const { role } = useAuth();
  const { isTeacher, teacherId, loading: roleLoading } = useUserRole();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);

  const handleRunWatchCheck = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("atlas-mastery-watch", {
        body: { mode: "batch" },
      });
      if (error) throw error;
      const r = data?.reevaluation ?? { escalated: 0, resolved: 0, held: 0, skipped: 0 };
      toast({
        title: "รัน Watch Check เสร็จแล้ว",
        description: `เลื่อนเป็น Action: ${r.escalated} · ปิดอัตโนมัติ: ${r.resolved} · เฝ้าติดตามต่อ: ${r.held} · ข้าม: ${r.skipped}`,
      });
      qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });
    } catch (e) {
      const message = e instanceof Error ? e.message : "ไม่ทราบสาเหตุ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const handleVerify = (item: ActionItem) => {
    setDialogItem(item);
    setDialogMode("verify");
  };
  const handleDismiss = (item: ActionItem) => {
    setDialogItem(item);
    setDialogMode("dismiss");
  };
  const handlePass = (item: ActionItem) => {
    passItem.mutate(item.id);
  };
  const closeDialog = () => setDialogItem(null);

  const handlePlanPLC = () => {
    setPlannerOpen(true);
    plcPlanner.mutate(undefined, {
      onSuccess: (plans) => {
        setPlcPlans(plans);
      },
    });
  };

  const handlePlanSelected = (plan: PlcPlan) => {
    // Build prefilled data from plan
    const prefilled: Partial<PlcSession> = {
      topic: plan.topic,
      problem_statement: plan.problem_statement,
      root_cause: plan.root_cause,
      approach: plan.approach,
      plc_type: plan.plc_type as PlcSession["plc_type"],
      grade_band: plan.grade_band as PlcSession["grade_band"] | undefined,
      subject: plan.subject,
      members: plan.members,
      linked_action_item_ids: plan.covered_item_ids,
    };

    setPrefilledPlcData(prefilled);
    setPlannerOpen(false);
    setPlcModalOpen(true);
  };

  const handlePlcModalClose = () => {
    setPlcModalOpen(false);
    setPrefilledPlcData(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">
              {isTeacher ? "รายการติดตามของคุณ" : "Action Board"}
            </h1>
          </div>
          {role === "director" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-violet-400 text-violet-700 hover:bg-violet-50"
                onClick={handlePlanPLC}
                disabled={plcPlanner.isPending}
              >
                <Sparkles className={`h-4 w-4 mr-1 ${plcPlanner.isPending ? "animate-pulse" : ""}`} />
                วางแผน PLC ด้วย AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRunWatchCheck}
                disabled={running}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${running ? "animate-spin" : ""}`} />
                รัน Watch Check ตอนนี้
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md p-3 text-sm">
            ไม่สามารถโหลดข้อมูลได้: {error.message}
          </div>
        )}

        {roleLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isTeacher && teacherId ? (
          <TeacherActionView teacherId={teacherId} />
        ) : isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <>
            <ActionStatsBar items={all} />
            <ActionFilters
              search={search}
              onSearchChange={(v) => { setSearch(v); setPage(0); }}
              filter={filter}
              onFilterChange={(f) => { setFilter(f); setPage(0); }}
              counts={counts}
            />

            {/* Section 1: คิวนิเทศ (open + watching) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">คิวนิเทศ</h2>
                <span className="text-sm text-muted-foreground">({queueItems.length} รายการ)</span>
              </div>
              <ActionTable
                items={queueItems}
                startIndex={0}
                onVerify={handleVerify}
                onDismiss={handleDismiss}
                onPass={handlePass}
              />
            </div>

            {/* Section 2: ประวัติ (verified + dismissed + resolved) - Collapsible */}
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">ประวัติ</h2>
                  <span className="text-sm text-muted-foreground">({historyItems.length} รายการ)</span>
                </div>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm">
                    {historyOpen ? (
                      <>
                        <ChevronUp className="h-4 w-4 mr-1" />
                        ซ่อน
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4 mr-1" />
                        แสดง
                      </>
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <ActionTable
                  items={historyItems}
                  startIndex={0}
                  onVerify={handleVerify}
                  onDismiss={handleDismiss}
                  onPass={handlePass}
                />
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        <VerifyDismissDialog
          open={dialogItem !== null}
          mode={dialogMode}
          item={dialogItem}
          onClose={closeDialog}
        />

        <PlcPlannerModal
          open={plannerOpen}
          onClose={() => setPlannerOpen(false)}
          onPlanSelected={handlePlanSelected}
          plans={plcPlans}
          isLoading={plcPlanner.isPending}
        />

        {plcModalOpen && (
          <PlcModal
            open={plcModalOpen}
            onClose={handlePlcModalClose}
            onSaved={() => {
              setPlcModalOpen(false);
              setPrefilledPlcData(null);
            }}
            actionItem={{} as ActionItem}
            prefilledData={prefilledPlcData ?? undefined}
          />
        )}
      </div>
    </AppLayout>
  );
}
