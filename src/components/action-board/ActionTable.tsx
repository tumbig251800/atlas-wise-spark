import { Fragment, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, ExternalLink, CheckCircle2, XCircle, Bot, ClipboardList, Send, Share2, Users } from "lucide-react";
import { ACTION_ITEMS_KEY, type ActionItem } from "@/hooks/useActionItems";
import { StatusBadge, IssueTypeBadge, SeverityBadge } from "./StatusBadge";
import { useNidetVisits } from "@/hooks/useNidetVisits";
import { NidetVisitModal } from "./NidetVisitModal";
import { NidetVisitCard } from "./NidetVisitCard";
import { NotifyTeacherModal } from "./NotifyTeacherModal";
import { ReferralModal } from "./ReferralModal";
import { PlcModal } from "./PlcModal";
import { PlcSessionCard } from "./PlcSessionCard";
import { RUBRIC_DIMENSIONS, type NidetVisit } from "@/types/nidet";
import { useFetchPlcSessionsForItem, useNextPlcDates } from "@/hooks/usePlcSessions";
import type { PlcSession } from "@/types/plc";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/atlasSupabase";

interface Props {
  items: ActionItem[];
  startIndex?: number;
  onVerify: (item: ActionItem) => void;
  onDismiss: (item: ActionItem) => void;
  onPass: (item: ActionItem) => void;
  onResolve: (item: ActionItem) => void;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// watch_started_at is a full timestamptz, not a bare date.
function formatThaiDateTime(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildAiPrompt(item: ActionItem, visit?: NidetVisit | null): string {
  const parts: string[] = [];
  if (item.issue_type) parts.push(`ปัญหาประเภท: ${item.issue_type}`);
  if (item.metric_label) {
    parts.push(
      `ตัวชี้วัด: ${item.metric_label}${item.metric_value != null ? ` (${item.metric_value})` : ""}`
    );
  }
  if (item.detail) parts.push(`รายละเอียด: ${item.detail}`);
  if (item.ai_summary) parts.push(`สรุปจาก AI: ${item.ai_summary}`);
  const body = parts.join("\n");
  let prompt = `ช่วยวิเคราะห์และแนะนำแนวทางแก้ไขปัญหาต่อไปนี้ให้หน่อยครับ:\n${body}`;

  if (visit) {
    const rubricSummary = RUBRIC_DIMENSIONS.filter((d) => visit[d.key] !== null)
      .map((d) => `${d.label} = ${visit[d.key]}/4`)
      .join(", ");
    prompt += `\n\nผลการนิเทศ (${visit.visit_date}):
จุดเด่น: ${visit.strengths}
จุดพัฒนา: ${visit.improvements}
ข้อเสนอแนะ: ${visit.recommendations}
คะแนน rubric ที่ให้: ${rubricSummary}`;
  }

  return prompt;
}

export function ActionTable({ items, startIndex = 0, onVerify, onDismiss, onPass, onResolve }: Props) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const qc = useQueryClient();
  const { fetchVisit } = useNidetVisits();
  const [nidetVisits, setNidetVisits] = useState<Map<number, NidetVisit>>(new Map());
  const fetchedRef = useRef<Set<number>>(new Set());
  const [nidetModalOpen, setNidetModalOpen] = useState(false);
  const [nidetModalActionItem, setNidetModalActionItem] = useState<ActionItem | null>(null);

  // IntegrityFlag resolution modals (notify teacher / FLAG5 referral).
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [notifyModalItem, setNotifyModalItem] = useState<ActionItem | null>(null);
  const [referralModalOpen, setReferralModalOpen] = useState(false);
  const [referralModalItem, setReferralModalItem] = useState<ActionItem | null>(null);

  // Next PLC dates for all items (badge on row)
  const openItemIds = items.filter((i) => i.status === "open" || i.status === "watching").map((i) => i.id);
  const { data: nextPlcDates } = useNextPlcDates(openItemIds);

  // PLC modal state
  const [plcModalOpen, setPlcModalOpen] = useState(false);
  const [plcModalActionItem, setPlcModalActionItem] = useState<ActionItem | null>(null);
  const [plcModalExistingSession, setPlcModalExistingSession] = useState<PlcSession | null>(null);
  const [plcSessions, setPlcSessions] = useState<Map<number, PlcSession[]>>(new Map());

  const toggle = async (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Lazy-load the supervision visit for this row once.
        if (!fetchedRef.current.has(id)) {
          fetchedRef.current.add(id);
          fetchVisit(id)
            .then((v) => {
              if (v) setNidetVisits((m) => new Map(m).set(id, v));
            })
            .catch(() => {
              // allow a retry on next expand
              fetchedRef.current.delete(id);
            });

          // Also fetch PLC sessions for this item
          supabase
            .from("plc_sessions")
            .select("*")
            .contains("linked_action_item_ids", [id])
            .order("session_date", { ascending: false })
            .then(({ data }) => {
              if (data) {
                setPlcSessions((m) => new Map(m).set(id, data as PlcSession[]));
              }
            });
        }
      }
      return next;
    });
  };

  const openNidetModal = (item: ActionItem) => {
    setNidetModalActionItem(item);
    setNidetModalOpen(true);
  };

  const handleNidetSaved = (visit: NidetVisit) => {
    setNidetVisits((m) => new Map(m).set(visit.action_item_id, visit));
    setNidetModalOpen(false);
  };

  const openNotifyModal = (item: ActionItem) => {
    setNotifyModalItem(item);
    setNotifyModalOpen(true);
  };

  const openReferralModal = (item: ActionItem) => {
    setReferralModalItem(item);
    setReferralModalOpen(true);
  };

  // Both IntegrityFlag modals write straight to action_plan_items, so just
  // refetch the board and close the modal.
  const handleNotifySaved = () => {
    qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });
    setNotifyModalOpen(false);
  };

  const handleReferralSaved = () => {
    qc.invalidateQueries({ queryKey: ACTION_ITEMS_KEY });
    setReferralModalOpen(false);
  };

  const openPlcModal = (item: ActionItem, existingSession?: PlcSession) => {
    setPlcModalActionItem(item);
    setPlcModalExistingSession(existingSession ?? null);
    setPlcModalOpen(true);
  };

  const handlePlcSaved = (session: PlcSession) => {
    // Update local PLC sessions cache
    const itemId = plcModalActionItem?.id;
    if (itemId) {
      supabase
        .from("plc_sessions")
        .select("*")
        .contains("linked_action_item_ids", [itemId])
        .order("session_date", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setPlcSessions((m) => new Map(m).set(itemId, data as PlcSession[]));
          }
        });
    }

    setPlcModalOpen(false);

    // If outcome is resolved, suggest user to verify
    if (session.outcome_type === "resolved") {
      toast({
        title: "PLC แก้ไขได้แล้ว — กด Verify เพื่อปิดเคส",
        description: "PLC ระบุว่าแก้ไขได้แล้ว คุณสามารถกด Verify เพื่อปิดเคสนี้ได้",
        duration: 5000,
      });
    }
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
            const isWatching = item.status === "watching";
            const canResolve = item.status === "open" || item.status === "resolved";
            const visit = nidetVisits.get(item.id) ?? null;

            // Resolution flow depends on issue_type. MasteryDrop/RedZone/UnitBlindSpot need a
            // classroom supervision visit; IntegrityFlag is a data-entry fix.
            const isSupervisionNeeded =
              item.issue_type === "MasteryDrop" || item.issue_type === "RedZone" || item.issue_type === "UnitBlindSpot";
            const isIntegrityFlag = item.issue_type === "IntegrityFlag";
            const isFlag5 =
              isIntegrityFlag &&
              (item.detail?.includes("FLAG5") || item.detail?.includes("a2-gap"));
            const isActionable = canResolve || isWatching;
            return (
              <Fragment key={item.id}>
                <TableRow
                  className="cursor-pointer hover:bg-muted/40"
                  onClick={() => toggle(item.id)}
                >
                  <TableCell>
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{startIndex + idx + 1}</TableCell>
                  <TableCell><IssueTypeBadge type={item.issue_type} /></TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{item.teacher_name ?? "—"}</span>
                      {visit && (
                        <span className="text-[11px] bg-sky-100 text-sky-800 border border-sky-200 rounded px-1.5 py-0.5">
                          นิเทศแล้ว
                        </span>
                      )}
                      {nextPlcDates?.get(item.id) && (
                        <span className="text-[11px] bg-purple-100 text-purple-800 border border-purple-200 rounded px-1.5 py-0.5">
                          📅 PLC {new Date(nextPlcDates.get(item.id)! + "T00:00:00").toLocaleDateString("th-TH", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.grade_level ?? "—"} {item.classroom ?? ""} · {item.subject ?? "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.issue_type === "MasteryDrop" && item.mastery_avg_previous != null && item.mastery_avg_recent != null ? (
                      <>
                        <div className="text-sm">
                          Mastery ลดลง {Number(item.metric_value) > 0 ? "-" : ""}{Math.abs(Number(item.metric_value)).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Number(item.mastery_avg_previous).toFixed(2)} → {Number(item.mastery_avg_recent).toFixed(2)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-sm">{item.metric_label ?? "—"}</div>
                        {item.metric_value != null && (
                          <div className="text-xs text-muted-foreground">{item.metric_value}</div>
                        )}
                      </>
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

                        {isWatching && (
                          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-1">
                            <div className="font-medium text-amber-900 flex items-center gap-1">
                              👁 ระบบกำลังเฝ้าติดตาม
                            </div>
                            <div className="text-sm text-amber-900">
                              ค่าเฉลี่ย 3 คาบล่าสุด:{" "}
                              <span className="font-semibold">{item.mastery_avg_recent ?? "—"}</span>
                            </div>
                            <div className="text-sm text-amber-900">
                              ค่าเฉลี่ย 3 คาบก่อนหน้า:{" "}
                              <span className="font-semibold">{item.mastery_avg_previous ?? "—"}</span>
                            </div>
                            <div className="text-sm text-amber-900">
                              ติดตามตั้งแต่: {formatThaiDateTime(item.watch_started_at)}
                            </div>
                            <div className="text-xs text-amber-700 pt-1">
                              ถ้าคะแนนฟื้นตัวในรอบถัดไป ระบบจะปิดให้อัตโนมัติ
                            </div>
                          </div>
                        )}

                        {item.resolution_note && (
                          <div className="bg-background rounded-md p-2 border border-border">
                            <div className="text-xs text-muted-foreground mb-1">หมายเหตุการแก้ไข</div>
                            <div className="text-sm">{item.resolution_note}</div>
                          </div>
                        )}

                        {visit && (
                          <NidetVisitCard visit={visit} onEdit={() => openNidetModal(item)} />
                        )}

                        {/* PLC sessions + download hint */}
                        {(() => {
                          const sessions = plcSessions.get(item.id) ?? [];
                          if (sessions.length > 0) {
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">ประวัติ PLC</span>
                                  <span className="text-[11px] bg-purple-100 text-purple-700 border border-purple-200 rounded px-1.5 py-0.5">
                                    📥 กดปุ่ม ↓ เพื่อดาวน์โหลด .docx หลักฐานแต่ละ session
                                  </span>
                                </div>
                                {sessions.map((session) => (
                                  <PlcSessionCard
                                    key={session.id}
                                    session={session}
                                    onEdit={() => openPlcModal(item, session)}
                                  />
                                ))}
                              </div>
                            );
                          }
                          const isCloseable = item.status !== "verified" && item.status !== "dismissed";
                          return (
                            <div className="rounded-md border border-dashed border-purple-200 bg-purple-50/40 px-4 py-3 text-sm text-purple-700 flex items-start gap-2">
                              <span className="text-base">📋</span>
                              <div className="space-y-1">
                                <div className="font-medium">ยังไม่มีบันทึกการประชุม PLC — ดาวน์โหลดไฟล์หลักฐานไม่ได้</div>
                                <div className="text-xs text-purple-600">
                                  ⚠ ไฟล์หลักฐานจะสร้างได้ก็ต่อเมื่อ<strong>มีการบันทึกการประชุม PLC ในระบบก่อน</strong> เพราะระบบนำข้อมูลจากการประชุม เช่น หัวข้อที่คุย สาเหตุปัญหา แนวทางแก้ไข และรายชื่อครูที่เข้าร่วม มาสร้างเป็นเอกสารให้อัตโนมัติ
                                </div>
                                {isCloseable ? (
                                  <div className="text-xs text-purple-500 pt-0.5">
                                    ✅ วิธีดาวน์โหลด: กดปุ่ม <strong>"📋 จัดการทั้งครูนี้"</strong> ที่แถบชื่อครู หรือปุ่ม <strong>บันทึก PLC</strong> ด้านล่าง → กรอกข้อมูลการประชุม → กด "บันทึก + ดาวน์โหลด"
                                  </div>
                                ) : (
                                  <div className="text-xs text-purple-500 pt-0.5">
                                    รายการนี้ถูกปิดไปแล้วโดยไม่มีการบันทึกการประชุม PLC จึงไม่สามารถสร้างเอกสารย้อนหลังได้
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        {/* IntegrityFlag (non-FLAG5) — record of how/when the teacher was told. */}
                        {isIntegrityFlag && !isFlag5 && item.notify_date && (
                          <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-sm space-y-1">
                            <div className="font-medium text-sky-900 flex items-center gap-1.5">
                              <Send className="h-4 w-4" />
                              แจ้งครูแล้ว — {formatDate(item.notify_date)} ผ่าน {item.notify_channel ?? "—"}
                            </div>
                            {item.notify_note && (
                              <div className="text-sky-800">{item.notify_note}</div>
                            )}
                          </div>
                        )}

                        {/* FLAG5 — external referral record. */}
                        {isIntegrityFlag && isFlag5 && item.referral_date && (
                          <div className="rounded-md border border-purple-200 bg-purple-50 p-3 text-sm space-y-1">
                            <div className="font-medium text-purple-900 flex items-center gap-1.5">
                              <Share2 className="h-4 w-4" />
                              ส่งต่อแล้ว — {formatDate(item.referral_date)} → {item.referral_agency ?? "—"}
                            </div>
                            {item.referral_owner && (
                              <div className="text-purple-800">ผู้ติดตาม: {item.referral_owner}</div>
                            )}
                            {item.referral_note && (
                              <div className="text-purple-800">{item.referral_note}</div>
                            )}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                          {/* PLC button — available for ALL open or watching items */}
                          {isActionable && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-violet-400 text-violet-700 hover:bg-violet-50"
                              onClick={(e) => { e.stopPropagation(); openPlcModal(item); }}
                            >
                              <Users className="h-4 w-4 mr-1" />
                              PLC
                            </Button>
                          )}

                          {/* MasteryDrop / RedZone / UnitBlindSpot — classroom supervision flow. */}
                          {isSupervisionNeeded && (
                            <>
                              {/* Watch items are not supervised yet — no "บันทึกนิเทศ". */}
                              {!isWatching && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-sky-300 text-sky-800 hover:bg-sky-50"
                                  onClick={(e) => { e.stopPropagation(); openNidetModal(item); }}
                                >
                                  <ClipboardList className="h-4 w-4 mr-1" />
                                  {visit ? "แก้ไขบันทึก" : "บันทึกนิเทศ"}
                                </Button>
                              )}
                              {isWatching && (
                                <>
                                  {visit && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-400 text-blue-700 hover:bg-blue-50"
                                      onClick={(e) => { e.stopPropagation(); openNidetModal(item); }}
                                    >
                                      <ClipboardList className="h-4 w-4 mr-1" />
                                      ติดตามต่อ
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-sky-300 text-sky-800 hover:bg-sky-50"
                                    onClick={(e) => { e.stopPropagation(); openNidetModal(item); }}
                                  >
                                    <ClipboardList className="h-4 w-4 mr-1" />
                                    บันทึกนิเทศ
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                                    onClick={(e) => { e.stopPropagation(); onPass(item); }}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> ผ่าน
                                  </Button>
                                </>
                              )}
                              {/* ครูแก้แล้ว — open items only (not yet resolved) */}
                              {item.status === "open" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                                  onClick={(e) => { e.stopPropagation(); onResolve(item); }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> ครูแก้แล้ว
                                </Button>
                              )}
                              {/* Verify — for resolved items waiting for admin confirmation */}
                              {item.status === "resolved" && (
                                <Button
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); onVerify(item); }}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" /> Verify
                                </Button>
                              )}
                            </>
                          )}

                          {/* FLAG5 — external referral closes the item; no Verify button. */}
                          {isIntegrityFlag && isFlag5 && isActionable && (
                            <Button
                              size="sm"
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={(e) => { e.stopPropagation(); openReferralModal(item); }}
                            >
                              <Share2 className="h-4 w-4 mr-1" />
                              {item.referral_date ? "แก้ไขการส่งต่อ" : "บันทึกการส่งต่อ"}
                            </Button>
                          )}

                          {/* IntegrityFlag (FLAG1-4, 6) — notify teacher, then confirm the fix. */}
                          {isIntegrityFlag && !isFlag5 && isActionable && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                                onClick={(e) => { e.stopPropagation(); openNotifyModal(item); }}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                {item.notify_date ? "แก้ไขการแจ้ง" : "แจ้งครูแล้ว"}
                              </Button>
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={(e) => { e.stopPropagation(); onVerify(item); }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" /> ยืนยันครูแก้แล้ว
                              </Button>
                            </>
                          )}

                          {/* Dismiss — available while the item is still actionable. */}
                          {isActionable && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); onDismiss(item); }}
                            >
                              <XCircle className="h-4 w-4 mr-1" /> Dismiss
                            </Button>
                          )}

                          {/* ถามพีท AI — supervision + FLAG5 only (not the plain notify flow). */}
                          {(isSupervisionNeeded || (isIntegrityFlag && isFlag5)) &&
                            item.subject && item.grade_level && item.classroom && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate("/consultant", {
                                    state: {
                                      subject: item.subject,
                                      gradeLevel: item.grade_level,
                                      classroom: item.classroom,
                                      initialPrompt: buildAiPrompt(item, visit),
                                    },
                                  });
                                }}
                              >
                                <Bot className="h-4 w-4 mr-1" /> ถามพีท AI
                              </Button>
                            )}
                          </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {nidetModalActionItem && (
        <NidetVisitModal
          open={nidetModalOpen}
          onClose={() => setNidetModalOpen(false)}
          onSaved={handleNidetSaved}
          actionItem={{
            id: nidetModalActionItem.id,
            subject: nidetModalActionItem.subject ?? undefined,
            grade_level: nidetModalActionItem.grade_level ?? undefined,
            classroom: nidetModalActionItem.classroom ?? undefined,
            issue_type: nidetModalActionItem.issue_type ?? undefined,
          }}
          existingVisit={nidetVisits.get(nidetModalActionItem.id) ?? null}
        />
      )}

      {notifyModalItem && (
        <NotifyTeacherModal
          open={notifyModalOpen}
          onClose={() => setNotifyModalOpen(false)}
          onSaved={handleNotifySaved}
          actionItem={{
            id: notifyModalItem.id,
            teacher_name: notifyModalItem.teacher_name ?? undefined,
            issue_type: notifyModalItem.issue_type ?? undefined,
            detail: notifyModalItem.detail ?? undefined,
          }}
        />
      )}

      {referralModalItem && (
        <ReferralModal
          open={referralModalOpen}
          onClose={() => setReferralModalOpen(false)}
          onSaved={handleReferralSaved}
          actionItem={{
            id: referralModalItem.id,
            teacher_name: referralModalItem.teacher_name ?? undefined,
            issue_type: referralModalItem.issue_type ?? undefined,
            detail: referralModalItem.detail ?? undefined,
          }}
        />
      )}

      {plcModalActionItem && (
        <PlcModal
          open={plcModalOpen}
          onClose={() => setPlcModalOpen(false)}
          onSaved={handlePlcSaved}
          actionItem={plcModalActionItem}
          existingSession={plcModalExistingSession}
        />
      )}
    </div>
  );
}
