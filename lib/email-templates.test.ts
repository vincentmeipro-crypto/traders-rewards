/**
 * ============================================================
 * Tests — lib/email-templates.ts
 * ============================================================
 * Vérifie que tous les emails transactionnels :
 *   1. N'utilisent PAS le vocabulaire interdit
 *   2. Affichent le bon vocabulaire officiel
 *   3. Contiennent les valeurs métier correctes
 *
 * Exécution : ts-node lib/email-templates.test.ts
 * (ou via le runner de tests du projet si disponible)
 * ============================================================
 */

import {
  buildWelcomeEmail,
  buildPhase2Email,
  buildFailedEmail,
  buildFundedEmail,
  buildDailyUpdateEmail,
  buildChallengeCertificateEmail,
  buildRewardCertificateEmail,
  buildRewardProgressionEmail,
  buildApologyEmail,
  FAKE_BRANDING,
  FAKE_MT5,
  FAKE_PERSON,
} from "./email-templates";

// ── Vocabulaire interdit dans tout contenu visible ────────────

const FORBIDDEN = [
  "Phase 1",
  "Phase 2",
  "Funded",
  "funded",
  "Reward Account",
  "First Reward",
  "Apex",
  "Legacy",
  "Reward Start",
  // Note: "V1" peut apparaître dans des URLs internes — on vérifie le corps uniquement
];

// ── Helpers ───────────────────────────────────────────────────

let pass = 0;
let fail = 0;

function assert(condition: boolean, label: string): void {
  if (condition) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}`);
    fail++;
  }
}

/** Vérifie qu'un mot interdit n'est PAS dans le HTML */
function assertNotContains(html: string, forbidden: string, label: string): void {
  assert(!html.includes(forbidden), label);
}

/** Vérifie qu'une chaîne est DANS le HTML */
function assertContains(html: string, expected: string, label: string): void {
  assert(html.includes(expected), label);
}

function section(name: string) {
  console.log(`\n── ${name} ──`);
}

// ── Paramètres de test ────────────────────────────────────────

const { siteUrl, logoUrl } = FAKE_BRANDING;
const { firstName, lastName } = FAKE_PERSON;

// ── 1. buildWelcomeEmail ─────────────────────────────────────

section("buildWelcomeEmail — 50K Challenger");
{
  const { subject, html } = buildWelcomeEmail({
    accountSize: "$50,000",
    model:       "rewards-50k",
    mt5:         FAKE_MT5,
    siteUrl,
    logoUrl,
  });

  assertContains(html, "Challenger", "contient 'Challenger'");
  assertContains(html, "Votre Challenger Traders Rewards est actif", "titre correct");
  assertContains(subject, "Votre Challenger Traders Rewards est prêt", "subject correct");
  assertContains(html, "2 jours", "contient '2 jours minimum'");
  assertContains(html, "≤ 50%", "contient '≤ 50%' (consistance)");
  assertContains(html, "2 000 $", "contient 'DD EOD 2 000 $' pour 50K");
  assertContains(html, "+6 % = 3 000 $", "objectif +6% = 3 000 $");
  assertNotContains(html, "Aucune", "ne contient PAS 'Aucune'");
  assertNotContains(html, "0 jour minimum", "ne contient PAS '0 jour minimum'");
  assertNotContains(html, "Challenge Traders Rewards", "ne contient PAS 'Challenge Traders Rewards'");
  assertNotContains(html, "Parcours", "ne contient PAS 'Parcours' comme label de row");
}

section("buildWelcomeEmail — 25K");
{
  const { html } = buildWelcomeEmail({
    accountSize: "$25,000",
    model:       "rewards-25k",
    siteUrl,
    logoUrl,
  });
  assertContains(html, "1 000 $", "DD EOD 1 000 $ pour 25K");
  assertContains(html, "+6 % = 1 500 $", "objectif +6% = 1 500 $ pour 25K");
}

section("buildWelcomeEmail — 100K");
{
  const { html } = buildWelcomeEmail({
    accountSize: "$100,000",
    model:       "rewards-100k",
    siteUrl,
    logoUrl,
  });
  assertContains(html, "3 000 $", "DD EOD 3 000 $ pour 100K");
  assertContains(html, "+6 % = 6 000 $", "objectif +6% = 6 000 $ pour 100K");
}

// ── 2. buildPhase2Email ──────────────────────────────────────

section("buildPhase2Email — Challenger validé");
{
  const { subject, html } = buildPhase2Email({
    accountSize: "$50,000",
    mt5:         FAKE_MT5,
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Votre Challenger est validé", "subject correct");
  assertContains(html, "Compte Reward", "contient 'Compte Reward'");
  assertNotContains(html, "Phase 1", "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2", "ne contient PAS 'Phase 2'");
}

// ── 3. buildFailedEmail ──────────────────────────────────────

section("buildFailedEmail — Challenger (phase=challenge)");
{
  const { subject, html } = buildFailedEmail({
    accountSize: "$50,000",
    reason:      "total_drawdown",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Challenger", "subject contient 'Challenger'");
  assertContains(html, "Votre Challenger est terminé", "titre Challenger");
  assertNotContains(html, "Phase 1", "ne contient PAS 'Phase 1'");
}

section("buildFailedEmail — Compte Reward (phase=funded)");
{
  const { subject, html } = buildFailedEmail({
    accountSize: "$50,000",
    reason:      "total_drawdown",
    phase:       "funded",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "parcours Reward", "subject contient 'parcours Reward'");
  assertContains(html, "Votre parcours Reward est terminé", "titre Compte Reward");
  assertNotContains(html, "Phase 2", "ne contient PAS 'Phase 2'");
}

// ── 4. buildFundedEmail ──────────────────────────────────────

section("buildFundedEmail — Compte Reward 100K");
{
  const { subject, html } = buildFundedEmail({
    accountSize: "$100,000",
    mt5:         FAKE_MT5,
    splitPct:    100,
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Compte Reward", "subject contient 'Compte Reward'");
  assertContains(html, "Compte Reward", "contient 'Compte Reward'");
  assertContains(html, "Safety Net", "contient 'Safety Net'");
  assertContains(html, "103 100", "Safety Net 100K = 103 100 $");
  assertContains(html, "Seuil Reward #1", "contient 'Seuil Reward #1'");
  assertContains(html, "Cap Reward #1", "contient 'Cap Reward #1'");
  assertContains(html, "5 minimum", "contient '5 minimum' (journées qualifiantes)");
  assertContains(html, "≤ 50%", "contient '≤ 50%' (consistance)");
  assertContains(html, "3 000 $", "DD EOD 3 000 $ pour 100K");
  assertContains(html, "Reward Payé en Automatique en 48H", "contient promesse 48H");
  assertNotContains(html, "Reward Start", "ne contient PAS 'Reward Start'");
}

section("buildFundedEmail — Compte Reward 50K");
{
  const { html } = buildFundedEmail({
    accountSize: "$50,000",
    splitPct:    100,
    siteUrl,
    logoUrl,
  });
  assertContains(html, "52 100", "Safety Net 50K = 52 100 $");
  assertContains(html, "2 000 $", "DD EOD 50K = 2 000 $");
  assertContains(html, "250", "Jour qualifiant min 50K = 250 $/jour");
}

section("buildFundedEmail — Compte Reward 25K");
{
  const { html } = buildFundedEmail({
    accountSize: "$25,000",
    splitPct:    100,
    siteUrl,
    logoUrl,
  });
  assertContains(html, "26 100", "Safety Net 25K = 26 100 $");
  assertContains(html, "1 000 $", "DD EOD 25K = 1 000 $");
}

// ── 5. buildRewardProgressionEmail ───────────────────────────

section("buildRewardProgressionEmail — Reward #2 payé → Trader Reward #3");
{
  const { subject, html } = buildRewardProgressionEmail({
    firstName:    "Alex",
    accountSize:  "$50,000",
    rewardPaid:   2,
    rewardAmount: "$600",
    mt5Login:     FAKE_MT5.login,
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Reward #2", "subject contient 'Reward #2'");
  assertContains(subject, "Trader Reward #3", "subject contient 'Trader Reward #3'");
  assertContains(html, "Reward #2 payé", "contient 'Reward #2 payé'");
  assertContains(html, "Trader Reward #3", "contient 'Trader Reward #3'");
  assertContains(html, "Safety Net", "contient 'Safety Net'");
  assertContains(html, "≤ 50%", "contient 'consistance 50%'");
  assertNotContains(html, "Phase 1", "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2", "ne contient PAS 'Phase 2'");
}

section("buildRewardProgressionEmail — Reward #5 payé → Parcours terminé");
{
  const { subject, html } = buildRewardProgressionEmail({
    firstName:    "Alex",
    accountSize:  "$50,000",
    rewardPaid:   5,
    rewardAmount: "$850",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Parcours terminé", "subject contient 'Parcours terminé'");
  assertContains(html, "Terminé", "contient statut 'Terminé'");
  assertContains(html, "Reward #5 payé", "contient 'Reward #5 payé'");
  assertNotContains(html, "Trader Reward #6", "ne contient PAS de niveau #6");
}

// ── 6. buildRewardCertificateEmail ───────────────────────────

section("buildRewardCertificateEmail — Reward #3");
{
  const { subject, html } = buildRewardCertificateEmail({
    firstName:   "Alex",
    lastName:    "Martin",
    accountSize: "$50,000",
    grossAmount: 700,
    rewardLevel: 3,
    date:        "27 août 2026",
    splitPct:    100,
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Trader Reward #3", "subject contient 'Trader Reward #3'");
  assertContains(html, "Trader Reward #3", "contient 'Trader Reward #3'");
  assertContains(html, "$700", "contient montant $700");
}

// ── 7. buildChallengeCertificateEmail ────────────────────────

section("buildChallengeCertificateEmail");
{
  const { subject, html } = buildChallengeCertificateEmail({
    firstName:   firstName,
    lastName:    lastName,
    accountSize: "$100,000",
    date:        "27 août 2026",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Votre Challenger est validé", "subject correct");
  assertContains(html, "CHALLENGER VALIDÉ", "contient 'CHALLENGER VALIDÉ'");
  assertContains(html, "Compte Reward", "contient 'Compte Reward'");
  assertNotContains(html, "Phase 1", "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2", "ne contient PAS 'Phase 2'");
}

// ── 8. Vocabulaire interdit — tous les emails ─────────────────

section("Vocabulaire interdit — scan global");
{
  const allEmails = [
    buildWelcomeEmail({ accountSize: "$50,000", model: "rewards-50k", siteUrl, logoUrl }),
    buildPhase2Email({ accountSize: "$50,000", siteUrl, logoUrl }),
    buildFailedEmail({ accountSize: "$50,000", reason: "total_drawdown", siteUrl, logoUrl }),
    buildFundedEmail({ accountSize: "$50,000", splitPct: 100, siteUrl, logoUrl }),
    buildDailyUpdateEmail({ accountSize: "$50,000", phase: "funded", balance: 52000, profitPct: 2.1, tradingDays: 8, siteUrl, logoUrl }),
    buildChallengeCertificateEmail({ firstName, lastName, accountSize: "$50,000", date: "27 août 2026", siteUrl, logoUrl }),
    buildRewardCertificateEmail({ firstName, lastName, accountSize: "$50,000", grossAmount: 600, rewardLevel: 2, date: "27 août 2026", splitPct: 100, siteUrl, logoUrl }),
    buildRewardProgressionEmail({ firstName, accountSize: "$50,000", rewardPaid: 1, rewardAmount: "$500", siteUrl, logoUrl }),
    buildApologyEmail({ firstName, accountSize: "$50,000", phase: "funded", mt5: FAKE_MT5, siteUrl, logoUrl }),
  ];

  for (const forbidden of FORBIDDEN) {
    let found = false;
    for (const { subject, html } of allEmails) {
      if (html.includes(forbidden) || subject.includes(forbidden)) {
        found = true;
        console.error(`  ✗ Mot interdit trouvé — "${forbidden}" présent dans un email`);
        break;
      }
    }
    if (!found) {
      console.log(`  ✓ "${forbidden}" absent de tous les emails`);
      pass++;
    } else {
      fail++;
    }
  }
}

// ── Résultat ──────────────────────────────────────────────────

console.log(`\n${"─".repeat(52)}`);
console.log(`Résultat : ${pass} OK, ${fail} ÉCHEC sur ${pass + fail} assertions`);
if (fail > 0) {
  console.error(`\n⚠ ${fail} assertion(s) en échec.`);
  process.exit(1);
} else {
  console.log("\n✅ Tous les tests sont passés.");
  process.exit(0);
}
