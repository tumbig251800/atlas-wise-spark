import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/atlasSupabase";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RUBRIC_DIMENSIONS, type RubricKey } from "@/types/nidet";
import type { ActionItem } from "@/hooks/useActionItems";
import { PLC_OUTCOME_LABELS, type PlcSession } from "@/types/plc";

interface Props {
  teacherId: string;
}

// Rubric dimensions the supervisor is most likely to focus on, by issue type.
const MASTERY_HIGHLIGHT: RubricKey[] = [
  "rubric_activity_design",
  "rubric_individual_care",
  "rubric_formative_assess",
];
const REDZONE_HIGHLIGHT: RubricKey[] = [
  "rubric_individual_care",
  "rubric_collaborative",
  "rubric_feedback",
];
const UNITBLINDSPOT_HIGHLIGHT: RubricKey[] = [
  "rubric_formative_assess",
  "rubric_individual_care",
  "rubric_feedback",
];

// Teacher-facing, preparation-oriented framing for each highlighted dimension.
const DIMENSION_TIPS: Partial<Record<RubricKey, string>> = {
  rubric_activity_design:
    "ผู้นิเทศจะดูว่ากิจกรรมรองรับนักเรียนทุกระดับได้อย่างไร",
  rubric_individual_care:
    "ผู้นิเทศจะดูการดูแลนักเรียนที่ต้องการความช่วยเหลือพิเศษ",
  rubric_formative_assess:
    "ผู้นิเทศจะดูว่าครูตรวจสอบความเข้าใจระหว่างสอนอย่างไร",
  rubric_collaborative:
    "ผู้นิเทศจะดูการจัดกิจกรรมกลุ่มและการทำงานร่วมกัน",
  rubric_feedback:
    "ผู้นิเทศจะดูคุณภาพของ feedback ที่ให้กับนักเรียน",
};

function formatThaiDate(d: string | null): string {
  if (!d) return "—";
  // resolved_at is a timestamptz; due_date is a bare date.
  const date = d.length <= 10 ? new Date(d + "T00:00:00") : new Date(d);
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const TEACHER_STATUSES: string[] = ["open", "watching", "resolved"];

const TEACHER_ITEMS_KEY = (teacherId: string) =>
  ["teacher-action-items", teacherId] as const;

function useTeacherActionItems(teacherId: string) {
  return useQuery({
    queryKey: TEACHER_ITEMS_KEY(teacherId),
    enabled: !!teacherId,
    queryFn: async (): Promise<ActionItem[]> => {
      const { data, error } = await supabase
        .from("action_plan_items")
        .select("*")
        .eq("teacher_id", teacherId)
        .in("status", TEACHER_STATUSES)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

const TEACHER_PLC_KEY = (teacherId: string) =>
  ["teacher-plc-sessions", teacherId] as const;

// PLC sessions this teacher is a member of. plc_sessions is readable by any
// authenticated user, but we only ever surface sessions the teacher belongs to
// (members @> [{ teacher_id }]) — never a colleague's group.
function useTeacherPlcSessions(teacherId: string) {
  return useQuery({
    queryKey: TEACHER_PLC_KEY(teacherId),
    enabled: !!teacherId,
    queryFn: async (): Promise<PlcSession[]> => {
      const { data, error } = await supabase
        .from("plc_sessions")
        .select("*")
        .contains("members", [{ teacher_id: teacherId }])
        .order("session_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlcSession[];
    },
  });
}

function outcomeBadgeClass(outcome: PlcSession["outcome_type"]): string {
  switch (outcome) {
    case "resolved":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "need_supervision":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "continue_plc":
    default:
      return "bg-violet-100 text-violet-800 border-violet-300";
  }
}

function PlcSessionTeacherCard({
  session,
  teacherId,
}: {
  session: PlcSession;
  teacherId: string;
}) {
  const others = (session.members ?? []).filter((m) => m.teacher_id !== teacherId);
  const scope = session.subject || session.grade_band || "PLC";
  return (
    <div className="rounded-lg border border-violet-300 bg-violet-50 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-violet-900">{session.topic}</div>
        <span
          className={cn(
            "text-[11px] border rounded px-1.5 py-0.5 whitespace-nowrap shrink-0",
            outcomeBadgeClass(session.outcome_type)
          )}
        >
          {PLC_OUTCOME_LABELS[session.outcome_type]}
        </span>
      </div>

      <div className="text-sm text-violet-900 space-y-0.5">
        <div>
          <span className="text-violet-700">วันที่:</span> {formatThaiDate(session.session_date)}
          <span className="text-violet-400"> · </span>
          <span className="text-violet-700">ขอบเขต:</span> {scope}
        </div>
        <div>
          <span className="text-violet-700">ครูแกนนำ (ผู้นำ):</span> {session.facilitator_name || "—"}
        </div>
        {others.length > 0 && (
          <div>
            <span className="text-violet-700">เพื่อนร่วมกลุ่ม:</span>{" "}
            {others.map((m) => m.teacher_name).join(", ")}
          </div>
        )}
        {session.outcome_type === "continue_plc" && session.next_plc_date && (
          <div className="text-violet-800 font-medium">
            📅 นัด PLC ครั้งถัดไป: {formatThaiDate(session.next_plc_date)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Per-status cards ────────────────────────────────────────────────────────

function WatchingCard({ item }: { item: ActionItem }) {
  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-1">
      <div className="font-medium text-amber-900">
        📊 ระบบกำลังติดตามพัฒนาการของนักเรียนในห้องของคุณ
      </div>
      {item.metric_label && (
        <div className="text-sm text-amber-900">
          รายละเอียด: {item.metric_label}
        </div>
      )}
    </div>
  );
}

function SupervisionPrepCard({ item }: { item: ActionItem }) {
  const highlight = new Set<RubricKey>(
    item.issue_type === "RedZone"
      ? REDZONE_HIGHLIGHT
      : item.issue_type === "UnitBlindSpot"
      ? UNITBLINDSPOT_HIGHLIGHT
      : MASTERY_HIGHLIGHT
  );

  return (
    <div className="rounded-lg border border-sky-300 bg-sky-50 p-4 space-y-3">
      <div className="font-medium text-sky-900 text-base">🎯 เตรียมรับการนิเทศ</div>

      <div className="space-y-1 text-sm text-sky-900">
        {item.ai_summary && (
          <div>
            <span className="text-sky-700">ประเด็น:</span> {item.ai_summary}
          </div>
        )}
        <div>
          <span className="text-sky-700">กำหนด:</span> {formatThaiDate(item.due_date)}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium text-sky-900">
          มิติที่ผู้นิเทศจะสังเกต
        </div>
        <div className="space-y-1.5">
          {RUBRIC_DIMENSIONS.map((dim) => {
            const isHi = highlight.has(dim.key);
            const tip = DIMENSION_TIPS[dim.key];
            return (
              <div
                key={dim.key}
                className={cn(
                  "rounded-md px-3 py-2 border",
                  isHi
                    ? "bg-white border-sky-300"
                    : "bg-transparent border-transparent"
                )}
              >
                <div
                  className={cn(
                    "text-sm flex items-center gap-2",
                    isHi ? "text-sky-900 font-medium" : "text-muted-foreground"
                  )}
                >
                  {dim.label}
                  {isHi && (
                    <span className="text-[10px] text-sky-700 border border-sky-300 rounded px-1">
                      เน้น
                    </span>
                  )}
                </div>
                {isHi && tip && (
                  <div className="text-xs text-sky-700 mt-0.5">{tip}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function IntegrityFlagCard({ item }: { item: ActionItem }) {
  return (
    <div className="rounded-lg border border-orange-300 bg-orange-50 p-4 space-y-1">
      <div className="font-medium text-orange-900">
        📝 พบข้อมูลที่ต้องแก้ไขในบันทึกหลังสอน
      </div>
      {item.detail && (
        <div className="text-sm text-orange-900">{item.detail}</div>
      )}
      <div className="text-sm text-orange-800">
        กรุณาตรวจสอบและแก้ไขบันทึกหลังสอนที่เกี่ยวข้อง
      </div>
    </div>
  );
}

function ResolvedCard({ item }: { item: ActionItem }) {
  return (
    <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
      <div className="font-medium text-emerald-900">
        ✅ ดำเนินการเรียบร้อยแล้ว — {formatThaiDate(item.resolved_at)}
      </div>
    </div>
  );
}

function TeacherCard({ item }: { item: ActionItem }) {
  if (item.status === "watching") return <WatchingCard item={item} />;
  if (item.status === "resolved") return <ResolvedCard item={item} />;
  // status === 'open' from here.
  if (item.issue_type === "IntegrityFlag") return <IntegrityFlagCard item={item} />;
  if (item.issue_type === "MasteryDrop" || item.issue_type === "RedZone" || item.issue_type === "UnitBlindSpot")
    return <SupervisionPrepCard item={item} />;
  return null;
}

export function TeacherActionView({ teacherId }: Props) {
  const { data: items, isLoading, error } = useTeacherActionItems(teacherId);
  const { data: plcSessions, isLoading: plcLoading } = useTeacherPlcSessions(teacherId);

  if (isLoading || plcLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-md p-3 text-sm">
        ไม่สามารถโหลดข้อมูลได้: {error instanceof Error ? error.message : "ไม่ทราบสาเหตุ"}
      </div>
    );
  }

  const list = items ?? [];
  const sessions = plcSessions ?? [];

  if (list.length === 0 && sessions.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        ขณะนี้ไม่มีรายการติดตามสำหรับคุณ 🎉
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* กลุ่ม PLC ที่ครูคนนี้เป็นสมาชิก */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">กลุ่ม PLC ของคุณ</h2>
            <span className="text-sm text-muted-foreground">({sessions.length} กลุ่ม)</span>
          </div>
          {sessions.map((session) => (
            <PlcSessionTeacherCard
              key={session.id}
              session={session}
              teacherId={teacherId}
            />
          ))}
        </div>
      )}

      {/* ปัญหา/รายการติดตามของครูคนนี้ */}
      {list.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">ปัญหาที่ต้องติดตาม</h2>
            <span className="text-sm text-muted-foreground">({list.length} รายการ)</span>
          </div>
          {list.map((item) => (
            <TeacherCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
