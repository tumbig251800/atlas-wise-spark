-- Developmental checkpoints (แบบประเมินพัฒนาการ 4 ด้าน กลางภาค/ปลายภาค).
--
-- Kept OUT of units/behaviors/assessments on purpose: every existing aggregate
-- (dashboard, kindergarten-mcp, fn_at_risk, plan context, research baselines)
-- averages ALL assessments with no unit-type filter. A one-day checkpoint scored
-- by a different rater must not blend into those term averages — it exists to be
-- compared AGAINST them (see v_checkpoint_vs_units).

create table kindergarten.checkpoints (
  id            uuid primary key default gen_random_uuid(),
  classroom_id  uuid not null references kindergarten.classrooms (id) on delete cascade,
  round         text not null check (round in ('midterm', 'final')),
  term          text,
  year          text,
  assessed_on   date,
  rater_name    text,
  rater_role    text,
  same_rater    boolean,   -- true = ผู้ประเมินคือครูคนเดียวกับผู้บันทึกคะแนนรายหน่วย
  source_file   text,
  created_at    timestamptz not null default now(),
  unique (classroom_id, round, term, year)
);
create index on kindergarten.checkpoints (classroom_id);

create table kindergarten.checkpoint_items (
  id             uuid primary key default gen_random_uuid(),
  checkpoint_id  uuid not null references kindergarten.checkpoints (id) on delete cascade,
  domain_code    text not null references kindergarten.domains (code),
  item_index     int  not null,
  item_text      text not null,
  unique (checkpoint_id, domain_code, item_index)
);
create index on kindergarten.checkpoint_items (checkpoint_id);

create table kindergarten.checkpoint_scores (
  id             uuid primary key default gen_random_uuid(),
  checkpoint_id  uuid not null references kindergarten.checkpoints (id) on delete cascade,
  student_id     uuid not null references kindergarten.students (id) on delete cascade,
  item_id        uuid not null references kindergarten.checkpoint_items (id) on delete cascade,
  score          smallint not null check (score between 1 and 3),
  created_at     timestamptz not null default now(),
  unique (student_id, item_id)
);
create index on kindergarten.checkpoint_scores (checkpoint_id);
create index on kindergarten.checkpoint_scores (student_id);

-- ── RLS: classroom owner or director ──
alter table kindergarten.checkpoints       enable row level security;
alter table kindergarten.checkpoint_items  enable row level security;
alter table kindergarten.checkpoint_scores enable row level security;

create policy checkpoints_access on kindergarten.checkpoints
  for all to authenticated
  using (kindergarten.owns_classroom(classroom_id) or kindergarten.is_director())
  with check (kindergarten.owns_classroom(classroom_id) or kindergarten.is_director());

create policy checkpoint_items_access on kindergarten.checkpoint_items
  for all to authenticated
  using (exists (
    select 1 from kindergarten.checkpoints c
    where c.id = checkpoint_id
      and (kindergarten.owns_classroom(c.classroom_id) or kindergarten.is_director())))
  with check (exists (
    select 1 from kindergarten.checkpoints c
    where c.id = checkpoint_id
      and (kindergarten.owns_classroom(c.classroom_id) or kindergarten.is_director())));

create policy checkpoint_scores_access on kindergarten.checkpoint_scores
  for all to authenticated
  using (exists (
    select 1 from kindergarten.checkpoints c
    where c.id = checkpoint_id
      and (kindergarten.owns_classroom(c.classroom_id) or kindergarten.is_director())))
  with check (exists (
    select 1 from kindergarten.checkpoints c
    where c.id = checkpoint_id
      and (kindergarten.owns_classroom(c.classroom_id) or kindergarten.is_director())));

-- ── Comparison: per student × domain, term unit average vs checkpoint average ──
-- Levels use the same cut points as the forms (2.50 ดี / 1.50 พอใช้).
create or replace function kindergarten.quality_level(p_avg numeric)
returns text language sql immutable as $$
  select case
    when p_avg is null then null
    when p_avg >= 2.5 then 'ดี'
    when p_avg >= 1.5 then 'พอใช้'
    else 'ควรส่งเสริม'
  end
$$;

create view kindergarten.v_checkpoint_vs_units
with (security_invoker = true) as
with unit_avg as (
  select s.id as student_id, s.classroom_id, bd.domain_code,
         round(avg(a.score)::numeric, 2) as unit_avg, count(*) as unit_n
  from kindergarten.assessments a
  join kindergarten.behaviors b         on b.id = a.behavior_id
  join kindergarten.behavior_domains bd on bd.behavior_id = b.id
  join kindergarten.students s          on s.id = a.student_id
  group by 1, 2, 3
),
cp_avg as (
  select cs.student_id, cp.id as checkpoint_id, cp.classroom_id, cp.round, cp.term, cp.year,
         cp.rater_role, cp.same_rater, ci.domain_code,
         round(avg(cs.score)::numeric, 2) as checkpoint_avg, count(*) as checkpoint_n
  from kindergarten.checkpoint_scores cs
  join kindergarten.checkpoint_items ci on ci.id = cs.item_id
  join kindergarten.checkpoints cp      on cp.id = cs.checkpoint_id
  group by 1, 2, 3, 4, 5, 6, 7, 8, 9
)
select c.name || '/' || coalesce(c.section, '-') as room,
       c.level, c.section,
       s.student_code, s.full_name,
       cp.round, cp.term, cp.year, cp.rater_role, cp.same_rater,
       d.code as domain_code, d.label_th as domain,
       u.unit_avg, u.unit_n,
       kindergarten.quality_level(u.unit_avg) as unit_level,
       cp.checkpoint_avg, cp.checkpoint_n,
       kindergarten.quality_level(cp.checkpoint_avg) as checkpoint_level,
       round(cp.checkpoint_avg - u.unit_avg, 2) as delta,
       (kindergarten.quality_level(u.unit_avg) is distinct from
        kindergarten.quality_level(cp.checkpoint_avg)) as level_differs
from cp_avg cp
join kindergarten.students s   on s.id = cp.student_id
join kindergarten.classrooms c on c.id = cp.classroom_id
join kindergarten.domains d    on d.code = cp.domain_code
left join unit_avg u on u.student_id = cp.student_id and u.domain_code = cp.domain_code
order by room, s.student_code, d.sort_order;

notify pgrst, 'reload schema';
