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
import { getTraderV1Level, getV1DdPctByBalance, V1_REWARD_QUAL } from "@/lib/v1-engine";
import {
  isV1Challenge,
  getV1DdUsd,
  getV1SafetyNetUsd,
  V1_CHALLENGE_MIN_DAYS,
} from "@/lib/v1-display";

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
  // V1 Apex EOD fields
  dd_model?: string;
  highest_eod?: number;
  terminated_at?: string;
};

type Props = {
  challenge: CockpitChallenge;
  activeChallenges: CockpitChallenge[];
  tradeHistory: Record<string, unknown>[];
  tradeHistoryLoading: boolean;
  isFr: boolean;
  isEs?: boolean;
  isMobile: boolean;
  kycStatus: string;
  approvedRewardsCount: number;
  onSelectChallenge: (challenge: CockpitChallenge) => void;
  onNavigate: (tab: CockpitTab) => void;
  onRefresh?: () => void;
};

const BLUE  = "rgba(255,255,255,0.65)";
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

function phaseLabel(phase: string, approvedRewardsCount: number, isFr = false, isEs = false): string {
  const CL = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  if (phase === "phase1") return "CHALLENGER";
  if (phase === "phase2") return "CHALLENGER";
  if (phase === "funded") return approvedRewardsCount > 0 ? "TRADER REWARD" : CL("COMPTE REWARD", "CUENTA REWARD", "REWARD ACCOUNT");
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
  isEs?: boolean;
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
  isEs = false,
}: ObjectiveBlockProps) {
  const OB = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
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
              ? OB("CHALLENGER · OBJECTIF", "CHALLENGER · OBJETIVO", "CHALLENGER · TARGET")
              : OB("Objectif — Challenge", "Objetivo — Challenge", "Objective — Challenge")}
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
              <div className={styles.objectiveAmountLabel}>{OB("Réalisé", "Logrado", "Achieved")}</div>
              <div
                className={styles.objectiveAmountValue}
                style={{ color: profit >= 0 ? GREEN : RED }}
              >
                {profit >= 0 ? "+" : ""}{money(profit)}
              </div>
            </div>
            <div className={styles.objectiveAmountSep} />
            <div className={styles.objectiveAmount} style={{ textAlign: "right" }}>
              <div className={styles.objectiveAmountLabel}>{OB("Encore nécessaire", "Aún necesario", "Still needed")}</div>
              <div className={styles.objectiveAmountValue}>
                {profitRemaining > 0 ? money(profitRemaining) : <span style={{ color: GREEN }}>✓ {OB("Atteint", "Alcanzado", "Reached")}</span>}
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
            {" "}{OB("jours minimum tradés", "días mínimos operados", "minimum days traded")}
          </span>
        </div>
        {daysRemaining > 0 ? (
          <span className={styles.objectiveDaysBadge}>
            {daysRemaining} {OB(
              `jour${daysRemaining > 1 ? "s" : ""} restant${daysRemaining > 1 ? "s" : ""}`,
              `día${daysRemaining > 1 ? "s" : ""} restante${daysRemaining > 1 ? "s" : ""}`,
              `day${daysRemaining > 1 ? "s" : ""} left`
            )}
          </span>
        ) : (
          <span className={styles.objectiveDaysDone}>
            ✓ {OB("Condition validée", "Condición cumplida", "Requirement met")}
          </span>
        )}
      </div>}
    </div>
  );
}

// ── Tools Placeholder ─────────────────────────────────────────────────────────

function ToolsPlaceholder({ isFr, isEs = false, isMobile }: { isFr: boolean; isEs?: boolean; isMobile: boolean }) {
  const TP = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const tools = [
    {
      icon: <TrendingUp size={26} color={BLUE} />,
      title: TP("Risque / Rendement", "Riesgo / Rendimiento", "Risk / Reward"),
      desc: TP(
        "Calcule ton ratio R:R, la perte et le gain potentiels avant d'entrer en position.",
        "Calcula tu ratio R:R, la pérdida y ganancia potenciales antes de entrar en posición.",
        "Calculate your R:R ratio, potential loss and gain before entering a trade.",
      ),
    },
    {
      icon: <Target size={26} color={BLUE} />,
      title: TP("Calculateur de lot", "Calculadora de lote", "Lot Calculator"),
      desc: TP(
        "Détermine la taille de position optimale en fonction de ton capital et de ton risque défini.",
        "Determina el tamaño de posición óptimo en función de tu capital y riesgo definido.",
        "Find the optimal position size based on your capital and defined risk percentage.",
      ),
    },
    {
      icon: <ShieldCheck size={26} color={BLUE} />,
      title: TP("Simulateur de risque", "Simulador de riesgo", "Risk Simulator"),
      desc: TP(
        "Simule l'impact d'un stop-loss sur ton drawdown journalier et total avant de passer le trade.",
        "Simula el impacto de un stop-loss en tu drawdown diario y total antes de operar.",
        "Simulate a stop-loss impact on your daily and total drawdown before placing the trade.",
      ),
    },
  ];

  return (
    <div className={styles.toolsPlaceholder}>
      <div className={styles.toolsHeader}>
        <div className={styles.toolsEyebrow}>Traders Rewards</div>
        <h2 className={styles.toolsTitle}>{TP("Outils Trader", "Herramientas Trader", "Trader Tools")}</h2>
        <p className={styles.toolsSub}>
          {TP(
            "Des outils concrets pour mieux gérer ton risque et réussir ton challenge.",
            "Herramientas concretas para gestionar mejor tu riesgo y superar tu challenge.",
            "Concrete tools to better manage your risk and succeed in your challenge.",
          )}
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
              {TP("Bientôt disponible", "Próximamente", "Coming soon")}
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
  isEs = false,
  isMobile,
  kycStatus,
  approvedRewardsCount,
  onSelectChallenge,
  onNavigate,
  onRefresh,
}: Props) {
  const C = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
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
  const isTwoStepPhase2 = challenge.phase === "phase2";
  const isRewardAccount = challenge.phase === "funded";
  // Modèle V1 Apex EOD — détection robuste (dd_model OU rules_snapshot OU slug)
  const isV1 = isV1Challenge(challenge);
  // Niveau V1 dérivé depuis la source canonique (payouts.status="paid")
  const traderLevel = getTraderV1Level(challenge.phase, approvedRewardsCount);
  const isTraderReward = traderLevel.level === 3;
  const levelLabel = phaseLabel(challenge.phase, approvedRewardsCount, isFr, isEs);
  const sizeIndex = accountSize >= 100_000 ? 2 : accountSize >= 50_000 ? 1 : 0;
  const qualifyingDayUsd = QUAL_DAY_USD[sizeIndex];
  // nextRewardNumber=null quand parcours terminé (≥5 Rewards) → fallback 5 pour l'affichage
  const currentRewardNumber = traderLevel.nextRewardNumber ?? 5;
  const currentRewardCap = REWARD_AMOUNTS[sizeIndex][currentRewardNumber - 1];
  // N1 uniquement : objectif +6% (jamais utilisé comme "profit target" au N2/N3)
  const displayProfitTargetPct = isTwoStepPhase2 ? challenge.profit_target : 6;
  // DD% — source canonique via helper (4% pour 25K/50K, 3% pour 100K)
  const displayDrawdownPct = getV1DdPctByBalance(challenge.start_balance);
  // N1 : cible de validation
  const profitTargetUsd = challenge.start_balance * displayProfitTargetPct / 100;
  const targetBalance   = challenge.start_balance + profitTargetUsd;  // N1 uniquement
  // N2 / N3 : plancher fixe = capital initial + 4% (ex. 50K → $52 000)
  const floorBalance    = challenge.start_balance * (1 + V1_REWARD_QUAL.profitTargetPct / 100);
  // Restant objectif N1 / 0 pour N2 et N3 (pas d'objectif profit)
  const profitRemaining = isRewardAccount ? 0 : Math.max(0, targetBalance - effectiveBalance);
  const profitProgress  = !isRewardAccount && profitTargetUsd > 0 ? clamp(profit / profitTargetUsd * 100) : 100;

  // minDays : N2/N3 = 5 jours qualifiants / N1 V1 = 2 jours minimum
  const minDays = isRewardAccount ? 5 : isV1 ? V1_CHALLENGE_MIN_DAYS : isTwoStepPhase2 ? contractRules.minTradingDays : 0;

  // Jours qualifiants réels (N2/N3) : profit journalier >= seuil qualifiant par taille de compte
  const qualifyingDaysCount = useMemo(() => {
    if (!isRewardAccount) return 0;
    const pnlByDay = new Map<string, number>();
    for (const trade of trades) {
      if (!trade.date) continue;
      const key = `${trade.date.getFullYear()}-${trade.date.getMonth()}-${trade.date.getDate()}`;
      pnlByDay.set(key, (pnlByDay.get(key) ?? 0) + trade.profit);
    }
    return [...pnlByDay.values()].filter(pnl => pnl >= qualifyingDayUsd).length;
  }, [trades, qualifyingDayUsd, isRewardAccount]);

  // daysRemaining : N2/N3 = jours qualifiants manquants / N1 = jours tradés manquants
  const daysRemaining = isRewardAccount
    ? Math.max(0, 5 - qualifyingDaysCount)
    : Math.max(0, minDays - challenge.trading_days);
  const dailyReferenceBalance = challenge.daily_start_balance ?? challenge.start_balance;
  const dailyLimitUsd = dailyReferenceBalance * challenge.daily_drawdown_limit / 100;
  const dailyFloor = dailyReferenceBalance - dailyLimitUsd;
  const dailyBuffer = Math.max(0, equity - dailyFloor);
  const dailyRiskUsed = clamp((1 - dailyBuffer / Math.max(dailyLimitUsd, 1)) * 100);
  const isOneStep = challenge.model.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  // V1 : floor = highest_eod - DD$ (ou start si Safety Net atteinte)
  // 2-Step : floor = highest_balance * (1 - ddPct/100)
  const v1DdUsd        = isV1 ? getV1DdUsd(challenge.start_balance) : 0;
  const v1SafetyNet    = isV1 ? getV1SafetyNetUsd(challenge.start_balance) : 0;
  const v1HighestEod   = challenge.highest_eod ?? challenge.start_balance;
  const v1TrailingFloor = isV1
    ? (isRewardAccount && v1HighestEod >= v1SafetyNet
        ? challenge.start_balance                        // Safety Net atteinte → floor = capital initial
        : v1HighestEod - v1DdUsd)                        // Trailing : highest_eod - DD$
    : 0;
  const trailingReference = isOneStep ? Math.max(challenge.highest_balance ?? challenge.start_balance, challenge.start_balance) : challenge.start_balance;
  const totalLimitUsd = challenge.start_balance * displayDrawdownPct / 100;
  const trailingFloor = trailingReference - totalLimitUsd;
  const totalFloor = isV1
    ? v1TrailingFloor                                    // V1 : floor Apex EOD exact
    : isTraderReward
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
    ? { label: C("Compte arrêté", "Cuenta detenida", "Account stopped"), color: RED, icon: <AlertTriangle size={15} /> }
    : maxRiskUsed >= 85
      ? { label: C("Risque critique", "Riesgo crítico", "Critical risk"), color: RED, icon: <AlertTriangle size={15} /> }
      : maxRiskUsed >= 60
        ? { label: C("Vigilance", "Precaución", "Caution"), color: AMBER, icon: <Gauge size={15} /> }
        : { label: C("Compte sain", "Cuenta saludable", "Healthy account"), color: GREEN, icon: <ShieldCheck size={15} /> };

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
    if (challenge.status === "failed") return { icon: <History size={22} />, title: C("Analyse ce qui s'est passé", "Analiza lo que pasó", "Review what happened"), text: C("Identifie le moment exact où la limite a été atteinte avant de repartir.", "Identifica exactamente dónde se alcanzó el límite antes de reiniciar.", "Identify exactly where the limit was reached before restarting."), action: () => onNavigate("history"), label: C("Voir le bilan", "Ver el análisis", "View review"), color: RED };
    if (!challenge.mt5_login) return { icon: <Clock3 size={22} />, title: C("Ton compte est en préparation", "Tu cuenta está siendo preparada", "Your account is being prepared"), text: C("Tes identifiants apparaîtront automatiquement. Tu peux déjà installer MT5 et relire les règles.", "Tus credenciales aparecerán automáticamente. Ya puedes instalar MT5 y consultar las reglas.", "Credentials will appear automatically. You can already install MT5 and review the rules."), action: () => onNavigate("rules"), label: C("Préparer mon départ", "Preparar mi inicio", "Get ready"), color: BLUE };
    if (challenge.phase === "funded") return { icon: <Wallet size={22} />, title: daysRemaining > 0 ? C("Construis une performance régulière", "Construye un rendimiento consistente", "Build consistent performance") : C("Ta récompense se prépare ici", "Tu recompensa empieza aquí", "Your reward starts here"), text: daysRemaining > 0 ? C(`Encore ${daysRemaining} jour(s) avant l'éligibilité. Priorité à la régularité.`, `${daysRemaining} día(s) más antes de la elegibilidad. Prioridad a la consistencia.`, `${daysRemaining} more day(s) before eligibility. Focus on consistency.`) : C("Vérifie ton KYC puis contrôle ton éligibilité dans Récompenses.", "Verifica tu KYC y revisa tu elegibilidad en Recompensas.", "Check KYC, then review eligibility in Rewards."), action: () => onNavigate(kycStatus === "approved" ? "payouts" : "kyc"), label: kycStatus === "approved" ? C("Mes récompenses", "Mis recompensas", "My rewards") : C("Vérifier mon KYC", "Verificar mi KYC", "Check KYC"), color: GREEN };
    if (profitRemaining <= 0 && daysRemaining > 0) return { icon: <Trophy size={22} />, title: C("Objectif atteint — protège le résultat", "Objetivo alcanzado — protege el resultado", "Target reached — protect the result"), text: C(`Il reste ${daysRemaining} jour(s) minimum. La priorité est maintenant la discipline.`, `Quedan ${daysRemaining} día(s) mínimo. La prioridad ahora es la disciplina.`, `${daysRemaining} minimum day(s) remain. Discipline is now the priority.`), action: () => onNavigate("rules"), label: C("Revoir mes limites", "Revisar mis límites", "Review limits"), color: GREEN };
    return { icon: <Sparkles size={22} />, title: C("Ton cap du jour", "Tu objetivo del día", "Today's focus"), text: C(`${money(profitRemaining)} restent pour l'objectif. Ta marge avant le plancher EOD est ${money(totalBuffer)}.`, `${money(profitRemaining)} quedan para el objetivo. Tu margen antes del suelo EOD es ${money(totalBuffer)}.`, `${money(profitRemaining)} remains to target. Your EOD floor buffer is ${money(totalBuffer)}.`), action: () => { setSubTab("trading"); setTradingSection("prepare"); }, label: C("Préparer ma session", "Preparar mi sesión", "Prepare session"), color: BLUE };
  })();

  const phaseSteps = ["CHALLENGER", C("COMPTE REWARD", "CUENTA REWARD", "REWARD ACCOUNT"), "TRADER REWARD"];
  const phaseIndex = traderLevel.level - 1;  // 1→0 / 2→1 / 3→2

  const copyValue = async (label: string, value: string) => {
    if (!value || value === "—") return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  };

  const riskColor = (used: number) => used >= 85 ? RED : used >= 60 ? AMBER : GREEN;

  return (
    <div className={styles.root} data-mobile={isMobile ? "true" : "false"}>

      {/* ── Header ── */}
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow} style={{ color: "rgba(212,168,67,0.75)", letterSpacing: "2px" }}>{C("Cockpit de progression", "Cabina de progreso", "Progress cockpit")}</div>
          <h1 className={styles.title}>{C("Prêt pour ta prochaine étape ?", "¿Listo para el siguiente paso?", "Ready for your next step?")}</h1>
          <div className={styles.accountRow}>
            {activeChallenges.length > 1 ? (
              <select className={styles.accountSelect} value={challenge.id} onChange={event => {
                const selected = activeChallenges.find(item => item.id === event.target.value);
                if (selected) onSelectChallenge(selected);
              }}>
                {activeChallenges.map(item => <option key={item.id} value={item.id}>{item.account_size} · {phaseLabel(item.phase, 0, isFr, isEs)}</option>)}
              </select>
            ) : <span className={styles.pill} style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.07)" }}>{challenge.account_size} · {phaseLabel(challenge.phase, approvedRewardsCount, isFr, isEs)}</span>}
            <span className={styles.pill} style={{ color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.05)" }}><Target size={13} />{phaseLabel(challenge.phase, approvedRewardsCount, isFr, isEs)}</span>
            <span className={styles.pill} style={{ color: health.color, background: `${health.color}16` }}>{health.icon}{health.label}</span>
            {/* Freshness indicator — color-coded, never reveals infrastructure */}
            <span
              className={styles.muted}
              style={{ fontSize: 10, display: "inline-flex", gap: 5, alignItems: "center", color: freshness.color }}
            >
              <Activity size={11} />
              {isFr ? freshness.labelFr : isEs ? freshness.labelEs : freshness.label}
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {/* Actualiser — secondaire dark + gris */}
          <button className={styles.button} onClick={() => onRefresh ? onRefresh() : window.location.reload()}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)" }}>
            <RefreshCw size={14} />{C("Actualiser", "Actualizar", "Refresh")}
          </button>
          {/* + Nouveau challenge — CTA dark + contour doré */}
          <Link href="/#pricing" style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 16px", borderRadius: 12,
            textDecoration: "none", fontFamily: "inherit", fontSize: 12, fontWeight: 700, letterSpacing: "0.3px",
            background: "linear-gradient(#090A0B, #090A0B) padding-box, linear-gradient(110deg, #B88746 0%, #D6AD63 35%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%) border-box",
            border: "1.5px solid transparent", color: "#FFFFFF",
          }}>
            <span style={{ color: "#D4A843", fontSize: 15, lineHeight: 1 }}>+</span>
            {C("Nouveau challenge", "Nuevo challenge", "New challenge")}
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
          {C("ID COMPTE", "ID CUENTA", "ACCOUNT ID")}
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
          <div className={`${styles.kpis} ${isTraderReward ? styles.kpisFive : ""}`}>

            {/* Equity — label switches to "Dernière valeur connue" when stale */}
            <div className={`${styles.card} ${styles.kpi}`}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>
                  {freshness.isStale
                    ? C("Dernière valeur connue", "Último valor conocido", "Last known value")
                    : C("Equity actuelle", "Capital actual", "Current equity")}
                </span>
                <Activity color={freshness.isStale ? AMBER : BLUE} size={17} />
              </div>
              <div>
                <div className={styles.kpiValue}>{money(equity)}</div>
                <div className={styles.kpiMeta}>
                  <span style={{ color: profit >= 0 ? GREEN : RED }}>{profit >= 0 ? "+" : ""}{money(profit)} ({profit >= 0 ? "+" : ""}{(profit / challenge.start_balance * 100).toFixed(2)}%)</span>
                  <span>{floatingPnl ? `${C("Flottant", "Flotante", "Floating")} ${money(floatingPnl, 2)}` : C("Aucune exposition", "Sin exposición", "No exposure")}</span>
                </div>
              </div>
            </div>

            {/* KPI 2 — N1: Objectif +6% restant / N2: Plancher EOD / N3: DD FIXE */}
            <div className={`${styles.card} ${styles.kpi}`}>
              {!isRewardAccount ? (
                /* N1 CHALLENGER : objectif restant */
                <>
                  <div className={styles.kpiTop}><span className={styles.kpiLabel}>{`${C("OBJECTIF","OBJETIVO","TARGET")} +${displayProfitTargetPct.toFixed(0)}% ${C("RESTANT","RESTANTE","LEFT")}`}</span><Target color={BLUE} size={17} /></div>
                  <div>
                    <div className={styles.kpiValue}>{money(profitRemaining)}</div>
                    <div className={styles.kpiMeta}>
                      <span>{profitProgress.toFixed(0)}% {C("accompli","completado","complete")}</span>
                      <span>{money(targetBalance)}</span>
                    </div>
                    <Meter value={profitProgress} color={GREEN} />
                  </div>
                </>
              ) : isTraderReward ? (
                /* N3 TRADER REWARD : drawdown fixe en $ */
                <>
                  <div className={styles.kpiTop}><span className={styles.kpiLabel}>{C("DD FIXE","DD FIJO","FIXED DD")}</span><ShieldCheck color={BLUE} size={17} /></div>
                  <div>
                    <div className={styles.kpiValue}>{money(v1DdUsd)}</div>
                    <div className={styles.kpiMeta}>
                      <span>{C("Drawdown fixe","Drawdown fijo","Fixed drawdown")}</span>
                      <span>{C("Non trailing","No trailing","Non-trailing")}</span>
                    </div>
                  </div>
                </>
              ) : (
                /* N2 COMPTE REWARD : plancher EOD à atteindre */
                <>
                  <div className={styles.kpiTop}><span className={styles.kpiLabel}>{C("PLANCHER EOD","SUELO EOD","EOD FLOOR")}</span><ShieldCheck color={BLUE} size={17} /></div>
                  <div>
                    <div className={styles.kpiValue}>{money(floorBalance)}</div>
                    <div className={styles.kpiMeta}>
                      <span>{C("Seuil de verrouillage","Umbral de bloqueo","Lock threshold")}</span>
                      <span>{C("Equity à atteindre","Equidad objetivo","Target equity")}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* KPI 3 — N1/N2: TRAILING DD EOD (buffer) / N3: PLANCHER FIXE */}
            <div className={`${styles.card} ${styles.kpi}`}>
              {isTraderReward ? (
                /* N3 TRADER REWARD : plancher fixe immuable */
                <>
                  <div className={styles.kpiTop}><span className={styles.kpiLabel}>{C("PLANCHER FIXE","SUELO FIJO","FIXED FLOOR")}</span><ShieldCheck color={BLUE} size={17} /></div>
                  <div>
                    <div className={styles.kpiValue}>{money(floorBalance)}</div>
                    <div className={styles.kpiMeta}>
                      <span>{C("Immuable — non trailing","Inmutable — no trailing","Immutable — non-trailing")}</span>
                      <span>{money(Math.max(0, equity - floorBalance))} {C("de marge","de margen","buffer")}</span>
                    </div>
                  </div>
                </>
              ) : (
                /* N1 & N2 : trailing DD EOD */
                <>
                  <div className={styles.kpiTop}><span className={styles.kpiLabel}>TRAILING DD EOD</span><ShieldCheck color={BLUE} size={17} /></div>
                  <div>
                    <div className={styles.kpiValue} style={{ color: totalRiskUsed >= 60 ? riskColor(totalRiskUsed) : "#fff" }}>{money(totalBuffer)}</div>
                    <div className={styles.kpiMeta}>
                      <span>{totalRiskUsed.toFixed(0)}% {C("utilisé","usado","used")}</span>
                      <span>{C("Plancher","Suelo","Floor")} {money(totalFloor)}</span>
                    </div>
                    <Meter value={totalRiskUsed} color={riskColor(totalRiskUsed)} />
                  </div>
                </>
              )}
            </div>

            {/* Règle de consistance */}
            <div className={`${styles.card} ${styles.kpi} ${styles.kpiRule}`}>
              <div className={styles.kpiTop}><span className={styles.kpiLabel}>{C("Consistance", "Consistencia", "Consistency")}</span><Gauge color={BLUE} size={16} /></div>
              <div>
                <div className={styles.kpiValue}>≤ 50%</div>
                <div className={styles.kpiMeta}>
                  <span>{C("Meilleure journée", "Mejor día", "Best day")}</span>
                  <span>{C("du profit total", "del profit total", "of total profit")}</span>
                </div>
              </div>
            </div>

            {/* KPI 5 — Jours qualifiants (N2/N3 avec compteur réel) / Jours minimum (N1) */}
            <div className={`${styles.card} ${styles.kpi} ${styles.kpiRule}`}>
              <div className={styles.kpiTop}>
                <span className={styles.kpiLabel}>
                  {isRewardAccount
                    ? C("JOURS QUALIFIANTS","DÍAS VÁLIDOS","QUALIFYING DAYS")
                    : C("JOURS MINIMUM","DÍAS MÍNIMOS","MINIMUM DAYS")}
                </span>
                <CalendarDays color={BLUE} size={16} />
              </div>
              <div>
                <div className={styles.kpiValue}>
                  {isRewardAccount
                    ? `${qualifyingDaysCount}/5`
                    : isV1
                      ? `${challenge.trading_days}/${V1_CHALLENGE_MIN_DAYS}`
                      : challenge.trading_days}
                </div>
                <div className={styles.kpiMeta}>
                  <span>
                    {isRewardAccount
                      ? `${money(qualifyingDayUsd)} ${C("min / jour","mín / día","min / day")}`
                      : isV1
                        ? C("2 jours minimum","2 días mínimos","2 days minimum")
                        : C("Jours tradés","Días operados","Days traded")}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI 6 — N1: Durée 30J / N2: Reward Max */}
            {!isTraderReward && <div className={`${styles.card} ${styles.kpi} ${styles.kpiRule}`}>
              {!isRewardAccount ? (
                /* N1 : durée max 30 jours */
                <>
                  <div className={styles.kpiTop}><span className={styles.kpiLabel}>{C("DURÉE","DURACIÓN","DURATION")}</span><Clock3 color={BLUE} size={16} /></div>
                  <div><div className={styles.kpiValue}>30 J.</div><div className={styles.kpiMeta}><span>{C("Jours calendaires max","Días calendario máx","Maximum calendar days")}</span></div></div>
                </>
              ) : (
                /* N2 : plafond Reward #1 */
                <>
                  <div className={styles.kpiTop}><span className={styles.kpiLabel}>{C("REWARD MAX","REWARD MÁX","MAX REWARD")}</span><Trophy color={BLUE} size={16} /></div>
                  <div><div className={styles.kpiValue}>{money(currentRewardCap)}</div><div className={styles.kpiMeta}><span>{C("Plafond Reward #1","Tope Reward #1","Reward #1 cap")}</span></div></div>
                </>
              )}
            </div>}

          </div>

          {/* Journey stepper */}
          <div className={`${styles.card} ${styles.journey}`}>
            <div className={styles.journeyHead}><strong className={styles.journeyTitle}>{C("Ton parcours", "Tu recorrido", "Your journey")}</strong><span>{isTraderReward ? (traderLevel.terminated ? C("PARCOURS COMPLÉTÉ ✓", "RECORRIDO COMPLETO ✓", "JOURNEY COMPLETE ✓") : `REWARD #${currentRewardNumber} / #5`) : isRewardAccount ? `${qualifyingDaysCount}/5 ${C("jours qualifiants","días válidos","qualifying days")}` : isV1 ? `${challenge.trading_days}/${V1_CHALLENGE_MIN_DAYS} ${C("jour(s) tradé(s)","día(s) operado(s)","day(s) traded")}` : `${challenge.trading_days}/${minDays} ${C("jours validés","días completados","days complete")}`}</span></div>
            <div className={styles.steps} style={{ gridTemplateColumns: `repeat(${phaseSteps.length},minmax(120px,1fr))` }}>
              {phaseSteps.map((step, index) => <div key={step} className={`${styles.step} ${index < phaseIndex ? styles.stepDone : index === phaseIndex ? styles.stepActive : ""}`}><span className={styles.stepDot}>{index < phaseIndex ? <Check size={12} /> : index + 1}</span><span className={styles.stepText}>{step}</span></div>)}
            </div>
          </div>

          <div className={`${styles.card} ${styles.performanceBand}`}>
            <div className={styles.performanceBandTitle}>
              <BarChart3 size={19} />
              <div><span>{C("ANALYSE", "ANÁLISIS", "ANALYSIS")}</span><strong>{C("SIGNATURE DE PERFORMANCE", "PERFIL DE RENDIMIENTO", "PERFORMANCE SIGNATURE")}</strong><small>{tradeHistoryLoading ? C("Analyse en cours…", "Analizando…", "Analyzing…") : `${stats.count} ${C("trades clôturés", "operaciones cerradas", "closed trades")}`}</small></div>
            </div>
            <div className={styles.performanceStats}>{[
                { label: C("Taux de réussite", "Tasa de acierto", "Win rate"), value: `${stats.winRate.toFixed(0)}%`, note: C("Trades gagnants", "Operaciones ganadoras", "Winning trades") },
                { label: C("Profit factor", "Factor de beneficio", "Profit factor"), value: Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞", note: C("Gains / pertes", "Ganancias / pérdidas", "Wins / losses") },
                { label: C("Espérance", "Expectativa", "Expectancy"), value: money(stats.expectancy, 2), note: C("Par trade", "Por operación", "Per trade") },
                { label: C("Gain moyen", "Ganancia media", "Average win"), value: money(stats.averageWin), note: C("Trade gagnant", "Operación ganadora", "Winning trade") },
                { label: C("Perte moyenne", "Pérdida media", "Average loss"), value: money(stats.averageLoss), note: C("Trade perdant", "Operación perdedora", "Losing trade") },
                { label: C("Meilleur symbole", "Mejor activo", "Best symbol"), value: stats.bestSymbol?.[0] ?? "—", note: stats.bestSymbol ? money(stats.bestSymbol[1]) : C("Pas assez de données", "Datos insuficientes", "Not enough data") },
              ].map(item => <div key={item.label} className={styles.stat}><div className={styles.statLabel}>{item.label}</div><div className={styles.statValue}>{item.value}</div><div className={styles.statNote}>{item.note}</div></div>)}</div>
          </div>

          <div className={`${styles.card} ${styles.panel} ${styles.monthCalendar}`}>
            <SectionTitle icon={<CalendarDays size={17} />} title={`${C("Calendrier P&L", "Calendario P&L", "P&L calendar")} · ${new Date().toLocaleDateString(isFr ? "fr-FR" : isEs ? "es-ES" : "en-GB", { month: "long", year: "numeric" }).toUpperCase()}`} subtitle={C("Le mois complet, journée par journée", "El mes completo, día a día", "The complete month, day by day")} />
            <div className={styles.calendar}>{calendarDays.map(({ date, pnl, isCurrentMonth }) => <div key={date.toISOString()} className={`${styles.day} ${!isCurrentMonth ? styles.dayOutside : ""}`} style={pnl > 0 ? { background: "rgba(34,197,94,.08)", borderColor: "rgba(34,197,94,.18)" } : pnl < 0 ? { background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.18)" } : undefined}><div className={styles.dayName}>{date.toLocaleDateString(isFr ? "fr-FR" : isEs ? "es-ES" : "en-GB", { weekday: "short" })}</div><div className={styles.dayNumber}>{date.getDate()}</div><div className={styles.dayPnl} style={{ color: pnl > 0 ? GREEN : pnl < 0 ? RED : "rgba(255,255,255,.25)" }}>{pnl ? `${pnl > 0 ? "+" : ""}${money(pnl)}` : "—"}</div></div>)}</div>
          </div>

          <div className={styles.twoGrid}>
            <div className={`${styles.card} ${styles.panel}`}>
              <SectionTitle icon={<TrendingUp size={17} />} title={C("Positions ouvertes", "Posiciones abiertas", "Open positions")} subtitle={`${positions.length} ${C("position(s) · P&L flottant", "posición(es) · P&L flotante", "position(s) · floating P&L")} ${money(floatingPnl, 2)}`} />
              {positions.length === 0 ? <Empty icon={<Activity size={20} />} text={C("Aucune position ouverte. Ton exposition est actuellement nulle.", "No hay posiciones abiertas. Tu exposición actual es cero.", "No open positions. Your current exposure is zero.")} /> : <div className={styles.positions}>{positions.slice(0, 6).map((position, index) => {
                const side = position.type === 0 || String(position.type).toLowerCase().includes("buy") ? "BUY" : "SELL";
                const pnl = numeric(position.profit) + numeric(position.swap);
                const rawVolume = numeric(position.volume);
                const volume = rawVolume > 100 ? rawVolume / 10_000 : rawVolume;
                return <div className={styles.position} key={String(position.ticket ?? index)}><div><b>{String(position.symbol ?? "—")}</b><span style={{ marginLeft: 7, color: side === "BUY" ? GREEN : RED, fontSize: 9, fontWeight: 850 }}>{side}</span></div><span>{volume.toFixed(2)} lot</span><span className={styles.muted}>{String(position.open_price ?? position.price_open ?? "—")}</span><strong style={{ color: pnl >= 0 ? GREEN : RED, textAlign: "right" }}>{pnl >= 0 ? "+" : ""}{money(pnl, 2)}</strong></div>;
              })}</div>}
            </div>
            <div className={`${styles.card} ${styles.panel}`}>
              <SectionTitle icon={<History size={17} />} title={C("Derniers trades", "Últimas operaciones", "Recent trades")} subtitle={C("Lecture rapide de ta session", "Revisión rápida de tu sesión", "Quick session review")} />
              {trades.length === 0 ? <Empty icon={<CircleDollarSign size={20} />} text={C("Les trades clôturés apparaîtront ici automatiquement.", "Las operaciones cerradas aparecerán aquí automáticamente.", "Closed trades will appear here automatically.")} /> : <div>{[...trades].reverse().slice(0, 5).map(trade => <div className={styles.trade} key={trade.id}><span><b>{trade.symbol}</b><small style={{ color: trade.side === "BUY" ? GREEN : RED, marginLeft: 6 }}>{trade.side}</small></span><span className={styles.muted}>{trade.date?.toLocaleDateString(isFr ? "fr-FR" : isEs ? "es-ES" : "en-GB", { day: "2-digit", month: "short" }) ?? "—"}</span><strong style={{ color: trade.profit >= 0 ? GREEN : RED, textAlign: "right" }}>{trade.profit >= 0 ? "+" : ""}{money(trade.profit, 2)}</strong></div>)}<button className={styles.button} style={{ width: "100%", marginTop: 9 }} onClick={() => onNavigate("history")}>{C("Ouvrir tout l'historique", "Ver historial completo", "Open full history")}<ArrowRight size={14} /></button></div>}
            </div>
          </div>

          <div id="account-credentials" className={`${styles.card} ${styles.panel} ${styles.credentialsAnchor}`}>
            <SectionTitle icon={<Zap size={17} />} title={C("Accès rapide", "Acceso rápido", "Quick access")} subtitle={challenge.mt5_login ? C("Tes accès restent masqués par défaut", "Tus accesos permanecen ocultos por defecto", "Credentials stay hidden by default") : C("Disponible dès la création du compte", "Disponible una vez creada la cuenta", "Available once the account is created")} />
            {challenge.mt5_login ? <>
              <div className={styles.credentials}>{[
                { label: "Login", value: String(challenge.mt5_login), secret: false },
                { label: C("Mot de passe", "Contraseña", "Password"), value: (challenge.model === "vip" ? challenge.mt5_password_investor : challenge.mt5_password) ?? "—", secret: true },
                { label: C("Serveur", "Servidor", "Server"), value: challenge.mt5_server ?? "—", secret: false },
                { label: C("Plateforme", "Plataforma", "Platform"), value: "MetaTrader 5", secret: false },
              ].map(item => <div className={styles.credential} key={item.label} onClick={() => item.secret && !showCredentials ? setShowCredentials(true) : copyValue(item.label, item.value)}><div className={styles.credentialLabel}>{item.label} {copied === item.label ? <span style={{ color: GREEN }}>✓ {C("copié", "copiado", "copied")}</span> : <Copy size={9} style={{ marginLeft: 4 }} />}</div><div className={styles.credentialValue}>{item.secret && !showCredentials ? "••••••••••" : item.value}</div></div>)}</div>
              <div className={styles.quickActions}><button className={styles.button} onClick={() => setShowCredentials(value => !value)}>{showCredentials ? <EyeOff size={14} /> : <Eye size={14} />}{showCredentials ? C("Masquer", "Ocultar", "Hide") : C("Révéler", "Revelar", "Reveal")}</button><button className={styles.button} onClick={() => onNavigate("rules")}><BookOpen size={14} />{C("Règles", "Reglas", "Rules")}</button><button className={styles.button} onClick={() => onNavigate("support")}><LifeBuoy size={14} />Support</button></div>
            </> : <Empty icon={<Clock3 size={20} />} text={C("Le compte est en cours de configuration. Les identifiants apparaîtront ici automatiquement.", "La cuenta está siendo configurada. Las credenciales aparecerán aquí automáticamente.", "The account is being configured. Credentials will appear here automatically.")} />}
            <div className={styles.platformBlock}>
              <div className={styles.platformHeading}>
                <Image className={styles.platformLogo} src="/MT5.png" alt="MetaTrader 5" width={40} height={40} />
                <div><strong>{C("Télécharger les plateformes MT5", "Descargar plataformas MT5", "Download MT5 platforms")}</strong><span>{C("Installe MT5 puis connecte-toi avec les accès affichés ci-dessus.", "Instala MT5 y conéctate con los accesos mostrados arriba.", "Install MT5, then sign in with the credentials shown above.")}</span></div>
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
          isEs={isEs}
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
