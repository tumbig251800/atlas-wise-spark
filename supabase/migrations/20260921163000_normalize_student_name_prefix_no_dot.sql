-- Also accept the dot-less abbreviations "ดช." / "ดญ." (used by the school-fee
-- system) in addition to "ด.ช." / "ด. ช." / "เด็กชาย" (2026-09-21).
--   "ดช.นวพล  คามนะสีลา"  ->  "เด็กชาย นวพล คามนะสีลา"
--   "ดญ. ภัทรภร ภูมิศักดิ์" ->  "เด็กหญิง ภัทรภร ภูมิศักดิ์"
-- The trailing dot stays required, so a name that merely starts with ดช/ดญ
-- is never touched. Triggers from 20260921161500 keep calling this function.

create or replace function public.normalize_student_name(n text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when n is null then null else
    regexp_replace(regexp_replace(
      trim(regexp_replace(n, '\s+', ' ', 'g')),
      '^(ด\.?\s*ช\.|เด็กชาย)\s*', 'เด็กชาย '),
    '^(ด\.?\s*ญ\.|เด็กหญิง)\s*', 'เด็กหญิง ')
  end
$$;

grant execute on function public.normalize_student_name(text) to anon, authenticated, service_role;
