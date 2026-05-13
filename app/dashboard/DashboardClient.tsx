"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { LogOut, TrendingUp, ShieldCheck, Clock, Trophy, AlertCircle, ChevronRight, X } from "lucide-react";

type Challenge = {
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
  amount_paid: number;
  created_at: string;
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

const PHASE_LABELS: Record<string, string> = {
  phase1: "Phase 1",
  phase2: "Phase 2",
  funded: "Funded",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  passed: "#C9A84C",
  funded: "#3b82f6",
  failed: "#ef4444",
};

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayout, setShowPayout] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ amount: "", wallet_address: "", payment_method: "crypto" });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);

  useEffect(() => {
    supabase
      .from("challenges")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setChallenge(data);
        setLoading(false);
      });
  }, [user.id]);

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
      body: JSON.stringify({ ...payoutForm, amount: Number(payoutForm.amount), challenge_id: challenge?.id }),
    });
    setPayoutLoading(false);
    setPayoutSuccess(true);
    setTimeout(() => { setShowPayout(false); setPayoutSuccess(false); }, 2000);
  };

  const profitAmount = challenge ? challenge.balance - challenge.start_balance : 0;
  const profitPct = challenge ? ((profitAmount / challenge.start_balance) * 100).toFixed(2) : "0";
  const targetAmount = challenge ? challenge.start_balance * (1 + challenge.profit_target / 100) : 0;
  const targetPct = challenge ? Math.min(((profitAmount / (targetAmount - challenge.start_balance)) * 100), 100).toFixed(0) : "0";
  const dailyDrawdownPct = 0.8; // TODO: connect to real trading data
  const totalDrawdownPct = challenge ? (((challenge.start_balance - challenge.balance) / challenge.start_balance) * 100).toFixed(2) : "0";

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

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div style={{ color: "#C9A84C", fontSize: 16 }}>Loading...</div>
          </div>
        ) : !challenge ? (
          /* No challenge yet */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", textAlign: "center" }}>
            <Trophy size={64} color="#C9A84C" style={{ marginBottom: 24, opacity: 0.5 }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>No Challenge Yet</h2>
            <p style={{ color: "#555", fontSize: 15, marginBottom: 32 }}>Purchase a challenge to start your journey to funded trading.</p>
            <a href="/#pricing" className="btn-primary" style={{ padding: "14px 32px", fontSize: 15 }}>Start a Challenge →</a>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>My Challenge</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, letterSpacing: "1px" }}>
                    {PHASE_LABELS[challenge.phase] || challenge.phase} — {challenge.account_size}
                  </span>
                  <span style={{ backgroundColor: `${STATUS_COLORS[challenge.status]}20`, color: STATUS_COLORS[challenge.status] || "#888", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100 }}>
                    🟢 {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                  </span>
                </div>
              </div>
              <a href="/#pricing" className="btn-primary" style={{ fontSize: 13, padding: "10px 24px", display: "flex", alignItems: "center", gap: 8 }}>
                Buy New Challenge <ChevronRight size={14} />
              </a>
            </div>

            {/* Phase Banner for Phase 2 / Funded */}
            {challenge.phase === "phase2" && (
              <div style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <Trophy size={20} color="#C9A84C" />
                <div>
                  <span style={{ color: "#C9A84C", fontWeight: 700 }}>Phase 1 Passed! </span>
                  <span style={{ color: "#888", fontSize: 14 }}>You are now in Phase 2 — reach 5% profit to get funded.</span>
                </div>
              </div>
            )}
            {challenge.phase === "funded" && (
              <div style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
                <Trophy size={20} color="#3b82f6" />
                <div>
                  <span style={{ color: "#3b82f6", fontWeight: 700 }}>🎉 Congratulations! </span>
                  <span style={{ color: "#888", fontSize: 14 }}>You are now a Funded Trader. Request your payouts below.</span>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              {[
                { icon: <TrendingUp size={20} color="#C9A84C" />, label: "Current Balance", value: `$${challenge.balance.toLocaleString()}`, sub: `${profitAmount >= 0 ? "+" : ""}$${profitAmount.toLocaleString()} (${profitAmount >= 0 ? "+" : ""}${profitPct}%)`, subColor: profitAmount >= 0 ? "#22c55e" : "#ef4444" },
                { icon: <Trophy size={20} color="#C9A84C" />, label: "Profit Target", value: `${challenge.profit_target}%`, sub: `${targetPct}% completed`, subColor: "#C9A84C" },
                { icon: <ShieldCheck size={20} color="#C9A84C" />, label: "Trading Days", value: `${challenge.trading_days}`, sub: `Min. 4 required ${challenge.trading_days >= 4 ? "✓" : ""}`, subColor: challenge.trading_days >= 4 ? "#22c55e" : "#888" },
                { icon: <Clock size={20} color="#C9A84C" />, label: "Time Remaining", value: "Unlimited", sub: "No expiry date", subColor: "#555" },
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
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Profit Target</h3>
                  <span style={{ color: "#C9A84C", fontWeight: 700, fontSize: 15 }}>{profitPct}% / {challenge.profit_target}%</span>
                </div>
                <ProgressBar value={parseFloat(profitPct)} max={challenge.profit_target} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#555" }}>
                  <span>Start: ${challenge.start_balance.toLocaleString()}</span>
                  <span>Target: ${targetAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Daily Drawdown</h3>
                  <span style={{ color: dailyDrawdownPct > challenge.daily_drawdown_limit * 0.7 ? "#ef4444" : "#22c55e", fontWeight: 700, fontSize: 15 }}>
                    {dailyDrawdownPct}% / {challenge.daily_drawdown_limit}%
                  </span>
                </div>
                <ProgressBar value={dailyDrawdownPct} max={challenge.daily_drawdown_limit} danger />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#555" }}>
                  <span>Used today</span>
                  <span>Max allowed: {challenge.daily_drawdown_limit}%</span>
                </div>
              </div>

              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>Total Drawdown</h3>
                  <span style={{ color: parseFloat(totalDrawdownPct) > challenge.total_drawdown_limit * 0.7 ? "#ef4444" : "#22c55e", fontWeight: 700, fontSize: 15 }}>
                    {totalDrawdownPct}% / {challenge.total_drawdown_limit}%
                  </span>
                </div>
                <ProgressBar value={parseFloat(totalDrawdownPct)} max={challenge.total_drawdown_limit} danger />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 13, color: "#555" }}>
                  <span>Max loss: ${(challenge.start_balance * (1 - challenge.total_drawdown_limit / 100)).toLocaleString()}</span>
                  <span>Current: ${challenge.balance.toLocaleString()}</span>
                </div>
              </div>

              <div className="card" style={{ padding: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Rules Status</h3>
                {[
                  { label: `Profit target (${challenge.profit_target}%)`, ok: parseFloat(profitPct) >= challenge.profit_target, status: parseFloat(profitPct) >= challenge.profit_target ? "passed ✓" : "in progress" },
                  { label: "Min. trading days (4)", ok: challenge.trading_days >= 4, status: challenge.trading_days >= 4 ? "passed ✓" : `${challenge.trading_days}/4 days` },
                  { label: `Daily drawdown (${challenge.daily_drawdown_limit}%)`, ok: dailyDrawdownPct < challenge.daily_drawdown_limit, status: "within limit ✓" },
                  { label: `Total drawdown (${challenge.total_drawdown_limit}%)`, ok: parseFloat(totalDrawdownPct) < challenge.total_drawdown_limit, status: parseFloat(totalDrawdownPct) < challenge.total_drawdown_limit ? "within limit ✓" : "❌ violated" },
                ].map((rule, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? "1px solid #1a1a1a" : "none" }}>
                    <span style={{ color: "#888", fontSize: 14 }}>{rule.label}</span>
                    <span style={{ color: rule.ok ? "#22c55e" : "#C9A84C", fontSize: 13, fontWeight: 600 }}>{rule.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payout Button */}
            <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Request a Payout</div>
                <div style={{ color: "#555", fontSize: 13 }}>Submit your payout request — processed within 24-48h</div>
              </div>
              <button onClick={() => setShowPayout(true)} className="btn-primary" style={{ padding: "10px 24px", fontSize: 13 }}>
                Request Payout
              </button>
            </div>

            {/* Info Banner */}
            <div style={{ backgroundColor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 14, padding: "18px 24px", display: "flex", alignItems: "center", gap: 16 }}>
              <AlertCircle size={20} color="#C9A84C" />
              <p style={{ color: "#888", fontSize: 14, lineHeight: 1.6 }}>
                <span style={{ color: "#C9A84C", fontWeight: 600 }}>Note:</span> Balance and trading days are updated manually by our team. Connect your cTrader account in Settings for automatic synchronization.
              </p>
            </div>
          </>
        )}
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
