# Data Structure และ Expressions ใน n8n

Reference สำหรับเรื่อง: items, json, binary, paired items, expressions, data transformations

## 1. โครงสร้างข้อมูลพื้นฐาน

n8n ส่งข้อมูลระหว่าง nodes เป็น **array ของ items** โดยแต่ละ item มี:

- `json` (required) — object หลักที่เก็บข้อมูลโครงสร้าง
- `binary` (optional) — ข้อมูลไฟล์ เช่น image, PDF, attachment

```json
[
  {
    "json": {
      "id": 123,
      "email": "user@example.com",
      "status": "paid"
    },
    "binary": {
      "file": {
        "fileName": "invoice.pdf",
        "mimeType": "application/pdf"
      }
    }
  }
]
```

**กฎสำคัญ:**
- Node ส่วนใหญ่ iterate ทีละ item อัตโนมัติ
- ถ้า node ก่อนหน้าส่ง 5 items, node ถัดไปจะถูก execute 5 ครั้ง
- การ return จาก Code node ต้องเป็น array ของ `{ json: ... }` เสมอ

## 2. Item linking (paired items)

เมื่อ node แปลง/แยก/รวมข้อมูล n8n จะเก็บความสัมพันธ์ระหว่าง input item และ output item ไว้

**สำคัญเพราะ:**
- Downstream node สามารถ "ย้อนดู" ข้อมูล item ต้นทางได้ผ่าน `$('Node Name').item.json.field`
- ถ้า item linking หาย → จะอ้างข้อมูลผิดรายการ → bug ยากแก้

**เคสที่ item linking มักหาย:**
- Code node ที่สร้าง item ใหม่ที่ไม่เชื่อมกับ input
- Merge ผิดวิธี (append mode)
- Loop ที่ไม่ track index

**วิธีรักษา item linking ใน Code node:**

```javascript
return items.map((item, index) => {
  return {
    json: { ...item.json, processed: true },
    pairedItem: { item: index }  // อ้างกลับไป input item ที่ index นี้
  };
});
```

## 3. Expression syntax `{{ ... }}`

Expression ใช้เขียนค่าแบบ dynamic ใน node parameter

### 3.1 ดึงค่าจาก current item

```text
{{ $json.email }}
{{ $json.user.firstName }}
{{ $json["field with space"] }}
```

### 3.2 ดึงค่าจาก node อื่น

```text
{{ $('Webhook').item.json.body }}
{{ $('Get Customer').first().json.id }}
{{ $('Search').all()[0].json.results }}
```

**ความต่าง:**
- `.item` — paired item ปัจจุบัน
- `.first()` — item แรกของ run นั้น
- `.all()` — ทุก items ของ run นั้น (เป็น array)
- `.last()` — item สุดท้าย

### 3.3 String/Number/Date manipulation

```text
{{ $json.email.toLowerCase() }}
{{ $json.name.trim().split(' ')[0] }}
{{ $json.price * 1.07 }}
{{ Number($json.qty) + 1 }}
{{ DateTime.now().toISO() }}
{{ $now.plus({ days: 7 }).toISODate() }}
{{ DateTime.fromISO($json.created_at).toFormat('yyyy-MM-dd') }}
```

n8n ใช้ **Luxon** สำหรับ DateTime (ไม่ใช่ Moment.js)

### 3.4 Conditional ใน expression

```text
{{ $json.status === 'paid' ? 'success' : 'pending' }}
{{ $json.discount ?? 0 }}
{{ $json.items?.length || 0 }}
```

### 3.5 Workflow metadata

```text
{{ $workflow.id }}
{{ $workflow.name }}
{{ $execution.id }}
{{ $execution.mode }}     // manual หรือ trigger
{{ $nodeName }}
{{ $itemIndex }}
{{ $runIndex }}
```

### 3.6 Environment / custom variables

```text
{{ $vars.MY_CUSTOM_VAR }}
{{ $env.SOME_ENV_VAR }}      // self-host เท่านั้น
```

## 4. เมื่อไหร่ใช้ Expression vs Code node

**ใช้ Expression เมื่อ:**
- ดึงค่าจาก node ก่อนหน้า
- แปลง string/number/date เล็กน้อย
- ตั้ง parameter แบบ dynamic
- เงื่อนไข ternary 1-2 ชั้น

**ใช้ Code node เมื่อ:**
- Logic ยาวหลายขั้น
- Loop/aggregate ซับซ้อน
- ต้องเรียก library (เช่น JSON parse, regex หลายครั้ง)
- Transform object ใหญ่ หรือ reshape โครงสร้าง
- สร้างหลาย output items จาก input เดียว

## 5. Data transformation: ใช้ node ไหนดี

| ต้องการ | Node แนะนำ | ตัวอย่าง |
|---|---|---|
| เพิ่ม/แก้ field ทีละตัว | **Edit Fields (Set)** | rename, set default value |
| กรอง items | **Filter** | เก็บเฉพาะ `status = paid` |
| แตก array เป็นหลาย items | **Split Out** | line items ของ order |
| รวม items เป็น array เดียว | **Aggregate** | รวมรายการสินค้าทั้งหมดของ order |
| สรุปข้อมูล (sum, count, group) | **Summarize** | ยอดขายรวมต่อสินค้า |
| sort items | **Sort** | sort ตามวันที่ |
| จำกัดจำนวน | **Limit** | เอาแค่ 10 items แรก |
| ลบ duplicate | **Remove Duplicates** | dedupe ตาม email |
| เปลี่ยนชื่อ key | **Rename Keys** | `firstName` → `first_name` |
| เปรียบเทียบ 2 ชุดข้อมูล | **Compare Datasets** | หา item ที่หายไป |
| รวม branch | **Merge** | join customer + order |
| ให้ AI generate transform | **AI Transform** | "group by user and sum total" |

## 6. Edit Fields (Set) — ใช้บ่อยที่สุด

ใช้สำหรับ:
- Rename field: `email` → `userEmail`
- Set default: ถ้า field ว่าง ให้เป็น value นี้
- เพิ่ม field ใหม่จาก expression
- ลบ field ที่ไม่ต้องการ (toggle "Keep Only Set")

**Mode สำคัญ 2 แบบ:**
- `Manual Mapping` — เลือกทีละ field
- `JSON Output` — paste JSON ทั้ง object เลย

## 7. Filter vs IF

- **Filter** — กรองเฉพาะ items ที่ผ่านเงื่อนไข item อื่นถูกทิ้ง (ไม่ต่อไปไหน)
- **IF** — แยก 2 ทาง: true branch กับ false branch (ใช้ได้ทั้งคู่)

ใช้ Filter เมื่อ items ที่ไม่ผ่านเงื่อนไขไม่จำเป็นต้องจัดการ
ใช้ IF เมื่อ items ที่ไม่ผ่านเงื่อนไขก็มี logic ของตัวเอง

## 8. Split Out + Aggregate — pattern คู่

ใช้บ่อยมากกับข้อมูลที่มี nested array

```
Input: [{ orderId: 1, items: [a, b, c] }]
   ↓ Split Out (Field: items)
[
  { orderId: 1, items: a },
  { orderId: 1, items: b },
  { orderId: 1, items: c }
]
   ↓ ทำ logic ทีละ item (เช่น เช็ค stock)
   ↓ Aggregate (Field: items)
[{ orderId: 1, items: [a_checked, b_checked, c_checked] }]
```

## 9. Binary data

**กฎ:**
- อย่าโหลด binary ขนาดใหญ่เข้า memory โดยไม่จำเป็น
- ถ้า self-host แนะนำใช้ external storage (S3) สำหรับ binary
- ไฟล์ binary มี property: `fileName`, `mimeType`, `data` (base64), `fileSize`

**Node ที่จัดการ binary:**
- `Read/Write Files from Disk` — อ่าน/เขียนไฟล์
- `Extract From File` — ดึง text จาก PDF/Excel/CSV
- `Convert to File` — แปลง json → file
- `HTTP Request` — ดาวน์โหลด/อัปโหลดไฟล์

## 10. Custom Execution Data

ใช้ tag execution ด้วย business identifier เพื่อค้นหาง่าย

```text
ใน node ใดก็ได้ ตั้ง: $execution.customData.set('orderId', $json.orderId)
จากนั้นใน Executions list สามารถ filter ด้วย orderId ได้
```

เหมาะกับ:
- E-commerce order tracking
- Customer support ticket
- Batch job tracking
