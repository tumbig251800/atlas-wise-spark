# Phase 4: Negative & Edge Case Tests

รายการทดสอบกรณีผิดปกติ สำหรับตรวจสอบว่าแอปจัดการได้ถูกต้อง

## Test Cases

### 4.1 CSV Format ผิด
| ขั้นตอน | ผลที่คาดหวัง |
|---------|--------------|
| อัป CSV ที่ a1_score > total หรือ header ผิดรูปแบบ | Reject พร้อม error message ชัดเจน |
| อัป CSV ที่คอลัมน์ไม่ครบ | แสดง error บอกว่าคอลัมน์ใดขาด |

### 4.2 Auth ขาด
| ขั้นตอน | ผลที่คาดหวัง |
|---------|--------------|
| เรียก Edge Function (ai-chat, ai-lesson-plan) โดยไม่มี Authorization header | ได้ 401 ไม่ใช่ 500 |
| รัน: `curl -X POST [SUPABASE_URL]/functions/v1/ai-chat -H "Content-Type: application/json" -d '{"messages":[]}'` | HTTP 401 |

### 4.3 Duplicate Upload
| ขั้นตอน | ผลที่คาดหวัง |
|---------|--------------|
| อัป CSV เดิมซ้ำสองครั้ง (วัน/วิชา/ชั้น/ห้องเดียวกัน) | ไม่เกิด duplicate — upsert หรือ skip พร้อมแจ้งเตือน |

### 4.4 RLS — ครูลบ log ของครูคนอื่น
| ขั้นตอน | ผลที่คาดหวัง |
|---------|--------------|
| Login เป็นครู A → พยายามลบ log ของครู B (ถ้าทำได้ผ่าน API โดยตรง) | Deny — RLS ป้องกัน |

### 4.5 AI Timeout
| ขั้นตอน | ผลที่คาดหวัง |
|---------|--------------|
| ai-chat ใช้เวลา >10s หรือ hang | UI แสดง timeout / retry แทน hang ไปเรื่อยๆ |

---

## การรันทดสอบ

### Health Check (ก่อน User Testing)
```bash
node scripts/check-setup.mjs
```

### Auth Test (4.2)
```bash
# ทดสอบ ai-chat โดยไม่มี JWT
curl -X POST "$VITE_SUPABASE_URL/functions/v1/ai-chat" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"context":""}'
# คาดหวัง: 401
```

---

## บันทึกผล

| วันที่ | Test | ผล | หมายเหตุ |
|-------|------|-----|----------|
| | 4.1 | | |
| | 4.2 | | |
| | 4.3 | | |
| | 4.4 | | |
| | 4.5 | | |
