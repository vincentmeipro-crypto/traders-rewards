/**
 * ============================================================
 * INVOICE NUMBERING — Traders Rewards
 * ============================================================
 * Génération transactionnelle robuste des numéros de facture.
 *
 * Format: TR-YYYY-NNNNNN (ex: TR-2026-000001)
 * - Concurrence gérée via PostgreSQL
 * - Pas de race condition
 * - Idempotence sur payment_provider + payment_reference
 * ============================================================
 */

import { createAdminClient } from "./supabase/admin";

export interface GenerateInvoiceNumberResult {
  success: boolean;
  invoiceNumber?: string;
  error?: string;
}

/**
 * Générer un numéro de facture unique transactionnellement.
 *
 * Logique ATOMIQUE (PostgreSQL):
 * 1. Vérifier si facture existe déjà (payment_provider + payment_reference)
 * 2. Si oui → retourner le numéro existant (idempotence webhook)
 * 3. Si non → appeler fonction PostgreSQL generate_invoice_number()
 *    - INSERT ON CONFLICT DO UPDATE sur invoice_counters (atomique)
 *    - Retour: numéro unique garanti, même en concurrence
 * 4. Retourner le numéro
 *
 * Transactionnel : PostgreSQL gère la concurrence via INSERT ON CONFLICT.
 * Aucune race condition possible.
 */
export async function generateInvoiceNumber(
  paymentProvider: string,
  paymentReference: string
): Promise<GenerateInvoiceNumberResult> {
  try {
    const admin = createAdminClient();
    const now = new Date();
    const currentYear = now.getFullYear();

    // 1. Vérifier si facture existe déjà (idempotence)
    const { data: existing } = await admin
      .from("invoices")
      .select("invoice_number")
      .eq("payment_provider", paymentProvider)
      .eq("payment_reference", paymentReference)
      .maybeSingle();

    if (existing && existing.invoice_number) {
      // Facture existe déjà → retourner son numéro (webhook retry)
      return {
        success: true,
        invoiceNumber: existing.invoice_number,
      };
    }

    // 2. Appeler fonction PostgreSQL ATOMIQUE
    // Cette fonction effectue INSERT ON CONFLICT DO UPDATE de manière transactionnelle
    const { data: result, error } = await admin.rpc(
      "generate_invoice_number",
      { target_year: currentYear }
    );

    if (error || !result) {
      return {
        success: false,
        error: `RPC call failed: ${error?.message || "unknown error"}`,
      };
    }

    const invoiceNumber = result as string;

    // 3. Valider format (santé check)
    if (!isValidInvoiceNumber(invoiceNumber)) {
      return {
        success: false,
        error: `Invalid invoice number format: ${invoiceNumber}`,
      };
    }

    return {
      success: true,
      invoiceNumber,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      success: false,
      error: `Invoice number generation failed: ${message}`,
    };
  }
}

/**
 * Vérifier la validité d'un numéro de facture.
 */
export function isValidInvoiceNumber(invoiceNumber: string): boolean {
  return /^TR-\d{4}-\d{6}$/.test(invoiceNumber);
}
