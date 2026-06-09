# Code Node, HTTP Request, Webhook ใน n8n

Reference สำหรับเรื่อง: Code node (JS/Python), HTTP Request, Webhook, REST API patterns

## 1. Code Node

### เมื่อไหร่ใช้ Code node

- Reshape object ซับซ้อน
- Group/sort/aggregate ที่ data node ทำไม่ได้
- สร้างหลาย output items จาก input เดียว
- Clean/normalize data ที่ต้อง logic หลายชั้น
- Pagination/custom retry
- Custom validation logic

### Mode 2 แบบ

- **Run Once for All Items** — รับ items ทั้งหมดเป็น array (เหมาะกับ aggregate/group)
- **Run Once for Each Item** — รัน 1 ครั้งต่อ 1 item (เหมาะกับ transform ทีละ item)

### JavaScript pattern: รักษาโครงสร้าง

**Run Once for All Items:**

```javascript
// items = array ของ {json, binary, pairedItem} ทั้งหมด
const result = [];

for (const item of items) {
  result.push({
    json: {
      ...item.json,
      email: item.json.email?.toLowerCase(),
      processed_at: new Date().toISOString(),
    },
    pairedItem: { item: items.indexOf(item) }
  });
}

return result;
```

**Run Once for Each Item:**

```javascript
// $input.item = item ปัจจุบัน
return {
  json: {
    ...$input.item.json,
    normalized: true,
  }
};
```

### Built-in helpers ใน Code node

```javascript
// ดึงข้อมูลจาก node อื่น
const customerData = $('Get Customer').first().json;
const allOrders = $('Get Orders').all();

// Workflow metadata
$workflow.id
$workflow.name
$execution.id

// HTTP request helper
const response = await $http.request({
  method: 'GET',
  url: 'https://api.example.com/data',
  headers: { 'Authorization': 'Bearer ...' }
});

// DateTime (Luxon)
const now = DateTime.now();
const nextWeek = $now.plus({ days: 7 });

// Crypto helpers
const hash = crypto.createHash('sha256').update('text').digest('hex');
```

### Python pattern (self-host เท่านั้น)

```python
# items เป็น list ของ dict
result = []

for item in items:
    result.append({
        "json": {
            **item["json"],
            "email": item["json"].get("email", "").lower(),
            "processed": True,
        }
    })

return result
```

**ข้อจำกัด Python ใน n8n:**
- self-host เท่านั้น (n8n Cloud ไม่รองรับ)
- ต้องเปิด task runners
- ไม่สามารถ install library เพิ่ม (ใช้ได้แค่ standard library + ที่ n8n include มาให้)

### ข้อผิดพลาดที่พบบ่อย

**1. ลืม `return`**
```javascript
items.map(item => item.json);  // ❌ ไม่ return
return items.map(item => ({ json: item.json }));  // ✅
```

**2. Return ผิด structure**
```javascript
return { result: 'ok' };  // ❌ ต้องเป็น array
return [{ json: { result: 'ok' } }];  // ✅
```

**3. ทำลาย binary โดยไม่ตั้งใจ**
```javascript
return items.map(item => ({ json: item.json }));  // ❌ binary หาย
return items.map(item => ({ json: item.json, binary: item.binary }));  // ✅
```

**4. async/await โดยไม่ใส่ async**
ใน Code node n8n ทำให้เป็น async function อัตโนมัติแล้ว ใช้ `await` ได้ทันที

### Memory management

- ถ้า items > 10,000 → ระวัง memory error
- ใช้ Loop Over Items แทนการ process ทั้งหมดใน Code node ครั้งเดียว
- อย่าโหลด binary ขนาดใหญ่เข้า memory ใน Code node ถ้าไม่จำเป็น

## 2. HTTP Request Node

ใช้เมื่อ:
- ไม่มี dedicated node สำหรับ service นั้น
- Dedicated node มี operation ไม่ครบ
- ต้อง custom header/body/query parameter

### Authentication options

ใน node มี option `Authentication`:
- `None`
- `Predefined Credential Type` — ใช้ credential ที่สร้างไว้ใน n8n
- `Generic Credential Type` — Basic, Bearer, Header, Query, OAuth1, OAuth2

**Best practice:**
- สร้าง credential ใน Settings → Credentials เสมอ
- อย่าใส่ token ใน Header/Query parameter ตรงๆ
- ถ้า service มี predefined credential ให้ใช้ก่อน (รองรับ refresh token อัตโนมัติ)

### Request configuration

**Body Content Type:**
- `JSON` — REST API ส่วนใหญ่
- `Form-Data Multipart` — upload file
- `Form Urlencoded` — form submission
- `Raw` — XML, plain text, custom format
- `Binary` — ส่ง binary จาก node ก่อนหน้า

**Sending body fields:**
- `Using Fields Below` — เลือกทีละ field (visual)
- `Using JSON` — paste JSON ทั้ง object เลย

ใช้ `Using JSON` เมื่อ body มี structure ซับซ้อนหรือ nested

### Pagination

ใน HTTP Request node มี option `Pagination`:

**Modes:**
- `Off`
- `Update a Parameter in Each Request` — update query param เช่น `?page=2`
- `Response Contains Next URL` — API ส่ง next URL กลับมาใน response
- `Receive Pagination Data` — custom logic

**Pattern: page-based pagination**
```
Pagination Mode: Update a Parameter in Each Request
Type: Query
Name: page
Value: {{ $pageCount + 1 }}
Pagination Complete When: response body contains empty array
```

**Pattern: cursor-based pagination**
```
Pagination Mode: Response Contains Next URL
Next URL Field: data.next_cursor (path ใน response)
Pagination Complete When: response field empty
```

### Error handling สำหรับ HTTP Request

ตั้งใน node settings:
- `Continue On Fail: true` — ไม่หยุด workflow ถ้า request fail
- `Retry On Fail: 3, Wait Between Tries: 2000ms` — retry 3 ครั้ง, รอ 2 วินาที

ใน response มี status code:
- `2xx` → success
- `4xx` → client error (token หมดอายุ, payload ผิด)
- `5xx` → server error (retry ได้)
- `429` → rate limit (ต้องรอแล้ว retry)

**Pattern: handle rate limit (429)**
```
HTTP Request (with Continue On Fail)
  → IF (statusCode === 429)
     → True: Wait (read Retry-After header) → Loop กลับ HTTP Request
     → False: ทำงานปกติ
```

### Response options

- `Response Format`: JSON / Text / File / Auto-detect
- `Include Response Headers`: เปิดเมื่อต้องอ่าน header (เช่น rate limit info)
- `Full Response`: เปิดเมื่อต้องการ status code + headers + body ทั้งหมด

## 3. Webhook Node

### พื้นฐาน

Webhook node สร้าง HTTP endpoint ให้ external service ยิงเข้ามา

**Test URL vs Production URL:**
- **Test URL** — ทำงานเฉพาะเมื่อกด "Execute Workflow" ใน editor
- **Production URL** — ทำงานเมื่อ workflow active

⚠️ **อย่าใช้ Test URL ใน production** เพราะจะหยุดทำงานทันทีที่ปิด editor

### Configuration

**HTTP Method:** GET / POST / PUT / PATCH / DELETE / HEAD

**Path:** ตั้งให้ unique และ readable เช่น `/webhook/stripe-payment` ไม่ใช่ `/abc123`

**Authentication:**
- `None` (อันตราย — ใช้แค่ public endpoint)
- `Basic Auth`
- `Header Auth` — เช่น `X-API-Key: ...`
- `JWT`

**Response Mode:**
- `Immediately` — ตอบกลับทันทีด้วย default response (202)
- `When Last Node Finishes` — ตอบกลับเมื่อ workflow รัน node สุดท้ายเสร็จ
- `Using 'Respond to Webhook' Node` — ควบคุม response เอง

### Respond to Webhook node

ใช้คู่กับ Webhook เมื่ออยากควบคุม response

**Configuration:**
- `Respond With`: JSON / Text / Binary / No Body / Redirect
- `Response Code`: 200, 201, 400, etc.
- `Response Headers`: custom header

**Pattern:**
```
Webhook (Response Mode: Using 'Respond to Webhook')
  → Validate input
  → IF (valid?)
     → True: Business logic → Respond to Webhook (200, { ok: true })
     → False: Respond to Webhook (400, { error: "..." })
```

### Signature verification

External service ส่วนใหญ่ส่ง signature เพื่อยืนยัน webhook จริง

**Pattern (Stripe-style):**
```
Webhook → Code node:
  const signature = $('Webhook').first().json.headers['stripe-signature'];
  const body = $('Webhook').first().json.body;
  const secret = $env.STRIPE_WEBHOOK_SECRET;
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  
  if (signature !== expected) {
    throw new Error('Invalid signature');
  }
  
  return [{ json: { verified: true, ...body } }];
```

### Idempotency

Webhook อาจถูกยิงซ้ำ (network retry, manual replay)

**Pattern:**
```
Webhook
  → Extract event_id
  → Check database: เคยประมวลผล event นี้ไหม?
  → IF (exists)
     → True: return 200 (already processed)
     → False: process + insert event_id
```

### Webhook URL ต้องถูกตั้งให้ตรง

**Self-host setup:**
- ต้องตั้ง env `WEBHOOK_URL` ให้ตรงกับ public URL
- ถ้าใช้ reverse proxy ต้อง forward header ครบ (X-Forwarded-For, X-Forwarded-Proto)

**Local development:**
- ใช้ n8n tunnel feature (`n8n start --tunnel`) สำหรับ test
- อย่าใช้ tunnel ใน production

## 4. Pattern: REST API → Internal System

```
1. Webhook (POST /webhook/order-created)
2. Code: validate payload schema
3. IF: valid?
   - False → Respond to Webhook (400)
4. Code: verify HMAC signature
5. IF: signature valid?
   - False → Respond to Webhook (401)
6. Code: check idempotency
7. IF: already processed?
   - True → Respond to Webhook (200, "already processed")
8. HTTP Request: call internal API to create order
9. IF: success?
   - False → Stop And Error
10. Insert event_id to database
11. Respond to Webhook (201, { orderId })
```

## 5. Pattern: API polling (no webhook available)

เมื่อ service ไม่มี webhook ต้อง poll เอา

```
1. Schedule Trigger (every 5 minutes)
2. Get last_check_timestamp from database
3. HTTP Request: GET /api/changes?since={{ last_check }}
4. IF: any new items?
   - False → exit
5. Loop Over Items
   - Process each item
   - Update last_check_timestamp
```

## 6. Common HTTP errors และวิธีแก้

| Error | สาเหตุ | วิธีแก้ |
|---|---|---|
| `401 Unauthorized` | Token หมดอายุ / ผิด | Re-auth OAuth credential |
| `403 Forbidden` | Scope ไม่พอ | เช็ค API permission |
| `404 Not Found` | URL ผิด หรือ resource ไม่มี | ตรวจ URL path |
| `429 Too Many Requests` | Rate limit | ใส่ Wait + retry |
| `500/502/503` | Server error | Retry with backoff |
| `ECONNRESET` | Network issue | Retry |
| Timeout | Response ช้า | เพิ่ม timeout ใน node settings |
