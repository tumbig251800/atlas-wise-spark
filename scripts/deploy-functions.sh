#!/bin/bash
# ATLAS — Deploy Edge Functions ไปยัง Supabase
# รัน: ./scripts/deploy-functions.sh
# หรือ: bash scripts/deploy-functions.sh

set -e
cd "$(dirname "$0")/.."
PROJECT_REF="ebyelctqcdhjmqujeskx"

echo "=========================================="
echo "  ATLAS: Deploy Edge Functions"
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

# 4. Deploy
echo "[4/4] Deploy Edge Functions..."
npx supabase functions deploy

echo ""
echo "=========================================="
echo "  เสร็จสิ้น"
echo "=========================================="
echo ""
echo "ถ้าได้ Forbidden = โปรเจกต์อาจอยู่ภายใต้ Lovable Org"
echo "→ ใช้วิธี Deploy ผ่าน Supabase Dashboard แทน (ดู DEPLOY-EDGE-FUNCTIONS.md)"
echo ""
