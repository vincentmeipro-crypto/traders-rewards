/**
 * Gestion centralisée de la version des CGV
 * À mettre à jour quand les conditions générales changent
 */

export const TERMS_VERSION = "2026-09-22";

/**
 * Texte du consentement "Commencement immédiat" par langue
 */
export const IMMEDIATE_START_CONSENT_TEXT = {
  fr: "Je demande expressément que l'exécution de mon Challenge commence immédiatement après mon paiement, avant l'expiration du délai légal de rétractation de 14 jours. Je reconnais avoir été informé que, lorsque le service aura été pleinement exécuté, je perdrai mon droit de rétractation.",
  en: "I expressly request that my Challenge begin immediately after payment, before the expiry of the 14-day statutory withdrawal period. I acknowledge that I have been informed that, once the service has been fully performed, I will lose my right of withdrawal.",
  es: "Solicito expresamente que la ejecución de mi Challenge comience inmediatamente después del pago, antes de que finalice el plazo legal de desistimiento de 14 días. Reconozco haber sido informado de que, una vez que el servicio haya sido ejecutado por completo, perderé mi derecho de desistimiento.",
} as const;

export type ConsentLanguage = keyof typeof IMMEDIATE_START_CONSENT_TEXT;
