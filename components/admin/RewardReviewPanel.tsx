"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { RewardReviewData } from "@/lib/reward-review";
import {
  isV1Product,
  getV1DdUsd,
  getV1SafetyNetUsd,
  getV1RewardThresholdUsd,
  V1_QUAL_DAYS_MIN,
  V1_CHALLENGE_MIN_DAYS,
  V1_CHALLENGE_PROFIT_PCT,
  V1_REWARD_PROFIT_PCT,
} from "@/lib/v1-display";
import styles from "./RewardReviewPanel.module.css";

function money(value: number): string {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

type Props = {
  data?: RewardReviewData;
  /** true si le compte est un produit V1 Apex EOD (dd_model='trailing_eod_lock') */
  isV1?: boolean;
  /** Phase du challenge : "phase1" | "funded" */
  phase?: string;
  /** Capital initial du compte (pour calculs DD$ V1) */
  startBalance?: number;
  /** Nombre de Rewards déjà payées (pour détecter le niveau Reward) */
  paidRewardsCount?: number;
};

export default function RewardReviewPanel({
  data,
  isV1 = false,
  phase = "phase1",
  startBalance = 0,
  paidRewardsCount = 0,
}: Props) {
  if (!data) return <div className={styles.loading}>Dossier Reward en attente de synchronisation.</div>;

  const freshness = data.syncedAt
    ? Math.max(0, (new Date(data.generatedAt).getTime() - new Date(data.syncedAt).getTime()) / 60_000)
    : Infinity;

  const isV1Challenge = isV1 && phase !== "funded";
  const isV1Reward    = isV1 && phase === "funded";

  // ── Calculs V1 ───────────────────────────────────────────────────────────────
  const v1DdUsd       = isV1 && startBalance > 0 ? getV1DdUsd(startBalance) : 0;
  const v1SafetyNet   = isV1 && startBalance > 0 ? getV1SafetyNetUsd(startBalance) : 0;
  const v1FloorProxy  = startBalance > 0 ? startBalance - v1DdUsd : 0;
  // Seuil Reward courant = Safety Net + cap du prochain Reward
  const rewardLevel         = paidRewardsCount + 1;
  const v1RewardThreshold   = isV1Reward && startBalance > 0
    ? getV1RewardThresholdUsd(startBalance, rewardLevel)
    : 0;
  // Label canonique du niveau Compte Reward / Trader Reward #N
  const compteRewardLabel   = rewardLevel === 1 ? "Compte Reward" : `Trader Reward #${rewardLevel}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKS — deux ensembles selon produit (V1 strict / Legacy)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Checks communs (début) ────────────────────────────────────────────────
  const checkMt5Fresh: CheckRow = {
    label: "Données MT5 récentes",
    ok: freshness <= 15,
    unknown: !data.syncedAt,
    detail: data.syncedAt ? `${Math.round(freshness)} min` : "Jamais synchronisé",
  };
  const checkKyc: CheckRow = {
    label: "KYC validé",
    ok: data.account.kycStatus === "approved",
    unknown: false,
    detail: data.account.kycStatus === "approved" ? "Approuvé" : "À vérifier",
  };
  const checkNoPositions: CheckRow = {
    label: "Aucune position ouverte",
    ok: data.account.openPositions === 0,
    unknown: false,
    detail: `${data.account.openPositions} ouverte(s)`,
  };

  // ── Checks Legacy (inchangés) ─────────────────────────────────────────────
  const legacyLimitsOk =
    data.account.status !== "failed" &&
    data.account.dailyUsed < data.account.dailyLimit &&
    data.account.totalUsed < data.account.totalLimit;

  const legacyChecks: CheckRow[] = [
    checkMt5Fresh,
    checkKyc,
    {
      label: "Jours minimum",
      ok: data.account.tradingDays >= 5,
      unknown: false,
      detail: `${data.account.tradingDays} / 5`,
    },
    {
      label: "Limites respectées",
      ok: legacyLimitsOk,
      unknown: false,
      detail: `${data.account.dailyUsed.toFixed(2)}% J · ${data.account.totalUsed.toFixed(2)}% max`,
    },
    {
      label: "Premier SL traçable",
      ok: data.risk.initialSlCoverage === 100,
      unknown: data.risk.initialSlCoverage == null,
      detail: data.risk.initialSlCoverage == null
        ? "Collecte à démarrer"
        : `${data.risk.initialSlCoverage.toFixed(0)}% couvert`,
    },
    checkNoPositions,
  ];

  const checks = legacyChecks;

  // ═══════════════════════════════════════════════════════════════════════════
  // MÉTRIQUES — V1 supprime les métriques liées au Stop Loss
  // ═══════════════════════════════════════════════════════════════════════════

  const slMetrics = [
    {
      label: "Risque initial max",
      value: data.risk.maxRiskPercent == null ? "—" : `${data.risk.maxRiskPercent.toFixed(2)}%`,
      note: data.risk.maxRiskAmount == null ? "Valeur tick requise" : money(data.risk.maxRiskAmount),
    },
    {
      label: "SL initial",
      value: data.risk.capturedTrades ? `${data.risk.withInitialSl}/${data.risk.capturedTrades}` : "—",
      note: data.risk.openedWithoutSl ? `${data.risk.openedWithoutSl} ouverte(s) sans SL` : "Couverture capturée",
    },
  ];

  // Legacy uniquement : métriques SL
  const metrics = isV1 ? [] : slMetrics;

  // ═══════════════════════════════════════════════════════════════════════════
  // Titre et sous-titre du panneau
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Titre du panneau ─────────────────────────────────────────────────────────
  const panelTitle = isV1Challenge
    ? "Dossier Challenger"
    : isV1Reward
      ? `Dossier Validation — ${compteRewardLabel}`
      : "Dossier de validation Reward";

  const panelSub = isV1Challenge
    ? "0 jour minimum · Aucune consistance · DD EOD fixe $ · Pas de Stop Loss obligatoire."
    : isV1Reward
      ? `Qualifying days · Consistance 50% · Safety Net · Seuil ${compteRewardLabel} · DD EOD fixe $.`
      : "Performance, limites, positions et premier Stop Loss observé réunis pour ce compte.";

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>Contrôle avant paiement</div>
          <h3><ShieldCheck size={17} />{panelTitle}</h3>
          {!isV1 && <p>{panelSub}</p>}
        </div>
      </div>

      {/* Checks — V1 : 6 cartes horizontales / Legacy : liste */}
      {isV1 ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, margin: "14px 0" }}>
          {((): Array<{ label: string; ok: boolean; unknown: boolean; value: string; sub: string }> => {
            const profitTarget = isV1Challenge ? V1_CHALLENGE_PROFIT_PCT : V1_REWARD_PROFIT_PCT;
            return [
              {
                label:   "KYC validé",
                ok:      data.account.kycStatus === "approved",
                unknown: false,
                value:   data.account.kycStatus === "approved" ? "Approuvé" : "À vérifier",
                sub:     "",
              },
              {
                label:   "Objectif",
                ok:      data.account.profitPercent >= profitTarget,
                unknown: false,
                value:   `+${profitTarget}%`,
                sub:     `${data.account.profitPercent >= 0 ? "+" : ""}${data.account.profitPercent.toFixed(2)}% actuel`,
              },
              {
                label:   "DD EOD",
                ok:      data.account.status !== "failed" && data.account.equity >= v1FloorProxy,
                unknown: false,
                value:   money(v1DdUsd),
                sub:     `Floor ~${money(v1FloorProxy)}`,
              },
              {
                label:   "Consistance",
                ok:      isV1Challenge,
                unknown: isV1Reward,
                value:   isV1Challenge ? "Aucune" : "≤ 50%",
                sub:     isV1Challenge ? "Pas de règle" : "Meilleure journée",
              },
              {
                label:   "Jours tradés",
                ok:      isV1Challenge || data.account.tradingDays >= V1_QUAL_DAYS_MIN,
                unknown: false,
                value:   `${data.account.tradingDays}j`,
                sub:     isV1Challenge ? "0 minimum" : `/${V1_QUAL_DAYS_MIN} qualifiants`,
              },
              {
                label:   "Limite 30j",
                ok:      isV1Reward,
                unknown: isV1Challenge,
                value:   isV1Reward ? "Illimitée" : "30j max",
                sub:     isV1Challenge ? `${data.account.tradingDays}j tradés` : "Aucune limite",
              },
            ];
          })().map(card => {
            const iconColor = card.unknown ? "#f59e0b" : card.ok ? "#22c55e" : "#ef4444";
            const valColor  = card.unknown ? "#f59e0b" : card.ok ? "#ffffff" : "#ef4444";
            return (
              <div key={card.label} style={{
                background: "rgba(255,255,255,0.03)",
                border: `1px solid ${card.unknown ? "rgba(245,158,11,0.18)" : card.ok ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.18)"}`,
                borderRadius: 10,
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.7, color: "rgba(255,255,255,0.38)" }}>
                    {card.label}
                  </span>
                  {card.unknown
                    ? <span style={{ fontSize: 12, color: iconColor, fontWeight: 700 }}>?</span>
                    : card.ok
                      ? <CheckCircle2 size={13} color={iconColor} />
                      : <AlertTriangle size={13} color={iconColor} />
                  }
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: valColor, lineHeight: 1.1 }}>
                  {card.value}
                </div>
                {card.sub && (
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", lineHeight: 1.3 }}>
                    {card.sub}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.checks}>
          {checks.map(check => (
            <div className={styles.check} key={check.label}>
              <span className={check.unknown ? styles.unknown : check.ok ? styles.ok : styles.bad}>
                {check.unknown ? "?" : check.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              </span>
              <div>
                <strong>{check.label}</strong>
                <small>{check.detail}</small>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Métriques SL — Legacy uniquement */}
      {metrics.length > 0 && (
        <div className={styles.metrics}>
          {metrics.map(metric => (
            <div className={styles.metric} key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.note}</small>
            </div>
          ))}
        </div>
      )}

      {/* Section Stop Loss — Legacy UNIQUEMENT (non affiché pour V1) */}
      {!isV1 && (
        <>
          <div className={styles.riskHeader}>
            <div>
              <strong>Risque par trade au premier SL</strong>
              <span>Premier SL observé par le snapshot MT5 minute — la valeur monétaire exige la valeur de tick du bridge.</span>
            </div>
            <span className={styles.capture}>
              {data.captureMode === "snapshots" ? "Historique actif" : data.captureMode === "current_positions" ? "Positions actuelles" : "En attente"}
            </span>
          </div>

          {data.risk.rows.length === 0 ? (
            <div className={styles.empty}>Aucune position capturée pour ce compte.</div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Trade</span><span>Volume</span><span>Entrée</span><span>1er SL</span><span>Risque initial</span><span>État</span>
              </div>
              {data.risk.rows.slice(0, 12).map(row => (
                <div className={styles.row} key={row.ticket}>
                  <span><b>{row.symbol}</b><small>{row.side} · #{row.ticket}</small></span>
                  <span>{row.volume.toFixed(2)}</span>
                  <span>{row.entryPrice || "—"}</span>
                  <span className={row.initialStopLoss == null ? styles.dangerText : ""}>{row.initialStopLoss ?? "Sans SL"}</span>
                  <span className={row.initialRiskPercent != null && row.initialRiskPercent >= 1 ? styles.dangerText : ""}>
                    {row.initialRiskPercent == null ? "Non calculable" : `${row.initialRiskPercent.toFixed(2)}% · ${money(row.initialRiskAmount ?? 0)}`}
                  </span>
                  <span className={row.status === "open" ? styles.open : styles.closed}>
                    {row.status === "open" ? "Ouverte" : "Clôturée"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

// ── Type local ────────────────────────────────────────────────────────────────
type CheckRow = {
  label: string;
  ok: boolean;
  unknown: boolean;
  detail: string;
};
