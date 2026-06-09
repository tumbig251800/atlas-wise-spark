# AI, Advanced AI, Self-host, Scaling ใน n8n

Reference สำหรับเรื่อง: AI Agent, LangChain, RAG, Memory, Tools, Vector DB, Evaluation + Self-host, Queue mode, Security

## Part 1: Advanced AI

## 1. องค์ประกอบของ AI Workflow

n8n รองรับ AI workflow ผ่าน LangChain cluster nodes

**Core components:**

- **Chat Trigger** — รับข้อความจาก user (chat widget, embed, API)
- **AI Agent** — node หลักที่ตัดสินใจและเรียก tool
- **Chat Model** — connect ไปยัง LLM provider (OpenAI, Anthropic, Gemini, etc.)
- **Memory** — เก็บ conversation history
- **Tool** — ฟังก์ชันที่ Agent เรียกใช้
- **Vector Store** — เก็บ embeddings สำหรับ RAG
- **Embeddings** — convert text → vector
- **Document Loader** — โหลดเอกสาร (PDF, web, file)
- **Text Splitter** — แตกเอกสารเป็น chunks
- **Output Parser** — บังคับ output ให้เป็น structured format
- **Guardrails** — กรอง input/output ที่ไม่ปลอดภัย

## 2. Chain vs Agent

**Chain** — ลำดับขั้นที่ deterministic
```
Input → Prompt Template → LLM → Output Parser → Output
```
ใช้เมื่อ: รู้ flow ชัดเจน เช่น summarize, classify, translate

**Agent** — AI เลือก tool/step เองตามโจทย์
```
Input → Agent (มี tools list) → 
  ตัดสินใจ: เรียก tool A, B, หรือตอบตรงๆ →
  ถ้าเรียก tool → ได้ผล → ตัดสินใจอีกครั้ง → 
  ทำซ้ำจนได้คำตอบ
```
ใช้เมื่อ: ปัญหาเปิด ต้องให้ AI เลือกขั้นตอนเอง

**กฎเลือก:**
- ปัญหา deterministic → Chain (เร็วกว่า, predictable, ถูกกว่า)
- ปัญหาเปิด/มีหลายเส้นทาง → Agent (ยืดหยุ่นกว่า, แพงกว่า)

## 3. Memory

**ประเภท Memory:**

- `Window Buffer Memory` — เก็บ N ข้อความล่าสุด
- `Conversation Summary Memory` — สรุป conversation เป็น summary
- `Vector Store Memory` — semantic search ใน chat history
- `Postgres Chat Memory` — เก็บใน Postgres (production-grade)
- `Redis Chat Memory` — เก็บใน Redis
- `Zep Memory` — Zep service

**กฎเลือก:**
- Chat สั้น (< 10 ข้อความ) → Window Buffer
- Chat ยาว → Summary หรือ Vector Store
- Production multi-user → Postgres/Redis (มี session id)

**Session ID:**
- ต้องตั้งให้ unique ต่อ user เช่น `user_id` หรือ `phone_number`
- ใน Chat Trigger จะ auto-generate ให้ แต่ production ควร override

## 4. Tools

**ประเภท Tools ที่ Agent ใช้ได้:**

- `Calculator` — คำนวณ math
- `SerpAPI/Web Search` — search internet
- `HTTP Request Tool` — เรียก API ใดๆ
- `Code Tool` — รัน JavaScript
- `Wikipedia Tool`
- `Vector Store Tool` — ค้นใน vector DB (RAG)
- `Workflow Tool` — เรียก n8n workflow อื่นเป็น tool
- `Custom Tool` — สร้างเอง

**Tool description สำคัญมาก:**
- Agent ตัดสินใจเลือก tool จาก description
- เขียนให้ชัด: "ใช้เมื่อ X, รับ Y, คืน Z"
- ตัวอย่าง: "Search products in the catalog. Input: product name or keyword. Returns: list of matching products with price and stock."

## 5. RAG Pattern

```
[Ingestion phase — รันก่อน ไม่ใช่ realtime]
1. Document Loader (PDF/web/file)
2. Text Splitter (chunk size 500-1000 chars, overlap 50-100)
3. Embeddings (text → vector)
4. Vector Store (insert)

[Query phase — realtime]
1. Chat Trigger
2. Embeddings (query → vector)
3. Vector Store (similarity search, top K)
4. Prompt Template (รวม context + question)
5. Chat Model
6. Output
```

**Vector stores ที่ใช้บ่อย:**
- Pinecone (cloud, scale ใหญ่)
- Supabase (Postgres + pgvector)
- Qdrant (self-host friendly)
- Weaviate
- Chroma
- In-Memory Vector Store (test only)

**Chunk size guidelines:**
- เอกสารทั่วไป: 500-1000 tokens
- เอกสาร technical: 1000-2000 tokens
- ตอบคำถามเฉพาะจุด: 200-500 tokens
- Overlap: 10-20% ของ chunk size

## 6. AI Agent Pattern เต็มรูป

```
Chat Trigger
  ↓
AI Agent
  ├── Chat Model (OpenAI/Anthropic/Gemini)
  ├── Memory (Postgres, session_id = user_id)
  ├── Tool 1: Vector Store Tool (RAG knowledge base)
  ├── Tool 2: HTTP Request Tool (call internal API)
  ├── Tool 3: Workflow Tool (sub-workflow สำหรับ task ซับซ้อน)
  └── System Message: "You are a customer support agent..."
  ↓
Output Parser (optional)
  ↓
Guardrails (optional)
  ↓
Respond to Chat
```

## 7. Evaluation

n8n มี Evaluation feature สำหรับวัดคุณภาพ AI output

**2 ระดับ:**

- **Light evaluations** — เปรียบเทียบ output ด้วย AI grader (subjective)
- **Metric-based evaluations** — ใช้ metric ตามมาตรฐาน (BLEU, ROUGE, exact match)

**Workflow:**
1. สร้าง dataset (input, expected output)
2. รัน workflow บน dataset
3. Compare output vs expected
4. ดู score และ regression

## 8. AI Workflow best practices

- เริ่มจาก Chain ก่อน ค่อย upgrade เป็น Agent
- เริ่มจาก in-memory vector store เพื่อ test ก่อน deploy production
- ใส่ Guardrails สำหรับ public-facing chatbot
- Track cost ผ่าน custom execution data
- ทดสอบกับ adversarial input (prompt injection, jailbreak)
- ตั้ง max iteration ของ Agent (กัน infinite loop)
- ใช้ structured output parser เมื่อต้อง parse คำตอบต่อ

---

## Part 2: Self-Host และ Scaling

## 9. เลือก hosting อย่างไร

| สถานการณ์ | แนะนำ |
|---|---|
| เริ่มเรียนรู้ | n8n Cloud หรือ Docker local |
| Production เล็ก (< 100 executions/วัน) | Docker Compose + PostgreSQL |
| Production กลาง (100-10,000/วัน) | Docker + Postgres + reverse proxy + monitoring |
| Production ใหญ่ (>10,000/วัน) | Queue mode (Main + Redis + Workers + Postgres) |
| Enterprise, ข้อมูลอ่อนไหว | Self-host + SSO + RBAC + audit logging |

## 10. Docker Setup พื้นฐาน

**Local dev:**
```bash
docker volume create n8n_data

docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE="Asia/Bangkok" \
  -e TZ="Asia/Bangkok" \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

**Production ต้องเพิ่ม:**
- PostgreSQL แทน SQLite
- Reverse proxy (Nginx/Traefik/Caddy)
- HTTPS certificate
- `WEBHOOK_URL` ที่ถูก
- `N8N_ENCRYPTION_KEY` ที่ตั้งเอง + backup

## 11. Environment Variables ที่สำคัญที่สุด

**Deployment:**
- `N8N_HOST` — public hostname
- `N8N_PORT` — port (default 5678)
- `N8N_PROTOCOL` — http/https
- `WEBHOOK_URL` — full URL สำหรับ webhook (สำคัญมาก)
- `N8N_EDITOR_BASE_URL` — URL ของ editor

**Timezone:**
- `TZ` — server timezone
- `GENERIC_TIMEZONE` — workflow timezone

**Database:**
- `DB_TYPE=postgresdb`
- `DB_POSTGRESDB_HOST`
- `DB_POSTGRESDB_PORT`
- `DB_POSTGRESDB_DATABASE`
- `DB_POSTGRESDB_USER`
- `DB_POSTGRESDB_PASSWORD`

**Security (สำคัญที่สุด):**
- `N8N_ENCRYPTION_KEY` — ใช้เข้ารหัส credentials **ห้ามทำหาย** ถ้าหายจะถอด credential ทั้งหมดไม่ได้
- `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true`

**Queue mode:**
- `EXECUTIONS_MODE=queue`
- `QUEUE_BULL_REDIS_HOST`
- `QUEUE_BULL_REDIS_PORT`
- `QUEUE_BULL_REDIS_PASSWORD`

## 12. Queue Mode (Scale)

ใช้เมื่อ executions เยอะหรือ workflow หนัก

**Architecture:**
```
[Load Balancer / Reverse Proxy]
     ↓
[Main Process(es)] ← รับ webhook, schedule, UI/API
     ↓
[Redis Queue]
     ↓
[Worker Process N] ← run workflow จริง
     ↓
[PostgreSQL] ← ทุก process ใช้ DB เดียวกัน
```

**กฎสำคัญ:**
- **ทุก main + worker ต้อง n8n version เดียวกัน**
- **ทุก main + worker ต้อง encryption key เดียวกัน**
- Binary data ควรเก็บใน external storage (S3) ไม่ใช่ filesystem
- ออกแบบ worker concurrency ตาม API rate limit ของ service ที่เรียก
- Multi-main ต้องมี sticky session หลัง load balancer

**Worker config:**
```bash
docker run -d n8nio/n8n worker
# พร้อม env เดียวกับ main
```

## 13. Security Hardening Checklist

**ระดับ Infrastructure:**
- ✅ HTTPS only
- ✅ Reverse proxy with proper headers
- ✅ `WEBHOOK_URL` ตรงกับ public URL
- ✅ Firewall จำกัด port ที่ public
- ✅ Database ไม่ public

**ระดับ Authentication:**
- ✅ SSO (SAML/OIDC) สำหรับองค์กร
- ✅ 2FA สำหรับ local account
- ✅ RBAC + Projects แยกทีม

**ระดับ Application:**
- ✅ ตั้ง `N8N_ENCRYPTION_KEY` เอง + backup นอกเครื่อง
- ✅ ปิด API ถ้าไม่ใช้ (`N8N_PUBLIC_API_DISABLED=true`)
- ✅ จำกัด community nodes ตาม policy
- ✅ Harden task runners
- ✅ SSRF protection
- ✅ Redact execution data ที่มี PII
- ✅ Set execution data retention
- ✅ Rotate keys/tokens เป็นระยะ

## 14. Monitoring & Observability

**ที่ควรมี:**
- Application logs (centralized)
- Execution failure alerts
- Health checks (`/healthz` endpoint)
- Database metrics
- Redis metrics (ถ้าใช้ queue)
- Worker metrics (CPU, memory, queue length)
- Error rate per workflow
- Execution duration p50/p95/p99

**Tools ที่ใช้ได้:**
- Prometheus + Grafana
- OpenTelemetry tracing (n8n รองรับ)
- ELK / Loki สำหรับ logs
- Sentry สำหรับ error tracking

## 15. Backup Strategy

**ต้อง backup:**
1. **PostgreSQL database** — ข้อมูล workflow, execution, credential (encrypted)
2. **`N8N_ENCRYPTION_KEY`** — เก็บแยกจาก DB ถ้าหายไม่สามารถถอด credential ได้
3. **`/home/node/.n8n` volume** — config และ data files

**Test restore เป็นระยะ** — backup ที่ test ไม่ได้ = ไม่มี backup

## 16. Updating n8n

**ขั้นตอน:**
1. อ่าน release notes (โดยเฉพาะ major version)
2. Backup database + volume
3. Pin version (อย่าใช้ `latest` tag)
4. Test ใน staging ก่อน
5. Update production
6. ตรวจ workflow สำคัญหลัง update
7. ตรวจ community nodes compatibility

**Docker Compose update:**
```bash
docker compose pull
docker compose down
docker compose up -d
```

## 17. Common Issues และวิธีแก้

**Webhook ไม่ทำงาน:**
- เช็ค `WEBHOOK_URL` ตรงกับ public URL ไหม
- workflow active หรือยัง?
- reverse proxy forward headers ครบไหม
- firewall เปิด port ที่ถูกไหม

**Schedule ไม่ตรงเวลา:**
- เช็ค `GENERIC_TIMEZONE` และ `TZ`
- server timezone ตรงไหม

**Credential ใช้ไม่ได้:**
- token expire?
- OAuth ต้อง re-auth?
- หลัง restore database — encryption key ต้องเป็นอันเดียวกัน

**Memory error:**
- ลด batch size
- ใช้ external storage สำหรับ binary
- เพิ่ม worker memory limit
- เปิด queue mode ถ้ายังไม่ได้เปิด

**Workflow ช้า:**
- ตรวจ API latency
- ลด payload ที่ส่งข้าม node
- ใช้ Aggregate/Summarize แทน Code node ถ้าเป็นไปได้
- เปิด queue mode + เพิ่ม worker
- Prune execution data เก่า
