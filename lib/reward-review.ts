import { observePositionRisk, type MT5Position } from "./trade-risk";

type DataRow = Record<string, unknown>;

export type RewardReviewData = {
  generatedAt: string;
  syncedAt: string | null;
  captureMode: "snapshots" | "current_positions" | "none";
  account: {
    status: string;
    phase: string;
    balance: number;
    equity: number;
    startBalance: number;
    profit: number;
    profitPercent: number;
    tradingDays: number;
    dailyUsed: number;
    dailyLimit: number;
    totalUsed: number;
    totalLimit: number;
    kycStatus: string;
    openPositions: number;
  };
  performance: {
    trades: number;
    winRate: number;
    profitFactor: number | null;
    profitFactorInfinite: boolean;
    totalPnl: number;
    expectancy: number;
    averageWin: number;
    averageLoss: number;
    bestSymbol: string | null;
    bestSymbolPnl: number | null;
  };
  risk: {
    capturedTrades: number;
    withInitialSl: number;
    openedWithoutSl: number;
    calculableTrades: number;
    initialSlCoverage: number | null;
    maxRiskPercent: number | null;
    maxRiskAmount: number | null;
    rows: Array<{
      ticket: string;
      symbol: string;
      side: string;
      volume: number;
      entryPrice: number;
      initialStopLoss: number | null;
      currentStopLoss: number | null;
      initialRiskAmount: number | null;
      initialRiskPercent: number | null;
      openedWithoutSl: boolean;
      status: string;
      openedAt: unknown;
      firstSeenAt: unknown;
    }>;
  };
};

function numeric(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function tradeProfit(trade: DataRow): number {
  return numeric(trade.profit) + numeric(trade.swap) + numeric(trade.commission);
}

function closingTrade(trade: DataRow): boolean {
  const entry = trade.entry;
  return entry == null ? Math.abs(tradeProfit(trade)) > 0.00001 : Number(entry) === 1 || Number(entry) === 2;
}

export function buildRewardReview(params: {
  challenge: DataRow;
  liveHistory: DataRow[];
  storedHistory: DataRow[];
  storedRisks: DataRow[];
  kycStatus: string;
}): RewardReviewData {
  const { challenge, liveHistory, storedHistory, storedRisks, kycStatus } = params;
  const mergedHistory = [...liveHistory, ...storedHistory];
  const deduped = new Map<string, DataRow>();
  mergedHistory.forEach((trade, index) => {
    const key = String(trade.ticket ?? trade.deal ?? trade.id ?? `${trade.symbol}-${trade.time ?? trade.closed_at}-${index}`);
    if (!deduped.has(key)) deduped.set(key, trade);
  });
  const trades = [...deduped.values()].filter(closingTrade);
  const profits = trades.map(tradeProfit).filter(profit => Math.abs(profit) > 0.00001);
  const wins = profits.filter(profit => profit > 0);
  const losses = profits.filter(profit => profit < 0);
  const grossProfit = wins.reduce((sum, profit) => sum + profit, 0);
  const grossLoss = Math.abs(losses.reduce((sum, profit) => sum + profit, 0));
  const bySymbol = new Map<string, number>();
  trades.forEach(trade => {
    const symbol = String(trade.symbol ?? "—");
    bySymbol.set(symbol, (bySymbol.get(symbol) ?? 0) + tradeProfit(trade));
  });
  const bestSymbol = [...bySymbol.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const positions = Array.isArray(challenge.open_positions) ? challenge.open_positions as MT5Position[] : [];
  const storedEquity = numeric(challenge.equity, numeric(challenge.balance));
  const currentObservations = positions.map(position => observePositionRisk(position, storedEquity)).filter(Boolean);
  const riskRows = storedRisks.length ? storedRisks.map(row => ({
    ticket: String(row.position_ticket), symbol: String(row.symbol ?? "—"), side: String(row.side ?? "—"),
    volume: numeric(row.volume), entryPrice: numeric(row.entry_price),
    initialStopLoss: row.initial_stop_loss == null ? null : numeric(row.initial_stop_loss),
    currentStopLoss: row.current_stop_loss == null ? null : numeric(row.current_stop_loss),
    initialRiskAmount: row.initial_risk_amount == null ? null : numeric(row.initial_risk_amount),
    initialRiskPercent: row.initial_risk_percent == null ? null : numeric(row.initial_risk_percent),
    openedWithoutSl: Boolean(row.opened_without_sl), status: String(row.status ?? "closed"),
    openedAt: row.opened_at, firstSeenAt: row.first_seen_at,
  })) : currentObservations.map(observation => ({
    ticket: observation!.ticket, symbol: observation!.symbol, side: observation!.side,
    volume: observation!.volume, entryPrice: observation!.entryPrice,
    initialStopLoss: observation!.stopLoss, currentStopLoss: observation!.stopLoss,
    initialRiskAmount: observation!.riskAmount, initialRiskPercent: observation!.riskPercent,
    openedWithoutSl: observation!.stopLoss == null, status: "open",
    openedAt: observation!.openedAt, firstSeenAt: challenge.positions_synced_at,
  }));

  const risksWithSl = riskRows.filter(row => row.initialStopLoss != null);
  const calculableRisks = riskRows.filter(row => row.initialRiskPercent != null);
  const maxRiskPercent = calculableRisks.length ? Math.max(...calculableRisks.map(row => row.initialRiskPercent ?? 0)) : null;
  const maxRiskAmount = riskRows.some(row => row.initialRiskAmount != null) ? Math.max(...riskRows.map(row => row.initialRiskAmount ?? 0)) : null;
  const startBalance = numeric(challenge.start_balance);
  const balance = numeric(challenge.balance);
  const equity = numeric(challenge.equity, balance + currentObservations.reduce((sum, row) => sum + (row?.floatingPnl ?? 0), 0));
  const totalUsed = startBalance > 0 ? Math.max(0, (startBalance - equity) / startBalance * 100) : 0;

  return {
    generatedAt: new Date().toISOString(),
    syncedAt: String(challenge.positions_synced_at ?? challenge.last_synced_at ?? "") || null,
    captureMode: storedRisks.length ? "snapshots" : currentObservations.length ? "current_positions" : "none",
    account: {
      status: String(challenge.status ?? ""), phase: String(challenge.phase ?? ""), balance, equity, startBalance,
      profit: balance - startBalance, profitPercent: startBalance > 0 ? (balance - startBalance) / startBalance * 100 : 0,
      tradingDays: numeric(challenge.trading_days), dailyUsed: numeric(challenge.daily_dd),
      dailyLimit: numeric(challenge.daily_drawdown_limit), totalUsed, totalLimit: numeric(challenge.total_drawdown_limit),
      kycStatus, openPositions: positions.length,
    },
    performance: {
      trades: profits.length, winRate: profits.length ? wins.length / profits.length * 100 : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
      profitFactorInfinite: grossLoss === 0 && grossProfit > 0, totalPnl: grossProfit - grossLoss,
      expectancy: profits.length ? (grossProfit - grossLoss) / profits.length : 0,
      averageWin: wins.length ? grossProfit / wins.length : 0,
      averageLoss: losses.length ? grossLoss / losses.length : 0,
      bestSymbol: bestSymbol?.[0] ?? null, bestSymbolPnl: bestSymbol?.[1] ?? null,
    },
    risk: {
      capturedTrades: riskRows.length, withInitialSl: risksWithSl.length,
      openedWithoutSl: riskRows.filter(row => row.openedWithoutSl).length,
      calculableTrades: calculableRisks.length,
      initialSlCoverage: riskRows.length ? risksWithSl.length / riskRows.length * 100 : null,
      maxRiskPercent, maxRiskAmount, rows: riskRows.slice(0, 25),
    },
  };
}
