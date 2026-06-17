#!/bin/bash

# Test script for plc-bundle-draft edge function
# Usage: ./scripts/test-plc-bundle-draft.sh [JWT_TOKEN]

set -e

PROJECT_ID="ebyelctqcdhjmqujeskx"
FUNCTION_URL="https://${PROJECT_ID}.supabase.co/functions/v1/plc-bundle-draft"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k"

# Use provided JWT token or prompt for it
if [ -z "$1" ]; then
  echo "⚠️  No JWT token provided."
  echo "To get a JWT token:"
  echo "1. Open browser DevTools on your app"
  echo "2. Go to Application > Local Storage > https://ebyelctqcdhjmqujeskx.supabase.co"
  echo "3. Find 'sb-ebyelctqcdhjmqujeskx-auth-token' and copy the 'access_token' value"
  echo ""
  read -p "Enter JWT token (or press Enter to use anon key only): " JWT_TOKEN

  if [ -z "$JWT_TOKEN" ]; then
    echo "⚠️  Using anon key only (request will likely fail auth check)"
    JWT_TOKEN=""
  fi
else
  JWT_TOKEN="$1"
fi

# Prepare test payload
TEST_PAYLOAD='{
  "items": [
    {
      "id": 1,
      "teacher_id": "test-teacher-1",
      "teacher_name": "ครูทดสอบ 1",
      "subject": "คณิตศาสตร์",
      "grade_level": "ป.4",
      "classroom": "4/1",
      "issue_type": "MasteryDrop",
      "severity": "high",
      "detail": "คะแนนเฉลี่ยลดลง 1.2 คะแนน ในหน่วย การคูณ",
      "metric_label": "ผลต่างคะแนน",
      "metric_value": 1.2
    },
    {
      "id": 2,
      "teacher_id": "test-teacher-1",
      "teacher_name": "ครูทดสอบ 1",
      "subject": "คณิตศาสตร์",
      "grade_level": "ป.3",
      "classroom": "3/1",
      "issue_type": "UnitBlindSpot",
      "severity": "medium",
      "detail": "นักเรียนทำถูกเพียง 42% ในหน่วย การหาร",
      "metric_label": "เปอร์เซ็นต์ถูก",
      "metric_value": 42
    },
    {
      "id": 3,
      "teacher_id": "test-teacher-2",
      "teacher_name": "ครูทดสอบ 2",
      "subject": "คณิตศาสตร์",
      "grade_level": "ป.4",
      "classroom": "4/2",
      "issue_type": "MasteryDrop",
      "severity": "high",
      "detail": "คะแนนเฉลี่ยลดลง 0.8 คะแนน ในหน่วย การคูณ",
      "metric_label": "ผลต่างคะแนน",
      "metric_value": 0.8
    }
  ],
  "subject": "คณิตศาสตร์",
  "gradeBand": "ป.3-4"
}'

echo "🚀 Testing plc-bundle-draft edge function..."
echo "📍 URL: $FUNCTION_URL"
echo ""

# Make request
if [ -n "$JWT_TOKEN" ]; then
  echo "🔐 Using authenticated JWT token"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -d "$TEST_PAYLOAD")
else
  echo "🔓 Using anon key only (no auth token)"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -H "apikey: $ANON_KEY" \
    -d "$TEST_PAYLOAD")
fi

# Parse response
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "📊 Response Status: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Success!"
  echo ""
  echo "📄 Response Body (formatted):"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "401" ]; then
  echo "❌ Authentication failed (401)"
  echo "You need a valid JWT token from an authenticated user."
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ Request failed with status $HTTP_CODE"
  echo ""
  echo "Response:"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "---"
echo "💡 Tip: To get a JWT token, log in to your app and check browser DevTools > Application > Local Storage"
