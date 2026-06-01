-- Daily scheduled re-evaluation of MasteryDrop "watching" items.
--
-- Design note: rather than have pg_cron call the edge function over HTTP (which
-- would require storing the service-role key in the database / git), the batch
-- logic lives in a SECURITY DEFINER SQL function that cron calls directly.
-- No secrets, no network hop. The atlas-mastery-watch edge function keeps its
-- own "batch" mode for the manual "run now" button in the UI; both apply the
-- exact same rules below.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ─── Batch re-evaluation (mirror of edge fn runWatchReevaluation) ─────────────
create or replace function public.run_mastery_watch_batch()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item        record;
  v_scores      numeric[];
  v_dates       date[];
  v_recent      numeric(4,2);
  v_previous    numeric(4,2);
  v_delta       numeric(4,2);
  v_latest_date date;
  v_has_new     boolean;
  v_now         timestamptz := now();
  v_escalated   int := 0;
  v_resolved    int := 0;
  v_held        int := 0;
  v_skipped     int := 0;
  c_base   constant text := 'Mastery ลดลง (เฉลี่ย 3 คาบ)';
  c_escal  constant text := 'Mastery ลดลง (เฉลี่ย 3 คาบ) — ตกต่อเนื่อง — เข้านิเทศ';
  c_resol  constant text := 'Mastery ลดลง (เฉลี่ย 3 คาบ) — คะแนนฟื้นตัว — ปิดอัตโนมัติ';
begin
  for v_item in
    select id, teacher_id, subject, classroom, watch_started_at
    from public.action_plan_items
    where status = 'watching'
  loop
    if v_item.teacher_id is null or v_item.subject is null or v_item.classroom is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- Latest 6 teaching logs for this teacher × subject × classroom, newest first.
    select array_agg(mastery_score order by teaching_date desc),
           array_agg(teaching_date order by teaching_date desc)
      into v_scores, v_dates
    from (
      select mastery_score, teaching_date
      from public.teaching_logs
      where teacher_id = v_item.teacher_id
        and subject    = v_item.subject
        and classroom  = v_item.classroom
      order by teaching_date desc
      limit 6
    ) t;

    -- Need a full window (recent 3 + previous 3); otherwise just stamp the check.
    if v_scores is null or array_length(v_scores, 1) < 6 then
      update public.action_plan_items
        set watch_checked_at = v_now, updated_at = v_now
        where id = v_item.id;
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_recent      := round((v_scores[1] + v_scores[2] + v_scores[3]) / 3.0, 2);
    v_previous    := round((v_scores[4] + v_scores[5] + v_scores[6]) / 3.0, 2);
    v_delta       := round(v_recent - v_previous, 2);
    v_latest_date := v_dates[1];

    -- Only escalate/resolve when NEW evidence has arrived since watching began;
    -- otherwise the figures are unchanged and there is nothing to decide on.
    v_has_new := v_item.watch_started_at is null
                 or v_latest_date > (v_item.watch_started_at)::date;

    if not v_has_new then
      update public.action_plan_items
        set mastery_avg_recent   = v_recent,
            mastery_avg_previous = v_previous,
            metric_value         = v_delta,
            watch_checked_at     = v_now,
            updated_at           = v_now
        where id = v_item.id;
      v_held := v_held + 1;
      continue;
    end if;

    if v_delta <= -0.5 then
      -- Still dropping → escalate to Action.
      update public.action_plan_items
        set mastery_avg_recent   = v_recent,
            mastery_avg_previous = v_previous,
            metric_value         = v_delta,
            status               = 'open',
            severity             = 'high',
            metric_label         = c_escal,
            watch_started_at     = null,
            watch_checked_at     = v_now,
            updated_at           = v_now
        where id = v_item.id;
      v_escalated := v_escalated + 1;

    elsif v_delta > 0 then
      -- Recovered → auto-resolve.
      update public.action_plan_items
        set mastery_avg_recent   = v_recent,
            mastery_avg_previous = v_previous,
            metric_value         = v_delta,
            status               = 'resolved',
            auto_resolved        = true,
            resolved_at          = v_now,
            resolution_note      = 'คะแนนฟื้นตัว — ปิดอัตโนมัติ',
            metric_label         = c_resol,
            watch_started_at     = null,
            watch_checked_at     = v_now,
            updated_at           = v_now
        where id = v_item.id;
      v_resolved := v_resolved + 1;

    else
      -- Between -0.5 and 0 → keep watching, refresh figures only.
      update public.action_plan_items
        set mastery_avg_recent   = v_recent,
            mastery_avg_previous = v_previous,
            metric_value         = v_delta,
            watch_checked_at     = v_now,
            updated_at           = v_now,
            metric_label         = c_base
        where id = v_item.id;
      v_held := v_held + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'escalated', v_escalated,
    'resolved',  v_resolved,
    'held',      v_held,
    'skipped',   v_skipped,
    'ran_at',    v_now
  );
end;
$$;

-- RLS-bypassing definer function: keep it off the public PostgREST RPC surface.
revoke all on function public.run_mastery_watch_batch() from public;
revoke all on function public.run_mastery_watch_batch() from anon, authenticated;
grant execute on function public.run_mastery_watch_batch() to postgres;

-- ─── Schedule: daily 06:00 Asia/Bangkok = 23:00 UTC ──────────────────────────
-- Idempotent: drop a prior job of the same name before (re)scheduling.
select cron.unschedule('atlas-mastery-watch-daily')
where exists (select 1 from cron.job where jobname = 'atlas-mastery-watch-daily');

select cron.schedule(
  'atlas-mastery-watch-daily',
  '0 23 * * *',
  $$ select public.run_mastery_watch_batch(); $$
);
