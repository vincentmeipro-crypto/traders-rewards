-- ============================================================
-- TRADERS REWARDS — Phase 3A-1
-- Promo Usage Integrity : table + RPC atomique
-- À exécuter manuellement dans Supabase SQL Editor AVANT
-- de déployer le code applicatif dépendant.
-- ============================================================


-- ── 1. Table promo_code_usages ────────────────────────────────
--
-- Rôles :
--   a) Audit log complet des utilisations (Promotion Builder)
--   b) Idempotence forte par référence de paiement
--      (prévient la double consommation sur webhook retry)
--   c) Lien challenge → usage (mis à jour après création du challenge)
--   d) Support futur de single_use_per_user (index promo_code_id, user_id)
--
-- Accès : uniquement service_role (backend).
-- anon / authenticated ne peuvent ni lire ni écrire (RLS activée, aucune policy).
-- Backward compat : les utilisations antérieures restent représentées
-- uniquement par promo_codes.used_count.
-- promo_code_usages commence à enregistrer à partir de 3A-1.

CREATE TABLE IF NOT EXISTS public.promo_code_usages (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id     uuid        NOT NULL
                                REFERENCES public.promo_codes(id)
                                ON DELETE RESTRICT,
  user_id           uuid        NOT NULL,       -- auth.users.id (pas de FK Supabase auth)
  challenge_id      uuid        NULL
                                REFERENCES public.challenges(id)
                                ON DELETE SET NULL,
  provider          text        NOT NULL
                                CHECK (provider IN ('stripe', 'crypto', 'free')),
  payment_reference text        NULL,           -- session.id | payment_id | free:userId:code:productId
  discount_applied  integer     NULL,           -- % effectif appliqué (nullable : ancien chemin)
  used_at           timestamptz NOT NULL DEFAULT now()
);

-- Idempotence : une payment_reference ne peut consommer une promo qu'une fois.
-- Index partiel (WHERE NOT NULL) pour éviter les faux conflits sur NULL.
CREATE UNIQUE INDEX IF NOT EXISTS promo_usages_payment_ref_idx
  ON public.promo_code_usages(provider, payment_reference)
  WHERE payment_reference IS NOT NULL;

-- Lecture par code promo (Promotion Builder — historique par code)
CREATE INDEX IF NOT EXISTS promo_usages_promo_code_id_idx
  ON public.promo_code_usages(promo_code_id);

-- Lecture par utilisateur (historique trader / future single_use_per_user)
CREATE INDEX IF NOT EXISTS promo_usages_user_id_idx
  ON public.promo_code_usages(user_id);

-- RLS : aucun accès direct depuis le frontend.
-- service_role possède bypassrls → continue à fonctionner normalement.
-- Aucune policy n'est créée → anon et authenticated sont bloqués par défaut.
ALTER TABLE public.promo_code_usages ENABLE ROW LEVEL SECURITY;


-- ── 2. Fonction consume_promo_code ───────────────────────────
--
-- ATOMIQUE : UPDATE promo_codes + INSERT promo_code_usages
-- dans la même transaction PL/pgSQL.
-- Le bloc BEGIN ... EXCEPTION crée un SAVEPOINT implicite :
-- si l'INSERT échoue (unique_violation concurrente sur même
-- payment_reference), l'UPDATE est automatiquement rollbacké
-- au SAVEPOINT → used_count n'est incrémenté qu'une seule fois.
--
-- Paramètres :
--   p_code              text    — code promo (normalisé UPPERCASE en interne)
--   p_user_id           uuid    — utilisateur qui consomme
--   p_provider          text    — 'stripe' | 'crypto' | 'free'
--   p_payment_reference text    — référence unique de la transaction (nullable)
--   p_discount_applied  integer — % effectif appliqué (nullable pour ancien chemin)
--
-- Retour (une ligne) :
--   success           boolean — true = code consommé avec succès
--   already_consumed  boolean — true = idempotence : même payment_reference déjà vue
--   promo_id          uuid    — id du code promo
--   usage_id          uuid    — id de la ligne promo_code_usages créée/trouvée
--   new_used_count    integer — used_count après incrément (ou valeur actuelle si already_consumed)
--   max_uses_val      integer — max_uses du code (NULL = illimité)
--   discount_pct      integer — discount_percent du code
--   error_code        text    — null si success, sinon : not_found | revoked | expired |
--                               exhausted | invalid_provider | payment_reference_conflict
--
-- SECURITY DEFINER : s'exécute avec les droits du propriétaire de la fonction.
-- SET search_path = '' : search_path vide — toutes les tables sont qualifiées public.*
-- Prévient le search_path injection si le rôle appelant manipulait son search_path.

CREATE OR REPLACE FUNCTION public.consume_promo_code(
  p_code              text,
  p_user_id           uuid,
  p_provider          text,
  p_payment_reference text,
  p_discount_applied  integer
)
RETURNS TABLE (
  success           boolean,
  already_consumed  boolean,
  promo_id          uuid,
  usage_id          uuid,
  new_used_count    integer,
  max_uses_val      integer,
  discount_pct      integer,
  error_code        text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_promo_id          uuid;
  v_active            boolean;
  v_expires_at        timestamptz;
  v_max_uses          integer;
  v_used_count        integer;
  v_discount_pct      integer;
  v_existing_id       uuid;
  v_existing_promo_id uuid;   -- pour détecter payment_reference_conflict
  v_new_count         integer;
  v_new_usage_id      uuid;
BEGIN
  -- ── 1. Trouver le code promo ──────────────────────────────
  SELECT pc.id,
         pc.active,
         pc.expires_at,
         pc.max_uses,
         pc.used_count,
         pc.discount_percent
  INTO   v_promo_id,
         v_active,
         v_expires_at,
         v_max_uses,
         v_used_count,
         v_discount_pct
  FROM   public.promo_codes pc
  WHERE  pc.code = upper(trim(p_code));

  IF NOT FOUND THEN
    RETURN QUERY
      SELECT false, false,
             NULL::uuid, NULL::uuid,
             0::integer, 0::integer, 0::integer,
             'not_found'::text;
    RETURN;
  END IF;

  -- ── 2. Validation provider ───────────────────────────────
  IF p_provider NOT IN ('stripe', 'crypto', 'free') THEN
    RETURN QUERY
      SELECT false, false,
             v_promo_id, NULL::uuid,
             v_used_count, v_max_uses, v_discount_pct,
             'invalid_provider'::text;
    RETURN;
  END IF;

  -- ── 3. Idempotence ───────────────────────────────────────
  -- Vérifiée AVANT la validation de l'état du code :
  -- si la même payment_reference existe, l'appelant peut créer son challenge
  -- même si le code a depuis été révoqué (le client a payé).
  --
  -- On charge aussi promo_code_id pour détecter le cas anormal où une
  -- payment_reference aurait déjà été consommée avec un AUTRE code promo.
  -- Dans ce cas → payment_reference_conflict (success=false, pas d'incrément).
  IF p_payment_reference IS NOT NULL THEN
    SELECT pcu.id,
           pcu.promo_code_id
    INTO   v_existing_id,
           v_existing_promo_id
    FROM   public.promo_code_usages pcu
    WHERE  pcu.provider          = p_provider
      AND  pcu.payment_reference = p_payment_reference
    LIMIT  1;

    IF FOUND THEN
      IF v_existing_promo_id = v_promo_id THEN
        -- Idempotence normale : même code, même paiement
        RETURN QUERY
          SELECT true, true,
                 v_promo_id, v_existing_id,
                 v_used_count, v_max_uses, v_discount_pct,
                 NULL::text;
      ELSE
        -- Conflit : payment_reference déjà utilisée avec un code différent.
        -- Ne pas incrémenter, ne pas créer de nouvel usage.
        RETURN QUERY
          SELECT false, false,
                 v_promo_id, NULL::uuid,
                 v_used_count, v_max_uses, v_discount_pct,
                 'payment_reference_conflict'::text;
      END IF;
      RETURN;
    END IF;
  END IF;

  -- ── 4. Validation état du code ───────────────────────────
  IF NOT v_active THEN
    RETURN QUERY
      SELECT false, false,
             v_promo_id, NULL::uuid,
             v_used_count, v_max_uses, v_discount_pct,
             'revoked'::text;
    RETURN;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN QUERY
      SELECT false, false,
             v_promo_id, NULL::uuid,
             v_used_count, v_max_uses, v_discount_pct,
             'expired'::text;
    RETURN;
  END IF;

  -- ── 5. Bloc atomique : incrément + usage ─────────────────
  --
  -- Le bloc BEGIN...EXCEPTION crée un SAVEPOINT implicite au moment
  -- de l'entrée dans le bloc. Si une exception est levée à l'intérieur :
  --   a) PostgreSQL rollback automatiquement jusqu'au SAVEPOINT
  --      (l'UPDATE de used_count est annulé)
  --   b) Le handler EXCEPTION est exécuté dans un état propre
  --
  -- Garantie : 2 appels concurrents avec la même payment_reference →
  --   - l'un réussit l'INSERT → son UPDATE est committé
  --   - l'autre lève unique_violation → son UPDATE est rollbacké
  --   → used_count incrémenté exactement UNE fois.
  BEGIN
    -- UPDATE atomique : le WHERE empêche le dépassement de max_uses
    -- sous concurrence (row-level locking Postgres).
    UPDATE public.promo_codes
    SET    used_count = used_count + 1
    WHERE  id = v_promo_id
      AND  active = true
      AND  (expires_at IS NULL OR expires_at >= now())
      AND  (max_uses IS NULL OR used_count < max_uses)
    RETURNING used_count
    INTO  v_new_count;

    IF v_new_count IS NULL THEN
      -- max_uses atteint sous concurrence (race condition : un autre appel a pris
      -- le dernier slot entre le SELECT initial et cet UPDATE).
      RETURN QUERY
        SELECT false, false,
               v_promo_id, NULL::uuid,
               v_used_count, v_max_uses, v_discount_pct,
               'exhausted'::text;
      RETURN;
    END IF;

    -- INSERT usage dans la même transaction
    INSERT INTO public.promo_code_usages (
      promo_code_id,
      user_id,
      provider,
      payment_reference,
      discount_applied
    ) VALUES (
      v_promo_id,
      p_user_id,
      p_provider,
      p_payment_reference,
      p_discount_applied
    )
    RETURNING id
    INTO v_new_usage_id;

    RETURN QUERY
      SELECT true, false,
             v_promo_id, v_new_usage_id,
             v_new_count, v_max_uses, v_discount_pct,
             NULL::text;

  EXCEPTION WHEN unique_violation THEN
    -- Deux appels concurrents avec la même payment_reference ont tous deux
    -- passé le check d'idempotence (step 3) avant que l'un n'insère.
    -- Le SAVEPOINT a rollbacké l'UPDATE du bloc BEGIN → used_count intact.
    --
    -- On relit l'usage existant pour distinguer :
    --   a) même promo_code_id → idempotence normale
    --   b) promo_code_id différent → conflit (ne devrait pas arriver en pratique)
    --   c) ligne introuvable → unique_violation sur un autre index → relever
    IF p_payment_reference IS NOT NULL THEN
      SELECT pcu.id,
             pcu.promo_code_id
      INTO   v_existing_id,
             v_existing_promo_id
      FROM   public.promo_code_usages pcu
      WHERE  pcu.provider          = p_provider
        AND  pcu.payment_reference = p_payment_reference
      LIMIT  1;

      IF FOUND THEN
        IF v_existing_promo_id = v_promo_id THEN
          RETURN QUERY
            SELECT true, true,
                   v_promo_id, v_existing_id,
                   v_used_count, v_max_uses, v_discount_pct,
                   NULL::text;
        ELSE
          RETURN QUERY
            SELECT false, false,
                   v_promo_id, NULL::uuid,
                   v_used_count, v_max_uses, v_discount_pct,
                   'payment_reference_conflict'::text;
        END IF;
        RETURN;
      END IF;
    END IF;
    -- unique_violation non liée à payment_reference (inattendu) : relever
    RAISE;
  END;
END;
$$;


-- ── 3. Permissions RPC ───────────────────────────────────────
--
-- Par défaut PostgreSQL accorde EXECUTE à PUBLIC à la création.
-- On révoque tout, puis on accorde uniquement à service_role.
-- service_role = rôle utilisé par createAdminClient() via SUPABASE_SERVICE_ROLE_KEY.
-- anon / authenticated ne peuvent pas appeler cette fonction directement.

REVOKE EXECUTE ON FUNCTION public.consume_promo_code(
  text,
  uuid,
  text,
  text,
  integer
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.consume_promo_code(
  text,
  uuid,
  text,
  text,
  integer
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.consume_promo_code(
  text,
  uuid,
  text,
  text,
  integer
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.consume_promo_code(
  text,
  uuid,
  text,
  text,
  integer
) TO service_role;
