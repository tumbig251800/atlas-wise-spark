/**
 * WP-S0 Safety Containment regression tests for usePlcSessions.
 *
 * Guarantee: this PLC-save path must NOT close/verify any action_plan_items — it
 * records ONLY the PLC session, regardless of outcome_type (including "resolved").
 * The DB-enforced closure guard (verified requires a monitoring result) is added
 * later in WP6; this test only pins the PLC-save side of the loop.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---- Mocks ----------------------------------------------------------------
const h = vi.hoisted(() => {
  const fromCalls: string[] = [];
  const toastCalls: Array<{ title?: string; description?: string }> = [];
  const responses: Record<string, { data: unknown; error: unknown }> = {};

  function makeBuilder(table: string) {
    let mode: "read" | "write" = "read";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {};
    for (const m of ["select", "eq", "in", "order", "contains", "not", "gte", "lte", "single", "maybeSingle", "limit"]) {
      b[m] = () => b;
    }
    b.insert = () => { mode = "write"; return b; };
    b.update = () => { mode = "write"; return b; };
    b.delete = () => { mode = "write"; return b; };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    b.then = (resolve: any, reject: any) => {
      const res = responses[`${table}:${mode}`] ?? { data: mode === "read" ? [] : null, error: null };
      return Promise.resolve(res).then(resolve, reject);
    };
    return b;
  }

  const supabase = {
    from: (table: string) => { fromCalls.push(table); return makeBuilder(table); },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toast = (arg: any) => { toastCalls.push(arg); };
  return { fromCalls, toastCalls, responses, supabase, toast };
});

vi.mock("@/lib/atlasSupabase", () => ({ supabase: h.supabase }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }) }));

import { usePlcSessions } from "@/hooks/usePlcSessions";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("usePlcSessions — WP-S0 safety containment", () => {
  beforeEach(() => {
    h.fromCalls.length = 0;
    h.toastCalls.length = 0;
    for (const k of Object.keys(h.responses)) delete h.responses[k];
  });

  it('outcome "resolved" saves the PLC session but never touches action_plan_items', async () => {
    h.responses["plc_sessions:write"] = {
      data: { id: "sess-1", outcome_type: "resolved", linked_action_item_ids: [10, 11], session_date: "2026-07-21" },
      error: null,
    };

    const { result } = renderHook(() => usePlcSessions(), { wrapper });
    await result.current.savePlcSession.mutateAsync({
      session_date: "2026-07-21",
      outcome_type: "resolved",
      linked_action_item_ids: [10, 11],
      topic: "t",
      problem_statement: "p",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(h.fromCalls).toContain("plc_sessions");
    // The core invariant: no write path into action_plan_items.
    expect(h.fromCalls).not.toContain("action_plan_items");

    await waitFor(() => expect(h.toastCalls.length).toBeGreaterThan(0));
    const last = h.toastCalls.at(-1)!;
    expect(last.title).toBe("บันทึก PLC สำเร็จ");
    // Success message must not claim the case was closed.
    expect(last.description ?? "").not.toContain("ปิด");
  });

  it('outcome "continue_plc" does not close or dismiss any action item', async () => {
    h.responses["plc_sessions:write"] = {
      data: { id: "sess-2", outcome_type: "continue_plc", linked_action_item_ids: [20], session_date: "2026-07-21" },
      error: null,
    };

    const { result } = renderHook(() => usePlcSessions(), { wrapper });
    await result.current.savePlcSession.mutateAsync({
      session_date: "2026-07-21",
      outcome_type: "continue_plc",
      linked_action_item_ids: [20],
      topic: "t",
      problem_statement: "p",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(h.fromCalls).not.toContain("action_plan_items");
  });

  it('outcome "need_supervision" does not close or dismiss any action item', async () => {
    h.responses["plc_sessions:write"] = {
      data: { id: "sess-3", outcome_type: "need_supervision", linked_action_item_ids: [30], session_date: "2026-07-21" },
      error: null,
    };

    const { result } = renderHook(() => usePlcSessions(), { wrapper });
    await result.current.savePlcSession.mutateAsync({
      session_date: "2026-07-21",
      outcome_type: "need_supervision",
      linked_action_item_ids: [30],
      topic: "t",
      problem_statement: "p",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    expect(h.fromCalls).not.toContain("action_plan_items");
  });
});
