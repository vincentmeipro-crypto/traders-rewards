-- Restore historical Rewards caps; no payout history is changed.
BEGIN;
INSERT INTO challenge_product_rules (product_id, rule_key, rule_value, enabled, description)
VALUES
  -- 25K
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_1',  '300'::jsonb,  true, 'Plafond Reward #1 — 25K : 300 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_2',  '400'::jsonb,  true, 'Plafond Reward #2 — 25K : 400 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_3',  '500'::jsonb,  true, 'Plafond Reward #3 — 25K : 500 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_4',  '600'::jsonb,  true, 'Plafond Reward #4 — 25K : 600 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-25k'),  'reward_cap_5',  '750'::jsonb,  true, 'Plafond Reward #5 — 25K : 750 USD.'),
  -- 50K
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_1',  '500'::jsonb,  true, 'Plafond Reward #1 — 50K : 500 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_2',  '650'::jsonb,  true, 'Plafond Reward #2 — 50K : 650 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_3',  '800'::jsonb,  true, 'Plafond Reward #3 — 50K : 800 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_4', '1000'::jsonb,  true, 'Plafond Reward #4 — 50K : 1 000 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-50k'),  'reward_cap_5', '1250'::jsonb,  true, 'Plafond Reward #5 — 50K : 1 250 USD.'),
  -- 100K
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_1',  '750'::jsonb,  true, 'Plafond Reward #1 — 100K : 750 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_2', '1000'::jsonb,  true, 'Plafond Reward #2 — 100K : 1 000 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_3', '1250'::jsonb,  true, 'Plafond Reward #3 — 100K : 1 250 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_4', '1500'::jsonb,  true, 'Plafond Reward #4 — 100K : 1 500 USD.'),
  ((SELECT id FROM challenge_products WHERE slug = 'rewards-100k'), 'reward_cap_5', '1750'::jsonb,  true, 'Plafond Reward #5 — 100K : 1 750 USD.')
ON CONFLICT (product_id, rule_key) DO UPDATE
  SET rule_value  = EXCLUDED.rule_value,
      enabled     = EXCLUDED.enabled,
      description = EXCLUDED.description;
COMMIT;
