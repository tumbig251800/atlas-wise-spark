#!/bin/bash
# ATLAS — Deploy a single Edge Function ไปยัง Supabase
#
# รัน: ./scripts/deploy-functions.sh <function-name>
# หรือ: bash scripts/deploy-functions.sh <function-name>
# เช่น:  ./scripts/deploy-functions.sh atlas-mcp
#
# ต้องระบุชื่อฟังก์ชันเสมอ — ไม่มีโหมด deploy ทุกฟังก์ชันพร้อมกันอีกต่อไป
# (เดิมสคริปต์นี้รัน `supabase functions deploy` แบบไม่ระบุชื่อ ซึ่ง deploy
# ทุกโฟลเดอร์ใน supabase/functions/ พร้อมกัน รวมถึงโฟลเดอร์ทดลอง/dead code/
# ไฟล์ที่ยังไม่ได้ commit เข้า git ด้วย — เป็นช่องทางที่เคยเกือบทำให้ฟังก์ชัน
# hard-delete ที่ไม่เช็คสิทธิ์ขึ้น production โดยไม่ตั้งใจ)

set -e
cd "$(dirname "$0")/.."
PROJECT_REF="ebyelctqcdhjmqujeskx"

FUNCTION_NAME="$1"
if [ -z "$FUNCTION_NAME" ]; then
  echo "Error: ต้องระบุชื่อฟังก์ชัน"
  echo "  ใช้: ./scripts/deploy-functions.sh <function-name>"
  echo "  เช่น: ./scripts/deploy-functions.sh atlas-mcp"
  exit 1
fi

if [ ! -d "supabase/functions/$FUNCTION_NAME" ]; then
  echo "Error: ไม่พบโฟลเดอร์ supabase/functions/$FUNCTION_NAME"
  exit 1
fi

echo "=========================================="
echo "  ATLAS: Deploy Edge Function — $FUNCTION_NAME"
echo "=========================================="
echo ""

# 1. Check Supabase CLI
if ! command -v supabase &>/dev/null && ! npx supabase --version &>/dev/null 2>&1; then
  echo "[1/4] ติดตั้ง Supabase CLI..."
  npm install -g supabase 2>/dev/null || npx supabase --version
fi

# 2. Login
echo "[2/4] Login Supabase (จะเปิดเบราว์เซอร์)..."
npx supabase login

# 3. Link
echo "[3/4] Link โปรเจกต์..."
npx supabase link --project-ref "$PROJECT_REF"

# 4. Deploy — เฉพาะฟังก์ชันที่ระบุเท่านั้น
echo "[4/4] Deploy $FUNCTION_NAME..."
npx supabase functions deploy "$FUNCTION_NAME"

echo ""
echo "=========================================="
echo "  เสร็จสิ้น: $FUNCTION_NAME"
echo "=========================================="
echo ""
echo "ถ้าได้ Forbidden = โปรเจกต์อาจอยู่ภายใต้ Lovable Org"
echo "→ ใช้วิธี Deploy ผ่าน Supabase Dashboard แทน (ดู DEPLOY-EDGE-FUNCTIONS.md)"
echo ""
