"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { LogOut, TrendingUp, ShieldCheck, Clock, Trophy, AlertCircle, ChevronRight, X } from "lucide-react";

const MOCK = {
  phase: "Phase 1",
  accountSize: "$50,000",
  balance: 51_240,
  startBalance: 50_000,
  target: 55_000,
  maxLoss: 45_000,
  dailyLoss: 47_500,
  tradingDays: 6,
  minDays: 4,
  daysLeft: "Unlimited",
  profitTarget: 10,
  currentProfit: 2.48,
  dailyDrawdown: 0.8,
  maxDailyDrawdown: 5,
  totalDrawdown: 2.52,
  maxTotalDrawdown: 10,
};

function ProgressBar({ value, max, color = "#C9A84C", danger = false }: { value: number; max: number; color?: string; danger?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = danger && pct > 70 ? "#ef4444" : danger && pct > 40 ? "#f59e0b" : color;
  return (
    <div style={{ backgroundColor: "#1a1a1a", borderRadius: 100, height: 8, overflow: "hidden", marginTop: 8 }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: 100, transition: "width 0.5s ease" }} />
    </div>
  );
}

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const [showPayout, setShowPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "", wallet_address: "", payment_method: "crypto" });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handlePayoutSubmit = async () => {
    setPayoutLoading(true);
    await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payoutForm, amount: Number(payoutForm.amount), challenge_id: null }),
    });
    setPayoutLoading(false);
    setPayoutSuccess(true);
    setTimeout(() => { setShowPayout(false); setPayoutSuccess(false); }, 2000);
  };

  const profitAmount = MOCK.balance - MOCK.startBalance;
  const profitPct = ((profitAmount / MOCK.startBalance) * 100).toFixed(2);
  const targetPct = (((MOCK.balance - MOCK.startBalance) / (MOCK.target - MOCK.startBalance)) * 100).toFixed(0);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", fontFamily: "Inter, sans-serif" }}>

      {/* Sidebar */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, backgroundColor: "#0a0a0a", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", zIndex: 50 }}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #1a1a1a" }}>
          <Image src="/logo.jpg" alt="Elysium" width={60} height={60} style={{ objectFit: "contain", mixBlendMode: "screen" }} />
        </div>

        <nav style={{ padding: "20px 12px", flex: 1 }}>
          {[
            { icon: "📊", label: "Dashboard", active: true },
            { icon: "📈", label: "My Challenges", active: false },
            { icon: "💰", label: "Payouts", active: false },
            { icon: "📋", label: "Rules", active: false },
            { icon: "⚙️", label: "Settings", active: false },
          ].map(item => (
            <div key={item.label} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderRadius: 10, marginBottom: 4, cursor: "pointer",
              backgroundColor: item.active ? "rgba(201,168,76,0.1)" : "transparent",
              borderLeft: item.active ? "2px solid #C9A84C" : "2px solid transparent",
            }}>
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: item.active ? 600 : 400, color: item.active ? "#C9A84C" : "#555" }}>{item.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding: "16px 12px", borderTop: "1px solid #1a1a1a" }}>
          <div style={{ padding: "12px 16px", marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>Logged in as</div>
            <div style={{ fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          </div>
          <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderRadius: 10, color: "#555" }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#555"; }}>
            <LogOut size={16} />
            <span style={{ fontSize: 14 }}>Log Out</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ marginLeft: 240, padding: "32px 32px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>My Challenge</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, letterSpacing: "1px" }}>
                {MOCK.phase} — {MOCK.accountSize}
              </span>
              <span style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100 }}>
                🟢 Active
              </span>
            </div>
          </div>
          <a href="#" className="btn-primary" style={{ fontSize: 13, padding: "10px 24px", display: "flex", alignItems: "center", gap: 8 }}>
            Buy New Challenge <ChevronRight size={14} />
          </a>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { icon: <TrendingUp size={20} color="#C9A84C" />, label: "Current Balance", value: `$${MOCK.balance.toLocaleString()}`, sub: `+$${profitAmount.toLocaleString()} (+${profitPct}%)`, subColor: "#22c55e" },
            { icon: <Trophy size={20} color="#C9A84C" />, label: "Profit Target", value: `${MOCK.profitTarget}%`, sub: `${targetPct}% completed`, subColor: "#C9A84C" },
            { icon: <ShieldCheck size={20} color="#C9A84C" />, label: "Trading Days", value: `${MOCK.tradingDays}`, sub: `Min. ${MOCK.minDays} required ✓`, subColor: "#22c55e" },
            { icon: <Clock size={20} color="#C9A84C" />, label: "Time Remaining", value: MOCK.daysLeft, sub: "No expiry date", subColor: "#555" },
          ].map((card, i) => (
            <div key={i} className="card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 10, padding: 10 }}>{card.icon}</div>
              </div>
              <div style={{ color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>{card.value}</div>
              <div style={{ fontSize: 13, color: card.subColor }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Progress Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

          {/* Profit Progress */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Profit Target</h3>
              <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 15 }}>{profitPct}% / {MOCK.profitTarget}%</span>
            </div>
            <ProgressBar value={parseFloat(profitPct)} max={MOCK.profitTarget} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#555" }}>
              <span>Start: ${MOCK.startBalance.toLocaleString()}</span>
              <span>Target: ${MOCK.target.toLocaleString()}</span>
            </div>
          </div>

          {/* Daily Drawdown */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Daily Drawdown</h3>
              <span style={{ color: MOCK.dailyDrawdown > 3 ? "#ef4444" : "#22c55e", fontWeight: 700, fontSize: 15 }}>
                {MOCK.dailyDrawdown}% / {MOCK.maxDailyDrawdown}%
              </span>
            </div>
            <ProgressBar value={MOCK.dailyDrawdown} max={MOCK.maxDailyDrawdown} danger />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#555" }}>
              <span>Used today</span>
              <span>Max allowed: {MOCK.maxDailyDrawdown}%</span>
            </div>
          </div>

          {/* Total Drawdown */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>Total Drawdown</h3>
              <span style={{ color: MOCK.totalDrawdown > 7 ? "#ef4444" : "#22c55e", fontWeight: 700, fontSize: 15 }}>
                {MOCK.totalDrawdown}% / {MOCK.maxTotalDrawdown}%
              </span>
            </div>
            <ProgressBar value={MOCK.totalDrawdown} max={MOCK.maxTotalDrawdown} danger />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#555" }}>
              <span>Max loss: ${MOCK.maxLoss.toLocaleString()}</span>
              <span>Current: ${MOCK.balance.toLocaleString()}</span>
            </div>
          </div>

          {/* Rules Status */}
          <div className="card" style={{ padding: 28 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Rules Status</h3>
            {[
              { label: "Profit target", status: "in progress", ok: true },
              { label: "Min. trading days (4)", status: "passed ✓", ok: true },
              { label: "Daily drawdown (5%)", status: "within limit ✓", ok: true },
              { label: "Total drawdown (10%)", status: "within limit ✓", ok: true },
            ].map((rule, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? "1px solid #1a1a1a" : "none" }}>
                <span style={{ color: "#888", fontSize: 14 }}>{rule.label}</span>
                <span style={{ color: rule.ok ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 600 }}>{rule.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Info Banner */}
        <div style={{ backgroundColor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <AlertCircle size={20} color="#C9A84C" />
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>
            <span style={{ color: "#C9A84C", fontWeight: 600 }}>Note:</span> This dashboard shows simulated data. Connect your cTrader account in Settings to see real trading statistics.
          </p>
        </div>

        {/* Payout Button */}
        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Request a Payout</div>
            <div style={{ color: "#555", fontSize: 13 }}>Submit your payout request — processed within 24-48h</div>
          </div>
          <button onClick={() => setShowPayout(true)} className="btn-primary" style={{ padding: "10px 24px", fontSize: 13 }}>
            Request Payout
          </button>
        </div>
      </div>

      {/* Payout Modal */}
      {showPayout && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 20, padding: 40, width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800 }}>Request Payout</h2>
              <button onClick={() => setShowPayout(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#555" }}><X size={20} /></button>
            </div>

            {payoutSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ color: "#22c55e", fontSize: 40, marginBottom: 16 }}>✅</div>
                <div style={{ fontWeight: 700, fontSize: 18 }}>Request Submitted!</div>
                <div style={{ color: "#555", fontSize: 14, marginTop: 8 }}>We'll process it within 24-48 hours.</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#888", fontSize: 13, marginBottom: 8 }}>Amount (USD)</label>
                  <input type="number" placeholder="e.g. 1500" value={payoutForm.amount}
                    onChange={e => setPayoutForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#070707", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#888", fontSize: 13, marginBottom: 8 }}>Payment Method</label>
                  <select value={payoutForm.payment_method} onChange={e => setPayoutForm(f => ({ ...f, payment_method: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#070707", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none" }}>
                    <option value="crypto">Crypto (USDT/BTC)</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", color: "#888", fontSize: 13, marginBottom: 8 }}>
                    {payoutForm.payment_method === "crypto" ? "Wallet Address" : "IBAN"}
                  </label>
                  <input type="text" placeholder={payoutForm.payment_method === "crypto" ? "0x... or T..." : "FR76..."}
                    value={payoutForm.wallet_address}
                    onChange={e => setPayoutForm(f => ({ ...f, wallet_address: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#070707", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <button onClick={handlePayoutSubmit} disabled={payoutLoading || !payoutForm.amount || !payoutForm.wallet_address}
                  className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 15, opacity: payoutLoading ? 0.7 : 1 }}>
                  {payoutLoading ? "Submitting..." : "Submit Request"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
