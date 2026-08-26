/**
 * ============================================================
 * EMAIL CATALOG — Traders Rewards Phase 3B-1b
 * ============================================================
 * Metadata pure des 9 templates transactionnels.
 * Aucune logique Resend, aucune logique métier, aucun credential.
 *
 * Utilisé par :
 *   app/api/admin/emails/preview/route.ts   → enrichit la réponse
 *   app/x8k3pz/emails/page.tsx              → tab Transactionnels (3B-1b2)
 * ============================================================
 */

import type { TransactionalEmailType } from "@/lib/email-templates";

// ── Types ─────────────────────────────────────────────────────

export type EmailVariable = {
  name:      string;
  sensitive: boolean;
};

export type EmailCatalogEntry = {
  type:        TransactionalEmailType;
  label:       string;
  description: string;
  trigger:     string;
  sensitive:   boolean;
  variables:   EmailVariable[];
};

// ── Catalog ───────────────────────────────────────────────────

export const EMAIL_CATALOG: EmailCatalogEntry[] = [
  {
    type:        "welcome",
    label:       "Accès Challenge",
    description: "Envoyé après la création d'un challenge. Contient les identifiants MT5 si un compte a été provisionné.",
    trigger:     "Achat validé (Stripe / Crypto / Free) ou provisioning manuel",
    sensitive:   true,
    variables: [
      { name: "accountSize",   sensitive: false },
      { name: "model",         sensitive: false },
      { name: "mt5.login",     sensitive: true  },
      { name: "mt5.password",  sensitive: true  },
      { name: "mt5.server",    sensitive: true  },
      { name: "setupLink",     sensitive: false },
    ],
  },
  {
    type:        "failed",
    label:       "Challenge échoué",
    description: "Envoyé quand un challenge est automatiquement arrêté suite à un dépassement de drawdown.",
    trigger:     "Synchronisation MT5 — Trailing DD EOD dépassé",
    sensitive:   false,
    variables: [
      { name: "accountSize", sensitive: false },
      { name: "reason",      sensitive: false },
      { name: "mt5Login",    sensitive: false },
    ],
  },
  {
    type:        "funded",
    label:       "Activation Compte Reward",
    description: "Envoyé après validation du Challenge et activation du Compte Reward. Contient les nouveaux identifiants MT5.",
    trigger:     "Challenge validé + activation du Compte Reward",
    sensitive:   true,
    variables: [
      { name: "accountSize",  sensitive: false },
      { name: "model",        sensitive: false },
      { name: "mt5.login",    sensitive: true  },
      { name: "mt5.password", sensitive: true  },
      { name: "mt5.server",   sensitive: true  },
      { name: "setupLink",    sensitive: false },
    ],
  },
  {
    type:        "daily_update",
    label:       "Récap journalier",
    description: "Résumé quotidien du compte : balance, performance, jours tradés et plancher Trailing DD EOD.",
    trigger:     "Traitement quotidien — comptes actifs synchronisés",
    sensitive:   false,
    variables: [
      { name: "accountSize",     sensitive: false },
      { name: "phase",           sensitive: false },
      { name: "balance",         sensitive: false },
      { name: "profitPct",       sensitive: false },
      { name: "tradingDays",     sensitive: false },
      { name: "model",           sensitive: false },
      { name: "highestBalance",  sensitive: false },
      { name: "totalLimit",      sensitive: false },
      { name: "startBalance",    sensitive: false },
    ],
  },
  {
    type:        "challenge_certificate",
    label:       "Certificat Challenge",
    description: "Certificat confirmant la validation du Challenge et l'accès au niveau Reward Start.",
    trigger:     "Challenge validé",
    sensitive:   false,
    variables: [
      { name: "firstName",   sensitive: false },
      { name: "lastName",    sensitive: false },
      { name: "accountSize", sensitive: false },
      { name: "date",        sensitive: false },
    ],
  },
  {
    type:        "reward_certificate",
    label:       "Certificat Reward",
    description: "Confirmation d'une Reward approuvée avec son montant éligible à 100% et son justificatif.",
    trigger:     "Reward approuvée par l'admin",
    sensitive:   false,
    variables: [
      { name: "firstName",    sensitive: false },
      { name: "lastName",     sensitive: false },
      { name: "accountSize",  sensitive: false },
      { name: "grossAmount",  sensitive: false },
      { name: "model",        sensitive: false },
      { name: "date",         sensitive: false },
      { name: "netAmountEur", sensitive: false },
    ],
  },
  {
    type:        "apology",
    label:       "Compte rétabli",
    description: "Envoyé manuellement quand un compte est restauré après une erreur technique. Contient les identifiants MT5.",
    trigger:     "Action manuelle admin (Maintenance → Restauration)",
    sensitive:   true,
    variables: [
      { name: "firstName",    sensitive: false },
      { name: "accountSize",  sensitive: false },
      { name: "phase",        sensitive: false },
      { name: "mt5.login",    sensitive: true  },
      { name: "mt5.password", sensitive: true  },
      { name: "mt5.server",   sensitive: true  },
    ],
  },
];

// Helper : lookup par type
export function getCatalogEntry(type: TransactionalEmailType): EmailCatalogEntry | undefined {
  return EMAIL_CATALOG.find(e => e.type === type);
}
