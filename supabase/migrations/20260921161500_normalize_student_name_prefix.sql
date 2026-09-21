-- Normalise the title prefix + spacing of student names on every write (2026-09-21).
--   "ด.ช.สมชาย  ใจดี" / "เด็กชายสมชาย ใจดี"  ->  "เด็กชาย สมชาย ใจดี"
--   "ด. ญ. สมหญิง รักเรียน"                   ->  "เด็กหญิง สมหญิง รักเรียน"
-- Only the prefix and whitespace change; the name itself is never touched.
-- Done in the database (not the app) because names also arrive from import-pbl,
-- n8n, MCP clients and the exam/reading sync, which live outside this repo.
-- Existing rows were cleaned the same day; old values are in
-- backup.student_name_prefix_20260921.

create or replace function public.normalize_student_name(n text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when n is null then null else
    regexp_replace(regexp_replace(
      trim(regexp_replace(n, '\s+', ' ', 'g')),
      '^(ด\.\s*ช\.|เด็กชาย)\s*', 'เด็กชาย '),
    '^(ด\.\s*ญ\.|เด็กหญิง)\s*', 'เด็กหญิง ')
  end
$$;

create or replace function public.trg_normalize_student_name()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_table_name = 'students' then
    new.first_name := public.normalize_student_name(new.first_name);
  else
    new.student_name := public.normalize_student_name(new.student_name);
  end if;
  return new;
end
$$;

-- The trigger runs with the privileges of whoever writes the row (teachers via
-- the app = authenticated), so they must be able to execute the helper.
-- (Revoking this in production broke nothing only because it was restored
-- within ~1 minute — keep these grants.)
grant execute on function public.normalize_student_name(text) to anon, authenticated, service_role;
grant execute on function public.trg_normalize_student_name() to anon, authenticated, service_role;

drop trigger if exists trg_normalize_student_name on public.students;
create trigger trg_normalize_student_name
  before insert or update of first_name on public.students
  for each row execute function public.trg_normalize_student_name();

drop trigger if exists trg_normalize_student_name on public.unit_assessments;
create trigger trg_normalize_student_name
  before insert or update of student_name on public.unit_assessments
  for each row execute function public.trg_normalize_student_name();

drop trigger if exists trg_normalize_student_name on public.pbl_assessments;
create trigger trg_normalize_student_name
  before insert or update of student_name on public.pbl_assessments
  for each row execute function public.trg_normalize_student_name();

drop trigger if exists trg_normalize_student_name on public.exam_student_results;
create trigger trg_normalize_student_name
  before insert or update of student_name on public.exam_student_results
  for each row execute function public.trg_normalize_student_name();

drop trigger if exists trg_normalize_student_name on public.reading_results;
create trigger trg_normalize_student_name
  before insert or update of student_name on public.reading_results
  for each row execute function public.trg_normalize_student_name();
