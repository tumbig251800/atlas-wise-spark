-- IntegrityFlag FLAG5 ("a2-gap ต้องส่งต่อภายนอก"): external-referral bookkeeping.
-- Unlike the other flags, FLAG5 is closed by referring the case to an outside
-- agency rather than by the teacher fixing a record.
ALTER TABLE public.action_plan_items
  ADD COLUMN IF NOT EXISTS referral_agency text,
  ADD COLUMN IF NOT EXISTS referral_date   date,
  ADD COLUMN IF NOT EXISTS referral_owner  text,
  ADD COLUMN IF NOT EXISTS referral_note   text;
