-- Phase 3: Delete duplicate teaching_logs and related data
-- Step 1: Delete diagnostic_events, remedial_tracking, strike_counter, pivot_events for duplicate logs
WITH duplicates AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY teaching_date, grade_level, classroom, subject, topic
      ORDER BY created_at ASC
    ) as rn
  FROM teaching_logs
)
DELETE FROM diagnostic_events
WHERE teaching_log_id IN (SELECT id FROM duplicates WHERE rn > 1);
