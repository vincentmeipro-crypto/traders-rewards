/**
 * ============================================================
 * EMAIL CATALOG — Traders Rewards V1.3
 * ============================================================
 * Metadata pure des templates transactionnels.
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
    label:       "Activation Compte Challenger",
    description: "Envoyé après la création d'un Compte Challenger. Contient les identifiants MT5 si un compte a été provisionné.",
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
    type:        "challenger_validated",
    label:       "Challenger Validé",
    description: "Envoyé quand le Compte Challenger a atteint son objectif (+6%). Confirme la validation SANS annoncer de nouveaux identifiants — le même compte MT5 est conservé.",
    trigger:     "Objectif Challenger atteint (+6% profit, consistance ≤50%, DD respecté, 2 jours min)",
    sensitive:   false,
    variables: [
      { name: "accountSize", sensitive: false },
      { name: "mt5Login",    sensitive: false },
      { name: "date",        sensitive: false },
    ],
  },
  {
    type:        "challenger_expired",
    label:       "Compte Challenger Expiré (30J)",
    description: "Envoyé quand le Compte Challenger atteint la limite de 30 jours calendaires. Distinct de l'email de violation DD. Anti-double-envoi garanti via event_key.",
    trigger:     "Durée maximale de 30 jours atteinte sans validation",
    sensitive:   false,
    variables: [
      { name: "accountSize",  sensitive: false },
      { name: "mt5Login",     sensitive: false },
      { name: "creationDate", sensitive: false },
      { name: "endDate",      sensitive: false },
    ],
  },
  {
    type:        "failed",
    label:       "Compte Clôturé — Violation DD",
    description: "Envoyé quand un Compte Challenger ou un Compte Reward est automatiquement arrêté suite à un dépassement du Trailing Drawdown EOD. Distinct de l'expiration 30 jours.",
    trigger:     "Synchronisation MT5 — Trailing DD EOD dépassé",
    sensitive:   false,
    variables: [
      { name: "accountSize", sensitive: false },
      { name: "reason",      sensitive: false },
      { name: "mt5Login",    sensitive: false },
      { name: "phase",       sensitive: false },
      { name: "paidRewardsCount", sensitive: false },
      { name: "levelLabel",       sensitive: false },
      { name: "closedAt",         sensitive: false },
    ],
  },
  {
    type:        "funded",
    label:       "Activation Compte Reward",
    description: "Envoyé après validation du Challenger et activation du Compte Reward. Rappelle que les identifiants MT5 sont inchangés — même login, même mot de passe, même serveur.",
    trigger:     "Challenger validé + activation du Compte Reward",
    sensitive:   true,
    variables: [
      { name: "accountSize",  sensitive: false },
      { name: "mt5.login",    sensitive: true  },
      { name: "mt5.password", sensitive: true  },
      { name: "mt5.server",   sensitive: true  },
      { name: "setupLink",    sensitive: false },
    ],
  },
  {
    type:        "daily_update",
    label:       "Récap journalier",
    description: "Résumé quotidien enrichi : balance, equity, P&L du jour, profit total, consistance, plancher DD EOD, distance à l'objectif (Challenger) ou au seuil Reward.",
    trigger:     "Chaque jour à la clôture broker — 21:55 UTC",
    sensitive:   false,
    variables: [
      { name: "accountSize",          sensitive: false },
      { name: "phase",                sensitive: false },
      { name: "rewardLevel",          sensitive: false },
      { name: "levelLabel",           sensitive: false },
      { name: "balance",              sensitive: false },
      { name: "equity",               sensitive: false },
      { name: "dailyProfitUsd",       sensitive: false },
      { name: "profitUsd",            sensitive: false },
      { name: "profitPct",            sensitive: false },
      { name: "tradingDays",          sensitive: false },
      { name: "highestBalance",       sensitive: false },
      { name: "ddFloorUsd",          sensitive: false },
      { name: "totalLimit",           sensitive: false },
      { name: "startBalance",         sensitive: false },
      { name: "calendarDaysElapsed",  sensitive: false },
      { name: "calendarDaysMax",      sensitive: false },
      { name: "consistency",          sensitive: false },
      { name: "safetyNetUsd",         sensitive: false },
      { name: "rewardThresholdUsd",   sensitive: false },
      { name: "rewardCapUsd",         sensitive: false },
      { name: "qualifyingDays",       sensitive: false },
    ],
  },
  {
    type:        "phase2",
    label:       "Challenger Validé (compat.)",
    description: "Alias de l'email 'challenger_validated'. Conservé pour compatibilité avec les routes existantes.",
    trigger:     "Identique à challenger_validated",
    sensitive:   false,
    variables: [
      { name: "accountSize", sensitive: false },
      { name: "mt5.login",   sensitive: false },
    ],
  },
  {
    type:        "challenge_certificate",
    label:       "Certificat Challenger",
    description: "Certificat confirmant la validation du Compte Challenger et l'accès au Compte Reward.",
    trigger:     "Challenger validé",
    sensitive:   false,
    variables: [
      { name: "firstName",   sensitive: false },
      { name: "lastName",    sensitive: false },
      { name: "accountSize", sensitive: false },
      { name: "date",        sensitive: false },
    ],
  },
  {
    type:        "reward_progression",
    label:       "Reward payé — Progression",
    description: "Envoyé après chaque paiement de Reward (#1–#4). Confirme le paiement, affiche les règles du niveau suivant et la promesse 48H. Pour Reward #5 : email 'Parcours terminé' avec le récapitulatif de tous les Rewards.",
    trigger:     "Reward approuvée et paiement confirmé",
    sensitive:   false,
    variables: [
      { name: "firstName",          sensitive: false },
      { name: "accountSize",        sensitive: false },
      { name: "rewardPaid",         sensitive: false },
      { name: "rewardAmount",       sensitive: false },
      { name: "mt5Login",           sensitive: false },
      { name: "allRewardAmounts",   sensitive: false },
      { name: "totalCumulatedUsd",  sensitive: false },
    ],
  },
  {
    type:        "reward_certificate",
    label:       "Certificat Reward",
    description: "Confirmation d'une Reward approuvée avec son montant et son numéro de Reward (#1 à #5).",
    trigger:     "Reward approuvée par l'admin",
    sensitive:   false,
    variables: [
      { name: "firstName",    sensitive: false },
      { name: "lastName",     sensitive: false },
      { name: "accountSize",  sensitive: false },
      { name: "grossAmount",  sensitive: false },
      { name: "rewardLevel",  sensitive: false },
      { name: "date",         sensitive: false },
      { name: "netAmountEur", sensitive: false },
    ],
  },
  {
    type:        "phase1_certificate",
    label:       "Certificat Challenger (phase1)",
    description: "Identique au certificat Challenger. Conservé pour compatibilité avec les anciens certificats.",
    trigger:     "Challenger validé (type phase1)",
    sensitive:   false,
    variables: [
      { name: "firstName",   sensitive: false },
      { name: "lastName",    sensitive: false },
      { name: "accountSize", sensitive: false },
      { name: "date",        sensitive: false },
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
