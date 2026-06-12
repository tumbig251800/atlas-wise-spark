import { Badge } from "@/components/ui/badge";
import type { ResearchStatus, ResearchIssueType } from "@/types/classroomResearch";

const STATUS_CONFIG: Record<
  ResearchStatus,
  { label: string; className: string }
> = {
  suggested: {
    label: "หัวข้อแนะนำ",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  selected: {
    label: "เลือกแล้ว",
    className: "bg-yellow-100 text-yellow-700 border-yellow-200",
  },
  in_progress: {
    label: "กำลังทำวิจัย",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  completed: {
    label: "เสร็จสมบูรณ์",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  abandoned: {
    label: "ไม่ทำ",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  },
};

const ISSUE_TYPE_CONFIG: Record<
  ResearchIssueType,
  { label: string; className: string }
> = {
  GapRepeat: {
    label: "Gap ซ้ำต่อเนื่อง",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  UnitBlindSpot: {
    label: "นักเรียนตกหล่น (Blind Spot)",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
  },
  StayLong: {
    label: "ซ่อมเสริมไม่ผ่านหลายรอบ",
    className: "bg-rose-100 text-rose-700 border-rose-200",
  },
  RedZone: {
    label: "ห้องเรียนกลุ่มเสี่ยง",
    className: "bg-destructive/20 text-destructive border-destructive/30",
  },
};

export function StatusBadge({ status }: { status: ResearchStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge className={config.className}>{config.label}</Badge>;
}

export function IssueTypeBadge({ issueType }: { issueType: ResearchIssueType }) {
  const config = ISSUE_TYPE_CONFIG[issueType];
  return <Badge className={config.className}>{config.label}</Badge>;
}
