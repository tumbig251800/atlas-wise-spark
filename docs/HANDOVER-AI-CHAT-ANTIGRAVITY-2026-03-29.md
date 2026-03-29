# Handover — AI Chat, Antigravity regression & Fast Guard (2026-03-29)

เอกสารนี้ให้ Antigravity / ผู้รับงานใช้เป็นบริบทสถานะล่าสุดของ `ai-chat` และชุดทดสอบ regression

## สรุปการดำเนินการ

- **Fast Guard:** ปรับ `asksRemedialMetrics` ใน `supabase/functions/ai-chat/index.ts` — คำว่า **ร้อยละ / เปอร์เซ็นต์ / กี่ %** ต้องคู่กับบริบท **ซ่อม / remedial / x/y** จึงจะถือว่าถาม metrics ซ่อมเสริม ลด false positive กับคำถามนโยบาย (เช่น เกณฑ์ GREEN, Mastery กี่ %)
- **Edge:** deploy ฟังก์ชัน `ai-chat` บนโปรเจกต์ Supabase (ref ใน repo / Dashboard)
- **GitHub:** เปลี่ยนแปลงหลักอยู่บน `main` — ดู commit ล่าสุดที่ข้อความ commit เกี่ยวกับ `ai-chat` fast-guard และ regression script

## สถานะการทดสอบ (Antigravity Regression Test Final)

รอบที่รันสำเร็จก่อนหน้า **ผ่านครบทุกหมวด:** Health, Phase 4.2 Citation, FG Policy, FG Remedial, Multi-turn, Validation UI (ไม่มี `(debug:` ในเนื้อหาผู้ใช้), Auth 401 เมื่อไม่ส่ง JWT

## สคริปต์ regression ใน repo

| รายการ | ตำแหน่ง |
|--------|---------|
| สคริปต์ | `scripts/regression-ai-chat.py` |
| คู่มือ + env | `scripts/README-regression-ai-chat.md` |
| npm | `npm run test:regression-ai-chat` |
| เกณฑ์ Phase 4.2 | `docs/prompt-antigravity-ai-chat-regression.md` |

ตัวแปรสภาพแวดล้อม: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ATLAS_TEST_EMAIL`, `ATLAS_TEST_PASSWORD` — **ห้าม** commit ค่าจริง

Exit code: `0` = ทุกเคส PASS, `1` = มี FAIL, `2` = ขาด env

## เครื่องพัฒนา (local)

บนเครื่องที่ตั้งค่าแล้ว อาจมี symlink:

`~/.gemini/antigravity/scratch/regression_test_final.py` → `scripts/regression-ai-chat.py`

ไฟล์ symlink **ไม่** อยู่ใน git — เครื่องอื่นให้รันจาก repo หรือสร้าง symlink ตาม README

## อ้างอิงโค้ดหลัก

- Fast Guard: `supabase/functions/ai-chat/index.ts` (`asksRemedialMetrics`, `hasTotalStudents`)
- Validator: `supabase/functions/_shared/aiChatValidator.ts`
- Prompt / citation: `supabase/functions/_shared/aiChatPrompts.ts`

## สรุปสถานะแอป

ชุด **AI Chat logic & safety** ตาม regression ล่าสุดถือว่าพร้อมใช้งาน production ฝั่ง edge; หน้าเว็บยังใช้ endpoint เดิมพร้อม JWT ตาม `src/lib/edgeFunctionFetch.ts`
