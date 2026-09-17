create table public.zz_fix_p2_subject_name_backup_20260917 as
select 'unit_assessments'::text as src_table, ua.id, to_jsonb(ua) as row_data, now() as backed_up_at
from public.unit_assessments ua where ua.subject = 'การคำนวณ'
union all
select 'unit_assessment_setups', s.id, to_jsonb(s), now()
from public.unit_assessment_setups s where s.subject = 'การคำนวณ';
alter table public.zz_fix_p2_subject_name_backup_20260917 enable row level security;
revoke all on public.zz_fix_p2_subject_name_backup_20260917 from anon, authenticated;

update public.unit_assessments set subject = 'การคิดคำนวณ' where subject = 'การคำนวณ';
update public.unit_assessment_setups set subject = 'การคิดคำนวณ' where subject = 'การคำนวณ';
