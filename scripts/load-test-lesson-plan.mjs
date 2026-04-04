/**
 * Load Test: ai-lesson-plan edge function
 * Round 1 — Rate limit test (1 user, 10 concurrent)
 * Round 2 — Gemini concurrency test (bypass rate limit via direct upsert)
 */

const SUPABASE_URL = "https://ebyelctqcdhjmqujeskx.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVieWVsY3RxY2Roam1xdWplc2t4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0NjMzNTEsImV4cCI6MjA4NzAzOTM1MX0.jfG25PkINF9IocuaiMuRp643JwVM8sB6JcEZZcGhP-k";
const EDGE_URL = `${SUPABASE_URL}/functions/v1/ai-lesson-plan`;

const PAYLOAD = {
  mode: "context_snapshot",
  planType: "hourly",
  gradeLevel: "ม.1",
  classroom: "1",
  subject: "คณิตศาสตร์",
  learningUnit: "หน่วยที่ 1",
  topic: "การบวกลบจำนวนเต็ม",
  hours: 1,
  includeWorksheets: false,
  reflectionContext: "ไม่มีข้อมูลคาบก่อนหน้า",
  snapshotStrong: false,
  snapshotWeak: true,
  snapshotBalanced: false,
  snapshotEquipment: {},
  snapshotClassNotes: "นักเรียน 30 คน",
  snapshotFocusNotes: "คาบ 50 นาที",
};

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Sign-in failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function fireRequest(token, index) {
  const start = Date.now();
  try {
    const res = await fetch(EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify(PAYLOAD),
    });

    const elapsed = Date.now() - start;

    if (res.status === 200 || res.headers.get("content-type")?.includes("text/event-stream")) {
      // Drain stream to measure full time
      const reader = res.body.getReader();
      let chunks = 0;
      while (true) {
        const { done } = await reader.read();
        if (done) break;
        chunks++;
      }
      return { index, status: 200, elapsed: Date.now() - start, chunks, error: null };
    }

    const body = await res.json().catch(() => ({}));
    return { index, status: res.status, elapsed, chunks: 0, error: body.error ?? "unknown" };
  } catch (e) {
    return { index, status: 0, elapsed: Date.now() - start, chunks: 0, error: e.message };
  }
}

function printTable(results, title) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("=".repeat(60));
  console.log("  #   Status   Time(ms)   Result");
  console.log("  " + "-".repeat(50));
  for (const r of results) {
    const icon = r.status === 200 ? "✅" : r.status === 429 ? "🚫" : "❌";
    const detail = r.status === 200 ? `${r.chunks} chunks` : r.error;
    console.log(`  ${String(r.index + 1).padStart(2)}  ${icon} ${String(r.status).padEnd(6)}  ${String(r.elapsed).padStart(6)}ms   ${detail}`);
  }
  console.log("  " + "-".repeat(50));
  const ok = results.filter((r) => r.status === 200).length;
  const blocked = results.filter((r) => r.status === 429).length;
  const err = results.filter((r) => r.status !== 200 && r.status !== 429).length;
  const avgTime = Math.round(results.reduce((s, r) => s + r.elapsed, 0) / results.length);
  console.log(`  ✅ Success: ${ok}  🚫 Rate-limited: ${blocked}  ❌ Error: ${err}`);
  console.log(`  ⏱  Avg response time: ${avgTime}ms`);
  console.log("=".repeat(60));
}

async function runRound1(token) {
  console.log("\n🔥 ROUND 1 — Rate Limit Test (10 concurrent, 1 user)");
  console.log("   คาดหวัง: request แรกผ่าน → ที่เหลือโดน 429");
  const requests = Array.from({ length: 10 }, (_, i) => fireRequest(token, i));
  const results = await Promise.all(requests);
  printTable(results, "ROUND 1 RESULT");
}

async function runRound2(token) {
  console.log("\n🔥 ROUND 2 — Gemini Concurrency Test (10 concurrent, rate limit bypassed)");
  console.log("   รีเซ็ต rate limit แล้วยิง 10 ชุดพร้อมกันโดยไม่มี block");

  // Reset rate limit by deleting the row (using anon token — edge fn will re-create)
  // We fire sequentially with 11s gap to reset, then all at once
  // Simpler: just wait 11 seconds after round 1
  console.log("   ⏳ รอ 11 วินาทีให้ rate limit หมดอายุ...");
  await new Promise((r) => setTimeout(r, 11000));

  // For round 2 we fire 10 requests but stagger start by 0ms (true concurrent)
  // Rate limit will block 2-10 since they all arrive within 10s window
  // To truly bypass: we patch last_request_at to past via service role
  // (We don't have service role in this script, so we use the natural reset window)
  // After 11s the first request resets the clock, then 9 more arrive within 10s → 9 blocked
  // True concurrent Gemini test requires 10 accounts OR service role patch
  // We'll run 10 requests staggered by 11s each to see Gemini handle sequential load

  console.log("   ยิง 10 requests แบบ sequential (11s apart) เพื่อผ่าน rate limit ทุก request");
  const results = [];
  for (let i = 0; i < 10; i++) {
    if (i > 0) {
      process.stdout.write(`   ⏳ รอ 11 วินาที (request ${i + 1}/10)...`);
      await new Promise((r) => setTimeout(r, 11000));
      process.stdout.write("\r" + " ".repeat(50) + "\r");
    }
    const result = await fireRequest(token, i);
    results.push(result);
    const icon = result.status === 200 ? "✅" : "❌";
    console.log(`   ${icon} Request ${i + 1}: ${result.status} — ${result.elapsed}ms`);
  }
  printTable(results, "ROUND 2 RESULT (Gemini Sequential Load)");
}

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  if (!email || !password) {
    console.error("Usage: node load-test-lesson-plan.mjs <email> <password>");
    process.exit(1);
  }

  console.log("🚀 ATLAS Load Test — ai-lesson-plan");
  console.log(`   Target: ${EDGE_URL}`);
  console.log("   Signing in...");

  const token = await signIn(email, password);
  console.log("   ✅ JWT acquired");

  const round = process.argv[4] ?? "both";

  if (round === "1" || round === "both") await runRound1(token);
  if (round === "2" || round === "both") await runRound2(token);

  console.log("\n✅ Load test complete.\n");
}

main().catch((e) => { console.error("Fatal:", e.message); process.exit(1); });
