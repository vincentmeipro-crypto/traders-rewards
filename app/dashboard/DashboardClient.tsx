"use client";
import React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/LanguageContext";
import { languages } from "@/lib/translations";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { LogOut, TrendingUp, ShieldCheck, Clock, Trophy, ChevronRight, LayoutDashboard, Wallet, BookOpen, Settings, Lock, CheckCircle, Target, Calendar, TrendingDown, Shield, BarChart2, Percent, Award, History, FileText, Upload, User as UserIcon, AlertTriangle, Users } from "lucide-react";

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
  mt5_login?: number;
  mt5_password?: string;
  mt5_password_investor?: string;
  mt5_server?: string;
  ctrader_account_id?: string;
  ctrader_login?: string;
  ctrader_password?: string;
  server?: string;
  client_first_name?: string;
  client_last_name?: string;
  last_synced_at?: string;
  breach_at?: string;
  breach_reason?: string;
  breach_value?: number;
  daily_dd?: number;
  highest_balance?: number;
  breach_equity?: number;
  best_day_profit?: number;
};

function ProgressBar({ value, max, color = "#00C2FF", danger = false }: { value: number; max: number; color?: string; danger?: boolean }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = danger && pct > 70 ? "#ef4444" : danger && pct > 40 ? "#1565C0" : color;
  return (
    <div style={{ backgroundColor: "#EBF4FF", borderRadius: 100, height: 8, overflow: "hidden", marginTop: 8 }}>
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
  const currentBal = (challenge.status === "failed" && challenge.breach_equity != null) ? challenge.breach_equity : challenge.balance;
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
            <stop offset="0%" stopColor="#1565C0" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1565C0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cgLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1565C0" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#1565C0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(r => (
          <line key={r} x1={PAD.left} y1={PAD.top + r * chartH} x2={PAD.left + chartW} y2={PAD.top + r * chartH}
            stroke="rgba(21,101,192,0.08)" strokeWidth={1} />
        ))}

        {/* Zone between floor and target: green tint */}
        <rect x={PAD.left} y={tY} width={chartW} height={fY - tY}
          fill="rgba(21,101,192,0.03)" />

        {/* Target line */}
        <line x1={PAD.left} y1={tY} x2={PAD.left + chartW} y2={tY}
          stroke="#1565C0" strokeWidth={1.5} strokeDasharray="5,4" />
        <text x={PAD.left + chartW + 6} y={tY + 4} fill="#1565C0" fontSize={9} fontWeight={800}>{fmt(targetBal)}</text>
        <text x={PAD.left - 6} y={tY + 4} fill="#1565C0" fontSize={8} textAnchor="end" fontWeight={700}>
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
          stroke="rgba(21,101,192,0.15)" strokeWidth={1} strokeDasharray="3,6" />
        <text x={PAD.left - 6} y={sY + 4} fill="#7a90b0" fontSize={8} textAnchor="end">{fmt(startBal)}</text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#cgGrad)" />

        {/* Balance line */}
        <path d={linePath} fill="none" stroke="url(#cgLine)" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Pulse ring on current point */}
        <circle cx={cX} cy={cY} r={12} fill="none" stroke="#1565C0" strokeOpacity={0}>
          <animate attributeName="r" values="8;18" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.5;0" dur="1.8s" repeatCount="indefinite" />
        </circle>

        {/* Current point dot */}
        <circle cx={cX} cy={cY} r={5} fill="#1565C0" stroke="#fff" strokeWidth={2} />

        {/* Current value label */}
        <rect x={cX - 26} y={cY - 24} width={52} height={16} rx={4} fill="#1565C0" />
        <text x={cX} y={cY - 13} fill="#fff" fontSize={9} textAnchor="middle" fontWeight={800}>
          {fmt(currentBal)}
        </text>

        {/* X-axis labels */}
        <text x={PAD.left} y={H - 6} fill="#7a90b0" fontSize={9} textAnchor="middle">
          {isFr ? "Jour 1" : "Day 1"}
        </text>
        <text x={cX} y={H - 6} fill="#1565C0" fontSize={9} textAnchor="middle" fontWeight={700}>
          {isFr ? `J.${challenge.trading_days}` : `D.${challenge.trading_days}`}
        </text>
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
        {[
          { color: "#1565C0", label: isFr ? "Solde" : "Balance" },
          { color: "#1565C0", label: isFr ? "Objectif" : "Target", dashed: true },
          { color: "#ef4444", label: isFr ? "Plancher" : "Floor", dashed: true },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <svg width={24} height={10}>
              <line x1={0} y1={5} x2={24} y2={5} stroke={item.color} strokeWidth={item.dashed ? 1.5 : 2.5}
                strokeDasharray={item.dashed ? "4,3" : undefined} />
            </svg>
            <span style={{ fontSize: 10, color: "#7a90b0", fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PHASE_LABELS: Record<string, string> = {
  phase1: "Phase 1",
  phase2: "Phase 2",
  funded: "Certified",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  passed: "Passed",
  funded: "Certified",
  failed: "Failed",
};

const STATUS_COLORS: Record<string, string> = {
  active: "#1565C0",
  passed: "#00C2FF",
  funded: "#3b82f6",
  failed: "#ef4444",
};

type Tab = "dashboard" | "challenges" | "payouts" | "kyc" | "certificates" | "history" | "invoices" | "rules" | "settings" | "profile" | "affiliate";

type AffiliateData = {
  code: string;
  link: string;
  total_conversions: number;
  total_commission: number;
  pending_commission: number;
  paid_commission: number;
  current_rate: number;
  current_tier: string;
};

function AffiliateTab({ isFr, isMobile, token }: { isFr: boolean; isMobile: boolean; token: string }) {
  const [data, setData] = useState<AffiliateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch("/api/affiliate/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const copyLink = () => {
    if (!data?.link) return;
    navigator.clipboard.writeText(data.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tiers = [
    { tier: isFr ? "Débutant" : "Starter", range: isFr ? "1 à 10 ventes" : "1 to 10 sales", pct: "10%", color: "#1565C0", bg: "rgba(21,101,192,0.08)" },
    { tier: isFr ? "Partenaire" : "Partner", range: isFr ? "11 à 29 ventes" : "11 to 29 sales", pct: "15%", color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
    { tier: isFr ? "Elite" : "Elite", range: isFr ? "30+ ventes" : "30+ sales", pct: "20%", color: "#d97706", bg: "rgba(217,119,6,0.08)" },
  ];

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{isFr ? "Programme Affiliation" : "Affiliate Program"}</h1>
      <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 28 }}>
        {isFr ? "Partagez votre lien et gagnez des commissions sur chaque vente." : "Share your link and earn commissions on every sale."}
      </p>

      {/* Tiers */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 12, marginBottom: 28 }}>
        {tiers.map((t, i) => {
          const isActive = data?.current_tier === t.tier || (isFr ? false : data?.current_tier === ["Starter", "Partner", "Elite"][i]);
          const actualActive = data && (
            (i === 0 && data.current_tier === "Débutant") ||
            (i === 1 && data.current_tier === "Partenaire") ||
            (i === 2 && data.current_tier === "Elite")
          );
          return (
            <div key={i} style={{ backgroundColor: t.bg, border: `1.5px solid ${actualActive ? t.color : t.color + "30"}`, borderRadius: 14, padding: "20px 16px", textAlign: "center", position: "relative" }}>
              {actualActive && <div style={{ position: "absolute", top: 8, right: 10, fontSize: 10, color: t.color, fontWeight: 800, background: t.bg, border: `1px solid ${t.color}50`, borderRadius: 6, padding: "2px 6px" }}>ACTIF</div>}
              <div style={{ fontSize: 11, color: t.color, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>{t.tier}</div>
              <div style={{ fontSize: 38, fontWeight: 900, color: t.color, letterSpacing: "-2px", marginBottom: 4 }}>{t.pct}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{t.range}</div>
            </div>
          );
        })}
      </div>

      {/* Mon lien */}
      <div className="card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1565C0", marginBottom: 14 }}>
          {isFr ? "Mon lien affilié" : "My affiliate link"}
        </div>
        {loading ? (
          <div style={{ color: "#7a90b0", fontSize: 13 }}>Chargement...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                {data?.link || "—"}
              </div>
              <button onClick={copyLink} style={{ padding: "10px 18px", background: copied ? "#16a34a" : "#1565C0", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.2s" }}>
                {copied ? (isFr ? "Copié !" : "Copied!") : (isFr ? "Copier" : "Copy")}
              </button>
            </div>
            <div style={{ marginTop: 10, color: "#7a90b0", fontSize: 12 }}>
              {isFr ? "Code : " : "Code: "}<span style={{ fontFamily: "monospace", fontWeight: 700, color: "#1565C0" }}>{data?.code}</span>
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: isFr ? "Ventes totales" : "Total sales", value: loading ? "—" : String(data?.total_conversions || 0), icon: "🏆" },
          { label: isFr ? "Commission totale" : "Total commission", value: loading ? "—" : `€${(data?.total_commission || 0).toFixed(2)}`, icon: "💰" },
          { label: isFr ? "En attente" : "Pending", value: loading ? "—" : `€${(data?.pending_commission || 0).toFixed(2)}`, icon: "⏳" },
          { label: isFr ? "Versé" : "Paid out", value: loading ? "—" : `€${(data?.paid_commission || 0).toFixed(2)}`, icon: "✅" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: "16px 14px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontWeight: 900, fontSize: 18, color: "#1565C0", marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: "#7a90b0", fontSize: 11 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Comment ça marche */}
      <div className="card" style={{ padding: 22, marginBottom: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#1565C0", marginBottom: 14 }}>{isFr ? "Comment ça fonctionne" : "How it works"}</div>
        {[
          { icon: "🔗", text: isFr ? "Partagez votre lien unique — il est valide à vie." : "Share your unique link — it never expires." },
          { icon: "💰", text: isFr ? "Gagnez une commission sur chaque challenge acheté via votre lien." : "Earn a commission on every challenge purchased via your link." },
          { icon: "📈", text: isFr ? "Votre taux monte automatiquement avec vos ventes (10% → 15% → 20%)." : "Your rate increases automatically with your sales (10% → 15% → 20%)." },
          { icon: "💳", text: isFr ? "Retrait dès 100€ de commissions validées, en crypto ou virement." : "Withdraw from €100 in validated commissions, via crypto or bank transfer." },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0", borderBottom: i < 3 ? "1px solid #f0f4ff" : "none" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
            <span style={{ color: "#7a90b0", fontSize: 14, lineHeight: 1.6 }}>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Retrait */}
      <div className="card" style={{ padding: 22, textAlign: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{isFr ? "Demander un retrait" : "Request a payout"}</div>
        <div style={{ color: "#7a90b0", fontSize: 13, marginBottom: 16 }}>
          {isFr ? "Minimum 100€ de commissions validées." : "Minimum €100 in validated commissions."}
        </div>
        <a href="mailto:support@elysium-rewards.com?subject=Retrait%20commission%20affiliation"
          style={{ display: "inline-block", backgroundColor: "#1565C0", color: "#fff", fontWeight: 700, fontSize: 13, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}>
          support@elysium-rewards.com
        </a>
      </div>
    </div>
  );
}

export default function DashboardClient({ user }: { user: User }) {
  const router = useRouter();
  const supabase = createClient();
  const { T, lang, setLang } = useLanguage();
  const isFr = lang === "fr";
  const [token, setToken] = useState("");
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
  const [menuOpen, setMenuOpen] = useState(false);
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
          const firstActive = data.find((c: Challenge) => c.status !== "failed") || data[0];
          setChallenge(firstActive);
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
      setToken(session.access_token);
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

  const activeChallenges = allChallenges.filter(c => c.status === "active" || c.status === "funded");

  const effectiveBalance = challenge ? (challenge.status === "failed" && challenge.breach_equity != null ? challenge.breach_equity : challenge.balance) : 0;
  const profitAmount = challenge ? effectiveBalance - challenge.start_balance : 0;
  const profitPct = challenge ? ((profitAmount / challenge.start_balance) * 100).toFixed(2) : "0";
  const targetAmount = challenge ? challenge.start_balance * (1 + challenge.profit_target / 100) : 0;
  const targetPct = challenge ? Math.min(((profitAmount / (targetAmount - challenge.start_balance)) * 100), 100).toFixed(0) : "0";
  const dailyDrawdownPct = challenge?.daily_dd ?? 0;
  const totalDrawdownRaw = challenge ? ((challenge.start_balance - effectiveBalance) / challenge.start_balance) * 100 : 0;
  const totalDrawdownPct = Math.max(0, totalDrawdownRaw).toFixed(2);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ffffff 0%, #D6EDFF 60%, #B8DFFF 100%)", backgroundAttachment: "fixed", fontFamily: "var(--font-outfit), 'Outfit', sans-serif" }}>

      {/* Sidebar — desktop only */}
      {!isMobile && (
        <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 240, backgroundColor: "#ffffff", borderRight: "1px solid rgba(21,101,192,0.12)", display: "flex", flexDirection: "column", zIndex: 50, boxShadow: "2px 0 20px rgba(21,101,192,0.06)" }}>
          <div style={{ padding: "20px 20px", borderBottom: "1px solid rgba(21,101,192,0.1)" }}>
            <img src="/logo-noir-transparent.png" alt="Elysium" style={{ width: 120, height: "auto", objectFit: "contain" }} />
          </div>

          <nav style={{ padding: "16px 12px", flex: 1, overflowY: "auto" }}>
            {([
              { icon: <LayoutDashboard size={16} />, label: T.dash.dashboard, tab: "dashboard" },
              { icon: <TrendingUp size={16} />, label: T.dash.challenges, tab: "challenges" },
              { icon: <Wallet size={16} />, label: T.dash.rewards, tab: "payouts" },
              { icon: <ShieldCheck size={16} />, label: T.dash.kyc, tab: "kyc" },
              { icon: <Award size={16} />, label: T.dash.certificates, tab: "certificates" },
              { icon: <History size={16} />, label: T.dash.history, tab: "history" },
              { icon: <FileText size={16} />, label: T.dash.invoices, tab: "invoices" },
              { icon: <BookOpen size={16} />, label: T.dash.rules, tab: "rules" },
              { icon: <Users size={16} />, label: isFr ? "Affiliation" : "Affiliate", tab: "affiliate" },
              { icon: <UserIcon size={16} />, label: T.dash.profile, tab: "profile" },
              { icon: <Settings size={16} />, label: T.dash.settings, tab: "settings" },
            ] as { icon: React.ReactNode; label: string; tab: Tab }[]).map(item => (
              <div key={item.tab} onClick={() => setActiveTab(item.tab)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderRadius: 10, marginBottom: 4, cursor: "pointer",
                backgroundColor: activeTab === item.tab ? "rgba(21,101,192,0.08)" : "transparent",
                borderLeft: activeTab === item.tab ? "2px solid #1565C0" : "2px solid transparent",
                transition: "all 0.15s",
              }}
              onMouseOver={e => { if (activeTab !== item.tab) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)"; }}
              onMouseOut={e => { if (activeTab !== item.tab) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <span style={{ color: activeTab === item.tab ? "#1565C0" : (item.tab === "kyc" && kycStatus === "approved" ? "#1565C0" : "#0D1B3E") }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: activeTab === item.tab ? 600 : 400, color: activeTab === item.tab ? "#1565C0" : (item.tab === "kyc" && kycStatus === "approved" ? "#1565C0" : "#0D1B3E") }}>{item.label}</span>
              </div>
            ))}
          </nav>

          <div style={{ padding: "12px 12px", borderTop: "1px solid rgba(21,101,192,0.1)", flexShrink: 0 }}>
            {/* Language selector */}
            <div style={{ padding: "10px 16px", marginBottom: 4, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {languages.map(l => (
                <button key={l.code} onClick={() => setLang(l.code)}
                  style={{ background: "none", border: lang === l.code ? "1px solid #1565C0" : "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: lang === l.code ? 1 : 0.5 }}>
                  <img src={`https://flagcdn.com/16x12/${l.code === "en" ? "gb" : l.code === "ar" ? "sa" : l.code === "pt" ? "br" : l.code}.png`} width={16} height={12} alt={l.code} style={{ borderRadius: 1 }} />
                </button>
              ))}
            </div>
            <div style={{ padding: "8px 16px", marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: "#7a90b0", marginBottom: 3 }}>{T.dash.loggedInAs}</div>
              <div style={{ fontSize: 12, color: "#3a5070", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
            </div>
            <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer", borderRadius: 10, color: "#7a90b0" }}
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
        <>
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, backgroundColor: "#ffffff", borderBottom: "1px solid rgba(21,101,192,0.1)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", boxShadow: "0 2px 12px rgba(21,101,192,0.06)" }}>
            <a href="/"><img src="/logo-noir-transparent.png" alt="Elysium" style={{ width: 36, height: 36, objectFit: "contain" }} /></a>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#1565C0" }}>
              {([
                { tab: "dashboard", label: T.dash.dashboard },
                { tab: "challenges", label: T.dash.challenges },
                { tab: "payouts", label: T.dash.rewards },
                { tab: "kyc", label: T.dash.kyc },
                { tab: "certificates", label: T.dash.certificates },
                { tab: "history", label: T.dash.history },
                { tab: "invoices", label: T.dash.invoices },
                { tab: "rules", label: T.dash.rules },
                { tab: "affiliate", label: isFr ? "Affiliation" : "Affiliate" },
                { tab: "profile", label: T.dash.profile },
                { tab: "settings", label: T.dash.settings },
              ] as { tab: Tab; label: string }[]).find(i => i.tab === activeTab)?.label}
            </div>
            <button onClick={() => setMenuOpen(o => !o)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", gap: 5, padding: 4 }}>
              {menuOpen ? (
                <span style={{ color: "#1565C0", fontSize: 22, lineHeight: 1 }}>✕</span>
              ) : (
                <>
                  <span style={{ display: "block", width: 22, height: 2, backgroundColor: "#1565C0", borderRadius: 2 }} />
                  <span style={{ display: "block", width: 22, height: 2, backgroundColor: "#1565C0", borderRadius: 2 }} />
                  <span style={{ display: "block", width: 22, height: 2, backgroundColor: "#1565C0", borderRadius: 2 }} />
                </>
              )}
            </button>
          </div>

          {/* Dropdown menu */}
          {menuOpen && (
            <div style={{ position: "fixed", top: 57, left: 0, right: 0, bottom: 0, backgroundColor: "#F2F8FF", zIndex: 99, overflowY: "auto", padding: "12px 0 40px" }}>
              {([
                { icon: <LayoutDashboard size={20} />, label: T.dash.dashboard, tab: "dashboard" },
                { icon: <TrendingUp size={20} />, label: T.dash.challenges, tab: "challenges" },
                { icon: <Wallet size={20} />, label: T.dash.rewards, tab: "payouts" },
                { icon: <ShieldCheck size={20} />, label: T.dash.kyc, tab: "kyc" },
                { icon: <Award size={20} />, label: T.dash.certificates, tab: "certificates" },
                { icon: <History size={20} />, label: T.dash.history, tab: "history" },
                { icon: <FileText size={20} />, label: T.dash.invoices, tab: "invoices" },
                { icon: <BookOpen size={20} />, label: T.dash.rules, tab: "rules" },
                { icon: <Users size={20} />, label: isFr ? "Affiliation" : "Affiliate", tab: "affiliate" },
                { icon: <UserIcon size={20} />, label: T.dash.profile, tab: "profile" },
                { icon: <Settings size={20} />, label: T.dash.settings, tab: "settings" },
              ] as { icon: React.ReactNode; label: string; tab: Tab }[]).map(item => (
                <button key={item.tab} onClick={() => { setActiveTab(item.tab); setMenuOpen(false); }} style={{
                  display: "flex", alignItems: "center", gap: 16, width: "100%",
                  padding: "16px 24px", background: "none", border: "none", cursor: "pointer",
                  borderBottom: "1px solid rgba(21,101,192,0.08)",
                  backgroundColor: activeTab === item.tab ? "rgba(21,101,192,0.08)" : "transparent",
                  borderLeft: activeTab === item.tab ? "3px solid #1565C0" : "3px solid transparent",
                }}>
                  <span style={{ color: activeTab === item.tab ? "#1565C0" : "#7a90b0" }}>{item.icon}</span>
                  <span style={{ fontSize: 16, fontWeight: activeTab === item.tab ? 700 : 500, color: activeTab === item.tab ? "#1565C0" : "#0D1B3E" }}>{item.label}</span>
                  {activeTab === item.tab && <ChevronRight size={16} color="#00C2FF" style={{ marginLeft: "auto" }} />}
                </button>
              ))}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #1a1a1a", marginTop: 8 }}>
                <div style={{ fontSize: 12, color: "#333", marginBottom: 12 }}>{user.email}</div>
                <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 15, fontWeight: 600, padding: 0 }}>
                  <LogOut size={18} /> {T.dash.logOut}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Main content */}
      <div style={{ marginLeft: isMobile ? 0 : 240, padding: isMobile ? "76px 16px 32px" : "32px 32px" }}>

        {/* ══ HISTORIQUE ══ */}
        {activeTab === "history" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.history}</h1>
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.dash.historySub}</p>

            {allChallenges.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#7a90b0" }}>{T.dash.noHistory}</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {allChallenges.map((c, idx) => {
                  const profit = c.balance && c.start_balance ? ((c.balance - c.start_balance) / c.start_balance * 100).toFixed(1) : null;
                  const phaseReached = c.status === "funded" ? "Certified ✓" : c.phase === "phase2" ? "Phase 2 atteinte" : c.phase === "phase1" ? "Phase 1" : c.phase;
                  const isLast = idx === allChallenges.length - 1;
                  const dotColor = c.status === "funded" ? "#3b82f6" : c.status === "failed" ? "#ef4444" : c.status === "passed" ? "#1565C0" : "#1565C0";
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
                        {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "rgba(21,101,192,0.1)", minHeight: 32 }} />}
                      </div>

                      {/* Card */}
                      <div style={{ flex: 1, backgroundColor: "#ffffff", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 14, padding: "20px 24px", marginBottom: 16 }}>
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>{c.account_size} — {c.model}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ backgroundColor: `${dotColor}20`, color: dotColor, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{STATUS_LABELS[c.status] || c.status}</span>
                              <span style={{ backgroundColor: "rgba(21,101,192,0.06)", color: "#7a90b0", fontSize: 12, padding: "3px 10px", borderRadius: 100 }}>{phaseReached}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: "#7a90b0", fontSize: 11, marginBottom: 2 }}>{T.dash.purchasedOn}</div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12, marginBottom: relatedPayouts.length > 0 ? 16 : 0 }}>
                          {[
                            { label: T.dash.startBalance, value: `$${c.start_balance?.toLocaleString()}` },
                            { label: T.dash.finalBalance, value: `$${c.balance?.toLocaleString()}` },
                            { label: "P&L", value: profit ? `${Number(profit) >= 0 ? "+" : ""}${profit}%` : "—", color: profit ? (Number(profit) >= 0 ? "#1565C0" : "#ef4444") : "#555" },
                            { label: T.dash.daysTradedLabel, value: c.trading_days?.toString() || "0" },
                            { label: T.dash.amountPaidLabel, value: `€${c.amount_paid}` },
                          ].map((s, i) => (
                            <div key={i} style={{ backgroundColor: "#F4F9FF", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ color: "#7a90b0", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                              <div style={{ fontWeight: 700, fontSize: 14, color: s.color || "#fff" }}>{s.value}</div>
                            </div>
                          ))}
                        </div>

                        {/* Récompenses liées */}
                        {relatedPayouts.length > 0 && (
                          <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 14 }}>
                            <div style={{ color: "#7a90b0", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{T.dash.rewardsSection}</div>
                            {relatedPayouts.map(p => (
                              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "#F4F9FF", borderRadius: 8, marginBottom: 6 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <Trophy size={14} color="#1565C0" />
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1565C0" }}>€{p.amount?.toLocaleString()}</span>
                                  <span style={{ fontSize: 11, color: "#7a90b0" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                                </div>
                                <span style={{ backgroundColor: p.status === "paid" ? "#1565C020" : p.status === "pending" ? "#1565C020" : "#ef444420", color: p.status === "paid" ? "#1565C0" : p.status === "pending" ? "#1565C0" : "#ef4444", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>
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
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.dash.invoicesSub}</p>

            {allChallenges.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#7a90b0" }}>{T.dash.noInvoices}</div>
            ) : (
              <>
                {/* Liste */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
                  {allChallenges.map((c, idx) => {
                    const d = new Date(c.created_at);
                    const invoiceNum = `ELY-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}-${String(allChallenges.length - idx).padStart(3,"0")}`;
                    return (
                      <div key={c.id} style={{ backgroundColor: "#ffffff", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 14, padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                          <div style={{ backgroundColor: "#F4F9FF", borderRadius: 10, padding: "8px 14px" }}>
                            <div style={{ color: "#7a90b0", fontSize: 10, marginBottom: 2 }}>N° FACTURE</div>
                            <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#1565C0" }}>{invoiceNum}</div>
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 15 }}>Challenge {c.account_size}</div>
                            <div style={{ color: "#7a90b0", fontSize: 13 }}>{c.model} — {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#1565C0" }}>€{c.amount_paid}</div>
                            <span style={{ backgroundColor: "#1565C020", color: "#1565C0", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{T.dash.paidBadge}</span>
                          </div>
                          <button onClick={() => {
                            const clientName = `${c.client_first_name || ""} ${c.client_last_name || ""}`.trim() || "—";
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
                                  <div style="color:#888;font-size:13px;margin-top:4px">elysium-rewards.com</div>
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
                                  <div style="color:#555;font-size:13px">elysium-rewards.com<br>support@elysium-rewards.com</div>
                                </div>
                                <div>
                                  <h2>Client</h2>
                                  <div style="font-weight:700">${clientName}</div>
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
                                ELYSIUM — elysium-rewards.com — Paiement reçu le ${d.toLocaleDateString("fr-FR")}<br>
                                Ce document tient lieu de facture acquittée.
                              </div>
                              <div style="text-align:center;margin-top:32px"><button onclick="window.print()" style="background:#111;color:#fff;border:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Imprimer / Télécharger PDF</button></div>
                            </body></html>`);
                            w.document.close();
                          }}
                            style={{ backgroundColor: "#1565C0", border: "none", borderRadius: 10, padding: "10px 18px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
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
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.dash.tradingRulesSub}</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              {[
                { title: isFr ? "Objectif de profit" : "Profit Target", desc: isFr ? "Phase 1 : atteindre 10% de profit. Phase 2 : atteindre 5% de profit." : "Phase 1: reach 10% profit. Phase 2: reach 5% profit.", icon: <Target size={20} color="#1565C0" /> },
                { title: isFr ? "Jours de trading minimum" : "Minimum Trading Days", desc: isFr ? "Vous devez trader au moins 4 jours différents avant de valider une phase." : "You must trade at least 4 different days before passing a phase.", icon: <Calendar size={20} color="#1565C0" /> },
                { title: isFr ? "Drawdown journalier" : "Daily Drawdown", desc: isFr ? "Votre compte ne peut pas perdre plus de 5% de sa valeur en une journée (2 Étapes) ou 3% (1 Étape)." : "Your account cannot lose more than 5% of its value in a single day (2-Step) or 3% (1-Step).", icon: <TrendingDown size={20} color="#1565C0" /> },
                { title: isFr ? "Drawdown total" : "Total Drawdown", desc: isFr ? "Votre compte ne peut pas descendre de plus de 10% sous le solde de départ." : "Your account cannot drop more than 10% below the starting balance at any time.", icon: <Shield size={20} color="#1565C0" /> },
                { title: isFr ? "Sans limite de temps" : "No Time Limit", desc: isFr ? "Prenez le temps qu'il vous faut. Il n'y a pas de date d'expiration sur votre challenge." : "Take as long as you need. There is no expiry date on your challenge.", icon: <Clock size={20} color="#1565C0" /> },
                { title: isFr ? "Tous styles de trading" : "Any Trading Style", desc: isFr ? "Scalping, swing trading, news trading — toutes les stratégies sont autorisées." : "Scalping, swing trading, news trading — all strategies are allowed.", icon: <BarChart2 size={20} color="#1565C0" /> },
                { title: isFr ? "Partage des profits" : "Reward Split", desc: isFr ? "Les traders certifiés gardent 80% des profits. Récompenses traitées sous 24-48h." : "Certified traders keep 80% of profits. Rewards processed within 24-48h.", icon: <Percent size={20} color="#1565C0" /> },
              ].map((rule, i) => (
                <div key={i} className="card" style={{ padding: 24 }}>
                  <div style={{ backgroundColor: "rgba(21,101,192,0.08)", borderRadius: 10, padding: 10, display: "inline-flex", marginBottom: 14 }}>{rule.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{rule.title}</div>
                  <div style={{ color: "#7a90b0", fontSize: 14, lineHeight: 1.6 }}>{rule.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div style={{ maxWidth: 560 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.personalInfo}</h1>
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.dash.profileSub}</p>

            {/* Personal info form */}
            <div className="card" style={{ padding: 28, marginBottom: 20 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "#1565C0" }}>{T.dash.personalInfo}</div>
              <div style={{ color: "#7a90b0", fontSize: 12, marginBottom: 20 }}>{T.dash.kycLocked}</div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 14 }}>
                {[
                  { label: T.dash.firstName, value: profileFirstName },
                  { label: T.dash.lastName, value: profileLastName },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: "block", color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>
                      {f.label} <span style={{ color: "#333", fontSize: 10 }}>🔒</span>
                    </label>
                    <input value={f.value} readOnly style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 14px", color: "#7a90b0", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>Email <span style={{ color: "#333", fontSize: 10 }}>🔒</span></label>
                <input value={user.email || ""} readOnly
                  style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 14px", color: "#7a90b0", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#666", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.birthDate} <span style={{ color: "#333", fontSize: 10 }}>🔒</span></label>
                <input value={profileBirthDate} readOnly
                  style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 14px", color: "#7a90b0", fontSize: 14, outline: "none", boxSizing: "border-box", cursor: "not-allowed" }} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.phone}</label>
                <input value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+33 6 12 34 56 78"
                  style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 14px", color: "#0D1B3E", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.address}</label>
                <input value={profileAddress} onChange={e => setProfileAddress(e.target.value)} placeholder="123 Rue de la Paix"
                  style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 14px", color: "#0D1B3E", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                {[
                  { label: T.dash.city, value: profileCity, setter: setProfileCity, placeholder: "Paris" },
                  { label: T.dash.postalCode, value: profilePostalCode, setter: setProfilePostalCode, placeholder: "75001" },
                  { label: T.dash.country, value: profileCountry, setter: setProfileCountry, placeholder: "France" },
                ].map(f => (
                  <div key={f.label}>
                    <label style={{ display: "block", color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{f.label}</label>
                    <input value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                      style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 14px", color: "#0D1B3E", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                      onFocus={e => (e.target.style.borderColor = "#1565C0")}
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
                <div style={{ backgroundColor: "rgba(21,101,192,0.1)", border: "1px solid rgba(21,101,192,0.3)", borderRadius: 10, padding: "12px 14px", color: "#1565C0", fontSize: 13, marginBottom: 14 }}>
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
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, color: "#1565C0" }}>{T.dash.changePassword}</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.newPassword}</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min. 8"
                  style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 14px", color: "#0D1B3E", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, fontWeight: 600 }}>{T.dash.confirmPassword}</label>
                <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="..."
                  style={{ width: "100%", backgroundColor: "#F4F9FF", border: `1px solid ${confirmNewPassword && newPassword === confirmNewPassword ? "#1565C0" : confirmNewPassword ? "#ef4444" : "#222"}`, borderRadius: 10, padding: "12px 14px", color: "#0D1B3E", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                  onFocus={e => (e.target.style.borderColor = newPassword === confirmNewPassword && confirmNewPassword ? "#1565C0" : "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = confirmNewPassword && newPassword === confirmNewPassword ? "#1565C0" : confirmNewPassword ? "#ef4444" : "#222")} />
              </div>

              {passwordError && (
                <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 14px", color: "#ef4444", fontSize: 13, marginBottom: 14 }}>
                  {passwordError}
                </div>
              )}
              {passwordSaved && (
                <div style={{ backgroundColor: "rgba(21,101,192,0.1)", border: "1px solid rgba(21,101,192,0.3)", borderRadius: 10, padding: "12px 14px", color: "#1565C0", fontSize: 13, marginBottom: 14 }}>
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
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.dash.manageAccount}</p>
            <div className="card" style={{ padding: 28, marginBottom: 16 }}>
              <div style={{ color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{T.dash.emailAddress}</div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{user.email}</div>
            </div>
            <div className="card" style={{ padding: 28, marginBottom: 16 }}>
              <div style={{ color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{T.dash.accountId}</div>
              <div style={{ fontSize: 13, color: "#666", fontFamily: "monospace" }}>{user.id}</div>
            </div>
            <div className="card" style={{ padding: 28, marginBottom: 24 }}>
              <div style={{ color: "#7a90b0", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{T.dash.memberSince}</div>
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
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.dash.rewardsSub}</p>
            {challenge?.phase !== "funded" ? (
              <div className="card" style={{ padding: 32, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><Lock size={40} color="#444" /></div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.dash.rewardsLocked}</div>
                <div style={{ color: "#7a90b0", fontSize: 14 }}>{T.dash.rewardsLockedSub}</div>
              </div>
            ) : kycStatus !== "approved" ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><ShieldCheck size={40} color="#1565C0" /></div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.kyc.gateTitle}</div>
                <div style={{ color: "#7a90b0", fontSize: 14, marginBottom: 24 }}>
                  {kycStatus === "pending" ? T.kyc.gatePendingMsg : kycStatus === "rejected" ? T.kyc.gateRejectedMsg : T.kyc.gateMsg}
                </div>
                <button onClick={() => setActiveTab("kyc")} className="btn-primary" style={{ padding: "12px 28px", fontSize: 14 }}>
                  {kycStatus === "pending" ? T.kyc.gateBtnPending : T.kyc.gateBtn}
                </button>
              </div>
            ) : (
              <div className="card" style={{ padding: 32 }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#7a90b0", fontSize: 13, marginBottom: 8 }}>{T.dash.amount}</label>
                  <input type="number" placeholder="e.g. 1500" value={payoutForm.amount}
                    onChange={e => setPayoutForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 16px", color: "#0D1B3E", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", color: "#7a90b0", fontSize: 13, marginBottom: 8 }}>{T.dash.paymentMethod}</label>
                  <select value={payoutForm.payment_method} onChange={e => setPayoutForm(f => ({ ...f, payment_method: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none" }}>
                    <option value="crypto">Crypto (USDT/BTC)</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>
                <div style={{ marginBottom: 28 }}>
                  <label style={{ display: "block", color: "#7a90b0", fontSize: 13, marginBottom: 8 }}>
                    {payoutForm.payment_method === "crypto" ? T.dash.walletAddress : "IBAN"}
                  </label>
                  <input type="text" placeholder={payoutForm.payment_method === "crypto" ? "0x... or T..." : "FR76..."}
                    value={payoutForm.wallet_address}
                    onChange={e => setPayoutForm(f => ({ ...f, wallet_address: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#F4F9FF", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 10, padding: "12px 16px", color: "#0D1B3E", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
                </div>
                {payoutSuccess ? (
                  <div style={{ textAlign: "center", padding: "20px 0" }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><CheckCircle size={40} color="#1565C0" /></div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{T.dash.requestSubmitted}</div>
                    <div style={{ color: "#7a90b0", fontSize: 14, marginTop: 8 }}>{T.dash.requestSubmittedSub}</div>
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
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.kyc.sub}</p>

            {kycStatus === "approved" && (
              <div style={{ backgroundColor: "rgba(21,101,192,0.08)", border: "1px solid rgba(21,101,192,0.3)", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <CheckCircle size={20} color="#1565C0" />
                <div>
                  <div style={{ color: "#1565C0", fontWeight: 700, marginBottom: 4 }}>{T.kyc.approved}</div>
                  <div style={{ color: "#7a90b0", fontSize: 13 }}>{T.kyc.approvedSub}</div>
                </div>
              </div>
            )}

            {kycStatus === "pending" && (
              <div style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <Clock size={20} color="#1565C0" />
                <div>
                  <div style={{ color: "#1565C0", fontWeight: 700, marginBottom: 4 }}>{T.kyc.pending}</div>
                  <div style={{ color: "#7a90b0", fontSize: 13 }}>{T.kyc.pendingSub}</div>
                </div>
              </div>
            )}

            {kycStatus === "rejected" && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 6 }}>{T.kyc.rejected}</div>
                {kycRejectionReason && <div style={{ color: "#7a90b0", fontSize: 13, marginBottom: 6 }}>{T.kyc.rejectedReason} {kycRejectionReason}</div>}
                <div style={{ color: "#7a90b0", fontSize: 13 }}>{T.kyc.rejectedSub}</div>
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
                        style={{ flex: 1, padding: "12px 16px", borderRadius: 10, border: kycIdType === val ? "2px solid #1565C0" : "1px solid rgba(21,101,192,0.15)", backgroundColor: kycIdType === val ? "rgba(21,101,192,0.08)" : "#F4F9FF", color: kycIdType === val ? "#1565C0" : "#7a90b0", fontSize: 13, fontWeight: kycIdType === val ? 700 : 400, cursor: "pointer" }}>
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
                    <div style={{ color: "#7a90b0", fontSize: 12, marginBottom: 10 }}>{field.hint}</div>
                    <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", backgroundColor: "#F4F9FF", border: `1px dashed ${kycFiles[field.key] ? "#1565C0" : "#2a2a2a"}`, borderRadius: 10, cursor: "pointer" }}>
                      <input type="file" accept="image/*,.pdf" style={{ display: "none" }}
                        onChange={e => setKycFiles(f => ({ ...f, [field.key]: e.target.files?.[0] || null }))} />
                      <Upload size={16} color={kycFiles[field.key] ? "#1565C0" : "#444"} />
                      <span style={{ color: kycFiles[field.key] ? "#1565C0" : "#555", fontSize: 13, flex: 1 }}>
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
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}><CheckCircle size={48} color="#1565C0" /></div>
                <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{T.kyc.successTitle}</div>
                <div style={{ color: "#7a90b0", fontSize: 14 }}>{T.kyc.successSub}</div>
              </div>
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.certificates}</h1>
            <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>{T.dash.certSub}</p>

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
                  type: "phase1", image: "/PHASE1.png", label: "Phase 1", btnColor: "#00C2FF",
                  unlocked: unlockedPhase1,
                  amount: challenge?.account_size || "$100,000",
                  date: challengeDate,
                },
                {
                  type: "challenge", image: "/CHALLENGE.png", label: "Challenge", btnColor: "#a855f7",
                  unlocked: unlockedChallenge,
                  amount: challenge?.account_size || "$100,000",
                  date: challengeDate,
                },
                {
                  type: "reward", image: "/REWARDS.png", label: "Reward", btnColor: "#1565C0",
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
                              <div style={{ color: "#7a90b0", fontSize: 12, fontWeight: 700 }}>{T.dash.notUnlocked}</div>
                            </div>
                          )}
                        </div>
                        {cert.unlocked ? (
                          <a href={href} target="_blank" style={{ display: "block", textAlign: "center", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 700, textDecoration: "none", backgroundColor: cert.btnColor, color: "#fff" }}>
                            {T.dash.openCert} {cert.label} →
                          </a>
                        ) : (
                          <div style={{ textAlign: "center", padding: "12px", borderRadius: 12, fontSize: 13, fontWeight: 700, backgroundColor: "#F4F9FF", color: "#444" }}>
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
                <p style={{ color: "#7a90b0", fontSize: 14 }}>{T.dash.challengesSub}</p>
              </div>
              <a href="/#pricing" className="btn-primary" style={{ fontSize: 13, padding: "10px 24px", textDecoration: "none" }}>{T.dash.newChallenge}</a>
            </div>
            {activeChallenges.length === 0 ? (
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <Trophy size={48} color="#00C2FF" style={{ marginBottom: 16, opacity: 0.5 }} />
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{T.dash.noChallenge}</div>
                <div style={{ color: "#7a90b0", fontSize: 14 }}>{T.dash.noChallengeSub}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {activeChallenges.map(c => {
                  const profitAmt = c.balance && c.start_balance ? c.balance - c.start_balance : 0;
                  const profitPct = c.start_balance ? ((profitAmt / c.start_balance) * 100).toFixed(2) : "0.00";
                  const isSelected = challenge?.id === c.id;
                  return (
                    <div key={c.id} onClick={() => { setChallenge(c); setActiveTab("dashboard"); }}
                      className="card" style={{ padding: 24, cursor: "pointer", border: isSelected ? "1.5px solid #00C2FF" : "1.5px solid rgba(255,255,255,0.07)", transition: "border 0.2s" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{c.account_size} — {c.model === "2step" ? "2-Step" : "1-Step"}</div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#1565C0", fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>{PHASE_LABELS[c.phase] || c.phase}</span>
                            <span style={{ backgroundColor: `${STATUS_COLORS[c.status]}20`, color: STATUS_COLORS[c.status] || "#888", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>{STATUS_LABELS[c.status] || c.status}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontWeight: 800 }}>${c.balance.toLocaleString()}</div>
                          <div style={{ color: Number(profitPct) >= 0 ? "#1565C0" : "#ef4444", fontSize: 13, fontWeight: 700 }}>
                            {Number(profitPct) >= 0 ? "+" : ""}{profitPct}%
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #1a1a1a", display: "flex", gap: 24, color: "#7a90b0", fontSize: 13, flexWrap: "wrap" }}>
                        <span>{T.dash.tradingDays}: <b style={{ color: "#7a90b0" }}>{c.trading_days}</b></span>
                        {c.mt5_login && <span>MT5: <b style={{ color: "#38bdf8", fontFamily: "monospace" }}>{c.mt5_login}</b></span>}
                        <span>{T.dash.startedOn}: <b style={{ color: "#7a90b0" }}>{new Date(c.created_at).toLocaleDateString("en-GB")}</b></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ AFFILIATION ══ */}
        {activeTab === "affiliate" && (
          <AffiliateTab isFr={isFr} isMobile={isMobile} token={token} />
        )}

        {/* Dashboard Tab */}
        {(activeTab === "dashboard") && loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
            <div style={{ color: "#1565C0", fontSize: 16 }}>Loading...</div>
          </div>
        ) : (activeTab === "dashboard") && !challenge ? (
          /* No challenge yet */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", textAlign: "center" }}>
            <Trophy size={64} color="#00C2FF" style={{ marginBottom: 24, opacity: 0.5 }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{T.dash.noChallengeTitle}</h2>
            <p style={{ color: "#7a90b0", fontSize: 15, marginBottom: 32 }}>{T.dash.noChallengeDesc}</p>
            <a href="/#pricing" className="btn-primary" style={{ padding: "14px 32px", fontSize: 15 }}>{T.dash.startChallenge}</a>
          </div>
        ) : (activeTab === "dashboard") && challenge && (
          <>
            {/* Challenge selector if multiple — failed exclus */}
            {activeChallenges.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {activeChallenges.map(c => (
                  <button key={c.id} onClick={() => setChallenge(c)} style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    border: challenge.id === c.id ? "1.5px solid #00C2FF" : "1.5px solid #333",
                    backgroundColor: challenge.id === c.id ? "rgba(0,194,255,0.1)" : "transparent",
                    color: challenge.id === c.id ? "#00C2FF" : "#555",
                    transition: "all 0.15s",
                  }}>
                    {c.account_size} · {c.model === "2step" ? "2-Step" : "1-Step"}
                  </button>
                ))}
              </div>
            )}
            {/* Loyalty banner */}
            {allChallenges.length >= 1 && (
              <div style={{ backgroundColor: "rgba(21,101,192,0.06)", border: "1px solid rgba(21,101,192,0.25)", borderRadius: 12, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🎖️</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#1565C0", fontWeight: 700, fontSize: 12 }}>
                    {isFr ? "Remise fidélité −20% à vie" : "Loyalty discount −20%"}
                  </div>
                  {!isMobile && (
                    <div style={{ color: "#7a90b0", fontSize: 11 }}>
                      {isFr ? "Appliquée automatiquement (hors promo en cours)" : "Auto-applied on future challenges"}
                    </div>
                  )}
                </div>
                <a href="/#pricing" style={{ backgroundColor: "rgba(21,101,192,0.15)", color: "#1565C0", fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {isFr ? "Nouveau →" : "New →"}
                </a>
              </div>
            )}

            {/* Header */}
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "flex-start", gap: isMobile ? 12 : 0, marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>{T.dash.myChallenge}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#1565C0", fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 100, letterSpacing: "1px" }}>
                    {PHASE_LABELS[challenge.phase] || challenge.phase} — {challenge.account_size}
                  </span>
                  <span style={{ backgroundColor: `${STATUS_COLORS[challenge.status]}20`, color: STATUS_COLORS[challenge.status] || "#888", fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 100, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: STATUS_COLORS[challenge.status] || "#888", display: "inline-block" }} />
                    {challenge.status === "funded" ? "Certified" : challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                  </span>
                </div>
              </div>
              <a href="/#pricing" className="btn-primary" style={{ fontSize: 13, padding: "10px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexShrink: 0 }}>
                {T.dash.newChallenge} <ChevronRight size={14} />
              </a>
            </div>

            {/* Phase Banner */}
            {challenge.phase === "phase2" && (
              <div style={{ backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <Trophy size={18} color="#00C2FF" />
                <span style={{ color: "#1565C0", fontWeight: 700, fontSize: 14 }}>{T.dash.phase1PassedMsg} </span>
                <span style={{ color: "#7a90b0", fontSize: 13 }}>{T.dash.phase2Msg}</span>
              </div>
            )}
            {challenge.phase === "funded" && (
              <div style={{ backgroundColor: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                <Trophy size={18} color="#3b82f6" />
                <span style={{ color: "#3b82f6", fontWeight: 700, fontSize: 14 }}>{T.dash.congratulations} </span>
                <span style={{ color: "#7a90b0", fontSize: 13 }}>{T.dash.fundedMsg}</span>
              </div>
            )}
            {challenge.status === "failed" && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: challenge.breach_reason ? 10 : 0 }}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <span style={{ color: "#ef4444", fontWeight: 700, fontSize: 14 }}>
                    {isFr ? "Challenge échoué — compte désactivé" : "Challenge failed — account disabled"}
                  </span>
                </div>
                {challenge.breach_reason && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    <div style={{ backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
                      <span style={{ color: "#7a90b0" }}>{isFr ? "Raison : " : "Reason: "}</span>
                      <span style={{ color: "#ef4444", fontWeight: 700 }}>
                        {challenge.breach_reason === "daily_drawdown"
                          ? (isFr ? "Drawdown journalier dépassé" : "Daily drawdown breached")
                          : (isFr ? "Drawdown total dépassé" : "Total drawdown breached")}
                      </span>
                    </div>
                    {challenge.breach_value != null && (
                      <div style={{ backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
                        <span style={{ color: "#7a90b0" }}>{isFr ? "Valeur atteinte : " : "Value reached: "}</span>
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>{challenge.breach_value.toFixed(2)}%</span>
                        <span style={{ color: "#7a90b0", fontSize: 12, marginLeft: 6 }}>
                          (limite : {challenge.breach_reason === "daily_drawdown" ? challenge.daily_drawdown_limit : challenge.total_drawdown_limit}%)
                        </span>
                      </div>
                    )}
                    {challenge.breach_at && (
                      <div style={{ backgroundColor: "rgba(239,68,68,0.12)", borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
                        <span style={{ color: "#7a90b0" }}>{isFr ? "Déclenché le : " : "Triggered on: "}</span>
                        <span style={{ color: "#fff", fontWeight: 600 }}>
                          {new Date(challenge.breach_at).toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TOP 2-column layout */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10, alignItems: "start", marginBottom: 10 }}>

              {/* LEFT: Balance + Account + Download */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Balance card */}
                <div className="card" style={{ padding: 24, border: "1.5px solid rgba(255,255,255,0.18)" }}>
                  <div style={{ color: "#7a90b0", fontSize: 11, textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: 6 }}>{T.dash.balance}</div>
                  <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: "-1px", marginBottom: 4 }}>
                    ${effectiveBalance.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: profitAmount >= 0 ? "#1565C0" : "#ef4444" }}>
                    {profitAmount >= 0 ? "+" : ""}${profitAmount.toLocaleString()} ({profitAmount >= 0 ? "+" : ""}{profitPct}%)
                  </div>
                </div>

                {/* Trading account */}
                {!challenge.mt5_login ? (
                  <div style={{ backgroundColor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 14, padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <Clock size={16} color="#00C2FF" />
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{T.dash.accountPending}</div>
                    </div>
                    <div style={{ color: "#7a90b0", fontSize: 13 }}>{T.dash.accountPendingMsg}</div>
                  </div>
                ) : (
                  <div style={{ backgroundColor: "rgba(21,101,192,0.05)", border: "1px solid rgba(21,101,192,0.2)", borderRadius: 14, padding: "16px 20px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#1565C0", display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle size={14} /> {T.dash.accountReady}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: T.dash.platform, value: "MetaTrader 5", copy: false },
                        { label: "Login", value: String(challenge.mt5_login), copy: true },
                        { label: T.dash.password, value: challenge.mt5_password || "—", copy: true },
                        { label: T.dash.server, value: challenge.mt5_server || "—", copy: true },
                      ].map((item, i) => (
                        <div key={i} onClick={() => item.copy && navigator.clipboard.writeText(item.value)} style={{ backgroundColor: "#F4F9FF", borderRadius: 10, padding: "10px 14px", cursor: item.copy ? "pointer" : "default" }} title={item.copy ? "Cliquer pour copier" : ""}>
                          <div style={{ color: "#7a90b0", fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>{item.label}{item.copy && <span style={{ marginLeft: 4, opacity: 0.5 }}>⎘</span>}</div>
                          <div style={{ fontSize: 13, fontWeight: 400, fontFamily: "monospace", color: "#1565C0", wordBreak: "break-all" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Download platforms */}
                <div style={{ backgroundColor: "#ffffff", border: "1px solid rgba(21,101,192,0.12)", borderRadius: 20, padding: "16px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 3 }}>
                    <img src="/MT5.png" alt="MT5" style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }} />
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{isFr ? "Télécharger les plateformes MT5" : "Download MT5 platforms"}</div>
                  </div>
                  <div style={{ color: "#1565C0", fontSize: 13, marginBottom: 12 }}>{T.dash.downloadSub}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[
                      { label: "🖥 Windows", href: "https://download.terminal.free/cdn/web/starwave.fx.ltd/mt5/starwavefx5setup.exe" },
                      { label: "🍎 Mac", href: "https://download.terminal.free/cdn/web/metaquotes.software.corp/mt5/MetaTrader5.pkg.zip?utm_campaign=metatrader5.help" },
                      { label: "📱 iOS", href: "https://apps.apple.com/app/metatrader-5/id413251709" },
                      { label: "🤖 Android", href: "https://play.google.com/store/apps/details?id=net.metaquotes.metatrader5" },
                    ].map((item, i) => (
                      <a key={i} href={item.href} target="_blank" rel="noopener noreferrer"
                        style={{ backgroundColor: "#F4F9FF", color: "#0D1B3E", fontWeight: 600, padding: "9px 14px", borderRadius: 8, textDecoration: "none", fontSize: 12, border: "1px solid rgba(21,101,192,0.18)", display: "inline-block" }}>
                        {item.label}
                      </a>
                    ))}
                  </div>
                </div>

              </div>

              {/* RIGHT: Rules checklist */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                {/* Rules checklist */}
                <div className="card" style={{ padding: 24, border: "1.5px solid rgba(255,255,255,0.18)" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: "#0D1B3E" }}>{T.dash.rulesStatus}</div>
                  {(() => {
                    const b = challenge.start_balance;
                    const profitUSD  = Math.round(b * challenge.profit_target / 100);
                    const dailyUSD   = Math.round(b * challenge.daily_drawdown_limit / 100);
                    const totalUSD   = Math.round(b * challenge.total_drawdown_limit / 100);
                    const rules = [
                      {
                        label: T.dash.profitTarget,
                        pct: `${challenge.profit_target}%`,
                        usd: `+$${profitUSD.toLocaleString()}`,
                        usdColor: "#1565C0",
                        ok: parseFloat(profitPct) >= challenge.profit_target,
                        status: parseFloat(profitPct) >= challenge.profit_target ? T.dash.passed : `${profitPct}% / ${challenge.profit_target}%`,
                      },
                      {
                        label: `Min. ${T.dash.tradingDays}`,
                        pct: "4 jours",
                        usd: null,
                        usdColor: "#fff",
                        ok: challenge.trading_days >= 4,
                        status: challenge.trading_days >= 4 ? T.dash.passed : `${challenge.trading_days} / 4`,
                      },
                      {
                        label: T.dash.dailyDrawdown,
                        pct: `${challenge.daily_drawdown_limit}%`,
                        usd: `-$${dailyUSD.toLocaleString()}`,
                        usdColor: "#ef4444",
                        ok: dailyDrawdownPct < challenge.daily_drawdown_limit,
                        violated: dailyDrawdownPct >= challenge.daily_drawdown_limit,
                        isDrawdown: true,
                        status: dailyDrawdownPct >= challenge.daily_drawdown_limit
                          ? T.dash.violated
                          : `-${dailyDrawdownPct.toFixed(2)}% / ${challenge.daily_drawdown_limit}%`,
                      },
                      {
                        label: T.dash.totalDrawdown,
                        pct: `${challenge.total_drawdown_limit}%`,
                        usd: `-$${totalUSD.toLocaleString()}`,
                        usdColor: "#ef4444",
                        ok: parseFloat(totalDrawdownPct) < challenge.total_drawdown_limit,
                        violated: parseFloat(totalDrawdownPct) >= challenge.total_drawdown_limit,
                        isDrawdown: true,
                        status: parseFloat(totalDrawdownPct) >= challenge.total_drawdown_limit
                          ? T.dash.violated
                          : `-${totalDrawdownPct}% / ${challenge.total_drawdown_limit}%`,
                      },
                      ...(challenge.model === "1step" ? [
                        (() => {
                          const maxBestDay = b * challenge.profit_target / 100 * 0.5;
                          const bestDay = challenge.best_day_profit ?? 0;
                          const bestDayPct = b > 0 ? ((bestDay / b) * 100) : 0;
                          const violated = bestDay > maxBestDay;
                          return {
                            label: isFr ? "Règle meilleur jour" : "Best day rule",
                            pct: "≤ 50%",
                            usd: `≤ $${Math.round(maxBestDay).toLocaleString()}`,
                            usdColor: "#1565C0",
                            ok: !violated,
                            violated,
                            isDrawdown: false,
                            status: bestDay === 0 ? "—" : violated ? T.dash.violated : `+${bestDayPct.toFixed(2)}% / ${(challenge.profit_target * 0.5).toFixed(1)}%`,
                          };
                        })(),
                        (() => {
                          const highest = challenge.highest_balance ?? b;
                          const riskAmount = Math.round(b * challenge.total_drawdown_limit / 100);
                          const floor = highest - riskAmount;
                          const floorPct = b > 0 ? (((highest - b) / b) * 100) : 0;
                          return {
                            label: isFr ? "Plancher trailing EOD" : "Trailing EOD floor",
                            pct: `${challenge.total_drawdown_limit}% trailing`,
                            usd: `$${Math.round(floor).toLocaleString()}`,
                            usdColor: "#1565C0",
                            ok: true,
                            violated: false,
                            isDrawdown: true,
                            status: `$${Math.round(floor).toLocaleString()} (high: $${Math.round(highest).toLocaleString()})`,
                          };
                        })(),
                      ] : []),
                    ];
                    return rules.map((rule, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < rules.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: (rule as {violated?: boolean}).violated ? "#ef4444" : rule.ok ? "#1565C0" : "#1565C0", flexShrink: 0 }} />
                          <div>
                            <div style={{ color: "#7a90b0", fontSize: 13 }}>{rule.label}</div>
                            <div style={{ fontSize: 11, marginTop: 2, display: "flex", gap: 6 }}>
                              <span style={{ color: "#7a90b0" }}>{rule.pct}</span>
                              {rule.usd && <span style={{ color: rule.usdColor, fontWeight: 700 }}>{rule.usd}</span>}
                            </div>
                          </div>
                        </div>
                        <span style={{ color: (rule as {violated?: boolean}).violated ? "#ef4444" : rule.status === "—" ? "#444" : (rule as {isDrawdown?: boolean}).isDrawdown ? (rule.ok ? "#1565C0" : "#ef4444") : (rule.ok ? "#1565C0" : "#1565C0"), fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 8 }}>{rule.status}</span>
                      </div>
                    ));
                  })()}
                  {challenge.model === "1step" && challenge.highest_balance && (
                    (() => {
                      const riskAmount = Math.round(challenge.start_balance * challenge.total_drawdown_limit / 100);
                      const floor = Math.round(challenge.highest_balance! - riskAmount);
                      const buffer = Math.round(challenge.balance - floor);
                      return (
                        <div style={{ marginTop: 14, padding: "12px 14px", backgroundColor: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 10 }}>
                          <div style={{ fontSize: 11, color: "#7a90b0", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>
                            {isFr ? "Trailing EOD — 1-Step" : "Trailing EOD — 1-Step"}
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 100 }}>
                              <div style={{ fontSize: 10, color: "#7a90b0", marginBottom: 2 }}>{isFr ? "Plus haut EOD" : "EOD High"}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: "#1565C0" }}>${Math.round(challenge.highest_balance!).toLocaleString()}</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 100 }}>
                              <div style={{ fontSize: 10, color: "#7a90b0", marginBottom: 2 }}>{isFr ? "Plancher actuel" : "Current floor"}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: "#1565C0" }}>${floor.toLocaleString()}</div>
                            </div>
                            <div style={{ flex: 1, minWidth: 100 }}>
                              <div style={{ fontSize: 10, color: "#7a90b0", marginBottom: 2 }}>{isFr ? "Marge restante" : "Buffer left"}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color: buffer > 0 ? "#1565C0" : "#ef4444" }}>${buffer.toLocaleString()}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  )}
                  {challenge.phase === "funded" && (
                    <button onClick={() => setActiveTab("payouts")} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: 13, marginTop: 14 }}>
                      {T.dash.requestReward}
                    </button>
                  )}
                </div>

              </div>

            </div>

          </>
        )}
      </div>

    </div>
  );
}