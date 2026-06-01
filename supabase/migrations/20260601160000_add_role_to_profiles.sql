-- Teacher View role-based access. The legacy role system lives in `user_roles`
-- ('teacher' | 'director'); this column is an additional, profile-level role so
-- finer-grained admin tiers can be assigned later. useUserRole bridges the two:
-- a 'director' in user_roles is treated as admin regardless of this value.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text
    NOT NULL DEFAULT 'teacher'
    CHECK (role IN ('teacher', 'admin', 'super_admin'));
