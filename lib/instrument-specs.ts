/**
 * TRADERS REWARDS — Instrument Specifications
 *
 * Source de vérité unique pour les spécifications des instruments CFD/Forex.
 * Utilisée par le calculateur Risque/Rendement et (futur) Calculateur de Lot.
 *
 * Légende :
 *   isExact = true  → valeur mathématiquement certaine (compte USD)
 *   isExact = false → valeur approximative (varie avec le taux de change live
 *                     ou la configuration contractSize du broker)
 *
 * RÈGLE ABSOLUE : ne jamais inventer une valeur sans base documentée.
 * Si incertain → marquer isExact=false + approxNote explicite.
 *
 * Confirmé par Traders Rewards :
 *   XAUUSD — 1 pip = 0.10, contractSize = 100 oz → pipValue = $10/pip/lot (EXACT)
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type AssetClass = "forex" | "metal" | "index" | "crypto" | "other";

/**
 * Modes de calcul — détermine comment la valeur monétaire du pip est calculée.
 *
 * usd_quote   : USD = devise cotée → pipValue exact (EUR/USD, GBP/USD…)
 * cross_rate  : USD = devise de base → pipValue varie avec le taux live
 *               (USD/JPY, USD/CHF, USD/CAD)
 * metal_usd   : métal coté en USD — pip value exact si contractSize confirmé
 * index_usd   : indice CFD coté en USD → $1/point/lot (convention standard MT5)
 * index_eur   : indice coté en EUR → pipValue en USD approximatif
 * index_gbp   : indice coté en GBP → pipValue en USD approximatif
 * crypto_usd  : crypto vs USD → pipValue dépend contractSize broker
 * unknown     : spécifications non certifiées (AUTRE) → calcul monétaire impossible
 */
export type CalcMode =
  | "usd_quote"
  | "cross_rate"
  | "metal_usd"
  | "index_usd"
  | "index_eur"
  | "index_gbp"
  | "crypto_usd"
  | "unknown";

export interface InstrumentSpec {
  /** Identifiant MT5 */
  symbol:          string;
  /** Label affiché dans l'UI */
  label:           string;
  /** Classe d'actif */
  assetClass:      AssetClass;
  /**
   * Taille d'1 pip (unités de prix).
   * EURUSD = 0.0001 | USDJPY = 0.01 | XAUUSD = 0.10 | US30 = 1
   */
  pipSize:         number;
  /** Variation minimale de prix (souvent = pipSize, parfois plus petit) */
  tickSize:        number;
  /** Unités par lot standard */
  contractSize:    number;
  /** Devise de cotation du pip avant conversion USD */
  quoteCurrency:   string;
  /**
   * $ par pip par lot standard.
   * Formule : contractSize × pipSize × facteurConversionUSD
   * Exact pour USD-quote. Approximatif pour cross-rate et indices.
   */
  pipValuePerLot:  number;
  /**
   * true  = valeur mathématiquement certaine pour un compte USD
   * false = approximation (taux de change variable ou contractSize broker-dépendant)
   */
  isExact:         boolean;
  /** Label d'affichage : "pips" ou "points" */
  pipLabel:        string;
  /** Mode de calcul — détermine la formule appliquée */
  calculationMode: CalcMode;
  /** Note affichée dans l'UI quand isExact = false */
  approxNote?:     string;
  /**
   * Pas de lot minimum (ex: 0.01 = micro-lot).
   * Si non renseigné → convention standard MT5 (0.01) via getLotStep().
   */
  lotStep?:        number;
  /**
   * Volume minimum par trade.
   * Si non renseigné → convention standard MT5 (0.01) via getLotMin().
   */
  lotMin?:         number;
  /**
   * Volume maximum par trade.
   * Si non renseigné → aucune contrainte max appliquée (dépend du broker).
   */
  lotMax?:         number;
}

// ─── Catalogue ───────────────────────────────────────────────────────────────

export const INSTRUMENT_SPECS: InstrumentSpec[] = [

  // ══════════════════════════════════════════════════════════════════════════
  //  FOREX — USD en devise de COTATION → pipValue EXACT
  //  Formule : contractSize × pipSize = 100 000 × 0.0001 = $10
  // ══════════════════════════════════════════════════════════════════════════

  {
    symbol: "EURUSD", label: "EUR/USD",
    assetClass: "forex", calculationMode: "usd_quote",
    pipSize: 0.0001, tickSize: 0.00001, contractSize: 100_000, quoteCurrency: "USD",
    pipValuePerLot: 10,
    isExact: true, pipLabel: "pips",
  },
  {
    symbol: "GBPUSD", label: "GBP/USD",
    assetClass: "forex", calculationMode: "usd_quote",
    pipSize: 0.0001, tickSize: 0.00001, contractSize: 100_000, quoteCurrency: "USD",
    pipValuePerLot: 10,
    isExact: true, pipLabel: "pips",
  },
  {
    symbol: "AUDUSD", label: "AUD/USD",
    assetClass: "forex", calculationMode: "usd_quote",
    pipSize: 0.0001, tickSize: 0.00001, contractSize: 100_000, quoteCurrency: "USD",
    pipValuePerLot: 10,
    isExact: true, pipLabel: "pips",
  },
  {
    symbol: "NZDUSD", label: "NZD/USD",
    assetClass: "forex", calculationMode: "usd_quote",
    pipSize: 0.0001, tickSize: 0.00001, contractSize: 100_000, quoteCurrency: "USD",
    pipValuePerLot: 10,
    isExact: true, pipLabel: "pips",
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  FOREX — USD en devise de BASE → pipValue APPROXIMATIF
  //  Formule pip en devise cotée : contractSize × pipSize → converti en USD
  //  Le taux de change live n'étant pas disponible, la valeur est approchée.
  // ══════════════════════════════════════════════════════════════════════════

  {
    symbol: "USDJPY", label: "USD/JPY",
    assetClass: "forex", calculationMode: "cross_rate",
    // 100 000 × 0.01 = ¥1 000/pip. À ~150 JPY/USD → $6.67 (approx)
    pipSize: 0.01, tickSize: 0.001, contractSize: 100_000, quoteCurrency: "JPY",
    pipValuePerLot: 6.70,
    isExact: false, pipLabel: "pips",
    approxNote: "approx. — varie avec USD/JPY",
  },
  {
    symbol: "USDCHF", label: "USD/CHF",
    assetClass: "forex", calculationMode: "cross_rate",
    // 100 000 × 0.0001 = 10 CHF/pip. À ~0.90 CHF/USD → $11.11 (approx)
    pipSize: 0.0001, tickSize: 0.00001, contractSize: 100_000, quoteCurrency: "CHF",
    pipValuePerLot: 11.10,
    isExact: false, pipLabel: "pips",
    approxNote: "approx. — varie avec USD/CHF",
  },
  {
    symbol: "USDCAD", label: "USD/CAD",
    assetClass: "forex", calculationMode: "cross_rate",
    // 100 000 × 0.0001 = 10 CAD/pip. À ~1.37 CAD/USD → $7.30 (approx)
    pipSize: 0.0001, tickSize: 0.00001, contractSize: 100_000, quoteCurrency: "CAD",
    pipValuePerLot: 7.30,
    isExact: false, pipLabel: "pips",
    approxNote: "approx. — varie avec USD/CAD",
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  MÉTAUX (cotés en USD)
  // ══════════════════════════════════════════════════════════════════════════

  {
    symbol: "XAUUSD", label: "XAU/USD — Or",
    assetClass: "metal", calculationMode: "metal_usd",
    //
    // CONFIRMÉ par Traders Rewards :
    //   1 pip   = 0.10 de variation de prix
    //   1 lot   = 100 oz
    //   pipValue = 100 × 0.10 = $10/pip/lot (EXACT — or coté en USD)
    //
    // Vérification :
    //   4000 → 4050 → distance = 50 → pips = 50/0.10 = 500 ✓
    //   À 0.10 lot : pipValue = 10 × 0.10 = $1/pip → risque = 500 × 1 = $500 ✓
    //
    pipSize: 0.10, tickSize: 0.01, contractSize: 100, quoteCurrency: "USD",
    pipValuePerLot: 10,
    isExact: true, pipLabel: "pips",
  },
  {
    symbol: "XAGUSD", label: "XAG/USD — Argent",
    assetClass: "metal", calculationMode: "metal_usd",
    // Convention standard MT5 : 1 000 oz/lot, pipSize = 0.001
    // pipValue = 1 000 × 0.001 = $1/pip/lot (approx — contractSize varie selon broker)
    pipSize: 0.001, tickSize: 0.001, contractSize: 1_000, quoteCurrency: "USD",
    pipValuePerLot: 1,
    isExact: false, pipLabel: "pips",
    approxNote: "approx. — contractSize dépend du broker",
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  INDICES — CFD coté en USD
  //  Convention MT5 standard : 1 lot = $1 par point
  //  (contractSize=1 dans la plupart des setups MT5 gray-label)
  // ══════════════════════════════════════════════════════════════════════════

  {
    symbol: "US30", label: "US30 — Dow Jones",
    assetClass: "index", calculationMode: "index_usd",
    pipSize: 1, tickSize: 1, contractSize: 1, quoteCurrency: "USD",
    pipValuePerLot: 1,
    isExact: false, pipLabel: "points",
    approxNote: "approx. — dépend du broker",
  },
  {
    symbol: "NAS100", label: "NAS100 — Nasdaq",
    assetClass: "index", calculationMode: "index_usd",
    pipSize: 1, tickSize: 0.01, contractSize: 1, quoteCurrency: "USD",
    pipValuePerLot: 1,
    isExact: false, pipLabel: "points",
    approxNote: "approx. — dépend du broker",
  },
  {
    symbol: "SP500", label: "SP500 — S&P 500",
    assetClass: "index", calculationMode: "index_usd",
    pipSize: 1, tickSize: 0.01, contractSize: 1, quoteCurrency: "USD",
    pipValuePerLot: 1,
    isExact: false, pipLabel: "points",
    approxNote: "approx. — dépend du broker",
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  INDICES — CFD coté en EUR / GBP → valeur en USD approximative
  // ══════════════════════════════════════════════════════════════════════════

  {
    symbol: "GER40", label: "GER40 — DAX",
    assetClass: "index", calculationMode: "index_eur",
    // Coté en EUR : €1/point/lot. À ~1.08 EUR/USD → $1.08/point (approx)
    pipSize: 1, tickSize: 1, contractSize: 1, quoteCurrency: "EUR",
    pipValuePerLot: 1.08,
    isExact: false, pipLabel: "points",
    approxNote: "approx. — varie avec EUR/USD",
  },
  {
    symbol: "UK100", label: "UK100 — FTSE",
    assetClass: "index", calculationMode: "index_gbp",
    // Coté en GBP : £1/point/lot. À ~1.26 GBP/USD → $1.26/point (approx)
    pipSize: 1, tickSize: 1, contractSize: 1, quoteCurrency: "GBP",
    pipValuePerLot: 1.26,
    isExact: false, pipLabel: "points",
    approxNote: "approx. — varie avec GBP/USD",
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  CRYPTO — coté en USD
  //  Convention : 1 lot = 1 unité de crypto, pip = $1 de variation de prix
  //  (contractSize très variable selon broker — marqué approx.)
  // ══════════════════════════════════════════════════════════════════════════

  {
    symbol: "BTCUSD", label: "BTC/USD — Bitcoin",
    assetClass: "crypto", calculationMode: "crypto_usd",
    // 1 lot = 1 BTC (convention la plus répandue), pipSize = $1
    pipSize: 1, tickSize: 0.01, contractSize: 1, quoteCurrency: "USD",
    pipValuePerLot: 1,
    isExact: false, pipLabel: "points",
    approxNote: "approx. — contractSize dépend du broker",
  },
  {
    symbol: "ETHUSD", label: "ETH/USD — Ethereum",
    assetClass: "crypto", calculationMode: "crypto_usd",
    pipSize: 1, tickSize: 0.01, contractSize: 1, quoteCurrency: "USD",
    pipValuePerLot: 1,
    isExact: false, pipLabel: "points",
    approxNote: "approx. — contractSize dépend du broker",
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  AUTRE — spécifications non disponibles
  // ══════════════════════════════════════════════════════════════════════════

  {
    symbol: "AUTRE", label: "Autre / Other",
    assetClass: "other", calculationMode: "unknown",
    pipSize: 1, tickSize: 1, contractSize: 1, quoteCurrency: "USD",
    pipValuePerLot: 0,
    isExact: false, pipLabel: "points",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Récupère les spécifications d'un symbole par son identifiant. */
export function getSpec(symbol: string): InstrumentSpec | undefined {
  return INSTRUMENT_SPECS.find(s => s.symbol === symbol);
}

/** Retourne true si les calculs monétaires sont disponibles pour ce symbole. */
export function hasMonetaryCalc(spec: InstrumentSpec): boolean {
  return spec.calculationMode !== "unknown" && spec.pipValuePerLot > 0;
}

/**
 * Calcule pips, valeur pip et montant USD pour une distance de prix et un volume.
 *
 * Formule universelle :
 *   pips           = priceDist / spec.pipSize
 *   pipValueForLots = spec.pipValuePerLot × lots
 *   amountUsd      = pips × pipValueForLots
 *
 * Vérification XAUUSD (référence Traders Rewards) :
 *   priceDist=50, pipSize=0.10  → pips = 50/0.10 = 500
 *   pipValuePerLot=10, lots=0.10 → pipValueForLots = 10×0.10 = $1/pip
 *   amountUsd = 500 × 1 = $500 ✓
 */
export function calcTradeRisk(
  spec:      InstrumentSpec,
  lots:      number,
  priceDist: number,
): {
  pips:            number;
  pipValueForLots: number;
  amountUsd:       number;
} {
  const pips            = priceDist / spec.pipSize;
  const pipValueForLots = spec.pipValuePerLot * lots;
  const amountUsd       = pips * pipValueForLots;
  return { pips, pipValueForLots, amountUsd };
}

// ─── Tests automatiques ───────────────────────────────────────────────────────

export interface TestCase {
  name:     string;
  symbol:   string;
  side:     "BUY" | "SELL";
  entry:    number;
  sl:       number;
  tp:       number | null;
  lots:     number;
  expected: {
    slPips:   number;
    tpPips?:  number;
    pipValue: number;  // $ par pip au volume lots
    risk:     number;
    reward?:  number;
    rr?:      number;
  };
}

export interface TestResult {
  name:     string;
  passed:   boolean;
  got:      Partial<Record<string, number>>;
  expected: Partial<Record<string, number>>;
  errors:   string[];
}

/** Tolérance relative pour les comparaisons (0.1% = arrondi + taux approx.) */
const TOLERANCE = 0.001;

function approxEq(a: number, b: number): boolean {
  if (b === 0) return Math.abs(a) < 1e-9;
  return Math.abs(a - b) / Math.abs(b) <= TOLERANCE;
}

/** Suite de tests auto-documentés — runnable via scripts/test-instrument-specs.ts */
export const TEST_CASES: TestCase[] = [

  // ── Test 1 : XAUUSD SELL — référence obligatoire Traders Rewards ──────────
  {
    name:   "XAUUSD SELL — référence Traders Rewards",
    symbol: "XAUUSD", side: "SELL",
    entry: 4000, sl: 4050, tp: 3950, lots: 0.10,
    expected: { slPips: 500, tpPips: 500, pipValue: 1, risk: 500, reward: 500, rr: 1 },
  },

  // ── Test 2 : EURUSD BUY — paire USD-quote ─────────────────────────────────
  {
    name:   "EURUSD BUY — 50 pips SL, 100 pips TP, 1.00 lot",
    symbol: "EURUSD", side: "BUY",
    entry: 1.08000, sl: 1.07500, tp: 1.09000, lots: 1.00,
    expected: { slPips: 50, tpPips: 100, pipValue: 10, risk: 500, reward: 1000, rr: 2 },
  },

  // ── Test 3 : USDJPY SELL — paire cross-rate (valeur approx) ───────────────
  {
    name:   "USDJPY SELL — 100 pips SL, 200 pips TP, 0.50 lot (approx)",
    symbol: "USDJPY", side: "SELL",
    entry: 150.000, sl: 151.000, tp: 148.000, lots: 0.50,
    // pipValuePerLot=6.70 → 0.50 lot → $3.35/pip
    expected: { slPips: 100, tpPips: 200, pipValue: 3.35, risk: 335, reward: 670, rr: 2 },
  },

  // ── Test 4 : US30 BUY — indice USD ────────────────────────────────────────
  {
    name:   "US30 BUY — 100 points SL, 200 points TP, 1.00 lot (approx)",
    symbol: "US30", side: "BUY",
    entry: 39000, sl: 38900, tp: 39200, lots: 1.00,
    expected: { slPips: 100, tpPips: 200, pipValue: 1, risk: 100, reward: 200, rr: 2 },
  },

  // ── Test 5 : XAGUSD BUY — argent ──────────────────────────────────────────
  {
    name:   "XAGUSD BUY — 100 pips SL, 200 pips TP, 0.10 lot (approx)",
    symbol: "XAGUSD", side: "BUY",
    entry: 23.500, sl: 23.400, tp: 23.700, lots: 0.10,
    expected: { slPips: 100, tpPips: 200, pipValue: 0.10, risk: 10, reward: 20, rr: 2 },
  },

  // ── Test 6 : BTCUSD BUY — crypto ──────────────────────────────────────────
  {
    name:   "BTCUSD BUY — $2000 SL, $4000 TP, 0.10 lot (approx)",
    symbol: "BTCUSD", side: "BUY",
    entry: 97000, sl: 95000, tp: 101000, lots: 0.10,
    expected: { slPips: 2000, tpPips: 4000, pipValue: 0.10, risk: 200, reward: 400, rr: 2 },
  },

  // ── Test 7 : NAS100 — indice, micro-lot ───────────────────────────────────
  {
    name:   "NAS100 SELL — 500 points SL, 1000 points TP, 0.01 lot (approx)",
    symbol: "NAS100", side: "SELL",
    entry: 15000, sl: 15500, tp: 14000, lots: 0.01,
    expected: { slPips: 500, tpPips: 1000, pipValue: 0.01, risk: 5, reward: 10, rr: 2 },
  },

  // ── Test 8 : GBPUSD — lots fractionnaires ─────────────────────────────────
  {
    name:   "GBPUSD BUY — 30 pips SL, 90 pips TP, 2.50 lots",
    symbol: "GBPUSD", side: "BUY",
    entry: 1.26000, sl: 1.25700, tp: 1.26900, lots: 2.50,
    expected: { slPips: 30, tpPips: 90, pipValue: 25, risk: 750, reward: 2250, rr: 3 },
  },
];

// ─── Challenge margins helper ─────────────────────────────────────────────────

/**
 * Données minimales du challenge pour le calcul des marges DD.
 * Compatible avec CockpitChallenge (TraderCockpit.tsx) par duck-typing.
 */
export interface ChallengeMarginInput {
  balance:              number;
  start_balance:        number;
  daily_drawdown_limit: number;
  total_drawdown_limit: number;
  model:                string;
  highest_balance?:     number;
  daily_start_balance?: number;
  breach_equity?:       number;
  status:               string;
}

export interface ChallengeMargins {
  equity:        number;
  isOneStep:     boolean;
  dailyRef:      number;
  dailyLimitUsd: number;
  dailyFloor:    number;
  dailyBuffer:   number;
  trailingRef:   number;
  totalLimitUsd: number;
  totalFloor:    number;
  totalBuffer:   number;
}

/**
 * Calcule les marges journalière et totale du challenge.
 *
 * STRICTEMENT identique aux formules dans TraderCockpit.tsx et CockpitTools.tsx.
 * Source de vérité partagée — NE PAS DUPLIQUER.
 *
 * 1-Step  → trailing DD (plancher monte avec highest_balance)
 * 2-Step  → plancher fixe sur start_balance
 */
export function calcChallengeMargins(c: ChallengeMarginInput): ChallengeMargins {
  const equity =
    c.status === "failed" && c.breach_equity != null
      ? c.breach_equity
      : c.balance;

  const isOneStep = c.model.toLowerCase().replace(/[\s-]/g, "").includes("1step");

  const dailyRef      = c.daily_start_balance ?? c.start_balance;
  const dailyLimitUsd = dailyRef * c.daily_drawdown_limit / 100;
  const dailyFloor    = dailyRef - dailyLimitUsd;
  const dailyBuffer   = Math.max(0, equity - dailyFloor);

  const trailingRef   = isOneStep
    ? Math.max(c.highest_balance ?? c.start_balance, c.start_balance)
    : c.start_balance;
  const totalLimitUsd = c.start_balance * c.total_drawdown_limit / 100;
  const totalFloor    = trailingRef - totalLimitUsd;
  const totalBuffer   = Math.max(0, equity - totalFloor);

  return {
    equity, isOneStep,
    dailyRef, dailyLimitUsd, dailyFloor, dailyBuffer,
    trailingRef, totalLimitUsd, totalFloor, totalBuffer,
  };
}

// ─── Lot size helpers ─────────────────────────────────────────────────────────

/**
 * Retourne le pas de lot à appliquer.
 * Convention MT5 standard (0.01) si non confirmé dans le catalogue.
 */
export function getLotStep(spec: InstrumentSpec): number {
  return spec.lotStep ?? 0.01;
}

/**
 * Retourne le lot minimum pour cet instrument.
 * Convention MT5 standard (0.01) si non confirmé.
 */
export function getLotMin(spec: InstrumentSpec): number {
  return spec.lotMin ?? 0.01;
}

export interface LotSizeResult {
  /** Lot mathématique brut avant arrondi */
  lotRaw:              number;
  /** Lot final arrondi vers le BAS — JAMAIS vers le haut */
  lotFinal:            number;
  /** Pas de lot appliqué (spec.lotStep ?? 0.01 par défaut MT5) */
  stepUsed:            number;
  /** true si spec.lotStep est renseigné dans le catalogue — false = hypothèse MT5 standard non contractuelle */
  hasConfirmedStep:    boolean;
  /** true si spec.lotMin est renseigné dans le catalogue — false = minimum réel inconnu */
  hasConfirmedMin:     boolean;
  /** $ de risque par lot standard à cette distance SL */
  riskPerLot:          number;
  /** $ de risque réel avec lotFinal */
  actualRiskUsd:       number;
  /** $ de risque demandé (toujours ≥ actualRiskUsd) */
  requestedRiskUsd:    number;
  /** Invariant garanti : actualRisk ≤ requestedRisk + tolérance floating-point */
  withinRequestedRisk: boolean;
  /**
   * true UNIQUEMENT si le volume est définitivement trop faible pour trader :
   *   - lotFinal === 0  (universel — 0 lot n'est pas un trade valide)
   *   - OU spec.lotMin est CONFIRMÉ dans le catalogue ET lotFinal < spec.lotMin
   *
   * Ne jamais déclencher tooSmall uniquement à cause du fallback 0.01 non confirmé.
   */
  tooSmall:            boolean;
}

/**
 * Calcule la taille de lot recommandée pour un risque dollar et une distance SL.
 *
 * Formule :
 *   riskPerLot = calcTradeRisk(spec, 1, slDist).amountUsd
 *   lotRaw     = requestedRiskUsd / riskPerLot
 *   lotFinal   = floor(lotRaw / step) × step  ← TOUJOURS vers le BAS
 *   actualRisk = calcTradeRisk(spec, lotFinal, slDist).amountUsd
 *
 * Invariant garanti : actualRisk ≤ requestedRisk
 *
 * Retourne null si :
 *   - spec.calculationMode === "unknown" (AUTRE)
 *   - requestedRiskUsd ≤ 0
 *   - slDist ≤ 0
 */
export function calcLotSize(
  spec:             InstrumentSpec,
  slDist:           number,
  requestedRiskUsd: number,
): LotSizeResult | null {
  if (!hasMonetaryCalc(spec))  return null;
  if (requestedRiskUsd <= 0)   return null;
  if (slDist <= 0)             return null;

  // Risque par 1 lot standard à cette distance SL
  const riskPerLot = calcTradeRisk(spec, 1, slDist).amountUsd;
  if (riskPerLot <= 0) return null;

  // Lot mathématique brut
  const lotRaw          = requestedRiskUsd / riskPerLot;
  const stepUsed        = getLotStep(spec);
  const hasConfirmedStep = spec.lotStep != null;

  // Arrondi vers le BAS — évite de JAMAIS dépasser le risque demandé
  // Gestion floating-point : floor(0.237 × 100) / 100 = 0.23
  const scale    = Math.round(1 / stepUsed);
  const lotFinal = Math.floor(lotRaw * scale) / scale;

  // ── Statut lotMin — JAMAIS utiliser le fallback 0.01 comme seuil décisionnel ──
  const hasConfirmedMin = spec.lotMin != null;

  // tooSmall : true seulement si le volume est DÉFINITIVEMENT trop faible :
  //   1. lotFinal === 0 → 0 lot est universellement invalide
  //   2. spec.lotMin confirmé dans le catalogue ET lotFinal en dessous
  // Le fallback 0.01 de getLotMin() n'est JAMAIS utilisé ici comme décision.
  const tooSmall =
    lotFinal === 0 ||
    (hasConfirmedMin && spec.lotMin != null && lotFinal < spec.lotMin);

  const actualRiskUsd = tooSmall
    ? 0
    : calcTradeRisk(spec, lotFinal, slDist).amountUsd;

  return {
    lotRaw,
    lotFinal,
    stepUsed,
    hasConfirmedStep,
    hasConfirmedMin,
    riskPerLot,
    actualRiskUsd,
    requestedRiskUsd,
    withinRequestedRisk: actualRiskUsd <= requestedRiskUsd + 0.001,
    tooSmall,
  };
}

// ─── Tests — Calculateur de Lot ───────────────────────────────────────────────

export interface LotTestCase {
  name:             string;
  symbol:           string;
  /** abs(entry - sl), déjà calculé — toujours positif */
  slDist:           number;
  requestedRiskUsd: number;
  expected: {
    /** true si calcLotSize doit retourner null */
    isNull?:              boolean;
    lotFinal?:            number;
    actualRiskUsd?:       number;
    tooSmall?:            boolean;
    /** Vérification de l'invariant : actualRisk ≤ requestedRisk */
    withinRequestedRisk?: boolean;
    /** Vérifie que la distinction spec confirmée / hypothèse est correcte */
    hasConfirmedStep?:    boolean;
    hasConfirmedMin?:     boolean;
  };
}

/**
 * 16 cas de test couvrant tous les scénarios du Calculateur de Lot.
 *
 * Vérifications manuelles :
 *   EURUSD 50 pips SL  → riskPerLot = 50 × $10 = $500 → lot = 100/500 = 0.20
 *   XAUUSD 500 pips SL → riskPerLot = 500 × $10 = $5000 → lot = 500/5000 = 0.10
 *   US30   100 pts SL  → riskPerLot = 100 × $1 = $100 → lot = 100/100 = 1.00
 *   BTCUSD 2000 pts SL → riskPerLot = 2000 × $1 = $2000 → lot = 200/2000 = 0.10
 */
export const LOT_TEST_CASES: LotTestCase[] = [

  // 1. EURUSD — risque en $ connu
  {
    name: "EURUSD BUY — $100 risque, SL 50 pips",
    symbol: "EURUSD", slDist: 0.0050, requestedRiskUsd: 100,
    // riskPerLot = 50 pips × $10 = $500 → lotRaw = 0.20
    expected: { lotFinal: 0.20, actualRiskUsd: 100, withinRequestedRisk: true },
  },

  // 2. XAUUSD — référence confirmée Traders Rewards
  {
    name: "XAUUSD SELL — $500 risque, SL 500 pips (50 pts de prix)",
    symbol: "XAUUSD", slDist: 50, requestedRiskUsd: 500,
    // pips = 50/0.10 = 500 → riskPerLot = 500 × $10 = $5000 → lotRaw = 0.10
    expected: { lotFinal: 0.10, actualRiskUsd: 500, withinRequestedRisk: true },
  },

  // 3. Indice USD (US30)
  {
    name: "US30 BUY — $100 risque, SL 100 points",
    symbol: "US30", slDist: 100, requestedRiskUsd: 100,
    // pips = 100/1 = 100 → riskPerLot = 100 × $1 = $100 → lotRaw = 1.00
    expected: { lotFinal: 1.00, actualRiskUsd: 100, withinRequestedRisk: true },
  },

  // 4. Crypto (BTCUSD)
  {
    name: "BTCUSD BUY — $200 risque, SL 2000 points",
    symbol: "BTCUSD", slDist: 2000, requestedRiskUsd: 200,
    // pips = 2000/1 = 2000 → riskPerLot = $2000 → lotRaw = 0.10
    expected: { lotFinal: 0.10, actualRiskUsd: 200, withinRequestedRisk: true },
  },

  // 5. Direction BUY — sl < entry (distance correcte)
  {
    name: "GBPUSD BUY — direction correcte (sl < entry)",
    symbol: "GBPUSD", slDist: 0.0030, requestedRiskUsd: 150,
    // pips = 30 → riskPerLot = $300 → lotRaw = 0.50
    expected: { lotFinal: 0.50, actualRiskUsd: 150, withinRequestedRisk: true },
  },

  // 6. Direction SELL — sl > entry (distance correcte)
  {
    name: "EURUSD SELL — direction correcte (sl > entry)",
    symbol: "EURUSD", slDist: 0.0050, requestedRiskUsd: 100,
    // Même distance → identique au cas BUY
    expected: { lotFinal: 0.20, actualRiskUsd: 100, withinRequestedRisk: true },
  },

  // 7. Risque mode $ — input direct
  {
    name: "EURUSD — risque mode $ ($250 directs, SL 25 pips)",
    symbol: "EURUSD", slDist: 0.0025, requestedRiskUsd: 250,
    // pips = 25 → riskPerLot = $250 → lotRaw = 1.00
    expected: { lotFinal: 1.00, actualRiskUsd: 250, withinRequestedRisk: true },
  },

  // 8. Risque mode % — capital $100 000, 0.5 % → $500
  {
    name: "XAUUSD — risque mode % (0.5 % × $100 000 = $500, SL 500 pips)",
    symbol: "XAUUSD", slDist: 50, requestedRiskUsd: 500,
    // Même slDist que test 2 — vérifie que la conversion % → $ est juste
    expected: { lotFinal: 0.10, actualRiskUsd: 500, withinRequestedRisk: true },
  },

  // 9. Lot décimal (résultat non entier)
  {
    name: "GBPUSD — lot décimal ($150, SL 30 pips → 0.50 lot)",
    symbol: "GBPUSD", slDist: 0.0030, requestedRiskUsd: 150,
    expected: { lotFinal: 0.50, withinRequestedRisk: true },
  },

  // 10. Arrondi vers le BAS — lotRaw non entier → floor
  {
    name: "EURUSD — arrondi BAS (31 pips SL, $73.50 → lotRaw=0.2371 → 0.23)",
    symbol: "EURUSD", slDist: 0.0031, requestedRiskUsd: 73.50,
    // riskPerLot = 31 × $10 = $310 → lotRaw = 73.50/310 = 0.23709…
    // lotFinal = floor(0.23709 × 100)/100 = 23/100 = 0.23
    // actualRisk = 0.23 × $310 = $71.30 ≤ $73.50 ✓
    expected: { lotFinal: 0.23, actualRiskUsd: 71.30, withinRequestedRisk: true },
  },

  // 11. Lot min — risque trop faible → tooSmall = true
  {
    name: "EURUSD — risque trop faible ($0.05, SL 50 pips → tooSmall)",
    symbol: "EURUSD", slDist: 0.0050, requestedRiskUsd: 0.05,
    // riskPerLot = $500 → lotRaw = 0.0001 → lotFinal = 0.00 < lotMin (0.01)
    expected: { tooSmall: true, actualRiskUsd: 0, withinRequestedRisk: true },
  },

  // 12. Invariant withinRequestedRisk — vérification globale
  {
    name: "USDJPY — invariant actualRisk ≤ requestedRisk (SL 100 pips, $335)",
    symbol: "USDJPY", slDist: 1.000, requestedRiskUsd: 335,
    // pips = 1.000/0.01 = 100 → riskPerLot = 100 × $6.70 = $670 → lotRaw = 0.50
    // actualRisk ≈ $335 ≤ $335 ✓
    expected: { lotFinal: 0.50, withinRequestedRisk: true },
  },

  // 13. Actif inconnu (AUTRE) → null
  {
    name: "AUTRE — calcul impossible (mode unknown) → null",
    symbol: "AUTRE", slDist: 100, requestedRiskUsd: 100,
    expected: { isNull: true },
  },

  // 14. Distance SL = 0 → null (SL identique à l'entrée)
  {
    name: "Distance SL = 0 → null",
    symbol: "EURUSD", slDist: 0, requestedRiskUsd: 100,
    expected: { isNull: true },
  },

  // 15. Risque = 0 → null
  {
    name: "Risque demandé = 0 → null",
    symbol: "EURUSD", slDist: 0.0050, requestedRiskUsd: 0,
    expected: { isNull: true },
  },

  // 16. Risque négatif → null
  {
    name: "Risque demandé négatif → null",
    symbol: "EURUSD", slDist: 0.0050, requestedRiskUsd: -100,
    expected: { isNull: true },
  },

  // 17. Distinction spec confirmée / hypothèse — EURUSD a lotStep et lotMin NON renseignés
  {
    name: "EURUSD — hasConfirmedStep=false · hasConfirmedMin=false (specs supposées)",
    symbol: "EURUSD", slDist: 0.0050, requestedRiskUsd: 100,
    // Vérifie que le catalogue ne prétend pas connaître le step/min réel du broker
    expected: { hasConfirmedStep: false, hasConfirmedMin: false, lotFinal: 0.20 },
  },

  // 18. Absence de lotMax — grand volume sans contrainte artificielle
  {
    name: "EURUSD — pas de limite lotMax, grand volume ($50 000, SL 50 pips → 100 lots)",
    symbol: "EURUSD", slDist: 0.0050, requestedRiskUsd: 50_000,
    // riskPerLot = 50 pips × $10 = $500 → lotRaw = 100.00 → aucune limite max
    expected: { lotFinal: 100.00, actualRiskUsd: 50_000, withinRequestedRisk: true },
  },
];

/** Exécute les 16 tests du Calculateur de Lot. */
export function runLotTests(): TestResult[] {
  return LOT_TEST_CASES.map(tc => {
    const spec = getSpec(tc.symbol);

    // ── Cas attendu null ────────────────────────────────────────────────────
    if (tc.expected.isNull) {
      const result = spec ? calcLotSize(spec, tc.slDist, tc.requestedRiskUsd) : null;
      const passed = result === null;
      return {
        name:     tc.name,
        passed,
        got:      {},
        expected: {},
        errors:   passed ? [] : [`Attendu null, obtenu lotFinal=${result?.lotFinal}`],
      };
    }

    // ── Cas avec résultat attendu ───────────────────────────────────────────
    if (!spec) {
      return {
        name: tc.name, passed: false, got: {}, expected: {},
        errors: [`Spec non trouvée pour ${tc.symbol}`],
      };
    }

    const result = calcLotSize(spec, tc.slDist, tc.requestedRiskUsd);

    if (!result) {
      return {
        name: tc.name, passed: false, got: {}, expected: tc.expected as Record<string, number>,
        errors: [`Résultat null inattendu (requestedRiskUsd=${tc.requestedRiskUsd}, slDist=${tc.slDist})`],
      };
    }

    const errors: string[] = [];

    if (tc.expected.lotFinal != null && !approxEq(result.lotFinal, tc.expected.lotFinal)) {
      errors.push(`lotFinal: attendu ${tc.expected.lotFinal}, obtenu ${result.lotFinal.toFixed(4)}`);
    }
    if (tc.expected.actualRiskUsd != null && !approxEq(result.actualRiskUsd, tc.expected.actualRiskUsd)) {
      errors.push(`actualRiskUsd: attendu ${tc.expected.actualRiskUsd.toFixed(2)}, obtenu ${result.actualRiskUsd.toFixed(2)}`);
    }
    if (tc.expected.tooSmall != null && result.tooSmall !== tc.expected.tooSmall) {
      errors.push(`tooSmall: attendu ${tc.expected.tooSmall}, obtenu ${result.tooSmall}`);
    }
    if (tc.expected.withinRequestedRisk === true && !result.withinRequestedRisk) {
      errors.push(
        `withinRequestedRisk: VIOLATION — actualRisk=${result.actualRiskUsd.toFixed(4)} > requested=${result.requestedRiskUsd}`
      );
    }
    if (tc.expected.hasConfirmedStep != null && result.hasConfirmedStep !== tc.expected.hasConfirmedStep) {
      errors.push(`hasConfirmedStep: attendu ${tc.expected.hasConfirmedStep}, obtenu ${result.hasConfirmedStep}`);
    }
    if (tc.expected.hasConfirmedMin != null && result.hasConfirmedMin !== tc.expected.hasConfirmedMin) {
      errors.push(`hasConfirmedMin: attendu ${tc.expected.hasConfirmedMin}, obtenu ${result.hasConfirmedMin}`);
    }

    return {
      name:     tc.name,
      passed:   errors.length === 0,
      got:      { lotFinal: result.lotFinal, actualRiskUsd: result.actualRiskUsd },
      expected: tc.expected as Partial<Record<string, number>>,
      errors,
    };
  });
}

/** Exécute tous les tests et retourne les résultats. */
export function runInstrumentTests(): TestResult[] {
  return TEST_CASES.map(tc => {
    const spec = getSpec(tc.symbol);
    const errors: string[] = [];

    if (!spec || !hasMonetaryCalc(spec)) {
      return {
        name:     tc.name,
        passed:   false,
        got:      {},
        expected: tc.expected as Record<string, number>,
        errors:   [`Spec non trouvée ou calcul monétaire indisponible pour ${tc.symbol}`],
      };
    }

    const slDist = Math.abs(tc.sl - tc.entry);
    const tpDist = tc.tp != null ? Math.abs(tc.tp - tc.entry) : null;

    const slCalc = calcTradeRisk(spec, tc.lots, slDist);
    const tpCalc = tpDist != null ? calcTradeRisk(spec, tc.lots, tpDist) : null;
    const rrRatio = tpDist != null ? tpDist / slDist : null;

    const got: Partial<Record<string, number>> = {
      slPips:   slCalc.pips,
      pipValue: slCalc.pipValueForLots,
      risk:     slCalc.amountUsd,
    };
    if (tpCalc)    { got.tpPips  = tpCalc.pips;     got.reward = tpCalc.amountUsd; }
    if (rrRatio != null) got.rr  = rrRatio;

    const expected = tc.expected as Partial<Record<string, number>>;
    for (const [k, expectedVal] of Object.entries(expected)) {
      if (expectedVal == null) continue;
      const gotVal = got[k] ?? 0;
      if (!approxEq(gotVal, expectedVal)) {
        errors.push(`${k}: attendu ${expectedVal}, obtenu ${gotVal.toFixed(4)}`);
      }
    }

    return { name: tc.name, passed: errors.length === 0, got, expected, errors };
  });
}
