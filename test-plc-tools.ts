#!/usr/bin/env -S deno run --allow-net --allow-env

const ATLAS_MCP_URL = "https://ebyelctqcdhjmqujeskx.supabase.co/functions/v1/atlas-mcp";

async function callMcpTool(toolName: string, args: any = {}) {
  const response = await fetch(ATLAS_MCP_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args }
    })
  });

  const data = await response.json();
  return data;
}

console.log("🧪 Testing New PLC Tools in ATLAS MCP v2.2.0\n");

// Test 1: atlas_plc_effectiveness
console.log("📊 Test 1: atlas_plc_effectiveness");
const test1 = await callMcpTool("atlas_plc_effectiveness", {
  date_from: "2026-05-01",
  date_to: "2026-06-02"
});
console.log(JSON.stringify(test1, null, 2));
console.log("\n---\n");

// Test 2: atlas_plc_coverage_gap
console.log("🔍 Test 2: atlas_plc_coverage_gap");
const test2 = await callMcpTool("atlas_plc_coverage_gap", {
  severity_filter: "all"
});
console.log(JSON.stringify(test2, null, 2));
console.log("\n---\n");

// Test 3: atlas_plc_timeline
console.log("📅 Test 3: atlas_plc_timeline");
const test3 = await callMcpTool("atlas_plc_timeline", {
  date_from: "2026-05-01",
  date_to: "2026-06-02"
});
console.log(JSON.stringify(test3, null, 2));
console.log("\n---\n");

// Test 4: atlas_cross_plc_opportunities
console.log("🔗 Test 4: atlas_cross_plc_opportunities");
const test4 = await callMcpTool("atlas_cross_plc_opportunities", {
  min_overlap: 2
});
console.log(JSON.stringify(test4, null, 2));
console.log("\n---\n");

// Test 5: atlas_plc_recommendations
console.log("💡 Test 5: atlas_plc_recommendations");
const test5 = await callMcpTool("atlas_plc_recommendations", {
  max_plans: 3,
  min_coverage_percent: 20
});
console.log(JSON.stringify(test5, null, 2));
console.log("\n---\n");

console.log("✅ All tests completed!");
