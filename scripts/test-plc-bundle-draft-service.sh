#!/bin/bash

# Test script for plc-bundle-draft using SERVICE_ROLE_KEY
# This bypasses auth checks for testing purposes
# Usage: ./scripts/test-plc-bundle-draft-service.sh

set -e

PROJECT_ID="ebyelctqcdhjmqujeskx"
FUNCTION_URL="https://${PROJECT_ID}.supabase.co/functions/v1/plc-bundle-draft"

# Read service role key from .env or prompt
if [ -f ".env.local" ]; then
  SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d '=' -f2-)
elif [ -f ".env" ]; then
  SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env | cut -d '=' -f2-)
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "⚠️  SERVICE_ROLE_KEY not found in .env files"
  echo "Please provide it manually (or add SUPABASE_SERVICE_ROLE_KEY to .env)"
  echo ""
  read -p "Enter SERVICE_ROLE_KEY: " SERVICE_ROLE_KEY

  if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ No service role key provided. Exiting."
    exit 1
  fi
fi

# Prepare test payload
TEST_PAYLOAD='{
  "items": [
    {
      "id": 101,
      "teacher_id": "teacher-uuid-1",
      "teacher_name": "ครูสมชาย ใจดี",
      "subject": "คณิตศาสตร์",
      "grade_level": "ป.4",
      "classroom": "4/1",
      "issue_type": "MasteryDrop",
      "severity": "high",
      "detail": "คะแนนเฉลี่ยลดลง 1.2 คะแนน ในหน่วยการคูณ นักเรียนมีปัญหาในการท่องสูตรคูณ",
      "metric_label": "ผลต่างคะแนน",
      "metric_value": 1.2
    },
    {
      "id": 102,
      "teacher_id": "teacher-uuid-1",
      "teacher_name": "ครูสมชาย ใจดี",
      "subject": "คณิตศาสตร์",
      "grade_level": "ป.3",
      "classroom": "3/1",
      "issue_type": "UnitBlindSpot",
      "severity": "medium",
      "detail": "นักเรียนทำถูกเพียง 42% ในหน่วยการหาร ยังไม่เข้าใจแนวคิดการแบ่งส่วน",
      "metric_label": "เปอร์เซ็นต์ถูก",
      "metric_value": 42
    },
    {
      "id": 103,
      "teacher_id": "teacher-uuid-2",
      "teacher_name": "ครูสมหญิง รักการสอน",
      "subject": "คณิตศาสตร์",
      "grade_level": "ป.4",
      "classroom": "4/2",
      "issue_type": "MasteryDrop",
      "severity": "high",
      "detail": "คะแนนเฉลี่ยลดลง 0.8 คะแนน ในหน่วยการคูณ นักเรียนส่วนใหญ่สับสนในการคูณเลขสองหลัก",
      "metric_label": "ผลต่างคะแนน",
      "metric_value": 0.8
    }
  ],
  "subject": "คณิตศาสตร์",
  "gradeBand": "ป.3-4"
}'

echo "🚀 Testing plc-bundle-draft edge function (SERVICE_ROLE mode)..."
echo "📍 URL: $FUNCTION_URL"
echo ""
echo "🔐 Using SERVICE_ROLE_KEY for authentication"
echo ""

# Make request with service role key
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d "$TEST_PAYLOAD")

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Response Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Success!"
  echo ""
  echo "📄 Response Body (formatted):"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"

  # Save to file for inspection
  echo "$BODY" | jq '.' > /tmp/plc-bundle-draft-response.json 2>/dev/null
  echo ""
  echo "💾 Full response saved to: /tmp/plc-bundle-draft-response.json"
else
  echo "❌ Request failed with status $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "---"
echo "✨ Test completed"
