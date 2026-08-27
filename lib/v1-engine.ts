/**
 * ============================================================
 * TRADERS REWARDS V1.2 — Reward Model Engine
 * ============================================================
 *
 * Moteur de calcul pur pour le programme commercial "TRADERS REWARDS".
 *
 * RÈGLES ABSOLUES :
 *  - Aucun import Supabase / MT5 / email / mailer — TypeScript pur
 *  - Aucune modification des règles existantes 1-Step / 2-Step
 *  - Backward compat : les anciens challenges ignorent totalement ce fichier
 *  - Routing via rules_snapshot.rules.dd_model === "trailing_eod_lock"
 *    ET/OU challenges.dd_model === "trailing_eod_lock" (colonne directe)
 *
 * PROGRAMME COMMERCIAL : "TRADERS REWARDS"
 *   3 tailles de compte (25K / 50K / 100K), une seule étape.
 *   Ne pas confondre avec le champ technique model='1step' dans la DB.
 *
 * STRUCTURE 3 NIVEAUX MÉTIER :
 *
 *  NIVEAU 1 — CHALLENGER / CHALLENGE (phase_type="challenge") — APEX EOD MODEL :
 *   - Profit Target      = +6 % (25K=+1 500$ / 50K=+3 000$ / 100K=+6 000$)
 *   - Drawdown EOD fixe  = 1 000$ (25K) / 2 000$ (50K) / 3 000$ (100K) — montant fixe en $
 *   - Consistency Rule   = 50 % — best_day < 50 % du profit requis (V1.2)
 *   - Min trading days   = 2 jours minimum (V1.2)
 *   - Max trading days   = 30 calendaires depuis created_at
 *   - AUCUN verrou (trailing continue pendant tout le challenge)
 *
 *  NIVEAU 2 — REWARD START / REWARD #1 (phase_type="funded") — APEX EOD MODEL :
 *   - Profit Target      = +4 %
 *   - Drawdown EOD fixe  = 1 000$ (25K) / 2 000$ (50K) / 3 000$ (100K) — montant fixe en $
 *   - Safety Net (lock)  : highest_eod ≥ Safety Net → floor = start (permanent)
 *                          25K = 26 100$ / 50K = 52 100$ / 100K = 103 100$
 *   - Consistency Rule   = 50 % (best_day < 50 % du profit total — was 33 %)
 *   - Qualifying days    = 5 jours profitables qualifiants (inchangé)
 *   - Seuil qualifiant   : 25K = 100 USD / 50K = 250 USD / 100K = 300 USD / journée
 *   - Durée              = ILLIMITÉE
 *   - Caps Reward #1     : 25K = 300 $ / 50K = 500 $ / 100K = 750 $ (INCHANGÉS)
 *
 *  NIVEAU 3 — TRADER REWARD / REWARDS #2 À #5 (phase_type="reward_journey") :
 *   - Reward threshold   = Safety Net + cap du niveau (ex 25K R#1 : 26 100+300 = 26 400$)
 *   - Plancher FIXE      = start_balance (immuable, pas de trailing)
 *   - Consistency Rule   = 50 %
 *   - Caps Rewards #2-5  : voir V1_REWARD_CAPS (INCHANGÉS)
 *   - Après chaque Reward : postBalance = preBalance − rewardAmount (PAS de reset)
 *   - Max 5 Rewards — pas de Reward #6
 *
 *  Frais d'activation (activation_fee_eur) :
 *   - 25K = 99 EUR / 50K = 99 EUR / 100K = 149 EUR
 *
 * DISTINCTION EOD vs INTRADAY :
 *   - Le floor PROGRESSE uniquement à l'EOD (rollover broker à 22h00 UTC)
 *     via highest_eod (monotone non-décroissant, mis à jour en fin de journée).
 *   - La VIOLATION du floor est vérifiée en TEMPS RÉEL contre l'equity live.
 *   - Conséquence : le floor est calculé depuis des données EOD, mais le
 *     check de breach s'applique à n'importe quelle equity intraday.
 *
 * CONVENTION BREACH (stricte < ) :
 *   equity <  floor → BREACH (violation)
 *   equity == floor → PAS de breach (limite inférieure tolérée, delta = 0)
 *   equity >  floor → PAS de breach (buffer positif)
 *
 * IRREVOCABILITÉ :
 *   Une breach détecte = état "failed" PERMANENT.
 *   Même si l'equity récupère ensuite au-dessus du floor, l'état "failed"
 *   NE PEUT PAS être annulé automatiquement.
 *
 * RÉFÉRENCE 30 JOURS (À CONFIRMER) :
 *   La table challenges n'a pas de champ started_at ni first_trade_at.
 *   Deux interprétations possibles de "30 jours" :
 *     A) 30 jours calendaires depuis challenges.created_at
 *        → utiliser isV1MaxCalendarDaysExceeded()
 *     B) 30 jours de trading (compteur trading_days)
 *        → utiliser isV1MaxDaysExceeded()
 *   Recommandation : interprétation A (calendaire depuis created_at).
 *   À confirmer avec le métier avant toute intégration dans metaapi/sync.
 *
 * Intégration future dans metaapi/sync et cron/mt5-snapshot :
 *   APRÈS validation SQL de v1-migration.sql (voir scripts/sql/v1-migration.sql).
 *   NE PAS modifier les syncs avant validation de la migration.
 * ============================================================
 */

// ── Constantes publiques ──────────────────────────────────────

/** Valeur du discriminant de version dans rules_snapshot.rules et challenges.dd_model */
export const V1_DD_MODEL = "trailing_eod_lock" as const;

/** Règles contractuelles du Challenge V1 — APEX EOD MODEL */
export const V1_CHALLENGE = {
  profitTargetPct:  6,
  trailingDdPct:    4,   // Gardé pour l'affichage % legacy — calcul réel via V1_DD_USD_BY_BALANCE
  // consistencyPct : 50 % — identique Reward (V1.2 — même règle toutes phases)
  minTradingDays:   2,   // V1.2 : 2 jours minimum
  maxTradingDays:   30,
} as const;

/** Règles du Reward Account — qualification avant Reward #1 */
export const V1_REWARD_QUAL = {
  profitTargetPct:   4,
  trailingDdPct:     4,   // Legacy % — calcul réel via V1_DD_USD_BY_BALANCE
  trailingLockPct:   4,   // Legacy % — lock réel via V1_SAFETY_NET. Utiliser getV1SafetyNet().
  minQualifyingDays: 5,
} as const;

/**
 * Seuil USD minimum pour un jour qualifiant, indexé par balance initiale.
 * Apex EOD : montants relevés (was 50/100/150).
 */
export const V1_QUALIFYING_DAY_MIN_USD: Record<number, number> = {
  25000:  100,   // was  50
  50000:  250,   // was 100
  100000: 300,   // was 150
};

/**
 * Pourcentage de consistency par type de phase — APEX EOD MODEL V1.2.
 *
 *  Challenge (Niveau 1) : 50 % — best_day < 50 % du profit requis (V1.2)
 *  Reward #1–5 (Niveaux 2 & 3) : 50 % — best_day < 50 % du profit requis (was 33 %)
 *
 * Source unique — ne pas hardcoder ces valeurs ailleurs dans le code.
 */
export const V1_CONSISTENCY_PCT = {
  challenge: 50,
  reward: 50,
} as const;

/**
 * Plafonds de Reward par balance initiale et par niveau (1 à 5).
 *
 * Structure : V1_REWARD_CAPS[startBalance][rewardLevel] = montantMax en USD
 *
 *  25K  → #1: 300 / #2: 400 / #3: 500 / #4: 600  / #5: 750
 *  50K  → #1: 500 / #2: 650 / #3: 800 / #4: 1000 / #5: 1250
 * 100K  → #1: 750 / #2: 1000 / #3: 1250 / #4: 1500 / #5: 1750
 *
 * Source unique pour les caps — utiliser getV1RewardCap() plutôt que
 * lire directement ce tableau depuis les composants UI.
 */
export const V1_REWARD_CAPS: Record<number, Record<number, number>> = {
  25000:  { 1: 300,  2: 400,   3: 500,   4: 600,   5: 750   },
  50000:  { 1: 500,  2: 650,   3: 800,   4: 1000,  5: 1250  },
  100000: { 1: 750,  2: 1000,  3: 1250,  4: 1500,  5: 1750  },
};

/**
 * Frais d'activation Reward Account en EUR, par balance initiale.
 * Champ DB : activation_fee_eur (PAS activation_fee_usd).
 */
export const V1_ACTIVATION_FEE_EUR: Record<number, number> = {
  25000:   99,
  50000:   99,
  100000: 149,
};

/**
 * Trailing drawdown EOD par balance initiale (en %).
 * Gardé pour l'affichage legacy — le CALCUL réel utilise V1_DD_USD_BY_BALANCE.
 *
 *  25K → 4 %  (= 1 000$ fixe)
 *  50K → 4 %  (= 2 000$ fixe)
 * 100K → 3 %  (= 3 000$ fixe)
 */
export const V1_DD_PCT_BY_BALANCE: Record<number, number> = {
  25000:   4,
  50000:   4,
  100000:  3,
};

/**
 * Drawdown EOD fixe en USD — APEX EOD MODEL.
 * Le floor est calculé par : floor = highest_eod − ddUsd (montant fixe, non relatif).
 *
 *  25K  → 1 000 $
 *  50K  → 2 000 $
 * 100K  → 3 000 $
 */
export const V1_DD_USD_BY_BALANCE: Record<number, number> = {
  25000:   1000,
  50000:   2000,
  100000:  3000,
};

/**
 * Safety Net : seuil absolu de verrouillage du trailing EOD — APEX EOD MODEL.
 * Lorsque highest_eod ≥ Safety Net, le floor se verrouille définitivement
 * sur start_balance (immuable).
 *
 *  25K  → 26 100 $  (was start × 1.04 = 26 000)
 *  50K  → 52 100 $  (was start × 1.04 = 52 000)
 * 100K  → 103 100 $ (was start × 1.03 = 103 000)
 */
export const V1_SAFETY_NET: Record<number, number> = {
  25000:    26100,
  50000:    52100,
  100000:  103100,
};

/**
 * Retourne le pourcentage de trailing drawdown EOD pour une balance initiale.
 * Usage : affichage legacy (ex: "4%"). Le CALCUL réel utilise getV1DdUsdByBalance().
 *  25K → 4 %
 *  50K → 4 %
 * 100K → 3 %
 */
export function getV1DdPctByBalance(startBalance: number): number {
  return V1_DD_PCT_BY_BALANCE[startBalance] ?? V1_CHALLENGE.trailingDdPct;
}

/**
 * @deprecated Utiliser getV1SafetyNet() pour le seuil de lock Apex EOD.
 * Gardé pour rétrocompatibilité affichage.
 */
export function getV1LockPctByBalance(startBalance: number): number {
  return getV1DdPctByBalance(startBalance);
}

/**
 * Retourne le drawdown fixe en USD pour une balance initiale — APEX EOD MODEL.
 * Utiliser dans computeV1TrailingFloor() à la place de ddPct.
 *  25K  → 1 000 $
 *  50K  → 2 000 $
 * 100K  → 3 000 $
 */
export function getV1DdUsdByBalance(startBalance: number): number {
  return V1_DD_USD_BY_BALANCE[startBalance] ?? 1000;
}

/**
 * Retourne le Safety Net (seuil de verrouillage absolu) en $ pour une balance initiale.
 *  25K  → 26 100 $
 *  50K  → 52 100 $
 * 100K  → 103 100 $
 */
export function getV1SafetyNet(startBalance: number): number {
  return V1_SAFETY_NET[startBalance] ?? (startBalance * 1.04);
}

/**
 * Retourne le plafond maximum (en USD) pour un niveau de Reward donné.
 *
 * @param startBalance  Capital initial du compte (25000 / 50000 / 100000)
 * @param rewardLevel   Niveau de Reward (1 à 5)
 * @returns Montant maximum en USD, ou null si balance/niveau non reconnus
 *
 * Exemples :
 *   getV1RewardCap(25000, 1)  → 300
 *   getV1RewardCap(50000, 2)  → 650
 *   getV1RewardCap(100000, 5) → 1750
 */
export function getV1RewardCap(startBalance: number, rewardLevel: number): number | null {
  const caps = V1_REWARD_CAPS[startBalance];
  if (!caps) return null;
  return caps[rewardLevel] ?? null;
}

/**
 * Retourne le seuil USD de demande de Reward — APEX EOD MODEL.
 * threshold = Safety Net + cap du niveau de Reward.
 *
 * Exemples :
 *   getV1RewardThresholdUsd(25000,  1) → 26 100 + 300  = 26 400
 *   getV1RewardThresholdUsd(50000,  1) → 52 100 + 500  = 52 600
 *   getV1RewardThresholdUsd(100000, 1) → 103 100 + 750 = 103 850
 *   getV1RewardThresholdUsd(25000,  2) → 26 100 + 400  = 26 500
 *
 * @param rewardLevel  Numéro de Reward (1 à 5), default 1
 */
export function getV1RewardThresholdUsd(startBalance: number, rewardLevel: number = 1): number {
  return computeRewardRequestThreshold(startBalance, rewardLevel);
}

/**
 * Retourne le plancher fixe (permanent) du Niveau 3 — TRADER REWARD.
 * Après que le trailing s'est verrouillé sur le capital initial,
 * le floor ne bouge plus : il est définitivement égal à startBalance.
 */
export function getV1FixedFloor(startBalance: number): number {
  return startBalance;
}

// ── Types publics ─────────────────────────────────────────────

/**
 * Résultat d'un check drawdown V1.
 *
 * Convention breach (stricte) :
 *   breached = true  ↔  equity < floor   (delta négatif)
 *   breached = false ↔  equity >= floor  (delta zéro ou positif)
 */
export interface V1DDResult {
  /** true si equity < floor (breach — convention strict <) */
  breached: boolean;
  /** Floor effectif en USD au moment du check */
  floor:    number;
  /** Equity utilisée pour la comparaison */
  equity:   number;
  /** equity - floor (négatif si breached, 0 si exactement au floor, positif sinon) */
  delta:    number;
  /** true si le trailing est définitivement verrouillé sur start_balance */
  locked:   boolean;
}

/** Résultat du check d'objectif profit V1 */
export interface V1ProfitCheck {
  /** true si profit cible effectif atteint */
  met:                boolean;
  /** Profit réalisé en % */
  profitPct:          number;
  /** Cible effective après ajustement consistency */
  effectiveTargetPct: number;
  /** Cible de base sans consistency */
  baseTargetPct:      number;
}

/** Résultat de la vérification complète de transition challenge */
export interface V1ChallengeCheck {
  /** true si toutes les conditions sont réunies pour passer en Reward Account */
  canTransition:   boolean;
  profitCheck:     V1ProfitCheck;
  minDaysMet:      boolean;
  maxDaysExceeded: boolean;
  ddBreached:      boolean;
}

/** Résultat de la vérification de qualification Reward Account */
export interface V1RewardQualCheck {
  /** true si toutes les conditions de qualification sont réunies */
  qualified:          boolean;
  profitCheck:        V1ProfitCheck;
  ddBreached:         boolean;
  ddResult:           V1DDResult;
  qualifyingDaysMet:  boolean;
  qualifyingDays:     number;
  requiredDays:       number;
}

// ── Trailing Floor ────────────────────────────────────────────

/**
 * Calcule le floor effectif du trailing drawdown V1.
 *
 * Règle :
 *  - Si lockPct non null ET highest_eod ≥ start × (1 + lockPct/100)
 *    → floor = start_balance (verrouillé définitivement au capital initial)
 *  - Sinon : floor = highest_eod × (1 - ddPct/100)
 *
 * ⚠️ Le floor PROGRESSE uniquement à l'EOD (highest_eod mis à jour à 22h00 UTC).
 *    La vérification de breach s'applique en TEMPS RÉEL contre l'equity live.
 *
 * @param startBalance  Capital initial (ex: 50 000)
 * @param highestEod    Plus haut EOD atteint — monotone non-décroissant
 * @param ddUsd         Montant fixe de drawdown en $ (Apex EOD) — ex: 2000 pour 50K
 * @param safetyNet     Safety Net : seuil absolu de verrouillage en $ (null = pas de verrou)
 *                      Passer getV1SafetyNet(startBalance) pour le Reward Account.
 *                      null pour le Challenge (trailing libre sans verrou).
 *
 * Exemples Reward Account (50K, safetyNet=52 100, ddUsd=2 000) :
 *   highest=50 000 → floor = 50 000 − 2 000 = 48 000
 *   highest=51 000 → floor = 51 000 − 2 000 = 49 000
 *   highest=52 100 (≥ 52 100) → floor = 50 000 (verrouillé au capital initial)
 *   highest=54 000 (au-delà du verrou) → floor = 50 000 (toujours verrouillé)
 */
export function computeV1TrailingFloor(
  startBalance: number,
  highestEod:   number,
  ddUsd:        number,        // Montant fixe en $ (Apex EOD) — was: ddPct en %
  safetyNet:    number | null, // Seuil de lock absolu en $ — was: lockPct en %
): number {
  if (safetyNet !== null && highestEod >= safetyNet) {
    // Floor définitivement verrouillé au capital initial (Safety Net atteint)
    return startBalance;
  }
  // Trailing fixe : highest − montant$ (Apex EOD — was: highest × (1 - ddPct/100))
  return highestEod - ddUsd;
}

/**
 * Retourne true si le trailing est verrouillé (Safety Net atteinte).
 * Apex EOD : compare highest_eod à la Safety Net absolue en $.
 *
 * @param highestEod  Plus haut EOD atteint
 * @param safetyNet   Safety Net en $ (passer getV1SafetyNet(startBalance))
 */
export function isV1TrailingLocked(
  highestEod: number,
  safetyNet:  number,  // was: (startBalance, highestEod, lockPct)
): boolean {
  return highestEod >= safetyNet;
}

// ── DD Breach ─────────────────────────────────────────────────

/**
 * Vérifie si l'equity viole le floor trailing V1.
 * S'applique au Challenge (sans verrou) ET au Reward Account (avec verrou).
 *
 * Convention breach (stricte) :
 *   equity <  floor → breached = true  (violation)
 *   equity == floor → breached = false (au plancher, PAS de violation)
 *   equity >  floor → breached = false (buffer positif)
 *
 * ⚠️ IRREVOCABILITÉ : cette fonction détecte une breach au moment T.
 *    Si breached = true, l'état du compte doit passer à "failed" de manière
 *    permanente, indépendamment de toute recovery equity ultérieure.
 *
 * @param safetyNet  null = challenge (pas de verrou) / number = Safety Net $ pour Reward Account
 */
export function checkV1DDBreach(
  startBalance: number,
  highestEod:   number,
  equity:       number,
  ddUsd:        number,         // Montant fixe en $ (was: ddPct en %)
  safetyNet:    number | null,  // Safety Net en $ (was: lockPct en %)
): V1DDResult {
  const floor  = computeV1TrailingFloor(startBalance, highestEod, ddUsd, safetyNet);
  const locked = safetyNet !== null && isV1TrailingLocked(highestEod, safetyNet);
  return {
    breached: equity < floor,  // strict < : equity == floor est toléré
    floor,
    equity,
    delta:   equity - floor,   // négatif = breach, 0 = exactement au floor, positif = buffer
    locked,
  };
}

// ── Consistency Rule ──────────────────────────────────────────

/**
 * Calcule le profit cible effectif après application de la Consistency Rule.
 *
 * Apex EOD — Challenge : aucune consistency (passer consistencyPct = 0).
 *
 * Rewards #1–5 (consistencyPct=50 — Apex EOD, was 33) :
 *   Règle : best_day < 50 % du profit requis.
 *   Si best_day ≥ 50 % → cible monte à best_day / 0.50 = best_day × 2.
 *
 * Formule générale :
 *   consistencyTargetPct = Math.ceil((bestDay / (consistencyPct/100) / start × 100) × 100) / 100
 *   effectiveTarget      = Math.max(baseTarget, consistencyTargetPct)
 *
 * Note : la consistency ne fait jamais échouer le compte.
 *        La cible monte simplement jusqu'à ce que bestDay < consistencyPct % du profit requis.
 *
 * @param consistencyPct  0 = aucune règle (Challenge Apex EOD). 50 = Rewards Apex EOD.
 *                        Défaut : 0 (aucune règle).
 */
export function computeV1EffectiveProfitTarget(
  startBalance:     number,
  baseTargetPct:    number,
  bestDayProfitUsd: number,
  consistencyPct:   number = 0,  // 0 = aucune règle (Apex EOD Challenge)
): number {
  if (startBalance <= 0) return baseTargetPct;
  // consistencyPct = 0 → aucune règle de consistency (Challenge Apex EOD)
  if (bestDayProfitUsd <= 0 || consistencyPct <= 0) return baseTargetPct;
  // consistencyTargetPct = bestDay / (consistencyPct/100) / start × 100
  const divisor = consistencyPct / 100;
  const consistencyTargetPct = Math.ceil((bestDayProfitUsd / divisor / startBalance * 100) * 100) / 100;
  return Math.max(baseTargetPct, consistencyTargetPct);
}

// ── Profit Check ──────────────────────────────────────────────

/**
 * Vérifie si le profit cible (avec consistency optionnelle) est atteint.
 *
 * @param consistencyPct  0 = aucune règle (Challenge Apex EOD).
 *                        V1_CONSISTENCY_PCT.reward (50) pour les Rewards.
 *                        Défaut : 0 (challenge, aucune consistency).
 */
export function checkV1ProfitTarget(
  startBalance:     number,
  currentBalance:   number,
  baseTargetPct:    number,
  bestDayProfitUsd: number,
  consistencyPct:   number = 0,  // 0 = aucune règle
): V1ProfitCheck {
  const profitPct = startBalance > 0
    ? ((currentBalance - startBalance) / startBalance) * 100
    : 0;
  const effectiveTargetPct = computeV1EffectiveProfitTarget(
    startBalance,
    baseTargetPct,
    bestDayProfitUsd,
    consistencyPct,
  );
  return {
    met:                profitPct >= effectiveTargetPct,
    profitPct,
    effectiveTargetPct,
    baseTargetPct,
  };
}

// ── Trading Days ──────────────────────────────────────────────

/** Retourne true si le nombre minimum de jours de trading est atteint */
export function isV1MinDaysMet(tradingDays: number, minDays: number): boolean {
  return tradingDays >= minDays;
}

/**
 * Retourne true si la durée maximale en JOURS DE TRADING est dépassée.
 *
 * ⚠️ Cette fonction utilise le compteur trading_days (interprétation B).
 *    Pour la durée calendaire depuis created_at, voir isV1MaxCalendarDaysExceeded().
 *    (À CONFIRMER — voir note "RÉFÉRENCE 30 JOURS" en en-tête de fichier)
 */
export function isV1MaxDaysExceeded(tradingDays: number, maxDays: number): boolean {
  return tradingDays > maxDays;
}

/**
 * Retourne true si la durée maximale est dépassée en JOURS CALENDAIRES.
 *
 * ⚠️ À CONFIRMER — "30 jours" peut signifier :
 *   A) 30 jours calendaires depuis created_at (CETTE FONCTION — recommandée)
 *   B) 30 jours de trading (compteur trading_days → voir isV1MaxDaysExceeded)
 *
 * La table challenges ne contient ni started_at ni first_trade_at.
 * Référence recommandée : challenges.created_at (date de création/achat).
 *
 * @param createdAt       Date de création du challenge (challenges.created_at)
 * @param currentDate     Date actuelle (ou date de référence pour les tests)
 * @param maxCalendarDays Durée maximale en jours calendaires (défaut = 30)
 */
export function isV1MaxCalendarDaysExceeded(
  createdAt:       Date | string,
  currentDate:     Date | string,
  maxCalendarDays: number = V1_CHALLENGE.maxTradingDays,
): boolean {
  const start    = new Date(createdAt).getTime();
  const now      = new Date(currentDate).getTime();
  const diffMs   = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > maxCalendarDays;
}

// ── Qualifying Days (Reward Account) ─────────────────────────

/**
 * Retourne le seuil USD minimum pour un jour qualifiant — APEX EOD MODEL.
 * Délègue à V1_QUALIFYING_DAY_MIN_USD (source unique).
 *
 *   25K  → 100 USD  (was  50)
 *   50K  → 250 USD  (was 100)
 *  100K  → 300 USD  (was 150)
 */
export function getV1QualifyingDayMinUsd(startBalance: number): number {
  if (startBalance >= 100_000) return V1_QUALIFYING_DAY_MIN_USD[100000];
  if (startBalance >= 50_000)  return V1_QUALIFYING_DAY_MIN_USD[50000];
  return V1_QUALIFYING_DAY_MIN_USD[25000];
}

/**
 * Retourne true si la journée est qualifiante (profit ≥ seuil).
 * Une journée positive inférieure au seuil NE compte PAS.
 * Convention : ≥ seuil (exact = qualifiant).
 *
 * Exemples (Apex EOD) :
 *   25K : +99.99 USD → NON / +100.00 USD → OUI
 *   50K : +249.99 USD → NON / +250.00 USD → OUI
 *  100K : +299.99 USD → NON / +300.00 USD → OUI
 */
export function isV1QualifyingDay(
  dayProfitUsd:     number,
  qualifyingMinUsd: number,
): boolean {
  return dayProfitUsd >= qualifyingMinUsd;
}

// ── Challenge Transition Check ────────────────────────────────

/**
 * Vérifie les conditions de transition challenge → Reward Account — APEX EOD MODEL.
 *
 * Toutes ces conditions doivent être simultanément vraies :
 *  1. Profit ≥ +6 % avec consistency 50 % (best_day < 50 % du profit requis — V1.2)
 *  2. Min trading days ≥ 2 (V1.2)
 *  3. Max trading days ≤ 30 (non dépassé)
 *  4. Aucune breach DD (redondant — détectée en amont par le moteur DD)
 *
 * @param ddUsd  Montant fixe de drawdown en $ — passer getV1DdUsdByBalance(startBalance).
 *               Défaut 1000 (25K). TOUJOURS calculer depuis la balance réelle.
 */
export function checkV1ChallengeTransition(
  startBalance:     number,
  currentBalance:   number,
  highestEod:       number,
  currentEquity:    number,
  tradingDays:      number,
  bestDayProfitUsd: number,
  ddUsd:            number  = 1000,   // Défaut 25K — passer getV1DdUsdByBalance(startBalance)
  baseTargetPct:    number  = V1_CHALLENGE.profitTargetPct,
  minDays:          number  = V1_CHALLENGE.minTradingDays,  // 2
  maxDays:          number  = V1_CHALLENGE.maxTradingDays,
): V1ChallengeCheck {
  // V1.2 : consistency 50 % au Challenge (identique Reward)
  const profitCheck     = checkV1ProfitTarget(startBalance, currentBalance, baseTargetPct, bestDayProfitUsd, V1_CONSISTENCY_PCT.challenge);
  const ddResult        = checkV1DDBreach(startBalance, highestEod, currentEquity, ddUsd, null);
  const minDaysMet      = isV1MinDaysMet(tradingDays, minDays);
  const maxDaysExceeded = isV1MaxDaysExceeded(tradingDays, maxDays);

  return {
    canTransition:   profitCheck.met && minDaysMet && !maxDaysExceeded && !ddResult.breached,
    profitCheck,
    minDaysMet,
    maxDaysExceeded,
    ddBreached:      ddResult.breached,
  };
}

// ── Reward Account Qualification Check ───────────────────────

/**
 * Vérifie les conditions de qualification Reward Account (avant Reward #1) — APEX EOD MODEL.
 *
 * Conditions simultanées requises :
 *  1. Profit ≥ +4 % (avec consistency 50 % — Apex EOD, was 33 %)
 *  2. DD trailing EOD (montant fixe $) non violé — avec Safety Net lock
 *  3. ≥ 5 jours profitables qualifiants (seuil qualifiant Apex EOD: 100/250/300$)
 *
 * @param ddUsd      Drawdown fixe $ — passer getV1DdUsdByBalance(startBalance)
 * @param safetyNet  Safety Net en $ — passer getV1SafetyNet(startBalance)
 */
export function checkV1RewardQualification(
  startBalance:     number,
  currentBalance:   number,
  highestEod:       number,
  currentEquity:    number,
  bestDayProfitUsd: number,
  qualifyingDays:   number,
  ddUsd:            number = 1000,          // Défaut 25K — passer getV1DdUsdByBalance()
  safetyNet:        number = 26100,         // Défaut 25K — passer getV1SafetyNet()
  profitTargetPct:  number = V1_REWARD_QUAL.profitTargetPct,
  minQualDays:      number = V1_REWARD_QUAL.minQualifyingDays,
): V1RewardQualCheck {
  // Apex EOD : consistency 50 % pour les Rewards (was 33 %)
  const profitCheck       = checkV1ProfitTarget(startBalance, currentBalance, profitTargetPct, bestDayProfitUsd, V1_CONSISTENCY_PCT.reward);
  const ddResult          = checkV1DDBreach(startBalance, highestEod, currentEquity, ddUsd, safetyNet);
  const qualifyingDaysMet = qualifyingDays >= minQualDays;

  return {
    qualified:         profitCheck.met && !ddResult.breached && qualifyingDaysMet,
    profitCheck,
    ddBreached:        ddResult.breached,
    ddResult,
    qualifyingDaysMet,
    qualifyingDays,
    requiredDays:      minQualDays,
  };
}

// ── Snapshot Version Detection ────────────────────────────────

/**
 * Retourne true si un rules_snapshot correspond au modèle V1.
 *
 * Utilisé pour le routing dans metaapi/sync et cron/mt5-snapshot
 * APRÈS migration SQL (ajout colonne challenges.dd_model).
 *
 * Note : en production, préférer challenges.dd_model (index DB)
 *        plutôt que parser le JSONB à chaque tick.
 *
 * @param rulesSnapshot  Contenu de challenges.rules_snapshot (JSONB)
 */
export function isV1Snapshot(rulesSnapshot: unknown): boolean {
  if (rulesSnapshot == null || typeof rulesSnapshot !== "object") return false;
  const snap = rulesSnapshot as Record<string, unknown>;
  const rules = snap.rules;
  if (rules == null || typeof rules !== "object") return false;
  return (rules as Record<string, unknown>).dd_model === V1_DD_MODEL;
}

/**
 * Extrait le seuil qualifiant USD depuis un rules_snapshot.
 * Retourne null si la règle est absente (ancien challenge).
 */
export function getV1QualifyingMinFromSnapshot(rulesSnapshot: unknown): number | null {
  if (rulesSnapshot == null || typeof rulesSnapshot !== "object") return null;
  const snap  = rulesSnapshot as Record<string, unknown>;
  const rules = snap.rules;
  if (rules == null || typeof rules !== "object") return null;
  const val = (rules as Record<string, unknown>).qualifying_day_min_usd;
  return typeof val === "number" ? val : null;
}

// ═══════════════════════════════════════════════════════════════
// SECTION V1.1 — MACHINE D'ÉTAT + EQUITY EVENTS + REWARD IMPACT
// ═══════════════════════════════════════════════════════════════

// ── Machine d'état V1 ─────────────────────────────────────────

/**
 * Les 4 états possibles d'un compte V1.
 *
 *  challenge            → phase d'évaluation initiale
 *  reward_qualification → phase de qualification avant le 1er Reward
 *  reward_journey       → phase de gains récurrents (Rewards #1 à #N)
 *  failed               → état terminal irrevocable
 *
 * Transitions AUTORISÉES :
 *   challenge            → reward_qualification  (objectif challenge atteint)
 *   challenge            → failed                (breach DD)
 *   reward_qualification → reward_journey        (objectif reward qual atteint)
 *   reward_qualification → failed                (breach DD)
 *   reward_journey       → reward_journey        (nouveau Reward payé, même état)
 *   reward_journey       → failed                (breach DD)
 *
 * Transitions INTERDITES (moteur refuse systématiquement) :
 *   failed → challenge            (IRREVOCABLE — impossible)
 *   failed → reward_qualification (IRREVOCABLE — impossible)
 *   failed → reward_journey       (IRREVOCABLE — impossible)
 *   reward_journey → challenge    (retour en arrière interdit)
 *   reward_qualification → challenge (retour en arrière interdit)
 *   challenge → reward_journey    (saut d'état interdit)
 */
export type V1ChallengeState =
  | "challenge"
  | "reward_qualification"
  | "reward_journey"
  | "failed";

/** Résultat d'une tentative de transition d'état */
export interface V1TransitionResult {
  allowed: boolean;
  from:    V1ChallengeState;
  to:      V1ChallengeState;
  reason:  string;
}

// Table des transitions autorisées (whitelist)
const _V1_ALLOWED_TRANSITIONS: Partial<Record<V1ChallengeState, ReadonlySet<V1ChallengeState>>> = {
  "challenge":            new Set<V1ChallengeState>(["reward_qualification", "failed"]),
  "reward_qualification": new Set<V1ChallengeState>(["reward_journey",       "failed"]),
  "reward_journey":       new Set<V1ChallengeState>(["reward_journey",       "failed"]),
  // "failed" → pas d'entrée : état terminal, aucune transition autorisée
};

/**
 * Vérifie si une transition d'état est autorisée.
 *
 * @param from  État actuel du compte
 * @param to    État cible demandé
 * @returns     V1TransitionResult avec allowed=true/false et la raison
 */
export function canTransitionV1State(
  from: V1ChallengeState,
  to:   V1ChallengeState,
): V1TransitionResult {
  if (from === "failed") {
    return {
      allowed: false,
      from,
      to,
      reason: `État "failed" est terminal — aucune transition n'est possible (irrevocable).`,
    };
  }
  const allowedSet = _V1_ALLOWED_TRANSITIONS[from] ?? new Set();
  const allowed    = allowedSet.has(to);
  return {
    allowed,
    from,
    to,
    reason: allowed
      ? `Transition "${from}" → "${to}" autorisée par la machine d'état V1.`
      : `Transition "${from}" → "${to}" interdite par la machine d'état V1.`,
  };
}

// ── Equity Event Evaluation ───────────────────────────────────

/**
 * Résultat de la vérification d'un event equity en temps réel.
 *
 * Convention breach (stricte) :
 *   breached = true  ↔  equity < floor   (delta négatif)
 *   breached = false ↔  equity >= floor  (delta zéro ou positif)
 *
 * ⚠️ IRREVOCABILITÉ : une breach détectée place le compte en "failed"
 * de manière PERMANENTE. Même si une equity ultérieure dépasse le floor,
 * l'état "failed" NE PEUT PAS être annulé (voir evaluateEquityStream).
 * Cette fonction ne maintient pas d'état — c'est la responsabilité
 * de la couche applicative (DB / machine d'état) de persister le "failed".
 */
export interface V1EquityEventResult {
  /** true si equity < floor (violation stricte) */
  breached: boolean;
  /** Floor utilisé pour la comparaison (déjà calculé par computeV1TrailingFloor) */
  floor:    number;
  /** Equity vérifiée */
  equity:   number;
  /** equity - floor (négatif si breached, 0 si exactement au floor, positif sinon) */
  delta:    number;
}

/**
 * Évalue un événement equity ponctuel contre un floor déjà calculé.
 *
 * Usage type (dans metaapi/sync) :
 *   const floor = computeV1TrailingFloor(start, highestEod, 4, lockPct);
 *   const result = evaluateEquityEvent(currentEquity, floor);
 *   if (result.breached) → passer le compte en "failed"
 *
 * @param equity  Equity live en USD (intraday, temps réel)
 * @param floor   Floor applicable calculé depuis les données EOD
 */
export function evaluateEquityEvent(
  equity: number,
  floor:  number,
): V1EquityEventResult {
  return {
    breached: equity < floor,  // strict < : equity == floor n'est PAS un breach
    floor,
    equity,
    delta:    equity - floor,
  };
}

/**
 * Résultat de l'évaluation d'une séquence d'événements equity.
 *
 * Démontre l'IRREVOCABILITÉ de la breach :
 * une fois qu'un événement viole le floor, l'état final est "failed"
 * même si des événements ultérieurs montrent equity > floor.
 */
export interface V1EquityStreamResult {
  /** "active" si aucune breach / "failed" dès qu'une breach est détectée */
  finalState:        "active" | "failed";
  /** true si au moins une breach a été détectée dans le flux */
  breached:          boolean;
  /** Index 0-based du premier événement en breach (null si aucune) */
  firstBreachIndex:  number | null;
  /** Valeur equity au premier breach (null si aucune) */
  firstBreachEquity: number | null;
}

/**
 * Évalue une séquence chronologique d'événements equity contre un floor fixe.
 *
 * Exemple d'irrevocabilité (50K, floor=50 000) :
 *   events: [50400, 50100, 49950, 50300]
 *   → 49950 < 50000 → breach à l'index 2 → finalState="failed"
 *   → 50300 ne peut PAS annuler le failed
 *
 * @param equityEvents  Série d'equity en USD (ordre chronologique)
 * @param floor         Floor applicable (constant pour toute la séquence)
 */
export function evaluateEquityStream(
  equityEvents: number[],
  floor:        number,
): V1EquityStreamResult {
  for (let i = 0; i < equityEvents.length; i++) {
    if (equityEvents[i] < floor) {
      // Breach détectée → état FAILED irrevocable, on arrête l'analyse
      return {
        finalState:        "failed",
        breached:          true,
        firstBreachIndex:  i,
        firstBreachEquity: equityEvents[i],
      };
    }
  }
  return {
    finalState:        "active",
    breached:          false,
    firstBreachIndex:  null,
    firstBreachEquity: null,
  };
}

// ── Reward Impact (mécanique post-paiement) ───────────────────

/**
 * Résultat de l'application d'un paiement de Reward.
 *
 * Convention de validité :
 *   postBalance > floor  → isValid=true,  hasZeroBuffer=false (cas nominal)
 *   postBalance == floor → isValid=true,  hasZeroBuffer=true  (⚠️ avertissement : buffer nul)
 *   postBalance < floor  → isValid=false, hasZeroBuffer=false (REFUSÉ — interdit)
 *
 * Pas de reset de balance après Reward : postBalance = preBalance - rewardAmount.
 * Le floor RESTE verrouillé à startBalance (inchangé par le Reward).
 *
 * Exemple mandatoire 50K (spec V1.1 §30) :
 *   preBalance=52 000, rewardAmount=400, floor=50 000
 *   → postBalance=51 600, bufferBefore=2 000, bufferAfter=1 600, isValid=true
 */
export interface V1RewardImpact {
  preBalance:    number;
  rewardAmount:  number;
  /** preBalance - rewardAmount (PAS de reset) */
  postBalance:   number;
  /** Floor verrouillé (inchangé par le Reward) */
  floor:         number;
  /** preBalance - floor */
  bufferBefore:  number;
  /** postBalance - floor (< 0 si isValid=false) */
  bufferAfter:   number;
  /** true si postBalance >= floor */
  isValid:       boolean;
  /** true si postBalance === floor exactement (buffer nul — avertissement) */
  hasZeroBuffer: boolean;
  /** Message d'erreur si le Reward est refusé (!isValid), null sinon */
  reason:        string | null;
}

/**
 * Calcule l'impact d'un paiement de Reward sur la balance.
 *
 * NE réinitialise PAS la balance au capital initial.
 * Le floor reste verrouillé à sa valeur (transmis en paramètre).
 *
 * Refuse silencieusement tout Reward qui placerait le compte sous le floor
 * (isValid=false + reason explicite).
 *
 * @param preBalance   Balance avant paiement du Reward
 * @param rewardAmount Montant du Reward à prélever (en USD)
 * @param floor        Floor actuellement verrouillé (= startBalance en Reward Account)
 */
export function computeRewardImpact(
  preBalance:   number,
  rewardAmount: number,
  floor:        number,
): V1RewardImpact {
  const postBalance   = preBalance - rewardAmount;
  const bufferBefore  = preBalance  - floor;
  const bufferAfter   = postBalance - floor;
  const isValid       = postBalance >= floor;
  const hasZeroBuffer = postBalance === floor;

  let reason: string | null = null;
  if (!isValid) {
    reason = `Reward refusé : le paiement de ${rewardAmount} USD réduirait`
           + ` la balance à ${postBalance} USD, sous le floor de ${floor} USD`
           + ` (déficit = ${Math.abs(bufferAfter)} USD).`;
  }

  return {
    preBalance,
    rewardAmount,
    postBalance,
    floor,
    bufferBefore,
    bufferAfter,
    isValid,
    hasZeroBuffer,
    reason,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION V1.2 — ÉLIGIBILITÉ ET MONTANT DES REWARDS #2 à #5
// ═══════════════════════════════════════════════════════════════
//
// Règle officielle (2026-08-21) :
//   Une demande de Reward n'est recevable que si la balance
//   courante est AU MINIMUM à +4 % du capital initial.
//
//   requestThreshold = startBalance × 1.04
//
//   Seuils contractuels :
//     25K  → $26 000
//     50K  → $52 000
//     100K → $104 000
//
// Montant réellement versé :
//   eligibleNewProfit = currentBalance − balanceAfterPreviousReward
//   rewardAmount      = min(eligibleNewProfit, rewardCap)
//
// Après versement :
//   postBalance = currentBalance − rewardAmount
//   (PAS de reset au capital initial)
//   Le plancher reste verrouillé au capital initial.
// ═══════════════════════════════════════════════════════════════

/**
 * @deprecated Remplacé par le modèle Apex EOD — Safety Net + cap.
 * Gardé pour rétrocompatibilité (tests existants, affichage legacy).
 * NE PAS utiliser pour de nouveaux calculs.
 */
export const REWARD_REQUEST_PROFIT_PCT = 4 as const;

/**
 * Calcule le seuil de balance minimum requis pour une demande de Reward — APEX EOD MODEL.
 *
 * requestThreshold = Safety Net + cap du niveau de Reward
 *
 * Exemples :
 *   computeRewardRequestThreshold(25000,  1) → 26 100 + 300  = 26 400
 *   computeRewardRequestThreshold(50000,  1) → 52 100 + 500  = 52 600
 *   computeRewardRequestThreshold(100000, 1) → 103 100 + 750 = 103 850
 *   computeRewardRequestThreshold(25000,  2) → 26 100 + 400  = 26 500
 *
 * @param rewardLevel  Numéro de Reward demandé (1 à 5), default 1
 */
export function computeRewardRequestThreshold(startBalance: number, rewardLevel: number = 1): number {
  const safetyNet = getV1SafetyNet(startBalance);
  const cap       = getV1RewardCap(startBalance, rewardLevel) ?? 0;
  return safetyNet + cap;
}

/**
 * Retourne true si la balance courante atteint le seuil de demande de Reward.
 * Convention >= (atteindre exactement le seuil = éligible).
 *
 * @param currentBalance  Balance courante du Reward Account (USD)
 * @param startBalance    Capital initial du Reward Account (USD)
 * @param rewardLevel     Numéro de Reward demandé (1 à 5), default 1
 */
export function isRewardRequestEligible(
  currentBalance: number,
  startBalance:   number,
  rewardLevel:    number = 1,
): boolean {
  return currentBalance >= computeRewardRequestThreshold(startBalance, rewardLevel);
}

/**
 * Calcule le nouveau profit éligible depuis la Reward précédente.
 *
 * eligibleNewProfit = currentBalance − balanceAfterPreviousReward
 *
 * Pour Reward #1 : balanceAfterPreviousReward = startBalance (aucune Reward préalable).
 * Pour Rewards #2→#5 : balanceAfterPreviousReward = postBalance de la Reward précédente.
 *
 * @param currentBalance              Balance courante (USD)
 * @param balanceAfterPreviousReward  Balance immédiatement après la Reward précédente (USD)
 */
export function computeEligibleNewProfit(
  currentBalance:              number,
  balanceAfterPreviousReward:  number,
): number {
  return Math.max(0, currentBalance - balanceAfterPreviousReward);
}

/** Résultat du calcul du montant d'une Reward */
export interface V1RewardAmountResult {
  /** Nouveau profit éligible depuis la Reward précédente */
  eligibleNewProfit: number;
  /** Plafond maximum du niveau de Reward */
  rewardCap:         number;
  /** Montant effectivement disponible = min(eligibleNewProfit, rewardCap) */
  rewardAvailable:   number;
  /** true si la Reward est limitée par le profit éligible (pas le plafond) */
  limitedByProfit:   boolean;
  /** true si la Reward est limitée par le plafond (pas le profit) */
  limitedByCap:      boolean;
}

/**
 * Calcule le montant de Reward disponible à partir du nouveau profit éligible
 * et du plafond applicable au niveau.
 *
 * rewardAvailable = min(eligibleNewProfit, rewardCap)
 *
 * Cas d'usage 50K Reward #2 (plafond $650) :
 *   A) eligibleNewProfit=$500, cap=$650 → rewardAvailable=$500 (limité par profit)
 *   B) eligibleNewProfit=$650, cap=$650 → rewardAvailable=$650 (égalité)
 *   C) eligibleNewProfit=$900, cap=$650 → rewardAvailable=$650 (limité par plafond)
 *
 * @param eligibleNewProfit  Résultat de computeEligibleNewProfit()
 * @param rewardCap          Plafond du niveau de Reward (depuis REWARD_AMOUNTS)
 */
export function computeRewardAvailable(
  eligibleNewProfit: number,
  rewardCap:         number,
): V1RewardAmountResult {
  const rewardAvailable  = Math.min(eligibleNewProfit, rewardCap);
  const limitedByProfit  = eligibleNewProfit < rewardCap;
  const limitedByCap     = eligibleNewProfit > rewardCap;
  return {
    eligibleNewProfit,
    rewardCap,
    rewardAvailable,
    limitedByProfit,
    limitedByCap,
  };
}

// ═══════════════════════════════════════════════════════════════
// SECTION V1.3 — NIVEAU TRADER (RUNTIME STATE)
// ═══════════════════════════════════════════════════════════════
//
// Dérive le niveau métier d'un trader V1 depuis l'état runtime.
//
//  NIVEAU 1 — STARTER        : challenge en cours (challengePhase ≠ "funded")
//  NIVEAU 2 — REWARD_START   : Reward Account actif, 0 Reward payée
//  NIVEAU 3 — TRADER_REWARD  : ≥ 1 Reward payée → parcours Rewards #2–#5
//
// SOURCE CANONIQUE "Reward finalisée" :
//   payouts.status === "paid"  (admin PATCH, déclenche MT5 + email)
//   NE PAS utiliser "approved" — ce statut n'existe pas dans le workflow.
//
// Le niveau est dérivé runtime — aucune colonne DB supplémentaire.
// ═══════════════════════════════════════════════════════════════

/** Nombre maximum de Rewards dans le parcours V1 (Rewards #1 à #5) */
export const V1_MAX_REWARDS = 5 as const;

/** Niveau métier V1 du trader */
export type V1TraderLevel = 1 | 2 | 3;

/** Clé stable du niveau (pour affichage conditionnel dans les composants UI) */
export type V1TraderLevelKey = "STARTER" | "REWARD_START" | "TRADER_REWARD";

/**
 * Résultat de la dérivation du niveau trader V1.
 *
 * nextRewardNumber :
 *   Niveau 1 → null  (pas encore en Reward Account)
 *   Niveau 2 → 1     (Reward #1 à valider)
 *   Niveau 3 → 2–5   (prochaine Reward après celles déjà payées)
 *   Terminé  → null  (≥ V1_MAX_REWARDS Rewards payées)
 */
export interface V1TraderLevelResult {
  /** Niveau 1 / 2 / 3 */
  level:            V1TraderLevel;
  /** Clé stable du niveau */
  key:              V1TraderLevelKey;
  /** Label affichable */
  label:            string;
  /** Prochain numéro de Reward (null = non applicable ou parcours terminé) */
  nextRewardNumber: number | null;
  /** true si le parcours est terminé (paidRewardsCount ≥ V1_MAX_REWARDS) */
  terminated:       boolean;
}

/**
 * Dérive le niveau métier d'un trader V1 depuis les données runtime.
 *
 * LOGIQUE :
 *   1. challengePhase ≠ "funded" → NIVEAU 1 STARTER
 *   2. challengePhase = "funded" + paidRewardsCount = 0 → NIVEAU 2 REWARD_START
 *   3. challengePhase = "funded" + paidRewardsCount ≥ 1 → NIVEAU 3 TRADER_REWARD
 *
 * INCOHÉRENCE (R#2 payée sans R#1) :
 *   paidRewardsCount utilisé tel quel — fallback déterministe, aucune exception.
 *   nextRewardNumber = paidRewardsCount + 1 (résultat stable même si séquence incomplète).
 *
 * TERMINAISON :
 *   paidRewardsCount ≥ V1_MAX_REWARDS (5) → terminated=true, nextRewardNumber=null.
 *   "Reward #6" n'existe pas — l'état terminé est permanent.
 *
 * @param challengePhase    Valeur de challenges.phase ("phase1" | "funded" | …)
 * @param paidRewardsCount  Nombre de payouts WHERE status="paid" AND challenge_id=x
 */
export function getTraderV1Level(
  challengePhase:   string,
  paidRewardsCount: number,
): V1TraderLevelResult {
  // Niveau 1 — STARTER : pas encore en Reward Account
  if (challengePhase !== "funded") {
    return {
      level:            1,
      key:              "STARTER",
      label:            "STARTER",
      nextRewardNumber: null,
      terminated:       false,
    };
  }

  // Niveau 2 — REWARD START : Reward Account actif, aucune Reward payée
  if (paidRewardsCount === 0) {
    return {
      level:            2,
      key:              "REWARD_START",
      label:            "REWARD START",
      nextRewardNumber: 1,
      terminated:       false,
    };
  }

  // Niveau 3 — TRADER REWARD : au moins 1 Reward payée
  const terminated       = paidRewardsCount >= V1_MAX_REWARDS;
  const nextRewardNumber = terminated ? null : paidRewardsCount + 1;

  return {
    level:            3,
    key:              "TRADER_REWARD",
    label:            "TRADER REWARD",
    nextRewardNumber,
    terminated,
  };
}
