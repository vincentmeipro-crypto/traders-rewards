/**
 * ============================================================
 * Tests — lib/email-templates.ts  V1.3
 * ============================================================
 * Vérifie que tous les emails transactionnels :
 *   1. N'utilisent PAS le vocabulaire interdit
 *   2. Affichent le bon vocabulaire officiel
 *   3. Contiennent les valeurs métier correctes
 *
 * Exécution : npx tsx lib/email-templates.test.ts
 * ============================================================
 */

import {
  buildWelcomeEmail,
  buildChallengerValidatedEmail,
  buildChallengerExpiredEmail,
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
  "nouveaux identifiants",
  // Note: "V1" peut apparaître dans des URLs internes — on vérifie le HTML complet
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

function assertNotContains(html: string, forbidden: string, label: string): void {
  assert(!html.includes(forbidden), label);
}

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

  assertContains(html,    "Compte Challenger",                              "contient 'Compte Challenger'");
  assertContains(html,    "Votre Compte Challenger Traders Rewards est actif", "titre contient 'Compte Challenger'");
  assertContains(subject, "Votre Compte Challenger Traders Rewards est prêt",  "subject contient 'Compte Challenger'");
  assertContains(html,    "2 jours",                                       "contient '2 jours minimum'");
  assertContains(html,    "≤ 50%",                                         "contient '≤ 50%' (consistance)");
  assertContains(html,    "2 000 $",                                       "DD EOD 2 000 $ pour 50K");
  assertContains(html,    "+6 % = 3 000 $",                               "objectif +6% = 3 000 $");
  assertNotContains(html, "0 jour minimum",                                "ne contient PAS '0 jour minimum'");
  assertNotContains(html, "Challenge Traders Rewards",                     "ne contient PAS 'Challenge Traders Rewards'");
  assertNotContains(html, "Parcours: Challenge",                           "ne contient PAS 'Parcours: Challenge'");
}

section("buildWelcomeEmail — 25K");
{
  const { html } = buildWelcomeEmail({
    accountSize: "$25,000",
    model:       "rewards-25k",
    siteUrl,
    logoUrl,
  });
  assertContains(html, "1 000 $",       "DD EOD 1 000 $ pour 25K");
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
  assertContains(html, "3 000 $",       "DD EOD 3 000 $ pour 100K");
  assertContains(html, "+6 % = 6 000 $", "objectif +6% = 6 000 $ pour 100K");
}

section("buildWelcomeEmail — ACTIVATION COMPTE CHALLENGER eyebrow");
{
  const { html } = buildWelcomeEmail({
    accountSize: "$50,000",
    model:       "rewards-50k",
    siteUrl,
    logoUrl,
  });
  assertContains(html, "ACTIVATION COMPTE CHALLENGER", "eyebrow correct");
}

// ── 2. buildChallengerValidatedEmail ─────────────────────────

section("buildChallengerValidatedEmail");
{
  const { subject, html } = buildChallengerValidatedEmail({
    accountSize: "$50,000",
    mt5Login:    FAKE_MT5.login,
    date:        "27 août 2026",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Votre Compte Challenger est validé", "subject correct");
  assertContains(html,    "Votre Compte Challenger est validé", "titre correct");
  assertContains(html,    "Compte Reward",                      "mentionne 'Compte Reward'");
  assertContains(html,    "CHALLENGER VALIDÉ",                  "eyebrow correct");
  assertContains(html,    String(FAKE_MT5.login),               "contient login MT5");
  assertContains(html,    "27 août 2026",                       "contient la date");
  assertContains(html,    "+6 %",                               "contient objectif +6%");
  assertNotContains(html, "Phase 1",                            "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2",                            "ne contient PAS 'Phase 2'");
  assertNotContains(html, "nouveaux identifiants",              "ne contient PAS 'nouveaux identifiants'");
  assertNotContains(html, "nouveau compte",                     "ne contient PAS 'nouveau compte'");
}

// ── 3. buildPhase2Email (alias legacy → buildChallengerValidatedEmail) ──

section("buildPhase2Email — alias → Challenger validé");
{
  const { subject, html } = buildPhase2Email({
    accountSize: "$50,000",
    mt5:         FAKE_MT5,
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Votre Compte Challenger est validé", "subject alias correct");
  assertContains(html,    "Compte Reward",                      "contient 'Compte Reward'");
  assertNotContains(html, "Phase 1",                            "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2",                            "ne contient PAS 'Phase 2'");
}

// ── 4. buildChallengerExpiredEmail ────────────────────────────

section("buildChallengerExpiredEmail — 30 jours");
{
  const { subject, html } = buildChallengerExpiredEmail({
    accountSize:   "$50,000",
    mt5Login:      FAKE_MT5.login,
    creationDate:  "28 juil. 2026",
    endDate:       "27 août 2026",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Votre Compte Challenger",    "subject contient 'Compte Challenger'");
  assertContains(subject, "terminé",                    "subject contient 'terminé'");
  assertContains(html,    "Votre Compte Challenger est terminé", "titre correct");
  assertContains(html,    "30 jours",                   "contient '30 jours'");
  assertContains(html,    String(FAKE_MT5.login),       "contient login MT5");
  assertContains(html,    "28 juil. 2026",              "contient date création");
  assertContains(html,    "27 août 2026",               "contient date fin");
  assertNotContains(html, "drawdown",                   "ne contient PAS 'drawdown'");
  assertNotContains(html, "Drawdown",                   "ne contient PAS 'Drawdown'");
  assertNotContains(html, "DD ",                        "ne contient PAS 'DD' (violation DD)");
  assertNotContains(html, "Phase 1",                    "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2",                    "ne contient PAS 'Phase 2'");
}

// ── 5. buildFailedEmail ──────────────────────────────────────

section("buildFailedEmail — Compte Challenger (sans phase)");
{
  const { subject, html } = buildFailedEmail({
    accountSize: "$50,000",
    reason:      "total_drawdown",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Challenger",                         "subject contient 'Challenger'");
  assertContains(html,    "Votre Compte Challenger est terminé", "titre contient 'Compte Challenger'");
  assertNotContains(html, "Phase 1",                            "ne contient PAS 'Phase 1'");
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
  assertContains(subject, "parcours Reward",                    "subject contient 'parcours Reward'");
  assertContains(html,    "Votre parcours Reward est terminé",  "titre Compte Reward");
  assertNotContains(html, "Phase 2",                            "ne contient PAS 'Phase 2'");
}

section("buildFailedEmail — Trader Reward #3 (phase=funded, rewardLevel=3)");
{
  const { html } = buildFailedEmail({
    accountSize:  "$50,000",
    reason:       "total_drawdown",
    phase:        "funded",
    rewardLevel:  3,
    siteUrl,
    logoUrl,
  });
  assertContains(html, "Trader Reward #3", "contient 'Trader Reward #3'");
}

// ── 6. buildFundedEmail ──────────────────────────────────────

section("buildFundedEmail — Compte Reward 100K");
{
  const { subject, html } = buildFundedEmail({
    accountSize: "$100,000",
    mt5:         FAKE_MT5,
    splitPct:    100,
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Compte Reward",              "subject contient 'Compte Reward'");
  assertContains(html,    "Compte Reward",              "contient 'Compte Reward'");
  assertContains(html,    "Safety Net",                 "contient 'Safety Net'");
  assertContains(html,    "103 100",                    "Safety Net 100K = 103 100 $");
  assertContains(html,    "Seuil Reward #1",            "contient 'Seuil Reward #1'");
  assertContains(html,    "Cap Reward #1",              "contient 'Cap Reward #1'");
  assertContains(html,    "5 minimum",                  "contient '5 minimum' (journées qualifiantes)");
  assertContains(html,    "≤ 50%",                      "contient '≤ 50%' (consistance)");
  assertContains(html,    "3 000 $",                    "DD EOD 3 000 $ pour 100K");
  assertContains(html,    "Reward Payé en Automatique en 48H", "contient promesse 48H");
  assertContains(html,    "même compte MT5",            "contient 'même compte MT5'");
  assertContains(html,    "INCHANGÉS",                  "identifiants labellisés INCHANGÉS");
  assertNotContains(html, "Reward Start",               "ne contient PAS 'Reward Start'");
  assertNotContains(html, "nouveaux identifiants",      "ne contient PAS 'nouveaux identifiants'");
}

section("buildFundedEmail — Compte Reward 50K");
{
  const { html } = buildFundedEmail({
    accountSize: "$50,000",
    splitPct:    100,
    siteUrl,
    logoUrl,
  });
  assertContains(html, "52 100",  "Safety Net 50K = 52 100 $");
  assertContains(html, "2 000 $", "DD EOD 50K = 2 000 $");
  assertContains(html, "250",     "Jour qualifiant min 50K = 250 $/jour");
}

section("buildFundedEmail — Compte Reward 25K");
{
  const { html } = buildFundedEmail({
    accountSize: "$25,000",
    splitPct:    100,
    siteUrl,
    logoUrl,
  });
  assertContains(html, "26 100",  "Safety Net 25K = 26 100 $");
  assertContains(html, "1 000 $", "DD EOD 25K = 1 000 $");
}

// ── 7. buildDailyUpdateEmail — Challenger enrichi ─────────────

section("buildDailyUpdateEmail — Challenger 50K enrichi");
{
  const { subject, html } = buildDailyUpdateEmail({
    accountSize:          "$50,000",
    phase:                "challenger",
    balance:              51_800,
    profitPct:            3.6,
    tradingDays:          4,
    startBalance:         50_000,
    highestBalance:       52_100,
    totalLimit:           4,
    calendarDaysElapsed:  12,
    calendarDaysMax:      30,
    profitTargetPct:      6,
    profitTargetUsdParam: 3_000,
    minTradingDays:       2,
    consistency:          38.5,
    accountStatus:        "Conforme",
    dailyProfitUsd:       320,
    bestDayUsd:           450,
    tradesCount:          7,
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Compte Challenger",       "subject contient niveau");
  assertContains(html,    "Compte Challenger",       "contient 'Compte Challenger'");
  assertContains(html,    "+3.60%",                  "contient profit %");
  assertContains(html,    "12",                      "contient jours écoulés");
  assertContains(html,    "18",                      "contient jours restants (30-12)");
  assertContains(html,    "38.5%",                   "contient consistance actuelle");
  assertContains(html,    "OBJECTIF CHALLENGER",     "contient section objectif");
  assertContains(html,    "1 200",                   "contient distance restante ($3000-$1800)");
  assertContains(html,    "Plancher DD EOD",         "contient plancher DD EOD");
  assertNotContains(html, "Phase 1",                 "ne contient PAS 'Phase 1'");
}

section("buildDailyUpdateEmail — Compte Reward enrichi");
{
  const { html } = buildDailyUpdateEmail({
    accountSize:            "$50,000",
    phase:                  "funded",
    balance:                53_200,
    profitPct:              6.4,
    tradingDays:            8,
    startBalance:           50_000,
    safetyNetUsd:           52_100,
    rewardThresholdUsd:     55_000,
    rewardCapUsd:           500,
    qualifyingDays:         3,
    qualifyingDaysRequired: 5,
    qualMinDayUsd:          250,
    consistency:            42.1,
    siteUrl,
    logoUrl,
  });
  assertContains(html, "Safety Net",     "contient 'Safety Net'");
  assertContains(html, "Seuil Reward",   "contient seuil Reward");
  assertContains(html, "1 800",          "contient distance au seuil ($55000-$53200)");
  assertContains(html, "3 / 5",          "contient journées qualifiantes");
  assertContains(html, "Compte Reward",  "contient 'Compte Reward'");
  assertNotContains(html, "Phase 2",     "ne contient PAS 'Phase 2'");
}

// ── 8. buildRewardProgressionEmail — Reward #2-#4 ────────────

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
  assertContains(subject, "Reward #2",            "subject contient 'Reward #2'");
  assertContains(subject, "Trader Reward #3",     "subject contient 'Trader Reward #3'");
  assertContains(html,    "Reward #2 payé",       "contient 'Reward #2 payé'");
  assertContains(html,    "Trader Reward #3",     "contient 'Trader Reward #3'");
  assertContains(html,    "Safety Net",           "contient 'Safety Net'");
  assertContains(html,    "≤ 50%",                "contient 'consistance 50%'");
  assertContains(html,    "Reward Payé en Automatique en 48H", "contient promesse 48H");
  assertNotContains(html, "Phase 1",              "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2",              "ne contient PAS 'Phase 2'");
  assertNotContains(html, "nouveaux identifiants","ne contient PAS 'nouveaux identifiants'");
}

// ── 9. buildRewardProgressionEmail — Reward #5 final ─────────

section("buildRewardProgressionEmail — Reward #5 → Parcours terminé (avec allRewards)");
{
  const { subject, html } = buildRewardProgressionEmail({
    firstName:    "Alex",
    accountSize:  "$50,000",
    rewardPaid:   5,
    rewardAmount: "$850",
    mt5Login:     FAKE_MT5.login,
    allRewardAmounts: ["$500", "$600", "$700", "$750", "$850"],
    totalCumulatedUsd: 3400,
    endDate:      "27 août 2026",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Parcours terminé",     "subject contient 'Parcours terminé'");
  assertContains(html,    "Terminé",              "contient statut 'Terminé'");
  assertContains(html,    "REWARDS PAYÉS",        "contient section REWARDS PAYÉS");
  assertContains(html,    "Reward #1",            "contient 'Reward #1'");
  assertContains(html,    "Reward #5",            "contient 'Reward #5'");
  assertContains(html,    "$500",                 "contient montant Reward #1");
  assertContains(html,    "3",                    "contient total cumulé $3400");
  assertContains(html,    "Parcours Terminé",     "contient 'Parcours Terminé'");
  assertNotContains(html, "Trader Reward #6",     "ne contient PAS de niveau #6");
}

section("buildRewardProgressionEmail — Reward #5 → Parcours terminé (sans allRewards)");
{
  const { subject, html } = buildRewardProgressionEmail({
    firstName:    "Alex",
    accountSize:  "$50,000",
    rewardPaid:   5,
    rewardAmount: "$850",
    siteUrl,
    logoUrl,
  });
  assertContains(subject, "Parcours terminé",   "subject contient 'Parcours terminé'");
  assertContains(html,    "Reward #5 payé",     "contient 'Reward #5 payé'");
  assertContains(html,    "$850",               "contient montant");
  assertNotContains(html, "Trader Reward #6",   "ne contient PAS de niveau #6");
}

// ── 10. buildRewardCertificateEmail ──────────────────────────

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
  assertContains(html,    "Trader Reward #3", "contient 'Trader Reward #3'");
  assertContains(html,    "$700",             "contient montant $700");
}

// ── 11. buildChallengeCertificateEmail ───────────────────────

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
  assertContains(subject, "Votre Compte Challenger est validé", "subject correct");
  assertContains(html,    "CHALLENGER VALIDÉ",                  "contient 'CHALLENGER VALIDÉ'");
  assertContains(html,    "Compte Reward",                      "contient 'Compte Reward'");
  assertNotContains(html, "Phase 1",                            "ne contient PAS 'Phase 1'");
  assertNotContains(html, "Phase 2",                            "ne contient PAS 'Phase 2'");
}

// ── 12. Vocabulaire interdit — tous les emails ────────────────

section("Vocabulaire interdit — scan global");
{
  const allEmails = [
    buildWelcomeEmail({ accountSize: "$50,000", model: "rewards-50k", mt5: FAKE_MT5, siteUrl, logoUrl }),
    buildChallengerValidatedEmail({ accountSize: "$50,000", mt5Login: FAKE_MT5.login, siteUrl, logoUrl }),
    buildChallengerExpiredEmail({ accountSize: "$50,000", mt5Login: FAKE_MT5.login, siteUrl, logoUrl }),
    buildPhase2Email({ accountSize: "$50,000", mt5: FAKE_MT5, siteUrl, logoUrl }),
    buildFailedEmail({ accountSize: "$50,000", reason: "total_drawdown", siteUrl, logoUrl }),
    buildFailedEmail({ accountSize: "$50,000", reason: "total_drawdown", phase: "funded", siteUrl, logoUrl }),
    buildFundedEmail({ accountSize: "$50,000", mt5: FAKE_MT5, splitPct: 100, siteUrl, logoUrl }),
    buildDailyUpdateEmail({ accountSize: "$50,000", phase: "challenger", balance: 52000, profitPct: 4.0, tradingDays: 5, siteUrl, logoUrl }),
    buildDailyUpdateEmail({ accountSize: "$50,000", phase: "funded", balance: 52000, profitPct: 2.1, tradingDays: 8, siteUrl, logoUrl }),
    buildChallengeCertificateEmail({ firstName, lastName, accountSize: "$50,000", date: "27 août 2026", siteUrl, logoUrl }),
    buildRewardCertificateEmail({ firstName, lastName, accountSize: "$50,000", grossAmount: 600, rewardLevel: 2, date: "27 août 2026", splitPct: 100, siteUrl, logoUrl }),
    buildRewardProgressionEmail({ firstName, accountSize: "$50,000", rewardPaid: 1, rewardAmount: "$500", siteUrl, logoUrl }),
    buildRewardProgressionEmail({ firstName, accountSize: "$50,000", rewardPaid: 5, rewardAmount: "$850", allRewardAmounts: ["$500","$600","$700","$750","$850"], totalCumulatedUsd: 3400, siteUrl, logoUrl }),
    buildApologyEmail({ firstName, accountSize: "$50,000", phase: "funded", mt5: FAKE_MT5, siteUrl, logoUrl }),
  ];

  for (const forbidden of FORBIDDEN) {
    let found    = false;
    let foundIn  = "";
    for (const { subject, html } of allEmails) {
      if (html.includes(forbidden) || subject.includes(forbidden)) {
        found   = true;
        foundIn = subject.slice(0, 60);
        break;
      }
    }
    if (!found) {
      console.log(`  ✓ "${forbidden}" absent de tous les emails`);
      pass++;
    } else {
      console.error(`  ✗ Mot interdit "${forbidden}" trouvé dans : ${foundIn}`);
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
