import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StrikeCounter } from "@/hooks/useDiagnosticData";

interface Props {
  strikes: StrikeCounter[];
}

type TabFilter = "all" | "active" | "resolved" | "referred";

const strikeBadgeVariant = (count: number) => {
  if (count >= 2) return "destructive";
  if (count >= 1) return "secondary";
  return "outline";
};

const strikeBadgeClass = (count: number) => {
  if (count >= 2) return "";
  if (count >= 1) return "border-orange-400 bg-orange-100 text-orange-700";
  return "border-green-400 bg-green-100 text-green-700";
};

const statusLabel = (s: StrikeCounter) => {
  if (s.status === "resolved" || s.strike_count === 0) return "🟢 PASS";
  if (s.strike_count >= 2) return "🔴 Force Pivot";
  if (s.strike_count >= 1) return "🟠 Plan Fail";
  return "";
};

export function StrikeEscalationView({ strikes }: Props) {
  const [tab, setTab] = useState<TabFilter>("all");
  const [scopeFilter, setScopeFilter] = useState("all");

  const sorted = [...strikes].sort((a, b) => b.strike_count - a.strike_count);

  const filtered = sorted.filter((s) => {
    if (tab === "active" && !(s.status === "active" && s.strike_count >= 1)) return false;
    if (tab === "resolved" && !(s.status === "resolved" || s.strike_count === 0)) return false;
    if (tab === "referred" && s.strike_count < 2) return false;
    if (scopeFilter !== "all") {
      const scopeMatch = scopeFilter === "classroom"
        ? (s.scope === "class" || s.scope === "classroom")
        : s.scope === scopeFilter;
      if (!scopeMatch) return false;
    }
    return true;
  });

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Strike Escalation ({strikes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabFilter)}>
          <TabsList>
            <TabsTrigger value="all">ทั้งหมด ({strikes.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({sorted.filter(s => s.status === "active" && s.strike_count >= 1).length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({sorted.filter(s => s.status === "resolved" || s.strike_count === 0).length})</TabsTrigger>
            <TabsTrigger value="referred">Pivot ({sorted.filter(s => s.strike_count >= 2).length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">ขอบเขต:</span>
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="student">รายนักเรียน</SelectItem>
                <SelectItem value="classroom">รายห้อง</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีรายการในหมวดนี้</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>วิชา</TableHead>
                <TableHead>ขอบเขต</TableHead>
                <TableHead>Gap</TableHead>
                <TableHead>Strike</TableHead>
                <TableHead>เริ่ม Strike</TableHead>
                <TableHead>อัปเดตล่าสุด</TableHead>
                <TableHead>สถานะ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.topic || s.normalized_topic || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {s.subject || "-"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {s.scope === "student" ? `นักเรียน ${s.scope_id}` : `ห้อง ${s.scope_id}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="uppercase text-xs">{s.gap_type || "-"}</TableCell>
                  <TableCell>
                    <Badge variant={strikeBadgeVariant(s.strike_count)} className={strikeBadgeClass(s.strike_count)}>
                      {s.strike_count}/2
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {s.first_strike_at
                      ? new Date(s.first_strike_at).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {new Date(s.last_updated).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" })}
                  </TableCell>
                  <TableCell className="text-xs">{statusLabel(s)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
