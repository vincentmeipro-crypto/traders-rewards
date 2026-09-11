-- ============================================================
-- Migration : ajouter paid_at à la table payouts
-- ============================================================
--
-- Contexte :
--   La colonne created_at dans payouts représente la DATE DE CRÉATION
--   de la demande de Reward (quand le trader soumet sa demande), PAS
--   la date à laquelle l'admin approuve et paie.
--
--   paid_at est nécessaire pour :
--     1. Calculer le cycle des jours qualifiants (reset depuis le dernier paiement)
--     2. Calculer la consistance depuis le dernier paiement (cycle-aware)
--     3. Afficher correctement la date de paiement dans le dashboard
--
-- Quand paid_at est renseigné :
--   L'API admin PATCH /api/admin/payouts enregistre paid_at = now()
--   lors du passage de status → "paid".
--
-- ⚠️  NE PAS EXÉCUTER SUR SUPABASE — À exécuter manuellement via le
--     dashboard Supabase > SQL Editor lorsque la migration est validée.
--
-- ============================================================

ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL;

-- Index pour requêtes de cycle (dernier paiement par challenge)
CREATE INDEX IF NOT EXISTS idx_payouts_paid_challenge
  ON payouts (challenge_id, paid_at)
  WHERE status = 'paid';

COMMENT ON COLUMN payouts.paid_at IS
  'Timestamp du paiement effectif (admin PATCH status=paid). '
  'NULL si la demande est encore en attente ou rejetée. '
  'À ne pas confondre avec created_at (= date de soumission de la demande).';
