import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, FileDown, Loader2 } from "lucide-react";
import type { PlcSession } from "@/types/plc";
import { PLC_OUTCOME_LABELS } from "@/types/plc";
import { supabase } from "@/lib/atlasSupabase";
import { downloadPlcDocx } from "@/lib/downloadPlcDocx";
import { useToast } from "@/hooks/use-toast";
import type { ActionItem } from "@/hooks/useActionItems";

interface PlcSessionCardProps {
  session: PlcSession;
  onEdit: () => void;
}

async function fetchLinkedItems(ids: number[]): Promise<ActionItem[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("action_plan_items")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return (data ?? []) as ActionItem[];
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getOutcomeBadgeClass(outcome: PlcSession["outcome_type"]): string {
  switch (outcome) {
    case "resolved":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "need_supervision":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "continue_plc":
      return "bg-blue-100 text-blue-800 border-blue-300";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function PlcSessionCard({ session, onEdit }: PlcSessionCardProps) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);
    try {
      const items = await fetchLinkedItems(session.linked_action_item_ids ?? []);
      await downloadPlcDocx(session, items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "ดาวน์โหลดไม่สำเร็จ";
      toast({ title: "เกิดข้อผิดพลาด", description: message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="font-medium text-purple-900 flex items-center gap-2">
            <span>📋 PLC — {formatDate(session.session_date)}</span>
            <Badge className={`${getOutcomeBadgeClass(session.outcome_type)} border`}>
              {PLC_OUTCOME_LABELS[session.outcome_type]}
            </Badge>
          </div>
          <div className="text-purple-800 mt-1">
            <span className="font-semibold">หัวข้อ:</span> {session.topic}
          </div>
          {session.duration_minutes && (
            <div className="text-purple-700 text-xs">
              ระยะเวลา: {session.duration_minutes} นาที
            </div>
          )}
          {session.facilitator_name && (
            <div className="text-purple-700 text-xs">
              ผู้นำ PLC: {session.facilitator_name}
            </div>
          )}
          {session.members.length > 0 && (
            <div className="text-purple-700 text-xs">
              สมาชิก: {session.members.map((m) => m.teacher_name).join(", ")}
            </div>
          )}
          {session.outcome_type === "continue_plc" && session.next_plc_date && (
            <div className="text-purple-700 text-xs mt-1">
              นัดครั้งต่อไป: {formatDate(session.next_plc_date)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownload}
            disabled={downloading}
            className="text-purple-700 hover:text-purple-900 hover:bg-purple-100"
            title="ดาวน์โหลดหลักฐาน PLC (.docx)"
          >
            {downloading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileDown className="h-4 w-4" />}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="text-purple-700 hover:text-purple-900 hover:bg-purple-100"
            title="แก้ไข PLC"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {session.problem_statement && (
        <div className="text-purple-800 text-xs">
          <span className="font-semibold">ประเด็นปัญหา:</span> {session.problem_statement}
        </div>
      )}

      {session.action_steps && (
        <div className="text-purple-800 text-xs">
          <span className="font-semibold">สิ่งที่ตกลงจะทำ:</span> {session.action_steps}
        </div>
      )}
    </div>
  );
}
