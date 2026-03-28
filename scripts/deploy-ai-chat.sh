#!/bin/bash
# ATLAS — Deploy ai-chat Edge Function
#
# รัน: ./scripts/deploy-ai-chat.sh
# หรือ: npm run deploy:ai-chat

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT_REF="ebyelctqcdhjmqujeskx"

echo "=========================================="
echo "  ATLAS: Deploy ai-chat"
echo "=========================================="
echo ""

echo "[1/2] Deploy ai-chat..."
npx supabase functions deploy ai-chat --project-ref "$PROJECT_REF"

echo "[2/2] ทดสอบ health..."
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
