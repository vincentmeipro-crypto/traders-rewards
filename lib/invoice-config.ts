/**
 * ============================================================
 * INVOICE CONFIGURATION — Traders Rewards
 * ============================================================
 * Configuration centralisée pour facturation clients.
 *
 * - Source de vérité légale (LEGAL_ENTITY)
 * - TVA : NULL actuellement (Traders Rewards OÜ n'a pas de numéro VAT)
 * - Format numérotation TR-YYYY-NNNNNN
 * - Localisations FR/EN/ES
 * ============================================================
 */

import { LEGAL_ENTITY } from "./legal-entity";

// ── TVA CONFIGURATION ────────────────────────────────────────
// Actuellement : aucune TVA applicable
// Structure prête pour configuration future

export const TAX_CONFIG = {
  // Situation actuelle : aucune TVA
  rate: null as number | null,
  sellerVatNumber: null as string | null,

  // Règles futures (à configurer ultérieurement)
  rulesByCountry: {} as Record<string, { rate: number; reverse_charge_b2b?: boolean }>,
} as const;

// ── SELLER SNAPSHOT ──────────────────────────────────────────
// Source de vérité depuis lib/legal-entity.ts
// Snapshot à chaque facture pour immuabilité

export const getSellerSnapshot = () => ({
  legal_name: LEGAL_ENTITY.name,                        // "Traders Rewards OÜ"
  registration_number: LEGAL_ENTITY.registryCode,      // "17603642"
  address: LEGAL_ENTITY.address,                        // full address Estonia
  country: "Estonia",
  email: LEGAL_ENTITY.email,
  vat_number: TAX_CONFIG.sellerVatNumber,               // NULL actuellement
});

// ── INVOICE NUMBER FORMAT ────────────────────────────────────

export const INVOICE_NUMBER_FORMAT = {
  prefix: "TR",
  year: (date: Date) => date.getFullYear(),
  separator: "-",
  paddingLength: 6,
} as const;

export function buildInvoiceNumber(year: number, sequenceNumber: number): string {
  const { prefix, separator, paddingLength } = INVOICE_NUMBER_FORMAT;
  const paddedNumber = String(sequenceNumber).padStart(paddingLength, "0");
  return `${prefix}${separator}${year}${separator}${paddedNumber}`;
}

export function parseInvoiceNumber(invoiceNumber: string): { year: number; sequence: number } | null {
  // Format: TR-2026-000001
  const match = invoiceNumber.match(/^TR-(\d{4})-(\d{6})$/);
  if (!match) return null;
  return {
    year: parseInt(match[1], 10),
    sequence: parseInt(match[2], 10),
  };
}

// ── INVOICE TRANSLATIONS ────────────────────────────────────

export const INVOICE_I18N = {
  fr: {
    title: "Facture",
    invoiceNumber: "N° Facture",
    issuedAt: "Date d'émission",
    billingDate: "Date de facturation",
    soldTo: "Facturé à",
    soldToShort: "Client",
    serviceProvider: "Prestataire",
    description: "Description",
    quantity: "Quantité",
    unitPrice: "Prix unitaire",
    subtotal: "Sous-total",
    taxRate: "Taux TVA",
    taxAmount: "Montant TVA",
    total: "Total",
    totalAmount: "Montant total",
    paymentReference: "Référence de paiement",
    paymentMethod: "Mode de paiement",
    promoCodeApplied: "Code promo appliqué",
    affiliateCode: "Code d'affiliation",
    notes: "Remarques",
    certificateNotice: "Ce document tient lieu de facture acquittée.",
    paymentConfirmation: "Paiement reçu et confirmé.",
    challengeAccountSize: "Taille du compte",
    challengeModel: "Modèle",
    termsAccepted: "CGV acceptées",
    language: "Langue",
  },
  en: {
    title: "Invoice",
    invoiceNumber: "Invoice Number",
    issuedAt: "Issue Date",
    billingDate: "Billing Date",
    soldTo: "Bill To",
    soldToShort: "Customer",
    serviceProvider: "Service Provider",
    description: "Description",
    quantity: "Quantity",
    unitPrice: "Unit Price",
    subtotal: "Subtotal",
    taxRate: "Tax Rate",
    taxAmount: "Tax Amount",
    total: "Total",
    totalAmount: "Total Amount",
    paymentReference: "Payment Reference",
    paymentMethod: "Payment Method",
    promoCodeApplied: "Promo Code Applied",
    affiliateCode: "Affiliate Code",
    notes: "Notes",
    certificateNotice: "This document serves as a proof of payment.",
    paymentConfirmation: "Payment received and confirmed.",
    challengeAccountSize: "Account Size",
    challengeModel: "Model",
    termsAccepted: "Terms Accepted",
    language: "Language",
  },
  es: {
    title: "Factura",
    invoiceNumber: "Número de Factura",
    issuedAt: "Fecha de Emisión",
    billingDate: "Fecha de Facturación",
    soldTo: "Facturado a",
    soldToShort: "Cliente",
    serviceProvider: "Proveedor de Servicios",
    description: "Descripción",
    quantity: "Cantidad",
    unitPrice: "Precio Unitario",
    subtotal: "Subtotal",
    taxRate: "Tasa de Impuesto",
    taxAmount: "Monto de Impuesto",
    total: "Total",
    totalAmount: "Monto Total",
    paymentReference: "Referencia de Pago",
    paymentMethod: "Método de Pago",
    promoCodeApplied: "Código Promocional Aplicado",
    affiliateCode: "Código de Afiliado",
    notes: "Notas",
    certificateNotice: "Este documento sirve como comprobante de pago.",
    paymentConfirmation: "Pago recibido y confirmado.",
    challengeAccountSize: "Tamaño de Cuenta",
    challengeModel: "Modelo",
    termsAccepted: "Términos Aceptados",
    language: "Idioma",
  },
} as const;

// ── PAYMENT METHOD LABELS ────────────────────────────────────

export const PAYMENT_METHOD_LABELS = {
  stripe: { fr: "Carte bancaire", en: "Credit Card", es: "Tarjeta de Crédito" },
  crypto: { fr: "Crypto-monnaie", en: "Cryptocurrency", es: "Criptomoneda" },
  free: { fr: "Gratuit", en: "Free", es: "Gratis" },
} as const;
