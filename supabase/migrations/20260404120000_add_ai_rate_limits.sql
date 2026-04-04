-- Rate limit tracking per user per AI function
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text        NOT NULL,
  last_request_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, function_name)
);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) can read/write this table
-- No user-facing policies needed
