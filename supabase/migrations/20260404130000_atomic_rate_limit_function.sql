-- Atomic rate limit check-and-set function
-- Returns TRUE if request is allowed, FALSE if rate limited
-- Uses a single INSERT...ON CONFLICT...WHERE to avoid race conditions
CREATE OR REPLACE FUNCTION public.check_and_set_rate_limit(
  p_user_id      uuid,
  p_function_name text,
  p_limit_seconds int DEFAULT 10
) RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_allowed boolean;
BEGIN
  INSERT INTO public.ai_rate_limits (user_id, function_name, last_request_at)
  VALUES (p_user_id, p_function_name, now())
  ON CONFLICT (user_id, function_name)
  DO UPDATE SET last_request_at = now()
    WHERE ai_rate_limits.last_request_at < now() - (p_limit_seconds || ' seconds')::interval
  RETURNING true INTO v_allowed;

  RETURN COALESCE(v_allowed, false);
END;
$$;
