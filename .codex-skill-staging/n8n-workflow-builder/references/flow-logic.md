# Flow Logic ใน n8n

Reference สำหรับเรื่อง: IF, Switch, Merge, Loop, Wait, Sub-workflow, Error handling

## 1. Splitting — แยก flow ตามเงื่อนไข

### IF — 2 ทาง (true / false)

ใช้เมื่อต้องแยก 2 ทางชัดเจน

**Configuration:**
- Conditions: เพิ่มได้หลายเงื่อนไข
- Combine: `AND` (ต้องผ่านทุกข้อ) หรือ `OR` (ผ่านข้อเดียวก็พอ)
- Type ของ comparison: string, number, date, boolean, array, object

**ตัวอย่าง expression ใน IF:**
```text
$json.amount > 1000
$json.status === 'paid'
$json.email.endsWith('@company.com')
```

### Switch — หลายทาง

ใช้เมื่อต้องแยกมากกว่า 2 ทางตามค่าของ field

**Mode 2 แบบ:**
- `Rules` — กำหนดเงื่อนไขแต่ละ output
- `Expression` — return output number จาก expression

**ตัวอย่าง use case:**
- แยกตาม country: `TH` → ทาง 0, `US` → ทาง 1, `EU` → ทาง 2, อื่นๆ → ทาง 3
- แยกตาม event type: `created`, `updated`, `deleted`

### Filter — กรอง items

ต่างจาก IF: items ที่ไม่ผ่านเงื่อนไขจะ **หายไป** ไม่มี false branch

ใช้เมื่อ items ที่ไม่ผ่านไม่จำเป็นต้องจัดการต่อ

## 2. Merging — รวม flow

### Merge node — modes ที่ใช้บ่อย

**Append** — เอา items จากทุก input มาต่อกัน
```
Input 1: [A, B]
Input 2: [C, D]
Output: [A, B, C, D]
```

**Combine (Multiplex)** — จับคู่ทุกตัวกับทุกตัว (cross product)
```
Input 1: [A, B]
Input 2: [C, D]
Output: [A+C, A+D, B+C, B+D]
```

**Combine (By Key)** — join ตาม key ที่ระบุ (เหมือน SQL JOIN)
```
Input 1: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }]
Input 2: [{ id: 1, qty: 10 }, { id: 2, qty: 20 }]
Match by: id
Output: [{ id: 1, name: 'A', qty: 10 }, { id: 2, name: 'B', qty: 20 }]
```

**Combine (By Position)** — จับคู่ตาม index
```
Input 1: [A, B, C]
Input 2: [X, Y, Z]
Output: [A+X, B+Y, C+Z]
```

**Choose Branch** — เลือก branch ใด branch หนึ่งตามเงื่อนไข

### ข้อควรระวังเรื่อง Merge

- **ต้องรู้จำนวน items ของแต่ละ branch** ก่อนเลือก mode
- ถ้า branch ใด branch หนึ่งไม่มี item → output อาจว่างเปล่า (ขึ้นกับ mode)
- **By Key** เป็น mode ที่ปลอดภัยสุดเมื่อข้อมูลเชื่อมกันด้วย ID
- **By Position** อันตราย — ถ้า branch หนึ่ง sort ไม่ตรง จะ merge ผิด

### Compare Datasets

ใช้หาความต่างระหว่าง 2 datasets (เหมือน SQL diff)

Output:
- `In A only`
- `In B only`
- `Same`
- `Different`

เหมาะกับ: หา record ที่ขาด, sync database, find duplicates

## 3. Looping — วน

### ทำไมต้อง loop เอง?

n8n iterate item-by-item อัตโนมัติอยู่แล้ว แต่บางกรณีต้อง loop เอง:

- **Pagination** — วนเรียก API จนกว่าจะได้ next page ครบ
- **Rate limiting** — batch ทีละ N items แล้ว wait
- **Retry per item** — retry เฉพาะ item ที่ fail
- **Sequential processing** — บาง API ห้าม parallel call

### Loop Over Items node

แตก items เป็น batch ทีละ N ตัว

**Configuration:**
- Batch Size: เช่น 10 (process ทีละ 10 items)
- Reset: รีเซ็ตเมื่อ trigger ใหม่

**Pattern:**
```
Loop Over Items (batch: 10)
  → [process batch]
  → Wait (1 second)
  → loop กลับมา Loop Over Items อัตโนมัติ
```

### Manual loop ด้วย IF + connection ย้อนกลับ

สำหรับ pagination แบบ cursor-based:

```
HTTP Request (page 1)
  → IF (hasNextPage?)
     → True: HTTP Request (next page) → ย้อนกลับมา IF
     → False: ออกจาก loop
```

## 4. Waiting — หยุดแล้วทำต่อ

### Wait node

ใช้หยุด workflow ชั่วคราว

**Modes:**
- `Time Interval` — รอ N seconds/minutes/hours/days
- `Specified Time` — รอจนถึงเวลาที่กำหนด
- `Webhook Call` — รอจนกว่า webhook URL ของ Wait node จะถูกเรียก
- `Form Submitted` — รอจนผู้ใช้ submit form

### Use cases

**Email drip campaign:**
```
Send Email 1
  → Wait (3 days)
  → Send Email 2
  → Wait (7 days)
  → Send Email 3
```

**Approval workflow:**
```
Receive Request
  → Send Approval Email (with link)
  → Wait (Webhook Call mode)
  → Process Approval
```

**Rate limit protection:**
```
Loop Over Items (batch: 10)
  → HTTP Request to limited API
  → Wait (1 minute)
```

### ข้อควรระวัง

- Wait ระยะยาว (วัน/สัปดาห์) → workflow ต้อง active ตลอด
- Self-host ที่ใช้ queue mode → ต้องเก็บ execution state ใน Postgres ไม่ใช่ memory
- Wait ใช้ memory น้อย เพราะ n8n suspend execution ไม่ใช่ keep alive

## 5. Sub-workflows — modular workflow

### เมื่อไหร่ควรแยกเป็น sub-workflow

- Logic เดียวกันใช้หลาย workflow (DRY)
- Workflow ใหญ่จนอ่านยาก
- ต้องการ reusable building block (validate payload, send notification)
- Logic ที่ test/version แยกได้

### Nodes ที่ใช้

- `Execute Sub-workflow` — เรียก sub-workflow จาก parent
- `Execute Sub-workflow Trigger` — เป็น trigger ของ sub-workflow

### Pattern: Standard notification sub-workflow

```
Sub-workflow: "Notify Slack"
  Input: { channel, message, severity }
  - Validate input
  - Format message ตาม severity
  - Send to Slack
  - Return success/error
```

Parent workflow เรียก:
```
Execute Sub-workflow: "Notify Slack"
Input: { channel: "#alerts", message: "Order failed", severity: "high" }
```

### ข้อควรระวัง

- Sub-workflow มี execution ของตัวเอง (นับ quota แยก)
- Error ใน sub-workflow propagate กลับ parent ได้
- ต้องเลือกว่า sub-workflow จะ run ใน "Once for All Items" หรือ "Once for Each Item"

## 6. Error Handling

### 3 ระดับการจัดการ error

**ระดับ 1: Node-level**
ใน node settings มี option:
- `Continue On Fail` — ไม่หยุด workflow ถ้า node นี้ fail
- `Retry On Fail` — retry กี่ครั้ง, รอกี่วินาที
- `Always Output Data` — output dummy data ถ้า fail

ใช้เมื่อ: API call ที่อาจ fail ชั่วคราว (network glitch, rate limit)

**ระดับ 2: Workflow-level error handling**

ในแต่ละ node มี output แยก: success / error
- Success branch → ทำงานปกติ
- Error branch → จัดการ error เฉพาะ node นั้น

**ระดับ 3: Workflow Error Trigger**

สร้าง workflow แยกที่ใช้ `Error Trigger` เป็น trigger
- จะถูกเรียกเมื่อ workflow อื่น fail
- ใช้สำหรับ centralized error reporting

```
Error Trigger workflow:
  → Receive error context (workflow id, error message, node name)
  → Send to Slack/Email
  → Log to database
```

ใน workflow ทั่วไป ตั้งใน Settings → Error Workflow → เลือก error workflow ที่ต้องการให้ trigger

### Stop And Error

ใช้เมื่อต้องการ **fail แบบตั้งใจ** (business rule ไม่ผ่าน)

```
IF (data is invalid)
  → Stop And Error: "Customer email is required"
```

จะหยุด workflow และ log error message นั้น

### Best practices

- ใส่ retry/backoff สำหรับทุก external API call
- ทุก workflow production ควรมี Error Workflow
- เก็บ context ใน error message: workflow id, execution id, node name, payload id
- ออกแบบ **idempotency** สำหรับ webhook ที่อาจถูกเรียกซ้ำ
- handle empty input, duplicate events, malformed payload

## 7. Execution order ใน multi-branch workflow

**กฎ:**
- n8n run branch ทีละ branch (ไม่ parallel โดย default)
- Branch ที่อยู่ "บน" ใน canvas → run ก่อน
- Merge node รอให้ทุก input branch เสร็จก่อน

**ถ้าต้องการ parallel จริงๆ:**
- ใช้ Sub-workflow + `Execute Sub-workflow` ทั้ง 2 branch แล้ว Merge

**ข้อควรระวัง:**
- ถ้า branch A modify ข้อมูลที่ branch B อ่าน → อาจ race condition
- Workflow ใหญ่ที่มีหลาย branch → debug ยาก แนะนำใช้ Sticky Notes อธิบาย order
