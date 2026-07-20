import { Badge } from "@/components/ui/badge";
import { daysRemaining } from "@/hooks/useActionItems";

interface Props {
  status: string;
  dueDate?: string | null;
}

export function StatusBadge({ status, dueDate }: Props) {
  if (status === "watching") {
    return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">👁 เฝ้าติดตาม</Badge>;
  }
  if (status === "verified") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">✓ ยืนยันแล้ว</Badge>;
  }
  if (status === "dismissed") {
    return <Badge className="bg-slate-400 hover:bg-slate-400 text-white">ปิดเคส</Badge>;
  }
  if (status === "resolved") {
    return <Badge className="bg-violet-500 hover:bg-violet-500 text-white">ครูแก้แล้ว</Badge>;
  }

  const days = daysRemaining(dueDate ?? null);

  if (days === null) {
    return <Badge className="bg-red-500 hover:bg-red-500 text-white">ค้างอยู่</Badge>;
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
    RedZone:       { label: "🔴 เสี่ยงสูง",          className: "bg-red-100 text-red-800 border border-red-300" },
    MasteryDrop:   { label: "📉 คะแนนร่วง",           className: "bg-orange-100 text-orange-800 border border-orange-300" },
    IntegrityFlag: { label: "🚩 ข้อมูลผิดปกติ",       className: "bg-purple-100 text-purple-800 border border-purple-300" },
    UnitBlindSpot: { label: "📦 คะแนนหลังหน่วยต่ำ",   className: "bg-indigo-100 text-indigo-800 border border-indigo-300" },
    FlatScore:     { label: "🎯 คะแนนนิ่ง",           className: "bg-teal-100 text-teal-800 border border-teal-300" },
  };
  const info = map[type] ?? { label: type, className: "bg-gray-100 text-gray-800" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${info.className}`}>
      {info.label}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    critical: { label: "วิกฤต",   cls: "bg-red-600 text-white" },
    high:     { label: "สูง",      cls: "bg-orange-500 text-white" },
    medium:   { label: "ปานกลาง", cls: "bg-yellow-400 text-yellow-900" },
  };
  const info = map[severity] ?? { label: severity, cls: "bg-gray-200 text-gray-800" };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${info.cls}`}>
      {info.label}
    </span>
  );
}
