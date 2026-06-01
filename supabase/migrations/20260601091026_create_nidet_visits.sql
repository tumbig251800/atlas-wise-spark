-- Supervision Visit Record (บันทึกการนิเทศ)
-- NOTE: action_plan_items.id is bigint (identity sequence), not uuid, so the
-- foreign key column action_item_id must also be bigint — the original uuid
-- spec would have failed to create the FK constraint.
create table if not exists public.nidet_visits (
  id uuid primary key default gen_random_uuid(),
  action_item_id bigint not null references public.action_plan_items(id) on delete cascade,
  visit_date date not null default current_date,
  supervisor_id uuid references auth.users(id),
  supervisor_name text not null default '',
  strengths text default '',
  improvements text default '',
  recommendations text default '',
  follow_up_date date,
  follow_up_method text default 'นิเทศซ้ำในชั้นเรียน',
  rubric_activity_design smallint check (rubric_activity_design between 1 and 4),
  rubric_questioning smallint check (rubric_questioning between 1 and 4),
  rubric_media_tech smallint check (rubric_media_tech between 1 and 4),
  rubric_individual_care smallint check (rubric_individual_care between 1 and 4),
  rubric_collaborative smallint check (rubric_collaborative between 1 and 4),
  rubric_formative_assess smallint check (rubric_formative_assess between 1 and 4),
  rubric_feedback smallint check (rubric_feedback between 1 and 4),
  rubric_classroom_climate smallint check (rubric_classroom_climate between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nidet_visits_action_item_id_idx
  on public.nidet_visits (action_item_id);

alter table public.nidet_visits enable row level security;

create policy "authenticated users can manage nidet_visits"
  on public.nidet_visits for all
  to authenticated
  using (true)
  with check (true);
