

# แผนแก้ไข: Invalid Model Error — `gemini-2.0-flash` ไม่รองรับแล้ว

## สาเหตุ

จาก logs ของ backend functions แสดง error ชัดเจน:

```
invalid model: gemini-2.0-flash, allowed models: [openai/gpt-5-mini openai/gpt-5 openai/gpt-5-nano openai/gpt-5.2 google/gemini-2.5-pro google/gemini-2.5-flash google/gemini-2.5-flash-lite google/gemini-2.5-flash-image google/gemini-3-pro-preview google/gemini-3-flash-preview google/gemini-3-pro-image-preview]
```

โมเดล `gemini-2.0-flash` **ถูกยกเลิกแล้ว** จาก Lovable AI Gateway ต้องเปลี่ยนเป็นโมเดลที่รองรับ เช่น `google/gemini-2.5-flash` (เร็ว, ประหยัด, เหมาะกับงานสรุปและแชท)

## ไฟล์ที่ต้องแก้ (4 ไฟล์)

| ไฟล์ | บรรทัด | เปลี่ยนจาก | เปลี่ยนเป็น |
|------|--------|------------|-------------|
| `supabase/functions/ai-chat/index.ts` | 160 | `gemini-2.0-flash` | `google/gemini-2.5-flash` |
| `supabase/functions/ai-summary/index.ts` | 49 | `gemini-2.0-flash` | `google/gemini-2.5-flash` |
| `supabase/functions/ai-lesson-plan/index.ts` | 198 | `gemini-2.0-flash` | `google/gemini-2.5-flash` |
| `supabase/functions/atlas-diagnostic/index.ts` | 30 | `gemini-2.0-flash` | `google/gemini-2.5-flash` |

## ผลลัพธ์ที่คาดหวัง

- Error 400 "invalid model" จะหายไป
- AI Chat (พีท), AI Summary, Lesson Plan, และ Diagnostic จะกลับมาทำงานได้ทั้งหมด
- Backend functions จะ deploy อัตโนมัติหลังแก้โค้ด

