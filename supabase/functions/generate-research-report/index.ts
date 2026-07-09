import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

// Full research report generator (รายงานวิจัยฉบับสมบูรณ์) — sibling of
// generate-research-docx (the proposal/outline generator, which stays untouched).
// Methodological contract: the AI writes PROSE ONLY — every number shown in the
// report (before/after values, log counts, dates) is rendered by code straight
// from before_data / after_data / teaching_logs. The AI is forbidden from
// inventing numbers, and the before/after comparison table is built here, not
// by the model.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function formatTerm(academic_term: string): { term: string; year: string } {
  const m = academic_term.match(/(\d{4})-(\d)/);
  if (m) return { year: m[1], term: m[2] };
  return { year: academic_term, term: "" };
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return "-";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br>");
}

function thaiDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface MetricData {
  metric?: string;
  label?: string;
  value?: number | string;
  captured_at?: string;
  source?: string;
}

interface LogsSummary {
  count: number;
  first_date: string | null;
  last_date: string | null;
  avg_mastery: number | null;
}

interface AIReport {
  abstract: string;
  results_narrative: string;
  summary: string;
  discussion: string;
  limitations: string[];
  recommendations: {
    classroom: string[];
    future_research: string[];
  };
}

async function callClaude(
  apiKey: string,
  row: Record<string, unknown>,
  before: MetricData,
  after: MetricData,
  logs: LogsSummary
): Promise<AIReport> {
  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `คุณเป็นผู้ช่วยเขียนรายงานวิจัยชั้นเรียน (ฉบับย่อ) ภาษาไทยสำหรับครูประถมศึกษา
ตอบเป็น JSON เท่านั้น ห้ามมีข้อความนอก JSON ห้ามมี markdown code block
กฎเหล็ก:
1. ห้ามใช้ภาษา causation เช่น "ทำให้" "ส่งผลให้" — ใช้ "สัมพันธ์กับ" "มีแนวโน้ม" "สะท้อนให้เห็น" แทน (แบบแผนวิจัยนี้เป็น one-group pretest-posttest สรุปเชิงสาเหตุไม่ได้)
2. ตัวเลขทุกตัวที่อ้างในเนื้อหา ต้องมาจากข้อมูลที่ให้เท่านั้น ห้ามแต่งตัวเลข ร้อยละ หรือสถิติใหม่ขึ้นเอง
3. ห้ามระบุชื่อนักเรียนรายบุคคล
4. ถ้าคำอธิบายตัวชี้วัดก่อน-หลังนิยามไม่ตรงกันทุกคำ ให้ระบุเรื่องนี้ไว้ใน limitations อย่างตรงไปตรงมา
5. ถ้าจำนวนคาบที่สอนจริงยังน้อยเมื่อเทียบกับแผน ให้ระบุใน limitations
6. อย่าสร้างตารางในข้อความ — ตารางเปรียบเทียบระบบสร้างให้แล้ว เขียนเป็นความเรียงอธิบายประกอบ`;

  const userPrompt = `เขียนเนื้อหารายงานวิจัยชั้นเรียนจากข้อมูลจริงต่อไปนี้

## ข้อมูลงานวิจัย
ชื่อเรื่อง: ${row.research_title}
วิชา: ${row.subject} ชั้น ${row.grade_level}/${row.classroom} ภาคเรียน ${row.academic_term}
ประเภทปัญหา (issue_type): ${row.issue_type}
ปัญหาที่ตรวจพบ: ${row.detected_problem}
หลักฐาน: ${row.evidence_summary}
คำถามวิจัย: ${row.research_question}
วัตถุประสงค์: ${row.objective}
กลุ่มเป้าหมาย: ${row.target_group}
นวัตกรรม/วิธีการ: ${row.intervention}
เครื่องมือ: ${row.tools}
วิธีเก็บข้อมูล: ${row.data_collection_method}
วิธีวิเคราะห์ข้อมูล: ${row.analysis_method}
ตัวชี้วัดความสำเร็จ: ${row.success_indicator}

## ผลการวัดจริง (ใช้ตัวเลขชุดนี้เท่านั้น)
ก่อนทำวิจัย (Baseline): ${before.label} = ${before.value} (เก็บเมื่อ ${before.captured_at ?? "-"})
หลังทำวิจัย (Endline): ${after.label} = ${after.value} (เก็บเมื่อ ${after.captured_at ?? "-"})

## การดำเนินการจริง (จากบันทึกหลังสอนที่ผูกกับงานวิจัยนี้)
จำนวนคาบที่บันทึก: ${logs.count} คาบ
ช่วงเวลา: ${logs.first_date ?? "-"} ถึง ${logs.last_date ?? "-"}
ค่าเฉลี่ย mastery ของคาบที่สอน: ${logs.avg_mastery ?? "ไม่มีข้อมูล"}

## โครงสร้าง JSON ที่ต้องการ
{
  "abstract": "บทคัดย่อ 1 ย่อหน้า (ปัญหา วิธีการ ผลหลัก)",
  "results_narrative": "ความเรียงอธิบายผลการวิจัยประกอบตารางก่อน-หลัง 1-2 ย่อหน้า",
  "summary": "สรุปผลการวิจัยตอบคำถามวิจัยตรงๆ 1 ย่อหน้า",
  "discussion": "อภิปรายผล เชื่อมโยงผลกับนวัตกรรมด้วยภาษาความสัมพันธ์/แนวโน้ม 1-2 ย่อหน้า",
  "limitations": ["ข้อจำกัดข้อที่ 1", "ข้อที่ 2", "..."],
  "recommendations": {
    "classroom": ["ข้อเสนอแนะการนำไปใช้ในชั้นเรียน 2-3 ข้อ"],
    "future_research": ["ข้อเสนอแนะการวิจัยครั้งต่อไป 1-2 ข้อ"]
  }
}`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as AIReport;
}

function buildComparisonTable(before: MetricData, after: MetricData): string {
  const beforeNum = Number(before.value);
  const afterNum = Number(after.value);
  let diffRow = "";
  // Arithmetic difference is only meaningful when both sides measure the exact
  // same operational definition. WF-generated baselines often use a different
  // measure (e.g. "20 รายการค้าง" from action_plan_items) than the endline
  // ("X คนต่ำกว่า 50%" from unit tests) — showing "ลดลง 19" across definitions
  // would fabricate comparability. The same-definition pair lives inside the
  // endline label itself; interpretation belongs to the AI narrative.
  const sameDefinition = (before.label ?? "") === (after.label ?? "");
  if (sameDefinition && !Number.isNaN(beforeNum) && !Number.isNaN(afterNum)) {
    const diff = afterNum - beforeNum;
    const direction = diff === 0 ? "เท่าเดิม" : diff < 0 ? `ลดลง ${Math.abs(diff)}` : `เพิ่มขึ้น ${diff}`;
    diffRow = `
  <tr>
    <td style="font-weight:600;">ผลต่าง (เชิงตัวเลข)</td>
    <td colspan="2" style="text-align:center;">${escapeHtml(String(beforeNum))} → ${escapeHtml(String(afterNum))} (${escapeHtml(direction)})</td>
  </tr>`;
  }

  return `<table>
  <tr>
    <th style="width:24%;">รายการ</th>
    <th>ก่อนทำวิจัย (Baseline)</th>
    <th>หลังทำวิจัย (Endline)</th>
  </tr>
  <tr>
    <td style="font-weight:600;">ตัวชี้วัดที่วัด</td>
    <td>${escapeHtml(before.label)}</td>
    <td>${escapeHtml(after.label)}</td>
  </tr>
  <tr>
    <td style="font-weight:600;">ค่าที่วัดได้</td>
    <td style="text-align:center;font-weight:700;">${escapeHtml(String(before.value ?? "-"))}</td>
    <td style="text-align:center;font-weight:700;">${escapeHtml(String(after.value ?? "-"))}</td>
  </tr>
  <tr>
    <td style="font-weight:600;">วันที่เก็บข้อมูล</td>
    <td style="text-align:center;">${thaiDate(before.captured_at)}</td>
    <td style="text-align:center;">${thaiDate(after.captured_at)}</td>
  </tr>${diffRow}
</table>`;
}

function buildHTML(
  row: Record<string, unknown>,
  ai: AIReport,
  before: MetricData,
  after: MetricData,
  logs: LogsSummary,
  directorName: string
): string {
  const { term, year } = formatTerm(row.academic_term as string);

  const logsLine =
    logs.count > 0
      ? `ดำเนินการจัดการเรียนรู้และบันทึกหลังสอนที่เชื่อมโยงกับงานวิจัยนี้จำนวน <strong>${logs.count} คาบ</strong> ระหว่างวันที่ ${thaiDate(logs.first_date)} ถึง ${thaiDate(logs.last_date)}${logs.avg_mastery != null ? ` (ระดับ Mastery เฉลี่ยของคาบที่สอน ${logs.avg_mastery})` : ""}`
      : `ยังไม่มีบันทึกหลังสอนที่เชื่อมโยงกับงานวิจัยนี้ในระบบ`;

  const limitationsList = (ai.limitations ?? [])
    .map((l) => `<li>${escapeHtml(l)}</li>`)
    .join("");
  const recClassroom = (ai.recommendations?.classroom ?? [])
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");
  const recFuture = (ai.recommendations?.future_research ?? [])
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>รายงานวิจัยชั้นเรียน — ${escapeHtml(row.research_title as string)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Sarabun', sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #000;
      background: #fff;
      max-width: 210mm;
      margin: 0 auto;
      padding: 20px 40px;
    }
    h1 { text-align: center; font-size: 20px; margin-bottom: 4px; }
    .subtitle { text-align: center; font-size: 16px; margin-bottom: 2px; }
    .term-info { text-align: center; font-size: 14px; color: #444; margin-bottom: 20px; }
    h2 {
      font-size: 16px;
      font-weight: 700;
      border-bottom: 2px solid #000;
      padding-bottom: 3px;
      margin: 20px 0 10px;
    }
    .info-grid { display: grid; grid-template-columns: 160px 1fr; gap: 4px 12px; margin-bottom: 8px; }
    .label { font-weight: 600; }
    p { margin-bottom: 8px; }
    ul { margin: 4px 0 8px 24px; }
    li { margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    td, th {
      border: 1px solid #555;
      padding: 7px 10px;
      vertical-align: top;
      font-size: 14px;
    }
    th { background: #f0f0f0; font-weight: 700; text-align: center; }
    .baseline-box {
      background: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 10px 14px;
      margin-top: 10px;
      font-size: 14px;
    }
    .abstract-box {
      background: #fafafa;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 8px;
    }
    .sign-section { margin-top: 40px; }
    .sign-table td {
      border: 1px solid #555;
      height: 90px;
      text-align: center;
      vertical-align: bottom;
      padding: 8px;
      font-size: 14px;
      width: 50%;
    }
    .sign-label { font-weight: 700; display: block; margin-bottom: 40px; }
    .no-print {
      text-align: center;
      padding: 16px 0 24px;
      border-bottom: 1px dashed #ccc;
      margin-bottom: 24px;
    }
    .print-btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 10px 28px;
      font-size: 16px;
      font-family: 'Sarabun', sans-serif;
      border-radius: 6px;
      cursor: pointer;
    }
    .print-btn:hover { background: #1d4ed8; }
    @media print {
      .no-print { display: none; }
      body { padding: 10mm 15mm; font-size: 14px; }
      h2 { font-size: 15px; }
      td, th { font-size: 13px; }
    }
  </style>
</head>
<body>

<div class="no-print">
  <button class="print-btn" onclick="window.print()">🖨️ พิมพ์ / บันทึก PDF</button>
  <button class="print-btn" style="background:#16a34a;margin-left:12px;" onclick="downloadDoc()">💾 บันทึกเป็น .doc</button>
</div>
<script>
function downloadDoc() {
  var clone = document.documentElement.cloneNode(true);
  var noPrint = clone.querySelector('.no-print');
  if (noPrint) noPrint.remove();
  var blob = new Blob(['﻿', clone.outerHTML], { type: 'application/msword' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'รายงานวิจัยฉบับสมบูรณ์.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<h1>โรงเรียนวรนาถวิทยากำแพงเพชร</h1>
<p class="subtitle">รายงานการวิจัยในชั้นเรียน (ฉบับสมบูรณ์)</p>
<p class="term-info">ภาคเรียนที่ ${escapeHtml(term)} &nbsp;·&nbsp; ปีการศึกษา ${escapeHtml(year)}</p>

<div class="info-grid">
  <span class="label">ชื่อเรื่องวิจัย:</span>
  <span>${escapeHtml(row.research_title as string)}</span>
  <span class="label">ชั้น/ห้อง:</span>
  <span>${escapeHtml(row.grade_level as string)}/${escapeHtml(row.classroom as string)}</span>
  <span class="label">วิชา:</span>
  <span>${escapeHtml(row.subject as string)}</span>
  <span class="label">ครูผู้วิจัย:</span>
  <span>${escapeHtml(row.teacher_name as string)}</span>
</div>

<h2>บทคัดย่อ</h2>
<div class="abstract-box"><p>${escapeHtml(ai.abstract)}</p></div>

<h2>1. ความเป็นมาและความสำคัญของปัญหา</h2>
<p>${escapeHtml(row.detected_problem as string)}</p>
<p>${escapeHtml(row.evidence_summary as string)}</p>
<div class="baseline-box">
  <strong>ข้อมูลพื้นฐาน (Baseline):</strong>
  ${escapeHtml(before.label)}: <strong>${escapeHtml(String(before.value ?? "-"))}</strong>
  &nbsp;·&nbsp; บันทึกเมื่อ: ${thaiDate(before.captured_at)}
  ${before.source ? `&nbsp;·&nbsp; แหล่งข้อมูล: ${escapeHtml(before.source)}` : ""}
</div>

<h2>2. คำถามวิจัยและวัตถุประสงค์</h2>
<div class="info-grid">
  <span class="label">คำถามวิจัย:</span>
  <span>${escapeHtml(row.research_question as string)}</span>
  <span class="label">วัตถุประสงค์:</span>
  <span>${escapeHtml(row.objective as string)}</span>
</div>

<h2>3. กลุ่มเป้าหมาย</h2>
<p>${escapeHtml(row.target_group as string)}</p>

<h2>4. วิธีดำเนินการวิจัย</h2>
<p>${escapeHtml(row.intervention as string)}</p>
<p>${logsLine}</p>
<div class="info-grid">
  <span class="label">เครื่องมือ:</span>
  <span>${escapeHtml(row.tools as string)}</span>
  <span class="label">วิธีเก็บข้อมูล:</span>
  <span>${escapeHtml(row.data_collection_method as string)}</span>
  <span class="label">วิธีวิเคราะห์ข้อมูล:</span>
  <span>${escapeHtml(row.analysis_method as string)}</span>
</div>

<h2>5. ผลการวิจัย</h2>
${buildComparisonTable(before, after)}
<p style="margin-top:10px;">${escapeHtml(ai.results_narrative)}</p>

<h2>6. สรุปผลการวิจัย</h2>
<p>${escapeHtml(ai.summary)}</p>

<h2>7. อภิปรายผล</h2>
<p>${escapeHtml(ai.discussion)}</p>

<h2>8. ข้อจำกัดของการวิจัย</h2>
<ul>${limitationsList || "<li>-</li>"}</ul>

<h2>9. ข้อเสนอแนะ</h2>
<p style="font-weight:600;">การนำไปใช้ในชั้นเรียน</p>
<ul>${recClassroom || "<li>-</li>"}</ul>
<p style="font-weight:600;">การวิจัยครั้งต่อไป</p>
<ul>${recFuture || "<li>-</li>"}</ul>

<div class="sign-section">
  <table class="sign-table">
    <tr>
      <td>
        <span class="sign-label">ครูผู้วิจัย</span>
        ลงชื่อ .....................................................<br>
        (${escapeHtml(row.teacher_name as string)})<br>
        วันที่ ........../........../..........
      </td>
      <td>
        <span class="sign-label">ผู้บริหารโรงเรียน</span>
        ลงชื่อ .....................................................<br>
        (${escapeHtml(directorName)})<br>
        วันที่ ........../........../..........
        <br><br>
        ความเห็น .....................................................<br>
        .....................................................................
      </td>
    </tr>
  </table>
</div>

</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const { suggestion_id, director_name } = body as {
      suggestion_id: string;
      director_name?: string;
    };

    if (!suggestion_id) {
      return new Response(
        JSON.stringify({ error: "suggestion_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!req.headers.get("Authorization")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: row, error: dbErr } = await supabase
      .from("classroom_research_suggestions")
      .select("*")
      .eq("id", suggestion_id)
      .single();

    if (dbErr || !row) {
      return new Response(
        JSON.stringify({ error: dbErr?.message ?? "Not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!row.after_data) {
      return new Response(
        JSON.stringify({
          error:
            "ยังไม่มีข้อมูลหลังทำ (Endline) — กรุณาบันทึกข้อมูลหลังทำก่อน จึงจะสร้างรายงานฉบับสมบูรณ์ได้",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const before = (row.before_data ?? {}) as MetricData;
    const after = row.after_data as MetricData;

    // Aggregate linked teaching logs — real implementation evidence.
    const { data: logRows, error: logsErr } = await supabase
      .from("teaching_logs")
      .select("teaching_date, mastery_score")
      .eq("research_id", suggestion_id);
    if (logsErr) throw logsErr;

    const dates = (logRows ?? [])
      .map((l) => l.teaching_date as string)
      .filter(Boolean)
      .sort();
    const masteries = (logRows ?? [])
      .map((l) => Number(l.mastery_score))
      .filter((m) => !Number.isNaN(m));
    const logs: LogsSummary = {
      count: logRows?.length ?? 0,
      first_date: dates[0] ?? null,
      last_date: dates[dates.length - 1] ?? null,
      avg_mastery:
        masteries.length > 0
          ? Math.round((masteries.reduce((a, b) => a + b, 0) / masteries.length) * 100) / 100
          : null,
    };

    const rawKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const anthropicKey = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not configured in Supabase Secrets");

    const aiResult = await callClaude(anthropicKey, row, before, after, logs);

    const dirName = director_name ?? "ผู้อำนวยการโรงเรียนวรนาถวิทยากำแพงเพชร";
    const html = buildHTML(row, aiResult, before, after, logs, dirName);

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("generate-research-report error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
