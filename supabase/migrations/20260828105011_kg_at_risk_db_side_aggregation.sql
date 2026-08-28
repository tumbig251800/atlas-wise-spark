create or replace function kindergarten.fn_at_risk(
  p_threshold     numeric default 2.0,
  p_scope         text    default 'recent',
  p_recent_units  int     default 3,
  p_classroom     text    default null,
  p_term          text    default null,
  p_year          text    default null
)
returns table (
  room            text,
  level           text,
  section         text,
  student_code    text,
  full_name       text,
  scope_avg       numeric,
  scope_n         bigint,
  scope_units     int,
  term_avg        numeric,
  term_n          bigint,
  delta           numeric,
  latest_unit     text,
  latest_unit_at  date
)
language sql
stable
as $fn$
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
  select s.id as student_id, s.student_code, s.full_name,
         c.id as classroom_id,
         c.name||'/'||coalesce(c.section,'-') as room,
         c.level, c.section,
         u.id as unit_id, u.unit_no, u.unit_name,
         a.score, a.created_at
  from kindergarten.assessments a
  join kindergarten.behaviors   b on b.id = a.behavior_id
  join kindergarten.units       u on u.id = b.unit_id
  join kindergarten.students    s on s.id = a.student_id
  join cls                      c on c.id = s.classroom_id
  where a.score is not null
),
unit_seq as (
  select classroom_id, unit_id, unit_no, unit_name, last_at,
         row_number() over (
           partition by classroom_id
           order by last_at desc,
                    nullif(regexp_replace(coalesce(unit_no,''), '\D', '', 'g'), '')::int
                      desc nulls last,
                    unit_id
         ) as rn
  from (
    select classroom_id, unit_id, unit_no, unit_name, max(created_at) as last_at
    from rec group by 1,2,3,4
  ) t
),
picked as (
  select classroom_id, unit_id
  from unit_seq
  where case lower(coalesce(p_scope,'recent'))
          when 'last' then rn = 1
          when 'all'  then true
          else rn <= greatest(coalesce(p_recent_units,3), 1)
        end
),
latest as (
  select classroom_id,
         coalesce(nullif(unit_no,''),'-')||' '||left(coalesce(unit_name,''),60) as latest_unit,
         last_at::date as latest_unit_at
  from unit_seq where rn = 1
),
agg as (
  select r.room, r.level, r.section, r.classroom_id, r.student_code, r.full_name,
         round(avg(r.score) filter (where p.unit_id is not null)::numeric, 2) as scope_avg,
         count(*)                  filter (where p.unit_id is not null)       as scope_n,
         count(distinct r.unit_id) filter (where p.unit_id is not null)       as scope_units,
         round(avg(r.score)::numeric, 2)                                      as term_avg,
         count(*)                                                             as term_n
  from rec r
  left join picked p
         on p.classroom_id = r.classroom_id and p.unit_id = r.unit_id
  group by 1,2,3,4,5,6
)
select a.room, a.level, a.section, a.student_code, a.full_name,
       a.scope_avg, a.scope_n, a.scope_units::int,
       a.term_avg, a.term_n,
       round(a.scope_avg - a.term_avg, 2) as delta,
       l.latest_unit, l.latest_unit_at
from agg a
left join latest l on l.classroom_id = a.classroom_id
where a.scope_avg is not null and a.scope_avg < p_threshold
order by a.scope_avg asc, a.room, a.student_code;
$fn$;

comment on function kindergarten.fn_at_risk is
'เด็กกลุ่มเสี่ยงรายบุคคล - aggregate ที่ DB ครบทุกแถว (แทน kg_at_risk เดิมที่มี row limit). scope: recent = N หน่วยล่าสุด (แนะนำ) | last = หน่วยล่าสุด | all = ทั้งเทอม';


create or replace function kindergarten.fn_at_risk_summary(
  p_threshold     numeric default 2.0,
  p_scope         text    default 'recent',
  p_recent_units  int     default 3,
  p_term          text    default null,
  p_year          text    default null
)
returns table (
  room           text,
  level          text,
  students       bigint,
  below          bigint,
  pct_below      numeric,
  room_scope_avg numeric,
  room_term_avg  numeric
)
language sql
stable
as $fn$
with cls as (
  select c.* from kindergarten.classrooms c
  where (p_term is null or c.term = p_term)
    and (p_year is null or c.year = p_year)
),
rec as (
  select s.id as student_id, c.id as classroom_id,
         c.name||'/'||coalesce(c.section,'-') as room, c.level,
         u.id as unit_id, u.unit_no, a.score, a.created_at
  from kindergarten.assessments a
  join kindergarten.behaviors  b on b.id = a.behavior_id
  join kindergarten.units      u on u.id = b.unit_id
  join kindergarten.students   s on s.id = a.student_id
  join cls                     c on c.id = s.classroom_id
  where a.score is not null
),
unit_seq as (
  select classroom_id, unit_id,
         row_number() over (
           partition by classroom_id
           order by last_at desc,
                    nullif(regexp_replace(coalesce(unit_no,''), '\D', '', 'g'), '')::int
                      desc nulls last,
                    unit_id) as rn
  from (select classroom_id, unit_id, unit_no, max(created_at) as last_at
        from rec group by 1,2,3) t
),
picked as (
  select classroom_id, unit_id from unit_seq
  where case lower(coalesce(p_scope,'recent'))
          when 'last' then rn = 1
          when 'all'  then true
          else rn <= greatest(coalesce(p_recent_units,3), 1)
        end
),
per_student as (
  select r.room, r.level, r.student_id,
         avg(r.score) filter (where p.unit_id is not null) as scope_avg,
         avg(r.score) as term_avg
  from rec r
  left join picked p on p.classroom_id = r.classroom_id and p.unit_id = r.unit_id
  group by 1,2,3
)
select room, level,
       count(*) as students,
       count(*) filter (where scope_avg < p_threshold) as below,
       round(100.0 * count(*) filter (where scope_avg < p_threshold)
             / nullif(count(*),0), 1) as pct_below,
       round(avg(scope_avg)::numeric, 2) as room_scope_avg,
       round(avg(term_avg)::numeric, 2)  as room_term_avg
from per_student
group by 1,2
order by room;
$fn$;

comment on function kindergarten.fn_at_risk_summary is
'สรุปกลุ่มเสี่ยงรายห้อง - ตัวเลขมาจาก query เดียวกับ fn_at_risk จึงบวกกันได้ ไม่ขัดแย้งกันเอง';


create or replace function public.kg_at_risk_v2(
  p_threshold     numeric default 2.0,
  p_scope         text    default 'recent',
  p_recent_units  int     default 3,
  p_classroom     text    default null,
  p_term          text    default null,
  p_year          text    default null
)
returns table (
  room            text,
  level           text,
  section         text,
  student_code    text,
  full_name       text,
  scope_avg       numeric,
  scope_n         bigint,
  scope_units     int,
  term_avg        numeric,
  term_n          bigint,
  delta           numeric,
  latest_unit     text,
  latest_unit_at  date
)
language sql stable
as $w$ select * from kindergarten.fn_at_risk(
        p_threshold, p_scope, p_recent_units, p_classroom, p_term, p_year); $w$;

create or replace function public.kg_at_risk_summary_v2(
  p_threshold     numeric default 2.0,
  p_scope         text    default 'recent',
  p_recent_units  int     default 3,
  p_term          text    default null,
  p_year          text    default null
)
returns table (
  room           text,
  level          text,
  students       bigint,
  below          bigint,
  pct_below      numeric,
  room_scope_avg numeric,
  room_term_avg  numeric
)
language sql stable
as $w$ select * from kindergarten.fn_at_risk_summary(
        p_threshold, p_scope, p_recent_units, p_term, p_year); $w$;


grant usage on schema kindergarten to authenticated, service_role;
grant execute on function kindergarten.fn_at_risk(numeric, text, int, text, text, text) to authenticated, service_role;
grant execute on function kindergarten.fn_at_risk_summary(numeric, text, int, text, text) to authenticated, service_role;
grant execute on function public.kg_at_risk_v2(numeric, text, int, text, text, text) to authenticated, service_role;
grant execute on function public.kg_at_risk_summary_v2(numeric, text, int, text, text) to authenticated, service_role;
