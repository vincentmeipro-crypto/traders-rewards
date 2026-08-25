/**
 * TRADERS REWARDS V1 — Migration complète & idempotente v3
 * ============================================================
 *
 * Corrige ET complète la configuration des 3 produits V1 en DB.
 * Idempotent : peut être relancé N fois — chaque exécution ramène
 * l'état à la spec V1.2, sans doublon ni effet secondaire.
 *
 * ÉTAPES :
 *  0. DDL — étend le CHECK constraint pour autoriser "reward_journey"
 *     (via Supabase Management API + token CLI ~/.supabase/access-token)
 *  1. Phase 1 — corrige total/daily_drawdown (100K → 3 %)
 *  2. Phase 2 — corrige profit_split→null, label→"Reward #1", DD 100K→3%
 *  3. Phase 3 — ajoute/corrige reward_journey
 *  4. Règles  — trailing_dd_pct, trailing_lock_pct, caps, consistency…
 *
 * STRATÉGIE (sans ignoreDuplicates) :
 *   upsert onConflict → UPDATE si présent avec les bonnes valeurs
 *
 * CIBLES : rewards-25k, rewards-50k, rewards-100k UNIQUEMENT.
 *
 * Usage : npx tsx scripts/add-v1-phase3.ts
 * ============================================================
 */

import { createClient }  from "@supabase/supabase-js";
import { readFileSync }   from "fs";
import { homedir }        from "os";
import { join }           from "path";

const SUPABASE_URL         = "https://gvvtpgekhhsjvnlgesgc.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dnRwZ2VraGhzanZubGdlc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY4MTQ5MywiZXhwIjoyMDk0MjU3NDkzfQ.NebKiXtVcDvisUic99XADUec1bZJbDpHlhnkTXvEeqs";
const PROJECT_REF          = "gvvtpgekhhsjvnlgesgc";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const RESET  = "\x1b[0m";

let errorsTotal = 0;

function ok(msg: string)    { console.log(`  ${GREEN}✅ OK${RESET}    ${msg}`); }
function fail(msg: string)  { console.log(`  ${RED}❌ FAIL${RESET}  ${msg}`); errorsTotal++; }
function info(msg: string)  { console.log(`  ${DIM}ℹ️  ${msg}${RESET}`); }
function warn(msg: string)  { console.log(`  ${YELLOW}⚠️  WARN${RESET}  ${msg}`); }

// ── Sources de vérité V1 ──────────────────────────────────────

const V1_SLUGS = ["rewards-25k", "rewards-50k", "rewards-100k"] as const;
type V1Slug = typeof V1_SLUGS[number];

const DD_PCT: Record<V1Slug, number> = {
  "rewards-25k":  4,
  "rewards-50k":  4,
  "rewards-100k": 3,
};

const QUALIFYING_MIN_USD: Record<V1Slug, number> = {
  "rewards-25k":   50,
  "rewards-50k":  100,
  "rewards-100k": 150,
};

const ACTIVATION_FEE_EUR: Record<V1Slug, number> = {
  "rewards-25k":   99,
  "rewards-50k":   99,
  "rewards-100k": 149,
};

const REWARD_CAPS: Record<V1Slug, Record<string, number>> = {
  "rewards-25k":  { reward_cap_1: 300,  reward_cap_2: 400,  reward_cap_3: 500,  reward_cap_4: 600,  reward_cap_5: 750  },
  "rewards-50k":  { reward_cap_1: 500,  reward_cap_2: 650,  reward_cap_3: 800,  reward_cap_4: 1000, reward_cap_5: 1250 },
  "rewards-100k": { reward_cap_1: 750,  reward_cap_2: 1000, reward_cap_3: 1250, reward_cap_4: 1500, reward_cap_5: 1750 },
};

// ── DDL — Étendre le CHECK constraint via Management API ──────

const DDL_SQL = `
ALTER TABLE challenge_product_phases
DROP CONSTRAINT IF EXISTS challenge_product_phases_type_ck;

ALTER TABLE challenge_product_phases
ADD CONSTRAINT challenge_product_phases_type_ck
CHECK (phase_type IN ('challenge', 'funded', 'reward_journey'));
`.trim();

async function runDdlMigration(): Promise<boolean> {
  // 1. Token Management API — trois sources (priorité décroissante) :
  //    a) Variable d'env SUPABASE_ACCESS_TOKEN
  //    b) Fichier CLI ~/.supabase/access-token
  //    c) Fallback manuel
  let accessToken = process.env.SUPABASE_ACCESS_TOKEN ?? "";

  if (!accessToken) {
    try {
      accessToken = readFileSync(
        join(homedir(), ".supabase", "access-token"),
        "utf-8",
      ).trim();
    } catch {
      /* fichier absent — on continuera avec chaîne vide */
    }
  }

  if (!accessToken) {
    warn(`Token Management API introuvable — DDL manuel requis.`);
    warn(`Solutions (une seule suffit) :`);
    console.log(`  1. Définir : set SUPABASE_ACCESS_TOKEN=<votre_token>`);
    console.log(`     puis relancer : npx tsx scripts/add-v1-phase3.ts`);
    console.log(`  2. Ou exécuter ce SQL dans Supabase Studio → SQL Editor :\n`);
    console.log(`     ${DDL_SQL.split("\n").join("\n     ")}\n`);
    return false;
  }

  // 2. Appel Management API
  const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;
  try {
    const res = await fetch(endpoint, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({ query: DDL_SQL }),
    });

    if (!res.ok) {
      const body = await res.text();
      // 409 ou 400 peuvent survenir si le constraint existait déjà — traiter comme succès
      if (res.status === 400 && body.includes("already exists")) {
        ok(`CHECK constraint challenge_product_phases_type_ck déjà à jour`);
        return true;
      }
      warn(`Management API répondu ${res.status} : ${body.slice(0, 200)}`);
      console.log(`\n  ${YELLOW}${BOLD}SQL à exécuter manuellement dans Supabase Studio > SQL Editor :${RESET}`);
      console.log(`  ${DIM}${DDL_SQL.split("\n").join("\n  ")}${RESET}\n`);
      return false;
    }

    ok(`CHECK constraint étendu → phase_type IN ('challenge','funded','reward_journey')`);
    return true;
  } catch (e) {
    warn(`Fetch Management API échoué : ${e}`);
    console.log(`\n  ${YELLOW}${BOLD}SQL à exécuter dans Supabase Studio > SQL Editor :${RESET}`);
    console.log(`  ${DIM}${DDL_SQL.split("\n").join("\n  ")}${RESET}\n`);
    return false;
  }
}

// ── Phases definitions ────────────────────────────────────────

function getPhases(slug: V1Slug) {
  const ddPct = DD_PCT[slug];
  return [
    {
      phase_order:      1,
      phase_type:       "challenge",
      phase_label:      "Challenge",
      profit_target:    6.0,
      daily_drawdown:   ddPct,  // mirror field
      total_drawdown:   ddPct,
      min_trading_days: 2,
      max_trading_days: 30,
      profit_split:     null,
    },
    {
      phase_order:      2,
      phase_type:       "funded",
      phase_label:      "Reward #1",
      profit_target:    4.0,
      daily_drawdown:   0.0,   // V1 : aucun daily DD
      total_drawdown:   ddPct,
      min_trading_days: 5,     // 5 jours qualifiants minimum
      max_trading_days: null,  // illimité
      profit_split:     null,
    },
    {
      phase_order:      3,
      phase_type:       "reward_journey",
      phase_label:      "Rewards #2 à #5",
      profit_target:    4.0,   // seuil = start × 1.04
      daily_drawdown:   0.0,
      total_drawdown:   0.0,   // plancher fixe géré par l'engine
      min_trading_days: 0,     // aucun minimum au Niveau 3
      max_trading_days: null,
      profit_split:     null,
    },
  ];
}

// ── Rules definitions ─────────────────────────────────────────

type RuleRow = { rule_key: string; rule_value: unknown; enabled: boolean; description: string };

function getRules(slug: V1Slug): RuleRow[] {
  const ddPct   = DD_PCT[slug];
  const lockPct = ddPct;
  const lockMul = (1 + lockPct / 100).toFixed(2);
  const qMin    = QUALIFYING_MIN_USD[slug];
  const fee     = ACTIVATION_FEE_EUR[slug];
  const caps    = REWARD_CAPS[slug];

  return [
    { rule_key: "dd_model",                rule_value: "trailing_eod_lock", enabled: true,
      description: "Discriminant V1 : trailing drawdown EOD avec verrou. Ne pas modifier." },
    { rule_key: "trailing_dd_pct",         rule_value: ddPct,   enabled: true,
      description: `Trailing drawdown ${ddPct}% EOD. Mis à jour uniquement en fin de journée (22h00 UTC).` },
    { rule_key: "trailing_lock_pct",       rule_value: lockPct, enabled: true,
      description: `Verrouillage trailing (${lockPct}%) : floor = start si highest_eod ≥ start × ${lockMul} (permanent).` },
    { rule_key: "qualifying_day_min_usd",  rule_value: qMin,    enabled: true,
      description: `Seuil USD minimum par journée qualifiante (Reward Account) : ${qMin} USD.` },
    { rule_key: "activation_fee_eur",      rule_value: fee,     enabled: true,
      description: `Frais d'activation Reward Account : ${fee} EUR.` },
    { rule_key: "consistency_challenge_pct", rule_value: 50,    enabled: true,
      description: "Consistency Niveau 1 (Challenge) : best_day ≤ 50 % du profit requis." },
    { rule_key: "consistency_reward_pct",    rule_value: 33,    enabled: true,
      description: "Consistency Niveaux 2 & 3 (Rewards) : best_day ≤ 33 % du profit requis." },
    ...Object.entries(caps).map(([key, val]) => ({
      rule_key:    key,
      rule_value:  val,
      enabled:     true,
      description: `Plafond ${key.replace("reward_cap_", "Reward #")} — ${slug} : ${val} USD.`,
    })),
  ];
}

// ── Upsert helpers ────────────────────────────────────────────

async function upsertPhase(productId: string, slug: string, phase: ReturnType<typeof getPhases>[number]) {
  const { error } = await admin
    .from("challenge_product_phases")
    .upsert({ product_id: productId, ...phase }, { onConflict: "product_id,phase_order" });
  if (error) {
    fail(`${slug} Phase ${phase.phase_order} [${phase.phase_type}] — ${error.message} [${error.code}]`);
  } else {
    ok(`${slug} Phase ${phase.phase_order} [${phase.phase_type}] "${phase.phase_label}"`);
  }
}

async function upsertRule(productId: string, slug: string, rule: RuleRow) {
  const { error } = await admin
    .from("challenge_product_rules")
    .upsert({ product_id: productId, ...rule }, { onConflict: "product_id,rule_key" });
  if (error) {
    fail(`${slug} rule ${rule.rule_key} — ${error.message} [${error.code}]`);
  } else {
    ok(`${slug} ${rule.rule_key} = ${JSON.stringify(rule.rule_value)}`);
  }
}

// ── Main ───────────────────────────────────────────────────────

async function main() {
  console.log(`\n${BOLD}${"═".repeat(66)}${RESET}`);
  console.log(`  TRADERS REWARDS V1 — MIGRATION COMPLÈTE & IDEMPOTENTE v3`);
  console.log(`  Host : ${PROJECT_REF}.supabase.co`);
  console.log(`  Cible : ${V1_SLUGS.join(" | ")}`);
  console.log(`${BOLD}${"═".repeat(66)}${RESET}`);

  // ── ÉTAPE 0 : DDL — étendre le CHECK constraint ────────────
  console.log(`\n${BOLD}── ÉTAPE 0 : DDL — CHECK constraint challenge_product_phases_type_ck ──${RESET}`);
  const ddlOk = await runDdlMigration();
  if (!ddlOk) {
    warn("DDL non appliqué. Phase 3 sera bloquée jusqu'à correction du constraint.");
    warn("Toutes les autres corrections (règles, phases 1 & 2) continuent.");
  }

  // ── ÉTAPES 1–4 : Data per product ──────────────────────────
  for (const slug of V1_SLUGS) {
    console.log(`\n${BOLD}${"─".repeat(66)}${RESET}`);
    console.log(`  ${BOLD}${slug.toUpperCase()}${RESET}   (trailing DD/Lock = ${DD_PCT[slug]}%)`);
    console.log(`${"─".repeat(66)}\n`);

    const { data: prod, error: prodErr } = await admin
      .from("challenge_products")
      .select("id, slug, name, balance_usd, active")
      .eq("slug", slug)
      .single();

    if (prodErr || !prod) {
      fail(`Produit "${slug}" introuvable : ${prodErr?.message ?? "null"}`);
      continue;
    }
    info(`id = ${prod.id}  |  ${prod.name}  |  ${prod.balance_usd} USD  |  active = ${prod.active}`);

    const productId = prod.id;

    // Phases
    console.log("");
    info("── Phases ──");
    for (const phase of getPhases(slug)) {
      await upsertPhase(productId, slug, phase);
    }

    // Règles
    console.log("");
    info("── Règles ──");
    for (const rule of getRules(slug)) {
      await upsertRule(productId, slug, rule);
    }

    // Vérification finale : count phases
    console.log("");
    const { data: finalPhases } = await admin
      .from("challenge_product_phases")
      .select("phase_order, phase_type, phase_label")
      .eq("product_id", productId)
      .order("phase_order", { ascending: true });

    const count = finalPhases?.length ?? 0;
    if (count === 3) {
      ok(`${slug} → ${count}/3 phases ✓`);
    } else if (count === 2 && !ddlOk) {
      warn(`${slug} → ${count}/3 phases (Phase 3 bloquée par le CHECK constraint — appliquer le DDL)`);
    } else {
      fail(`${slug} → ${count} phases en DB (attendu : 3)`);
    }
    for (const ph of finalPhases ?? []) {
      info(`  Phase ${ph.phase_order} [${ph.phase_type}] — ${ph.phase_label}`);
    }

    // Spot-check trailing_lock_pct
    const { data: lockRule } = await admin
      .from("challenge_product_rules")
      .select("rule_value")
      .eq("product_id", productId)
      .eq("rule_key", "trailing_lock_pct")
      .single();

    const lockVal = lockRule?.rule_value;
    const expected = DD_PCT[slug];
    if (lockVal === expected || lockVal === String(expected)) {
      ok(`${slug} trailing_lock_pct = ${lockVal} ✓`);
    } else {
      fail(`${slug} trailing_lock_pct = ${lockVal} (attendu ${expected})`);
    }

    // Spot-check trailing_dd_pct
    const { data: ddRule } = await admin
      .from("challenge_product_rules")
      .select("rule_value")
      .eq("product_id", productId)
      .eq("rule_key", "trailing_dd_pct")
      .single();

    const ddVal = ddRule?.rule_value;
    if (ddVal === expected || ddVal === String(expected)) {
      ok(`${slug} trailing_dd_pct = ${ddVal} ✓`);
    } else {
      fail(`${slug} trailing_dd_pct = ${ddVal} (attendu ${expected})`);
    }
  }

  // ── Résumé ─────────────────────────────────────────────────
  console.log(`\n${BOLD}${"═".repeat(66)}${RESET}`);
  if (errorsTotal === 0 && ddlOk) {
    console.log(`  ${GREEN}${BOLD}✅ Migration terminée — 0 erreur.${RESET}`);
    console.log(`  → Vérifier avec : npx tsx scripts/check-v1-migration.ts`);
  } else if (errorsTotal === 0 && !ddlOk) {
    console.log(`  ${YELLOW}${BOLD}⚠️  Données OK — DDL en attente (Phase 3 bloquée).${RESET}`);
    console.log(`  → Appliquer le SQL du DDL dans Supabase Studio, puis relancer ce script.`);
  } else {
    console.log(`  ${RED}${BOLD}❌ ${errorsTotal} erreur(s) — voir logs ci-dessus.${RESET}`);
  }
  console.log(`${BOLD}${"═".repeat(66)}${RESET}\n`);

  if (errorsTotal > 0) process.exit(1);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
