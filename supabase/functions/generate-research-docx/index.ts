import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

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

interface WeeklyPlan {
  week: string;
  activity: string;
  prepare: string;
  measure: string;
}

interface IVData {
  name: string;
  what: string;
  how: string;
  frequency: string;
  duration: string;
}

interface DVDimension {
  dimension: string;
  atlas_source: string;
  passing_criteria: string;
}

interface AIResult {
  weekly_plan: WeeklyPlan[];
  iv: IVData;
  dv: DVDimension[];
}

async function callClaude(
  apiKey: string,
  intervention: string,
  tools: string,
  data_collection_method: string,
  success_indicator: string,
  subject: string,
  grade_level: string,
  classroom: string
): Promise<AIResult> {
  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `คุณเป็นผู้ช่วยเขียนเค้าโครงวิจัยชั้นเรียนภาษาไทยสำหรับครูประถมศึกษา
ตอบเป็น JSON เท่านั้น ห้ามมีข้อความนอก JSON ห้ามมี markdown code block
ห้ามใช้ภาษา causation เช่น "ทำให้" "ส่งผลให้" — ใช้ "สัมพันธ์กับ" "สะท้อนให้เห็น" แทน`;

  const userPrompt = `จากข้อมูลวิจัยชั้นเรียนต่อไปนี้ สร้าง JSON ตามโครงสร้างที่กำหนด

วิชา: ${subject} ชั้น ป.${grade_level}/${classroom}
การจัดการเรียนรู้/นวัตกรรม: ${intervention}
เครื่องมือ: ${tools}
วิธีเก็บข้อมูล: ${data_collection_method}
ตัวชี้วัดความสำเร็จ: ${success_indicator}

โครงสร้าง JSON ที่ต้องการ:
{
  "weekly_plan": [
    { "week": "1-2", "activity": "กิจกรรมในชั้นเรียนสัปดาห์ที่ 1-2", "prepare": "สิ่งที่ต้องเตรียม", "measure": "วิธีวัดผล" },
    { "week": "3-4", "activity": "...", "prepare": "...", "measure": "..." },
    { "week": "5-6", "activity": "...", "prepare": "...", "measure": "..." }
  ],
  "iv": {
    "name": "ชื่อนวัตกรรม/วิธีการ",
    "what": "ทำอะไร (อธิบายกิจกรรมหลัก)",
    "how": "อย่างไร (ขั้นตอน/รูปแบบ)",
    "frequency": "ความถี่ เช่น สัปดาห์ละ 2 ครั้ง",
    "duration": "ระยะเวลา เช่น 6 สัปดาห์"
  },
  "dv": [
    { "dimension": "ชื่อมิติ", "atlas_source": "แหล่งวัดใน ATLAS เช่น mastery_level / PASS rate", "passing_criteria": "เกณฑ์ผ่าน" }
  ]
}

หมายเหตุ: dv ให้แตกจาก success_indicator โดย parse ข้อความที่คั่นด้วย ";" หรือ "|" หรือเลขข้อ
ถ้าไม่มีการคั่นชัดเจนให้สรุปเป็น 1-3 มิติตามเนื้อหา`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    temperature: 0,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "{}";
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned) as AIResult;
}

function buildHTML(row: Record<string, unknown>, ai: AIResult, directorName: string): string {
  const { term, year } = formatTerm(row.academic_term as string);

  const weeklyRows = (ai.weekly_plan ?? [])
    .map(
      (w) => `
    <tr>
      <td style="text-align:center;font-weight:600;">สัปดาห์ที่ ${escapeHtml(w.week)}</td>
      <td>${escapeHtml(w.activity)}</td>
      <td>${escapeHtml(w.prepare)}</td>
      <td>${escapeHtml(w.measure)}</td>
    </tr>`
    )
    .join("");

  const dvRows = (ai.dv ?? [])
    .map(
      (d) => `
    <tr>
      <td>${escapeHtml(d.dimension)}</td>
      <td>${escapeHtml(d.atlas_source)}</td>
      <td>${escapeHtml(d.passing_criteria)}</td>
    </tr>`
    )
    .join("");

  const beforeDataHtml = row.before_data
    ? (() => {
        const bd = row.before_data as Record<string, unknown>;
        const capturedDate = bd.captured_at
          ? new Date(bd.captured_at as string).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "-";
        return `<div class="baseline-box">
          <strong>ข้อมูลพื้นฐาน (Baseline):</strong>
          ${escapeHtml(bd.label as string)}: <strong>${escapeHtml(String(bd.value))}</strong>
          &nbsp;·&nbsp; บันทึกเมื่อ: ${capturedDate}
          ${bd.source ? `&nbsp;·&nbsp; แหล่งข้อมูล: ${escapeHtml(bd.source as string)}` : ""}
        </div>`;
      })()
    : "";

  const iv = ai.iv ?? { name: "-", what: "-", how: "-", frequency: "-", duration: "-" };

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>เค้าโครงวิจัยชั้นเรียน — ${escapeHtml(row.research_title as string)}</title>
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
  a.download = 'เค้าโครงวิจัย.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>

<h1>โรงเรียนวรนาถวิทยากำแพงเพชร</h1>
<p class="subtitle">เค้าโครงการวิจัยในชั้นเรียน</p>
<p class="term-info">ภาคเรียนที่ ${escapeHtml(term)} &nbsp;·&nbsp; ปีการศึกษา ${escapeHtml(year)}</p>

<h2>ส่วนที่ 1 ข้อมูลทั่วไป</h2>
<div class="info-grid">
  <span class="label">ชื่อเรื่องวิจัย:</span>
  <span>${escapeHtml(row.research_title as string)}</span>
  <span class="label">ชั้น/ห้อง:</span>
  <span>ป.${escapeHtml(row.grade_level as string)}/${escapeHtml(row.classroom as string)}</span>
  <span class="label">วิชา:</span>
  <span>${escapeHtml(row.subject as string)}</span>
  <span class="label">ครูผู้วิจัย:</span>
  <span>${escapeHtml(row.teacher_name as string)}</span>
  <span class="label">ปีการศึกษา/ภาคเรียน:</span>
  <span>${escapeHtml(year)} / ${escapeHtml(term)}</span>
</div>

<h2>ส่วนที่ 2 ความเป็นมาและความสำคัญของปัญหา</h2>
<p>${escapeHtml(row.detected_problem as string)}</p>
<p>${escapeHtml(row.evidence_summary as string)}</p>
${beforeDataHtml}

<h2>ส่วนที่ 3 คำถามวิจัยและวัตถุประสงค์</h2>
<div class="info-grid">
  <span class="label">คำถามวิจัย:</span>
  <span>${escapeHtml(row.research_question as string)}</span>
  <span class="label">วัตถุประสงค์:</span>
  <span>${escapeHtml(row.objective as string)}</span>
</div>

<h2>ส่วนที่ 4 กลุ่มเป้าหมาย</h2>
<p>${escapeHtml(row.target_group as string)}</p>

<h2>ส่วนที่ 5 ตัวแปรการวิจัย</h2>
<p style="font-weight:600;margin-bottom:6px;">ตัวแปรต้น (Independent Variable)</p>
<table>
  <tr><th style="width:200px;">รายการ</th><th>รายละเอียด</th></tr>
  <tr><td><strong>ชื่อนวัตกรรม/วิธีการ</strong></td><td>${escapeHtml(iv.name)}</td></tr>
  <tr><td><strong>ทำอะไร</strong></td><td>${escapeHtml(iv.what)}</td></tr>
  <tr><td><strong>อย่างไร</strong></td><td>${escapeHtml(iv.how)}</td></tr>
  <tr><td><strong>ความถี่</strong></td><td>${escapeHtml(iv.frequency)}</td></tr>
  <tr><td><strong>ระยะเวลา</strong></td><td>${escapeHtml(iv.duration)}</td></tr>
</table>

<p style="font-weight:600;margin:14px 0 6px;">ตัวแปรตาม (Dependent Variable)</p>
<table>
  <tr>
    <th>มิติที่วัด</th>
    <th>แหล่งวัดใน ATLAS</th>
    <th>เกณฑ์ผ่าน</th>
  </tr>
  ${dvRows || '<tr><td colspan="3" style="text-align:center;">-</td></tr>'}
</table>

<h2>ส่วนที่ 6 วิธีดำเนินการวิจัย</h2>
<p>${escapeHtml(row.intervention as string)}</p>

<h2>ส่วนที่ 7 แผนปฏิบัติการรายสัปดาห์</h2>
<table>
  <tr>
    <th style="width:14%;">สัปดาห์</th>
    <th style="width:34%;">กิจกรรมในชั้นเรียน</th>
    <th style="width:26%;">สิ่งที่ต้องเตรียม</th>
    <th style="width:26%;">วิธีวัดผล</th>
  </tr>
  ${weeklyRows || '<tr><td colspan="4" style="text-align:center;">-</td></tr>'}
</table>

<h2>ส่วนที่ 8 เครื่องมือและวิธีเก็บข้อมูล</h2>
<div class="info-grid">
  <span class="label">เครื่องมือ:</span>
  <span>${escapeHtml(row.tools as string)}</span>
  <span class="label">วิธีเก็บข้อมูล:</span>
  <span>${escapeHtml(row.data_collection_method as string)}</span>
</div>

<h2>ส่วนที่ 9 วิธีวิเคราะห์ข้อมูล</h2>
<p>${escapeHtml(row.analysis_method as string)}</p>

<h2>ส่วนที่ 10 ตัวชี้วัดความสำเร็จ</h2>
<p>${escapeHtml(row.success_indicator as string)}</p>

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

    const rawKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    const anthropicKey = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!anthropicKey) throw new Error("ANTHROPIC_API_KEY is not configured in Supabase Secrets");

    const aiResult = await callClaude(
      anthropicKey,
      row.intervention ?? "",
      row.tools ?? "",
      row.data_collection_method ?? "",
      row.success_indicator ?? "",
      row.subject ?? "",
      row.grade_level ?? "",
      row.classroom ?? ""
    );

    const dirName = director_name ?? "ผู้อำนวยการโรงเรียนวรนาถวิทยากำแพงเพชร";
    const html = buildHTML(row, aiResult, dirName);

    return new Response(html, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("generate-research-docx error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
