import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Loader2, Lock, ShieldCheck, TrendingUp, TrendingDown, Minus, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useCaseStudents } from "@/hooks/useCaseStudents";
import { useInterventionPlanForItem } from "@/hooks/useInterventionPlan";
import { useMonitoringEvidence, type MonitoringEvidencePair } from "@/hooks/useMonitoringEvidence";
import {
  useMonitoringResultsForPlan,
  useSaveMonitoringResult,
  useVerifyMonitoringResult,
  type MonitoringResult,
} from "@/hooks/useMonitoring";
import { useImpactLoop } from "@/hooks/useImpactLoop";
import { deriveResultStatus, type EvidenceResult, type MonitoringResultStatus } from "@/domain/monitoringEvidence";
import type { ActionItem } from "@/hooks/useActionItems";

const STATUS_LABEL: Record<MonitoringResultStatus, string> = {
  improved: "ดีขึ้น",
  no_change: "ไม่เปลี่ยนแปลง",
  declined: "แย่ลง",
  inconclusive: "ยังสรุปไม่ได้",
};

const STATUS_ICON: Record<MonitoringResultStatus, JSX.Element> = {
  improved: <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />,
  no_change: <Minus className="h-3.5 w-3.5 text-muted-foreground" />,
  declined: <TrendingDown className="h-3.5 w-3.5 text-red-600" />,
  inconclusive: <HelpCircle className="h-3.5 w-3.5 text-amber-600" />,
};

function evidenceLabel(e: EvidenceResult): string {
  if (e.kind === "unavailable") return "ยังไม่มีข้อมูล";
  return `${Math.round(e.snapshot.pct * 100)}% (${e.snapshot.assessed_date})`;
}

interface RowProps {
  studentId: string;
  studentName: string;
  planId: string;
  evidence: MonitoringEvidencePair;
  existing: MonitoringResult | undefined;
  isAdminOrLead: boolean;
}

function MonitoringStudentRow({ studentId, studentName, planId, evidence, existing, isAdminOrLead }: RowProps) {
  const { user } = useAuth();
  const saveResult = useSaveMonitoringResult(planId);
  const verifyResult = useVerifyMonitoringResult(planId);

  const suggested = useMemo(() => deriveResultStatus(evidence.before, evidence.after), [evidence]);
  const [status, setStatus] = useState<MonitoringResultStatus>(
    (existing?.result_status as MonitoringResultStatus) ?? suggested
  );
  const [notes, setNotes] = useState(existing?.notes ?? "");

  const verified = !!existing?.verified_by;

  if (verified) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">{studentName}</span>
          <Badge variant="secondary" className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-300">
            <Lock className="h-3 w-3" /> ยืนยันแล้ว
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {STATUS_ICON[existing!.result_status as MonitoringResultStatus]}
          {STATUS_LABEL[existing!.result_status as MonitoringResultStatus]}
          <span>· ก่อน {evidenceLabel(evidence.before)} → หลัง {evidenceLabel(evidence.after)}</span>
        </div>
        {existing!.notes && <p className="text-xs text-muted-foreground">{existing!.notes}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-md border p-3 text-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{studentName}</span>
        <span className="text-xs text-muted-foreground">
          ก่อน {evidenceLabel(evidence.before)} → หลัง {evidenceLabel(evidence.after)}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={status} onValueChange={(v) => setStatus(v as MonitoringResultStatus)}>
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as MonitoringResultStatus[]).map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {existing && (
          <Button
            size="sm"
            variant="outline"
            disabled={!isAdminOrLead || verifyResult.isPending || !user}
            onClick={() => user && verifyResult.mutate({ id: existing.id, userId: user.id })}
            title={isAdminOrLead ? "ยืนยันผลติดตามนี้" : "เฉพาะผู้บริหาร/หัวหน้าฝ่ายยืนยันได้"}
          >
            {verifyResult.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-1" />
            )}
            ยืนยันผล
          </Button>
        )}
      </div>

      <Textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="บันทึกเพิ่มเติม (ถ้ามี)"
        className="text-xs min-h-16"
      />

      <Button
        size="sm"
        disabled={saveResult.isPending || !user}
        onClick={() =>
          user &&
          saveResult.mutate({
            studentId,
            userId: user.id,
            before: evidence.before,
            after: evidence.after,
            resultStatus: status,
            notes: notes.trim() || null,
          })
        }
      >
        {saveResult.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
        บันทึกผล
      </Button>
    </div>
  );
}

/** Renders when impact_loop_status === "monitoring" — records real before/after
 * unit-score evidence per case student, admin/lead verifies, then the case can close. */
export function MonitoringResultsPanel({ item }: { item: ActionItem }) {
  const { isAdmin, isLead } = useUserRole();
  const { closeCase } = useImpactLoop();
  const { data: plan, isLoading: planLoading } = useInterventionPlanForItem(item.id);
  const { data: caseStudents, isLoading: studentsLoading } = useCaseStudents(item);
  const linked = useMemo(() => (caseStudents ?? []).filter((r) => r.linked), [caseStudents]);
  const { data: evidenceMap, isLoading: evidenceLoading } = useMonitoringEvidence(
    item,
    linked.map((s) => ({ id: s.id, code: s.code })),
    plan?.start_date ?? null
  );
  const { data: results } = useMonitoringResultsForPlan(plan?.id ?? null);

  const resultByStudent = useMemo(
    () => new Map((results ?? []).map((r) => [r.student_id, r])),
    [results]
  );
  const hasVerified = (results ?? []).some((r) => !!r.verified_by);
  const isAdminOrLead = isAdmin || isLead;

  if (planLoading || studentsLoading) return <Skeleton className="h-24 w-full" />;

  if (linked.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        ยังไม่มีนักเรียนในเคสนี้ — เพิ่มนักเรียนที่ด้านบนก่อนบันทึกผลติดตาม
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {evidenceLoading && <Skeleton className="h-16 w-full" />}
      {evidenceMap &&
        linked.map((s) => {
          const evidence = evidenceMap.get(s.id);
          if (!evidence) return null;
          return (
            <MonitoringStudentRow
              key={s.id}
              studentId={s.id}
              studentName={s.name || s.code}
              planId={plan!.id}
              evidence={evidence}
              existing={resultByStudent.get(s.id)}
              isAdminOrLead={isAdminOrLead}
            />
          );
        })}

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          variant={hasVerified ? "default" : "outline"}
          disabled={!hasVerified || closeCase.isPending}
          onClick={() => closeCase.mutate(item.id)}
          title={hasVerified ? "ปิดเคส" : "ต้องมีผลติดตามที่ผู้บริหาร/หัวหน้ายืนยันอย่างน้อย 1 รายการก่อน"}
        >
          {closeCase.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-1" />
          )}
          ปิดเคส
        </Button>
        {!hasVerified && (
          <span className="text-xs text-muted-foreground">
            ต้องมีผลติดตามที่ผู้บริหาร/หัวหน้ายืนยันแล้วอย่างน้อย 1 รายการ
          </span>
        )}
      </div>
    </div>
  );
}
