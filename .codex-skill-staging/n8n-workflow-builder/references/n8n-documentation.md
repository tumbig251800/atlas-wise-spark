# n8n Documentation ฉบับภาษาไทย

อัปเดตจากการสำรวจเอกสารทางการ n8n: 2026-05-11  
แหล่งอ้างอิงหลัก: https://docs.n8n.io/

> เอกสารนี้เป็นคู่มือสรุปเชิงลึกภาษาไทยจากโครงสร้างเมนูและเนื้อหาหลักของ n8n Docs ใช้เพื่อทำความเข้าใจ n8n ตั้งแต่เริ่มต้น ออกแบบ workflow ใช้งาน node จัดการ credentials self-host scale production เขียน code ใช้ AI และเรียก API

## 1. n8n คืออะไร

n8n เป็นเครื่องมือ workflow automation สำหรับเชื่อมต่อแอป บริการ API ฐานข้อมูล และ logic ภายในองค์กรเข้าด้วยกัน โดยสร้าง workflow เป็น node ต่อ node บน canvas และสามารถผสม no-code, low-code, code, AI และ API automation ได้ในระบบเดียว

จุดสำคัญของ n8n:

- เชื่อมต่อแอปหรือ API ได้จำนวนมากผ่าน built-in nodes
- สร้าง workflow แบบ visual editor และแทรก JavaScript/Python ได้ผ่าน Code node
- รองรับ trigger, schedule, webhook, polling, manual execution และ sub-workflow
- รองรับ self-host เพื่อควบคุมข้อมูล infrastructure security และ compliance
- รองรับ n8n Cloud สำหรับผู้ที่ไม่ต้องการดูแล server เอง
- มี AI workflow, LangChain nodes, RAG, agent, tool calling และ evaluation workflows
- มี Public API และ CLI สำหรับจัดการ workflow/credential/execution ในเชิง automation

## 2. แผนที่เมนูหลักของ n8n Docs

โครงสร้าง docs หลักแบ่งเป็น 6 หมวดใหญ่:

1. `Using n8n`
2. `Integrations`
3. `Hosting n8n`
4. `Code in n8n`
5. `Advanced AI`
6. `API`

### 2.1 Using n8n

หมวดนี้คือแกนสำหรับผู้ใช้ทั่วไปและคนออกแบบ workflow

เมนูย่อยสำคัญ:

- `Getting started`
  - Learning path
  - Choose your n8n
  - Quickstarts
  - Video courses
  - Text courses level one และ level two
- `Using the app`
  - Understand workflows
  - Create and run
  - Save and publish
  - Components: Nodes, Connections, Sticky Notes
  - Executions
  - Tags
  - Export and import
  - Templates
  - Sharing
  - Settings
  - Streaming responses
  - Workflow history
  - Workflow ID
  - Sub-workflow conversion
- `Manage credentials`
  - Create and edit
  - Credential sharing
- `Manage users and access`
  - Cloud setup
  - Manage users
  - Account types
  - Role-based access control
  - Projects
  - Custom roles
  - Best practices
  - 2FA
  - LDAP
  - OIDC
  - SAML
- `Key concepts`
  - Flow logic
  - Working with data
  - Glossary
- `n8n Cloud`
  - Overview
  - Free trial
  - Admin dashboard
  - Version update
  - Timezone
  - Cloud IP addresses
  - Data management
  - Ownership/username
  - Concurrency
  - Download workflows
  - AI Assistant
- `Enterprise features`
  - Source control and environments
  - External secrets
  - Log streaming
  - Security settings
  - Insights
  - License key
- `Releases`
  - Release notes 2.x, 1.x, 0.x
  - Breaking changes
  - Migration tools/guides
- `Help and community`
- `Licenses and privacy`

### 2.2 Integrations

หมวดนี้ครอบคลุม nodes และ credentials ทั้งหมด

เมนูย่อยสำคัญ:

- `Built-in nodes`
  - Node types
  - Core nodes
  - Actions
  - Triggers
  - Cluster nodes
  - Credentials
- `Community nodes`
  - Installation and management
  - Risks
  - Blocklist
  - Using community nodes
  - Troubleshooting
  - Building community nodes
- `Creating nodes`
  - Plan your node
  - Choose node type
  - Choose node building style
  - Node UI design
  - File structure
  - Build your node
  - Node UI elements
  - Code standards
  - Error handling
  - Versioning
  - Credentials files
  - HTTP request helpers
  - Item linking
  - UX guidelines
  - Verification guidelines
  - Test and deploy nodes

### 2.3 Hosting n8n

หมวดนี้สำหรับ self-host และ production operations

เมนูย่อยสำคัญ:

- Community vs Enterprise
- Installation
  - npm
  - Docker
  - Server setups: DigitalOcean, Heroku, Hetzner, AWS, Azure, Google Cloud Run, GKE, OpenShift CRC, Docker Compose
  - Updating
- Configuration
  - Environment variables
  - Configuration methods
  - Configuration examples
  - Supported databases
  - Credential overwrites
  - External hooks
  - Task runners
  - User management
- Logging and monitoring
  - Logging
  - Monitoring
  - OpenTelemetry tracing
  - Security audit
- Scaling and performance
  - Overview
  - Performance and benchmarking
  - Queue mode
  - Concurrency control
  - Execution data
  - Binary data
  - External storage for binary data
  - Memory-related errors
- Securing n8n
  - SSL
  - SSO
  - Disable API
  - Opt out of data collection
  - Blocking nodes
  - Hardening task runners
  - SSRF protection
  - Encryption key rotation
  - Redact execution data
  - Restrict registration to verified email users
- Starter Kits
  - AI Starter Kit
- OEM deployment
- Architecture
  - Overview
  - Database structure
- CLI commands

### 2.4 Code in n8n

หมวดนี้สำหรับการเขียน logic ใน workflow

เมนูย่อยสำคัญ:

- Using the Code node
- AI coding
- Built-in methods and variables
  - Overview
  - JMESPath
  - HTTP node
  - LangChain Code node
  - n8n metadata
- Custom variables
- Cookbook
  - execution
  - getWorkflowStaticData
  - `$nodeName.all`
  - vars
  - Code node examples
  - HTTP Request node pagination

### 2.5 Advanced AI

หมวดนี้สำหรับ workflow ที่ใช้ AI, LangChain, RAG, agent และ evaluation

เมนูย่อยสำคัญ:

- AI Workflow Builder
- Chat Hub
- Instance-level MCP server
  - Set up and use n8n MCP server
  - MCP server tools reference
- Tutorial: Build an AI workflow in n8n
- RAG in n8n
- LangChain in n8n
  - Overview
  - LangChain concepts in n8n
  - LangChain learning resources
  - Use LangSmith with n8n
- Evaluations
  - Overview
  - Light evaluations
  - Metric-based evaluations
  - Tips and common issues
- Examples and concepts
  - Chain
  - Agent
  - Agents vs chains
  - Memory
  - Tool
  - Google Sheets as data source
  - API call for data fetching
  - Human fallback
  - Human-in-the-loop for tool calls
  - Let AI specify tool parameters
  - Vector database
  - Populate Pinecone from website

### 2.6 API

หมวดนี้สำหรับจัดการ n8n ผ่าน API

เมนูย่อยสำคัญ:

- Authentication
- Pagination
- API playground
- API reference
- n8n CLI

## 3. เลือก n8n แบบไหนดี

n8n มีรูปแบบใช้งานหลัก:

| รูปแบบ | เหมาะกับ | จุดเด่น | สิ่งที่ต้องดูแล |
|---|---|---|---|
| n8n Cloud | ทีมที่อยากเริ่มเร็ว | ไม่ต้องดูแล infra, update ง่าย | ค่าใช้จ่าย, ข้อจำกัด plan |
| Self-host Docker | production/custom/security | คุม data, network, database, scaling | server, backup, security, update |
| Self-host npm | development/local/lightweight | ทดลองเร็ว | dependency/OS compatibility |
| Server setup | production บน cloud provider | deploy ตาม platform | network, SSL, storage, monitoring |
| OEM deployment | ฝัง n8n ใน product ของตนเอง | ใช้ n8n เป็น embedded automation | ต้องมีข้อตกลง OEM |

คำแนะนำ:

- เริ่มเรียนรู้: ใช้ n8n Cloud หรือ Docker local
- เริ่ม production ขนาดเล็ก: Docker Compose + PostgreSQL + reverse proxy + backup
- production ที่มีโหลดสูง: queue mode + Redis + workers + Postgres
- ข้อมูลอ่อนไหว/ข้อกำหนดองค์กร: self-host + SSO/RBAC/audit/security hardening

## 4. แนวคิดหลักของ Workflow

Workflow คือชุดของ nodes ที่เชื่อมกันเป็นลำดับหรือเป็นกิ่ง logic

องค์ประกอบสำคัญ:

- `Trigger node`: จุดเริ่ม workflow เช่น Manual Trigger, Schedule Trigger, Webhook, app trigger
- `Action node`: ทำงานกับ service/API เช่น create row, send message, update issue
- `Core node`: จัดการ logic/data เช่น IF, Switch, Merge, Code, Set, Filter, Loop, Wait
- `Connection`: เส้นเชื่อมระหว่าง nodes กำหนด data flow
- `Execution`: การ run workflow หนึ่งครั้ง
- `Credential`: ข้อมูล auth สำหรับ service ต่าง ๆ
- `Expression`: syntax `{{ ... }}` สำหรับดึง/แปลงค่าจาก data
- `Sub-workflow`: workflow ย่อยที่ workflow อื่นเรียกใช้ได้

Workflow ที่ดีควร:

- มี trigger ชัดเจน
- แบ่ง logic เป็นส่วนเล็ก ๆ
- ตั้งชื่อ node ให้อ่านแล้วรู้หน้าที่
- ใส่ Sticky Notes เพื่ออธิบาย business rule
- ใช้ error handling สำหรับกรณี API ล้มเหลวหรือข้อมูลไม่ครบ
- หลีกเลี่ยงการใส่ secret ใน node parameter ตรง ๆ ให้ใช้ credentials/env variables
- ทดสอบ manual ก่อน publish/activate

## 5. Execution modes

n8n แยก execution หลักเป็น:

- `Manual execution`: ใช้ตอนพัฒนาและทดสอบ workflow ผ่านปุ่ม execute
- `Production execution`: workflow ที่ active แล้วและถูก trigger อัตโนมัติ

ประเด็นที่ควรรู้:

- Production execution เกิดจาก trigger, schedule, webhook, polling หรือ event จริง
- Manual execution เหมาะกับ debug และไม่ควรใช้เป็นตัวแทน production เสมอไป เพราะ context บางอย่างต่างกัน
- ใน paid plan execution quota มักนับ production execution เป็นหลัก
- Execution list มีทั้งระดับ workflow เดี่ยวและ all executions
- สามารถเพิ่ม custom execution data เพื่อ trace business identifier เช่น order id หรือ customer id
- ควรเปิด redaction หรือจัดการ execution data เมื่อมี PII/secret

## 6. Data structure ใน n8n

n8n ส่งข้อมูลระหว่าง nodes เป็น array ของ items โดย item หนึ่งมักมี `json` และอาจมี `binary`

รูปแบบเชิงแนวคิด:

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

คำศัพท์สำคัญ:

- `item`: หน่วยข้อมูลหนึ่งรายการใน workflow
- `json`: object หลักของ item
- `binary`: ข้อมูลไฟล์ เช่น image, PDF, attachment
- `paired item / item linking`: ความสัมพันธ์ระหว่าง item input/output เมื่อ node แปลงหรือแยกข้อมูล
- `run data`: ข้อมูลที่เกิดจาก execution ของ node

แนวปฏิบัติ:

- ถ้า API ส่ง array กลับมา ให้เข้าใจว่าหลาย node จะ iterate ราย item
- ถ้าต้องรวมข้อมูลจากหลาย branch ให้ใช้ Merge หรือ Code อย่างระวังเรื่อง item pairing
- ถ้าแปลงข้อมูลใน Code node ควรรักษาโครงสร้าง `{ json: ... }`
- ถ้าจัดการไฟล์ ให้แยก logic ของ metadata ใน `json` และ payload ใน `binary`

## 7. Expressions

Expression ใช้ syntax:

```text
{{ expression }}
```

ตัวอย่าง:

```text
{{ $json.email }}
{{ $json.user.firstName + ' ' + $json.user.lastName }}
{{ DateTime.now().toISO() }}
{{ $now.plus({ days: 7 }).toISODate() }}
```

ใช้ expression เมื่อ:

- ต้องดึงค่าจาก node ก่อนหน้า
- ต้องคำนวณเล็กน้อย เช่น format string, date, number
- ต้องตั้ง parameter ให้ dynamic ตาม input
- ต้องเข้าถึง workflow metadata หรือ environment/custom variables

ไม่ควรใช้ expression เมื่อ:

- logic ยาวหลายขั้น
- ต้อง loop/aggregate ซับซ้อน
- ต้องเรียก library
- ต้อง transform object ใหญ่

กรณีเหล่านี้ให้ใช้ Code node หรือ data transformation nodes แทน

## 8. วิธีเลือกเครื่องมือแปลงข้อมูล

| วิธี | เหมาะกับ | ตัวอย่าง |
|---|---|---|
| Expressions | ค่า parameter เดี่ยวหรือ logic สั้น | ดึง `{{$json.city}}`, format date |
| Edit Fields/Set | เพิ่ม/แก้ field แบบ visual | rename field, set default |
| Filter | กรอง item | status = paid |
| IF/Switch | branch ตามเงื่อนไข | แยก success/failure |
| Aggregate/Summarize | รวม/สรุปข้อมูล | sum, count, group |
| Split Out | แตก array เป็นหลาย item | line items |
| Merge | รวม branch | join customer + order |
| Code node | logic ซับซ้อน | reshape object, loop, custom mapping |
| AI Transform | ให้ AI generate transform จากคำสั่งภาษา | group by user and sum total |

## 9. Flow logic

หัวข้อ Flow logic ใน docs แบ่งเป็น:

- Splitting with conditionals
- Merging data
- Looping
- Waiting
- Sub-workflows
- Error handling
- Execution order in multi-branch workflows

### 9.1 Splitting

ใช้เมื่อ workflow ต้องแยกทางตามเงื่อนไข

Nodes ที่ใช้บ่อย:

- `IF`: สองทาง true/false
- `Switch`: หลายทางตามค่า field หรือ expression
- `Filter`: คัดเฉพาะ items ที่เข้าเงื่อนไข

ตัวอย่าง:

- ถ้า `paymentStatus = paid` ส่ง invoice
- ถ้า `priority = high` แจ้ง Slack
- ถ้า `country` เป็น `TH`, `US`, `EU` แยกไป flow คนละชุด

### 9.2 Merging

ใช้รวมข้อมูลจากหลาย branch

Nodes ที่ใช้บ่อย:

- `Merge`
- `Compare Datasets`
- `Code`

ข้อควรระวัง:

- ต้องเข้าใจจำนวน items ในแต่ละ branch
- ต้องรู้ว่าจะ merge ตาม index, key หรือ append
- ถ้า item linking หาย อาจอ้างข้อมูลผิดรายการ

### 9.3 Looping

n8n มักประมวลผล item-by-item ให้อยู่แล้ว แต่บางกรณีต้อง loop ควบคุมเอง

ใช้เมื่อ:

- ต้อง batch request เพื่อลด rate limit
- ต้องวนจนกว่า API ส่ง next page หมด
- ต้อง retry บางรายการ
- ต้อง process ชุดข้อมูลทีละกลุ่ม

Nodes ที่ใช้บ่อย:

- `Loop Over Items`
- `IF`
- `Wait`
- `HTTP Request` พร้อม pagination
- `Code`

### 9.4 Waiting

ใช้หยุด workflow ชั่วคราวแล้วค่อย resume

ตัวอย่าง:

- รอ 3 วันหลังส่งอีเมลแรก
- รอ webhook callback จากระบบภายนอก
- รอเวลานัดหมายก่อนแจ้งเตือน

Node สำคัญ:

- `Wait`

### 9.5 Sub-workflows

ใช้แยก workflow ที่ซ้ำกันออกเป็น reusable module

Nodes สำคัญ:

- `Execute Sub-workflow`
- `Execute Sub-workflow Trigger`

เหมาะกับ:

- ส่ง Slack notification มาตรฐาน
- normalize customer data
- validate payload
- call internal API pattern เดิม
- error reporting กลาง

### 9.6 Error handling

แนวทางหลัก:

- ใช้ node-level error handling เมื่อบาง node อาจ fail ได้
- ใช้ Error Trigger เพื่อรับ workflow error
- ใช้ Stop And Error เมื่อ business rule ไม่ผ่านและต้อง fail แบบตั้งใจ
- ใส่ retry/backoff เมื่อเจอ external API
- เก็บ context เช่น workflow id, execution id, node name, payload id

## 10. Core nodes ที่ควรรู้

Core nodes คือ nodes พื้นฐานที่ใช้สร้าง logic ไม่ผูกกับ service เดียว

กลุ่ม Trigger:

- `Manual Trigger`: เริ่ม workflow ด้วยมือ
- `Schedule Trigger`: run ตามเวลา
- `Webhook`: รับ HTTP request
- `Chat Trigger`: เริ่มจาก chat
- `Error Trigger`: รับ error จาก workflow
- `Workflow Trigger`: trigger จาก lifecycle หรือ workflow event
- `Local File Trigger`: trigger จากไฟล์ในเครื่อง self-host
- `RSS Feed Trigger`, `SSE Trigger`, `Email Trigger (IMAP)`

กลุ่ม Logic:

- `IF`
- `Switch`
- `Filter`
- `Merge`
- `Loop Over Items`
- `Wait`
- `Stop And Error`
- `No Operation`

กลุ่ม Data:

- `Edit Fields (Set)`
- `Aggregate`
- `Summarize`
- `Sort`
- `Limit`
- `Split Out`
- `Remove Duplicates`
- `Rename Keys`
- `Compare Datasets`
- `Data Table`

กลุ่ม Code/Protocol:

- `Code`
- `HTTP Request`
- `GraphQL`
- `JWT`
- `Crypto`
- `HTML`
- `XML`
- `Markdown`
- `Compression`

กลุ่ม Files/Communication:

- `Read/Write Files from Disk`
- `Extract From File`
- `Convert to File`
- `FTP`
- `SSH`
- `Send Email`
- `Respond to Webhook`

กลุ่ม n8n/AI/MCP:

- `n8n`
- `n8n Form`
- `n8n Form Trigger`
- `n8n Trigger`
- `AI Transform`
- `Guardrails`
- `MCP Client`
- `MCP Server Trigger`

## 11. Built-in integrations

n8n มี built-in action/trigger/credential nodes จำนวนมาก เช่น:

- CRM/project: HubSpot, Jira, Linear, ClickUp, Asana, Trello
- Google: Gmail, Calendar, Drive, Sheets, Docs, Slides, BigQuery, Firestore
- Microsoft: Excel 365, OneDrive, Dynamics CRM, Entra ID
- DevOps: GitHub, GitLab, Jenkins, AWS, Azure, Google Cloud, Docker-related patterns
- Messaging: Slack-like integrations, Discord, Telegram, Mattermost, Matrix
- Databases/storage: PostgreSQL-related credentials, MySQL-like sources, MongoDB-like integrations, S3, Supabase, Weaviate, Pinecone-like vector DB patterns
- Marketing/sales: Mailchimp, Brevo, ActiveCampaign, Customer.io, Iterable
- AI/model providers: OpenAI-style providers, Anthropic, Google Gemini, xAI, model selector and LangChain cluster nodes

แนวทางเลือก integration:

- ถ้ามี node สำเร็จรูป ให้ใช้ node นั้นก่อน
- ถ้า operation ไม่ครบ ให้ใช้ `HTTP Request` พร้อม credential/API key
- ถ้าต้องทำ operation ซ้ำมาก ค่อยพิจารณาสร้าง custom node
- ถ้าเป็น community node ให้ประเมินความเสี่ยง security และ maintenance

## 12. Credentials

Credentials คือข้อมูล auth ที่ node ใช้เชื่อมต่อ external service

ประเภทที่พบบ่อย:

- API key
- OAuth2
- Basic auth
- Bearer token
- Username/password
- Service account/private key
- SSH key
- Database connection string

แนวปฏิบัติ:

- อย่า hardcode secret ใน workflow
- ใช้ credential object เสมอเมื่อ node รองรับ
- จำกัด scope ของ API key ให้เล็กที่สุด
- ตั้งชื่อ credentials ให้บอก environment เช่น `Google Sheets - Production`
- แยก dev/staging/prod credentials
- สำรอง encryption key ของ n8n self-host ให้ดีมาก เพราะใช้ถอดรหัส credentials
- ถ้าใช้ projects/RBAC ให้แชร์ credential เท่าที่จำเป็น

## 13. Community nodes

Community nodes คือ nodes ที่ชุมชนสร้างและเผยแพร่

ใช้เมื่อ:

- service ที่ต้องการยังไม่มี built-in node
- community node มี maintenance ดีและตรง use case
- ทีมยอมรับความเสี่ยงด้าน dependency/security ได้

ควรตรวจ:

- package source
- maintainer
- release frequency
- permission และ credential access
- issue history
- compatibility กับ n8n version
- policy blocklist ขององค์กร

## 14. Creating custom nodes

ควรสร้าง custom node เมื่อ:

- ต้องเชื่อมต่อ service ภายในองค์กร
- ต้องทำ operation เดิมซ้ำหลาย workflow
- HTTP Request node เริ่มซับซ้อนเกินดูแล
- ต้องการ UX ที่ดีให้ผู้ใช้ non-technical
- ต้องควบคุม auth, pagination, error mapping, resource operations เป็นระบบ

ขั้นตอนตาม docs:

1. Plan node
2. Choose node type
3. Choose building style
4. ออกแบบ node UI
5. เลือก file structure
6. สร้าง development environment
7. ใช้ `n8n-node` tool
8. Implement parameters, operations, credentials, request helpers
9. จัดการ error และ item linking
10. Run locally
11. Lint/test
12. Deploy หรือ submit community node

## 15. Hosting ด้วย Docker

n8n แนะนำ Docker สำหรับ self-host ส่วนใหญ่ เพราะ isolate runtime และลดปัญหา OS/dependency

องค์ประกอบ production ที่ควรมี:

- Docker หรือ Docker Compose
- Persistent volume สำหรับ `/home/node/.n8n`
- PostgreSQL แทน SQLite สำหรับ production
- Reverse proxy เช่น Nginx/Traefik/Caddy
- HTTPS certificate
- `WEBHOOK_URL` ที่ถูกต้อง
- Timezone ถูกต้อง
- Encryption key ที่กำหนดเองและ backup
- Backup database และ n8n data volume
- Monitoring/logging

ตัวอย่าง docker run แบบ local:

```bash
docker volume create n8n_data

docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE="Asia/Bangkok" \
  -e TZ="Asia/Bangkok" \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -e N8N_RUNNERS_ENABLED=true \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

Production ควรเพิ่ม:

- `DB_TYPE=postgresdb`
- `DB_POSTGRESDB_HOST`
- `DB_POSTGRESDB_PORT`
- `DB_POSTGRESDB_DATABASE`
- `DB_POSTGRESDB_USER`
- `DB_POSTGRESDB_PASSWORD`
- `N8N_ENCRYPTION_KEY`
- `WEBHOOK_URL`
- `N8N_HOST`
- `N8N_PROTOCOL`
- `N8N_PORT`

## 16. Environment variables สำคัญ

กลุ่ม deployment:

- `N8N_HOST`
- `N8N_PORT`
- `N8N_PROTOCOL`
- `WEBHOOK_URL`
- `N8N_EDITOR_BASE_URL`
- `N8N_PROXY_HOPS`

กลุ่ม timezone:

- `TZ`
- `GENERIC_TIMEZONE`

กลุ่ม database:

- `DB_TYPE`
- `DB_POSTGRESDB_HOST`
- `DB_POSTGRESDB_PORT`
- `DB_POSTGRESDB_DATABASE`
- `DB_POSTGRESDB_USER`
- `DB_POSTGRESDB_PASSWORD`
- `DB_POSTGRESDB_SCHEMA`

กลุ่ม security:

- `N8N_ENCRYPTION_KEY`
- `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS`
- ตัวแปร SSO/OIDC/SAML ตาม setup
- ตัวแปร SSRF protection ตาม policy

กลุ่ม executions:

- execution timeout
- execution data pruning
- save execution progress/data options
- concurrency settings

กลุ่ม queue mode:

- `EXECUTIONS_MODE=queue`
- Redis host/port/password variables
- worker concurrency variables
- multi-main setup variables

กลุ่ม code/task runners:

- `N8N_RUNNERS_ENABLED`
- allowed external modules สำหรับ Code node ถ้าจำเป็น

## 17. Updating n8n

แนวทาง update:

- อ่าน release notes ก่อน โดยเฉพาะ major version และ breaking changes
- backup database และ volume ก่อน update
- pin version ใน production อย่าใช้ floating tag โดยไม่ตั้งใจ
- ทดสอบ staging ก่อน production
- ตรวจ workflow สำคัญหลัง update
- ตรวจ community nodes compatibility
- ถ้าใช้ Docker Compose ให้ pull image ใหม่ แล้ว recreate container

## 18. Scaling และ queue mode

Queue mode เหมาะกับ production ที่ต้อง scale execution

องค์ประกอบ:

- Main n8n instance: รับ UI/API/webhook/timer และสร้าง execution
- Redis: message broker/queue
- Worker instances: execute workflow จริง
- Database: เก็บ workflow/execution/result
- Optional webhook processors/load balancer สำหรับ traffic สูง

Flow โดยสรุป:

1. Main process รับ trigger/webhook/schedule
2. สร้าง execution id
3. ส่งงานเข้า Redis
4. Worker รับงานจาก Redis
5. Worker โหลด workflow จาก database
6. Worker execute และเขียนผลกลับ database
7. Redis แจ้ง main ว่างานเสร็จ

ข้อควรระวัง:

- ทุก main/worker ต้องใช้ n8n version เดียวกัน
- ต้องใช้ encryption key เดียวกัน
- Queue mode ไม่เหมาะกับ binary filesystem storage ถ้าต้อง persist binary data ให้ใช้ external storage เช่น S3
- ต้องออกแบบ worker concurrency ตาม workload/API rate limit
- ถ้ามี multi-main ต้องมี sticky sessions หลัง load balancer
- non-HTTP triggers และ cleanup jobs ต้องคิดเรื่อง leader/at-most-once tasks

## 19. Logging, monitoring, tracing

ควรมี:

- Application logs
- Execution failure alerts
- Health checks
- Database monitoring
- Redis monitoring ถ้าใช้ queue
- Worker metrics
- Error rate per workflow
- Execution duration percentile
- Queue length
- Memory/CPU
- OpenTelemetry tracing ถ้าต้อง trace production อย่างละเอียด
- Security audit สำหรับ self-host

## 20. Security hardening

Checklist production:

- เปิด HTTPS
- ใช้ reverse proxy ที่ config headers ถูกต้อง
- ตั้ง `WEBHOOK_URL` ให้ตรง public URL
- ตั้ง `N8N_ENCRYPTION_KEY` และ backup นอกเครื่อง
- ใช้ PostgreSQL พร้อม backup/restore test
- จำกัด public access เฉพาะที่จำเป็น
- เปิด SSO/OIDC/SAML ถ้าเป็นองค์กร
- เปิด 2FA ถ้าใช้ local account
- ใช้ RBAC/projects แยกทีมและ credentials
- ปิด API ถ้าไม่ใช้
- จำกัด community nodes ตาม policy
- harden task runners
- เปิด SSRF protection เมื่อมี workflow รับ input จากภายนอก
- redact execution data เมื่อมีข้อมูลอ่อนไหว
- ลด retention ของ execution data ตาม compliance
- rotate keys/tokens เป็นระยะ

## 21. Code node

Code node ใช้เขียน JavaScript หรือ Python เพื่อทำ transformation ซับซ้อน

เหมาะกับ:

- reshape object
- group/sort/aggregate ซับซ้อน
- สร้างหลาย output items
- clean/normalize data
- pagination/custom retry ที่ node ทำไม่ได้
- ใช้ built-in methods/variables

โครง output ที่ควรรักษา:

```javascript
return items.map((item) => {
  return {
    json: {
      ...item.json,
      normalizedEmail: item.json.email?.toLowerCase(),
    },
  };
});
```

ข้อควรระวัง:

- อย่าส่ง raw object ถ้า node ต้องการ array of `{ json: ... }`
- ระวัง memory เมื่อ items ใหญ่มาก
- ถ้าใช้ external modules ต้อง configure self-host ให้ยอมรับ
- รักษา item linking หาก downstream ต้องอ้างข้อมูลเดิม
- ใส่ error message ที่ช่วย debug

## 22. HTTP Request node

HTTP Request เป็น node อเนกประสงค์สำหรับ API ที่ไม่มี node สำเร็จรูปหรือ operation ไม่ครบ

ใช้กับ:

- REST API
- OAuth/API key/Bearer token
- Pagination
- File download/upload
- Webhook callback
- Internal services

ควรออกแบบ:

- แยก base URL, endpoint, query, body ให้ชัด
- ใช้ credential แทน token ใน field ธรรมดา
- handle status code เช่น 429, 500
- ใช้ retry/backoff เมื่อเหมาะสม
- จำกัด payload size
- log correlation id หรือ request id ถ้ามี

## 23. Webhook workflows

Webhook node ใช้รับ HTTP request จากภายนอก

ควรตรวจ:

- Method: GET/POST/PUT/PATCH/DELETE
- Path ต้อง unique และอ่านง่าย
- Authentication ถ้ามีข้อมูลสำคัญ
- Response mode: respond immediately หรือ respond when last node finishes
- ใช้ Respond to Webhook เมื่ออยากควบคุม response body/status/header
- Production URL ต้องตรง `WEBHOOK_URL`
- Local test อาจใช้ tunnel แต่ไม่ควรใช้ tunnel สำหรับ production

Pattern ที่ดี:

1. Webhook รับ request
2. Validate payload
3. Auth/signature verification
4. Normalize data
5. Business logic
6. Return response
7. ส่ง error/alert ถ้าล้มเหลว

## 24. n8n Forms และ Chat

n8n มี Form และ Chat nodes สำหรับรับ input จาก user โดยไม่ต้องสร้าง frontend เอง

ใช้เมื่อ:

- ต้องการ internal form สำหรับ request/approval
- ต้องการ chatbot workflow
- ต้องการ human-in-the-loop
- ต้องการเก็บข้อมูลและส่งต่อไป API/database

ควรคิดเรื่อง:

- validation
- authentication/access
- spam/rate limit
- data retention
- response UX

## 25. Advanced AI ใน n8n

n8n รองรับการสร้าง AI workflows ตั้งแต่ chatbot ง่าย ๆ ถึง RAG/agent/tool workflow

องค์ประกอบ AI ที่พบบ่อย:

- Chat Trigger
- AI Agent / LangChain cluster nodes
- Model provider node
- Memory
- Tools
- Vector store
- Document loader
- Text splitter
- Embeddings
- Output parser/guardrails
- Evaluations

แนวคิด:

- `Chain`: ลำดับขั้น AI ที่ค่อนข้าง deterministic
- `Agent`: AI เลือก tool/step เองตามโจทย์
- `Memory`: เก็บ context ระหว่าง conversation
- `Tool`: function/API/workflow ที่ agent เรียกใช้
- `RAG`: retrieval augmented generation ดึงข้อมูลจาก source/vector DB ก่อนตอบ
- `Evaluation`: วัดคุณภาพ output ด้วย light/metric-based methods

Pattern RAG:

1. Ingest documents
2. Split text
3. Create embeddings
4. Store in vector database
5. Query user question
6. Retrieve relevant chunks
7. Feed context to model
8. Generate answer
9. Evaluate/guardrail

Pattern AI agent:

1. Chat Trigger รับข้อความ
2. Agent รับ system instructions
3. ต่อ model provider
4. ต่อ memory ถ้าต้องจำ context
5. ต่อ tools เช่น HTTP Request, Google Sheets, database, sub-workflow
6. Guardrails/output parser
7. ตอบกลับ user

## 26. API

n8n API ใช้ API key authentication

หลักการ:

- สร้าง API key ใน Settings > n8n API
- ส่ง key ผ่าน header `X-N8N-API-KEY`
- Enterprise สามารถจำกัด scope ของ key ได้
- Non-enterprise key มักมีสิทธิ์เต็มตาม account/resource
- Free trial ของ n8n API อาจไม่เปิดให้ใช้ ต้องตรวจ plan

ตัวอย่าง:

```bash
curl -X GET \
  "https://n8n.example.com/api/v1/workflows?active=true" \
  -H "accept: application/json" \
  -H "X-N8N-API-KEY: <your-api-key>"
```

ใช้ API เพื่อ:

- list workflows
- import/export workflow
- activate/deactivate workflow
- inspect executions
- automate admin tasks
- integrate CI/CD

ข้อควรระวัง:

- เก็บ API key ใน secret manager
- จำกัด scope/expiration ถ้าทำได้
- rotate key
- อย่าใช้ user key ส่วนตัวใน production integration ระยะยาวถ้ามีนโยบาย service account

## 27. Source control และ environments

Enterprise features รองรับ source control และ environments

เหมาะกับทีมที่ต้อง:

- แยก dev/staging/prod
- review workflow changes
- push/pull changes ผ่าน Git
- copy work between environments
- maintain branch pattern
- ลดความเสี่ยงจากการแก้ workflow ตรง production

แนวปฏิบัติ:

- ห้ามแก้ production โดยตรงถ้า workflow critical
- ใช้ naming convention
- ใช้ credential แยก environment
- review diff ก่อน pull/push
- มี rollback path
- document owner ของ workflow

## 28. Workflow design best practices

### 28.1 Naming

- ตั้งชื่อ workflow เป็นรูปแบบ `Domain - Trigger - Outcome`
- ตัวอย่าง: `Sales - Webhook - Create HubSpot Deal`
- ตั้งชื่อ node ให้เป็น action เช่น `Validate payload`, `Create invoice`, `Notify finance`

### 28.2 Structure

- วาง trigger ซ้ายสุด
- แยก validation ก่อน business logic
- รวม error path ให้เห็นชัด
- ใช้ Sticky Notes สำหรับเงื่อนไขธุรกิจ
- แยก repeated logic เป็น sub-workflow

### 28.3 Data

- normalize field names ก่อนเข้าช่วง logic หลัก
- อย่าส่ง payload ใหญ่เกินจำเป็นข้ามหลาย node
- ลบ secret/PII ก่อนเก็บ execution data ถ้าไม่จำเป็น
- ใช้ custom execution data เพื่อค้น execution ง่าย

### 28.4 Reliability

- ใส่ retry/backoff สำหรับ external API
- handle empty input
- handle duplicate events
- ออกแบบ idempotency สำหรับ webhook
- ใช้ rate limit protection
- ใช้ queue/batch เมื่อ volume สูง

### 28.5 Security

- ใช้ credentials/env variables
- ตรวจ signature ของ webhook จาก provider
- จำกัด access ตาม project/RBAC
- ทบทวน community nodes
- ตรวจ execution data retention

## 29. Checklist เริ่มต้นสร้าง workflow

ก่อนสร้าง:

- ระบุ trigger
- ระบุ input schema
- ระบุ output/result ที่ต้องการ
- ระบุ systems ที่เกี่ยวข้อง
- ระบุ credential/API scopes
- ระบุ error cases
- ระบุ rate limits
- ระบุ data sensitivity

ระหว่างสร้าง:

- เริ่มด้วย Manual Trigger หรือ test webhook
- pin/mock data เพื่อ test
- normalize data ก่อน
- เพิ่ม node ทีละขั้น
- test branch true/false
- test empty/error payload
- ตั้งชื่อ node
- ใส่ Sticky Notes

ก่อน publish:

- ปิด pin data ที่ไม่ควรติด production
- ตรวจ credentials environment
- ตรวจ webhook production URL
- ตรวจ timezone
- ตรวจ execution retention/redaction
- test manual execution
- activate workflow
- test production trigger จริง
- monitor first executions

## 30. Checklist self-host production

Infrastructure:

- Docker Compose หรือ orchestration ที่เหมาะสม
- PostgreSQL
- Redis ถ้าใช้ queue mode
- Persistent volume
- Reverse proxy
- TLS certificate
- DNS
- Backups

Configuration:

- `N8N_ENCRYPTION_KEY`
- `WEBHOOK_URL`
- `N8N_HOST`
- `N8N_PROTOCOL`
- `GENERIC_TIMEZONE`
- `TZ`
- Database variables
- Execution pruning
- Task runners

Security:

- SSO/2FA
- RBAC/projects
- Disable unused API
- SSRF protection
- Community node policy
- Secret rotation
- Execution data redaction

Operations:

- Release update process
- Staging environment
- Monitoring
- Alerting
- Restore drill
- Workflow ownership
- Incident response

## 31. Troubleshooting patterns

Webhook ไม่ถูกเรียก:

- ตรวจ URL ว่าเป็น production URL ไม่ใช่ test URL
- ตรวจ workflow active
- ตรวจ reverse proxy และ `WEBHOOK_URL`
- ตรวจ method/path
- ตรวจ firewall/DNS/TLS

Schedule ไม่ตรงเวลา:

- ตรวจ `GENERIC_TIMEZONE`
- ตรวจ `TZ`
- ตรวจ server timezone
- ตรวจ workflow active

Credential ใช้ไม่ได้:

- ตรวจ scope/token expiration
- re-auth OAuth
- ตรวจ project sharing/RBAC
- ตรวจ encryption key หลัง restore/migrate

Workflow ช้า:

- ตรวจ API latency
- ลด payload size
- ใช้ batch/queue
- เพิ่ม worker
- ตรวจ database performance
- prune execution data

Memory error:

- ลดจำนวน items ต่อ batch
- หลีกเลี่ยง binary ใหญ่ใน memory
- ใช้ external binary storage
- scale worker memory

ข้อมูล merge ผิด:

- ตรวจ item count แต่ละ branch
- ตรวจ merge mode
- ตรวจ paired items
- ใช้ key-based merge เมื่อเหมาะสม

## 32. Roadmap การเรียนรู้

ลำดับแนะนำ:

1. อ่าน `Choose your n8n`
2. ทำ quickstart
3. เรียน workflow components
4. เข้าใจ executions
5. เข้าใจ data structure
6. ฝึก expressions
7. ฝึก IF/Switch/Merge/Loop
8. ใช้ HTTP Request/Webhook
9. จัดการ credentials
10. สร้าง error workflow
11. Deploy self-host หรือใช้ Cloud
12. เพิ่ม monitoring/security
13. เรียน Code node
14. เรียน Advanced AI
15. ใช้ API/CLI/source control

## 33. แหล่งอ้างอิงที่ใช้

- n8n Docs home: https://docs.n8n.io/
- Choose your n8n: https://docs.n8n.io/choose-n8n/
- Workflows: https://docs.n8n.io/workflows/
- Executions: https://docs.n8n.io/workflows/executions/
- Data structure: https://docs.n8n.io/data/data-structure/
- Expressions vs data nodes: https://docs.n8n.io/data/expressions/
- Flow logic: https://docs.n8n.io/flow-logic/
- Node types: https://docs.n8n.io/integrations/builtin/node-types/
- Credentials library: https://docs.n8n.io/integrations/builtin/credentials/
- Docker installation: https://docs.n8n.io/hosting/installation/docker/
- Queue mode: https://docs.n8n.io/hosting/scaling/queue-mode/
- Advanced AI: https://docs.n8n.io/advanced-ai/
- API authentication: https://docs.n8n.io/api/authentication/
