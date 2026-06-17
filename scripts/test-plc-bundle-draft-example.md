# Testing PLC Bundle Draft Edge Function

## Function Info
- **URL**: `https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/plc-bundle-draft`
- **Method**: POST
- **Auth**: Required (JWT token from authenticated user)

## Deploy Status
✅ Function deployed successfully

```bash
npx supabase functions deploy plc-bundle-draft --project-ref ebyelctqcdhjmqujeskx
```

## How to Get JWT Token

### Option 1: From Browser DevTools
1. Log in to your app at `https://your-app-url.com`
2. Open DevTools (F12)
3. Go to **Application** > **Local Storage** > `https://ebyelctqcdhjmqujeskx.supabase.co`
4. Find `sb-ebyelctqcdhjmqujeskx-auth-token`
5. Copy the `access_token` value

### Option 2: From Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/api)
2. Go to **Settings** > **API**
3. Copy the `anon` or `service_role` key

## Test with curl

### 1. Set your JWT token as environment variable:
```bash
export JWT_TOKEN="your-jwt-token-here"
```

### 2. Run the test:
```bash
curl -X POST "https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/plc-bundle-draft" \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "items": [
      {
        "id": 101,
        "teacher_id": "teacher-uuid-1",
        "teacher_name": "ครูสมชาย ใจดี",
        "subject": "คณิตศาสตร์",
        "grade_level": "ป.4",
        "classroom": "4/1",
        "issue_type": "MasteryDrop",
        "severity": "high",
        "detail": "คะแนนเฉลี่ยลดลง 1.2 คะแนน ในหน่วยการคูณ นักเรียนมีปัญหาในการท่องสูตรคูณ",
        "metric_label": "ผลต่างคะแนน",
        "metric_value": 1.2
      },
      {
        "id": 102,
        "teacher_id": "teacher-uuid-1",
        "teacher_name": "ครูสมชาย ใจดี",
        "subject": "คณิตศาสตร์",
        "grade_level": "ป.3",
        "classroom": "3/1",
        "issue_type": "UnitBlindSpot",
        "severity": "medium",
        "detail": "นักเรียนทำถูกเพียง 42% ในหน่วยการหาร ยังไม่เข้าใจแนวคิดการแบ่งส่วน",
        "metric_label": "เปอร์เซ็นต์ถูก",
        "metric_value": 42
      },
      {
        "id": 103,
        "teacher_id": "teacher-uuid-2",
        "teacher_name": "ครูสมหญิง รักการสอน",
        "subject": "คณิตศาสตร์",
        "grade_level": "ป.4",
        "classroom": "4/2",
        "issue_type": "MasteryDrop",
        "severity": "high",
        "detail": "คะแนนเฉลี่ยลดลง 0.8 คะแนน ในหน่วยการคูณ นักเรียนส่วนใหญ่สับสนในการคูณเลขสองหลัก",
        "metric_label": "ผลต่างคะแนน",
        "metric_value": 0.8
      }
    ],
    "subject": "คณิตศาสตร์",
    "gradeBand": "ป.3-4"
  }' | jq '.'
```

## Expected Response

### Success (200 OK):
```json
{
  "draft": {
    "topic": "พัฒนาทักษะการคูณและการหารในช่วงชั้นป.3-4",
    "problem_statement": "นักเรียนในวิชาคณิตศาสตร์ช่วงชั้นป.3-4 มีปัญหาด้านการคูณและการหาร โดยเฉพาะคะแนนเฉลี่ยในหน่วยการคูณลดลงอย่างมีนัยสำคัญ และนักเรียนทำแบบทดสอบหน่วยการหารได้เพียง 42%",
    "root_cause": "นักเรียนยังไม่มีพื้นฐานการท่องสูตรคูณที่แข็งแรง และไม่เข้าใจแนวคิดการแบ่งส่วนในการหาร ซึ่งเป็นทักษะพื้นฐานสำคัญในการแก้โจทย์คณิตศาสตร์",
    "approach": "จัด PLC เพื่อแลกเปลี่ยนเทคนิคการสอนที่เน้นการสร้างความเข้าใจแนวคิด พัฒนาเกมและกิจกรรมเสริมทักษะ และสร้างระบบติดตามผลการเรียนรู้ของนักเรียนอย่างต่อเนื่อง",
    "action_steps_per_teacher": [
      {
        "teacher_id": "teacher-uuid-1",
        "teacher_name": "ครูสมชาย ใจดี",
        "action_steps": "1. สร้างเกมท่องสูตรคูณที่น่าสนใจสำหรับนักเรียนป.4/1\n2. ใช้สื่อการสอนแบบ concrete-pictorial-abstract สำหรับการหารในป.3/1\n3. จัดกิจกรรมกลุ่มย่อยเพื่อฝึกทักษะการคูณและการหาร\n4. ติดตามผลคะแนนทุก 2 สัปดาห์"
      },
      {
        "teacher_id": "teacher-uuid-2",
        "teacher_name": "ครูสมหญิง รักการสอน",
        "action_steps": "1. จัดการสอนซ่อมเสริมสำหรับนักเรียนที่มีปัญหาในป.4/2\n2. พัฒนาแบบฝึกหัดเพิ่มเติมสำหรับการคูณเลขสองหลัก\n3. ประสานงานกับครูสมชายเพื่อแลกเปลี่ยนเทคนิคการสอน\n4. จัดทำ portfolio ติดตามความก้าวหน้าของนักเรียนแต่ละคน"
      }
    ]
  }
}
```

### Error (401 Unauthorized):
```json
{
  "error": "Unauthorized"
}
```

### Error (500 Internal Server Error):
```json
{
  "error": "AI returned invalid JSON"
}
```

## Testing in the App

The function is automatically called when you:
1. Log in as director
2. Go to Action Board
3. See the "คิว PLC ที่แนะนำ" section
4. Click "AI Draft + จัด PLC" on any queue card

## Troubleshooting

### If you get "Unauthorized"
- Make sure you're logged in to the app
- Check that your JWT token is valid and not expired
- JWT tokens typically expire after 1 hour

### If you get "AI returned invalid response"
- Check Supabase Function Logs in the dashboard
- Verify that LOVABLE_API_KEY is set correctly in Supabase Secrets
- Check if Gemini API quota is exceeded

### Check Function Logs
```bash
npx supabase functions logs plc-bundle-draft --project-ref ebyelctqcdhjmqujeskx
```

Or view in Dashboard:
https://supabase.com/dashboard/project/ebyelctqcdhjmqujeskx/functions/plc-bundle-draft/logs
