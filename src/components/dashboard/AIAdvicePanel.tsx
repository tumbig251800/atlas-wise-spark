import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Brain, HeartPulse, Lightbulb, Trophy, Activity } from "lucide-react";
import type { TeachingLog } from "@/hooks/useDashboardData";
import type { DiagnosticEvent } from "@/hooks/useDiagnosticData";
import { buildStrictAnswerTH, type DecisionObject } from "@/lib/atlasStrictNarrator";

interface Props {
  logs: TeachingLog[];
  diagnosticEvents?: DiagnosticEvent[];
}

interface GapAdvice {
  icon: typeof Brain;
  title: string;
  advice: string;
  color: string;
}

const GAP_ADVICE: Record<string, GapAdvice> = {
  "k-gap": {
    icon: Brain,
    title: "Knowledge Gap วินิจฉัย",
    advice: "Scaffolding: ย่อยเนื้อหาใหม่ + A2 Mapping — แบ่งเนื้อหาเป็นชิ้นเล็ก ใช้ผังมโนทัศน์ช่วยเชื่อมโยงความรู้เดิมกับใหม่",
    color: "text-red-400",
  },
  "p-gap": {
    icon: Lightbulb,
    title: "Practice Gap วินิจฉัย",
    advice: "Active Drill: ฝึกซ้ำ + A1-A3 Practice — เพิ่มแบบฝึกหัดแบบ Active Learning ให้นักเรียนลงมือทำซ้ำจนคล่อง",
    color: "text-orange-400",
  },
  "a-gap": {
    icon: HeartPulse,
    title: "Affective Gap วินิจฉัย",
    advice: "Gamification: A4 Heart First + สร้างแรงจูงใจ — ใช้เกมการเรียนรู้และระบบรางวัลเพื่อกระตุ้นความสนใจ",
    color: "text-purple-400",
  },
  "system-gap": {
    icon: AlertTriangle,
    title: "System Gap วินิจฉัย",
    advice: "System Fix: ปรับสื่อ/เวลา/โครงสร้าง — ทบทวนสื่อการสอน จัดสรรเวลาใหม่ หรือปรับโครงสร้างห้องเรียน",
    color: "text-muted-foreground",
  },
  success: {
    icon: Trophy,
    title: "ยอดเยี่ยม!",
    advice: "รักษาระดับและเพิ่ม Challenge — นักเรียนเข้าใจดีแล้ว ลองเพิ่มโจทย์ท้าทายเพื่อยกระดับต่อไป",
    color: "text-[hsl(160_84%_30%)]",
  },
};

function getDominantGap(logs: TeachingLog[]): string {
  const counts: Record<string, number> = {};
  logs.forEach((l) => {
    counts[l.major_gap] = (counts[l.major_gap] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "success";
}

/** Deterministic: ใช้ decisionObject จาก Backend เมื่อมี ไม่อินเวนต์ตัวเลขเอง */
function getRemedialInfo(log: TeachingLog, decision?: DecisionObject | null) {
  const total = log.total_students ?? 0;
  const count = decision != null && total > 0
    ? Math.round((decision.gap_rate / 100) * total)
    : (log.remedial_ids || "").split(",").filter((x) => x.trim() && x !== "[None]" && x !== "[N/A]").length;
  const pct = decision != null
    ? decision.gap_rate
    : total > 0 ? (count / total) * 100 : 0;

  if (pct > 40) return { label: "Gap > 40%", pct: pct.toFixed(1), count, total, variant: "outline" as const, className: "border-orange-400 text-orange-600", pivotTriggered: decision?.pivot_triggered };
  if (pct > 20) return { label: "Small Group", pct: pct.toFixed(1), count, total, variant: "outline" as const, className: "border-[hsl(var(--atlas-warning))] text-[hsl(var(--atlas-warning))]", pivotTriggered: false };
  if (count > 0 || pct > 0) return { label: "Individual Support", pct: pct.toFixed(1), count, total, variant: "outline" as const, className: "border-[hsl(var(--atlas-info))] text-[hsl(var(--atlas-info))]", pivotTriggered: false };
  return null;
}

function isSuccessPath(log: TeachingLog) {
  return (log.mastery_score ?? 0) === 5 && (log.major_gap ?? "") === "success";
}

export function AIAdvicePanel({ logs, diagnosticEvents = [] }: Props) {
  const last5 = logs.slice(-5);
  if (last5.length < 2) {
    return (
      <div className="glass-card p-8 text-center text-muted-foreground">
        <p className="text-lg">🤖 ข้อมูลยังไม่เพียงพอ</p>
        <p className="text-sm mt-2">ต้องมีอย่างน้อย 2 คาบจึงจะวินิจฉัยได้</p>
      </div>
    );
  }

  const dominant = getDominantGap(last5);
  const adviceData = GAP_ADVICE[dominant] ?? GAP_ADVICE.success;
  const Icon = adviceData.icon;

  const healthCareEntries = last5.filter(
    (l) => l.health_care_status && l.health_care_ids && (l.health_care_ids as string)?.trim() !== ""
  );

  const inconsistencies = last5.filter(
    (l) => (l.mastery_score ?? 0) >= 4 && (l.major_gap ?? "") !== "success"
  );

  const decisionLookup = new Map<string, DecisionObject>();
  (diagnosticEvents ?? []).forEach((de) => {
    if (de.decision_object && !de.student_id && !decisionLookup.has(de.teaching_log_id)) {
      decisionLookup.set(de.teaching_log_id, de.decision_object as DecisionObject);
    }
  });

  const strictCards = last5
    .filter((log) => decisionLookup.has(log.id))
    .map((log) => {
      const decision = decisionLookup.get(log.id)!;
      const strict = buildStrictAnswerTH({
        date: log.teaching_date,
        classId: decision.class_id,
        subject: decision.subject,
        topic: decision.normalized_topic,
        decision,
      });
      return { log, strict, decision };
    })
    .filter(({ strict }) => strict.verdict !== "NO_PIVOT");

  const legacyGapLogs = last5.filter(
    (log) => !decisionLookup.has(log.id) && log.major_gap !== "success"
  );

  const hasPivotMode = strictCards.some(({ strict }) => strict.verdict === "FORCE_PIVOT");

  return (
    <div className="space-y-4">
      {hasPivotMode && (
        <div className="glass-card p-4 border-destructive bg-destructive/15 animate-pivot-blink">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <span className="font-bold text-destructive text-lg">🔴 PIVOT MODE</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            มีคาบที่เข้า PIVOT MODE — Gap &gt;40% สองครั้งติดต่อกันในวิชาเดียวกัน
          </p>
        </div>
      )}

      {/* Main advice card */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Icon className={`h-5 w-5 ${adviceData.color}`} />
            <span className={adviceData.color}>{adviceData.title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground leading-relaxed">{adviceData.advice}</p>
          <p className="text-xs text-muted-foreground mt-3">
            วิเคราะห์จาก {last5.length} คาบล่าสุด — Gap หลัก: <span className="font-semibold uppercase">{dominant}</span>
          </p>
        </CardContent>
      </Card>

      {/* Data-Driven Insights */}
      <Card className="glass-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-[hsl(var(--atlas-info))]" />
            Data-Driven Insights (5 คาบล่าสุด)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {last5.map((log) => {
              const decision = decisionLookup.get(log.id);
              const remedial = getRemedialInfo(log, decision);
              const success = isSuccessPath(log);
              return (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 space-y-2 ${
                    success
                      ? "border-emerald-500/40 bg-emerald-500/8"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium">
                      {log.teaching_date} — {log.subject} {log.grade_level}/{log.classroom}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        Mastery {log.mastery_score}/5
                      </Badge>
                      {remedial && (
                        <Badge variant={remedial.variant} className={`text-xs ${remedial.className}`}>
                          {remedial.label} ({remedial.count}/{remedial.total} = {remedial.pct}%)
                        </Badge>
                      )}
                      {remedial?.pivotTriggered && (
                        <Badge variant="destructive" className="text-xs animate-pivot-blink bg-destructive">
                          🔴 PIVOT MODE
                        </Badge>
                      )}
                      {success && (
                        <Badge className="text-xs bg-emerald-600 text-white border-0">
                          ✅ Success Path
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {(() => {
                      const ids = (log.remedial_ids || "").split(",").map((x) => x.trim()).filter((x) => x && x !== "[None]" && x !== "[N/A]");
                      return ids.length > 0 ? (
                        <div>
                          <span className="text-muted-foreground">รหัสนักเรียนซ่อมเสริม: </span>
                          <span className="text-foreground font-mono">{ids.join(", ")}</span>
                        </div>
                      ) : null;
                    })()}
                    {log.key_issue && (
                      <div>
                        <span className="text-muted-foreground">Key Issue: </span>
                        <span className="text-foreground">{log.key_issue}</span>
                      </div>
                    )}
                    {log.next_strategy && (
                      <div>
                        <span className="text-muted-foreground">Strategy: </span>
                        <span className="text-foreground">{log.next_strategy}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* STRICT MODE: Class Strike Status from decision_object */}
      {strictCards.map(({ log, strict, decision }) => (
        <Card
          key={log.id}
          className={`glass-card border-border border-l-4 ${
            strict.verdict === "FORCE_PIVOT" ? "border-l-destructive" : "border-l-orange-400"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${strict.verdict === "FORCE_PIVOT" ? "text-destructive" : "text-orange-500"}`} />
              {strict.verdict === "FORCE_PIVOT" ? "🔴 PIVOT MODE TRIGGERED" : "🟠 PLAN FAIL SIGNAL"}
              <Badge variant="outline" className="text-[10px] ml-auto font-mono">
                v{decision.engine_version}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-foreground">
              {strict.answer_th}
            </pre>
            <p className="text-[10px] text-muted-foreground mt-2 font-mono">{strict.debug}</p>
          </CardContent>
        </Card>
      ))}

      {/* Legacy logs without decision_object */}
      {legacyGapLogs.length > 0 && (
        <Card className="glass-card border-border border-l-4 border-l-muted">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-muted-foreground">
              ⚠️ ข้อมูลไม่พอ
            </CardTitle>
          </CardHeader>
          <CardContent>
            {legacyGapLogs.map((log) => (
              <p key={log.id} className="text-sm text-muted-foreground">
                {log.teaching_date} — ไม่มี decisionObject ของ session นี้
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {healthCareEntries.length > 0 && (
        <Card className="glass-card border-border border-l-4 border-l-[hsl(var(--atlas-warning))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--atlas-warning))]">
              <HeartPulse className="h-4 w-4" />
              Special Care Scan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {healthCareEntries.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="text-muted-foreground">{entry.teaching_date}:</span>{" "}
                  <span className="font-medium">{entry.health_care_ids}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {inconsistencies.length > 0 && (
        <Card className="glass-card border-border border-l-4 border-l-[hsl(var(--atlas-gold))]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-[hsl(var(--atlas-gold))]">
              <AlertTriangle className="h-4 w-4" />
              ภาวะคะแนนกลวง (Data Inconsistency)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              พบ Mastery ≥ 4 แต่ยังมี Gap ที่ไม่ใช่ Success:
            </p>
            <ul className="space-y-1">
              {inconsistencies.map((entry) => (
                <li key={entry.id} className="text-sm">
                  <span className="text-muted-foreground">{entry.teaching_date}:</span>{" "}
                  Mastery {entry.mastery_score} + <span className="uppercase font-medium">{entry.major_gap}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
