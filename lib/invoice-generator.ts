/**
 * ============================================================
 * INVOICE GENERATOR — Traders Rewards
 * ============================================================
 * Builders purs pour factures HTML.
 *
 * Utilisation:
 *   1. buildInvoiceData() — construit les données snapshot
 *   2. buildInvoiceHTML() — génère HTML facturation
 *
 * Chaque facture est un SNAPSHOT immuable :
 * - prix au moment de l'émission
 * - coordonnées vendeur/client au moment de l'émission
 * - jamais régénérée à partir de données actuelles
 * ============================================================
 */

import { INVOICE_I18N, PAYMENT_METHOD_LABELS, getSellerSnapshot } from "./invoice-config";

// ── Types ────────────────────────────────────────────────────

export interface InvoiceData {
  id: string;
  invoice_number: string;
  user_id: string;
  challenge_id: string | null;

  // Payment
  payment_provider: "stripe" | "crypto" | "free";
  payment_reference: string;

  // Client
  customer_email: string;
  customer_name: string | null;
  customer_country: string | null;

  // Product
  product_name: string;
  account_size: string;
  quantity: number;

  // Promo
  promo_code_used: string | null;
  affiliate_code: string | null;

  // Financial
  currency: string;
  subtotal_cents: number;
  amount_paid_cents: number;
  tax_rate: number | null;
  tax_amount_cents: number | null;
  total_with_tax_cents: number | null;

  // Seller
  seller_legal_name: string;
  seller_registration_number: string;
  seller_address: string;
  seller_email: string;
  seller_vat_number: string | null;

  // Audit
  language: "fr" | "en" | "es";
  issued_at: string; // ISO 8601
  created_at: string; // ISO 8601
}

// ── HTML GENERATOR ───────────────────────────────────────────

export function buildInvoiceHTML(invoice: InvoiceData): string {
  const t = INVOICE_I18N[invoice.language];
  const paymentMethodLabel = PAYMENT_METHOD_LABELS[invoice.payment_provider][invoice.language];

  const issuedDate = new Date(invoice.issued_at).toLocaleDateString(
    invoice.language === "fr" ? "fr-FR" : invoice.language === "es" ? "es-ES" : "en-GB"
  );

  // Format monnaie
  const formatAmount = (cents: number) => {
    const euros = (cents / 100).toFixed(2);
    return `${euros} ${invoice.currency}`;
  };

  // Calcul lignes facture
  const unitPrice = Math.round(invoice.subtotal_cents / invoice.quantity);

  return `<!DOCTYPE html>
<html lang="${invoice.language}" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${invoice.invoice_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #333;
      line-height: 1.6;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      border-bottom: 2px solid #f0f0f0;
      padding-bottom: 20px;
    }
    .company-info h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .company-info p {
      font-size: 12px;
      color: #666;
      margin: 2px 0;
    }
    .invoice-meta {
      text-align: right;
    }
    .invoice-meta .number {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 10px;
      font-family: monospace;
    }
    .invoice-meta .date {
      font-size: 12px;
      color: #666;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    .party h3 {
      font-size: 11px;
      text-transform: uppercase;
      color: #999;
      margin-bottom: 10px;
      font-weight: 600;
    }
    .party p {
      font-size: 12px;
      margin: 4px 0;
    }
    .line-items {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 40px;
      font-size: 12px;
    }
    .line-items thead {
      background: #f9f9f9;
      border-top: 1px solid #e0e0e0;
      border-bottom: 1px solid #e0e0e0;
    }
    .line-items th {
      padding: 8px;
      text-align: left;
      font-weight: 600;
      color: #333;
    }
    .line-items td {
      padding: 12px 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    .line-items tr:last-child td {
      border-bottom: 1px solid #e0e0e0;
    }
    .amount-col {
      text-align: right;
      font-family: monospace;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-box {
      width: 300px;
      font-size: 12px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .totals-row.grand-total {
      font-size: 14px;
      font-weight: bold;
      background: #f9f9f9;
      padding: 12px 8px;
      border-top: 2px solid #e0e0e0;
      border-bottom: 2px solid #e0e0e0;
    }
    .footer {
      font-size: 11px;
      color: #999;
      border-top: 1px solid #f0f0f0;
      padding-top: 20px;
      margin-top: 40px;
    }
    .footer p {
      margin: 5px 0;
    }
    .notice {
      background: #f5f5f5;
      padding: 12px;
      font-size: 11px;
      margin: 20px 0;
      border-left: 3px solid #ddd;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <h1>${invoice.seller_legal_name}</h1>
        <p>${invoice.seller_registration_number}</p>
        <p>${invoice.seller_address}</p>
        <p>${invoice.seller_email}</p>
      </div>
      <div class="invoice-meta">
        <div class="number">${invoice.invoice_number}</div>
        <div class="date">${t.issuedAt}: ${issuedDate}</div>
      </div>
    </div>

    <!-- Parties (Bill To / Service Provider) -->
    <div class="parties">
      <div class="party">
        <h3>${t.soldTo}</h3>
        <p>${invoice.customer_name || invoice.customer_email}</p>
        <p>${invoice.customer_email}</p>
        ${invoice.customer_country ? `<p>${invoice.customer_country}</p>` : ""}
      </div>
      <div class="party">
        <h3>${t.serviceProvider}</h3>
        <p>${invoice.seller_legal_name}</p>
        <p>${invoice.seller_email}</p>
      </div>
    </div>

    <!-- Line Items -->
    <table class="line-items">
      <thead>
        <tr>
          <th>${t.description}</th>
          <th style="text-align: center;">${t.quantity}</th>
          <th class="amount-col">${t.unitPrice}</th>
          <th class="amount-col">${t.total}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${invoice.product_name}</strong><br>
            <span style="color: #666; font-size: 11px;">
              ${t.challengeAccountSize}: ${invoice.account_size}
              ${invoice.promo_code_used ? `<br>${t.promoCodeApplied}: ${invoice.promo_code_used}` : ""}
              ${invoice.affiliate_code ? `<br>${t.affiliateCode}: ${invoice.affiliate_code}` : ""}
            </span>
          </td>
          <td style="text-align: center;">${invoice.quantity}</td>
          <td class="amount-col">${formatAmount(unitPrice)}</td>
          <td class="amount-col">${formatAmount(invoice.subtotal_cents)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="totals-row">
          <span>${t.subtotal}</span>
          <span class="amount-col">${formatAmount(invoice.subtotal_cents)}</span>
        </div>
        ${invoice.tax_rate !== null && invoice.tax_rate !== undefined && invoice.tax_amount_cents !== null ? `
        <div class="totals-row">
          <span>${t.taxRate} (${invoice.tax_rate}%)</span>
          <span class="amount-col">${formatAmount(invoice.tax_amount_cents)}</span>
        </div>
        ` : ""}
        <div class="totals-row grand-total">
          <span>${t.total}</span>
          <span class="amount-col">${formatAmount(invoice.amount_paid_cents)}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notice">
      <p><strong>${t.paymentConfirmation}</strong></p>
      <p>${t.certificateNotice}</p>
      <p style="margin-top: 8px; font-size: 10px;">
        ${t.paymentMethod}: ${paymentMethodLabel}<br>
        ${t.paymentReference}: ${invoice.payment_reference}
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>Traders Rewards OÜ · ${invoice.seller_registration_number}</p>
      <p>${invoice.seller_address}</p>
      <p>${invoice.seller_email}</p>
    </div>
  </div>
</body>
</html>`;
}

// ── INVOICE DATA BUILDER (snapshot au moment du paiement) ─────

export interface InvoiceDataInput {
  user_id: string;
  challenge_id?: string | null;
  payment_provider: "stripe" | "crypto" | "free";
  payment_reference: string;
  customer_email: string;
  customer_name?: string | null;
  customer_country?: string | null;
  product_name: string;
  account_size: string;
  quantity: number;
  promo_code_used?: string | null;
  affiliate_code?: string | null;
  currency?: string;
  amount_paid_cents: number;
  language?: "fr" | "en" | "es";
}

export function buildInvoiceSnapshot(input: InvoiceDataInput): Omit<InvoiceData, "id" | "invoice_number" | "created_at"> {
  const seller = getSellerSnapshot();
  const language = (input.language || "en") as "fr" | "en" | "es";

  return {
    user_id: input.user_id,
    challenge_id: input.challenge_id || null,
    payment_provider: input.payment_provider,
    payment_reference: input.payment_reference,

    customer_email: input.customer_email,
    customer_name: input.customer_name || null,
    customer_country: input.customer_country || null,

    product_name: input.product_name,
    account_size: input.account_size,
    quantity: input.quantity,

    promo_code_used: input.promo_code_used || null,
    affiliate_code: input.affiliate_code || null,

    currency: input.currency || "EUR",
    subtotal_cents: input.amount_paid_cents, // actuellement, pas de TVA
    amount_paid_cents: input.amount_paid_cents,
    tax_rate: null, // TVA non applicable actuellement
    tax_amount_cents: null,
    total_with_tax_cents: null,

    seller_legal_name: seller.legal_name,
    seller_registration_number: seller.registration_number,
    seller_address: seller.address,
    seller_email: seller.email,
    seller_vat_number: seller.vat_number,

    language,
    issued_at: new Date().toISOString(),
  };
}
