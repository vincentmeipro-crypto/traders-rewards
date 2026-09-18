"use client";

/**
 * PreviewClient — Rendu du cockpit avec des données fictives
 *
 * Usage :
 *   ?previewStage=reward      → TRADER REWARD (50K, 1 reward payée)
 *   ?previewStage=challenger  → CHALLENGER    (25K, aucune reward)
 *   (défaut = reward)
 *
 * Ne touche pas Supabase, ne modifie pas les données réelles.
 */

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import TraderCockpit, { type CockpitChallenge } from "../TraderCockpit";

// ── Fixtures ────────────────────────────────────────────────────────────────

const BASE_CHALLENGE = {
  id: "preview-mock-id",
  model: "v1",
  status: "funded",
  profit_target: 9,
  daily_drawdown_limit: 4,
  total_drawdown_limit: 4,
  trading_days: 0,
  dd_model: "trailing_eod_lock",
  open_positions: [] as Record<string, unknown>[],
};

/**
 * TRADER REWARD — 50K — Test §32
 * 1 reward payée → CAS B : plancher FIXE = $50 000
 * equity $51 000 → DD restant $1 000
 * reward actuelle #2 / cap $750
 * jours qualifiants : 0/5 (tradeHistory vide)
 * consistance : 0%
 */
const MOCK_TRADER_REWARD: CockpitChallenge = {
  ...BASE_CHALLENGE,
  account_size: "50K",
  phase: "funded",
  balance: 51_000,
  start_balance: 50_000,
  highest_eod: 51_000,   // trailing floor = 51000 - 2000 = 49000 < 50000 → MAIS CAS B (1 paid) → FIXE
  best_day_profit: 0,
  trading_days: 0,
};

/**
 * CHALLENGER — 25K
 * phase "challenge", 0 reward, 1 jour tradé
 */
const MOCK_CHALLENGER: CockpitChallenge = {
  ...BASE_CHALLENGE,
  account_size: "25K",
  phase: "challenge",
  status: "active",
  balance: 25_500,
  start_balance: 25_000,
  highest_eod: 25_500,
  best_day_profit: 500,
  trading_days: 1,
  daily_drawdown_limit: 4,
  total_drawdown_limit: 4,
};

// ── Composant interne (lit useSearchParams) ──────────────────────────────────

function PreviewInner() {
  const params = useSearchParams();
  const stage = params.get("previewStage") ?? "reward";
  const isReward = stage !== "challenger";

  const challenge   = isReward ? MOCK_TRADER_REWARD : MOCK_CHALLENGER;
  const paidRewardsCount = isReward ? 1 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "inherit" }}>

      {/* ── Bandeau DEV ─────────────────────────────────────────────────────── */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 9999,
        background: "#7c3aed",
        color: "#fff",
        padding: "8px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.5px",
      }}>
        <span>
          🧪 MODE PREVIEW — DEV UNIQUEMENT — aucune donnée réelle
        </span>
        <span style={{ display: "flex", gap: 12 }}>
          <a
            href="/dashboard/preview?previewStage=reward"
            style={{
              color: isReward ? "#fff" : "rgba(255,255,255,0.5)",
              textDecoration: isReward ? "underline" : "none",
              fontWeight: isReward ? 900 : 500,
            }}
          >
            TRADER REWARD
          </a>
          <a
            href="/dashboard/preview?previewStage=challenger"
            style={{
              color: !isReward ? "#fff" : "rgba(255,255,255,0.5)",
              textDecoration: !isReward ? "underline" : "none",
              fontWeight: !isReward ? 900 : 500,
            }}
          >
            CHALLENGER
          </a>
        </span>
      </div>

      {/* ── Cockpit avec données fictives ───────────────────────────────────── */}
      <div style={{ padding: "24px 0" }}>
        <TraderCockpit
          challenge={challenge}
          activeChallenges={[challenge]}
          tradeHistory={[]}
          tradeHistoryLoading={false}
          isFr={true}
          isEs={false}
          isMobile={false}
          kycStatus="approved"
          paidRewardsCount={paidRewardsCount}
          paidRewardsLastAt={null}
          onSelectChallenge={() => {}}
          onNavigate={() => {}}
          onRefresh={() => {}}
        />
      </div>
    </div>
  );
}

// Suspense requis par Next.js pour useSearchParams dans un client component
export default function PreviewClient() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
        Chargement de la preview…
      </div>
    }>
      <PreviewInner />
    </Suspense>
  );
}
