import { Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DiagnosticEvent } from "@/hooks/useDiagnosticData";

interface Props {
  events: DiagnosticEvent[];
}

export function SystemGapReport({ events }: Props) {
  const blueEvents = events.filter((e) => e.status_color === "blue" && !e.student_id);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Settings className="h-4 w-4 text-[hsl(var(--atlas-info))]" />
          System-Gap Report ({blueEvents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {blueEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">ไม่พบ System-Gap</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>หัวข้อ</TableHead>
                <TableHead>วิชา</TableHead>
                <TableHead>ชั้น</TableHead>
                <TableHead>ห้อง</TableHead>
                <TableHead>วันที่</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blueEvents.slice(0, 20).map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.topic || e.normalized_topic || "-"}</TableCell>
                  <TableCell>{e.subject || "-"}</TableCell>
                  <TableCell>{e.grade_level || "-"}</TableCell>
                  <TableCell>{e.classroom || "-"}</TableCell>
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
