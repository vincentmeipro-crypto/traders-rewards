"use client";
import React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { LogOut, TrendingUp, ShieldCheck, Clock, Trophy, ChevronRight, LayoutDashboard, Wallet, BookOpen, Settings, Lock, CheckCircle, Target, Calendar, TrendingDown, Shield, BarChart2, Percent } from "lucide-react";

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
  ctrader_account_id?: string;
  ctrader_login?: string;
  ctrader_password?: string;
  server?: string;
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

type Tab = "dashboard" | "challenges" | "payouts" | "rules" | "settings";

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [payoutForm, setPayoutForm] = useState({ amount: "", wallet_address: "", payment_method: "crypto" });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
    setTimeout(() => { setPayoutSuccess(false); }, 2000);
  };

  const profitAmount = challenge ? challenge.balance - challenge.start_balance : 0;
  const profitPct = challenge ? ((profitAmount / challenge.start_balance) * 100).toFixed(2) : "0";
  const targetAmount = challenge ? challenge.start_balance * (1 + challenge.profit_target / 100) : 0;
  const targetPct = challenge ? Math.min(((profitAmount / (targetAmount - challenge.start_balance)) * 100), 100).toFixed(0) : "0";
  const dailyDrawdownPct = 0.8; // TODO: connect to real trading data
  const totalDrawdownPct = challenge ? (((challenge.start_balance - challenge.balance) / challenge.start_balance) * 100).toFixed(2) : "0";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", fontFamily: "Inter, sans-serif" }}>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, backgroundColor: "#0a0a0a", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", zIndex: 50 }}>
          <div style={{ padding: "24px 20px", borderBottom: "1px solid #1a1a1a" }}>
            <Image src="/logo.jpg" alt="Elysium" width={60} height={60} style={{ objectFit: "contain", mixBlendMode: "screen" }} />
          </div>

          <nav style={{ padding: "20px 12px", flex: 1 }}>
            {([
              { icon: <LayoutDashboard size={16} />, label: "Dashboard", tab: "dashboard" },
              { icon: <TrendingUp size={16} />, label: "My Challenges", tab: "challenges" },
              { icon: <Wallet size={16} />, label: "Payouts", tab: "payouts" },
              { icon: <BookOpen size={16} />, label: "Rules", tab: "rules" },
              { icon: <Settings size={16} />, label: "Settings", tab: "settings" },
            ] as { icon: React.ReactNode; label: string; tab: Tab }[]).map(item => (
              <div key={item.tab} onClick={() => setActiveTab(item.tab)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderRadius: 10, marginBottom: 4, cursor: "pointer",
                backgroundColor: activeTab === item.tab ? "rgba(201,168,76,0.1)" : "transparent",
                borderLeft: activeTab === item.tab ? "2px solid #C9A84C" : "2px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseOver={e => { if (activeTab !== item.tab) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
              onMouseOut={e => { if (activeTab !== item.tab) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ color: activeTab === item.tab ? "#C9A84C" : "#444" }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: activeTab === item.tab ? 600 : 400, color: activeTab === item.tab ? "#C9A84C" : "#555" }}>{item.label}</span>
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
      )}

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0a0a0a", borderTop: "1px solid #1a1a1a", display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {([
            { icon: <LayoutDashboard size={20} />, label: "Home", tab: "dashboard" },
            { icon: <TrendingUp size={20} />, label: "Challenge", tab: "challenges" },
            { icon: <Wallet size={20} />, label: "Payouts", tab: "payouts" },
            { icon: <BookOpen size={20} />, label: "Rules", tab: "rules" },
            { icon: <Settings size={20} />, label: "Settings", tab: "settings" },
          ] as { icon: React.ReactNode; label: string; tab: Tab }[]).map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 0", background: "none", border: "none", cursor: "pointer",
              color: activeTab === item.tab ? "#C9A84C" : "#444",
            }}>
              {item.icon}
              <span style={{ fontSize: 10, marginTop: 3, fontWeight: activeTab === item.tab ? 700 : 400 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ marginLeft: isMobile ? 0 : 240, padding: isMobile ? "20px 16px 100px" : "32px 32px" }}>

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Trading Rules</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>These rules apply to all Elysium Funded challenges.</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              {[
                { title: "Profit Target", desc: "Phase 1: reach 10% profit. Phase 2: reach 5% profit.", icon: <Target size={20} color="#C9A84C" /> },
                { title: "Minimum Trading Days", desc: "You must trade at least 4 different days before passing a phase.", icon: <Calendar size={20} color="#C9A84C" /> },
                { title: "Daily Drawdown", desc: "Your account cannot lose more than 5% of its value in a single day (2-Step) or 3% (1-Step).", icon: <TrendingDown size={20} color="#C9A84C" /> },
                { title: "Total Drawdown", desc: "Your account cannot drop more than 10% below the starting balance at any time.", icon: <Shield size={20} color="#C9A84C" /> },
                { title: "No Time Limit", desc: "Take as long as you need. There is no expiry date on your challenge.", icon: <Clock size={20} color="#C9A84C" /> },
                { title: "Any Trading Style", desc: "Scalping, swing trading, news trading — all strategies are allowed.", icon: <BarChart2 size={20} color="#C9A84C" /> },
                { title: "Fee Refunded", desc: "Your challenge fee is fully refunded with your first payout.", icon: <Wallet size={20} color="#C9A84C" /> },
                { title: "Payout Split", desc: "Funded traders keep 80% of profits. Payouts processed within 24-48h.", icon: <Percent size={20} color="#C9A84C" /> },
              ].map((rule, i) => (
                <div key={i} className="card" style={{ padding: 24 }}>
                  <div style={{ backgroundColor: "rgba(201,168,76,0.1)", borderRadius: 10, padding: 10, display: "inline-flex", marginBottom: 14 }}>{rule.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{rule.title}</div>
                  <div style={{ color: "#666", fontSize: 14, lineHeight: 1.6 }}>{rule.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Settings</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Manage your account.</p>
            <div className="card" style={{ padding: 28, marginBottom: 16 }}>
              <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Email address</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{user.email}</div>
            </div>
            <div className="card" style={{ padding: 28, marginBottom: 16 }}>
              <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Account ID</div>
              <div style={{ fontSize: 13, color: "#666", fontFamily: "monospace" }}>{user.id}</div>
            </div>
            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>Member since</div>
              <div style={{ fontSize: 15 }}>{new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, cursor: "pointer", color: "#ef4444", fontWeight: 600, fontSize: 14 }}>
              <LogOut size={16} /> Log Out
            </button>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === "payouts" && (
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Payouts</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Request a payout from your funded account.</p>
            {challenge?.phase !== "funded" ? (
              <div className="card" style={{ padding: 32, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Lock size={40} color="#444" /></div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Payouts unlocked when funded</div>
                <div style={{ color: "#555", fontSize: 14 }}>Complete Phase 1 and Phase 2 to unlock payout requests.</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 32 }}>
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
                {payoutSuccess ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><CheckCircle size={40} color="#22c55e" /></div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>Request Submitted!</div>
                    <div style={{ color: "#555", fontSize: 14, marginTop: 8 }}>We will process it within 24-48 hours.</div>
                  </div>
                ) : (
                  <button onClick={handlePayoutSubmit} disabled={payoutLoading || !payoutForm.amount || !payoutForm.wallet_address}
                    className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 15, opacity: payoutLoading ? 0.7 : 1 }}>
                    {payoutLoading ? "Submitting..." : "Submit Request"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === "challenges" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>My Challenges</h1>
                <p style={{ color: "#555", fontSize: 14 }}>Overview of all your challenges.</p>
              </div>
              <a href="/#pricing" className="btn-primary" style={{ fontSize: 13, padding: "10px 24px", textDecoration: "none" }}>+ New Challenge</a>
            </div>
            {!challenge ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <Trophy size={48} color="#C9A84C" style={{ marginBottom: 16, opacity: 0.5 }} />
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No challenge yet</div>
                <div style={{ color: "#555", fontSize: 14 }}>Purchase a challenge to start your journey.</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{challenge.account_size} — {challenge.model === "2step" ? "2-Step" : "1-Step"}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{PHASE_LABELS[challenge.phase] || challenge.phase}</span>
                      <span style={{ backgroundColor: `${STATUS_COLORS[challenge.status]}20`, color: STATUS_COLORS[challenge.status] || "#888", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>{challenge.status}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>${challenge.balance.toLocaleString()}</div>
                    <div style={{ color: "#555", fontSize: 13 }}>Current Balance</div>
                  </div>
                </div>
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #1a1a1a", display: "flex", gap: 24, color: "#555", fontSize: 13 }}>
                  <span>Trading days: <b style={{ color: "#888" }}>{challenge.trading_days}</b></span>
                  <span>Profit target: <b style={{ color: "#888" }}>{challenge.profit_target}%</b></span>
                  <span>Started: <b style={{ color: "#888" }}>{new Date(challenge.created_at).toLocaleDateString("en-GB")}</b></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Tab */}
        {(activeTab === "dashboard") && loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div style={{ color: "#C9A84C", fontSize: 16 }}>Loading...</div>
          </div>
        ) : (activeTab === "dashboard") && !challenge ? (
          /* No challenge yet */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", textAlign: "center" }}>
            <Trophy size={64} color="#C9A84C" style={{ marginBottom: 24, opacity: 0.5 }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>No Challenge Yet</h2>
            <p style={{ color: "#555", fontSize: 15, marginBottom: 32 }}>Purchase a challenge to start your journey to funded trading.</p>
            <a href="/#pricing" className="btn-primary" style={{ padding: "14px 32px", fontSize: 15 }}>Start a Challenge →</a>
          </div>
        ) : (activeTab === "dashboard") && challenge && (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>My Challenge</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, letterSpacing: "1px" }}>
                    {PHASE_LABELS[challenge.phase] || challenge.phase} — {challenge.account_size}
                  </span>
                  <span style={{ backgroundColor: `${STATUS_COLORS[challenge.status]}20`, color: STATUS_COLORS[challenge.status] || "#888", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: STATUS_COLORS[challenge.status] || "#888", display: "inline-block" }} />
                    {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
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
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 24 }}>
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
              <button onClick={() => setActiveTab("payouts")} className="btn-primary" style={{ padding: "10px 24px", fontSize: 13 }}>
                Request Payout
              </button>
            </div>

            {/* MT5 Account Credentials */}
            {!challenge.ctrader_login ? (
              <div style={{ backgroundColor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <Clock size={18} color="#C9A84C" />
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Trading Account — Pending Setup</div>
                </div>
                <div style={{ color: "#555", fontSize: 13 }}>Your trading account is being configured. You will receive your login credentials by email shortly.</div>
              </div>
            ) : (
              <div style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: "#22c55e", display: "flex", alignItems: "center", gap: 8 }}><CheckCircle size={16} /> Trading Account Ready</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {[
                    { label: "Platform", value: "cTrader" },
                    { label: "MT5 Server", value: challenge.server || "—" },
                    { label: "Login", value: challenge.ctrader_login },
                    { label: "Password", value: challenge.ctrader_password || "—" },
                  ].map((item, i) => (
                    <div key={i} style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace", color: "#38bdf8", textShadow: "0 0 8px rgba(56,189,248,0.6)" }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, color: "#555", fontSize: 12 }}>Download cTrader at ctrader.com and connect with these credentials.</div>
              </div>
            )}

            {/* Download cTrader */}
            <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "20px 24px" }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Download cTrader</div>
              <div style={{ color: "#555", fontSize: 13, marginBottom: 16 }}>Available on all platforms — use your login credentials above to connect.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {[
                  { label: "🖥 Windows", href: "https://ctrader.com/download/" },
                  { label: "🍎 Mac", href: "https://ctrader.com/download/" },
                  { label: "📱 iOS (App Store)", href: "https://apps.apple.com/app/ctrader/id767428811" },
                  { label: "🤖 Android (Google Play)", href: "https://play.google.com/store/apps/details?id=com.spotware.ct" },
                ].map((item, i) => (
                  <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                    style={{ backgroundColor: "#1a1a1a", color: "#fff", fontWeight: 600, padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontSize: 13, border: "1px solid #2a2a2a", display: "inline-block" }}>
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
