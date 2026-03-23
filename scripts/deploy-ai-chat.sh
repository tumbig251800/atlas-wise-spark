#!/bin/bash
# ATLAS — Deploy ai-chat Edge Function (Consolidate ก่อน deploy)
#
# Supabase ไม่รองรับ relative imports — ต้องใช้ไฟล์ consolidated เดียว
# Script นี้: copy consolidated → deploy → restore source
#
# รัน: ./scripts/deploy-ai-chat.sh
# หรือ: npm run deploy:ai-chat

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT_REF="ebyelctqcdhjmqujeskx"

CONSOLIDATED="$ROOT/ai-chat-consolidated.ts"
INDEX="$ROOT/supabase/functions/ai-chat/index.ts"

if [ ! -f "$CONSOLIDATED" ]; then
  echo "ผิดพลาด: ไม่พบไฟล์ $CONSOLIDATED"
  echo "ต้อง consolidate ก่อน (ดู docs หรือ .cursor/plans/)"
  exit 1
fi

echo "=========================================="
echo "  ATLAS: Deploy ai-chat (Consolidate)"
echo "=========================================="
echo ""

echo "[1/4] Copy consolidated → index.ts..."
cp "$CONSOLIDATED" "$INDEX"

echo "[2/4] Deploy ai-chat..."
npx supabase functions deploy ai-chat --project-ref "$PROJECT_REF"

echo "[3/4] Restore source (git checkout)..."
git checkout supabase/functions/ai-chat/index.ts

echo "[4/4] ทดสอบ health..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://${PROJECT_REF}.supabase.co/functions/v1/ai-chat/health" || echo "000")
if [ "$STATUS" = "200" ]; then
  echo "  ✓ Health: 200 OK"
else
  echo "  ⚠ Health: $STATUS (ตรวจสอบ Supabase Dashboard)"
fi

echo ""
echo "=========================================="
echo "  เสร็จสิ้น"
echo "=========================================="
echo ""
echo "ทดสอบ auth: npm run test:negative"
echo "Manual: หน้า Consultant ถาม 'ภาพรวมชั้นเรียน...' (ดู docs/AI-STRICT-TESTS.md)"
echo ""
