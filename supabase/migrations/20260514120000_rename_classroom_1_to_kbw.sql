-- Rename classroom "1" → "KBW" across all tables
-- ห้อง 1 ทุกชั้น (ป.1-6) = KBW track ตั้งแต่ ป.1 เป็นต้นมา
-- Rollback: UPDATE ... SET classroom = '1' WHERE classroom = 'KBW'

UPDATE public.teaching_logs
SET classroom = 'KBW'
WHERE classroom = '1';

UPDATE public.students
SET classroom = 'KBW'
WHERE classroom = '1';

UPDATE public.unit_assessments
SET classroom = 'KBW'
WHERE classroom = '1';

UPDATE public.lesson_plan_snapshots
SET classroom = 'KBW'
WHERE classroom = '1';

UPDATE public.pivot_events
SET classroom = 'KBW'
WHERE classroom = '1';

UPDATE public.strike_counter
SET classroom = 'KBW'
WHERE classroom = '1';
