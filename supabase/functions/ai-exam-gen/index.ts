import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireAtlasUser } from "../_shared/atlasAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXAM_SYSTEM_PROMPT = `คุณคือ "พีท ร่างทอง" ผู้เชี่ยวชาญออกแบบข้อสอบตามกรอบ ATLAS Logic

## Context Lock — บังคับสูงสุด
- ข้อสอบทุกข้อต้องอิงจากหัวข้อที่ครูสอนจริงใน Teaching Logs เท่านั้น
- ห้ามสร้างโจทย์จากหัวข้อที่ไม่มีใน [REF-X] โดยเด็ดขาด
- ทุกข้อต้องระบุ [REF-X] ที่อ้างอิง เช่น "(อ้างอิง [REF-3] หัวข้อเศษส่วน)"
- ห้ามนำเนื้อหาวิชาอื่นมาปนในข้อสอบ

## โครงสร้างข้อสอบ ATLAS (บังคับ)
สร้างข้อสอบ 10 ข้อ แบ่งตาม Bloom's Taxonomy:
- ข้อ 1-3: Remember/Understand — ทดสอบความรู้พื้นฐาน (K-Gap)
- ข้อ 4-7: Apply — ทดสอบการนำไปใช้ (P-Gap)
- ข้อ 8-10: Analyze/Evaluate — ทดสอบการคิดวิเคราะห์ (A-Gap)

## รูปแบบข้อสอบ
สำหรับแต่ละข้อให้ระบุ:
1. หมายเลขข้อ + คำถาม
2. ตัวเลือก ก. ข. ค. ง. (ถ้าเป็น MCQ) หรือเว้นบรรทัดสำหรับเขียนตอบ
3. เฉลย: [ระบุคำตอบที่ถูก]
4. Gap ที่วัด: [K-Gap / P-Gap / A-Gap]
5. อ้างอิง: [REF-X ที่เกี่ยวข้อง]

## กฎ Deterministic (บังคับ)
- ห้ามสร้างตัวเลข ชื่อ หรือข้อมูลที่ไม่มีใน context
- ถ้า context มี remedial IDs ให้ออกแบบข้อสอบให้ครอบคลุม skill ที่เด็กกลุ่มนั้นยังขาด
- ระบุท้ายข้อสอบว่า "ข้อสอบนี้สร้างจากบันทึกการสอน [X] คาบ ครอบคลุม Gap: [ระบุ Gap ที่พบ]"

## Format Output
เขียนเป็น Markdown มีหัวข้อชัดเจน ใช้ภาษาไทยที่เหมาะกับระดับชั้น`;

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

    const rawKey = Deno.env.get("GEMINI_API_KEY") ?? "";
    const GEMINI_API_KEY = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const questionCount = numQuestions || 10;

    const userContent = `ข้อมูลบริบท:
ชั้น: ${gradeLevel} ห้อง: ${classroom} วิชา: ${subject}
หน่วยการเรียนรู้ที่ต้องออกข้อสอบ: ${unit || topic || "ตามบันทึกการสอน"}
จำนวนข้อสอบที่ต้องการ: ${questionCount} ข้อ

ข้อมูลจาก Teaching Logs เฉพาะหน่วยนี้ (ใช้เป็นฐานสร้างข้อสอบ):
${context}

กฎสำคัญ:
- สร้างข้อสอบเฉพาะหน่วย "${unit || "ตามบันทึกการสอน"}" วิชา ${subject} ชั้น ${gradeLevel}/${classroom} เท่านั้น
- อ้างอิง [REF-X] ทุกข้อ ห้ามมโนหัวข้อที่ไม่มีใน Teaching Logs
- ออกข้อสอบให้ครอบคลุม Gap ที่พบในบันทึก (K-Gap, P-Gap, A-Gap)`;

    // Use Gemini API directly
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`;

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
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY ไม่ถูกต้อง กรุณาตรวจสอบ" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `Gemini error (${response.status})` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Gemini SSE → OpenAI-compatible SSE for frontend
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              break;
            }
            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr || jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
                if (text) {
                  const openAiChunk = {
                    choices: [{ delta: { content: text } }],
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(openAiChunk)}\n\n`));
                }
              } catch {
                // skip malformed chunks
              }
            }
          }
        } catch (e) {
          console.error("stream error:", e);
        } finally {
          controller.close();
        }
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
