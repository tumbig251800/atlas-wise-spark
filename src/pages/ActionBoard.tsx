import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ListChecks, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/atlasSupabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActionItems, usePassActionItem, ACTION_ITEMS_KEY, daysRemaining, type ActionItem } from "@/hooks/useActionItems";
import { ActionStatsBar } from "@/components/action-board/ActionStatsBar";
import { ActionFilters, type ActionFilterChip } from "@/components/action-board/ActionFilters";
import { ActionTable } from "@/components/action-board/ActionTable";
import { TeacherActionView } from "@/components/action-board/TeacherActionView";
import { VerifyDismissDialog } from "@/components/action-board/VerifyDismissDialog";
import { useUserRole } from "@/hooks/useUserRole";

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

  const [dialogMode, setDialogMode] = useState<"verify" | "dismiss">("verify");
  const [dialogItem, setDialogItem] = useState<ActionItem | null>(null);

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
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunWatchCheck}
              disabled={running}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${running ? "animate-spin" : ""}`} />
              รัน Watch Check ตอนนี้
            </Button>
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
            <ActionTable
              items={paged}
              startIndex={safePage * PAGE_SIZE}
              onVerify={handleVerify}
              onDismiss={handleDismiss}
              onPass={handlePass}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-foreground">
                  หน้า {safePage + 1} / {totalPages} ({filtered.length} รายการ)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> ก่อนหน้า
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                  >
                    ถัดไป <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        <VerifyDismissDialog
          open={dialogItem !== null}
          mode={dialogMode}
          item={dialogItem}
          onClose={closeDialog}
        />
      </div>
    </AppLayout>
  );
}
