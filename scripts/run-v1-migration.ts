/**
 * TRADERS REWARDS V1 — Script d'exécution de la migration SQL
 *
 * Usage : npx tsx scripts/run-v1-migration.ts
 *
 * Phase A : DDL (ALTER TABLE challenges ADD COLUMN dd_model, CREATE INDEX)
 * Phase B : INSERT nouveaux produits V1 (25K, 50K, 100K)
 *
 * ⚠️  CE SCRIPT EST DESTRUCTIF SI MAL UTILISÉ.
 *      Il est idempotent : peut être relancé sans risque.
 *      NE PAS modifier ce script sans relire scripts/sql/v1-migration.sql.
 */

import { createClient } from "@supabase/supabase-js";

// ── Config ─────────────────────────────────────────────────────

const SUPABASE_URL          = "https://gvvtpgekhhsjvnlgesgc.supabase.co";
const SUPABASE_SERVICE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dnRwZ2VraGhzanZubGdlc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY4MTQ5MywiZXhwIjoyMDk0MjU3NDkzfQ.NebKiXtVcDvisUic99XADUec1bZJbDpHlhnkTXvEeqs";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

// ── Helpers ────────────────────────────────────────────────────

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const RESET  = "\x1b[0m";

function ok(msg: string)   { console.log(`  ${GREEN}✅ OK${RESET}    ${msg}`); }
function err(msg: string)  { console.log(`  ${RED}❌ FAIL${RESET}  ${msg}`); }
function warn(msg: string) { console.log(`  ${YELLOW}⚠️  WARN${RESET}  ${msg}`); }
function info(msg: string) { console.log(`  ${DIM}ℹ️  ${msg}${RESET}`); }

// ── Phase A — DDL via RPC exec ─────────────────────────────────
// Supabase expose une fonction exec_sql si elle a été créée dans le projet.
// Sinon, le bloc échoue silencieusement et les instructions DDL sont
// fournies pour exécution manuelle dans le Supabase SQL Editor.

const DDL_STATEMENTS = [
  {
    label: "ALTER TABLE challenges ADD COLUMN dd_model",
    sql: `ALTER TABLE challenges ADD COLUMN IF NOT EXISTS dd_model TEXT DEFAULT NULL`,
  },
  {
    label: "COMMENT ON COLUMN challenges.dd_model",
    sql: `COMMENT ON COLUMN challenges.dd_model IS 'Discriminant du moteur DD actif. NULL = ancien comportement (1-Step/2-Step). trailing_eod_lock = nouveau modèle V1 Traders Rewards.'`,
  },
  {
    label: "CREATE INDEX idx_challenges_dd_model",
    sql: `CREATE INDEX IF NOT EXISTS idx_challenges_dd_model ON challenges (dd_model) WHERE dd_model IS NOT NULL`,
  },
];

async function execDDL(label: string, sql: string): Promise<boolean> {
  // Tentative 1 : appel direct fetch vers l'API /rest/v1/rpc/exec_sql
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        "apikey": SUPABASE_SERVICE_KEY,
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ query: sql }),
    });
    if (res.ok) {
      ok(label);
      return true;
    }
  } catch { /* ignore */ }

  // Tentative 2 : rpc via supabase-js (exec_sql ou query)
  for (const fn of ["exec_sql", "query", "run_sql", "execute_sql"]) {
    const { error } = await admin.rpc(fn as never, { query: sql } as never);
    if (!error) {
      ok(`${label} (via ${fn})`);
      return true;
    }
  }

  // Tentative 3 : fetch vers le management API
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/gvvtpgekhhsjvnlgesgc/database/query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    if (res.ok) {
      ok(`${label} (via Management API)`);
      return true;
    }
  } catch { /* ignore */ }

  return false;
}

// ── Phase B — INSERTs via REST ─────────────────────────────────

// Ids des produits après insertion (récupérés par slug)
const PRODUCTS = [
  {
    slug:        "rewards-25k",
    name:        "Traders Rewards 25K",
    description: "Nouveau modèle Traders Rewards V1 — compte 25K — Une étape, trailing 4 % EOD",
    model:       "1step" as const,
    account_size: "$25,000",
    balance_usd: 25000,
    price_eur_cents: 1900,
    price_crypto_cents: null as number | null,
    currency:    "EUR",
    active:      true,
    display_order: 10,
    max_cumul_usd: null as number | null,
    leverage:    100,
    version:     2,
  },
  {
    slug:        "rewards-50k",
    name:        "Traders Rewards 50K",
    description: "Nouveau modèle Traders Rewards V1 — compte 50K — Une étape, trailing 4 % EOD",
    model:       "1step" as const,
    account_size: "$50,000",
    balance_usd: 50000,
    price_eur_cents: 2900,
    price_crypto_cents: null as number | null,
    currency:    "EUR",
    active:      true,
    display_order: 11,
    max_cumul_usd: null as number | null,
    leverage:    100,
    version:     2,
  },
  {
    slug:        "rewards-100k",
    name:        "Traders Rewards 100K",
    description: "Traders Rewards — Challenge 100K + Reward Account — Trailing DD EOD 3 %",
    model:       "1step" as const,
    account_size: "$100,000",
    balance_usd: 100000,
    price_eur_cents: 5900,
    price_crypto_cents: null as number | null,
    currency:    "EUR",
    active:      true,
    display_order: 12,
    max_cumul_usd: null as number | null,
    leverage:    100,
    version:     2,
  },
];

// ─── Structure 3 niveaux V1 ───────────────────────────────────
//  Phase 1 : challenge      → STARTER       (+6%, trailing no-lock)
//  Phase 2 : funded         → REWARD START  (+4%, trailing with lock, 5 j. qualif.)
//  Phase 3 : reward_journey → TRADER REWARD (floor fixe, reward threshold, caps #2-5)
// ─────────────────────────────────────────────────────────────

const PHASES: Array<{
  slug: string;
  phases: Array<{
    phase_order: number; phase_label: string; phase_type: string;
    profit_target: number | null; daily_drawdown: number; total_drawdown: number;
    min_trading_days: number; max_trading_days: number | null; profit_split: number | null;
  }>;
}> = [
  {
    slug: "rewards-25k",
    phases: [
      { phase_order: 1, phase_label: "Challenge",         phase_type: "challenge",
        profit_target: 6.0, daily_drawdown: 4.0, total_drawdown: 4.0,
        min_trading_days: 2, max_trading_days: 30,   profit_split: null },
      { phase_order: 2, phase_label: "Reward #1",         phase_type: "funded",
        profit_target: 4.0, daily_drawdown: 4.0, total_drawdown: 4.0,
        min_trading_days: 5, max_trading_days: null, profit_split: null },
      { phase_order: 3, phase_label: "Rewards #2 à #5",  phase_type: "reward_journey",
        profit_target: 4.0, daily_drawdown: 0.0, total_drawdown: 0.0,
        min_trading_days: 0, max_trading_days: null, profit_split: null },
    ],
  },
  {
    slug: "rewards-50k",
    phases: [
      { phase_order: 1, phase_label: "Challenge",         phase_type: "challenge",
        profit_target: 6.0, daily_drawdown: 4.0, total_drawdown: 4.0,
        min_trading_days: 2, max_trading_days: 30,   profit_split: null },
      { phase_order: 2, phase_label: "Reward #1",         phase_type: "funded",
        profit_target: 4.0, daily_drawdown: 4.0, total_drawdown: 4.0,
        min_trading_days: 5, max_trading_days: null, profit_split: null },
      { phase_order: 3, phase_label: "Rewards #2 à #5",  phase_type: "reward_journey",
        profit_target: 4.0, daily_drawdown: 0.0, total_drawdown: 0.0,
        min_trading_days: 0, max_trading_days: null, profit_split: null },
    ],
  },
  {
    slug: "rewards-100k",
    phases: [
      { phase_order: 1, phase_label: "Challenge",         phase_type: "challenge",
        profit_target: 6.0, daily_drawdown: 3.0, total_drawdown: 3.0,
        min_trading_days: 2, max_trading_days: 30,   profit_split: null },
      { phase_order: 2, phase_label: "Reward #1",         phase_type: "funded",
        profit_target: 4.0, daily_drawdown: 3.0, total_drawdown: 3.0,
        min_trading_days: 5, max_trading_days: null, profit_split: null },
      { phase_order: 3, phase_label: "Rewards #2 à #5",  phase_type: "reward_journey",
        profit_target: 4.0, daily_drawdown: 0.0, total_drawdown: 0.0,
        min_trading_days: 0, max_trading_days: null, profit_split: null },
    ],
  },
];

const RULES: Array<{
  slug: string;
  rules: Array<{ rule_key: string; rule_value: unknown; enabled: boolean; description: string }>;
}> = [
  {
    slug: "rewards-25k",
    rules: [
      { rule_key: "dd_model",              rule_value: "trailing_eod_lock", enabled: true,
        description: "Discriminant moteur V1. Routing dans metaapi/sync et cron/mt5-snapshot." },
      { rule_key: "consistency_challenge_pct", rule_value: 50, enabled: true,
        description: "Consistency Niveau 1 (Challenge) : best_day ≤ 50 % du profit requis." },
      { rule_key: "consistency_reward_pct",    rule_value: 33, enabled: true,
        description: "Consistency Niveaux 2 & 3 (Rewards) : best_day ≤ 33 % du profit requis." },
      { rule_key: "trailing_dd_pct",       rule_value: 4,     enabled: true,
        description: "Trailing drawdown EOD (4 %) — Niveaux 1 & 2." },
      { rule_key: "trailing_lock_pct",     rule_value: 4,     enabled: true,
        description: "Seuil de verrouillage du trailing (4 %). highest_eod ≥ start×1.04 → floor = start." },
      { rule_key: "qualifying_day_min_usd",rule_value: 50,    enabled: true,
        description: "Seuil USD minimum pour un jour qualifiant Reward #1 — 25K : 50 USD/j." },
      { rule_key: "activation_fee_eur",    rule_value: 99,    enabled: true,
        description: "Frais activation Reward Account — 25K : 99 EUR." },
      { rule_key: "reward_cap_1",          rule_value: 300,   enabled: true,
        description: "Plafond Reward #1 — 25K : 300 USD." },
      { rule_key: "reward_cap_2",          rule_value: 400,   enabled: true,
        description: "Plafond Reward #2 — 25K : 400 USD." },
      { rule_key: "reward_cap_3",          rule_value: 500,   enabled: true,
        description: "Plafond Reward #3 — 25K : 500 USD." },
      { rule_key: "reward_cap_4",          rule_value: 600,   enabled: true,
        description: "Plafond Reward #4 — 25K : 600 USD." },
      { rule_key: "reward_cap_5",          rule_value: 750,   enabled: true,
        description: "Plafond Reward #5 — 25K : 750 USD." },
    ],
  },
  {
    slug: "rewards-50k",
    rules: [
      { rule_key: "dd_model",              rule_value: "trailing_eod_lock", enabled: true,
        description: "Discriminant moteur V1." },
      { rule_key: "consistency_challenge_pct", rule_value: 50, enabled: true,
        description: "Consistency Challenge : 50 %." },
      { rule_key: "consistency_reward_pct",    rule_value: 33, enabled: true,
        description: "Consistency Rewards : 33 %." },
      { rule_key: "trailing_dd_pct",       rule_value: 4,     enabled: true,
        description: "Trailing drawdown 4 % EOD." },
      { rule_key: "trailing_lock_pct",     rule_value: 4,     enabled: true,
        description: "Seuil de verrouillage du trailing (4 %)." },
      { rule_key: "qualifying_day_min_usd",rule_value: 100,   enabled: true,
        description: "Seuil USD qualifiant Reward #1 — 50K : 100 USD/j." },
      { rule_key: "activation_fee_eur",    rule_value: 99,    enabled: true,
        description: "Frais activation Reward Account — 50K : 99 EUR." },
      { rule_key: "reward_cap_1",          rule_value: 500,   enabled: true,
        description: "Plafond Reward #1 — 50K : 500 USD." },
      { rule_key: "reward_cap_2",          rule_value: 650,   enabled: true,
        description: "Plafond Reward #2 — 50K : 650 USD." },
      { rule_key: "reward_cap_3",          rule_value: 800,   enabled: true,
        description: "Plafond Reward #3 — 50K : 800 USD." },
      { rule_key: "reward_cap_4",          rule_value: 1000,  enabled: true,
        description: "Plafond Reward #4 — 50K : 1 000 USD." },
      { rule_key: "reward_cap_5",          rule_value: 1250,  enabled: true,
        description: "Plafond Reward #5 — 50K : 1 250 USD." },
    ],
  },
  {
    slug: "rewards-100k",
    rules: [
      { rule_key: "dd_model",              rule_value: "trailing_eod_lock", enabled: true,
        description: "Discriminant moteur V1." },
      { rule_key: "consistency_challenge_pct", rule_value: 50, enabled: true,
        description: "Consistency Challenge : 50 %." },
      { rule_key: "consistency_reward_pct",    rule_value: 33, enabled: true,
        description: "Consistency Rewards : 33 %." },
      { rule_key: "trailing_dd_pct",       rule_value: 3,     enabled: true,
        description: "Trailing drawdown 3 % EOD — 100K." },
      { rule_key: "trailing_lock_pct",     rule_value: 3,     enabled: true,
        description: "Seuil de verrouillage 100K (3 %). highest_eod ≥ 103 000 → floor = 100 000." },
      { rule_key: "qualifying_day_min_usd",rule_value: 150,   enabled: true,
        description: "Seuil USD qualifiant Reward #1 — 100K : 150 USD/j." },
      { rule_key: "activation_fee_eur",    rule_value: 149,   enabled: true,
        description: "Frais activation Reward Account — 100K : 149 EUR." },
      { rule_key: "reward_cap_1",          rule_value: 750,   enabled: true,
        description: "Plafond Reward #1 — 100K : 750 USD." },
      { rule_key: "reward_cap_2",          rule_value: 1000,  enabled: true,
        description: "Plafond Reward #2 — 100K : 1 000 USD." },
      { rule_key: "reward_cap_3",          rule_value: 1250,  enabled: true,
        description: "Plafond Reward #3 — 100K : 1 250 USD." },
      { rule_key: "reward_cap_4",          rule_value: 1500,  enabled: true,
        description: "Plafond Reward #4 — 100K : 1 500 USD." },
      { rule_key: "reward_cap_5",          rule_value: 1750,  enabled: true,
        description: "Plafond Reward #5 — 100K : 1 750 USD." },
    ],
  },
];

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${"═".repeat(60)}${RESET}`);
  console.log(`  TRADERS REWARDS V1 — MIGRATION SUPABASE`);
  console.log(`  Projet : gvvtpgekhhsjvnlgesgc`);
  console.log(`${BOLD}${"═".repeat(60)}${RESET}\n`);

  // ── PHASE A — DDL ──────────────────────────────────────────
  console.log(`${BOLD}PHASE A — DDL (ALTER TABLE, INDEX)${RESET}`);
  console.log(`  ${"─".repeat(56)}`);

  let ddlAllOk = true;
  const ddlFailed: string[] = [];

  for (const stmt of DDL_STATEMENTS) {
    const success = await execDDL(stmt.label, stmt.sql);
    if (!success) {
      ddlAllOk = false;
      ddlFailed.push(stmt.sql);
      warn(`${stmt.label} — doit être exécuté manuellement dans Supabase SQL Editor`);
    }
  }

  if (!ddlAllOk) {
    console.log(`\n${YELLOW}${BOLD}  ⚠️  DDL — EXÉCUTION MANUELLE REQUISE${RESET}`);
    console.log(`  Copier-coller dans le SQL Editor de Supabase dashboard :`);
    console.log(`  ${"─".repeat(56)}`);
    for (const sql of ddlFailed) {
      console.log(`\n  ${sql};`);
    }
    console.log(`  ${"─".repeat(56)}\n`);
  } else {
    console.log(`  ${GREEN}✅ Phase A complète.${RESET}\n`);
  }

  // ── PHASE B — INSERTs produits ─────────────────────────────
  console.log(`${BOLD}PHASE B — Produits V1${RESET}`);
  console.log(`  ${"─".repeat(56)}`);

  for (const prod of PRODUCTS) {
    // 1. Insérer le produit (upsert par slug)
    const { error: prodErr } = await admin
      .from("challenge_products")
      .upsert(prod, { onConflict: "slug", ignoreDuplicates: true });

    if (prodErr) {
      err(`Produit ${prod.slug} — ${prodErr.message}`);
      continue;
    }
    ok(`Produit ${prod.slug} inséré (slug=${prod.slug}, prix=${prod.price_eur_cents} cts)`);

    // 2. Récupérer l'id du produit inséré
    const { data: prodData, error: fetchErr } = await admin
      .from("challenge_products")
      .select("id")
      .eq("slug", prod.slug)
      .single();

    if (fetchErr || !prodData) {
      err(`  ${prod.slug} — impossible de récupérer l'id après insertion : ${fetchErr?.message}`);
      continue;
    }
    const productId = prodData.id;
    info(`  product_id = ${productId}`);

    // 3. Insérer les phases
    const phaseConfig = PHASES.find(p => p.slug === prod.slug)!;
    for (const ph of phaseConfig.phases) {
      const phaseRow = { product_id: productId, ...ph };
      const { error: phErr } = await admin
        .from("challenge_product_phases")
        .upsert(phaseRow, { onConflict: "product_id,phase_order", ignoreDuplicates: true });

      if (phErr) {
        // Si onConflict échoue (contrainte inconnue), on tente un insert simple
        const { error: insErr } = await admin
          .from("challenge_product_phases")
          .insert(phaseRow);
        if (insErr) {
          // Probablement déjà existant (23505 = unique violation) — toléré
          if (insErr.code === "23505") {
            info(`  Phase ${ph.phase_order} (${ph.phase_label}) déjà existante — ignorée`);
          } else {
            err(`  Phase ${ph.phase_order} — ${insErr.message} [${insErr.code}]`);
          }
        } else {
          ok(`  Phase ${ph.phase_order} (${ph.phase_label}) insérée`);
        }
      } else {
        ok(`  Phase ${ph.phase_order} (${ph.phase_label}) OK`);
      }
    }

    // 4. Insérer les règles
    const ruleConfig = RULES.find(r => r.slug === prod.slug)!;
    for (const rule of ruleConfig.rules) {
      const ruleRow = { product_id: productId, ...rule };
      const { error: ruleErr } = await admin
        .from("challenge_product_rules")
        .upsert(ruleRow, { onConflict: "product_id,rule_key", ignoreDuplicates: true });

      if (ruleErr) {
        const { error: insErr2 } = await admin
          .from("challenge_product_rules")
          .insert(ruleRow);
        if (insErr2) {
          if (insErr2.code === "23505") {
            info(`  Règle ${rule.rule_key} déjà existante — ignorée`);
          } else {
            err(`  Règle ${rule.rule_key} — ${insErr2.message} [${insErr2.code}]`);
          }
        } else {
          ok(`  Règle ${rule.rule_key} = ${JSON.stringify(rule.rule_value)} insérée`);
        }
      } else {
        ok(`  Règle ${rule.rule_key} = ${JSON.stringify(rule.rule_value)} OK`);
      }
    }

    console.log();
  }

  console.log(`${BOLD}${"═".repeat(60)}${RESET}`);
  console.log(`  Migration Phase B terminée. Lancer maintenant :`);
  console.log(`  npx tsx scripts/check-v1-migration.ts`);
  console.log(`${BOLD}${"═".repeat(60)}${RESET}\n`);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
