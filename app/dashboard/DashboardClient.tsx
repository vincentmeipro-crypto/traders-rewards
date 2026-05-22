"use client";
import React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { languages } from "@/lib/translations";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { LogOut, TrendingUp, ShieldCheck, Clock, Trophy, ChevronRight, LayoutDashboard, Wallet, BookOpen, Settings, Lock, CheckCircle, Target, Calendar, TrendingDown, Shield, BarChart2, Percent, Award, History, FileText, Upload, User as UserIcon, AlertTriangle } from "lucide-react";

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
  client_first_name?: string;
  client_last_name?: string;
};

function ProgressBar({ value, max, color = "#2D7DD2", danger = false }: { value: number; max: number; color?: string; danger?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = danger && pct > 70 ? "#ef4444" : danger && pct > 40 ? "#f59e0b" : color;
  return (
    <div style={{ backgroundColor: "#1a1a1a", borderRadius: 100, height: 8, overflow: "hidden", marginTop: 8 }}>
      <div style={{ width: `${pct}%`, height: "100%", backgroundColor: barColor, borderRadius: 100, transition: "width 0.5s ease" }} />
    </div>
  );
}

function ChallengeChart({ challenge, isFr }: { challenge: Challenge; isFr: boolean }) {
  const W = 400;
  const H = 200;
  const PAD = { top: 24, right: 56, bottom: 36, left: 56 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const startBal = challenge.start_balance;
  const currentBal = challenge.balance;
  const targetBal = startBal * (1 + challenge.profit_target / 100);
  const floorBal = startBal * (1 - challenge.total_drawdown_limit / 100);

  const N = 14;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const noise = (Math.sin(i * 2.3) * 0.4 + Math.cos(i * 1.6) * 0.3) * 0.008 * startBal * t;
    pts.push({ x: i, y: startBal + (currentBal - startBal) * t + noise });
  }

  const minY = Math.min(floorBal * 0.998, ...pts.map(p => p.y));
  const maxY = Math.max(targetBal * 1.002, ...pts.map(p => p.y));
  const range = maxY - minY || 1;

  const toX = (i: number) => PAD.left + (i / N) * chartW;
  const toY = (v: number) => PAD.top + ((maxY - v) / range) * chartH;

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.x).toFixed(1)},${toY(p.y).toFixed(1)}`).join(" ");
  const areaPath = linePath + ` L${toX(N).toFixed(1)},${(PAD.top + chartH).toFixed(1)} L${PAD.left},${(PAD.top + chartH).toFixed(1)} Z`;

  const tY = toY(targetBal);
  const fY = toY(floorBal);
  const sY = toY(startBal);
  const cX = toX(N);
  const cY = toY(currentBal);

  const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`;

  return (
    <div style={{ position: "relative" }}>
      <style>{`
        @keyframes pulseDot { 0%,100%{r:5;opacity:1} 50%{r:8;opacity:0.5} }
        @keyframes pulseRing { 0%{r:10;opacity:0.6} 100%{r:18;opacity:0} }
      `}</style>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="cgGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2D7DD2" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2D7DD2" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cgLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2D7DD2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2D7DD2" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1={PAD.left} y1={PAD.top + r * chartH} x2={PAD.left + chartW} y2={PAD.top + r * chartH}
            stroke="#1e1e1e" strokeWidth={1} />
        ))}

        {/* Zone between floor and target: green tint */}
        <rect x={PAD.left} y={tY} width={chartW} height={fY - tY}
          fill="rgba(34,197,94,0.03)" />

        {/* Target line */}
        <line x1={PAD.left} y1={tY} x2={PAD.left + chartW} y2={tY}
          stroke="#22c55e" strokeWidth={1.5} strokeDasharray="5,4" />
        <text x={PAD.left + chartW + 6} y={tY + 4} fill="#22c55e" fontSize={9} fontWeight={800}>{fmt(targetBal)}</text>
        <text x={PAD.left - 6} y={tY + 4} fill="#22c55e" fontSize={8} textAnchor="end" fontWeight={700}>
          {isFr ? "OBJECTIF" : "TARGET"}
        </text>

        {/* Floor line */}
        <line x1={PAD.left} y1={fY} x2={PAD.left + chartW} y2={fY}
          stroke="#ef4444" strokeWidth={1.5} strokeDasharray="5,4" />
        <text x={PAD.left + chartW + 6} y={fY + 4} fill="#ef4444" fontSize={9} fontWeight={800}>{fmt(floorBal)}</text>
        <text x={PAD.left - 6} y={fY + 4} fill="#ef4444" fontSize={8} textAnchor="end" fontWeight={700}>
          {isFr ? "PLANCHER" : "FLOOR"}
        </text>

        {/* Start line (faint) */}
        <line x1={PAD.left} y1={sY} x2={PAD.left + chartW} y2={sY}
          stroke="#333" strokeWidth={1} strokeDasharray="3,6" />
        <text x={PAD.left - 6} y={sY + 4} fill="#444" fontSize={8} textAnchor="end">{fmt(startBal)}</text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#cgGrad)" />

        {/* Balance line */}
        <path d={linePath} fill="none" stroke="url(#cgLine)" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Pulse ring on current point */}
        <circle cx={cX} cy={cY} r={12} fill="none" stroke="#2D7DD2" strokeOpacity={0}>
          <animate attributeName="r" values="8;18" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.5;0" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Current point dot */}
        <circle cx={cX} cy={cY} r={5} fill="#2D7DD2" stroke="#000" strokeWidth={2} />

        {/* Current value label */}
        <rect x={cX - 26} y={cY - 24} width={52} height={16} rx={4} fill="#2D7DD2" />
        <text x={cX} y={cY - 13} fill="#fff" fontSize={9} textAnchor="middle" fontWeight={800}>
          {fmt(currentBal)}
        </text>

        {/* X-axis labels */}
        <text x={PAD.left} y={H - 6} fill="#333" fontSize={9} textAnchor="middle">
          {isFr ? "Jour 1" : "Day 1"}
        </text>
        <text x={cX} y={H - 6} fill="#2D7DD2" fontSize={9} textAnchor="middle" fontWeight={700}>
          {isFr ? `J.${challenge.trading_days}` : `D.${challenge.trading_days}`}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
        {[
          { color: "#2D7DD2", label: isFr ? "Solde" : "Balance" },
          { color: "#22c55e", label: isFr ? "Objectif" : "Target", dashed: true },
          { color: "#ef4444", label: isFr ? "Plancher" : "Floor", dashed: true },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={24} height={10}>
              <line x1={0} y1={5} x2={24} y2={5} stroke={item.color} strokeWidth={item.dashed ? 1.5 : 2.5}
                strokeDasharray={item.dashed ? "4,3" : undefined} />
            </svg>
            <span style={{ fontSize: 10, color: "#555", fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
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
  passed: "#2D7DD2",
  funded: "#3b82f6",
  failed: "#ef4444",
};

type Tab = "dashboard" | "challenges" | "payouts" | "kyc" | "certificates" | "history" | "invoices" | "rules" | "settings" | "profile";

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const { T, lang, setLang } = useLanguage();
  const isFr = lang === "fr";
  const [allChallenges, setAllChallenges] = useState<Challenge[]>([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [allPayouts, setAllPayouts] = useState<{ id: string; amount: number; created_at: string; status: string }[]>([]);
  const [latestPayout, setLatestPayout] = useState<{ amount: number; created_at: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [payoutForm, setPayoutForm] = useState({ amount: "", wallet_address: "", payment_method: "crypto" });
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [kycStatus, setKycStatus] = useState("not_submitted");
  const [kycRejectionReason, setKycRejectionReason] = useState<string | null>(null);
  const [kycIdType, setKycIdType] = useState<"card" | "passport">("card");
  const [kycFiles, setKycFiles] = useState<{ id_front: File | null; id_back: File | null; residence: File | null; selfie: File | null }>({ id_front: null, id_back: null, residence: null, selfie: null });
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycSubmitSuccess, setKycSubmitSuccess] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [profileCity, setProfileCity] = useState("");
  const [profilePostalCode, setProfilePostalCode] = useState("");
  const [profileCountry, setProfileCountry] = useState("");
  const [profileBirthDate, setProfileBirthDate] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllChallenges(data);
          setChallenge(data[0]);
        }
        setLoading(false);
      });
    supabase
      .from("payouts")
      .select("id, amount, created_at, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setAllPayouts(data);
          setLatestPayout(data[0]);
        }
      });
    fetch("/api/kyc").then(r => r.json()).then(data => {
      if (data?.kyc_status) {
        setKycStatus(data.kyc_status);
        setKycRejectionReason(data.kyc_rejection_reason || null);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json()).then(p => {
          if (!p) return;
          setProfileFirstName(p.first_name || "");
          setProfileLastName(p.last_name || "");
          setProfilePhone(p.phone || "");
          setProfileAddress(p.address || "");
          setProfileCity(p.city || "");
          setProfilePostalCode(p.postal_code || "");
          setProfileCountry(p.country || "");
          setProfileBirthDate(p.birth_date || "");
        });
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

  const handleKycSubmit = async () => {
    setKycSubmitting(true);
    setKycError(null);
    const paths: Record<string, string> = {};
    for (const [key, file] of Object.entries(kycFiles) as [string, File | null][]) {
      if (!file) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/${key}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("kyc-documents").upload(path, file, { upsert: true });
      if (error) {
        setKycError(`Upload échoué (${key}): ${error.message}`);
        setKycSubmitting(false);
        return;
      }
      paths[key] = path;
    }
    const res = await fetch("/api/kyc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ doc_id_front: paths.id_front || null, doc_id_back: paths.id_back || null, doc_residence: paths.residence || null, doc_selfie: paths.selfie || null }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setKycError(`Erreur serveur: ${err.error || res.status}`);
      setKycSubmitting(false);
      return;
    }
    setKycStatus("pending");
    setKycSubmitting(false);
    setKycSubmitSuccess(true);
  };

  const handleProfileSave = async () => {
    setProfileSaving(true);
    setProfileError(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setProfileError("Session expirée"); setProfileSaving(false); return; }
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ first_name: profileFirstName, last_name: profileLastName, phone: profilePhone, email: user.email, address: profileAddress, city: profileCity, postal_code: profilePostalCode, country: profileCountry, birth_date: profileBirthDate }),
    });
    setProfileSaving(false);
    if (!res.ok) { const e = await res.json(); setProfileError(e.error || "Erreur"); return; }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmNewPassword) { setPasswordError("Les mots de passe ne correspondent pas"); return; }
    if (newPassword.length < 8) { setPasswordError("Minimum 8 caractères"); return; }
    setPasswordSaving(true);
    setPasswordError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);
    if (error) { setPasswordError(error.message); return; }
    setPasswordSaved(true);
    setNewPassword("");
    setConfirmNewPassword("");
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const profitAmount = challenge ? challenge.balance - challenge.start_balance : 0;
  const profitPct = challenge ? ((profitAmount / challenge.start_balance) * 100).toFixed(2) : "0";
  const targetAmount = challenge ? challenge.start_balance * (1 + challenge.profit_target / 100) : 0;
  const targetPct = challenge ? Math.min(((profitAmount / (targetAmount - challenge.start_balance)) * 100), 100).toFixed(0) : "0";
  const dailyDrawdownPct = 0;
  const totalDrawdownRaw = challenge ? ((challenge.start_balance - challenge.balance) / challenge.start_balance) * 100 : 0;
  const totalDrawdownPct = Math.max(0, totalDrawdownRaw).toFixed(2);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", fontFamily: "Inter, sans-serif" }}>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, backgroundColor: "#0a0a0a", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", zIndex: 50 }}>
          <div style={{ padding: "24px 20px", borderBottom: "1px solid #1a1a1a" }}>
            <img src="/logo-white.jpg" alt="Elysium" style={{ width: 48, height: 48, objectFit: "contain", mixBlendMode: "screen" }} />
          </div>

          <nav style={{ padding: "20px 12px", flex: 1 }}>
            {([
              { icon: <LayoutDashboard size={16} />, label: T.dash.dashboard, tab: "dashboard" },
              { icon: <TrendingUp size={16} />, label: T.dash.challenges, tab: "challenges" },
              { icon: <Wallet size={16} />, label: T.dash.rewards, tab: "payouts" },
              { icon: <ShieldCheck size={16} />, label: T.dash.kyc, tab: "kyc" },
              { icon: <Award size={16} />, label: T.dash.certificates, tab: "certificates" },
              { icon: <History size={16} />, label: T.dash.history, tab: "history" },
              { icon: <FileText size={16} />, label: T.dash.invoices, tab: "invoices" },
              { icon: <BookOpen size={16} />, label: T.dash.rules, tab: "rules" },
              { icon: <UserIcon size={16} />, label: T.dash.profile, tab: "profile" },
              { icon: <Settings size={16} />, label: T.dash.settings, tab: "settings" },
            ] as { icon: React.ReactNode; label: string; tab: Tab }[]).map(item => (
              <div key={item.tab} onClick={() => setActiveTab(item.tab)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderRadius: 10, marginBottom: 4, cursor: "pointer",
                backgroundColor: activeTab === item.tab ? "rgba(201,168,76,0.1)" : "transparent",
                borderLeft: activeTab === item.tab ? "2px solid #2D7DD2" : "2px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseOver={e => { if (activeTab !== item.tab) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
              onMouseOut={e => { if (activeTab !== item.tab) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ color: activeTab === item.tab ? "#2D7DD2" : (item.tab === "kyc" && kycStatus === "approved" ? "#22c55e" : "#ffffff") }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: activeTab === item.tab ? 600 : 400, color: activeTab === item.tab ? "#2D7DD2" : (item.tab === "kyc" && kycStatus === "approved" ? "#22c55e" : "#ffffff") }}>{item.label}</span>
              </div>
            ))}
          </nav>

          <div style={{ padding: "16px 12px", borderTop: "1px solid #1a1a1a" }}>
            {/* Language selector */}
            <div style={{ padding: "10px 16px", marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {languages.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ background: "none", border: lang === l.code ? "1px solid #2D7DD2" : "1px solid #1a1a1a", borderRadius: 6, padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: lang === l.code ? 1 : 0.5 }}>
                  <img src={`https://flagcdn.com/16x12/${l.code === "en" ? "gb" : l.code === "ar" ? "sa" : l.code === "pt" ? "br" : l.code}.png`} width={16} height={12} alt={l.code} style={{ borderRadius: 1 }} />
                </button>
              ))}
            </div>
            <div style={{ padding: "12px 16px", marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "#444", marginBottom: 4 }}>{T.dash.loggedInAs}</div>
              <div style={{ fontSize: 13, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderRadius: 10, color: "#555" }}
              onMouseOver={e => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#ef4444"; }}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#555"; }}>
              <LogOut size={16} />
              <span style={{ fontSize: 14 }}>{T.dash.logOut}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top bar — mobile only */}
      {isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, backgroundColor: "#0a0a0a", borderBottom: "1px solid #1a1a1a", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px" }}>
          <a href="/"><img src="/logo-white.jpg" alt="Elysium" style={{ width: 36, height: 36, objectFit: "contain", mixBlendMode: "screen" }} /></a>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {languages.map(l => (
              <button key={l.code} onClick={() => setLang(l.code)}
                style={{ background: "none", border: lang === l.code ? "1px solid #2D7DD2" : "1px solid #1a1a1a", borderRadius: 6, padding: "3px 7px", cursor: "pointer", display: "flex", alignItems: "center", opacity: lang === l.code ? 1 : 0.4 }}>
                <img src={`https://flagcdn.com/16x12/${l.code === "en" ? "gb" : l.code === "ar" ? "sa" : l.code === "pt" ? "br" : l.code}.png`} width={16} height={12} alt={l.code} style={{ borderRadius: 1 }} />
              </button>
            ))}
          </div>
          <button onClick={handleLogout} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", display: "flex", alignItems: "center" }}>
            <LogOut size={18} />
          </button>
        </div>
      )}

      {/* Bottom nav — mobile only */}
      {isMobile && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "#0a0a0a", borderTop: "1px solid #1a1a1a", display: "flex", zIndex: 50, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {([
            { icon: <LayoutDashboard size={20} />, label: T.dash.dashboard, tab: "dashboard" },
            { icon: <TrendingUp size={20} />, label: T.dash.challenges, tab: "challenges" },
            { icon: <Wallet size={20} />, label: T.dash.rewards, tab: "payouts" },
            { icon: <ShieldCheck size={20} />, label: T.dash.kyc, tab: "kyc" },
            { icon: <UserIcon size={20} />, label: T.dash.profile, tab: "profile" },
            { icon: <Settings size={20} />, label: T.dash.settings, tab: "settings" },
          ] as { icon: React.ReactNode; label: string; tab: Tab }[]).map(item => (
            <button key={item.tab} onClick={() => setActiveTab(item.tab)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "10px 0", background: "none", border: "none", cursor: "pointer",
              color: activeTab === item.tab ? "#2D7DD2" : (item.tab === "kyc" && kycStatus === "approved" ? "#22c55e" : "#444"),
            }}>
              {item.icon}
              <span style={{ fontSize: 10, marginTop: 3, fontWeight: activeTab === item.tab ? 700 : 400 }}>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div style={{ marginLeft: isMobile ? 0 : 240, padding: isMobile ? "76px 16px 100px" : "32px 32px" }}>

        {/* ══ HISTORIQUE ══ */}
        {activeTab === "history" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.history}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.dash.historySub}</p>

            {allChallenges.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#555" }}>{T.dash.noHistory}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {allChallenges.map((c, idx) => {
                  const profit = c.balance && c.start_balance ? ((c.balance - c.start_balance) / c.start_balance * 100).toFixed(1) : null;
                  const phaseReached = c.status === "funded" ? "Certified ✓" : c.phase === "phase2" ? "Phase 2 atteinte" : c.phase === "phase1" ? "Phase 1" : c.phase;
                  const isLast = idx === allChallenges.length - 1;
                  const dotColor = c.status === "funded" ? "#3b82f6" : c.status === "failed" ? "#ef4444" : c.status === "passed" ? "#f59e0b" : "#22c55e";
                  const relatedPayouts = allPayouts.filter(p => {
                    const pd = new Date(p.created_at).getTime();
                    const cd = new Date(c.created_at).getTime();
                    const nextChallenge = allChallenges[idx - 1];
                    const nd = nextChallenge ? new Date(nextChallenge.created_at).getTime() : Date.now() + 1;
                    return pd >= cd && pd < nd;
                  });

                  return (
                    <div key={c.id} style={{ display: "flex", gap: 16 }}>
                      {/* Timeline dot + line */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
                        <div style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: dotColor, marginTop: 16, flexShrink: 0, boxShadow: `0 0 8px ${dotColor}80` }} />
                        {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "#1a1a1a", minHeight: 32 }} />}
                      </div>

                      {/* Card */}
                      <div style={{ flex: 1, backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{c.account_size} — {c.model}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ backgroundColor: `${dotColor}20`, color: dotColor, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{c.status}</span>
                              <span style={{ backgroundColor: "#1a1a1a", color: "#888", fontSize: 12, padding: "3px 10px", borderRadius: 100 }}>{phaseReached}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: "#555", fontSize: 11, marginBottom: 2 }}>{T.dash.purchasedOn}</div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: relatedPayouts.length > 0 ? 16 : 0 }}>
                          {[
                            { label: T.dash.startBalance, value: `$${c.start_balance?.toLocaleString()}` },
                            { label: T.dash.finalBalance, value: `$${c.balance?.toLocaleString()}` },
                            { label: "P&L", value: profit ? `${Number(profit) >= 0 ? "+" : ""}${profit}%` : "—", color: profit ? (Number(profit) >= 0 ? "#22c55e" : "#ef4444") : "#555" },
                            { label: T.dash.daysTradedLabel, value: c.trading_days?.toString() || "0" },
                            { label: T.dash.amountPaidLabel, value: `€${c.amount_paid}` },
                          ].map((s, i) => (
                            <div key={i} style={{ backgroundColor: "#1a1a1a", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: s.color || "#fff" }}>{s.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Récompenses liées */}
                        {relatedPayouts.length > 0 && (
                          <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 14 }}>
                            <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{T.dash.rewardsSection}</div>
                            {relatedPayouts.map(p => (
                              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#1a1a1a", borderRadius: 8, marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Trophy size={14} color="#C9A84C" />
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>€{p.amount?.toLocaleString()}</span>
                                  <span style={{ fontSize: 11, color: "#555" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                                </div>
                                <span style={{ backgroundColor: p.status === "paid" ? "#22c55e20" : p.status === "pending" ? "#f59e0b20" : "#ef444420", color: p.status === "paid" ? "#22c55e" : p.status === "pending" ? "#f59e0b" : "#ef4444", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>
                                  {p.status === "paid" ? T.dash.rewardPaid : p.status === "pending" ? T.dash.rewardPending : T.dash.rewardRejected}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ FACTURES ══ */}
        {activeTab === "invoices" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.invoices}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.dash.invoicesSub}</p>

            {allChallenges.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#555" }}>{T.dash.noInvoices}</div>
            ) : (
              <>
                {/* Liste */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {allChallenges.map((c, idx) => {
                    const d = new Date(c.created_at);
                    const invoiceNum = `ELY-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${String(allChallenges.length - idx).padStart(3,"0")}`;
                    return (
                      <div key={c.id} style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                          <div style={{ backgroundColor: "#1a1a1a", borderRadius: 10, padding: "8px 14px" }}>
                            <div style={{ color: "#555", fontSize: 10, marginBottom: 2 }}>N° FACTURE</div>
                            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#2D7DD2" }}>{invoiceNum}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Challenge {c.account_size}</div>
                            <div style={{ color: "#555", fontSize: 13 }}>{c.model} — {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e" }}>€{c.amount_paid}</div>
                            <span style={{ backgroundColor: "#22c55e20", color: "#22c55e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{T.dash.paidBadge}</span>
                          </div>
                          <button onClick={() => {
                            const name = `${c.client_first_name || ""} ${c.client_last_name || ""}`.trim() || user.email || "";
                            const w = window.open("", "_blank");
                            if (!w) return;
                            w.document.write(`<!DOCTYPE html><html><head><title>Facture ${invoiceNum}</title><style>
                              body{font-family:system-ui,sans-serif;background:#fff;color:#111;margin:0;padding:40px}
                              .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #111}
                              .logo{font-size:24px;font-weight:900;letter-spacing:-1px}
                              .badge{background:#111;color:#fff;padding:6px 16px;border-radius:100px;font-size:12px;font-weight:700}
                              h2{font-size:14px;color:#888;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px}
                              .info{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:40px}
                              table{width:100%;border-collapse:collapse;margin-bottom:32px}
                              th{text-align:left;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;padding:10px 16px;border-bottom:1px solid #eee}
                              td{padding:14px 16px;border-bottom:1px solid #f5f5f5;font-size:14px}
                              .total{text-align:right;font-size:20px;font-weight:900}
                              .footer{text-align:center;color:#aaa;font-size:12px;margin-top:60px;padding-top:20px;border-top:1px solid #eee}
                              @media print{button{display:none}}
                            </style></head><body>
                              <div class="header">
                                <div>
                                  <div class="logo">ELYSIUM</div>
                                  <div style="color:#888;font-size:13px;margin-top:4px">elysiumfunded.eu</div>
                                </div>
                                <div style="text-align:right">
                                  <div class="badge">FACTURE ACQUITTÉE</div>
                                  <div style="font-size:13px;color:#888;margin-top:8px">N° ${invoiceNum}</div>
                                </div>
                              </div>
                              <div class="info">
                                <div>
                                  <h2>Émetteur</h2>
                                  <div style="font-weight:700">ELYSIUM</div>
                                  <div style="color:#555;font-size:13px">elysiumfunded.eu<br>contact@elysiumfunded.eu</div>
                                </div>
                                <div>
                                  <h2>Client</h2>
                                  <div style="font-weight:700">${name}</div>
                                  <div style="color:#555;font-size:13px">${user.email}</div>
                                </div>
                              </div>
                              <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;color:#888">
                                <span>Date d'émission : <b style="color:#111">${d.toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })}</b></span>
                              </div>
                              <table>
                                <thead><tr><th>Description</th><th>Quantité</th><th style="text-align:right">Montant</th></tr></thead>
                                <tbody>
                                  <tr><td>Challenge de trading ${c.account_size} — ${c.model}<br><span style="color:#888;font-size:12px">Accès à la plateforme de challenge sur compte simulé</span></td><td>1</td><td style="text-align:right;font-weight:700">€${c.amount_paid}</td></tr>
                                </tbody>
                              </table>
                              <div class="total">Total TTC : €${c.amount_paid}</div>
                              <div class="footer">
                                ELYSIUM — elysiumfunded.eu — Paiement reçu le ${d.toLocaleDateString("fr-FR")}<br>
                                Ce document tient lieu de facture acquittée.
                              </div>
                              <div style="text-align:center;margin-top:32px"><button onclick="window.print()" style="background:#111;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Imprimer / Télécharger PDF</button></div>
                            </body></html>`);
                            w.document.close();
                          }}
                            style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                            {T.dash.viewInvoice}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === "rules" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.rules}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.dash.tradingRulesSub}</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              {[
                { title: "Profit Target", desc: "Phase 1: reach 10% profit. Phase 2: reach 5% profit.", icon: <Target size={20} color="#2D7DD2" /> },
                { title: "Minimum Trading Days", desc: "You must trade at least 4 different days before passing a phase.", icon: <Calendar size={20} color="#2D7DD2" /> },
                { title: "Daily Drawdown", desc: "Your account cannot lose more than 5% of its value in a single day (2-Step) or 3% (1-Step).", icon: <TrendingDown size={20} color="#2D7DD2" /> },
                { title: "Total Drawdown", desc: "Your account cannot drop more than 10% below the starting balance at any time.", icon: <Shield size={20} color="#2D7DD2" /> },
                { title: "No Time Limit", desc: "Take as long as you need. There is no expiry date on your challenge.", icon: <Clock size={20} color="#2D7DD2" /> },
                { title: "Any Trading Style", desc: "Scalping, swing trading, news trading — all strategies are allowed.", icon: <BarChart2 size={20} color="#2D7DD2" /> },
                { title: "Mandatory Stop-Loss", desc: "A stop-loss must be placed within 1 minute of entering any position. Accounts without a stop-loss may be considered in breach of the rules.", icon: <AlertTriangle size={20} color="#ef4444" /> },
                { title: "Fee Refunded", desc: "Your challenge fee is fully refunded with your first reward.", icon: <Wallet size={20} color="#2D7DD2" /> },
                { title: "Reward Split", desc: "Certified traders keep 80% of profits. Rewards processed within 24-48h.", icon: <Percent size={20} color="#2D7DD2" /> },
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

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div style={{ maxWidth: 560 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.personalInfo}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.dash.profileSub}</p>

            {/* Personal info form */}
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#C9A84C" }}>{T.dash.personalInfo}</div>
              <div style={{ color: "#555", fontSize: 12, marginBottom: 20 }}>{T.dash.kycLocked}</div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[
                  { label: T.dash.firstName, value: profileFirstName },
                  { label: T.dash.lastName, value: profileLastName },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: "block", color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>
                      {f.label} <span style={{ color: "#333", fontSize: 10 }}>🔒</span>
                    </label>
                    <input value={f.value} readOnly style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "12px 14px", color: "#555", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>Email <span style={{ color: "#333", fontSize: 10 }}>🔒</span></label>
                <input value={user.email || ""} readOnly
                  style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "12px 14px", color: "#555", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.birthDate} <span style={{ color: "#333", fontSize: 10 }}>🔒</span></label>
                <input value={profileBirthDate} readOnly
                  style={{ width: "100%", backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: "12px 14px", color: "#555", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.phone}</label>
                <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+33 6 12 34 56 78"
                  style={{ width: "100%", backgroundColor: "#141414", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.address}</label>
                <input value={profileAddress} onChange={e => setProfileAddress(e.target.value)} placeholder="123 Rue de la Paix"
                  style={{ width: "100%", backgroundColor: "#141414", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: T.dash.city, value: profileCity, setter: setProfileCity, placeholder: "Paris" },
                  { label: T.dash.postalCode, value: profilePostalCode, setter: setProfilePostalCode, placeholder: "75001" },
                  { label: T.dash.country, value: profileCountry, setter: setProfileCountry, placeholder: "France" },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: "block", color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                    <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                      style={{ width: "100%", backgroundColor: "#141414", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                      onBlur={e => (e.target.style.borderColor = "#222")} />
                  </div>
                ))}
              </div>

              {profileError && (
                <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 14px", color: "#ef4444", fontSize: 13, marginBottom: 14 }}>
                  {profileError}
                </div>
              )}
              {profileSaved && (
                <div style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 14px", color: "#22c55e", fontSize: 13, marginBottom: 14 }}>
                  {T.dash.savedOk}
                </div>
              )}

              <button onClick={handleProfileSave} disabled={profileSaving || !profileFirstName || !profileLastName}
                className="btn-primary" style={{ width: "100%", padding: "13px", fontSize: 14, opacity: (profileSaving || !profileFirstName || !profileLastName) ? 0.6 : 1 }}>
                {profileSaving ? T.dash.saving : T.dash.save}
              </button>
            </div>

            {/* Password change */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, color: "#C9A84C" }}>{T.dash.changePassword}</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.newPassword}</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8"
                  style={{ width: "100%", backgroundColor: "#141414", border: "1px solid #222", borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: "#888", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.confirmPassword}</label>
                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="..."
                  style={{ width: "100%", backgroundColor: "#141414", border: `1px solid ${confirmNewPassword && newPassword === confirmNewPassword ? "#22c55e" : confirmNewPassword ? "#ef4444" : "#222"}`, borderRadius: 10, padding: "12px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = newPassword === confirmNewPassword && confirmNewPassword ? "#22c55e" : "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = confirmNewPassword && newPassword === confirmNewPassword ? "#22c55e" : confirmNewPassword ? "#ef4444" : "#222")} />
              </div>

              {passwordError && (
                <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 14px", color: "#ef4444", fontSize: 13, marginBottom: 14 }}>
                  {passwordError}
                </div>
              )}
              {passwordSaved && (
                <div style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 14px", color: "#22c55e", fontSize: 13, marginBottom: 14 }}>
                  {T.dash.passwordOk}
                </div>
              )}

              <button onClick={handlePasswordChange} disabled={passwordSaving || !newPassword || !confirmNewPassword}
                className="btn-primary" style={{ width: "100%", padding: "13px", fontSize: 14, opacity: (passwordSaving || !newPassword || !confirmNewPassword) ? 0.6 : 1 }}>
                {passwordSaving ? T.dash.updating : T.dash.updatePassword}
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div style={{ maxWidth: 480 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.settings}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.dash.manageAccount}</p>
            <div className="card" style={{ padding: 28, marginBottom: 16 }}>
              <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{T.dash.emailAddress}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{user.email}</div>
            </div>
            <div className="card" style={{ padding: 28, marginBottom: 16 }}>
              <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{T.dash.accountId}</div>
              <div style={{ fontSize: 13, color: "#666", fontFamily: "monospace" }}>{user.id}</div>
            </div>
            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{T.dash.memberSince}</div>
              <div style={{ fontSize: 15 }}>{new Date(user.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
            </div>
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 24px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 10, cursor: "pointer", color: "#ef4444", fontWeight: 600, fontSize: 14 }}>
              <LogOut size={16} /> {T.dash.logOut}
            </button>
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === "payouts" && (
          <div style={{ maxWidth: 520 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.rewards}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.dash.rewardsSub}</p>
            {challenge?.phase !== "funded" ? (
              <div className="card" style={{ padding: 32, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Lock size={40} color="#444" /></div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.dash.rewardsLocked}</div>
                <div style={{ color: "#555", fontSize: 14 }}>{T.dash.rewardsLockedSub}</div>
              </div>
            ) : kycStatus !== "approved" ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><ShieldCheck size={40} color="#f59e0b" /></div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.kyc.gateTitle}</div>
                <div style={{ color: "#555", fontSize: 14, marginBottom: 24 }}>
                  {kycStatus === "pending" ? T.kyc.gatePendingMsg : kycStatus === "rejected" ? T.kyc.gateRejectedMsg : T.kyc.gateMsg}
                </div>
                <button onClick={() => setActiveTab("kyc")} className="btn-primary" style={{ padding: "12px 28px", fontSize: 14 }}>
                  {kycStatus === "pending" ? T.kyc.gateBtnPending : T.kyc.gateBtn}
                </button>
              </div>
            ) : (
              <div className="card" style={{ padding: 32 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#888", fontSize: 13, marginBottom: 8 }}>{T.dash.amount}</label>
                  <input type="number" placeholder="e.g. 1500" value={payoutForm.amount}
                    onChange={e => setPayoutForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#070707", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#888", fontSize: 13, marginBottom: 8 }}>{T.dash.paymentMethod}</label>
                  <select value={payoutForm.payment_method} onChange={e => setPayoutForm(f => ({ ...f, payment_method: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#070707", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none" }}>
                    <option value="crypto">Crypto (USDT/BTC)</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", color: "#888", fontSize: 13, marginBottom: 8 }}>
                    {payoutForm.payment_method === "crypto" ? T.dash.walletAddress : "IBAN"}
                  </label>
                  <input type="text" placeholder={payoutForm.payment_method === "crypto" ? "0x... or T..." : "FR76..."}
                    value={payoutForm.wallet_address}
                    onChange={e => setPayoutForm(f => ({ ...f, wallet_address: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#070707", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                {payoutSuccess ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><CheckCircle size={40} color="#22c55e" /></div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{T.dash.requestSubmitted}</div>
                    <div style={{ color: "#555", fontSize: 14, marginTop: 8 }}>{T.dash.requestSubmittedSub}</div>
                  </div>
                ) : (
                  <button onClick={handlePayoutSubmit} disabled={payoutLoading || !payoutForm.amount || !payoutForm.wallet_address}
                    className="btn-primary" style={{ width: "100%", padding: 14, fontSize: 15, opacity: payoutLoading ? 0.7 : 1 }}>
                    {payoutLoading ? T.dash.submitting : T.dash.submitReward}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* KYC Tab */}
        {activeTab === "kyc" && (
          <div style={{ maxWidth: 600 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.kyc.title}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.kyc.sub}</p>

            {kycStatus === "approved" && (
              <div style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle size={20} color="#22c55e" />
                <div>
                  <div style={{ color: "#22c55e", fontWeight: 700, marginBottom: 4 }}>{T.kyc.approved}</div>
                  <div style={{ color: "#555", fontSize: 13 }}>{T.kyc.approvedSub}</div>
                </div>
              </div>
            )}

            {kycStatus === "pending" && (
              <div style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <Clock size={20} color="#f59e0b" />
                <div>
                  <div style={{ color: "#f59e0b", fontWeight: 700, marginBottom: 4 }}>{T.kyc.pending}</div>
                  <div style={{ color: "#555", fontSize: 13 }}>{T.kyc.pendingSub}</div>
                </div>
              </div>
            )}

            {kycStatus === "rejected" && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 6 }}>{T.kyc.rejected}</div>
                {kycRejectionReason && <div style={{ color: "#888", fontSize: 13, marginBottom: 6 }}>{T.kyc.rejectedReason} {kycRejectionReason}</div>}
                <div style={{ color: "#555", fontSize: 13 }}>{T.kyc.rejectedSub}</div>
              </div>
            )}

            {(kycStatus === "not_submitted" || kycStatus === "rejected") && !kycSubmitSuccess && (
              <div className="card" style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>

                {/* ID type selector */}
                <div>
                  <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{T.kyc.idType}</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {([["card", T.kyc.idCard], ["passport", T.kyc.passport]] as const).map(([val, label]) => (
                      <button key={val} onClick={() => { setKycIdType(val); if (val === "passport") setKycFiles(f => ({ ...f, id_back: null })); }}
                        style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: kycIdType === val ? "2px solid #2D7DD2" : "1px solid #2a2a2a", backgroundColor: kycIdType === val ? "rgba(45,125,210,0.1)" : "#0a0a0a", color: kycIdType === val ? "#2D7DD2" : "#555", fontSize: 13, fontWeight: kycIdType === val ? 700 : 400, cursor: "pointer" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {([
                  { key: "id_front" as const, label: T.kyc.idFront, hint: T.kyc.idFrontHint, required: true, show: true },
                  { key: "id_back" as const, label: T.kyc.idBack, hint: T.kyc.idBackHint, required: kycIdType === "card", show: kycIdType === "card" },
                  { key: "residence" as const, label: T.kyc.residence, hint: T.kyc.residenceHint, required: true, show: true },
                  { key: "selfie" as const, label: T.kyc.selfie, hint: T.kyc.selfieHint, required: true, show: true },
                ]).filter(f => f.show).map(field => (
                  <div key={field.key}>
                    <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      {field.label} {field.required && <span style={{ color: "#ef4444" }}>*</span>}
                    </div>
                    <div style={{ color: "#555", fontSize: 12, marginBottom: 10 }}>{field.hint}</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", backgroundColor: "#0a0a0a", border: `1px dashed ${kycFiles[field.key] ? "#22c55e" : "#2a2a2a"}`, borderRadius: 10, cursor: "pointer" }}>
                      <input type="file" accept="image/*,.pdf" style={{ display: "none" }}
                        onChange={e => setKycFiles(f => ({ ...f, [field.key]: e.target.files?.[0] || null }))} />
                      <Upload size={16} color={kycFiles[field.key] ? "#22c55e" : "#444"} />
                      <span style={{ color: kycFiles[field.key] ? "#22c55e" : "#555", fontSize: 13, flex: 1 }}>
                        {kycFiles[field.key] ? (kycFiles[field.key] as File).name : T.kyc.selectFile}
                      </span>
                    </label>
                  </div>
                ))}

                {kycError && (
                  <div style={{ backgroundColor: "#ef444420", border: "1px solid #ef4444", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 13, marginBottom: 8 }}>
                    {kycError}
                  </div>
                )}
                <button
                  onClick={handleKycSubmit}
                  disabled={kycSubmitting || !kycFiles.id_front || (kycIdType === "card" && !kycFiles.id_back) || !kycFiles.residence || !kycFiles.selfie}
                  className="btn-primary"
                  style={{ padding: "14px 28px", fontSize: 15, width: "100%", opacity: (kycSubmitting || !kycFiles.id_front || (kycIdType === "card" && !kycFiles.id_back) || !kycFiles.residence || !kycFiles.selfie) ? 0.5 : 1, cursor: (kycSubmitting || !kycFiles.id_front || (kycIdType === "card" && !kycFiles.id_back) || !kycFiles.residence || !kycFiles.selfie) ? "not-allowed" : "pointer" }}>
                  {kycSubmitting ? T.kyc.submitting : T.kyc.submit}
                </button>
              </div>
            )}

            {kycSubmitSuccess && (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><CheckCircle size={48} color="#22c55e" /></div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{T.kyc.successTitle}</div>
                <div style={{ color: "#555", fontSize: 14 }}>{T.kyc.successSub}</div>
              </div>
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.certificates}</h1>
            <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>{T.dash.certSub}</p>

            {(() => {
              const firstName = challenge?.client_first_name || "";
              const lastName = challenge?.client_last_name || "";
              const name = firstName || lastName ? `${firstName} ${lastName}`.trim() : (user.email?.split("@")[0] || "Trader");
              const challengeDate = challenge ? new Date(challenge.created_at).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR");
              const payoutDate = latestPayout ? new Date(latestPayout.created_at).toLocaleDateString("fr-FR") : new Date().toLocaleDateString("fr-FR");
              const payoutAmount = latestPayout ? `$${Number(latestPayout.amount).toLocaleString()}` : "$0";

              const phase = challenge?.phase || "phase1";
              const unlockedPhase1 = phase === "phase2" || phase === "funded";
              const unlockedChallenge = phase === "funded";
              const unlockedReward = !!latestPayout;

              const certs = [
                {
                  type: "phase1", image: "/PASSED-PHASE-1.png", label: "Phase 1", btnColor: "#2D7DD2",
                  unlocked: unlockedPhase1,
                  amount: challenge?.account_size || "$100,000",
                  date: challengeDate,
                },
                {
                  type: "challenge", image: "/PASSED-CHALLENGE.png", label: "Challenge", btnColor: "#a855f7",
                  unlocked: unlockedChallenge,
                  amount: challenge?.account_size || "$100,000",
                  date: challengeDate,
                },
                {
                  type: "reward", image: "/REWARD-CERTIFICAT.png", label: "Reward", btnColor: "#C9A84C",
                  unlocked: unlockedReward,
                  amount: payoutAmount,
                  date: payoutDate,
                },
              ];

              return (
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20 }}>
                  {certs.map((cert) => {
                    const href = `/certificate?type=${cert.type}&firstname=${encodeURIComponent(firstName)}&lastname=${encodeURIComponent(lastName)}&name=${encodeURIComponent(name)}&amount=${encodeURIComponent(cert.amount)}&date=${encodeURIComponent(cert.date)}`;
                    return (
                      <div key={cert.type} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                          <img src={cert.image} alt={cert.label} style={{ width: "100%", display: "block", filter: cert.unlocked ? "none" : "brightness(0.25)" }} />
                          {!cert.unlocked && (
                            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                              <Lock size={28} color="#555" />
                              <div style={{ color: "#555", fontSize: 12, fontWeight: 700 }}>{T.dash.notUnlocked}</div>
                            </div>
                          )}
                        </div>
                        {cert.unlocked ? (
                          <a href={href} target="_blank" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none", backgroundColor: cert.btnColor, color: "#fff" }}>
                            {T.dash.openCert} {cert.label} →
                          </a>
                        ) : (
                          <div style={{ textAlign: "center", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 700, backgroundColor: "#1a1a1a", color: "#444" }}>
                            🔒 {cert.label}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Challenges Tab */}
        {activeTab === "challenges" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.challenges}</h1>
                <p style={{ color: "#555", fontSize: 14 }}>{T.dash.challengesSub}</p>
              </div>
              <a href="/#pricing" className="btn-primary" style={{ fontSize: 13, padding: "10px 24px", textDecoration: "none" }}>{T.dash.newChallenge}</a>
            </div>
            {!challenge ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <Trophy size={48} color="#2D7DD2" style={{ marginBottom: 16, opacity: 0.5 }} />
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.dash.noChallenge}</div>
                <div style={{ color: "#555", fontSize: 14 }}>{T.dash.noChallengeSub}</div>
              </div>
            ) : (
              <div className="card" style={{ padding: 28 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{challenge.account_size} — {challenge.model === "2step" ? "2-Step" : "1-Step"}</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#2D7DD2", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{PHASE_LABELS[challenge.phase] || challenge.phase}</span>
                      <span style={{ backgroundColor: `${STATUS_COLORS[challenge.status]}20`, color: STATUS_COLORS[challenge.status] || "#888", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>{challenge.status}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>${challenge.balance.toLocaleString()}</div>
                    <div style={{ color: "#555", fontSize: 13 }}>{T.dash.currentBalance}</div>
                  </div>
                </div>
                <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid #1a1a1a", display: "flex", gap: 24, color: "#555", fontSize: 13 }}>
                  <span>{T.dash.tradingDays}: <b style={{ color: "#888" }}>{challenge.trading_days}</b></span>
                  <span>{T.dash.profitTarget}: <b style={{ color: "#888" }}>{challenge.profit_target}%</b></span>
                  <span>{T.dash.startedOn}: <b style={{ color: "#888" }}>{new Date(challenge.created_at).toLocaleDateString("en-GB")}</b></span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dashboard Tab */}
        {(activeTab === "dashboard") && loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div style={{ color: "#2D7DD2", fontSize: 16 }}>Loading...</div>
          </div>
        ) : (activeTab === "dashboard") && !challenge ? (
          /* No challenge yet */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", textAlign: "center" }}>
            <Trophy size={64} color="#2D7DD2" style={{ marginBottom: 24, opacity: 0.5 }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{T.dash.noChallengeTitle}</h2>
            <p style={{ color: "#555", fontSize: 15, marginBottom: 32 }}>{T.dash.noChallengeDesc}</p>
            <a href="/#pricing" className="btn-primary" style={{ padding: "14px 32px", fontSize: 15 }}>{T.dash.startChallenge}</a>
          </div>
        ) : (activeTab === "dashboard") && challenge && (
          <>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.myChallenge}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#2D7DD2", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, letterSpacing: "1px" }}>
                    {PHASE_LABELS[challenge.phase] || challenge.phase} — {challenge.account_size}
                  </span>
                  <span style={{ backgroundColor: `${STATUS_COLORS[challenge.status]}20`, color: STATUS_COLORS[challenge.status] || "#888", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: STATUS_COLORS[challenge.status] || "#888", display: "inline-block" }} />
                    {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                  </span>
                </div>
              </div>
              <a href="/#pricing" className="btn-primary" style={{ fontSize: 13, padding: "10px 24px", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {T.dash.newChallenge} <ChevronRight size={14} />
              </a>
            </div>

            {/* Phase Banner */}
            {challenge.phase === "phase2" && (
              <div style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <Trophy size={18} color="#2D7DD2" />
                <span style={{ color: "#2D7DD2", fontWeight: 700, fontSize: 14 }}>{T.dash.phase1PassedMsg} </span>
                <span style={{ color: "#888", fontSize: 13 }}>{T.dash.phase2Msg}</span>
              </div>
            )}
            {challenge.phase === "funded" && (
              <div style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <Trophy size={18} color="#3b82f6" />
                <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 14 }}>{T.dash.congratulations} </span>
                <span style={{ color: "#888", fontSize: 13 }}>{T.dash.fundedMsg}</span>
              </div>
            )}

            {/* 2-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, alignItems: "start" }}>

              {/* LEFT: Balance + Account + Rules */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Balance card */}
                <div className="card" style={{ padding: 24, border: "1.5px solid rgba(255,255,255,0.18)" }}>
                  <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>{T.dash.balance}</div>
                  <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-1px", marginBottom: 4 }}>
                    ${challenge.balance.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: profitAmount >= 0 ? "#22c55e" : "#ef4444" }}>
                    {profitAmount >= 0 ? "+" : ""}${profitAmount.toLocaleString()} ({profitAmount >= 0 ? "+" : ""}{profitPct}%)
                  </div>
                </div>

                {/* Trading account */}
                {!challenge.ctrader_account_id ? (
                  <div style={{ backgroundColor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <Clock size={16} color="#2D7DD2" />
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{T.dash.accountPending}</div>
                    </div>
                    <div style={{ color: "#555", fontSize: 13 }}>{T.dash.accountPendingMsg}</div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 14, padding: "16px 20px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#22c55e", display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={14} /> {T.dash.accountReady}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: T.dash.platform, value: "cTrader" },
                        { label: T.dash.accountId, value: challenge.ctrader_account_id || "—" },
                        { label: T.dash.password, value: challenge.ctrader_password || "—" },
                        { label: T.dash.server, value: challenge.server || "—" },
                      ].map((item, i) => (
                        <div key={i} style={{ backgroundColor: "#0a0a0a", borderRadius: 10, padding: "10px 14px" }}>
                          <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>{item.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: "#38bdf8" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rules checklist */}
                <div className="card" style={{ padding: 24, border: "1.5px solid rgba(255,255,255,0.18)" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#fff" }}>{T.dash.rulesStatus}</div>
                  {[
                    { label: `${T.dash.profitTarget} (${challenge.profit_target}%)`, ok: parseFloat(profitPct) >= challenge.profit_target, status: parseFloat(profitPct) >= challenge.profit_target ? T.dash.passed : `${profitPct}% / ${challenge.profit_target}%` },
                    { label: `Min. ${T.dash.tradingDays} (4)`, ok: challenge.trading_days >= 4, status: challenge.trading_days >= 4 ? T.dash.passed : `${challenge.trading_days} / 4` },
                    { label: `${T.dash.dailyDrawdown} (${challenge.daily_drawdown_limit}%)`, ok: dailyDrawdownPct < challenge.daily_drawdown_limit, status: dailyDrawdownPct < challenge.daily_drawdown_limit ? T.dash.withinLimit : T.dash.violated },
                    { label: `${T.dash.totalDrawdown} (${challenge.total_drawdown_limit}%)`, ok: parseFloat(totalDrawdownPct) < challenge.total_drawdown_limit, status: parseFloat(totalDrawdownPct) < challenge.total_drawdown_limit ? T.dash.withinLimit : T.dash.violated },
                  ].map((rule, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < 3 ? "1px solid #1a1a1a" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: rule.ok ? "#22c55e" : "#f59e0b", flexShrink: 0 }} />
                        <span style={{ color: "#888", fontSize: 13 }}>{rule.label}</span>
                      </div>
                      <span style={{ color: rule.ok ? "#22c55e" : "#f59e0b", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>{rule.status}</span>
                    </div>
                  ))}
                  {challenge.phase === "funded" && (
                    <button onClick={() => setActiveTab("payouts")} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: 13, marginTop: 14 }}>
                      {T.dash.requestReward}
                    </button>
                  )}
                </div>

              </div>

              {/* RIGHT: Chart + Download */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Chart */}
                <div className="card" style={{ padding: 24, border: "1.5px solid rgba(255,255,255,0.18)" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, color: "#fff" }}>
                    {isFr ? "Évolution du Challenge" : "Challenge Evolution"}
                  </div>
                  <div style={{ fontSize: 11, color: "#444", marginBottom: 16 }}>
                    {isFr ? "Progression vs objectifs" : "Progression vs objectives"}
                  </div>
                  <ChallengeChart challenge={challenge} isFr={isFr} />
                </div>

                {/* Download platforms */}
                <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #222", borderRadius: 14, padding: "16px 20px" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{isFr ? "Télécharger les plateformes" : "Download platforms"}</div>
                  <div style={{ color: "#555", fontSize: 13, marginBottom: 12 }}>{T.dash.downloadSub}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { label: "🖥 Windows", href: "https://ctrader.com/download/ctrader-windows" },
                      { label: "🍎 Mac", href: "https://ctrader.com/download/ctrader-mac" },
                      { label: "📱 iOS", href: "https://apps.apple.com/app/ctrader/id767428811" },
                      { label: "🤖 Android", href: "https://play.google.com/store/apps/details?id=com.spotware.ct" },
                      { label: "🌐 Web", href: "https://trade.icmarkets.com" },
                    ].map((item, i) => (
                      <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                        style={{ backgroundColor: "#1a1a1a", color: "#fff", fontWeight: 600, padding: "9px 14px", borderRadius: 8, textDecoration: "none", fontSize: 12, border: "1px solid #2a2a2a", display: "inline-block" }}>
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          </>
        )}
      </div>

    </div>
  );
}