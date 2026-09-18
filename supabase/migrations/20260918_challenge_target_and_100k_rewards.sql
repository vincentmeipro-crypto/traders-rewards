-- Current policy: 9% Challenge target for all three sizes, higher gross 100K caps.
-- Keep immutable purchase snapshots, passed/closed accounts and all payouts intact.
BEGIN;

UPDATE challenge_product_phases ph
SET profit_target = 9
FROM challenge_products p
WHERE ph.product_id = p.id
  AND p.slug IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  AND ph.phase_type = 'challenge' AND ph.phase_order = 1;

INSERT INTO challenge_product_rules (product_id, rule_key, rule_value, enabled, description)
SELECT p.id, 'reward_cap_' || caps.level, to_jsonb(caps.amount), true,
       'Plafond Reward #' || caps.level || ' — 100K : ' || caps.amount || ' USD.'
FROM challenge_products p
CROSS JOIN (VALUES (1,1000),(2,1400),(3,1800),(4,2000),(5,3000)) caps(level,amount)
WHERE p.slug = 'rewards-100k'
ON CONFLICT (product_id, rule_key) DO UPDATE
SET rule_value = EXCLUDED.rule_value, enabled = EXCLUDED.enabled,
    description = EXCLUDED.description;

UPDATE challenges
SET profit_target = 9
WHERE status = 'active' AND phase = 'phase1' AND profit_target < 9
  AND (
    model IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
    OR dd_model = 'trailing_eod_lock'
    OR rules_snapshot->'rules'->>'dd_model' = 'trailing_eod_lock'
    OR rules_snapshot->>'product_slug' IN ('rewards-25k', 'rewards-50k', 'rewards-100k')
  );

COMMIT;
