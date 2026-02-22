
-- Clean corrupted classroom data in teaching_logs
UPDATE teaching_logs 
SET classroom = regexp_replace(classroom, '^(\d+)-[ก-ฮ].*$', '\1')
WHERE classroom ~ '^\d+-[ก-ฮ]';

UPDATE teaching_logs 
SET classroom = regexp_replace(classroom, '^(\d+)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$', '\1', 'i')
WHERE classroom ~* '^\d+-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';

-- Clean corrupted classroom data in diagnostic_events
UPDATE diagnostic_events 
SET classroom = regexp_replace(classroom, '^(\d+)-[ก-ฮ].*$', '\1')
WHERE classroom ~ '^\d+-[ก-ฮ]';

UPDATE diagnostic_events 
SET classroom = regexp_replace(classroom, '^(\d+)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$', '\1', 'i')
WHERE classroom ~* '^\d+-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';

-- Clean corrupted classroom data in remedial_tracking
UPDATE remedial_tracking 
SET classroom = regexp_replace(classroom, '^(\d+)-[ก-ฮ].*$', '\1')
WHERE classroom ~ '^\d+-[ก-ฮ]';

UPDATE remedial_tracking 
SET classroom = regexp_replace(classroom, '^(\d+)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$', '\1', 'i')
WHERE classroom ~* '^\d+-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';

-- Clean corrupted scope_id in strike_counter (contains classroom in format like "ป.2-1-ม.ค.-math")
UPDATE strike_counter 
SET scope_id = regexp_replace(scope_id, '(\d+)-[ก-ฮ][^-]*', '\1', 'g')
WHERE scope_id ~ '\d+-[ก-ฮ]';

UPDATE strike_counter 
SET scope_id = regexp_replace(scope_id, '(\d+)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^-]*', '\1', 'gi')
WHERE scope_id ~* '\d+-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
