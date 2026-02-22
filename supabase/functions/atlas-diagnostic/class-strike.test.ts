// Class Strike Escalation Tests — ATLAS v1.3
// Tests the update_class_strike RPC logic

import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Pure function simulation of update_class_strike logic
// (mirrors the DB RPC for unit testing without DB dependency)
interface StrikeState {
  strike_count: number;
  last_session_id: string | null;
}

interface StrikeResult {
  action: string;
  strike_count: number;
  pivot_event_id?: string;
  evidence_refs?: string[];
}

function updateClassStrike(
  state: StrikeState | null,
  sessionId: string,
  gapRate: number,
  isSystemGap: boolean,
  isA2Gap: boolean
): { result: StrikeResult; newState: StrikeState } {
  // 1. A2-Gap: skip entirely
  if (isA2Gap) {
    return {
      result: { action: "skip_a2", strike_count: state?.strike_count ?? 0 },
      newState: state ?? { strike_count: 0, last_session_id: null },
    };
  }

  // 2. System-Gap: freeze state
  if (isSystemGap) {
    return {
      result: { action: "skip_system_gap", strike_count: state?.strike_count ?? 0 },
      newState: state ?? { strike_count: 0, last_session_id: null },
    };
  }

  const prevSessionId = state?.last_session_id ?? null;

  if (gapRate > 40) {
    const newCount = (state?.strike_count ?? 0) + 1;

    if (newCount >= 2) {
      const pivotId = crypto.randomUUID();
      return {
        result: {
          action: "force_pivot",
          strike_count: 0,
          pivot_event_id: pivotId,
          evidence_refs: [prevSessionId ?? "", sessionId],
        },
        newState: { strike_count: 0, last_session_id: null },
      };
    }

    return {
      result: { action: "plan_fail", strike_count: newCount },
      newState: { strike_count: newCount, last_session_id: sessionId },
    };
  }

  // gap_rate <= 40: reset
  return {
    result: { action: "reset", strike_count: 0 },
    newState: { strike_count: 0, last_session_id: null },
  };
}

// ─── Test 1: Escalation Correct ───
Deno.test("Test 1: Escalation - 16% → 46% → 50%", () => {
  const session1 = crypto.randomUUID();
  const session2 = crypto.randomUUID();
  const session3 = crypto.randomUUID();

  // Session 1: 16% → reset (strike = 0)
  const r1 = updateClassStrike(null, session1, 16, false, false);
  assertEquals(r1.result.action, "reset");
  assertEquals(r1.result.strike_count, 0);

  // Session 2: 46% → plan_fail (strike = 1, NO pivot)
  const r2 = updateClassStrike(r1.newState, session2, 46, false, false);
  assertEquals(r2.result.action, "plan_fail");
  assertEquals(r2.result.strike_count, 1);
  assertEquals(r2.result.pivot_event_id, undefined);

  // Session 3: 50% → force_pivot (strike = 2 → reset to 0)
  const r3 = updateClassStrike(r2.newState, session3, 50, false, false);
  assertEquals(r3.result.action, "force_pivot");
  assertEquals(r3.result.strike_count, 0);
  assertNotEquals(r3.result.pivot_event_id, undefined);

  // Evidence refs: [session2, session3]
  assertEquals(r3.result.evidence_refs![0], session2);
  assertEquals(r3.result.evidence_refs![1], session3);
});

// ─── Test 2: Reset When Drop Below 40% ───
Deno.test("Test 2: Reset - 50% → 30% → 45%", () => {
  const s1 = crypto.randomUUID();
  const s2 = crypto.randomUUID();
  const s3 = crypto.randomUUID();

  // Session 1: 50% → strike = 1
  const r1 = updateClassStrike(null, s1, 50, false, false);
  assertEquals(r1.result.action, "plan_fail");
  assertEquals(r1.result.strike_count, 1);

  // Session 2: 30% → reset to 0
  const r2 = updateClassStrike(r1.newState, s2, 30, false, false);
  assertEquals(r2.result.action, "reset");
  assertEquals(r2.result.strike_count, 0);

  // Session 3: 45% → strike = 1 (NOT 2, no pivot)
  const r3 = updateClassStrike(r2.newState, s3, 45, false, false);
  assertEquals(r3.result.action, "plan_fail");
  assertEquals(r3.result.strike_count, 1);
  assertEquals(r3.result.pivot_event_id, undefined);
});

// ─── Test 3: Topic Switch Isolation ───
Deno.test("Test 3: Topic isolation - different topics don't share strikes", () => {
  const sA = crypto.randomUUID();
  const sB = crypto.randomUUID();

  // Topic X: 50% → strike(X) = 1
  const rX = updateClassStrike(null, sA, 50, false, false);
  assertEquals(rX.result.strike_count, 1);

  // Topic Y: 50% → strike(Y) = 1 (separate state, starts from null)
  const rY = updateClassStrike(null, sB, 50, false, false);
  assertEquals(rY.result.strike_count, 1);

  // Neither should be 2
  assertEquals(rX.result.action, "plan_fail");
  assertEquals(rY.result.action, "plan_fail");
});

// ─── Test 4: System-Gap Does Not Reset ───
Deno.test("Test 4: System-gap freezes state", () => {
  const s1 = crypto.randomUUID();
  const s2 = crypto.randomUUID();
  const s3 = crypto.randomUUID();

  // Session 1: 50% → strike = 1
  const r1 = updateClassStrike(null, s1, 50, false, false);
  assertEquals(r1.result.strike_count, 1);

  // Session 2: system-gap + 60% → strike remains 1 (frozen)
  const r2 = updateClassStrike(r1.newState, s2, 60, true, false);
  assertEquals(r2.result.action, "skip_system_gap");
  assertEquals(r2.result.strike_count, 1);

  // Session 3: 50% → strike = 2 → pivot
  const r3 = updateClassStrike(r2.newState, s3, 50, false, false);
  assertEquals(r3.result.action, "force_pivot");
  assertEquals(r3.result.strike_count, 0);

  // Evidence: [s1, s3] (s2 skipped because system-gap)
  assertEquals(r3.result.evidence_refs![0], s1);
  assertEquals(r3.result.evidence_refs![1], s3);
});

// ─── Test 5: A2 Immediate Referral ───
Deno.test("Test 5: A2-gap skips class strike entirely", () => {
  const s1 = crypto.randomUUID();

  // Existing state with strike = 1
  const state: StrikeState = { strike_count: 1, last_session_id: crypto.randomUUID() };

  const r = updateClassStrike(state, s1, 80, false, true);
  assertEquals(r.result.action, "skip_a2");
  // Strike count unchanged
  assertEquals(r.result.strike_count, 1);
});

// ─── Test 6: Concurrency simulation ───
Deno.test("Test 6: Sequential simulation of concurrent calls", () => {
  const sA = crypto.randomUUID();
  const sB = crypto.randomUUID();

  // With DB locking (SELECT FOR UPDATE), calls serialize.
  // Simulate: A gets lock first → strike=1, B gets lock second → strike=2 → pivot

  // Call A processes first
  const rA = updateClassStrike(null, sA, 50, false, false);
  assertEquals(rA.result.action, "plan_fail");
  assertEquals(rA.result.strike_count, 1);

  // Call B processes second (sees state from A)
  const rB = updateClassStrike(rA.newState, sB, 55, false, false);
  assertEquals(rB.result.action, "force_pivot");
  assertEquals(rB.result.strike_count, 0);

  // Exactly 1 pivot, with correct evidence
  assertNotEquals(rB.result.pivot_event_id, undefined);
  assertEquals(rB.result.evidence_refs![0], sA);
  assertEquals(rB.result.evidence_refs![1], sB);

  // Final state is reset
  assertEquals(rB.newState.strike_count, 0);
  assertEquals(rB.newState.last_session_id, null);
});
