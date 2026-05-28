import { Fragment, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import type { ActionItem } from "@/hooks/useActionItems";
import { StatusBadge, IssueTypeBadge, SeverityBadge } from "./StatusBadge";

interface Props {
  items: ActionItem[];
  onVerify: (item: ActionItem) => void;
  onDismiss: (item: ActionItem) => void;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ActionTable({ items, onVerify, onDismiss }: Props) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        ไม่มีรายการในตัวกรองนี้
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="w-12">#</TableHead>
            <TableHead>ประเภท</TableHead>
            <TableHead>ครู / ชั้น / วิชา</TableHead>
            <TableHead>ตัวชี้วัด</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>กำหนดส่ง</TableHead>
            <TableHead>สถานะ</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, idx) => {
            const isOpen = expanded.has(item.id);
            const canResolve = item.status === "open" || item.status === "resolved";
            return (
              <Fragment key={item.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => toggle(item.id)}
                >
                  <TableCell>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                  <TableCell><IssueTypeBadge type={item.issue_type} /></TableCell>
                  <TableCell className="font-medium">
                    <div>{item.teacher_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.grade_level ?? "—"} {item.classroom ?? ""} · {item.subject ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{item.metric_label ?? "—"}</div>
                    {item.metric_value != null && (
                      <div className="text-xs text-muted-foreground">{item.metric_value}</div>
                    )}
                  </TableCell>
                  <TableCell><SeverityBadge severity={item.severity} /></TableCell>
                  <TableCell className="text-xs">{formatDate(item.due_date)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} dueDate={item.due_date} />
                  </TableCell>
                </TableRow>

                {isOpen && (
                  <TableRow className="bg-muted/20">
                    <TableCell colSpan={8} className="p-4">
                      <div className="space-y-3 text-sm">
                        {item.detail && (
                          <div>
                            <div className="text-xs uppercase text-muted-foreground mb-1">รายละเอียด</div>
                            <div>{item.detail}</div>
                          </div>
                        )}
                        {item.ai_summary && (
                          <div>
                            <div className="text-xs uppercase text-muted-foreground mb-1">AI Summary</div>
                            <div className="whitespace-pre-wrap">{item.ai_summary}</div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {item.ai_owner && (
                            <div>
                              <div className="text-xs text-muted-foreground">ผู้รับผิดชอบ</div>
                              <div>{item.ai_owner}</div>
                            </div>
                          )}
                          {item.ai_priority && (
                            <div>
                              <div className="text-xs text-muted-foreground">AI Priority</div>
                              <div>{item.ai_priority}</div>
                            </div>
                          )}
                          {item.run_date && (
                            <div>
                              <div className="text-xs text-muted-foreground">วันที่ตรวจพบ</div>
                              <div>{formatDate(item.run_date)}</div>
                            </div>
                          )}
                          {item.calendar_html_link && (
                            <div>
                              <div className="text-xs text-muted-foreground">Calendar</div>
                              <a
                                href={item.calendar_html_link}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                เปิด <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        {item.resolution_note && (
                          <div className="bg-background rounded-md p-2 border border-border">
                            <div className="text-xs text-muted-foreground mb-1">หมายเหตุการแก้ไข</div>
                            <div className="text-sm">{item.resolution_note}</div>
                          </div>
                        )}

                        {canResolve && (
                          <div className="flex gap-2 pt-2 border-t border-border">
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); onVerify(item); }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); onDismiss(item); }}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
