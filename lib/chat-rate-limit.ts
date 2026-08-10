/**
 * TRADERS REWARDS — Live Chat — Rate Limiter in-memory
 * Phase 3B-3c2
 *
 * Rate limiter léger sans dépendance externe.
 * Utilise une Map module-level partagée entre les routes dans le même
 * processus Node.js (Vercel : par instance de fonction).
 *
 * Limitations connues :
 *  - Pas de partage entre instances Vercel distinctes (edge functions).
 *    Acceptable pour V1 : chaque instance limite indépendamment.
 *  - Pas de persistance entre redémarrages (cold start).
 *
 * Usage :
 *   const ok = checkRateLimit(`chat_start:${ip}`, 5, 5 * 60_000);
 *   if (!ok) return NextResponse.json({ error: "..." }, { status: 429 });
 */

interface RlEntry {
  count:   number;
  resetAt: number;
}

// Map partagée entre routes dans le même processus Node.js
const _store = new Map<string, RlEntry>();

// Timestamp du dernier nettoyage
let _lastClean = Date.now();

/**
 * Supprime les entrées expirées pour éviter les fuites mémoire.
 * Déclenché automatiquement, au maximum toutes les 60 secondes.
 */
function _maybeClean(): void {
  const now = Date.now();
  if (now - _lastClean < 60_000) return;
  _lastClean = now;
  for (const [key, entry] of _store) {
    if (now > entry.resetAt) _store.delete(key);
  }
}

/**
 * Vérifie et incrémente le compteur de rate limiting pour une clé.
 *
 * @param key       Clé unique identifiant le caller et l'action.
 *                  Exemples :
 *                    "chat_start:<ip>"            → 5 par 5 min
 *                    "chat_send:<conversationId>" → 20 par minute
 *                    "chat_read:<conversationId>" → 60 par minute
 *                    "chat_mark:<conversationId>" → 30 par minute
 *
 * @param maxCount  Nombre maximum d'appels autorisés dans la fenêtre.
 * @param windowMs  Durée de la fenêtre en millisecondes.
 *
 * @returns true  → requête autorisée (compteur incrémenté)
 *          false → rate limit atteint (retourner 429)
 */
export function checkRateLimit(
  key: string,
  maxCount: number,
  windowMs: number,
): boolean {
  _maybeClean();

  const now   = Date.now();
  const entry = _store.get(key);

  if (!entry || now > entry.resetAt) {
    // Nouvelle fenêtre
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxCount) {
    // Limite atteinte
    return false;
  }

  // Incrémenter dans la fenêtre courante
  entry.count++;
  return true;
}
