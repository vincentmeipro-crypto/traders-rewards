-- Promotion Hero administrable depuis Admin > Promotions.
-- Cette configuration pilote uniquement l'affichage du cadre dans le Hero.
-- Elle ne modifie pas les règles de remise appliquées au checkout.

INSERT INTO settings (key, category, description, value)
VALUES (
  'general.hero_promotion',
  'general',
  'Configuration du cadre promotionnel affiché dans le Hero',
  '{
    "enabled": true,
    "startsAt": null,
    "endsAt": null,
    "leftLabel": "1 CHALLENGE",
    "leftDiscount": 80,
    "rightLabel": "PACK ×3 BEST DEAL",
    "rightDiscount": 90
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
