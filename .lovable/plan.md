

# แผนแก้ไข: AI ไม่ตอบแชท — VITE_SUPABASE_URL ไม่ได้ตั้งค่า

## สาเหตุ

จากภาพหน้าจอ มี toast error ที่มุมขวาล่าง: **"VITE_SUPABASE_URL ไม่ได้ตั้งค่าใน .env"**

ไฟล์ `src/lib/edgeFunctionFetch.ts` ใช้ `import.meta.env.VITE_SUPABASE_URL` เพื่อสร้าง URL สำหรับเรียก Edge Functions แต่ตอนนี้ไฟล์ `.env` ไม่มีอยู่ในโปรเจกต์ (ถูกลบไปแล้ว) และ Lovable Cloud อาจยังไม่ได้ inject ค่านี้ให้

เมื่อ `VITE_SUPABASE_URL` เป็น undefined → `getAiChatUrl()` return `""` → โค้ดแสดง toast error แทนการเรียก AI

## วิธีแก้ไข

แก้ไฟล์ `src/lib/edgeFunctionFetch.ts` ให้มี **fallback** ไปใช้ URL ที่ hardcode ไว้ (เหมือนกับใน `client.ts`) เมื่อ environment variable ไม่พร้อมใช้งาน:

```typescript
// src/lib/edgeFunctionFetch.ts

const FALLBACK_SUPABASE_URL = "https://iwlpqrulzkzpsiaddefq.supabase.co";

function getBaseUrl(): string {
  const v = import.meta.env.VITE_SUPABASE_URL;
  const sanitized = sanitizeAndValidateUrl(v ?? "");
  return sanitized || FALLBACK_SUPABASE_URL;
}
```

เช่นเดียวกับ `getEdgeFunctionHeaders()` ที่ต้องมี fallback สำหรับ key:

```typescript
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // anon key

export function getEdgeFunctionHeaders(): Record<string, string> {
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const raw = key != null && typeof key === "string" ? String(key) : FALLBACK_KEY;
  // ... rest of logic
}
```

วิธีนี้ทำให้ไม่ว่า `.env` จะมีหรือไม่มี แอปก็เรียก Edge Functions ได้ถูกต้องเสมอ — เหมือนกับที่ `client.ts` hardcode URL ไว้อยู่แล้ว

## ไฟล์ที่ต้องแก้

| ไฟล์ | สิ่งที่ทำ |
|------|-----------|
| `src/lib/edgeFunctionFetch.ts` | เพิ่ม fallback URL และ fallback key เมื่อ env var ไม่มีค่า |

## ผลลัพธ์ที่คาดหวัง

- Toast error "VITE_SUPABASE_URL ไม่ได้ตั้งค่าใน .env" จะหายไป
- AI Chat (พีท ร่างทอง) จะเรียก Edge Function ได้ถูกต้อง
- Lesson Plan และ Add-on Prompts ก็จะทำงานได้เช่นกัน

