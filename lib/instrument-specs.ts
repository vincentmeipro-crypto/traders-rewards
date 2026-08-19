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
