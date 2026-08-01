-- action_plan_items #513 (ครูวิลาวัลย์ แสงสว่าง, MasteryDrop, ป.2/2)
-- was auto-resolved by WF-5 (mastery avg > 2.5 for 2 consecutive weeks) but
-- never verified/dismissed afterward — the teacher left the school before
-- anyone confirmed it, so it sat indefinitely in the "active queue"
-- (isActiveQueueStatus treats 'resolved' as active by design, per
-- src/pages/actionBoardStatus.ts, until a human verifies or dismisses it).
--
-- WF-5's auto-resolution was a genuine metric-based confirmation (not a
-- teacher's unverified claim), so this closes it as verified rather than
-- dismissed. Scoped to this single row by primary key.

UPDATE public.action_plan_items
SET
  status = 'verified',
  resolved_at = COALESCE(resolved_at, now()),
  verified_at = now(),
  resolution_note = COALESCE(resolution_note, '') ||
    E'\n[2569-08-01] ยืนยันปิดเคสด้วยมือ — WF-5 auto-resolved แล้วแต่ไม่มีผู้ยืนยันต่อเนื่องจากครูลาออก',
  updated_at = now()
WHERE id = 513
  AND status = 'resolved';
