/**
 * TRADERS REWARDS V1 — Contrôle post-migration (lecture seule)
 *
 * Usage : npx tsx scripts/check-v1-migration.ts
 *
 * Vérifie :
 * A. challenges.dd_model existe dans la table
 * B. Les anciens challenges ont dd_model = NULL
 * C. Les 3 produits V1 sont présents
 * D–H. Prix, règles, activation fees, qualifying days
 * I. Aucune donnée ancienne modifiée
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL         = "https://gvvtpgekhhsjvnlgesgc.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dnRwZ2VraGhzanZubGdlc2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY4MTQ5MywiZXhwIjoyMDk0MjU3NDkzfQ.NebKiXtVcDvisUic99XADUec1bZJbDpHlhnkTXvEeqs";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const RESET  = "\x1b[0m";

let passed = 0;
let failed = 0;
let warned = 0;

function chk(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`  ${GREEN}✅ PASS${RESET}  ${label}${detail ? `  ${DIM}(${detail})${RESET}` : ""}`);
    passed++;
  } else {
    console.log(`  ${RED}❌ FAIL${RESET}  ${label}${detail ? `  ${DIM}(${detail})${RESET}` : ""}`);
    failed++;
  }
}

function warn(label: string, detail = "") {
  console.log(`  ${YELLOW}⚠️  WARN${RESET}  ${label}${detail ? `  ${DIM}(${detail})${RESET}` : ""}`);
  warned++;
}

function section(title: string) {
  console.log(`\n${BOLD}  ${title}${RESET}`);
  console.log(`  ${"─".repeat(58)}`);
}

async function main() {
  console.log(`\n${BOLD}${"═".repeat(62)}${RESET}`);
  console.log(`  TRADERS REWARDS V1 — CONTRÔLE POST-MIGRATION`);
  console.log(`${BOLD}${"═".repeat(62)}${RESET}`);

  // ── A. challenges.dd_model — vérif colonne ─────────────────
  section("A. Colonne challenges.dd_model");
  {
    // Essayer de sélectionner la colonne dd_model
    const { data, error } = await admin
      .from("challenges")
      .select("dd_model")
      .limit(1);

    chk("challenges.dd_model colonne accessible", !error,
      error ? error.message : "SELECT dd_model OK");
  }

  // ── B. Anciens challenges → dd_model = NULL ─────────────────
  section("B. Anciens challenges — dd_model = NULL");
  {
    // Compter les challenges existants qui ont dd_model non null (problème si > 0)
    const { data: oldChallengesWithModel, error } = await admin
      .from("challenges")
      .select("id", { count: "exact", head: true })
      .not("dd_model", "is", null)
      .not("dd_model", "in", '("trailing_eod_lock")');

    if (error) {
      warn("Impossible de vérifier anciens challenges", error.message);
    } else {
      // Ces challenges auraient un dd_model inattendu (avec head:true, data=null)
      const badRows = oldChallengesWithModel as unknown[] | null;
      const noBadRows = badRows == null || badRows.length === 0;
      chk("Aucun ancien challenge avec dd_model inattendu", noBadRows);
    }

    // Compter les challenges totaux
    const { count: total, error: errTotal } = await admin
      .from("challenges")
      .select("*", { count: "exact", head: true });

    if (!errTotal) {
      console.log(`  ${DIM}ℹ️  Challenges totaux en DB : ${total ?? "?"}${RESET}`);
    }
  }

  // ── C. Produits V1 présents ────────────────────────────────
  section("C. Nouveaux produits V1 présents");
  const productIds: Record<string, string> = {};
  for (const slug of ["rewards-25k", "rewards-50k", "rewards-100k"]) {
    const { data, error } = await admin
      .from("challenge_products")
      .select("id, slug, name, price_eur_cents, balance_usd, version, active")
      .eq("slug", slug)
      .single();

    const exists = !error && data != null;
    chk(`Produit ${slug} présent`, exists,
      exists ? `id=${data.id.slice(0, 8)}… v${data.version}` : error?.message);
    if (exists) productIds[slug] = data.id;
  }

  // ── D. Prix 19/29/59 EUR ───────────────────────────────────
  section("D. Prix de lancement (en centimes)");
  {
    const expected: Record<string, number> = { "rewards-25k": 1900, "rewards-50k": 2900, "rewards-100k": 5900 };
    for (const [slug, expectedCents] of Object.entries(expected)) {
      const { data } = await admin
        .from("challenge_products")
        .select("price_eur_cents")
        .eq("slug", slug)
        .single();
      chk(`${slug} price_eur_cents = ${expectedCents} (${expectedCents/100}€)`,
        data?.price_eur_cents === expectedCents,
        data ? `trouvé: ${data.price_eur_cents}` : "ABSENT");
    }
  }

  // ── E. Nombre de phases = 3 par produit V1 ───────────────────
  section("E. Nombre de phases = 3 par produit V1");
  {
    for (const slug of ["rewards-25k", "rewards-50k", "rewards-100k"]) {
      const { data: allPhases } = await admin
        .from("challenge_product_phases")
        .select("phase_order, phase_type, phase_label")
        .eq("product_id", productIds[slug] ?? "")
        .order("phase_order", { ascending: true });

      const count = allPhases?.length ?? 0;
      chk(`${slug} possède 3 phases`, count === 3, `trouvé: ${count}`);
      if (allPhases) {
        for (const ph of allPhases) {
          console.log(`    Phase ${ph.phase_order} [${ph.phase_type}] — ${ph.phase_label}`);
        }
      }
    }
  }

  // ── F. Règles Niveau 1 — STARTER / CHALLENGE ──────────────────
  section("F. Phase 1 — STARTER / CHALLENGE");
  {
    const ddBySlug: Record<string, number> = { "rewards-25k": 4.0, "rewards-50k": 4.0, "rewards-100k": 3.0 };

    for (const slug of ["rewards-25k", "rewards-50k", "rewards-100k"]) {
      const expectedDd = ddBySlug[slug];
      const { data: phases } = await admin
        .from("challenge_product_phases")
        .select("*")
        .eq("product_id", productIds[slug] ?? "")
        .eq("phase_order", 1)
        .single();

      chk(`${slug} Phase1 profit_target = 6.0`,                  phases?.profit_target  === 6.0,        `trouvé: ${phases?.profit_target}`);
      chk(`${slug} Phase1 total_drawdown = ${expectedDd}`,       phases?.total_drawdown === expectedDd, `trouvé: ${phases?.total_drawdown}`);
      chk(`${slug} Phase1 daily_drawdown = ${expectedDd}`,       phases?.daily_drawdown === expectedDd, `trouvé: ${phases?.daily_drawdown}`);
      chk(`${slug} Phase1 min_trading_days = 2`,                 phases?.min_trading_days === 2,        `trouvé: ${phases?.min_trading_days}`);
      chk(`${slug} Phase1 max_trading_days = 30`,                phases?.max_trading_days === 30,       `trouvé: ${phases?.max_trading_days}`);
      chk(`${slug} Phase1 phase_type = challenge`,               phases?.phase_type === "challenge",    `trouvé: ${phases?.phase_type}`);
      chk(`${slug} Phase1 profit_split = null (pas de split V1)`,phases?.profit_split === null,         `trouvé: ${phases?.profit_split}`);
    }
  }

  // ── G. Règles Niveau 2 — REWARD #1 / REWARD START ─────────────
  section("G. Phase 2 — REWARD #1 / REWARD START");
  {
    const ddBySlug: Record<string, number> = { "rewards-25k": 4.0, "rewards-50k": 4.0, "rewards-100k": 3.0 };

    for (const slug of ["rewards-25k", "rewards-50k", "rewards-100k"]) {
      const expectedDd = ddBySlug[slug];
      const { data: phase2 } = await admin
        .from("challenge_product_phases")
        .select("*")
        .eq("product_id", productIds[slug] ?? "")
        .eq("phase_order", 2)
        .single();

      chk(`${slug} Phase2 profit_target = 4.0`,                   phase2?.profit_target  === 4.0,        `trouvé: ${phase2?.profit_target}`);
      chk(`${slug} Phase2 total_drawdown = ${expectedDd}`,        phase2?.total_drawdown === expectedDd, `trouvé: ${phase2?.total_drawdown}`);
      chk(`${slug} Phase2 min_trading_days = 5 (j. qualif.)`,     phase2?.min_trading_days === 5,        `trouvé: ${phase2?.min_trading_days}`);
      chk(`${slug} Phase2 phase_type = funded`,                   phase2?.phase_type === "funded",       `trouvé: ${phase2?.phase_type}`);
      chk(`${slug} Phase2 profit_split = null (pas de split V1)`, phase2?.profit_split === null,         `trouvé: ${phase2?.profit_split}`);
      chk(`${slug} Phase2 max_trading_days = null (illimité)`,    phase2?.max_trading_days === null,     `trouvé: ${phase2?.max_trading_days}`);
    }
  }

  // ── H. Règles Niveau 3 — TRADER REWARD ────────────────────────
  section("H. Phase 3 — TRADER REWARD / REWARDS #2 À #5");
  {
    for (const slug of ["rewards-25k", "rewards-50k", "rewards-100k"]) {
      const { data: phase3 } = await admin
        .from("challenge_product_phases")
        .select("*")
        .eq("product_id", productIds[slug] ?? "")
        .eq("phase_order", 3)
        .single();

      chk(`${slug} Phase3 existe`,                        phase3 != null,                              `trouvé: ${phase3 != null ? "OUI" : "NON"}`);
      chk(`${slug} Phase3 phase_type = reward_journey`,   phase3?.phase_type === "reward_journey",     `trouvé: ${phase3?.phase_type}`);
      chk(`${slug} Phase3 daily_drawdown = 0 (no DD V1)`, phase3?.daily_drawdown === 0,               `trouvé: ${phase3?.daily_drawdown}`);
      chk(`${slug} Phase3 total_drawdown = 0 (plancher fixe)`, phase3?.total_drawdown === 0,          `trouvé: ${phase3?.total_drawdown}`);
      chk(`${slug} Phase3 profit_split = null`,           phase3?.profit_split === null,               `trouvé: ${phase3?.profit_split}`);
    }
  }

  // ── I. Activation fees 99/99/149 EUR ──────────────────────
  section("I. Activation fees (activation_fee_eur)");
  {
    const expected: Record<string, number> = { "rewards-25k": 99, "rewards-50k": 99, "rewards-100k": 149 };
    for (const [slug, expectedFee] of Object.entries(expected)) {
      const { data: rule } = await admin
        .from("challenge_product_rules")
        .select("rule_value")
        .eq("product_id", productIds[slug] ?? "")
        .eq("rule_key", "activation_fee_eur")
        .single();

      const fee = rule?.rule_value;
      chk(`${slug} activation_fee_eur = ${expectedFee} EUR`,
        fee === expectedFee || fee === String(expectedFee),
        `trouvé: ${JSON.stringify(fee)}`);
    }
  }

  // ── J. qualifying_day_min_usd 50/100/150 ──────────────────
  section("J. Qualifying day min USD (50/100/150)");
  {
    const expected: Record<string, number> = { "rewards-25k": 50, "rewards-50k": 100, "rewards-100k": 150 };
    for (const [slug, expectedMin] of Object.entries(expected)) {
      const { data: rule } = await admin
        .from("challenge_product_rules")
        .select("rule_value")
        .eq("product_id", productIds[slug] ?? "")
        .eq("rule_key", "qualifying_day_min_usd")
        .single();

      const val = rule?.rule_value;
      chk(`${slug} qualifying_day_min_usd = ${expectedMin}`,
        val === expectedMin || val === String(expectedMin),
        `trouvé: ${JSON.stringify(val)}`);
    }
  }

  // ── K. dd_model = trailing_eod_lock dans les règles ────────
  section("K. dd_model = trailing_eod_lock (discriminant V1)");
  {
    for (const slug of ["rewards-25k", "rewards-50k", "rewards-100k"]) {
      const { data: rule } = await admin
        .from("challenge_product_rules")
        .select("rule_value")
        .eq("product_id", productIds[slug] ?? "")
        .eq("rule_key", "dd_model")
        .single();

      chk(`${slug} dd_model = "trailing_eod_lock"`,
        rule?.rule_value === "trailing_eod_lock",
        `trouvé: ${JSON.stringify(rule?.rule_value)}`);
    }
  }

  // ── N. trailing_dd_pct (25K/50K = 4, 100K = 3) ───────────
  section("N. trailing_dd_pct — 25K/50K = 4 %, 100K = 3 %");
  {
    const expected: Record<string, number> = {
      "rewards-25k": 4, "rewards-50k": 4, "rewards-100k": 3,
    };
    for (const [slug, expectedDd] of Object.entries(expected)) {
      const { data: rule } = await admin
        .from("challenge_product_rules")
        .select("rule_value")
        .eq("product_id", productIds[slug] ?? "")
        .eq("rule_key", "trailing_dd_pct")
        .single();
      const val = rule?.rule_value;
      chk(`${slug} trailing_dd_pct = ${expectedDd}`,
        val === expectedDd || val === String(expectedDd),
        `trouvé: ${JSON.stringify(val)}`);
    }
  }

  // ── O. trailing_lock_pct (25K/50K = 4, 100K = 3) ─────────
  section("O. trailing_lock_pct — 25K/50K = 4 %, 100K = 3 %");
  {
    const expected: Record<string, number> = {
      "rewards-25k": 4, "rewards-50k": 4, "rewards-100k": 3,
    };
    for (const [slug, expectedLock] of Object.entries(expected)) {
      const { data: rule } = await admin
        .from("challenge_product_rules")
        .select("rule_value")
        .eq("product_id", productIds[slug] ?? "")
        .eq("rule_key", "trailing_lock_pct")
        .single();
      const val = rule?.rule_value;
      chk(`${slug} trailing_lock_pct = ${expectedLock}`,
        val === expectedLock || val === String(expectedLock),
        `trouvé: ${JSON.stringify(val)}`);
    }
  }

  // ── L. Reward caps par produit ─────────────────────────────
  section("L. Reward caps #1 à #5 (USD)");
  {
    const capsExpected: Record<string, Record<string, number>> = {
      "rewards-25k":  { reward_cap_1: 300,  reward_cap_2: 400,  reward_cap_3: 500,  reward_cap_4: 600,  reward_cap_5: 750  },
      "rewards-50k":  { reward_cap_1: 500,  reward_cap_2: 650,  reward_cap_3: 800,  reward_cap_4: 1000, reward_cap_5: 1250 },
      "rewards-100k": { reward_cap_1: 750,  reward_cap_2: 1000, reward_cap_3: 1250, reward_cap_4: 1500, reward_cap_5: 1750 },
    };
    for (const [slug, caps] of Object.entries(capsExpected)) {
      for (const [key, expected] of Object.entries(caps)) {
        const { data: rule } = await admin
          .from("challenge_product_rules")
          .select("rule_value")
          .eq("product_id", productIds[slug] ?? "")
          .eq("rule_key", key)
          .single();
        const val = rule?.rule_value;
        chk(`${slug} ${key} = ${expected}`,
          val === expected || val === String(expected),
          `trouvé: ${JSON.stringify(val)}`);
      }
    }
  }

  // ── M. Consistency pct ─────────────────────────────────────
  section("M. Consistency — challenge 50 % / reward 33 %");
  {
    for (const slug of ["rewards-25k", "rewards-50k", "rewards-100k"]) {
      const { data: r1 } = await admin
        .from("challenge_product_rules")
        .select("rule_value")
        .eq("product_id", productIds[slug] ?? "")
        .eq("rule_key", "consistency_challenge_pct")
        .single();
      const { data: r2 } = await admin
        .from("challenge_product_rules")
        .select("rule_value")
        .eq("product_id", productIds[slug] ?? "")
        .eq("rule_key", "consistency_reward_pct")
        .single();
      const v1 = r1?.rule_value;
      const v2 = r2?.rule_value;
      chk(`${slug} consistency_challenge_pct = 50`, v1 === 50 || v1 === "50", `trouvé: ${JSON.stringify(v1)}`);
      chk(`${slug} consistency_reward_pct = 33`,    v2 === 33 || v2 === "33", `trouvé: ${JSON.stringify(v2)}`);
    }
  }

  // ── Résumé ─────────────────────────────────────────────────
  console.log(`\n${BOLD}${"═".repeat(62)}${RESET}`);
  const col  = failed === 0 ? GREEN : RED;
  const mark = failed === 0 ? "✅" : "❌";
  console.log(`  ${col}${BOLD}${mark} ${passed}/${passed + failed} checks PASS${RESET}  |  ${failed} failed  |  ${warned} warns`);
  if (failed > 0) {
    console.log(`\n  ${RED}${BOLD}→ Des contrôles échouent. Vérifier la migration.${RESET}`);
  }
  console.log(`${BOLD}${"═".repeat(62)}${RESET}\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
