#!/bin/bash
# ============================================================
# Push Atlas MCP to GitHub (Private Repo)
# รันใน Terminal บน Mac mini
# ============================================================
set -e

MCP_DIR="$HOME/atlas-mcp"
REPO_NAME="atlas-mcp"

echo "📁 เข้า directory..."
cd "$MCP_DIR"

# ── 1. สร้าง .gitignore ──────────────────────────────────────
echo "🛡️  สร้าง .gitignore..."
cat > .gitignore << 'GITIGNORE'
# Credentials & secrets
.env
.env.local
.env.*.local
*.key
*.pem

# Node
node_modules/
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
GITIGNORE

echo "✅ .gitignore พร้อมแล้ว"

# ── 2. สร้าง README ──────────────────────────────────────────
cat > README.md << 'README'
# Atlas MCP Server

Local MCP server สำหรับระบบ ATLAS โรงเรียนวรนาถวิทยากำแพงเพชร

## Tools ที่มี
- `atlas_list_terms` — ดึงรายการภาคเรียน
- `atlas_classroom_kpi` — KPI รายห้อง
- `atlas_gap_distribution` — Gap distribution (post Compassion Protocol)
- `atlas_integrity_flags` — FLAG 1–5
- `atlas_red_zone` — นักเรียก Red Zone (mastery ≤ 2.5)
- `atlas_teacher_list` — รายชื่อครู-วิชา-ห้อง
- `atlas_key_issues` — ประเด็นสำคัญ

## Setup
```bash
npm install
cp .env.example .env   # แล้วใส่ค่าจริง
node index.js
```

## Environment Variables
```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

> ⚠️ ห้าม commit ไฟล์ .env จริงขึ้น GitHub
README

# สร้าง .env.example (ไม่มีค่าจริง)
cat > .env.example << 'ENVEX'
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
ENVEX

echo "✅ README.md และ .env.example พร้อมแล้ว"

# ── 3. Git init & commit ─────────────────────────────────────
echo "🔧 ตั้งค่า Git..."
git init
git add .
git status

echo ""
echo "📝 Commit..."
git commit -m "init: Atlas MCP server v1.0 — Red Zone threshold 2.5"

# ── 4. Push ขึ้น GitHub ─────────────────────────────────────
echo ""
echo "☁️  สร้าง private repo และ push..."
gh repo create "$REPO_NAME" --private --push --source=. --description "Atlas MCP Server for ATLAS teaching log system"

echo ""
echo "✅ เสร็จแล้ว!"
echo "🔗 ดู repo ได้ที่: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
