export type TradePerformanceSummary = {
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

function numeric(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function summarizeTradeHistory(history: Record<string, unknown>[]): TradePerformanceSummary {
  const trades = history.filter(trade => {
    const entry = trade.entry;
    const profit = numeric(trade.profit) + numeric(trade.swap) + numeric(trade.commission) + numeric(trade.fee);
    return entry == null ? Math.abs(profit) > 0.00001 : Number(entry) === 1 || Number(entry) === 2;
  });
  const profits = trades.map(trade => numeric(trade.profit) + numeric(trade.swap) + numeric(trade.commission) + numeric(trade.fee)).filter(value => Math.abs(value) > 0.00001);
  const wins = profits.filter(value => value > 0);
  const losses = profits.filter(value => value < 0);
  const grossProfit = wins.reduce((sum, value) => sum + value, 0);
  const grossLoss = Math.abs(losses.reduce((sum, value) => sum + value, 0));
  const bySymbol = new Map<string, number>();
  trades.forEach(trade => {
    const symbol = String(trade.symbol ?? "—");
    const profit = numeric(trade.profit) + numeric(trade.swap) + numeric(trade.commission) + numeric(trade.fee);
    bySymbol.set(symbol, (bySymbol.get(symbol) ?? 0) + profit);
  });
  const bestSymbol = [...bySymbol.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  return {
    trades: profits.length,
    winRate: profits.length ? wins.length / profits.length * 100 : 0,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? null : 0,
    profitFactorInfinite: grossLoss === 0 && grossProfit > 0,
    totalPnl: grossProfit - grossLoss,
    expectancy: profits.length ? (grossProfit - grossLoss) / profits.length : 0,
    averageWin: wins.length ? grossProfit / wins.length : 0,
    averageLoss: losses.length ? grossLoss / losses.length : 0,
    bestSymbol: bestSymbol?.[0] ?? null,
    bestSymbolPnl: bestSymbol?.[1] ?? null,
  };
}
