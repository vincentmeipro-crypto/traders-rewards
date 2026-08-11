import type { SupabaseClient } from "@supabase/supabase-js";
import { observePositionRisk, type MT5Position } from "./trade-risk";

type ExistingRisk = {
  id: string;
  position_ticket: string;
  initial_stop_loss: number | null;
  status: string;
};

export async function syncTradeRiskSnapshots(params: {
  admin: SupabaseClient;
  challengeId: string;
  mt5Login: number;
  accountEquity: number;
  positions: MT5Position[];
}) {
  const { admin, challengeId, mt5Login, accountEquity, positions } = params;
  const { data, error } = await admin
    .from("trade_risk_snapshots")
    .select("id, position_ticket, initial_stop_loss, status")
    .eq("challenge_id", challengeId);

  // The migration can be deployed independently without interrupting MT5 monitoring.
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") console.warn("trade_risk_snapshots unavailable:", error.message);
    return;
  }

  const existing = new Map((data as ExistingRisk[] | null ?? []).map(row => [String(row.position_ticket), row]));
  const observations = positions.map(position => observePositionRisk(position, accountEquity)).filter(Boolean);
  const seenTickets = new Set(observations.map(observation => observation!.ticket));
  const now = new Date().toISOString();

  await Promise.all(observations.map(async observation => {
    if (!observation) return;
    const current = existing.get(observation.ticket);
    const common = {
      mt5_login: mt5Login,
      symbol: observation.symbol,
      side: observation.side,
      volume: observation.volume,
      entry_price: observation.entryPrice,
      current_stop_loss: observation.stopLoss,
      current_risk_distance: observation.riskDistance,
      current_risk_amount: observation.riskAmount,
      current_risk_percent: observation.riskPercent,
      account_equity: accountEquity,
      floating_pnl: observation.floatingPnl,
      opened_at: observation.openedAt,
      last_seen_at: now,
      closed_at: null,
      status: "open",
      source_position: observation.source,
    };

    if (!current) {
      await admin.from("trade_risk_snapshots").insert({
        challenge_id: challengeId,
        position_ticket: observation.ticket,
        ...common,
        initial_stop_loss: observation.stopLoss,
        initial_risk_distance: observation.riskDistance,
        initial_risk_amount: observation.riskAmount,
        initial_risk_percent: observation.riskPercent,
        opened_without_sl: observation.stopLoss == null,
        first_seen_at: now,
      });
      return;
    }

    await admin.from("trade_risk_snapshots").update({
      ...common,
      ...(current.initial_stop_loss == null && observation.stopLoss != null ? {
        initial_stop_loss: observation.stopLoss,
        initial_risk_distance: observation.riskDistance,
        initial_risk_amount: observation.riskAmount,
        initial_risk_percent: observation.riskPercent,
        initial_sl_captured_at: now,
      } : {}),
    }).eq("id", current.id);
  }));

  const closed = [...existing.values()].filter(row => row.status === "open" && !seenTickets.has(String(row.position_ticket)));
  await Promise.all(closed.map(row => admin.from("trade_risk_snapshots").update({ status: "closed", closed_at: now, last_seen_at: now }).eq("id", row.id)));
}
