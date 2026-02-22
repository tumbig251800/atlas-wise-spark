import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DiagnosticEvent } from "@/hooks/useDiagnosticData";

interface Props {
  events: DiagnosticEvent[];
}

export function ReferralQueue({ events }: Props) {
  const referrals = events
    .filter((e) => e.gap_type === "a2-gap")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          Referral Queue — A2-Gap ({referrals.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่มีรายการ A2-Gap ที่รอดำเนินการ</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>วิชา</TableHead>
                <TableHead>ชั้น/ห้อง</TableHead>
                <TableHead>นักเรียน</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>วันที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referrals.map((e) => (
                <TableRow key={e.id} className="bg-destructive/5">
                  <TableCell className="font-medium">{e.topic || e.normalized_topic || "-"}</TableCell>
                  <TableCell>{e.subject || "-"}</TableCell>
                  <TableCell>{e.grade_level} {e.classroom}</TableCell>
                  <TableCell>{e.student_id || "ทั้งห้อง"}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">P{e.priority_level || 1}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(e.created_at).toLocaleDateString("th-TH")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
