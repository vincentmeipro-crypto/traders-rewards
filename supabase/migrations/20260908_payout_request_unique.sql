-- Local migration only: review and apply before deploying payout request changes.
-- Fails rather than deleting data if existing duplicate active requests exist.
CREATE UNIQUE INDEX IF NOT EXISTS payouts_one_active_request_per_challenge
  ON public.payouts (challenge_id)
  WHERE status IN ('pending', 'approved', 'processing');
