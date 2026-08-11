"use client";

import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import type { RewardReviewData } from "@/lib/reward-review";
import styles from "./RewardReviewPanel.module.css";

function money(value: number): string {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export default function RewardReviewPanel({ data }: { data?: RewardReviewData }) {
  if (!data) return <div className={styles.loading}>Dossier Reward en attente de synchronisation.</div>;

  const freshness = data.syncedAt ? Math.max(0, (new Date(data.generatedAt).getTime() - new Date(data.syncedAt).getTime()) / 60_000) : Infinity;
  const checks = [
    { label: "Données MT5 récentes", ok: freshness <= 15, unknown: !data.syncedAt, detail: data.syncedAt ? `${Math.round(freshness)} min` : "Jamais synchronisé" },
    { label: "KYC validé", ok: data.account.kycStatus === "approved", unknown: false, detail: data.account.kycStatus === "approved" ? "Approuvé" : "À vérifier" },
    { label: "Jours minimum", ok: data.account.tradingDays >= 5, unknown: false, detail: `${data.account.tradingDays} / 5` },
    { label: "Limites respectées", ok: data.account.status !== "failed" && data.account.dailyUsed < data.account.dailyLimit && data.account.totalUsed < data.account.totalLimit, unknown: false, detail: `${data.account.dailyUsed.toFixed(2)}% J · ${data.account.totalUsed.toFixed(2)}% max` },
    { label: "Premier SL traçable", ok: data.risk.initialSlCoverage === 100, unknown: data.risk.initialSlCoverage == null, detail: data.risk.initialSlCoverage == null ? "Collecte à démarrer" : `${data.risk.initialSlCoverage.toFixed(0)}% couvert` },
    { label: "Aucune position ouverte", ok: data.account.openPositions === 0, unknown: false, detail: `${data.account.openPositions} ouverte(s)` },
  ];
  const metrics = [
    { label: "Win rate", value: data.performance.trades ? `${data.performance.winRate.toFixed(0)}%` : "—", note: `${data.performance.trades} trades` },
    { label: "Profit factor", value: data.performance.profitFactorInfinite ? "∞" : (data.performance.profitFactor?.toFixed(2) ?? "—"), note: "Gains / pertes" },
    { label: "P&L analysé", value: money(data.performance.totalPnl), note: `${data.account.profitPercent >= 0 ? "+" : ""}${data.account.profitPercent.toFixed(2)}% compte` },
    { label: "Espérance", value: money(data.performance.expectancy), note: "Par trade" },
    { label: "Risque initial max", value: data.risk.maxRiskPercent == null ? "—" : `${data.risk.maxRiskPercent.toFixed(2)}%`, note: data.risk.maxRiskAmount == null ? "Valeur tick requise" : money(data.risk.maxRiskAmount) },
    { label: "SL initial", value: data.risk.capturedTrades ? `${data.risk.withInitialSl}/${data.risk.capturedTrades}` : "—", note: data.risk.openedWithoutSl ? `${data.risk.openedWithoutSl} ouverte(s) sans SL` : "Couverture capturée" },
  ];

  return <section className={styles.panel}>
    <div className={styles.header}><div><div className={styles.eyebrow}>Contrôle avant paiement</div><h3><ShieldCheck size={17} />Dossier de validation Reward</h3><p>Performance, limites, positions et premier Stop Loss observé réunis pour ce compte.</p></div></div>
    <div className={styles.checks}>{checks.map(check => <div className={styles.check} key={check.label}><span className={check.unknown ? styles.unknown : check.ok ? styles.ok : styles.bad}>{check.unknown ? "?" : check.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}</span><div><strong>{check.label}</strong><small>{check.detail}</small></div></div>)}</div>
    <div className={styles.metrics}>{metrics.map(metric => <div className={styles.metric} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.note}</small></div>)}</div>
    <div className={styles.riskHeader}><div><strong>Risque par trade au premier SL</strong><span>Premier SL observé par le snapshot MT5 minute — la valeur monétaire exige la valeur de tick du bridge.</span></div><span className={styles.capture}>{data.captureMode === "snapshots" ? "Historique actif" : data.captureMode === "current_positions" ? "Positions actuelles" : "En attente"}</span></div>
    {data.risk.rows.length === 0 ? <div className={styles.empty}>Aucune position capturée pour ce compte.</div> : <div className={styles.table}>
      <div className={styles.tableHead}><span>Trade</span><span>Volume</span><span>Entrée</span><span>1er SL</span><span>Risque initial</span><span>État</span></div>
      {data.risk.rows.slice(0, 12).map(row => <div className={styles.row} key={row.ticket}><span><b>{row.symbol}</b><small>{row.side} · #{row.ticket}</small></span><span>{row.volume.toFixed(2)}</span><span>{row.entryPrice || "—"}</span><span className={row.initialStopLoss == null ? styles.dangerText : ""}>{row.initialStopLoss ?? "Sans SL"}</span><span className={row.initialRiskPercent != null && row.initialRiskPercent >= 1 ? styles.dangerText : ""}>{row.initialRiskPercent == null ? "Non calculable" : `${row.initialRiskPercent.toFixed(2)}% · ${money(row.initialRiskAmount ?? 0)}`}</span><span className={row.status === "open" ? styles.open : styles.closed}>{row.status === "open" ? "Ouverte" : "Clôturée"}</span></div>)}</div>}
  </section>;
}
