#!/bin/bash

# Test script for plc-bundle-draft using Supabase CLI
# This uses the CLI's built-in authentication
# Usage: ./scripts/test-plc-bundle-draft-cli.sh

set -e

PROJECT_REF="ebyelctqcdhjmqujeskx"

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

echo "🚀 Testing plc-bundle-draft edge function (via Supabase CLI)..."
echo "📍 Project: $PROJECT_REF"
echo "📍 Function: plc-bundle-draft"
echo ""

# Create temp file for payload
TEMP_FILE=$(mktemp)
echo "$TEST_PAYLOAD" > "$TEMP_FILE"

echo "📦 Test Payload:"
cat "$TEMP_FILE" | jq '.' 2>/dev/null || cat "$TEMP_FILE"
echo ""
echo "⏳ Invoking function..."
echo ""

# Invoke function using Supabase CLI
RESPONSE=$(npx supabase functions invoke plc-bundle-draft \
  --project-ref "$PROJECT_REF" \
  --body "$TEST_PAYLOAD" \
  2>&1)

# Clean up
rm -f "$TEMP_FILE"

echo "📊 Response:"
echo "$RESPONSE"
echo ""

# Try to parse and pretty-print if it's JSON
if echo "$RESPONSE" | jq '.' > /dev/null 2>&1; then
  echo ""
  echo "📄 Formatted Response:"
  echo "$RESPONSE" | jq '.'

  # Save to file
  echo "$RESPONSE" | jq '.' > /tmp/plc-bundle-draft-response.json 2>/dev/null
  echo ""
  echo "💾 Response saved to: /tmp/plc-bundle-draft-response.json"
fi

echo ""
echo "---"
echo "✨ Test completed"
