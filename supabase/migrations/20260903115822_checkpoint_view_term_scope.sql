create or replace view kindergarten.v_checkpoint_vs_units
with (security_invoker = true) as
with unit_avg as (
  select s.id as student_id, u.term, u.year, bd.domain_code,
         round(avg(a.score)::numeric, 2) as unit_avg,
         count(*)                        as unit_n,
         count(distinct u.id)            as unit_units
  from kindergarten.assessments a
  join kindergarten.behaviors b         on b.id = a.behavior_id
  join kindergarten.behavior_domains bd on bd.behavior_id = b.id
  join kindergarten.units u             on u.id = b.unit_id
  join kindergarten.students s          on s.id = a.student_id
  group by 1, 2, 3, 4
),
cp_avg as (
  select cs.student_id, cp.id as checkpoint_id, cp.classroom_id, cp.round, cp.term, cp.year,
         cp.rater_role, cp.same_rater, cp.assessed_on, cp.rater_name, ci.domain_code,
         round(avg(cs.score)::numeric, 2) as checkpoint_avg, count(*) as checkpoint_n
  from kindergarten.checkpoint_scores cs
  join kindergarten.checkpoint_items ci on ci.id = cs.item_id
  join kindergarten.checkpoints cp      on cp.id = cs.checkpoint_id
  group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
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
        kindergarten.quality_level(cp.checkpoint_avg)) as level_differs,
       cp.checkpoint_id, cp.classroom_id, cp.student_id, cp.assessed_on, cp.rater_name,
       u.unit_units
from cp_avg cp
join kindergarten.students s   on s.id = cp.student_id
join kindergarten.classrooms c on c.id = cp.classroom_id
join kindergarten.domains d    on d.code = cp.domain_code
left join unit_avg u on u.student_id = cp.student_id
                    and u.domain_code = cp.domain_code
                    and u.term is not distinct from cp.term
                    and u.year is not distinct from cp.year
order by room, s.student_code, d.sort_order;

notify pgrst, 'reload schema';
