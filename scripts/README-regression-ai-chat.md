# Regression: `ai-chat` (Python)

สคริปต์ยิง `POST /functions/v1/ai-chat` แบบเดียวกับแอป — ใช้ตรวจ Phase 4.2 citation, Fast Guard (นโยบาย vs ซ่อมเสริม), multi-turn, validation UI และ auth 401

## ความต้องการ

- Python 3.9+ (`from __future__ import annotations` รองรับ `list[dict]` ใน type hints)
- บัญชีทดสอบใน Supabase ที่ล็อกอินได้ด้วย email/password

## ตัวแปรสภาพแวดล้อม (ห้าม commit ค่าจริง)

| ตัวแปร | คำอธิบาย |
|--------|-----------|
| `SUPABASE_URL` | เช่น `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | anon public key จาก Dashboard |
| `ATLAS_TEST_EMAIL` | email บัญชีทดสอบ |
| `ATLAS_TEST_PASSWORD` | รหัสผ่านบัญชีทดสอบ |

## Antigravity scratch (path เดิม)

บนเครื่องพัฒนา ไฟล์ `~/.gemini/antigravity/scratch/regression_test_final.py` ถูกตั้งเป็น **symlink** ไปที่ `scripts/regression-ai-chat.py` ใน repo แล้ว — รันจาก path เดิมได้โดยไม่มีสำเนาโค้ดสองชุด

ถ้า clone repo บนเครื่องอื่น ให้รันจาก repo โดยตรง หรือสร้าง symlink เอง:

```bash
ln -sf /absolute/path/to/atlas-wise-spark/scripts/regression-ai-chat.py \
  ~/.gemini/antigravity/scratch/regression_test_final.py
```

## รัน

```bash
cd /path/to/atlas-wise-spark

export SUPABASE_URL="https://YOUR_REF.supabase.co"
export SUPABASE_ANON_KEY="eyJ..."
export ATLAS_TEST_EMAIL="you@example.com"
export ATLAS_TEST_PASSWORD="your-test-password"

python3 scripts/regression-ai-chat.py
```

Exit code: `0` = ทุกเคส PASS, `1` = มี FAIL, `2` = ขาด env

เคสล่าสุด: **REF subset** — (1) context ว่างแต่บังคับให้คำตอบมี `[REF-1]` → คาด `fallback` + `refs_missing_from_context` หรือ `gemini` โดยไม่อ้าง `[REF-1]` (ปลอดภัย) (2) context มีแค่ `[REF-1]` แต่บังคับ `[REF-99]` → คาด `fallback` + `REF-99 not present in context` (ขึ้นกับว่าโมเดลใส่ REF-99 ในคำตอบหรือไม่ — ถ้า FAIL บ่อย ลองรันซ้ำ)

หรือใช้ npm (ถ้ามี `python3` ใน PATH):

```bash
npm run test:regression-ai-chat
```

## เกณฑ์อ้างอิง

รายละเอียด Phase 4.2 และ citation fallback: [`docs/prompt-antigravity-ai-chat-regression.md`](../docs/prompt-antigravity-ai-chat-regression.md)

## ความปลอดภัย

- อย่าวางรหัสผ่านหรือ key ในแชท, screenshot, หรือ commit
- หมุนรหัสผ่านบัญชีทดสอบหากเคยรั่วไหล
