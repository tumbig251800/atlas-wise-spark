import { Badge } from "@/components/ui/badge";
import { daysRemaining } from "@/hooks/useActionItems";

interface Props {
  status: string;
  dueDate?: string | null;
}

export function StatusBadge({ status, dueDate }: Props) {
  if (status === "verified") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">✓ Verified</Badge>;
  }
  if (status === "dismissed") {
    return <Badge variant="outline" className="text-muted-foreground">Dismissed</Badge>;
  }

  const days = daysRemaining(dueDate ?? null);

  if (status === "resolved") {
    return <Badge className="bg-sky-600 hover:bg-sky-600 text-white">Resolved</Badge>;
  }

  if (days === null) {
    return <Badge variant="secondary">ค้างอยู่</Badge>;
  }

  if (days <= 0) {
    return <Badge variant="destructive">⛔ เกินกำหนด {Math.abs(days)} วัน</Badge>;
  }
  if (days <= 2) {
    return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">⚠️ เหลือ {days} วัน</Badge>;
  }
  return <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white">🟢 เหลือ {days} วัน</Badge>;
}

export function IssueTypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; className: string }> = {
    RedZone: { label: "Red Zone", className: "bg-red-100 text-red-800 border border-red-300" },
    MasteryDrop: { label: "Mastery Drop", className: "bg-orange-100 text-orange-800 border border-orange-300" },
    IntegrityFlag: { label: "Integrity", className: "bg-purple-100 text-purple-800 border border-purple-300" },
  };
  const info = map[type] ?? { label: type, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-600 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-400 text-yellow-900",
  };
  const cls = map[severity] ?? "bg-gray-200 text-gray-800";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase ${cls}`}>
      {severity}
    </span>
  );
}
