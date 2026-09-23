/**
 * ============================================================
 * ATOMIC INVOICE CREATION — Traders Rewards
 * ============================================================
 * Crée facture de manière entièrement transactionnelle.
 *
 * Garanties:
 * - 2 webhooks du même paiement → 1 facture + 1 numéro
 * - 10 webhooks différents → 10 factures + 10 numéros
 * - Zéro race condition via pg_advisory_xact_lock PostgreSQL
 * - Idempotence garantie: created=true/false indique nouveau ou existant
 * ============================================================
 */

import { createAdminClient } from "./supabase/admin";

export interface CreateInvoiceAtomicInput {
  user_id: string;
  challenge_id: string | null;
  payment_provider: "stripe" | "crypto" | "free";
  payment_reference: string;
  customer_email: string;
  customer_name: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_postal_code: string | null;
  customer_country: string | null;
  customer_company: string | null;
  customer_vat_number: string | null;
  product_name: string;
  account_size: string;
  product_description: string | null;
  quantity: number;
  promo_code_used: string | null;
  affiliate_code: string | null;
  currency: string;
  subtotal_cents: number;
  amount_paid_cents: number;
  seller_legal_name: string;
  seller_registration_number: string;
  seller_address: string;
  seller_country: string;
  seller_email: string;
  seller_vat_number: string | null;
  language: "fr" | "en" | "es";
}

export interface CreateInvoiceAtomicResult {
  success: boolean;
  invoice?: {
    id: string;
    invoice_number: string;
    created: boolean; // true = créée maintenant, false = existait déjà
  };
  error?: string;
}

/**
 * Crée une facture de manière atomique et idempotente.
 *
 * Logique TRANSACTIONNELLE (PostgreSQL pg_advisory_xact_lock):
 * 1. Verrouiller le paiement (payment_provider + payment_reference) via advisory lock
 * 2. Vérifier si facture existe (idempotence)
 * 3. Si existe → retourner facture existante (created=false) SANS consommer de numéro
 * 4. Si n'existe pas → consommer 1 numéro atomiquement + insérer facture (created=true)
 * 5. Libérer le verrou au COMMIT
 *
 * Garantie: Même si 2 webhooks arrivent EXACTEMENT simultanément pour le même paiement:
 * - PostgreSQL sérialise les appels via pg_advisory_xact_lock
 * - Le premier génère le numéro + insère
 * - Le second retrouve la facture existante, ne consomme pas de numéro
 * - Résultat: 1 facture, 1 numéro
 */
export async function createInvoiceAtomic(
  input: CreateInvoiceAtomicInput
): Promise<CreateInvoiceAtomicResult> {
  try {
    const admin = createAdminClient();

    const { data: result, error } = await admin.rpc(
      "create_invoice_atomic",
      {
        p_user_id: input.user_id,
        p_challenge_id: input.challenge_id,
        p_payment_provider: input.payment_provider,
        p_payment_reference: input.payment_reference,
        p_customer_email: input.customer_email,
        p_customer_name: input.customer_name,
        p_customer_address: input.customer_address,
        p_customer_city: input.customer_city,
        p_customer_postal_code: input.customer_postal_code,
        p_customer_country: input.customer_country,
        p_customer_company: input.customer_company,
        p_customer_vat_number: input.customer_vat_number,
        p_product_name: input.product_name,
        p_account_size: input.account_size,
        p_product_description: input.product_description,
        p_quantity: input.quantity,
        p_promo_code_used: input.promo_code_used,
        p_affiliate_code: input.affiliate_code,
        p_currency: input.currency,
        p_subtotal_cents: input.subtotal_cents,
        p_amount_paid_cents: input.amount_paid_cents,
        p_seller_legal_name: input.seller_legal_name,
        p_seller_registration_number: input.seller_registration_number,
        p_seller_address: input.seller_address,
        p_seller_country: input.seller_country,
        p_seller_email: input.seller_email,
        p_seller_vat_number: input.seller_vat_number,
        p_language: input.language,
      }
    );

    if (error || !result) {
      return {
        success: false,
        error: `RPC create_invoice_atomic failed: ${error?.message || "unknown error"}`,
      };
    }

    const invoiceResult = result as {
      id: string;
      invoice_number: string;
      created: boolean;
    };

    return {
      success: true,
      invoice: invoiceResult,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: `Invoice creation failed: ${message}`,
    };
  }
}
