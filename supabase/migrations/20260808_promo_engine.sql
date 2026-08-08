-- ============================================================
-- TRADERS REWARDS — Phase 3A-2b
-- Promotion Engine : consume_promo_code 6 paramètres
--
-- IMPORTANT : pas de BEGIN/COMMIT (Supabase SQL Editor le gère).
-- Délimiteur $BODY$ au lieu de $$ pour éviter les collisions.
-- Aucun SELECT INTO dans le corps (cf. note ci-dessous).
--
-- Raison du remplacement de SELECT INTO par FOR...LOOP :
--   Le SQL Editor Supabase détecte `SELECT ... INTO variable`
--   et injecte `ALTER TABLE variable ENABLE ROW LEVEL SECURITY`
--   à l'intérieur du corps de la fonction, corrompant le SQL
--   avant même son envoi à PostgreSQL.
--   FOR...LOOP est un pattern PL/pgSQL pur, non détecté.
--   RETURNING ... INTO (DML) n'est pas affecté — conservé tel quel.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- §1 — Nouvelle RPC consume_promo_code (6 paramètres)
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.consume_promo_code(
  p_code              text,
  p_user_id           uuid,
  p_provider          text,
  p_payment_reference text,
  p_discount_applied  integer,
  p_product_id        uuid
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
AS $BODY$
DECLARE
  _r                    record;
  v_promo_id            uuid;
  v_active              boolean;
  v_starts_at           timestamptz;
  v_expires_at          timestamptz;
  v_max_uses            integer;
  v_used_count          integer;
  v_discount_pct        integer;
  v_single_use_per_user boolean;
  v_targeting_mode      text;
  v_existing_id         uuid;
  v_existing_promo_id   uuid;
  v_new_count           integer;
  v_new_usage_id        uuid;
BEGIN

  -- ── 1. Trouver le code promo ──────────────────────────────
  -- FOR...LOOP remplace SELECT INTO pour éviter l'injection Supabase.
  -- Si aucune ligne : la boucle ne s'exécute pas, v_promo_id reste NULL.
  FOR _r IN
    SELECT pc.id,
           pc.active,
           pc.starts_at,
           pc.expires_at,
           pc.max_uses,
           pc.used_count,
           pc.discount_percent,
           pc.single_use_per_user,
           pc.targeting_mode
    FROM   public.promo_codes pc
    WHERE  pc.code = upper(trim(p_code))
  LOOP
    v_promo_id            := _r.id;
    v_active              := _r.active;
    v_starts_at           := _r.starts_at;
    v_expires_at          := _r.expires_at;
    v_max_uses            := _r.max_uses;
    v_used_count          := _r.used_count;
    v_discount_pct        := _r.discount_percent;
    v_single_use_per_user := _r.single_use_per_user;
    v_targeting_mode      := _r.targeting_mode;
  END LOOP;

  IF v_promo_id IS NULL THEN
    RETURN QUERY SELECT false, false,
      NULL::uuid, NULL::uuid, 0::integer, 0::integer, 0::integer,
      'not_found'::text;
    RETURN;
  END IF;

  -- ── 2. Validation provider ───────────────────────────────
  IF p_provider NOT IN ('stripe', 'crypto', 'free') THEN
    RETURN QUERY SELECT false, false,
      v_promo_id, NULL::uuid,
      v_used_count, v_max_uses, v_discount_pct,
      'invalid_provider'::text;
    RETURN;
  END IF;

  -- ── 3. Idempotence ───────────────────────────────────────
  -- AVANT tout autre check. Webhook retry → toujours valide.
  IF p_payment_reference IS NOT NULL THEN
    FOR _r IN
      SELECT pcu.id, pcu.promo_code_id
      FROM   public.promo_code_usages pcu
      WHERE  pcu.provider          = p_provider
        AND  pcu.payment_reference = p_payment_reference
      LIMIT  1
    LOOP
      v_existing_id       := _r.id;
      v_existing_promo_id := _r.promo_code_id;
    END LOOP;

    IF v_existing_id IS NOT NULL THEN
      IF v_existing_promo_id = v_promo_id THEN
        RETURN QUERY SELECT true, true,
          v_promo_id, v_existing_id,
          v_used_count, v_max_uses, v_discount_pct,
          NULL::text;
      ELSE
        RETURN QUERY SELECT false, false,
          v_promo_id, NULL::uuid,
          v_used_count, v_max_uses, v_discount_pct,
          'payment_reference_conflict'::text;
      END IF;
      RETURN;
    END IF;
  END IF;

  -- ── 4. Product targeting ─────────────────────────────────
  -- fail-closed : IF NOT EXISTS remplace SELECT EXISTS INTO.
  IF v_targeting_mode = 'specific' THEN
    IF p_product_id IS NULL THEN
      RETURN QUERY SELECT false, false,
        v_promo_id, NULL::uuid,
        v_used_count, v_max_uses, v_discount_pct,
        'product_required'::text;
      RETURN;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM   public.promo_code_products pcp
      WHERE  pcp.promo_code_id = v_promo_id
        AND  pcp.product_id    = p_product_id
    ) THEN
      RETURN QUERY SELECT false, false,
        v_promo_id, NULL::uuid,
        v_used_count, v_max_uses, v_discount_pct,
        'product_not_targeted'::text;
      RETURN;
    END IF;
  END IF;

  -- ── 5. Single use pre-check ──────────────────────────────
  IF v_single_use_per_user THEN
    IF EXISTS (
      SELECT 1
      FROM   public.promo_code_usages pcu
      WHERE  pcu.promo_code_id       = v_promo_id
        AND  pcu.user_id             = p_user_id
        AND  pcu.single_use_enforced = true
    ) THEN
      RETURN QUERY SELECT false, false,
        v_promo_id, NULL::uuid,
        v_used_count, v_max_uses, v_discount_pct,
        'already_used_by_user'::text;
      RETURN;
    END IF;
  END IF;

  -- ── 6. Validation état du code ───────────────────────────
  IF NOT v_active THEN
    RETURN QUERY SELECT false, false,
      v_promo_id, NULL::uuid,
      v_used_count, v_max_uses, v_discount_pct,
      'revoked'::text;
    RETURN;
  END IF;

  IF v_starts_at IS NOT NULL AND v_starts_at > now() THEN
    RETURN QUERY SELECT false, false,
      v_promo_id, NULL::uuid,
      v_used_count, v_max_uses, v_discount_pct,
      'not_started_yet'::text;
    RETURN;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN QUERY SELECT false, false,
      v_promo_id, NULL::uuid,
      v_used_count, v_max_uses, v_discount_pct,
      'expired'::text;
    RETURN;
  END IF;

  -- ── 7. Bloc atomique : incrément + usage ─────────────────
  -- RETURNING INTO (DML) n'est pas affecté par l'injection Supabase.
  BEGIN
    UPDATE public.promo_codes
    SET    used_count = used_count + 1
    WHERE  id = v_promo_id
      AND  active = true
      AND  (starts_at IS NULL OR starts_at <= now())
      AND  (expires_at IS NULL OR expires_at >= now())
      AND  (max_uses IS NULL OR used_count < max_uses)
    RETURNING used_count
    INTO  v_new_count;

    IF v_new_count IS NULL THEN
      RETURN QUERY SELECT false, false,
        v_promo_id, NULL::uuid,
        v_used_count, v_max_uses, v_discount_pct,
        'exhausted'::text;
      RETURN;
    END IF;

    INSERT INTO public.promo_code_usages (
      promo_code_id,
      user_id,
      provider,
      payment_reference,
      discount_applied,
      single_use_enforced
    ) VALUES (
      v_promo_id,
      p_user_id,
      p_provider,
      p_payment_reference,
      p_discount_applied,
      v_single_use_per_user
    )
    RETURNING id
    INTO v_new_usage_id;

    RETURN QUERY SELECT true, false,
      v_promo_id, v_new_usage_id,
      v_new_count, v_max_uses, v_discount_pct,
      NULL::text;

  EXCEPTION WHEN unique_violation THEN
    -- SAVEPOINT a rollbacké l'UPDATE. Distinguer la cause.

    -- CHECK A : payment_reference (FOR...LOOP, pas de SELECT INTO)
    IF p_payment_reference IS NOT NULL THEN
      v_existing_id       := NULL;
      v_existing_promo_id := NULL;

      FOR _r IN
        SELECT pcu.id, pcu.promo_code_id
        FROM   public.promo_code_usages pcu
        WHERE  pcu.provider          = p_provider
          AND  pcu.payment_reference = p_payment_reference
        LIMIT  1
      LOOP
        v_existing_id       := _r.id;
        v_existing_promo_id := _r.promo_code_id;
      END LOOP;

      IF v_existing_id IS NOT NULL THEN
        IF v_existing_promo_id = v_promo_id THEN
          RETURN QUERY SELECT true, true,
            v_promo_id, v_existing_id,
            v_used_count, v_max_uses, v_discount_pct,
            NULL::text;
        ELSE
          RETURN QUERY SELECT false, false,
            v_promo_id, NULL::uuid,
            v_used_count, v_max_uses, v_discount_pct,
            'payment_reference_conflict'::text;
        END IF;
        RETURN;
      END IF;
    END IF;

    -- CHECK B : single_use_per_user concurrent
    IF v_single_use_per_user THEN
      IF EXISTS (
        SELECT 1
        FROM   public.promo_code_usages pcu
        WHERE  pcu.promo_code_id       = v_promo_id
          AND  pcu.user_id             = p_user_id
          AND  pcu.single_use_enforced = true
      ) THEN
        RETURN QUERY SELECT false, false,
          v_promo_id, NULL::uuid,
          v_used_count, v_max_uses, v_discount_pct,
          'already_used_by_user'::text;
        RETURN;
      END IF;
    END IF;

    RAISE;
  END;

END;
$BODY$;


-- ════════════════════════════════════════════════════════════
-- §2 — Permissions nouvelle signature (6 paramètres)
-- ════════════════════════════════════════════════════════════

REVOKE EXECUTE ON FUNCTION public.consume_promo_code(
  text, uuid, text, text, integer, uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.consume_promo_code(
  text, uuid, text, text, integer, uuid
) FROM anon;

REVOKE EXECUTE ON FUNCTION public.consume_promo_code(
  text, uuid, text, text, integer, uuid
) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.consume_promo_code(
  text, uuid, text, text, integer, uuid
) TO service_role;


-- ════════════════════════════════════════════════════════════
-- §3 — DROP ancienne signature 5 paramètres
-- ════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.consume_promo_code(
  text, uuid, text, text, integer
);


-- ════════════════════════════════════════════════════════════
-- FIN Phase 3A-2b
-- ════════════════════════════════════════════════════════════
