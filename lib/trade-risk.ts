export type MT5Position = Record<string, unknown> & {
  ticket?: number | string;
  symbol?: string;
  type?: number | string;
  volume?: number;
  open_price?: number;
  current_price?: number;
  profit?: number;
  swap?: number;
  open_time?: number | string;
  stop_loss?: number;
  sl?: number;
};

export type PositionRiskObservation = {
  ticket: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  entryPrice: number;
  currentPrice: number | null;
  stopLoss: number | null;
  riskDistance: number | null;
  riskAmount: number | null;
  riskPercent: number | null;
  floatingPnl: number;
  openedAt: string | null;
  source: MT5Position;
};

function finiteNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (value == null || value === "") continue;
    const parsed = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function normalizeVolume(value: number | null): number {
  if (value == null) return 0;
  return value > 100 ? value / 10_000 : value;
}

function normalizeTime(value: unknown): string | null {
  if (value == null || value === "") return null;
  const numeric = finiteNumber(value);
  const date = numeric != null
    ? new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000)
    : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function observePositionRisk(position: MT5Position, accountEquity: number): PositionRiskObservation | null {
  const rawTicket = position.ticket ?? position.position_ticket ?? position.position_id ?? position.id;
  if (rawTicket == null || rawTicket === "") return null;

  const rawType = position.type ?? position.position_type ?? position.side;
  const side: "BUY" | "SELL" = rawType === 0 || String(rawType ?? "").toLowerCase().includes("buy") ? "BUY" : "SELL";
  const volume = normalizeVolume(finiteNumber(position.volume, position.lots, position.volume_lots));
  const entryPrice = finiteNumber(position.open_price, position.price_open, position.entry_price) ?? 0;
  const currentPrice = finiteNumber(position.current_price, position.price_current, position.price);
  const rawStopLoss = finiteNumber(position.initial_stop_loss, position.stop_loss, position.stopLoss, position.sl);
  const stopLoss = rawStopLoss != null && rawStopLoss > 0 ? rawStopLoss : null;

  const directionalDistance = stopLoss == null || entryPrice <= 0
    ? null
    : side === "BUY" ? entryPrice - stopLoss : stopLoss - entryPrice;
  const riskDistance = directionalDistance == null ? null : Math.max(0, directionalDistance);

  const providedRisk = finiteNumber(position.risk_amount, position.sl_risk_amount, position.initial_risk_amount);
  const tickSize = finiteNumber(position.tick_size, position.trade_tick_size, position.symbol_tick_size);
  const tickValue = finiteNumber(position.tick_value_loss, position.tick_value, position.trade_tick_value, position.symbol_tick_value);
  const calculatedRisk = riskDistance != null && riskDistance > 0 && tickSize != null && tickSize > 0 && tickValue != null && tickValue > 0 && volume > 0
    ? riskDistance / tickSize * tickValue * volume
    : null;
  const riskAmount = providedRisk != null ? Math.abs(providedRisk) : calculatedRisk;
  const riskPercent = riskAmount != null && accountEquity > 0 ? riskAmount / accountEquity * 100 : null;

  return {
    ticket: String(rawTicket),
    symbol: String(position.symbol ?? "—"),
    side,
    volume,
    entryPrice,
    currentPrice,
    stopLoss,
    riskDistance,
    riskAmount,
    riskPercent,
    floatingPnl: (finiteNumber(position.profit) ?? 0) + (finiteNumber(position.swap) ?? 0),
    openedAt: normalizeTime(position.open_time ?? position.time_open ?? position.created_at),
    source: position,
  };
}
