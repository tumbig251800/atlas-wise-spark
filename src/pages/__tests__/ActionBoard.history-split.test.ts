/**
 * WP-S0.2 regression test for ActionBoard case-status classification.
 *
 * "resolved" must remain an ACTIVE (waiting-for-monitoring) state and must never
 * be classified as a closed/history case. History = verified | dismissed only.
 */
import { describe, it, expect } from "vitest";
import { isActiveQueueStatus, isHistoryStatus } from "@/pages/actionBoardStatus";

describe("ActionBoard case-status classification — WP-S0.2", () => {
  it("keeps 'resolved' in the active queue and out of history", () => {
    expect(isActiveQueueStatus("resolved")).toBe(true);
    expect(isHistoryStatus("resolved")).toBe(false);
  });

  it("treats open and watching as active", () => {
    expect(isActiveQueueStatus("open")).toBe(true);
    expect(isActiveQueueStatus("watching")).toBe(true);
  });

  it("treats only verified and dismissed as closed (history)", () => {
    expect(isHistoryStatus("verified")).toBe(true);
    expect(isHistoryStatus("dismissed")).toBe(true);
    expect(isActiveQueueStatus("verified")).toBe(false);
    expect(isActiveQueueStatus("dismissed")).toBe(false);
  });

  it("classifies active and history as mutually exclusive for every status", () => {
    for (const s of ["open", "watching", "resolved", "verified", "dismissed"]) {
      expect(isActiveQueueStatus(s) && isHistoryStatus(s)).toBe(false);
    }
  });
});
