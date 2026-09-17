create or replace function kindergarten.fn_unit_trend(
  p_classroom text default null,
  p_term text default null,
  p_year text default null
)
returns table (
  room text,
  unit_no text,
  unit_name text,
  unit_at date,
  avg_score numeric,
  n bigint,
  students_covered bigint
)
language sql
stable
as $$
with cls as (
  select c.*
  from kindergarten.classrooms c
  where (
      p_classroom is null
      or c.name                                ilike '%'||p_classroom||'%'
      or coalesce(c.level,'')                  ilike '%'||p_classroom||'%'
      or (c.name||'/'||coalesce(c.section,'')) ilike '%'||p_classroom||'%'
    )
    and (p_term is null or c.term = p_term)
    and (p_year is null or c.year = p_year)
),
rec as (
  select c.id as classroom_id,
         c.name||'/'||coalesce(c.section,'-') as room,
         u.id as unit_id, u.unit_no, u.unit_name,
         a.student_id, a.score, a.created_at
  from kindergarten.assessments a
  join kindergarten.behaviors   b on b.id = a.behavior_id
  join kindergarten.units       u on u.id = b.unit_id
  join kindergarten.students    s on s.id = a.student_id
  join cls                      c on c.id = s.classroom_id
  where a.score is not null
)
select room, unit_no, unit_name,
       max(created_at)::date as unit_at,
       round(avg(score)::numeric, 2) as avg_score,
       count(*) as n,
       count(distinct student_id) as students_covered
from rec
group by room, unit_id, unit_no, unit_name
order by room, unit_at;
$$;
