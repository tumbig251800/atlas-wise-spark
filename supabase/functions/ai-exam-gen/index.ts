import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  try {
    const { gradeLevel, classroom, subject, unit, topic, context, numQuestions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: EXAM_SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          stream: true,
          temperature: 0,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "คำขอมากเกินไป กรุณารอสักครู่" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "เครดิต AI หมด" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 401 || response.status === 403) {
        return new Response(JSON.stringify({ error: "API Key ไม่ถูกต้องหรือหมดอายุ กรุณาตรวจสอบ LOVABLE_API_KEY ใน Supabase" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI exam gen error:", response.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error (${response.status}). ดู Supabase Logs สำหรับรายละเอียด` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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
