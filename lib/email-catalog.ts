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
    type:        "phase2",
    label:       "Passage Phase 2",
    description: "Envoyé quand un trader valide la Phase 1 et passe en Phase 2 avec un nouveau compte MT5.",
    trigger:     "MetaAPI sync — objectif Phase 1 atteint",
    sensitive:   true,
    variables: [
      { name: "accountSize",   sensitive: false },
      { name: "mt5.login",     sensitive: true  },
      { name: "mt5.password",  sensitive: true  },
      { name: "mt5.server",    sensitive: true  },
    ],
  },
  {
    type:        "failed",
    label:       "Challenge échoué",
    description: "Envoyé quand un challenge est automatiquement arrêté suite à un dépassement de drawdown.",
    trigger:     "MetaAPI sync — drawdown journalier ou total dépassé",
    sensitive:   false,
    variables: [
      { name: "accountSize", sensitive: false },
      { name: "reason",      sensitive: false },
      { name: "mt5Login",    sensitive: false },
    ],
  },
  {
    type:        "funded",
    label:       "Compte certifié",
    description: "Envoyé quand un trader valide la Phase 2 et obtient son compte Reward avec un nouveau login MT5.",
    trigger:     "MetaAPI sync — objectif Phase 2 atteint",
    sensitive:   true,
    variables: [
      { name: "accountSize",  sensitive: false },
      { name: "model",        sensitive: false },
      { name: "splitPct",     sensitive: false },
      { name: "mt5.login",    sensitive: true  },
      { name: "mt5.password", sensitive: true  },
      { name: "mt5.server",   sensitive: true  },
      { name: "setupLink",    sensitive: false },
    ],
  },
  {
    type:        "daily_update",
    label:       "Récap journalier",
    description: "Résumé de performance quotidien. Pour les comptes 1-Step, inclut le plancher trailing.",
    trigger:     "Cron quotidien — pour chaque challenge actif",
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
    type:        "phase1_certificate",
    label:       "Certificat Phase 1",
    description: "Certificat de validation de la Phase 1 avec lien de téléchargement personnalisé.",
    trigger:     "MetaAPI sync — objectif Phase 1 atteint (simultané avec Passage Phase 2)",
    sensitive:   false,
    variables: [
      { name: "firstName",   sensitive: false },
      { name: "lastName",    sensitive: false },
      { name: "accountSize", sensitive: false },
      { name: "date",        sensitive: false },
    ],
  },
  {
    type:        "challenge_certificate",
    label:       "Certificat Challenge",
    description: "Certificat de validation du challenge complet (Phase 2 réussie).",
    trigger:     "MetaAPI sync — objectif Phase 2 atteint (simultané avec Compte certifié)",
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
    description: "Confirmation de versement de récompense avec montant net et certificat téléchargeable.",
    trigger:     "Payout approuvé par l'admin",
    sensitive:   false,
    variables: [
      { name: "firstName",    sensitive: false },
      { name: "lastName",     sensitive: false },
      { name: "accountSize",  sensitive: false },
      { name: "grossAmount",  sensitive: false },
      { name: "model",        sensitive: false },
      { name: "splitPct",     sensitive: false },
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
