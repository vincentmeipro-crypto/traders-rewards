"use client";

import { useMemo } from "react";
import { LineChart } from "lucide-react";

export type CockpitTrade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  volume: number;
  profit: number;
  date: Date | null;
};

const BLUE = "#69C5FD";
const GREEN = "#22c55e";
const RED = "#ef4444";

function money(value: number): string {
  return `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function CockpitChart({
  trades,
  startBalance,
  currentBalance,
  targetBalance,
  floorBalance,
  isFr,
}: {
  trades: CockpitTrade[];
  startBalance: number;
  currentBalance: number;
  targetBalance: number;
  floorBalance: number;
  isFr: boolean;
}) {
  const width = 760;
  const height = 260;
  const pad = { top: 24, right: 70, bottom: 34, left: 18 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;

  const points = useMemo(() => {
    let runningBalance = startBalance;
    const values = [{ balance: startBalance, date: trades[0]?.date ?? null }];
    for (const trade of trades) {
      runningBalance += trade.profit;
      values.push({ balance: runningBalance, date: trade.date });
    }
    if (values.length === 1 || Math.abs(values[values.length - 1].balance - currentBalance) > 0.01) {
      values.push({ balance: currentBalance, date: new Date() });
    }
    return values;
  }, [trades, startBalance, currentBalance]);

  const allValues = [...points.map(point => point.balance), targetBalance, floorBalance];
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues);
  const scalePadding = Math.max((rawMax - rawMin) * 0.12, startBalance * 0.005, 1);
  const minY = rawMin - scalePadding;
  const maxY = rawMax + scalePadding;
  const range = maxY - minY || 1;
  const x = (index: number) => pad.left + (index / Math.max(points.length - 1, 1)) * chartWidth;
  const y = (balance: number) => pad.top + ((maxY - balance) / range) * chartHeight;
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(2)},${y(point.balance).toFixed(2)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${pad.top + chartHeight} L${pad.left},${pad.top + chartHeight} Z`;
  const current = points[points.length - 1];

  return (
    <div style={{ position: "relative", minHeight: 250 }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={isFr ? "Évolution réelle du compte" : "Actual account evolution"} style={{ width: "100%", display: "block" }}>
        <defs>
          <linearGradient id="cockpit-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity="0.32" />
            <stop offset="100%" stopColor={BLUE} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cockpit-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#318dd0" />
            <stop offset="100%" stopColor={BLUE} />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map(step => (
          <line key={step} x1={pad.left} y1={pad.top + step * chartHeight} x2={pad.left + chartWidth} y2={pad.top + step * chartHeight} stroke="rgba(255,255,255,0.055)" />
        ))}
        <line x1={pad.left} y1={y(targetBalance)} x2={pad.left + chartWidth} y2={y(targetBalance)} stroke={GREEN} strokeDasharray="6 5" />
        <text x={pad.left + chartWidth + 9} y={y(targetBalance) + 4} fill={GREEN} fontSize="10" fontWeight="800">{isFr ? "OBJECTIF" : "TARGET"}</text>
        <line x1={pad.left} y1={y(floorBalance)} x2={pad.left + chartWidth} y2={y(floorBalance)} stroke={RED} strokeDasharray="6 5" />
        <text x={pad.left + chartWidth + 9} y={y(floorBalance) + 4} fill={RED} fontSize="10" fontWeight="800">{isFr ? "LIMITE" : "FLOOR"}</text>
        <path d={area} fill="url(#cockpit-area)" />
        <path d={path} fill="none" stroke="url(#cockpit-line)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={x(points.length - 1)} cy={y(current.balance)} r="5" fill={BLUE} stroke="#fff" strokeWidth="2" />
        <rect x={Math.max(0, x(points.length - 1) - 38)} y={Math.max(0, y(current.balance) - 30)} width="76" height="20" rx="6" fill={BLUE} />
        <text x={x(points.length - 1)} y={Math.max(0, y(current.balance) - 16)} fill="#02070b" fontSize="10" fontWeight="900" textAnchor="middle">{money(current.balance)}</text>
      </svg>

      {trades.length === 0 && (
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "min(330px,78%)", display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,.35)", fontSize: 11, textAlign: "center" }}>
          <LineChart size={18} />
          {isFr ? "La courbe se dessinera après les premiers trades clôturés." : "The chart will build after your first closed trades."}
        </div>
      )}
    </div>
  );
}
