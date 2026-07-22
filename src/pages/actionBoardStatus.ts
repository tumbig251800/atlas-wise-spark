// Case-status classification for the Action Board (WP-S0.2).
//
// "resolved" is an ACTIVE, waiting-for-monitoring state: the teacher marked the
// case done, but it cannot be closed until a monitoring result confirms it.
// Only "verified" and "dismissed" are closed (history) states. These two helpers
// are mutually exclusive and are the single source of truth for the
// queue-vs-history split rendered in ActionBoard.
export function isActiveQueueStatus(status: string | null | undefined): boolean {
  return status === "open" || status === "watching" || status === "resolved";
}

export function isHistoryStatus(status: string | null | undefined): boolean {
  return status === "verified" || status === "dismissed";
}
