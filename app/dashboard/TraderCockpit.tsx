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
  ClipboardCheck,
  Clock3,
  Copy,
  Download,
  Eye,
  EyeOff,
  Gauge,
  History,
  LifeBuoy,
  LineChart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import CockpitChart, { type CockpitTrade } from "./CockpitChart";
import EconomicCalendar from "./EconomicCalendar";
import styles from "./TraderCockpit.module.css";

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
};

type Props = {
  challenge: CockpitChallenge;
  activeChallenges: CockpitChallenge[];
  allChallengesCount: number;
  tradeHistory: Record<string, unknown>[];
  tradeHistoryLoading: boolean;
  isFr: boolean;
  isMobile: boolean;
  kycStatus: string;
  onSelectChallenge: (challenge: CockpitChallenge) => void;
  onNavigate: (tab: CockpitTab) => void;
};

const BLUE = "#69C5FD";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";

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
      const isBuy = rawType === 0 || String(rawType ?? "").toLowerCase().includes("buy");
      const rawVolume = numeric(trade.volume ?? trade.lots);
      return {
        id: String(trade.ticket ?? trade.deal ?? trade.id ?? index),
        symbol: String(trade.symbol ?? "—"),
        side: isBuy ? "BUY" as const : "SELL" as const,
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

function syncLabel(value: string | undefined, isFr: boolean): string {
  if (!value) return isFr ? "Synchronisation en attente" : "Waiting for sync";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return isFr ? "Synchronisé à l'instant" : "Synced just now";
  if (minutes < 60) return isFr ? `Synchronisé il y a ${minutes} min` : `Synced ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return isFr ? `Synchronisé il y a ${hours} h` : `Synced ${hours}h ago`;
}

function phaseLabel(phase: string, isFr: boolean): string {
  if (phase === "phase1") return "Phase 1";
  if (phase === "phase2") return "Phase 2";
  if (phase === "funded") return isFr ? "Compte Reward" : "Reward Account";
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

export default function TraderCockpit({
  challenge,
  activeChallenges,
  allChallengesCount,
  tradeHistory,
  tradeHistoryLoading,
  isFr,
  isMobile,
  kycStatus,
  onSelectChallenge,
  onNavigate,
}: Props) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [copied, setCopied] = useState("");
  const [planChecks, setPlanChecks] = useState([false, false, false]);
  const [journalNote, setJournalNote] = useState("");
  const [loadedPlanKey, setLoadedPlanKey] = useState("");

  const trades = useMemo(() => parseTrades(tradeHistory), [tradeHistory]);
  const positions = Array.isArray(challenge.open_positions) ? challenge.open_positions : [];
  const floatingPnl = positions.reduce((sum, position) => sum + numeric(position.profit) + numeric(position.swap), 0);
  const effectiveBalance = challenge.status === "failed" && challenge.breach_equity != null ? challenge.breach_equity : challenge.balance;
  const equity = effectiveBalance + floatingPnl;
  const profit = effectiveBalance - challenge.start_balance;
  const profitTargetUsd = challenge.start_balance * challenge.profit_target / 100;
  const targetBalance = challenge.start_balance + profitTargetUsd;
  const profitRemaining = Math.max(0, targetBalance - effectiveBalance);
  const profitProgress = profitTargetUsd > 0 ? clamp(profit / profitTargetUsd * 100) : 100;
  const minDays = challenge.phase === "funded" ? 7 : 5;
  const daysRemaining = Math.max(0, minDays - challenge.trading_days);
  const dailyLimitUsd = challenge.start_balance * challenge.daily_drawdown_limit / 100;
  const dailyStart = challenge.daily_start_balance && challenge.daily_start_balance > 0 ? challenge.daily_start_balance : challenge.start_balance;
  const dailyFloor = dailyStart - dailyLimitUsd;
  const dailyBuffer = Math.max(0, equity - dailyFloor);
  const dailyRiskUsed = clamp((1 - dailyBuffer / Math.max(dailyLimitUsd, 1)) * 100);
  const isOneStep = challenge.model.toLowerCase().replace(/[\s-]/g, "").includes("1step");
  const trailingReference = isOneStep ? Math.max(challenge.highest_balance ?? challenge.start_balance, challenge.start_balance) : challenge.start_balance;
  const totalLimitUsd = challenge.start_balance * challenge.total_drawdown_limit / 100;
  const totalFloor = trailingReference - totalLimitUsd;
  const totalBuffer = Math.max(0, equity - totalFloor);
  const totalRiskUsed = clamp((1 - totalBuffer / Math.max(totalLimitUsd, 1)) * 100);
  const maxRiskUsed = Math.max(dailyRiskUsed, totalRiskUsed);

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
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - (13 - index));
      return { date, pnl: pnlByDay.get(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`) ?? 0 };
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
          setPlanChecks(Array.isArray(parsed.checks) ? parsed.checks.slice(0, 3) : [false, false, false]);
          setJournalNote(parsed.note ?? "");
        } else {
          setPlanChecks([false, false, false]);
          setJournalNote("");
        }
      } catch {
        setPlanChecks([false, false, false]);
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
    return { icon: <Sparkles size={22} />, title: isFr ? "Ton cap du jour" : "Today's focus", text: isFr ? `${money(profitRemaining)} restent pour l'objectif. Ton buffer le plus proche est ${money(Math.min(dailyBuffer, totalBuffer))}.` : `${money(profitRemaining)} remains to target. Your nearest buffer is ${money(Math.min(dailyBuffer, totalBuffer))}.`, action: () => document.getElementById("daily-plan")?.scrollIntoView({ behavior: "smooth" }), label: isFr ? "Préparer ma session" : "Prepare session", color: BLUE };
  })();

  const phaseSteps = isOneStep
    ? ["Challenge", isFr ? "Compte Reward" : "Reward Account", isFr ? "1re récompense" : "First reward"]
    : ["Phase 1", "Phase 2", isFr ? "Compte Reward" : "Reward Account", isFr ? "1re récompense" : "First reward"];
  const phaseIndex = challenge.phase === "phase1" ? 0 : challenge.phase === "phase2" ? 1 : challenge.phase === "funded" ? (isOneStep ? 1 : 2) : 0;

  const copyValue = async (label: string, value: string) => {
    if (!value || value === "—") return;
    await navigator.clipboard.writeText(value);
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1400);
  };

  const planItems = isFr
    ? ["Mon risque maximum par trade est défini", "Mon setup et mon invalidation sont clairs", "J'ai vérifié les annonces importantes"]
    : ["My maximum risk per trade is defined", "My setup and invalidation are clear", "I checked important news"];

  const riskColor = (used: number) => used >= 85 ? RED : used >= 60 ? AMBER : BLUE;

  return (
    <div className={styles.root} data-mobile={isMobile ? "true" : "false"}>
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
                {activeChallenges.map(item => <option key={item.id} value={item.id}>{item.account_size} · {item.model === "2step" ? "2-Step" : item.model === "1step" ? "1-Step" : item.model}</option>)}
              </select>
            ) : <span className={styles.pill} style={{ color: BLUE, background: "rgba(105,197,253,.1)" }}>{challenge.account_size} · {challenge.model === "2step" ? "2-Step" : challenge.model === "1step" ? "1-Step" : challenge.model}</span>}
            <span className={styles.pill} style={{ color: BLUE, background: "rgba(105,197,253,.08)" }}><Target size={13} />{phaseLabel(challenge.phase, isFr)}</span>
            <span className={styles.pill} style={{ color: health.color, background: `${health.color}16` }}>{health.icon}{health.label}</span>
            <span className={styles.muted} style={{ fontSize: 10, display: "inline-flex", gap: 5, alignItems: "center" }}><Activity size={11} />{syncLabel(challenge.last_synced_at, isFr)}</span>
          </div>
        </div>
        <div className={styles.headerActions}>
          {allChallengesCount > 0 && <span className={styles.pill} style={{ color: BLUE, background: "rgba(105,197,253,.08)", alignSelf: "center" }}>🎖️ −20% {isFr ? "fidélité" : "loyalty"}</span>}
          <button className={styles.button} onClick={() => window.location.reload()}><RefreshCw size={14} />{isFr ? "Actualiser" : "Refresh"}</button>
          <Link className={`${styles.button} ${styles.buttonPrimary}`} href="/#pricing">+ {isFr ? "Nouveau challenge" : "New challenge"}</Link>
        </div>
      </header>

      <div className={styles.coach} style={{ borderColor: `${nextAction.color}45`, background: `linear-gradient(90deg,${nextAction.color}18,transparent)` }}>
        <div className={styles.coachIcon} style={{ color: nextAction.color, background: `${nextAction.color}18` }}>{nextAction.icon}</div>
        <div className={styles.coachCopy}><div className={styles.coachTitle}>{nextAction.title}</div><div className={styles.coachText}>{nextAction.text}</div></div>
        <button className={styles.button} onClick={nextAction.action}>{nextAction.label}<ArrowRight size={14} /></button>
      </div>

      <div className={styles.kpis}>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isFr ? "Equity actuelle" : "Current equity"}</span><Activity color={BLUE} size={17} /></div>
          <div><div className={styles.kpiValue}>{money(equity)}</div><div className={styles.kpiMeta}><span style={{ color: profit >= 0 ? GREEN : RED }}>{profit >= 0 ? "+" : ""}{money(profit)} ({profit >= 0 ? "+" : ""}{(profit / challenge.start_balance * 100).toFixed(2)}%)</span><span>{floatingPnl ? `${isFr ? "Flottant" : "Floating"} ${money(floatingPnl, 2)}` : isFr ? "Aucune exposition" : "No exposure"}</span></div></div>
        </div>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isFr ? "Objectif restant" : "Remaining target"}</span><Target color={BLUE} size={17} /></div>
          <div><div className={styles.kpiValue}>{challenge.phase === "funded" ? "—" : money(profitRemaining)}</div><div className={styles.kpiMeta}><span>{challenge.phase === "funded" ? (isFr ? "Aucun objectif de profit" : "No profit target") : `${profitProgress.toFixed(0)}% ${isFr ? "accompli" : "complete"}`}</span><span>{challenge.phase !== "funded" && money(targetBalance)}</span></div>{challenge.phase !== "funded" && <Meter value={profitProgress} color={GREEN} />}</div>
        </div>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isFr ? "Drawdown journalier" : "Daily drawdown"}</span><Clock3 color={BLUE} size={17} /></div>
          <div><div className={styles.kpiValue} style={{ color: dailyRiskUsed >= 60 ? riskColor(dailyRiskUsed) : "#fff" }}>{money(dailyBuffer)}</div><div className={styles.kpiMeta}><span>{dailyRiskUsed.toFixed(0)}% {isFr ? "utilisé" : "used"}</span><span>{challenge.daily_drawdown_limit}% max</span></div><Meter value={dailyRiskUsed} color={riskColor(dailyRiskUsed)} /></div>
        </div>
        <div className={`${styles.card} ${styles.kpi}`}>
          <div className={styles.kpiTop}><span className={styles.kpiLabel}>{isFr ? "Drawdown total" : "Total drawdown"}</span><ShieldCheck color={BLUE} size={17} /></div>
          <div><div className={styles.kpiValue} style={{ color: totalRiskUsed >= 60 ? riskColor(totalRiskUsed) : "#fff" }}>{money(totalBuffer)}</div><div className={styles.kpiMeta}><span>{isOneStep ? (isFr ? "Plancher trailing EOD" : "EOD trailing floor") : (isFr ? "Plancher statique" : "Static floor")}</span><span>{money(totalFloor)}</span></div><Meter value={totalRiskUsed} color={riskColor(totalRiskUsed)} /></div>
        </div>
      </div>

      <div className={`${styles.card} ${styles.journey}`}>
        <div className={styles.journeyHead}><strong style={{ color: "rgba(255,255,255,.72)" }}>{isFr ? "Ton parcours" : "Your journey"}</strong><span>{challenge.trading_days}/{minDays} {isFr ? "jours validés" : "days complete"}</span></div>
        <div className={styles.steps} style={{ gridTemplateColumns: `repeat(${phaseSteps.length},minmax(120px,1fr))` }}>
          {phaseSteps.map((step, index) => <div key={step} className={`${styles.step} ${index < phaseIndex ? styles.stepDone : index === phaseIndex ? styles.stepActive : ""}`}><span className={styles.stepDot}>{index < phaseIndex ? <Check size={12} /> : index + 1}</span><span className={styles.stepText}>{step}</span></div>)}
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={`${styles.card} ${styles.panel}`}>
          <SectionTitle icon={<LineChart size={17} />} title={isFr ? "Trajectoire du compte" : "Account trajectory"} subtitle={isFr ? "Courbe reconstruite uniquement avec tes résultats MT5 réels" : "Built only from your real MT5 results"} />
          <CockpitChart trades={trades} startBalance={challenge.start_balance} currentBalance={effectiveBalance} targetBalance={targetBalance} floorBalance={totalFloor} isFr={isFr} />
        </div>
        <div className={`${styles.card} ${styles.panel}`}>
          <SectionTitle icon={<Gauge size={17} />} title={isFr ? "Limites en direct" : "Live limits"} subtitle={isFr ? "Les chiffres à connaître avant chaque trade" : "Know these before every trade"} />
          <Rule label={isFr ? "Objectif de profit" : "Profit target"} value={challenge.phase === "funded" ? "—" : `${profitProgress.toFixed(0)}%`} progress={challenge.phase === "funded" ? undefined : profitProgress} color={GREEN} help={challenge.phase === "funded" ? (isFr ? "Aucun objectif sur le compte Reward" : "No target on Reward account") : `${money(profitRemaining)} ${isFr ? "encore nécessaires" : "still required"}`} />
          <Rule label={isFr ? "Jours minimum" : "Minimum days"} value={`${challenge.trading_days} / ${minDays}`} progress={challenge.trading_days / minDays * 100} color={BLUE} help={daysRemaining ? `${daysRemaining} ${isFr ? "jour(s) restant(s)" : "day(s) remaining"}` : isFr ? "Condition validée" : "Requirement met"} />
          <Rule label={isFr ? "Perte journalière" : "Daily loss"} value={`${money(dailyBuffer)} ${isFr ? "disponibles" : "available"}`} progress={dailyRiskUsed} color={riskColor(dailyRiskUsed)} help={`${isFr ? "Plancher du jour" : "Today's floor"} : ${money(dailyFloor)}`} />
          <Rule label={isFr ? "Perte totale" : "Total loss"} value={`${money(totalBuffer)} ${isFr ? "disponibles" : "available"}`} progress={totalRiskUsed} color={riskColor(totalRiskUsed)} help={`${isFr ? "Plancher du compte" : "Account floor"} : ${money(totalFloor)}`} />
          {isOneStep && <Rule label={isFr ? "Meilleure journée" : "Best day"} value={money(challenge.best_day_profit ?? 0)} help={isFr ? "Doit rester ≤ 50% des profits positifs" : "Must remain ≤ 50% of positive profits"} />}
        </div>
      </div>

      <div className={styles.twoGrid}>
        <div className={`${styles.card} ${styles.panel}`}>
          <SectionTitle icon={<CalendarDays size={17} />} title={isFr ? "Calendrier P&L" : "P&L calendar"} subtitle={isFr ? "Deux semaines de régularité en un regard" : "Two weeks at a glance"} />
          <div className={styles.calendar}>{calendarDays.map(({ date, pnl }) => <div key={date.toISOString()} className={styles.day} style={pnl > 0 ? { background: "rgba(34,197,94,.08)", borderColor: "rgba(34,197,94,.18)" } : pnl < 0 ? { background: "rgba(239,68,68,.08)", borderColor: "rgba(239,68,68,.18)" } : undefined}><div className={styles.dayName}>{date.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { weekday: "short" })}</div><div className={styles.dayNumber}>{date.getDate()}</div><div className={styles.dayPnl} style={{ color: pnl > 0 ? GREEN : pnl < 0 ? RED : "rgba(255,255,255,.25)" }}>{pnl ? `${pnl > 0 ? "+" : ""}${money(pnl)}` : "—"}</div></div>)}</div>
        </div>
        <div className={`${styles.card} ${styles.panel}`}>
          <SectionTitle icon={<BarChart3 size={17} />} title={isFr ? "Signature de performance" : "Performance signature"} subtitle={tradeHistoryLoading ? (isFr ? "Analyse en cours…" : "Analyzing…") : `${stats.count} ${isFr ? "trades clôturés analysés" : "closed trades analyzed"}`} />
          <div className={styles.stats}>{[
            { label: isFr ? "Taux de réussite" : "Win rate", value: `${stats.winRate.toFixed(0)}%`, note: isFr ? "Trades gagnants" : "Winning trades" },
            { label: "Profit factor", value: Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : "∞", note: isFr ? "Gains / pertes" : "Wins / losses" },
            { label: isFr ? "Espérance" : "Expectancy", value: money(stats.expectancy, 2), note: isFr ? "Par trade" : "Per trade" },
            { label: isFr ? "Gain moyen" : "Average win", value: money(stats.averageWin), note: isFr ? "Trade gagnant" : "Winning trade" },
            { label: isFr ? "Perte moyenne" : "Average loss", value: money(stats.averageLoss), note: isFr ? "Trade perdant" : "Losing trade" },
            { label: isFr ? "Meilleur symbole" : "Best symbol", value: stats.bestSymbol?.[0] ?? "—", note: stats.bestSymbol ? money(stats.bestSymbol[1]) : (isFr ? "Pas assez de données" : "Not enough data") },
          ].map(item => <div key={item.label} className={styles.stat}><div className={styles.statLabel}>{item.label}</div><div className={styles.statValue}>{item.value}</div><div className={styles.statNote}>{item.note}</div></div>)}</div>
        </div>
      </div>

      <EconomicCalendar isFr={isFr} />

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
        <div className={`${styles.card} ${styles.panel}`} id="daily-plan">
          <SectionTitle icon={<ClipboardCheck size={17} />} title={isFr ? "Plan de session" : "Session plan"} subtitle={isFr ? "Sauvegardé automatiquement sur cet appareil" : "Auto-saved on this device"} />
          {planItems.map((item, index) => <div key={item} className={styles.planItem} onClick={() => setPlanChecks(current => current.map((checked, itemIndex) => itemIndex === index ? !checked : checked))}><span className={`${styles.check} ${planChecks[index] ? styles.checkOn : ""}`}>{planChecks[index] && <Check size={13} />}</span><span className={styles.planText} style={planChecks[index] ? { textDecoration: "line-through", color: "rgba(255,255,255,.32)" } : undefined}>{item}</span></div>)}
          <textarea className={styles.note} value={journalNote} onChange={event => setJournalNote(event.target.value)} placeholder={isFr ? "Mon setup, mon état d'esprit et la règle que je veux respecter aujourd'hui…" : "My setup, mindset and the rule I want to respect today…"} />
        </div>
      </div>

      <div className={styles.twoGrid}>
        <div className={`${styles.card} ${styles.panel}`}>
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
        <div className={`${styles.card} ${styles.panel}`}>
          <SectionTitle icon={<History size={17} />} title={isFr ? "Derniers trades" : "Recent trades"} subtitle={isFr ? "Lecture rapide de ta session" : "Quick session review"} />
          {trades.length === 0 ? <Empty icon={<CircleDollarSign size={20} />} text={isFr ? "Les trades clôturés apparaîtront ici automatiquement." : "Closed trades will appear here automatically."} /> : <div>{[...trades].reverse().slice(0, 5).map(trade => <div className={styles.trade} key={trade.id}><span><b>{trade.symbol}</b><small style={{ color: trade.side === "BUY" ? GREEN : RED, marginLeft: 6 }}>{trade.side}</small></span><span className={styles.muted}>{trade.date?.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "2-digit", month: "short" }) ?? "—"}</span><strong style={{ color: trade.profit >= 0 ? GREEN : RED, textAlign: "right" }}>{trade.profit >= 0 ? "+" : ""}{money(trade.profit, 2)}</strong></div>)}<button className={styles.button} style={{ width: "100%", marginTop: 9 }} onClick={() => onNavigate("history")}>{isFr ? "Ouvrir tout l'historique" : "Open full history"}<ArrowRight size={14} /></button></div>}
        </div>
      </div>
    </div>
  );
}

function Rule({ label, value, progress, color = BLUE, help }: { label: string; value: string; progress?: number; color?: string; help?: string }) {
  return <div className={styles.rule}><div className={styles.ruleTop}><span className={styles.ruleLabel}>{label}</span><span className={styles.ruleValue}>{value}</span></div>{progress != null && <Meter value={progress} color={color} />}{help && <div className={styles.ruleHelp}>{help}</div>}</div>;
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className={styles.empty}>{icon}{text}</div>;
}
