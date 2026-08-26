"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  Gauge,
  History,
  KeyRound,
  LifeBuoy,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import type { CockpitTrade } from "./CockpitChart";
import CockpitTools, { type TradingSection } from "./CockpitTools";
import styles from "./TraderCockpit.module.css";
import { extractContractRules } from "@/lib/contract-rules";
import { getSyncFreshness } from "@/lib/sync-freshness";
import { QUAL_DAY_USD, REWARD_AMOUNTS } from "@/lib/rewardsData";
import { getTraderV1Level } from "@/lib/v1-engine";

export type CockpitSubTab = "cockpit" | "trading";

export type CockpitTab = "challenges" | "payouts" | "rules" | "history" | "support" | "kyc";

export type CockpitChallenge = {
  id: string;
  account_size: string;
  model: string;
  phase: string;
  status: string;
  balance: number;
  start_balance: number;
  profit_target: number;
  daily_drawdown_limit: number;
  total_drawdown_limit: number;
  trading_days: number;
  mt5_login?: number;
  mt5_password?: string;
  mt5_password_investor?: string;
  mt5_server?: string;
  last_synced_at?: string;
  highest_balance?: number;
  best_day_profit?: number;
  daily_low_equity?: number;
  daily_start_balance?: number;
  breach_equity?: number;
  breach_reason?: string;
  breach_value?: number;
  breach_at?: string;
  open_positions?: Record<string, unknown>[];
  positions_synced_at?: string;
  rules_snapshot?: unknown;
};

type Props = {
  challenge: CockpitChallenge;
  activeChallenges: CockpitChallenge[];
  tradeHistory: Record<string, unknown>[];
  tradeHistoryLoading: boolean;
  isFr: boolean;
  isMobile: boolean;
  kycStatus: string;
  approvedRewardsCount: number;
  onSelectChallenge: (challenge: CockpitChallenge) => void;
  onNavigate: (tab: CockpitTab) => void;
  onRefresh?: () => void;
};

const BLUE  = "#9CCFEA";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED   = "#ef4444";

function numeric(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function money(value: number, decimals = 0): string {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function tradeDate(trade: Record<string, unknown>): Date | null {
  const raw = trade.close_time ?? trade.time_close ?? trade.closed_at ?? trade.time ?? trade.open_time ?? trade.created_at;
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" || !Number.isNaN(Number(raw))) {
    const number = Number(raw);
    const date = new Date(number > 10_000_000_000 ? number : number * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(String(raw));
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseTrades(history: Record<string, unknown>[]): CockpitTrade[] {
  return history
    .map((trade, index) => {
      const profit = numeric(trade.profit) + numeric(trade.swap) + numeric(trade.commission) + numeric(trade.fee);
      const rawType = trade.type ?? trade.action;
      const actionIsBuy = rawType === 0 || String(rawType ?? "").toLowerCase().includes("buy");
      const isExitDeal = Number(trade.entry) === 1;
      const positionIsBuy = isExitDeal ? !actionIsBuy : actionIsBuy;
      const rawVolume = numeric(trade.volume ?? trade.lots);
      return {
        id: String(trade.ticket ?? trade.deal ?? trade.id ?? index),
        symbol: String(trade.symbol ?? "—"),
        side: positionIsBuy ? "BUY" as const : "SELL" as const,
        volume: rawVolume > 100 ? rawVolume / 10_000 : rawVolume,
        profit,
        date: tradeDate(trade),
      };
    })
    .filter((trade, index) => {
      const entry = history[index]?.entry;
      const isClosingDeal = entry == null || Number(entry) === 1 || Number(entry) === 2;
      return isClosingDeal && Math.abs(trade.profit) > 0.00001;
    })
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0));
}

function phaseLabel(phase: string, approvedRewardsCount: number): string {
  if (phase === "phase1") return "CHALLENGER";
  if (phase === "phase2") return "CHALLENGER · LEGACY";
  if (phase === "funded") return approvedRewardsCount > 0 ? "TRADER REWARD" : "REWARD START";
  return phase;
}

function SectionTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className={styles.sectionTitle}>
      <div className={styles.sectionIcon}>{icon}</div>
      <div>
        <div className={styles.sectionHeading}>{title}</div>
        {subtitle && <div className={styles.sectionSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

function Meter({ value, color = BLUE }: { value: number; color?: string }) {
  return <div className={styles.meter}><div className={styles.meterFill} style={{ width: `${clamp(value)}%`, background: color }} /></div>;
}

// ── Objective Block V2 ────────────────────────────────────────────────────────

type ObjectiveBlockProps = {
  phase: string;
  startBalance: number;
  targetBalance: number;
  effectiveBalance: number;
  profit: number;
  profitRemaining: number;
  profitProgress: number;
  tradingDays: number;
  minDays: number;
  daysRemaining: number;
  levelLabel: string;
  isFr: boolean;
};

function ObjectiveBlock({
  phase,
  startBalance,
  targetBalance,
  profit,
  profitRemaining,
  profitProgress,
  tradingDays,
  minDays,
  daysRemaining,
  levelLabel,
  isFr,
}: ObjectiveBlockProps) {
  const isFunded = phase === "funded";

  return (
    <div className={`${styles.card} ${styles.objectiveBlock}`}>
      {/* Eyebrow */}
      <div className={styles.objectiveEyebrow}>
        {isFunded
          ? `${levelLabel} · SEUIL +4%`
          : phase === "phase1"
            ? "CHALLENGER · OBJECTIF +6%"
            : phase === "phase2"
              ? (isFr ? "CHALLENGER · OBJECTIF" : "CHALLENGER · TARGET")
              : (isFr ? "Objectif — Challenge" : "Objective — Challenge")}
      </div>

      {(
        <div className={styles.objectiveBody}>
          {/* Start → Target endpoints */}
          <div className={styles.objectiveEndpoints}>
            <span className={styles.objectiveStart}>{money(startBalance)}</span>
            <span className={styles.objectiveArrow}>→</span>
            <span className={styles.objectiveTarget}>{money(targetBalance)}</span>
          </div>

          {/* Progress bar */}
          <div className={styles.objectiveBarWrap}>
            <div className={styles.objectiveBarTrack}>
              <div
                className={styles.objectiveBarFill}
                style={{ width: `${profitProgress}%` }}
              />
            </div>
            <span className={styles.objectivePercent}>{profitProgress.toFixed(0)}%</span>
          </div>

          {/* Amounts */}
          <div className={styles.objectiveAmounts}>
            <div className={styles.objectiveAmount}>
              <div className={styles.objectiveAmountLabel}>{isFr ? "Réalisé" : "Achieved"}</div>
              <div
                className={styles.objectiveAmountValue}
                style={{ color: profit >= 0 ? GREEN : RED }}
              >
                {profit >= 0 ? "+" : ""}{money(profit)}
              </div>
            </div>
            <div className={styles.objectiveAmountSep} />
            <div className={styles.objectiveAmount} style={{ textAlign: "right" }}>
              <div className={styles.objectiveAmountLabel}>{isFr ? "Encore nécessaire" : "Still needed"}</div>
              <div className={styles.objectiveAmountValue}>
                {profitRemaining > 0 ? money(profitRemaining) : <span style={{ color: GREEN }}>✓ {isFr ? "Atteint" : "Reached"}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Days row */}
      {minDays > 0 && <div className={styles.objectiveDaysRow}>
        <div className={styles.objectiveDaysLeft}>
          <span className={styles.objectiveDaysCount}>{tradingDays}</span>
          <span className={styles.objectiveDaysSep}> / </span>
          <span className={styles.objectiveDaysMin}>{minDays}</span>
          <span className={styles.objectiveDaysLabel}>
            {" "}{isFr ? "jours minimum tradés" : "minimum days traded"}
          </span>
        </div>
        {daysRemaining > 0 ? (
          <span className={styles.objectiveDaysBadge}>
            {daysRemaining} {isFr
              ? `jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}`
              : `day${daysRemaining > 1 ? "s" : ""} left`}
          </span>
        ) : (
          <span className={styles.objectiveDaysDone}>
            ✓ {isFr ? "Condition validée" : "Requirement met"}
          </span>
        )}
      </div>}
    </div>
  );
}

// ── Tools Placeholder ─────────────────────────────────────────────────────────

function ToolsPlaceholder({ isFr, isMobile }: { isFr: boolean; isMobile: boolean }) {
  const tools = [
    {
      icon: <TrendingUp size={26} color={BLUE} />,
      title: isFr ? "Risque / Rendement" : "Risk / Reward",
      desc: isFr
        ? "Calcule ton ratio R:R, la perte et le gain potentiels avant d'entrer en position."
        : "Calculate your R:R ratio, potential loss and gain before entering a trade.",
    },
    {
      icon: <Target size={26} color={BLUE} />,
      title: isFr ? "Calculateur de lot" : "Lot Calculator",
      desc: isFr
        ? "Détermine la taille de position optimale en fonction de ton capital et de ton risque défini."
        : "Find the optimal position size based on your capital and defined risk percentage.",
    },
    {
      icon: <ShieldCheck size={26} color={BLUE} />,
      title: isFr ? "Simulateur de risque" : "Risk Simulator",
      desc: isFr
        ? "Simule l'impact d'un stop-loss sur ton drawdown journalier et total avant de passer le trade."
        : "Simulate a stop-loss impact on your daily and total drawdown before placing the trade.",
    },
  ];

  return (
    <div className={styles.toolsPlaceholder}>
      <div className={styles.toolsHeader}>
        <div className={styles.toolsEyebrow}>Traders Rewards</div>
        <h2 className={styles.toolsTitle}>{isFr ? "Outils Trader" : "Trader Tools"}</h2>
        <p className={styles.toolsSub}>
          {isFr
            ? "Des outils concrets pour mieux gérer ton risque et réussir ton challenge."
            : "Concrete tools to better manage your risk and succeed in your challenge."}
        </p>
      </div>

      <div
        className={styles.toolsGrid}
        style={{ gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)" }}
      >
        {tools.map((tool, i) => (
          <div key={i} className={`${styles.card} ${styles.toolCard}`}>
            <div className={styles.toolIcon}>{tool.icon}</div>
            <div className={styles.toolName}>{tool.title}</div>
            <div className={styles.toolDesc}>{tool.desc}</div>
            <div className={styles.toolSoon}>
              {isFr ? "Bientôt disponible" : "Coming soon"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TraderCockpit({
  challenge,
  activeChallenges,
  tradeHistory,
  tradeHistoryLoading,
  isFr,
  isMobile,
  kycStatus,
  approvedRewardsCount,
  onSelectChallenge,
  onNavigate,
  onRefresh,
}: Props) {
  const [subTab, setSubTab]                   = useState<CockpitSubTab>("cockpit");
  const [tradingSection, setTradingSection]   = useState<TradingSection>("prepare");
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied]                   = useState("");
  const [planChecks, setPlanChecks]           = useState<boolean[]>([false, false, false, false, false, false, false, false, false]);
  const [journalNote, setJournalNote]         = useState("");
  const [loadedPlanKey, setLoadedPlanKey]   = useState("");

  // ── Contract rules ──────────────────────────────────────────────────────────
  const contractRules = useMemo(
    () =>
      extractContractRules(challenge.rules_snapshot, {
        phase:                challenge.phase,
        model:                challenge.model,
        daily_drawdown_limit: challenge.daily_drawdown_limit,
        total_drawdown_limit: challenge.total_drawdown_limit,
        profit_target:        challenge.profit_target,
        trading_days:         challenge.trading_days,
      }),
    [challenge],
  );

  // ── Sync freshness ──────────────────────────────────────────────────────────
  const freshness = useMemo(
    () => getSyncFreshness(challenge.last_synced_at),
    [challenge.last_synced_at],
  );

  // ── Core computations (formulas unchanged) ──────────────────────────────────
  const trades = useMemo(() => parseTrades(tradeHistory), [tradeHistory]);
  const positions = Array.isArray(challenge.open_positions) ? challenge.open_positions : [];
  const floatingPnl = positions.reduce((sum, position) => sum + numeric(position.profit) + numeric(position.swap), 0);
  const effectiveBalance = challenge.status === "failed" && challenge.breach_equity != null ? challenge.breach_equity : challenge.balance;
  const equity = effectiveBalance + floatingPnl;
  const profit = effectiveBalance - challenge.start_balance;
  const accountSize = numeric(String(challenge.account_size).replace(/[^0-9.]/g, "")) * (String(challenge.account_size).toUpperCase().includes("K") ? 1000 : 1);
  const isLegacyPhaseTwo = challenge.phase === "phase2";
  const isRewardAccount = challenge.phase === "funded";
  // Niveau V1 dérivé depuis la source canonique (payouts.status="paid")
  const traderLevel = getTraderV1Level(challenge.phase, approvedRewardsCount);
  const isTraderReward = traderLevel.level === 3;
  const levelLabel = phaseLabel(challenge.phase, approvedRewardsCount);
  const sizeIndex = accountSize >= 100_000 ? 2 : accountSize >= 50_000 ? 1 : 0;
  const qualifyingDayUsd = QUAL_DAY_USD[sizeIndex];
  // nextRewardNumber=null quand parcours terminé (≥5 Rewards) → fallback 5 pour l'affichage
  const currentRewardNumber = traderLevel.nextRewardNumber ?? 5;
  const currentRewardCap = REWARD_AMOUNTS[sizeIndex][currentRewardNumber - 1];
  const displayProfitTargetPct = challenge.phase === "funded" ? 4 : isLegacyPhaseTwo ? challenge.profit_target : 6;
  const displayDrawdownPct = accountSize >= 100_000 ? 3 : 4;
  const profitTargetUsd = challenge.start_balance * displayProfitTargetPct / 100;
  const targetBalance = challenge.start_balance + profitTargetUsd;
  const profitRemaining = Math.max(0, targetBalance - effectiveBalance);
  const profitProgress = profitTargetUsd > 0 ? clamp(profit / profitTargetUsd * 100) : 100;

  // minDays from contract rules (snapshot → fallback)
  // Apex EOD : Challenge V1 = 0 jours minimum (was 2)
  const minDays = isRewardAccount ? (isTraderReward ? 0 : 5) : isLegacyPhaseTwo ? contractRules.minTradingDays : 0;

  const daysRemaining = Math.max(0, minDays - challenge.trading_days);
  const dailyReferenceBalance = challenge.daily_start_balance ?? challenge.start_balance;
  const dailyLimitUsd = dailyReferenceBalance * challenge.daily_drawdown_limit / 100;
  const dailyFloor = dailyReferenceBalance - dailyLimitUsd;
  const dailyBuffer = Math.max(0, equity - dailyFloor);
  const dailyRiskUsed = clamp((1 - dailyBuffer / Math.max(dailyLimitUsd, 1)) * 100);
  const isOneStep = challenge.model.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  const trailingReference = isOneStep ? Math.max(challenge.highest_balance ?? challenge.start_balance, challenge.start_balance) : challenge.start_balance;
  const totalLimitUsd = challenge.start_balance * displayDrawdownPct / 100;
  const trailingFloor = trailingReference - totalLimitUsd;
  const totalFloor = isTraderReward
    ? challenge.start_balance
    : isRewardAccount
      ? Math.min(trailingFloor, challenge.start_balance)
      : trailingFloor;
  const totalBuffer = Math.max(0, equity - totalFloor);
  const totalRiskUsed = clamp((1 - totalBuffer / Math.max(totalLimitUsd, 1)) * 100);
  // Le nouveau modèle n'a pas de Daily Drawdown séparé. Les anciennes valeurs
  // restent calculées pour la rétrocompatibilité, mais le cockpit pilote la santé
  // du compte uniquement depuis le Trailing Drawdown EOD.
  const maxRiskUsed = totalRiskUsed;

  const health = challenge.status === "failed"
    ? { label: isFr ? "Compte arrêté" : "Account stopped", color: RED, icon: <AlertTriangle size={15} /> }
    : maxRiskUsed >= 85
      ? { label: isFr ? "Risque critique" : "Critical risk", color: RED, icon: <AlertTriangle size={15} /> }
      : maxRiskUsed >= 60
        ? { label: isFr ? "Vigilance" : "Caution", color: AMBER, icon: <Gauge size={15} /> }
        : { label: isFr ? "Compte sain" : "Healthy account", color: GREEN, icon: <ShieldCheck size={15} /> };

  const stats = useMemo(() => {
    const wins = trades.filter(trade => trade.profit > 0);
    const losses = trades.filter(trade => trade.profit < 0);
    const grossProfit = wins.reduce((sum, trade) => sum + trade.profit, 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + trade.profit, 0));
    const bySymbol = new Map<string, number>();
    for (const trade of trades) bySymbol.set(trade.symbol, (bySymbol.get(trade.symbol) ?? 0) + trade.profit);
    const bestSymbol = [...bySymbol.entries()].sort((a, b) => b[1] - a[1])[0];
    return {
      count: trades.length,
      winRate: trades.length ? wins.length / trades.length * 100 : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
      averageWin: wins.length ? grossProfit / wins.length : 0,
      averageLoss: losses.length ? grossLoss / losses.length : 0,
      expectancy: trades.length ? (grossProfit - grossLoss) / trades.length : 0,
      bestSymbol,
    };
  }, [trades]);

  const calendarDays = useMemo(() => {
    const pnlByDay = new Map<string, number>();
    for (const trade of trades) {
      if (!trade.date) continue;
      const key = `${trade.date.getFullYear()}-${trade.date.getMonth()}-${trade.date.getDate()}`;
      pnlByDay.set(key, (pnlByDay.get(key) ?? 0) + trade.profit);
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1, 12);
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
    return Array.from({ length: cells }, (_, index) => {
      const date = new Date(year, month, 1 - mondayOffset + index, 12);
      return {
        date,
        isCurrentMonth: date.getMonth() === month,
        pnl: pnlByDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ?? 0,
      };
    });
  }, [trades]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const planKey = `traders-rewards-plan:${challenge.id}:${todayKey}`;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(planKey);
        if (stored) {
          const parsed = JSON.parse(stored) as { checks?: boolean[]; note?: string };
          // Pad to 9 — preserve old values (index 0-2), fill missing with false
          const old = Array.isArray(parsed.checks) ? parsed.checks : [];
          setPlanChecks(Array.from({ length: 9 }, (_, i) => Boolean(old[i])));
          setJournalNote(parsed.note ?? "");
        } else {
          setPlanChecks([false, false, false, false, false, false, false, false, false]);
          setJournalNote("");
        }
      } catch {
        setPlanChecks([false, false, false, false, false, false, false, false, false]);
        setJournalNote("");
      }
      setLoadedPlanKey(planKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [planKey]);

  useEffect(() => {
    if (loadedPlanKey === planKey) localStorage.setItem(planKey, JSON.stringify({ checks: planChecks, note: journalNote }));
  }, [loadedPlanKey, planKey, planChecks, journalNote]);

  const nextAction = (() => {
    if (challenge.status === "failed") return { icon: <History size={22} />, title: isFr ? "Analyse ce qui s'est passé" : "Review what happened", text: isFr ? "Identifie le moment exact où la limite a été atteinte avant de repartir." : "Identify exactly where the limit was reached before restarting.", action: () => onNavigate("history"), label: isFr ? "Voir le bilan" : "View review", color: RED };
    if (!challenge.mt5_login) return { icon: <Clock3 size={22} />, title: isFr ? "Ton compte est en préparation" : "Your account is being prepared", text: isFr ? "Tes identifiants apparaîtront automatiquement. Tu peux déjà installer MT5 et relire les règles." : "Credentials will appear automatically. You can already install MT5 and review the rules.", action: () => onNavigate("rules"), label: isFr ? "Préparer mon départ" : "Get ready", color: BLUE };
    if (challenge.phase === "funded") return { icon: <Wallet size={22} />, title: daysRemaining > 0 ? (isFr ? "Construis une performance régulière" : "Build consistent performance") : (isFr ? "Ta récompense se prépare ici" : "Your reward starts here"), text: daysRemaining > 0 ? (isFr ? `Encore ${daysRemaining} jour(s) avant l'éligibilité. Priorité à la régularité.` : `${daysRemaining} more day(s) before eligibility. Focus on consistency.`) : (isFr ? "Vérifie ton KYC puis contrôle ton éligibilité dans Récompenses." : "Check KYC, then review eligibility in Rewards."), action: () => onNavigate(kycStatus === "approved" ? "payouts" : "kyc"), label: kycStatus === "approved" ? (isFr ? "Mes récompenses" : "My rewards") : (isFr ? "Vérifier mon KYC" : "Check KYC"), color: GREEN };
    if (profitRemaining <= 0 && daysRemaining > 0) return { icon: <Trophy size={22} />, title: isFr ? "Objectif atteint — protège le résultat" : "Target reached — protect the result", text: isFr ? `Il reste ${daysRemaining} jour(s) minimum. La priorité est maintenant la discipline.` : `${daysRemaining} minimum day(s) remain. Discipline is now the priority.`, action: () => onNavigate("rules"), label: isFr ? "Revoir mes limites" : "Review limits", color: GREEN };
    return { icon: <Sparkles size={22} />, title: isFr ? "Ton cap du jour" : "Today's focus", text: isFr ? `${money(profitRemaining)} restent pour l'objectif. Ta marge avant le plancher EOD est ${money(totalBuffer)}.` : `${money(profitRemaining)} remains to target. Your EOD floor buffer is ${money(totalBuffer)}.`, action: () => { setSubTab("trading"); setTradingSection("prepare"); }, label: isFr ? "Préparer ma session" : "Prepare session", color: BLUE };
  })();

  const phaseSteps = ["CHALLENGER", "REWARD START", "TRADER REWARD"];
  const phaseIndex = traderLevel.level - 1;  // 1→0 / 2→1 / 3→2

  const copyValue = async (label: string, value: string) => {
    if (!value || value === "—") return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  };

  const riskColor = (used: number) => used >= 85 ? RED : used >= 60 ? AMBER : BLUE;

  return (
    <div className={styles.root} data-mobile={isMobile ? "true" : "false"}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>{isFr ? "Cockpit de progression" : "Progress cockpit"}</div>
          <h1 className={styles.title}>{isFr ? "Prêt pour ta prochaine étape ?" : "Ready for your next step?"}</h1>
          <div className={styles.accountRow}>
            {activeChallenges.length > 1 ? (
              <select className={styles.accountSelect} value={challenge.id} onChange={event => {
                const selected = activeChallenges.find(item => item.id === event.target.value);
                if (selected) onSelectChallenge(selected);
              }}>
                {activeChallenges.map(item => <option key={item.id} value={item.id}>{item.account_size} · {phaseLabel(item.phase, 0)}</option>)}
              </select>
            ) : <span className={styles.pill} style={{ color: BLUE, background: "rgba(156,207,234,.1)" }}>{challenge.account_size} · {phaseLabel(challenge.phase, approvedRewardsCount)}</span>}
            <span className={styles.pill} style={{ color: BLUE, background: "rgba(156,207,234,.08)" }}><Target size={13} />{phaseLabel(challenge.phase, approvedRewardsCount)}</span>
            <span className={styles.pill} style={{ color: health.color, background: `${health.color}16` }}>{health.icon}{health.label}</span>
            {/* Freshness indicator — color-coded, never reveals infrastructure */}
            <span
              className={styles.muted}
              style={{ fontSize: 10, display: "inline-flex", gap: 5, alignItems: "center", color: freshness.color }}
            >
              <Activity size={11} />
              {isFr ? freshness.labelFr : freshness.label}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.button} onClick={() => onRefresh ? onRefresh() : window.location.reload()}><RefreshCw size={14} />{isFr ? "Actualiser" : "Refresh"}</button>
          <Link href="/#pricing" className="dash-trader-btn">
            <span className="dash-trader-shine" aria-hidden="true" />
            <span className="dash-trader-label">+ {isFr ? "Nouveau challenge" : "New challenge"}</span>
          </Link>
        </div>
      </header>

      {/* ── Sub-tab navigation ── */}
      <div className={styles.subTabNav}>
        <button
          className={`${styles.subTabBtn} ${subTab === "cockpit" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("cockpit")}
        >
          Cockpit
        </button>
        <button
          className={`${styles.subTabBtn} ${subTab === "trading" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("trading")}
        >
          Trading
        </button>
        <button
          className={styles.accountIdBadge}
          onClick={() => {
            setSubTab("cockpit");
            window.setTimeout(() => document.getElementById("account-credentials")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
          }}
        >
          <KeyRound size={11} />
          {isFr ? "ID COMPTE" : "ACCOUNT ID"}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          COCKPIT TAB
      ══════════════════════════════════════════════════════════════ */}
      {subTab === "cockpit" && (
        <>
          {/* Coach bar */}
          <div className={styles.coach} style={{ borderColor: `${nextAction.color}45`, background: `linear-gradient(90deg,${nextAction.color}18,transparent)` }}>
            <div className={styles.coachIcon} style={{ color: nextAction.color, background: `${nextAction.color}18` }}>{nextAction.icon}</div>
            <div className={styles.coachCopy}><div className={styles.coachTitle}>{nextAction.title}</div><div className={styles.coachText}>{nextAction.text}</div></div>
            <button className={styles.button} onClick={nextAction.action}>{nextAction.label}<ArrowRight size={14} /></button>
          </div>

          {/* KPI cards */}
          <div className={styles.kpis}>

            {/* Equity — label switches to "Dernière valeur connue" when stale */}
            <div className={`${styles.card} ${styles.kpi}`}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>
                  {freshness.isStale
                    ? (isFr ? "Dernière valeur connue" : "Last known value")
                    : (isFr ? "Equity actuelle" : "Current equity")}
                </span>
                <Activity color={freshness.isStale ? AMBER : BLUE} size={17} />
              </div>
              <div>
                <div className={styles.kpiValue}>{money(equity)}</div>
                <div className={styles.kpiMeta}>
                  <span style={{ color: profit >= 0 ? GREEN : RED }}>{profit >= 0 ? "+" : ""}{money(profit)} ({profit >= 0 ? "+" : ""}{(profit / challenge.start_balance * 100).toFixed(2)}%)</span>
                  <span>{floatingPnl ? `${isFr ? "Flottant" : "Floating"} ${money(floatingPnl, 2)}` : isFr ? "Aucune exposition" : "No exposure"}</span>
                </div>
              </div>
            </div>

            {/* Objective remaining */}
            <div className={`${styles.card} ${styles.kpi}`}>
              <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isTraderReward ? (isFr ? "Seuil +4% restant" : "+4% threshold left") : `${isFr ? "Objectif" : "Target"} +${displayProfitTargetPct.toFixed(0)}% ${isFr ? "restant" : "left"}`}</span><Target color={BLUE} size={17} /></div>
              <div>
                <div className={styles.kpiValue}>{money(profitRemaining)}</div>
                <div className={styles.kpiMeta}>
                  <span>{profitProgress.toFixed(0)}% {isFr ? "accompli" : "complete"}</span>
                  <span>{money(targetBalance)}</span>
                </div>
                <Meter value={profitProgress} color={GREEN} />
              </div>
            </div>

            {/* Trailing Drawdown EOD — unique limite de risque V1 */}
            <div className={`${styles.card} ${styles.kpi}`}>
              <div className={styles.kpiTop}><span className={styles.kpiLabel}>TRAILING DD EOD</span><ShieldCheck color={BLUE} size={17} /></div>
              <div>
                <div className={styles.kpiValue} style={{ color: totalRiskUsed >= 60 ? riskColor(totalRiskUsed) : "#fff" }}>{money(totalBuffer)}</div>
                <div className={styles.kpiMeta}>
                  <span>{totalRiskUsed.toFixed(0)}% {isFr ? "utilisé" : "used"}</span>
                  <span>{isFr ? "Plancher" : "Floor"} {money(totalFloor)}</span>
                </div>
                <Meter value={totalRiskUsed} color={riskColor(totalRiskUsed)} />
              </div>
            </div>

            {/* Règle de consistance */}
            <div className={`${styles.card} ${styles.kpi} ${styles.kpiRule}`}>
              <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isFr ? "Consistance" : "Consistency"}</span><Gauge color={BLUE} size={16} /></div>
              <div><div className={styles.kpiValue}>≤ {isRewardAccount ? 33 : 50}%</div><div className={styles.kpiMeta}><span>{isFr ? "Meilleure journée" : "Best day"}</span><span>{isFr ? "du profit total" : "of total profit"}</span></div></div>
            </div>

            {/* Condition de jours, adaptée au niveau */}
            <div className={`${styles.card} ${styles.kpi} ${styles.kpiRule}`}>
              <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isTraderReward ? `REWARD #${currentRewardNumber}` : isRewardAccount ? (isFr ? "Jours qualifiants" : "Qualifying days") : (isFr ? "Jours minimum" : "Minimum days")}</span><CalendarDays color={BLUE} size={16} /></div>
              <div>
                <div className={styles.kpiValue}>{isTraderReward ? money(currentRewardCap) : isRewardAccount ? "5 MIN" : `${challenge.trading_days}${minDays > 0 ? ` / ${minDays}` : ""}`}</div>
                <div className={styles.kpiMeta}><span>{isTraderReward ? (isFr ? "Plafond maximum" : "Maximum cap") : isRewardAccount ? `${money(qualifyingDayUsd)} ${isFr ? "minimum / jour" : "minimum / day"}` : isFr ? "Jours tradés" : "Days traded"}</span></div>
              </div>
            </div>

            {/* Durée contractuelle */}
            <div className={`${styles.card} ${styles.kpi} ${styles.kpiRule}`}>
              <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isFr ? "Durée" : "Duration"}</span><Clock3 color={BLUE} size={16} /></div>
              <div><div className={styles.kpiValue}>{isRewardAccount ? (isFr ? "ILLIMITÉE" : "UNLIMITED") : "30 J."}</div><div className={styles.kpiMeta}><span>{isRewardAccount ? (isFr ? "Aucune limite" : "No time limit") : isFr ? "Jours calendaires max" : "Maximum calendar days"}</span></div></div>
            </div>

          </div>

          {/* Journey stepper */}
          <div className={`${styles.card} ${styles.journey}`}>
            <div className={styles.journeyHead}><strong className={styles.journeyTitle}>{isFr ? "Ton parcours" : "Your journey"}</strong><span>{isTraderReward ? (traderLevel.terminated ? (isFr ? "PARCOURS COMPLÉTÉ ✓" : "JOURNEY COMPLETE ✓") : `REWARD #${currentRewardNumber} / #5`) : `${challenge.trading_days}/${minDays} ${isFr ? "jours validés" : "days complete"}`}</span></div>
            <div className={styles.steps} style={{ gridTemplateColumns: `repeat(${phaseSteps.length},minmax(120px,1fr))` }}>
              {phaseSteps.map((step, index) => <div key={step} className={`${styles.step} ${index < phaseIndex ? styles.stepDone : index === phaseIndex ? styles.stepActive : ""}`}><span className={styles.stepDot}>{index < phaseIndex ? <Check size={12} /> : index + 1}</span><span className={styles.stepText}>{step}</span></div>)}
            </div>
          </div>

          <div className={`${styles.card} ${styles.performanceBand}`}>
            <div className={styles.performanceBandTitle}>
              <BarChart3 size={19} />
              <div><span>{isFr ? "ANALYSE" : "ANALYSIS"}</span><strong>{isFr ? "SIGNATURE DE PERFORMANCE" : "PERFORMANCE SIGNATURE"}</strong><small>{tradeHistoryLoading ? (isFr ? "Analyse en cours…" : "Analyzing…") : `${stats.count} ${isFr ? "trades clôturés" : "closed trades"}`}</small></div>
            </div>
            <div className={styles.performanceStats}>{[
                { label: isFr ? "Taux de réussite" : "Win rate", value: `${stats.winRate.toFixed(0)}%`, note: isFr ? "Trades gagnants" : "Winning trades" },
                { label: "Profit factor", value: Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞", note: isFr ? "Gains / pertes" : "Wins / losses" },
                { label: isFr ? "Espérance" : "Expectancy", value: money(stats.expectancy, 2), note: isFr ? "Par trade" : "Per trade" },
                { label: isFr ? "Gain moyen" : "Average win", value: money(stats.averageWin), note: isFr ? "Trade gagnant" : "Winning trade" },
                { label: isFr ? "Perte moyenne" : "Average loss", value: money(stats.averageLoss), note: isFr ? "Trade perdant" : "Losing trade" },
                { label: isFr ? "Meilleur symbole" : "Best symbol", value: stats.bestSymbol?.[0] ?? "—", note: stats.bestSymbol ? money(stats.bestSymbol[1]) : (isFr ? "Pas assez de données" : "Not enough data") },
              ].map(item => <div key={item.label} className={styles.stat}><div className={styles.statLabel}>{item.label}</div><div className={styles.statValue}>{item.value}</div><div className={styles.statNote}>{item.note}</div></div>)}</div>
          </div>

          <div className={`${styles.card} ${styles.panel} ${styles.monthCalendar}`}>
            <SectionTitle icon={<CalendarDays size={17} />} title={`${isFr ? "Calendrier P&L" : "P&L calendar"} · ${new Date().toLocaleDateString(isFr ? "fr-FR" : "en-GB", { month: "long", year: "numeric" }).toUpperCase()}`} subtitle={isFr ? "Le mois complet, journée par journée" : "The complete month, day by day"} />
            <div className={styles.calendar}>{calendarDays.map(({ date, pnl, isCurrentMonth }) => <div key={date.toISOString()} className={`${styles.day} ${!isCurrentMonth ? styles.dayOutside : ""}`} style={pnl > 0 ? { background: "rgba(34,197,94,.08)", borderColor: "rgba(34,197,94,.18)" } : pnl < 0 ? { background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.18)" } : undefined}><div className={styles.dayName}>{date.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { weekday: "short" })}</div><div className={styles.dayNumber}>{date.getDate()}</div><div className={styles.dayPnl} style={{ color: pnl > 0 ? GREEN : pnl < 0 ? RED : "rgba(255,255,255,.25)" }}>{pnl ? `${pnl > 0 ? "+" : ""}${money(pnl)}` : "—"}</div></div>)}</div>
          </div>

          <div className={styles.twoGrid}>
            <div className={`${styles.card} ${styles.panel}`}>
              <SectionTitle icon={<TrendingUp size={17} />} title={isFr ? "Positions ouvertes" : "Open positions"} subtitle={`${positions.length} ${isFr ? "position(s) · P&L flottant" : "position(s) · floating P&L"} ${money(floatingPnl, 2)}`} />
              {positions.length === 0 ? <Empty icon={<Activity size={20} />} text={isFr ? "Aucune position ouverte. Ton exposition est actuellement nulle." : "No open positions. Your current exposure is zero."} /> : <div className={styles.positions}>{positions.slice(0, 6).map((position, index) => {
                const side = position.type === 0 || String(position.type).toLowerCase().includes("buy") ? "BUY" : "SELL";
                const pnl = numeric(position.profit) + numeric(position.swap);
                const rawVolume = numeric(position.volume);
                const volume = rawVolume > 100 ? rawVolume / 10_000 : rawVolume;
                return <div className={styles.position} key={String(position.ticket ?? index)}><div><b>{String(position.symbol ?? "—")}</b><span style={{ marginLeft: 7, color: side === "BUY" ? GREEN : RED, fontSize: 9, fontWeight: 850 }}>{side}</span></div><span>{volume.toFixed(2)} lot</span><span className={styles.muted}>{String(position.open_price ?? position.price_open ?? "—")}</span><strong style={{ color: pnl >= 0 ? GREEN : RED, textAlign: "right" }}>{pnl >= 0 ? "+" : ""}{money(pnl, 2)}</strong></div>;
              })}</div>}
            </div>
            <div className={`${styles.card} ${styles.panel}`}>
              <SectionTitle icon={<History size={17} />} title={isFr ? "Derniers trades" : "Recent trades"} subtitle={isFr ? "Lecture rapide de ta session" : "Quick session review"} />
              {trades.length === 0 ? <Empty icon={<CircleDollarSign size={20} />} text={isFr ? "Les trades clôturés apparaîtront ici automatiquement." : "Closed trades will appear here automatically."} /> : <div>{[...trades].reverse().slice(0, 5).map(trade => <div className={styles.trade} key={trade.id}><span><b>{trade.symbol}</b><small style={{ color: trade.side === "BUY" ? GREEN : RED, marginLeft: 6 }}>{trade.side}</small></span><span className={styles.muted}>{trade.date?.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "2-digit", month: "short" }) ?? "—"}</span><strong style={{ color: trade.profit >= 0 ? GREEN : RED, textAlign: "right" }}>{trade.profit >= 0 ? "+" : ""}{money(trade.profit, 2)}</strong></div>)}<button className={styles.button} style={{ width: "100%", marginTop: 9 }} onClick={() => onNavigate("history")}>{isFr ? "Ouvrir tout l'historique" : "Open full history"}<ArrowRight size={14} /></button></div>}
            </div>
          </div>

          <div id="account-credentials" className={`${styles.card} ${styles.panel} ${styles.credentialsAnchor}`}>
            <SectionTitle icon={<Zap size={17} />} title={isFr ? "Accès rapide" : "Quick access"} subtitle={challenge.mt5_login ? (isFr ? "Tes accès restent masqués par défaut" : "Credentials stay hidden by default") : (isFr ? "Disponible dès la création du compte" : "Available once the account is created")} />
            {challenge.mt5_login ? <>
              <div className={styles.credentials}>{[
                { label: "Login", value: String(challenge.mt5_login), secret: false },
                { label: isFr ? "Mot de passe" : "Password", value: (challenge.model === "vip" ? challenge.mt5_password_investor : challenge.mt5_password) ?? "—", secret: true },
                { label: isFr ? "Serveur" : "Server", value: challenge.mt5_server ?? "—", secret: false },
                { label: isFr ? "Plateforme" : "Platform", value: "MetaTrader 5", secret: false },
              ].map(item => <div className={styles.credential} key={item.label} onClick={() => item.secret && !showCredentials ? setShowCredentials(true) : copyValue(item.label, item.value)}><div className={styles.credentialLabel}>{item.label} {copied === item.label ? <span style={{ color: GREEN }}>✓ {isFr ? "copié" : "copied"}</span> : <Copy size={9} style={{ marginLeft: 4 }} />}</div><div className={styles.credentialValue}>{item.secret && !showCredentials ? "••••••••••" : item.value}</div></div>)}</div>
              <div className={styles.quickActions}><button className={styles.button} onClick={() => setShowCredentials(value => !value)}>{showCredentials ? <EyeOff size={14} /> : <Eye size={14} />}{showCredentials ? (isFr ? "Masquer" : "Hide") : (isFr ? "Révéler" : "Reveal")}</button><button className={styles.button} onClick={() => onNavigate("rules")}><BookOpen size={14} />{isFr ? "Règles" : "Rules"}</button><button className={styles.button} onClick={() => onNavigate("support")}><LifeBuoy size={14} />Support</button></div>
            </> : <Empty icon={<Clock3 size={20} />} text={isFr ? "Le compte est en cours de configuration. Les identifiants apparaîtront ici automatiquement." : "The account is being configured. Credentials will appear here automatically."} />}
            <div className={styles.platformBlock}>
              <div className={styles.platformHeading}>
                <Image className={styles.platformLogo} src="/MT5.png" alt="MetaTrader 5" width={40} height={40} />
                <div><strong>{isFr ? "Télécharger les plateformes MT5" : "Download MT5 platforms"}</strong><span>{isFr ? "Installe MT5 puis connecte-toi avec les accès affichés ci-dessus." : "Install MT5, then sign in with the credentials shown above."}</span></div>
              </div>
              <div className={styles.platformGrid}>{[
                { label: "Windows", icon: "🖥️", href: "https://download.mql5.com/cdn/web/xylo.markets.ltd/mt5/xylomarkets5setup.exe" },
                { label: "Mac", icon: "🍎", href: "https://apps.apple.com/us/app/metatrader-5/id413251709" },
                { label: "iPhone / iPad", icon: "📱", href: "https://apps.apple.com/us/app/metatrader-5/id413251709" },
                { label: "Android", icon: "🤖", href: "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5&hl=fr" },
              ].map(platform => <a className={styles.platformButton} href={platform.href} key={platform.label} target="_blank" rel="noopener noreferrer"><span>{platform.icon}</span><b>{platform.label}</b><Download size={13} /></a>)}</div>
            </div>
          </div>

        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          TRADING TAB
      ══════════════════════════════════════════════════════════════ */}
      {subTab === "trading" && (
        <CockpitTools
          challenge={challenge}
          isFr={isFr}
          isMobile={isMobile}
          section={tradingSection}
          onSection={setTradingSection}
          planChecks={planChecks}
          setPlanChecks={setPlanChecks}
          journalNote={journalNote}
          setJournalNote={setJournalNote}
        />
      )}

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className={styles.empty}>{icon}{text}</div>;
}
