import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { X, Users, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCaseStudents, type CaseStudentRow } from "@/hooks/useCaseStudents";
import type { ActionItem } from "@/hooks/useActionItems";

function scoreLabel(pct: number | null): string {
  if (pct == null) return "—";
  return `${Math.round(pct * 100)}%`;
}

/**
 * U2 — pick students into an Impact Loop case. The system pre-selects Red Zone
 * students (unit score < 50% — the agreed primary criterion); the teacher then
 * adds/removes. Roster-scoped by the DB RLS on action_item_students.
 */
export function CaseStudentPicker({ item }: { item: ActionItem }) {
  const { user } = useAuth();
  const { data: rows, isLoading, addStudents, removeStudent } = useCaseStudents(item);

  const linked = useMemo(() => (rows ?? []).filter((r) => r.linked), [rows]);
  const candidates = useMemo(() => (rows ?? []).filter((r) => !r.linked), [rows]);
  const redZoneCandidateIds = useMemo(
    () => candidates.filter((r) => r.isRedZone).map((r) => r.id),
    [candidates]
  );

  // pre-select Red Zone candidates (system suggestion)
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const effectiveSelected = selected ?? new Set(redZoneCandidateIds);

  const toggle = (id: string) => {
    const next = new Set(effectiveSelected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const save = async () => {
    if (!user) return;
    const ids = [...effectiveSelected];
    const byId = new Map(candidates.map((c) => [c.id, c]));
    const systemIds = ids.filter((id) => byId.get(id)?.isRedZone);
    const manualIds = ids.filter((id) => !byId.get(id)?.isRedZone);
    if (systemIds.length)
      await addStudents.mutateAsync({ studentIds: systemIds, userId: user.id, source: "system_detected" });
    if (manualIds.length)
      await addStudents.mutateAsync({ studentIds: manualIds, userId: user.id, source: "individual" });
    setSelected(null);
  };

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  if ((rows ?? []).length === 0)
    return (
      <p className="text-xs text-muted-foreground">
        ยังไม่มีบัญชีรายชื่อนักเรียนของห้องนี้ในระบบ (เพิ่มรายชื่อที่เมนู "บันทึกคะแนนหน่วย" ก่อน)
      </p>
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" /> นักเรียนในเคสนี้
        <span className="text-muted-foreground font-normal">({linked.length} คน)</span>
      </div>

      {/* Already linked */}
      {linked.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {linked.map((r) => (
            <Badge key={r.id} variant="secondary" className="gap-1 pr-1">
              {r.name || r.code} · {scoreLabel(r.scorePct)}
              {r.selectionSource === "system_detected" && <Sparkles className="h-3 w-3 text-amber-500" />}
              <button
                className="ml-0.5 rounded hover:bg-muted-foreground/20"
                title="เอาออกจากเคส"
                onClick={() => removeStudent.mutate(r.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Candidate roster with Red Zone pre-selection */}
      {candidates.length > 0 && (
        <div className="rounded-md border divide-y">
          <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/40 flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            ระบบแนะนำเด็ก Red Zone (คะแนน &lt; 50%) ไว้ให้แล้ว — ปรับเพิ่ม/เอาออกได้
          </div>
          {candidates.map((r) => (
            <label
              key={r.id}
              className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/30"
            >
              <Checkbox checked={effectiveSelected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
              <span className="flex-1">{r.name || r.code}</span>
              <span className={r.isRedZone ? "text-red-600 font-medium" : "text-muted-foreground"}>
                {scoreLabel(r.scorePct)}
              </span>
              {r.isRedZone && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  🔴 Red Zone
                </Badge>
              )}
            </label>
          ))}
        </div>
      )}

      {candidates.length > 0 && (
        <Button size="sm" disabled={addStudents.isPending || effectiveSelected.size === 0} onClick={save}>
          {addStudents.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          เพิ่มนักเรียนที่เลือก ({effectiveSelected.size})
        </Button>
      )}
    </div>
  );
}
