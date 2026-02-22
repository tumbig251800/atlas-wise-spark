

# Two Production-Hardening Fixes for ATLAS Strict Mode v1.3

## Fix 1: Unique Index for Canonical Session Row (DB Guarantee)

Add a partial unique index to enforce at the database level that only ONE row with `student_id IS NULL` can exist per `teaching_log_id`.

Migration SQL:

```text
CREATE UNIQUE INDEX IF NOT EXISTS ux_diag_session_row
ON public.diagnostic_events (teaching_log_id)
WHERE student_id IS NULL;
```

This prevents any edge function retry or race condition from creating duplicate session rows.

---

## Fix 2: Align Canonical Row `intervention_size` with `decisionObject`

Currently, the canonical session row upsert (lines 344-355) spreads `commonDiagFields` which has `intervention_size: interventionSize` (the threshold-derived value like "individual", "small-group", "pivot"). But the `decisionObject` may override this to "force-pivot" or "plan-fail" based on class strike logic.

The fix: override `intervention_size` in both the UPDATE and INSERT paths to use `decisionObject.intervention_size`.

### Current code (lines 344-355):

```text
if (existingSession) {
  await supabase
    .from("diagnostic_events")
    .update({ ...commonDiagFields, decision_object: decisionObject })
    .eq("id", existingSession.id);
} else {
  await supabase
    .from("diagnostic_events")
    .insert({ ...commonDiagFields, student_id: null, decision_object: decisionObject });
}
```

### Fixed code:

```text
if (existingSession) {
  await supabase
    .from("diagnostic_events")
    .update({ ...commonDiagFields, intervention_size: decisionObject.intervention_size, decision_object: decisionObject })
    .eq("id", existingSession.id);
} else {
  await supabase
    .from("diagnostic_events")
    .insert({ ...commonDiagFields, student_id: null, intervention_size: decisionObject.intervention_size, decision_object: decisionObject });
}
```

The `intervention_size` override comes AFTER the spread of `commonDiagFields`, so it correctly replaces the threshold-derived value with the decision-object-derived value (which accounts for force-pivot/plan-fail).

Per-student rows (line 370-374) continue using `commonDiagFields` with the threshold-derived `interventionSize` -- this is correct since per-student rows don't carry decision_object.

---

## Verification

After deploying, run this query for any recent teaching log:

```text
SELECT teaching_log_id, student_id, intervention_size,
       decision_object->>'intervention_size' AS do_intervention_size
FROM diagnostic_events
WHERE teaching_log_id = '<some_log_uuid>'
ORDER BY student_id NULLS FIRST;
```

Expected: exactly ONE row where `student_id IS NULL`, and `intervention_size` column matches `do_intervention_size`.

---

## Files Changed

| File | Action |
|---|---|
| Migration SQL | CREATE -- partial unique index `ux_diag_session_row` |
| `supabase/functions/atlas-diagnostic/index.ts` | MODIFY -- override `intervention_size` in canonical row upsert (lines 348, 354) |

