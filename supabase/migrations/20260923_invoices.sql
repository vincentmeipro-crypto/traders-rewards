-- ============================================================
-- TRADERS REWARDS — Phase 3 — Invoices & Purchase Confirmation
-- 20260923_invoices.sql
--
-- Table: invoices (facturation clients)
-- Source de vérité: snapshot immuable
-- Accès: service_role (INSERT/SELECT), authenticated (SELECT own)
--
-- À exécuter manuellement dans Supabase SQL Editor.
-- ============================================================

BEGIN;

-- ── Table compteur annuel (numérotation atomique) ──────────────

CREATE TABLE IF NOT EXISTS public.invoice_counters (
  year                integer      NOT NULL PRIMARY KEY,
  last_number         integer      NOT NULL DEFAULT 0,
  updated_at          timestamptz  NOT NULL DEFAULT now(),

  CONSTRAINT invoice_counters_year_ck CHECK (year >= 2026),
  CONSTRAINT invoice_counters_number_ck CHECK (last_number >= 0 AND last_number <= 999999)
);

COMMENT ON TABLE public.invoice_counters IS
  'Compteur annuel atomique pour numérotation factures (TR-YYYY-NNNNNN). '
  'Une ligne par année. Mise à jour transactionnelle via fonction PostgreSQL.';

COMMENT ON COLUMN public.invoice_counters.last_number IS
  'Dernier numéro consommé pour l''année. Incrément atomique via INSERT ON CONFLICT DO UPDATE.';

-- ── Fonction PostgreSQL : génération atomique numéro facture ────

CREATE OR REPLACE FUNCTION public.generate_invoice_number(target_year integer)
RETURNS text AS $$
DECLARE
  next_number integer;
  invoice_number text;
BEGIN
  -- Incrémenter atomiquement le compteur pour l'année
  -- INSERT ... ON CONFLICT ... DO UPDATE = atomique en PostgreSQL
  INSERT INTO public.invoice_counters (year, last_number, updated_at)
  VALUES (target_year, 1, now())
  ON CONFLICT (year) DO UPDATE
  SET last_number = invoice_counters.last_number + 1,
      updated_at = now()
  RETURNING last_number INTO next_number;

  -- Construire le numéro TR-YYYY-NNNNNN
  invoice_number := 'TR-' || target_year || '-' || LPAD(next_number::text, 6, '0');

  -- Validation sanité check
  IF next_number < 1 OR next_number > 999999 THEN
    RAISE EXCEPTION 'Invoice number out of range: %', next_number;
  END IF;

  RETURN invoice_number;
END;
$$ LANGUAGE plpgsql STRICT;

COMMENT ON FUNCTION public.generate_invoice_number(integer) IS
  'Génère un numéro de facture unique et atomique pour une année donnée. '
  'Atomique même en cas de paiements concurrents. '
  'Retour: TR-YYYY-NNNNNN (ex: TR-2026-000001)';

-- ── Fonction PostgreSQL : création facture ATOMIQUE ───────────
-- Vérrouille et effectue vérification idempotence + génération numéro + INSERT en UNE transaction.

CREATE OR REPLACE FUNCTION public.create_invoice_atomic(
  p_user_id uuid,
  p_challenge_id uuid,
  p_payment_provider text,
  p_payment_reference text,
  p_customer_email text,
  p_customer_name text,
  p_customer_address text,
  p_customer_city text,
  p_customer_postal_code text,
  p_customer_country text,
  p_customer_company text,
  p_customer_vat_number text,
  p_product_name text,
  p_account_size text,
  p_product_description text,
  p_quantity integer,
  p_promo_code_used text,
  p_affiliate_code text,
  p_currency text,
  p_subtotal_cents integer,
  p_amount_paid_cents integer,
  p_seller_legal_name text,
  p_seller_registration_number text,
  p_seller_address text,
  p_seller_country text,
  p_seller_email text,
  p_seller_vat_number text,
  p_language text
)
RETURNS json AS $$
DECLARE
  v_advisory_lock_key bigint;
  v_existing_invoice_id uuid;
  v_existing_invoice_number text;
  v_new_invoice_id uuid;
  v_invoice_number text;
  v_current_year integer;
BEGIN
  -- 1. Calculer une clé advisory lock déterministe (hash du paiement)
  -- Garantit qu'un même paiement (provider + reference) acquiert le MÊME verrou.
  v_advisory_lock_key := ('x' || substring(
    md5(p_payment_provider || '::' || p_payment_reference),
    1, 15
  ))::bit(60)::bigint;

  -- 2. ACQUÉRIR LE VERROU TRANSACTIONNEL
  -- Deux webhooks du MÊME paiement vont attendre séquentiellement ici.
  -- Le verrou est libéré au COMMIT/ROLLBACK.
  PERFORM pg_advisory_xact_lock(v_advisory_lock_key);

  -- 3. VÉRIFIER IDEMPOTENCE (facture existe déjà pour ce paiement?)
  SELECT id, invoice_number
  INTO v_existing_invoice_id, v_existing_invoice_number
  FROM public.invoices
  WHERE payment_provider = p_payment_provider
    AND payment_reference = p_payment_reference
  LIMIT 1;

  -- 4A. SI FACTURE EXISTE: retourner immédiatement SANS consommer de numéro
  IF v_existing_invoice_id IS NOT NULL THEN
    RETURN json_build_object(
      'id', v_existing_invoice_id,
      'invoice_number', v_existing_invoice_number,
      'created', false
    );
  END IF;

  -- 4B. SI N'EXISTE PAS: générer numéro + insérer atomiquement
  v_current_year := EXTRACT(YEAR FROM now())::integer;

  -- Incrémenter le compteur (INSERT ON CONFLICT = atomique)
  INSERT INTO public.invoice_counters (year, last_number, updated_at)
  VALUES (v_current_year, 1, now())
  ON CONFLICT (year) DO UPDATE
  SET last_number = invoice_counters.last_number + 1,
      updated_at = now()
  RETURNING last_number INTO v_advisory_lock_key;  -- Réutilise v_advisory_lock_key pour stocker le numéro

  -- Construire le numéro
  v_invoice_number := 'TR-' || v_current_year || '-' || LPAD((v_advisory_lock_key)::text, 6, '0');

  -- Insérer la facture complète
  INSERT INTO public.invoices (
    invoice_number,
    user_id,
    challenge_id,
    payment_provider,
    payment_reference,
    customer_email,
    customer_name,
    customer_address,
    customer_city,
    customer_postal_code,
    customer_country,
    customer_company,
    customer_vat_number,
    product_name,
    account_size,
    product_description,
    quantity,
    promo_code_used,
    affiliate_code,
    currency,
    subtotal_cents,
    amount_paid_cents,
    tax_rate,
    tax_amount_cents,
    total_with_tax_cents,
    seller_legal_name,
    seller_registration_number,
    seller_address,
    seller_country,
    seller_email,
    seller_vat_number,
    language,
    issued_at
  ) VALUES (
    v_invoice_number,
    p_user_id,
    p_challenge_id,
    p_payment_provider,
    p_payment_reference,
    p_customer_email,
    p_customer_name,
    p_customer_address,
    p_customer_city,
    p_customer_postal_code,
    p_customer_country,
    p_customer_company,
    p_customer_vat_number,
    p_product_name,
    p_account_size,
    p_product_description,
    p_quantity,
    p_promo_code_used,
    p_affiliate_code,
    p_currency,
    p_subtotal_cents,
    p_amount_paid_cents,
    null,  -- tax_rate
    null,  -- tax_amount_cents
    null,  -- total_with_tax_cents
    p_seller_legal_name,
    p_seller_registration_number,
    p_seller_address,
    p_seller_country,
    p_seller_email,
    p_seller_vat_number,
    p_language,
    now()
  ) RETURNING id INTO v_new_invoice_id;

  -- Retourner la facture créée
  RETURN json_build_object(
    'id', v_new_invoice_id,
    'invoice_number', v_invoice_number,
    'created', true
  );

EXCEPTION WHEN unique_violation THEN
  -- Race condition extrême: si UNIQUE violation sur (payment_provider, payment_reference),
  -- c'est qu'un autre webhook a inséré entre la vérification et l'INSERT.
  -- Récupérer la facture qui vient d'être créée et la retourner.
  SELECT id, invoice_number
  INTO v_existing_invoice_id, v_existing_invoice_number
  FROM public.invoices
  WHERE payment_provider = p_payment_provider
    AND payment_reference = p_payment_reference
  LIMIT 1;

  IF v_existing_invoice_id IS NOT NULL THEN
    RETURN json_build_object(
      'id', v_existing_invoice_id,
      'invoice_number', v_existing_invoice_number,
      'created', false
    );
  END IF;

  -- Si on ne trouve toujours pas la facture, c'est une vraie erreur
  RAISE EXCEPTION 'Invoice creation failed: could not find created invoice after UNIQUE violation for % / %',
    p_payment_provider, p_payment_reference;

END;
$$ LANGUAGE plpgsql STRICT;

COMMENT ON FUNCTION public.create_invoice_atomic(...) IS
  'Crée une facture de manière ATOMIQUE et IDEMPOTENTE. '
  'Verrouille le paiement (provider + reference) transactionnellement. '
  'Deux webhooks du même paiement arrivant simultanément: '
  '  - Le premier obtient le verrou, génère numéro, insère facture, retourne created=true. '
  '  - Le deuxième attend, retrouve la facture existante, retourne created=false. '
  '  - Résultat: 1 facture, 1 numéro consommé, zéro race condition. '
  'Retour: {id, invoice_number, created: boolean}';

-- ── Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  -- Identifiant
  id                      uuid        NOT NULL DEFAULT gen_random_uuid(),
  invoice_number          text        NOT NULL UNIQUE,  -- TR-2026-000001 format

  -- Références
  user_id                 uuid        NOT NULL,
  challenge_id            uuid,                          -- FK challenges (peut être NULL temporairement)
  payment_provider        text        NOT NULL CHECK (payment_provider IN ('stripe', 'crypto', 'free')),
  payment_reference       text        NOT NULL,         -- session_id ou payment_id, unique per provider

  -- ── SNAPSHOT CLIENT ──────────────────────────────────────
  customer_email          text        NOT NULL,
  customer_name           text,                          -- firstName + lastName au moment du paiement
  customer_address        text,                          -- adresse client si disponible
  customer_city           text,                          -- ville
  customer_postal_code    text,                          -- code postal
  customer_country        text,                          -- pays (pour règles fiscales futures)
  customer_company        text,                          -- SIRET/nom entreprise si B2B
  customer_vat_number     text,                          -- numéro TVA client si B2B

  -- ── SNAPSHOT PRODUIT ─────────────────────────────────────
  product_name            text        NOT NULL,         -- "Challenge $50,000" ou "Pack ×3…"
  account_size            text        NOT NULL,         -- "$50,000"
  product_description     text,                          -- description produit si utile
  quantity                integer     NOT NULL,         -- 1, 3, ou 5

  -- ── SNAPSHOT PROMO ──────────────────────────────────────
  promo_code_used         text,                          -- code appliqué si applicable

  -- ── SNAPSHOT AFFILIATION ────────────────────────────────
  affiliate_code          text,                          -- refCode si applicable

  -- ── SNAPSHOT FINANCIER ───────────────────────────────────
  currency                text        NOT NULL DEFAULT 'EUR',  -- EUR, USD, etc
  subtotal_cents          integer     NOT NULL,         -- montant HT (sans TVA)
  amount_paid_cents       integer     NOT NULL,         -- ce qui a réellement été facturé

  -- ── SNAPSHOT TVA (actuellement NULL) ─────────────────────
  -- TVA actuellement non applicable (Traders Rewards OÜ n'a pas de numéro VAT).
  -- Colonnes prêtes pour utilisation future.
  tax_rate                numeric(5,2),                 -- taux TVA appliqué (NULL = aucune TVA)
  tax_amount_cents        integer,                       -- montant TVA en centimes (NULL si pas de TVA)
  total_with_tax_cents    integer,                       -- montant TTC (NULL si pas de TVA)

  -- ── SNAPSHOT VENDEUR ─────────────────────────────────────
  seller_legal_name       text        NOT NULL,         -- "Traders Rewards OÜ"
  seller_registration_number text     NOT NULL,         -- "17603642"
  seller_address          text        NOT NULL,         -- adresse siège social
  seller_country          text        NOT NULL,         -- "Estonia"
  seller_email            text        NOT NULL,         -- email professionnel
  seller_vat_number       text,                          -- numéro TVA (NULL actuellement)

  -- ── AUDIT ────────────────────────────────────────────────
  language                text        NOT NULL CHECK (language IN ('fr', 'en', 'es')),
  issued_at               timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT invoices_pkey PRIMARY KEY (id),
  CONSTRAINT invoices_challenge_fk FOREIGN KEY (challenge_id) REFERENCES challenges(id),
  CONSTRAINT invoices_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT invoices_number_unique UNIQUE (invoice_number),
  CONSTRAINT invoices_payment_unique UNIQUE (payment_provider, payment_reference)
);

COMMENT ON TABLE public.invoices IS
  'Invoices/Factures : snapshot immuable du paiement client. '
  'Une facture par paiement (payment_provider + payment_reference). '
  'Append-only : aucune modification après création. '
  'TVA actuellement non applicable (NULL), prête pour configuration future.';

COMMENT ON COLUMN public.invoices.invoice_number IS
  'Format TR-YYYY-NNNNNN (ex: TR-2026-000001). Unique, immuable, généré serveur.';

COMMENT ON COLUMN public.invoices.payment_reference IS
  'Clé idempotence : session_id (Stripe) ou payment_id (NOWPayments). Unique par provider.';

COMMENT ON COLUMN public.invoices.subtotal_cents IS
  'Montant HT (sans TVA). Si TVA appliquée ultérieurement : total_with_tax = subtotal + tax_amount.';

COMMENT ON COLUMN public.invoices.tax_rate IS
  'Taux TVA appliqué (ex: 20.00). NULL si pas de TVA (situation actuelle).';

COMMENT ON COLUMN public.invoices.seller_vat_number IS
  'Numéro VAT vendeur (ex: EE17603642). NULL si pas de numéro VAT (situation actuelle).';

-- ── Index ────────────────────────────────────────────────────

-- Lookup par utilisateur (mes factures)
CREATE INDEX IF NOT EXISTS invoices_user_id_idx
  ON public.invoices(user_id);

-- Lookup par challenge
CREATE INDEX IF NOT EXISTS invoices_challenge_id_idx
  ON public.invoices(challenge_id)
  WHERE challenge_id IS NOT NULL;

-- Lookup par payment (recherche rapide idempotence)
CREATE INDEX IF NOT EXISTS invoices_payment_idx
  ON public.invoices(payment_provider, payment_reference);

-- Tri chronologique (affichage dashboard)
CREATE INDEX IF NOT EXISTS invoices_issued_at_idx
  ON public.invoices(user_id, issued_at DESC);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.invoices FROM PUBLIC;
REVOKE ALL ON public.invoices FROM anon;
REVOKE ALL ON public.invoices FROM authenticated;

-- Service role : SELECT + INSERT (backend)
GRANT SELECT, INSERT
  ON public.invoices
  TO service_role;

-- Authenticated : SELECT own invoices only
CREATE POLICY "authenticated_select_own_invoices"
  ON public.invoices FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT ON public.invoices TO authenticated;

-- ── Permissions : invoice_counters (lecture/écriture back-end uniquement) ──

REVOKE ALL ON public.invoice_counters FROM PUBLIC;
REVOKE ALL ON public.invoice_counters FROM anon;
REVOKE ALL ON public.invoice_counters FROM authenticated;

GRANT SELECT, INSERT, UPDATE
  ON public.invoice_counters
  TO service_role;

-- ── Fonction PostgreSQL : log email ATOMIQUE ─────────────────
-- Insère un log email avec ON CONFLICT DO NOTHING pour éviter doubles envois.
-- Seul le premier webhook qui insère remporte le droit d'envoyer l'email.

CREATE OR REPLACE FUNCTION public.log_email_atomic(
  p_type text,
  p_to_email text,
  p_user_id uuid,
  p_challenge_id uuid,
  p_subject text,
  p_resend_id text,
  p_status text,
  p_error text,
  p_event_key text
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.email_logs (
    type,
    to_email,
    user_id,
    challenge_id,
    subject,
    resend_id,
    status,
    error,
    event_key,
    created_at
  ) VALUES (
    p_type,
    p_to_email,
    p_user_id,
    p_challenge_id,
    p_subject,
    p_resend_id,
    p_status,
    p_error,
    p_event_key,
    now()
  )
  ON CONFLICT (event_key) DO NOTHING;  -- ← ATOMIQUE: un seul webhook peut insérer
END;
$$ LANGUAGE plpgsql STRICT;

COMMENT ON FUNCTION public.log_email_atomic(...) IS
  'Insère un log email de manière atomique via ON CONFLICT DO NOTHING. '
  'Si event_key existe (autre webhook a déjà inséré), cette insertion est ignorée silencieusement. '
  'Garantit un seul envoi email par événement même en cas de webhooks simultanés. '
  'Retour: void (pas de feedback sur insertion/conflikt depuis SQL).';

-- Permissions: fonctions de génération et logging (service_role seulement)
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(integer)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.create_invoice_atomic(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text,
  text, text, text, integer, text, text, text, integer, integer,
  text, text, text, text, text, text, text
)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.log_email_atomic(text, text, uuid, uuid, text, text, text, text, text)
  TO service_role;

-- ── Table email_logs: amélioration anti-doublon ────────────────
-- Ajouter UNIQUE constraint pour la clé d'idempotence email
-- Format clé: purchase_confirmation:stripe:sess_123 etc

ALTER TABLE public.email_logs
ADD CONSTRAINT email_logs_event_key_unique UNIQUE (event_key)
WHERE event_key IS NOT NULL;

COMMENT ON CONSTRAINT email_logs_event_key_unique ON public.email_logs IS
  'Garantit un seul envoi email par événement (achat, création défi, etc). '
  'Clé déterministe: <type>:<provider>:<payment_reference>. '
  'Utiliser INSERT ... ON CONFLICT DO NOTHING via log_email_atomic() pour atomicité garantie.';

COMMIT;
