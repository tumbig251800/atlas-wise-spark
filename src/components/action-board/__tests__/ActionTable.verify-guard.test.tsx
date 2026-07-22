/**
 * WP-S0.1 regression test for ActionTable.
 *
 * A resolved PLC Impact Loop case must NOT invite the user to Verify/close it.
 * Instead the row shows a "รอติดตามผล" (waiting-for-monitoring) state. The
 * DB-enforced closure guard lands in WP6.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/hooks/useNidetVisits", () => ({
  useNidetVisits: () => ({ fetchVisit: vi.fn(async () => null) }),
}));

// Chainable supabase stub — the row expansion issues a plc_sessions read.
const supa = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  for (const m of ["select", "eq", "in", "order", "contains", "not", "gte", "limit", "single", "maybeSingle"]) {
    b[m] = () => b;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  b.then = (resolve: any) => Promise.resolve({ data: [], error: null }).then(resolve);
  return { supabase: { from: () => b } };
});
vi.mock("@/lib/atlasSupabase", () => ({ supabase: supa.supabase }));

import { ActionTable } from "@/components/action-board/ActionTable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const resolvedItem: any = {
  id: 1,
  status: "resolved",
  issue_type: "MasteryDrop",
  severity: "high",
  teacher_name: "ครูทดสอบ",
  grade_level: "ป.4",
  classroom: "1",
  subject: "คณิตศาสตร์",
  metric_label: "คะแนนรวม",
  metric_value: null,
  mastery_avg_previous: null,
  mastery_avg_recent: null,
  detail: null,
  due_date: null,
  watch_started_at: null,
};

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("ActionTable — WP-S0.1 resolved case does not invite Verify", () => {
  it("shows a waiting-for-monitoring state instead of a Verify button", async () => {
    const onVerify = vi.fn();
    render(
      <ActionTable
        items={[resolvedItem]}
        onVerify={onVerify}
        onDismiss={vi.fn()}
        onPass={vi.fn()}
        onResolve={vi.fn()}
      />,
      { wrapper },
    );

    // Expand the row to reveal the action buttons.
    fireEvent.click(screen.getByText("ครูทดสอบ"));

    await waitFor(() => expect(screen.getByText("รอติดตามผล")).toBeTruthy());

    // No active Verify affordance for this resolved PLC Impact Loop case.
    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();
    expect(onVerify).not.toHaveBeenCalled();
  });
});
