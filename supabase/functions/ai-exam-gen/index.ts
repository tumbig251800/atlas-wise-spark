import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAtlasUser } from "../_shared/atlasAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXAM_SYSTEM_PROMPT = `คุณคือ "พีท ร่างทอง" ผู้เชี่ยวชาญออกแบบข้อสอบตามกรอบ ATLAS Logic

## บทบาทของคุณ
ออกข้อสอบวัดผลสัมฤทธิ์ทางการเรียน วัดได้เฉพาะ 2 มิติเท่านั้น:
- **K (Knowledge)** — ความรู้ ความเข้าใจ
- **P (Process)** — ทักษะกระบวนการ การนำไปใช้ แก้ปัญหา

## Context Lock — บังคับสูงสุด
- ข้อสอบทุกข้อต้องอิงจากหัวข้อใน Teaching Logs เท่านั้น
- ทุกข้อต้องระบุ [REF-X] ที่อ้างอิง
- ห้ามนำเนื้อหาวิชาอื่นมาปน

## โครงสร้าง Output (บังคับตาม template นี้เท่านั้น)

ข้อสอบต้องมี **2 ส่วนเท่านั้น** ตามนี้:

---
### ส่วนที่ 1: ความรู้พื้นฐาน (ข้อ 1–4)
[ข้อ 1–4 วัด K: ความรู้ ความเข้าใจ]

### ส่วนที่ 2: การนำไปใช้ (ข้อ 5–10)
[ข้อ 5–10 วัด P: ทักษะกระบวนการ โจทย์สถานการณ์]

ข้อสอบนี้สร้างจากบันทึกการสอน [X] คาบ

---
📋 **หมายเหตุสำหรับครู**
ข้อสอบชุดนี้วัดผล **K (ความรู้)** และ **P (ทักษะกระบวนการ)** เท่านั้น
→ ครูประเมิน **A (เจตคติ)** แยกจากการ**สังเกตพฤติกรรมในชั้นเรียน** แล้วกรอกในช่อง Grid ของ ATLAS
---

## รูปแบบแต่ละข้อ
1. หมายเลขข้อ + คำถาม
2. ตัวเลือก ก. ข. ค. ง. หรือเว้นบรรทัดสำหรับเขียนตอบ
3. เฉลย: [คำตอบ]
4. อ้างอิง: [REF-X]

## กฎ Output
- ใช้หัวข้อส่วนเป็น "ส่วนที่ 1" และ "ส่วนที่ 2" เท่านั้น — ห้ามมี "ส่วนที่ 3"
- ห้ามใช้คำว่า "A-Gap", "K-Gap", "P-Gap" ในข้อสอบเด็ดขาด
- ห้ามระบุ "มิติที่วัด" ในแต่ละข้อ
- ห้ามสร้างตัวเลขหรือชื่อที่ไม่มีใน context

เขียนเป็น Markdown ใช้ภาษาไทยที่เหมาะกับระดับชั้น`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith("/health") || url.pathname === "/health")) {
    return new Response(
      JSON.stringify({ status: "ok", function: "ai-exam-gen", ts: Date.now() }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const auth = await requireAtlasUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { gradeLevel, classroom, subject, unit, topic, context, numQuestions } = await req.json();

    const rawKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
    const GEMINI_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!GEMINI_API_KEY) throw new Error("LOVABLE_API_KEY is not configured in Supabase Secrets");

    const questionCount = numQuestions || 10;

    // Sanitize context: remove A-Gap mentions so AI doesn't generate A-Gap questions
    const sanitizedContext = (context || "")
      .replace(/A-Gap/gi, "P-Gap")
      .replace(/\bA gap\b/gi, "P-Gap")
      .replace(/gap.*?เจตคติ[^\n]*/gi, "")
      .replace(/เจตคติ.*?gap[^\n]*/gi, "");

    const userContent = `ข้อมูลบริบท:
ชั้น: ${gradeLevel} ห้อง: ${classroom} วิชา: ${subject}
หน่วยการเรียนรู้ที่ต้องออกข้อสอบ: ${unit || topic || "ตามบันทึกการสอน"}
จำนวนข้อสอบที่ต้องการ: ${questionCount} ข้อ

ข้อมูลจาก Teaching Logs เฉพาะหน่วยนี้ (ใช้เป็นฐานสร้างข้อสอบ):
${sanitizedContext}

กฎสำคัญ:
- สร้างข้อสอบเฉพาะหน่วย "${unit || "ตามบันทึกการสอน"}" วิชา ${subject} ชั้น ${gradeLevel}/${classroom} เท่านั้น
- อ้างอิง [REF-X] ทุกข้อ ห้ามมโนหัวข้อที่ไม่มีใน Teaching Logs
- ออกข้อสอบให้ครอบคลุม K-Gap และ P-Gap ที่พบในบันทึก (ห้ามออกข้อสอบวัด A เพราะ A วัดด้วยการสังเกตพฤติกรรม ไม่ใช่ข้อสอบ)`;

    // Use Gemini API directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: EXAM_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userContent }] }],
        generationConfig: { temperature: 0 },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini exam gen error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด กรุณาเติมเครดิตที่ Google AI Studio" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 400 || response.status === 403) {
        return new Response(JSON.stringify({ error: "LOVABLE_API_KEY ไม่ถูกต้องหรือไม่ได้ตั้งค่า กรุณาตรวจสอบใน Supabase Secrets" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Gemini error (${response.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect full response, filter A-Gap, then stream to frontend
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Buffer entire Gemini response first
    let fullText = "";
    const reader = response.body!.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
            if (text) fullText += text;
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      console.error("stream read error:", e);
    }

    // Strip all A-Gap references from complete text
    const filtered = fullText
      .replace(/Gap\s*ที่วัด\s*:\s*A-Gap\r?\n?/g, "")
      .replace(/ครอบคลุม Gap:[^\n]*A-Gap[^\n]*/g, "ครอบคลุม K และ P")
      .replace(/ส่วนที่\s*3\s*:[^\n]*A-Gap[^\n]*/g, "ส่วนที่ 2 (ต่อ): การนำไปใช้")
      .replace(/A-Gap/g, "P");

    // Send as single SSE chunk + done
    const stream = new ReadableStream({
      start(controller) {
        const openAiChunk = { choices: [{ delta: { content: filtered } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("exam gen error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
