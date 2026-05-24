"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Challenge = {
  id: string;
  user_email: string;
  account_size: string;
  model: string;
  phase: string;
  status: string;
  balance: number;
  start_balance: number;
  amount_paid: number;
  client_first_name: string;
  client_last_name: string;
  client_phone: string;
  created_at: string;
  trading_days: number;
  ctrader_account_id: string;
  ctrader_login: string;
  ctrader_password: string;
  server: string;
  daily_drawdown_limit: number;
  total_drawdown_limit: number;
};

type PromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

type Payout = {
  id: string;
  user_id: string;
  user_email: string;
  amount: number;
  status: string;
  created_at: string;
};

type KycSubmission = {
  id: string;
  user_email: string;
  kyc_status: string;
  kyc_rejection_reason: string | null;
  kyc_submitted_at: string;
  kyc_reviewed_at: string | null;
  doc_urls: { id_front: string | null; id_back: string | null; residence: string | null; selfie: string | null };
};

type Tab = "overview" | "pipeline" | "crm" | "financier" | "payouts" | "promos" | "kyc";

const STATUS_COLORS: Record<string, string> = {
  active:  "#22c55e",
  failed:  "#ef4444",
  passed:  "#f59e0b",
  funded:  "#3b82f6",
  pending: "#f59e0b",
  paid:    "#22c55e",
  rejected:"#ef4444",
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview",  label: "Vue d'ensemble" },
  { id: "pipeline",  label: "Pipeline" },
  { id: "crm",       label: "CRM Traders" },
  { id: "financier", label: "Financier" },
  { id: "payouts",   label: "Récompenses" },
  { id: "promos",    label: "Promo Codes" },
  { id: "kyc",       label: "KYC" },
];

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px", ...style }}>{children}</div>
);

const badge = (label: string, color: string) => (
  <span style={{ backgroundColor: `${color}20`, color, padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{label}</span>
);

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [token, setToken] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pipeline state
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Challenge>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Promo state
  const [promosLoading, setPromosLoading] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", discount_percent: "", max_uses: "", expires_at: "" });
  const [promoMsg, setPromoMsg] = useState("");
  const [promoError, setPromoError] = useState("");

  // KYC state
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmission[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycRejectReason, setKycRejectReason] = useState<Record<string, string>>({});
  const [kycMsg, setKycMsg] = useState("");

  // Profiles state
  const [profiles, setProfiles] = useState<{ user_id: string; email: string | null; first_name: string | null; last_name: string | null; phone: string | null; address: string | null; city: string | null; postal_code: string | null; country: string | null }[]>([]);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncDetail, setSyncDetail] = useState("");

  // CRM state
  const [crmExpanded, setCrmExpanded] = useState<string | null>(null);

  // Admin login form state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminLoginLoading, setAdminLoginLoading] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);

  const ADMIN_EMAIL = "vincentmeipro@gmail.com";

  const loadAdminData = async (t: string) => {
    const headers = { Authorization: `Bearer ${t}` };
    const [cRes, pRes, kRes, prRes] = await Promise.all([
      fetch("/api/admin/challenges", { headers }),
      fetch("/api/admin/payouts",    { headers }),
      fetch("/api/admin/kyc",        { headers }),
      fetch("/api/admin/profiles",   { headers }),
    ]);
    const [cData, pData, kData, prData] = await Promise.all([cRes.json(), pRes.json(), kRes.json(), prRes.json()]);
    if (Array.isArray(cData)) setChallenges(cData); else setError(JSON.stringify(cData));
    if (Array.isArray(pData)) setPayouts(pData);
    if (Array.isArray(kData)) setKycSubmissions(kData);
    if (Array.isArray(prData)) setProfiles(prData);
    setLoading(false);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session || session.user.email !== ADMIN_EMAIL) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }
      const t = session.access_token;
      setToken(t);
      await loadAdminData(t);
    });
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError("");
    if (adminEmail !== ADMIN_EMAIL) { setAdminLoginError("Accès refusé"); return; }
    setAdminLoginLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
    if (error || !data.session) { setAdminLoginError("Email ou mot de passe incorrect"); setAdminLoginLoading(false); return; }
    const t = data.session.access_token;
    setToken(t);
    setNeedsLogin(false);
    setLoading(true);
    await loadAdminData(t);
  };

  const loadPromos = async (t: string) => {
    setPromosLoading(true);
    const res = await fetch("/api/admin/promo-codes", { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (Array.isArray(data)) setPromos(data);
    setPromosLoading(false);
  };

  const loadKyc = async (t: string) => {
    setKycLoading(true);
    const res = await fetch("/api/admin/kyc", { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (Array.isArray(data)) setKycSubmissions(data);
    setKycLoading(false);
  };

  useEffect(() => {
    if (tab === "promos" && token && promos.length === 0) loadPromos(token);
  }, [tab, token]);

  useEffect(() => {
    if ((tab === "kyc" || tab === "crm") && token) loadKyc(token);
  }, [tab, token]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth();

    const inYear  = (d: string) => new Date(d).getFullYear() === yr;
    const inMonth = (d: string) => { const dt = new Date(d); return dt.getFullYear() === yr && dt.getMonth() === mo; };

    const caYear  = challenges.filter(c => inYear(c.created_at)).reduce((s, c) => s + (c.amount_paid || 0), 0);
    const caMonth = challenges.filter(c => inMonth(c.created_at)).reduce((s, c) => s + (c.amount_paid || 0), 0);
    const pyYear  = payouts.filter(p => p.status === "paid" && inYear(p.created_at)).reduce((s, p) => s + p.amount, 0);
    const pyMonth = payouts.filter(p => p.status === "paid" && inMonth(p.created_at)).reduce((s, p) => s + p.amount, 0);
    const margeYear  = caYear  > 0 ? Math.round((caYear  - pyYear)  / caYear  * 100) : 0;
    const margeMonth = caMonth > 0 ? Math.round((caMonth - pyMonth) / caMonth * 100) : 0;

    const is1Step = (m: string) => m?.toLowerCase().replace(/[\s-]/g, "").includes("1step");

    const totalTraders  = new Set(challenges.map(c => c.user_email)).size;
    const activeTraders = new Set(challenges.filter(c => c.status === "active").map(c => c.user_email)).size;
    const phase1    = challenges.filter(c => c.phase === "phase1" && c.status === "active" && !is1Step(c.model)).length;
    const oneStep   = challenges.filter(c => c.status === "active" && is1Step(c.model)).length;
    const phase2    = challenges.filter(c => c.phase === "phase2" && c.status === "active").length;
    const passed    = challenges.filter(c => c.status === "passed").length;
    const certified = challenges.filter(c => c.status === "funded").length;
    const failed    = challenges.filter(c => c.status === "failed").length;
    const total     = challenges.length;

    const pendingPayouts = payouts.filter(p => p.status === "pending");
    const pendingAmt = pendingPayouts.reduce((s, p) => s + p.amount, 0);

    const reachedP2  = challenges.filter(c => ["phase2","funded","passed"].includes(c.phase) || c.status === "funded").length;
    const convP1P2   = total    > 0 ? Math.round(reachedP2 / total * 100)    : 0;
    const convP2Fund = reachedP2 > 0 ? Math.round(certified / reachedP2 * 100) : 0;

    const traderSpend = new Map<string, number>();
    challenges.forEach(c => traderSpend.set(c.user_email, (traderSpend.get(c.user_email) || 0) + (c.amount_paid || 0)));
    const ltv = traderSpend.size > 0 ? Array.from(traderSpend.values()).reduce((s, v) => s + v, 0) / traderSpend.size : 0;

    const alerts = challenges.filter(c => {
      if (c.status !== "active" || !c.start_balance || !c.balance) return false;
      const dd = (c.start_balance - c.balance) / c.start_balance * 100;
      const limit = c.total_drawdown_limit || 10;
      return dd >= limit * 0.75;
    });

    return { caYear, caMonth, margeYear, margeMonth, totalTraders, activeTraders, phase1, oneStep, phase2, passed, certified, failed, total, pendingPayouts: pendingPayouts.length, pendingAmt, convP1P2, convP2Fund, ltv, alerts };
  }, [challenges, payouts]);

  /* ── Monthly revenue ── */
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, { ca: number; payoutsAmt: number; count: number }>();
    challenges.forEach(c => {
      const d = new Date(c.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const ex = map.get(key) || { ca: 0, payoutsAmt: 0, count: 0 };
      ex.ca += c.amount_paid || 0; ex.count += 1;
      map.set(key, ex);
    });
    payouts.filter(p => p.status === "paid").forEach(p => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const ex = map.get(key) || { ca: 0, payoutsAmt: 0, count: 0 };
      ex.payoutsAmt += p.amount;
      map.set(key, ex);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({ month, ...v, marge: v.ca > 0 ? Math.round((v.ca - v.payoutsAmt) / v.ca * 100) : 0 }));
  }, [challenges, payouts]);

  /* ── CA par taille de compte ── */
  const byAccountSize = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number; active: number; certified: number; failed: number }>();
    challenges.forEach(c => {
      const key = c.account_size;
      const ex = map.get(key) || { count: 0, revenue: 0, active: 0, certified: 0, failed: 0 };
      ex.count   += 1;
      ex.revenue += c.amount_paid || 0;
      if (c.status === "active" || c.status === "passed") ex.active    += 1;
      if (c.status === "funded")                          ex.certified += 1;
      if (c.status === "failed")                          ex.failed    += 1;
      map.set(key, ex);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => parseInt(a.replace(/\D/g, "")) - parseInt(b.replace(/\D/g, "")))
      .map(([size, v]) => ({ size, ...v }));
  }, [challenges]);

  /* ── CRM ── */
  const traderCRM = useMemo(() => {
    const map = new Map<string, { email: string; name: string; challenges: Challenge[]; totalSpent: number; firstDate: string }>();
    challenges.forEach(c => {
      const ex = map.get(c.user_email) || { email: c.user_email, name: `${c.client_first_name || ""} ${c.client_last_name || ""}`.trim() || c.user_email, challenges: [], totalSpent: 0, firstDate: c.created_at };
      ex.challenges.push(c);
      ex.totalSpent += c.amount_paid || 0;
      if (c.created_at < ex.firstDate) ex.firstDate = c.created_at;
      map.set(c.user_email, ex);
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [challenges]);

  /* ── Actions ── */
  const saveChallenge = async (id: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/challenges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id, ...editData }),
    });
    const updated = await res.json();
    if (!res.ok || updated.error) { alert(`Erreur : ${updated.error}`); return; }
    setChallenges(cs => cs.map(c => c.id === id ? { ...c, ...updated } : c));
    setEditing(null); setEditData({});
  };

  const deleteChallenge = async (id: string) => {
    if (!confirm("Supprimer ce challenge ?")) return;
    await fetch("/api/admin/challenges", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    setChallenges(cs => cs.filter(x => x.id !== id));
  };

  const updatePayout = async (id: string, status: string) => {
    if (!token) return;
    const res = await fetch("/api/admin/payouts", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (res.ok) setPayouts(ps => ps.map(p => p.id === id ? { ...p, ...data } : p));
  };

  const createPromo = async () => {
    if (!token || !newCode.code || !newCode.discount_percent) return;
    setPromoError("");
    const res = await fetch("/api/admin/promo-codes", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ code: newCode.code, discount_percent: Number(newCode.discount_percent), max_uses: newCode.max_uses ? Number(newCode.max_uses) : null, expires_at: newCode.expires_at || null }) });
    const data = await res.json();
    if (res.ok) { setPromos(p => [data, ...p]); setNewCode({ code: "", discount_percent: "", max_uses: "", expires_at: "" }); setPromoMsg("Code créé !"); setTimeout(() => setPromoMsg(""), 3000); }
    else setPromoError(data.error || "Erreur");
  };

  const togglePromo = async (promo: PromoCode) => {
    if (!token) return;
    const res = await fetch("/api/admin/promo-codes", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: promo.id, active: !promo.active }) });
    const data = await res.json();
    if (res.ok) setPromos(p => p.map(x => x.id === promo.id ? data : x));
  };

  const [accessEmailMsg, setAccessEmailMsg] = useState<Record<string, string>>({});
  const sendAccessEmail = async (email: string) => {
    if (!token) return;
    const res = await fetch("/api/admin/send-access-email", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ email }) });
    setAccessEmailMsg(m => ({ ...m, [email]: res.ok ? "✓ Email envoyé" : "Erreur" }));
    setTimeout(() => setAccessEmailMsg(m => { const n = { ...m }; delete n[email]; return n; }), 4000);
  };

  const updateKyc = async (user_id: string, status: string, rejection_reason?: string) => {
    if (!token) return;
    const res = await fetch("/api/admin/kyc", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ user_id, status, rejection_reason }) });
    if (res.ok) {
      setKycSubmissions(ks => ks.map(k => k.id === user_id ? { ...k, kyc_status: status, kyc_rejection_reason: rejection_reason || null } : k));
      setKycMsg(status === "approved" ? "✓ KYC approuvé" : "KYC refusé");
      setTimeout(() => setKycMsg(""), 3000);
    }
  };

  const deletePromo = async (id: string) => {
    if (!token || !confirm("Supprimer ce code ?")) return;
    await fetch("/api/admin/promo-codes", { method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id }) });
    setPromos(p => p.filter(x => x.id !== id));
  };

  const runSync = async () => {
    setSyncing(true); setSyncMsg(""); setSyncDetail("");
    try {
      const res = await fetch("/api/metaapi/sync", { headers: { Authorization: `Bearer admin-fundedelysium@gmail.com` } });
      const data = await res.json();
      setSyncMsg(`✓ ${data.synced ?? 0}/${data.total ?? 0} synchronisé(s)`);
      setSyncDetail(JSON.stringify(data.results ?? data, null, 2));
      if (token) { const r = await fetch("/api/admin/challenges", { headers: { Authorization: `Bearer ${token}` } }); const d = await r.json(); if (Array.isArray(d)) setChallenges(d); }
    } catch (e) { setSyncMsg("Erreur sync"); setSyncDetail(String(e)); }
    setSyncing(false);
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const filteredChallenges = challenges.filter(c => {
    const matchSearch = c.user_email?.toLowerCase().includes(search.toLowerCase()) || c.client_first_name?.toLowerCase().includes(search.toLowerCase()) || c.client_last_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const maxCA = monthlyRevenue.length > 0 ? Math.max(...monthlyRevenue.map(m => m.ca)) : 1;

  if (needsLogin) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo-white.jpg" style={{ width: 60, height: 60, objectFit: "contain", mixBlendMode: "screen" }} />
          <div style={{ color: "#C9A84C", fontWeight: 800, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginTop: 12 }}>Admin Panel</div>
        </div>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #1e1e1e", borderRadius: 20, padding: "36px 32px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>Connexion Admin</h2>
          <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Email</div>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="vincentmeipro@gmail.com" required
                style={{ width: "100%", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Mot de passe</div>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: "100%", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 16px", color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            {adminLoginError && <div style={{ color: "#ef4444", fontSize: 13, textAlign: "center" }}>{adminLoginError}</div>}
            <button type="submit" disabled={adminLoginLoading} style={{ width: "100%", padding: "14px", backgroundColor: "#C9A84C", border: "none", borderRadius: 10, color: "#000", fontWeight: 900, fontSize: 14, cursor: adminLoginLoading ? "not-allowed" : "pointer", opacity: adminLoginLoading ? 0.7 : 1, marginTop: 4 }}>
              {adminLoginLoading ? "Connexion..." : "ACCÉDER AU PANEL"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#111827" }}>Chargement...</div>;
  if (error) return <div style={{ minHeight: "100vh", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div style={{ backgroundColor: "#fff", border: "1px solid #fca5a5", borderRadius: 12, padding: 32 }}><div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 12 }}>Erreur admin</div><div style={{ color: "#6b7280", fontSize: 13, fontFamily: "monospace" }}>{error}</div></div></div>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#111827" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 220, backgroundColor: "#111827", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-white.jpg" style={{ width: 34, height: 34, objectFit: "contain", mixBlendMode: "screen" }} />
          <div>
            <div style={{ color: "#fff", fontWeight: 900, fontSize: 14, letterSpacing: 0.5 }}>Elysium</div>
            <div style={{ color: "#C9A84C", fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Admin Panel</div>
          </div>
        </div>
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: tab === t.id ? "rgba(45,125,210,0.15)" : "none", border: "none", borderLeft: `3px solid ${tab === t.id ? "#2D7DD2" : "transparent"}`, color: tab === t.id ? "#2D7DD2" : "#9ca3af", fontWeight: tab === t.id ? 700 : 500, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 2, borderRadius: "0 8px 8px 0" }}>
              {t.label}
              {t.id === "payouts" && kpis.pendingPayouts > 0 && <span style={{ marginLeft: "auto", backgroundColor: "#ef4444", color: "#fff", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{kpis.pendingPayouts}</span>}
              {t.id === "kyc" && kycSubmissions.filter(k => k.kyc_status === "pending").length > 0 && <span style={{ marginLeft: "auto", backgroundColor: "#f59e0b", color: "#000", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{kycSubmissions.filter(k => k.kyc_status === "pending").length}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid #1f2937" }}>
          <a href="/dashboard" style={{ color: "#6b7280", fontSize: 11, textDecoration: "none", textAlign: "center", display: "block" }}>← Dashboard</a>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, backgroundColor: "#f1f5f9", overflowY: "auto", color: "#111827" }}>
        <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Admin</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{TABS.find(t => t.id === tab)?.label}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {kycMsg && <span style={{ color: kycMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{kycMsg}</span>}
            {syncMsg && <span style={{ color: syncMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{syncMsg}</span>}
          </div>
        </div>
        {syncDetail && (
          <div style={{ margin: "16px 32px 0", backgroundColor: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Résultat sync</span>
              <button onClick={() => setSyncDetail("")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>✕</button>
            </div>
            <pre style={{ color: "#2D7DD2", fontSize: 11, margin: 0, overflowX: "auto", whiteSpace: "pre-wrap" }}>{syncDetail}</pre>
          </div>
        )}
        <div style={{ padding: "28px 32px" }}>

        {/* ══ VUE D'ENSEMBLE ══ */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Alertes drawdown */}
            {kpis.alerts.length > 0 && (
              <div style={{ backgroundColor: "#1a0a0a", border: "1px solid #ef444440", borderRadius: 12, padding: "14px 20px" }}>
                <div style={{ color: "#ef4444", fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>⚠ {kpis.alerts.length} alerte(s) drawdown proche</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {kpis.alerts.map(c => (
                    <span key={c.id} style={{ backgroundColor: "#ef444415", border: "1px solid #ef444430", borderRadius: 8, padding: "4px 12px", fontSize: 12, color: "#ef4444" }}>
                      {c.user_email} — {c.account_size} ({c.phase})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* CA & Marge */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "CA Année en cours",   value: `€${kpis.caYear.toLocaleString()}`,   color: "#fff"    },
                { label: "CA Mois en cours",    value: `€${kpis.caMonth.toLocaleString()}`,  color: "#fff"    },
                { label: "Marge brute Année",   value: `${kpis.margeYear}%`,                 color: "#4ade80" },
                { label: "Marge brute Mois",    value: `${kpis.margeMonth}%`,                color: "#4ade80" },
              ].map((s, i) => (
                <div key={i} style={{ background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)", borderRadius: 12, padding: "18px 22px" }}>
                  <div style={{ color: "#9ca3af", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Pipeline stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {[
                { label: "Total Traders",      value: kpis.totalTraders  },
                { label: "Traders actifs",     value: kpis.activeTraders },
                { label: "Phase 1 (2-Step)",   value: kpis.phase1        },
                { label: "1-Step actifs",      value: kpis.oneStep       },
                { label: "Phase 2 (2-Step)",   value: kpis.phase2        },
                { label: "Certified",          value: kpis.certified     },
                { label: "Failed",             value: kpis.failed        },
                { label: "Total Challenges",   value: kpis.total         },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ color: "#111827", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#111827" }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Indicateurs business */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "Taux conversion P1→P2",    value: `${kpis.convP1P2}%`,                 sub: "des challenges achetés"    },
                { label: "Taux conversion P2→Funded", value: `${kpis.convP2Fund}%`,               sub: "des traders en phase 2"    },
                { label: "LTV moyen / trader",        value: `€${Math.round(kpis.ltv)}`,          sub: "dépense totale moyenne"    },
                { label: "Récompenses en attente",    value: kpis.pendingPayouts,                  sub: `€${kpis.pendingAmt.toLocaleString()} à valider` },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "18px 22px" }}>
                  <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#111827", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ PIPELINE CHALLENGES ══ */}
        {tab === "pipeline" && (
          <>
            {/* Entonnoir */}
            <div style={{ display: "flex", gap: 8, marginBottom: 24, alignItems: "stretch" }}>
              {[
                { label: "Phase 1 (2-Step)", value: kpis.phase1,    color: "#888",    fs: "active"  },
                { label: "1-Step actifs",    value: kpis.oneStep,   color: "#a78bfa", fs: "active"  },
                { label: "Phase 2 (2-Step)", value: kpis.phase2,    color: "#fff",    fs: "active"  },
                { label: "Passés",           value: kpis.passed,    color: "#f59e0b", fs: "passed"  },
                { label: "Certified",        value: kpis.certified, color: "#3b82f6", fs: "funded"  },
                { label: "Failed",           value: kpis.failed,    color: "#ef4444", fs: "failed"  },
              ].map((s, i) => (
                <div key={i} onClick={() => setFilterStatus(s.fs)}
                  style={{ flex: 1, backgroundColor: "#ffffff", border: `1px solid ${s.color}30`, borderRadius: 10, padding: "14px 16px", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input placeholder="Recherche email / nom..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 16px", color: "#111", fontSize: 13, outline: "none", minWidth: 220 }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 16px", color: "#111", fontSize: 13, outline: "none" }}>
                <option value="all">Tous les statuts</option>
                <option value="active">Active</option>
                <option value="passed">Passed</option>
                <option value="funded">Certified</option>
                <option value="failed">Failed</option>
              </select>
              <span style={{ color: "#555", fontSize: 13, alignSelf: "center" }}>{filteredChallenges.length} résultat(s)</span>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      {["Trader", "Compte", "Modèle", "Phase", "Statut", "Balance", "Payé", "Jours", "Account ID", "Password", "Serveur", "Date", "Actions"].map(h => (
                        <th key={h} style={{ padding: "13px 14px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChallenges.map(c => (
                      <>
                        {(c.client_first_name || c.client_last_name) && (
                          <tr key={`${c.id}-icm`} style={{ backgroundColor: "rgba(201,168,76,0.03)" }}>
                            <td colSpan={14} style={{ padding: "8px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{ color: "#fff", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Blueberry →</span>
                                {[
                                  { label: "Prénom", value: c.client_first_name },
                                  { label: "Nom", value: c.client_last_name },
                                  { label: "Email", value: c.user_email },
                                  { label: "Mobile", value: c.client_phone || "+33" },
                                  { label: "Balance", value: c.account_size.replace("$","").replace(",","") },
                                ].map((f, i) => (
                                  <button key={i} onClick={() => copyToClipboard(f.value)}
                                    style={{ backgroundColor: "#f3f4f6", border: "1px solid #333", borderRadius: 6, padding: "3px 8px", color: "#888", fontSize: 11, cursor: "pointer" }}>
                                    <span style={{ color: "#555", fontSize: 10 }}>{f.label}: </span>
                                    <span style={{ color: "#fff", fontWeight: 600 }}>{f.value}</span>
                                    <span style={{ color: "#444", fontSize: 10 }}> ⎘</span>
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr key={c.id} style={{ borderBottom: "1px solid #111" }}>
                          <td style={{ padding: "13px 14px", color: "#aaa", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</td>
                          <td style={{ padding: "13px 14px", fontWeight: 700 }}>{c.account_size}</td>
                          <td style={{ padding: "13px 14px", color: "#888" }}>{c.model}</td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <select value={editData.phase || c.phase} onChange={e => setEditData(d => ({ ...d, phase: e.target.value }))} style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12 }}><option value="phase1">phase1</option><option value="phase2">phase2</option><option value="funded">funded</option></select>
                              : <span style={{ color: c.phase === "funded" ? "#3b82f6" : c.phase === "phase2" ? "#fff" : "#888", fontWeight: 600, fontSize: 12 }}>{c.phase}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <select value={editData.status || c.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12 }}><option value="active">active</option><option value="passed">passed</option><option value="funded">funded</option><option value="failed">failed</option></select>
                              : badge(c.status, STATUS_COLORS[c.status] || "#888")}
                          </td>
                          <td style={{ padding: "13px 14px", fontWeight: 700 }}>
                            {editing === c.id
                              ? <input type="number" value={editData.balance ?? c.balance} onChange={e => setEditData(d => ({ ...d, balance: Number(e.target.value) }))} style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 90 }} />
                              : `$${c.balance?.toLocaleString()}`}
                          </td>
                          <td style={{ padding: "13px 14px", color: "#22c55e" }}>€{c.amount_paid}</td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="number" value={editData.trading_days ?? c.trading_days} onChange={e => setEditData(d => ({ ...d, trading_days: Number(e.target.value) }))} style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 55 }} />
                              : <span style={{ color: c.trading_days >= 4 ? "#22c55e" : "#888" }}>{c.trading_days}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="text" value={editData.ctrader_account_id ?? c.ctrader_account_id ?? ""} onChange={e => setEditData(d => ({ ...d, ctrader_account_id: e.target.value }))} style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 100 }} />
                              : <span style={{ color: c.ctrader_account_id ? "#38bdf8" : "#333", fontSize: 12, fontWeight: 700 }}>{c.ctrader_account_id || "—"}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="text" value={editData.ctrader_password ?? c.ctrader_password ?? ""} onChange={e => setEditData(d => ({ ...d, ctrader_password: e.target.value }))} style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 100 }} />
                              : <span style={{ color: c.ctrader_password ? "#38bdf8" : "#333", fontSize: 12, fontWeight: 700 }}>{c.ctrader_password || "—"}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="text" value={editData.server ?? c.server ?? ""} onChange={e => setEditData(d => ({ ...d, server: e.target.value }))} style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 140 }} />
                              : <span style={{ color: c.server ? "#38bdf8" : "#333", fontSize: 12, fontWeight: 700 }}>{c.server || "—"}</span>}
                          </td>
                          <td style={{ padding: "13px 14px", color: "#555", fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => saveChallenge(c.id)} style={{ backgroundColor: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✓</button>
                                  <button onClick={() => { setEditing(null); setEditData({}); }} style={{ backgroundColor: "transparent", color: "#555", border: "1px solid #333", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                </div>
                              : <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => { setEditing(c.id); setEditData({}); }} style={{ backgroundColor: "#f3f4f6", color: "#111", border: "1px solid #ccc", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                                  <button onClick={() => deleteChallenge(c.id)} style={{ backgroundColor: "#f3f4f6", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                </div>}
                          </td>
                        </tr>
                      </>
                    ))}
                    {filteredChallenges.length === 0 && <tr><td colSpan={13} style={{ padding: 40, textAlign: "center", color: "#333" }}>Aucun challenge</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══ CRM TRADERS ══ */}
        {tab === "crm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#555", fontSize: 12, marginBottom: 8 }}>{traderCRM.length} traders — triés par dépense totale</div>
            {traderCRM.map(trader => {
              const activeC   = trader.challenges.filter(c => c.status === "active").length;
              const certC     = trader.challenges.filter(c => c.status === "funded").length;
              const failedC   = trader.challenges.filter(c => c.status === "failed").length;
              const isOpen    = crmExpanded === trader.email;
              return (
                <div key={trader.email} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                  <div onClick={() => setCrmExpanded(isOpen ? null : trader.email)}
                    style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{trader.name || trader.email}</div>
                      {trader.name && <div style={{ color: "#555", fontSize: 12 }}>{trader.email}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                      <div><span style={{ color: "#555", fontSize: 11 }}>LTV </span><span style={{ color: "#22c55e", fontWeight: 800 }}>€{trader.totalSpent}</span></div>
                      <div><span style={{ color: "#555", fontSize: 11 }}>Challenges </span><span style={{ fontWeight: 700 }}>{trader.challenges.length}</span></div>
                      <div><span style={{ color: "#555", fontSize: 11 }}>Actifs </span><span style={{ color: "#22c55e", fontWeight: 700 }}>{activeC}</span></div>
                      {certC > 0   && <div><span style={{ color: "#555", fontSize: 11 }}>Certified </span><span style={{ color: "#3b82f6", fontWeight: 700 }}>{certC}</span></div>}
                      {failedC > 0 && <div><span style={{ color: "#555", fontSize: 11 }}>Failed </span><span style={{ color: "#ef4444", fontWeight: 700 }}>{failedC}</span></div>}
                      <div style={{ color: "#555", fontSize: 11 }}>depuis {new Date(trader.firstDate).toLocaleDateString()}</div>
                    </div>
                    <span style={{ color: "#444", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                  {isOpen && (() => {
                    const traderPayouts = payouts.filter(p => p.user_email === trader.email);
                    const totalPaid = traderPayouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
                    const firstChallenge = trader.challenges[trader.challenges.length - 1];

                    // Timeline : challenges + payouts mélangés, triés par date
                    type TLItem =
                      | { kind: "challenge"; date: string; data: Challenge }
                      | { kind: "payout";    date: string; data: Payout };
                    const timeline: TLItem[] = [
                      ...trader.challenges.map(c => ({ kind: "challenge" as const, date: c.created_at, data: c })),
                      ...traderPayouts.map(p  => ({ kind: "payout"    as const, date: p.created_at, data: p })),
                    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    return (
                      <div style={{ borderTop: "1px solid #1a1a1a" }}>

                        {/* Fiche client */}
                        {(() => {
                          const profile = profiles.find(p => p.email === trader.email);
                          return (
                        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, borderBottom: "1px solid #111" }}>
                          <div>
                            <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Contact</div>
                            <div style={{ fontWeight: 700 }}>{trader.name || "—"}</div>
                            <div style={{ color: "#888", fontSize: 12 }}>{trader.email}</div>
                            {(profile?.phone || firstChallenge?.client_phone) && <div style={{ color: "#888", fontSize: 12 }}>{profile?.phone || firstChallenge?.client_phone}</div>}
                            {profile?.address && <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>{profile.address}{profile.postal_code ? `, ${profile.postal_code}` : ""} {profile.city || ""}{profile.country ? ` — ${profile.country}` : ""}</div>}
                            <button onClick={() => sendAccessEmail(trader.email)} style={{ marginTop: 8, backgroundColor: "#f3f4f6", border: "1px solid #333", borderRadius: 6, color: "#C9A84C", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>
                              {accessEmailMsg[trader.email] || "✉ Envoyer email d'accès"}
                            </button>
                          </div>
                          <div>
                            <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Client depuis</div>
                            <div style={{ fontWeight: 700 }}>{new Date(trader.firstDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                          </div>
                          <div>
                            <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total dépensé (LTV)</div>
                            <div style={{ fontWeight: 900, fontSize: 18, color: "#22c55e" }}>€{trader.totalSpent}</div>
                          </div>
                          <div>
                            <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Récompenses reçues</div>
                            <div style={{ fontWeight: 900, fontSize: 18, color: totalPaid > 0 ? "#3b82f6" : "#333" }}>€{totalPaid.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Challenges</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                              {[
                                { label: "Total",    value: trader.challenges.length,                                color: "#fff"    },
                                { label: "Actifs",   value: activeC,                                                 color: "#22c55e" },
                                { label: "Certified",value: certC,                                                   color: "#3b82f6" },
                                { label: "Failed",   value: failedC,                                                 color: "#ef4444" },
                              ].map(s => s.value > 0 && (
                                <span key={s.label} style={{ fontSize: 11 }}>
                                  <span style={{ color: "#555" }}>{s.label} </span>
                                  <span style={{ color: s.color, fontWeight: 800 }}>{s.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                          );
                        })()}

                        {/* KYC */}
                        {(() => {
                          const kyc = kycSubmissions.find(k => k.user_email === trader.email);
                          const kycColor = !kyc ? "#555" : kyc.kyc_status === "approved" ? "#22c55e" : kyc.kyc_status === "rejected" ? "#ef4444" : "#f59e0b";
                          const kycLabel = !kyc ? "Non soumis" : kyc.kyc_status;
                          const docFields: Array<[keyof KycSubmission["doc_urls"], string]> = [["id_front","ID recto"],["id_back","ID verso"],["residence","Domicile"],["selfie","Selfie"]];
                          return (
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid #111", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                              <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginRight: 4 }}>KYC</div>
                              <span style={{ backgroundColor: `${kycColor}20`, color: kycColor, padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{kycLabel}</span>
                              {kyc?.kyc_submitted_at && <span style={{ color: "#555", fontSize: 11 }}>soumis le {new Date(kyc.kyc_submitted_at).toLocaleDateString("fr-FR")}</span>}

                              {kyc && docFields.map(([field, label]) => (
                                kyc.doc_urls[field] ? (
                                  <a key={field} href={kyc.doc_urls[field]!} target="_blank" rel="noopener noreferrer"
                                    style={{ backgroundColor: "#f3f4f6", border: "1px solid #2a2a2a", borderRadius: 7, padding: "4px 10px", color: "#38bdf8", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                    📄 {label}
                                  </a>
                                ) : null
                              ))}

                              {kyc?.kyc_status === "rejected" && kyc.kyc_rejection_reason && (
                                <span style={{ color: "#ef4444", fontSize: 11 }}>Motif : {kyc.kyc_rejection_reason}</span>
                              )}

                              {kyc?.kyc_status === "pending" && (
                                <>
                                  <button onClick={() => updateKyc(kyc.id, "approved")}
                                    style={{ backgroundColor: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40", borderRadius: 7, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                    ✓ Approuver
                                  </button>
                                  <input value={kycRejectReason[kyc.id] || ""} onChange={e => setKycRejectReason(r => ({ ...r, [kyc.id]: e.target.value }))}
                                    placeholder="Motif de refus..." style={{ backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 7, padding: "4px 10px", color: "#111", fontSize: 11, outline: "none", width: 150 }} />
                                  <button onClick={() => updateKyc(kyc.id, "rejected", kycRejectReason[kyc.id])}
                                    style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 7, padding: "4px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                    ✕ Refuser
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })()}

                        {/* Timeline */}
                        <div style={{ padding: "16px 20px" }}>
                          <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Historique complet</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                            {timeline.map((item, idx) => {
                              const isLast = idx === timeline.length - 1;
                              if (item.kind === "challenge") {
                                const c = item.data;
                                const profit = c.balance && c.start_balance ? ((c.balance - c.start_balance) / c.start_balance * 100).toFixed(1) : null;
                                return (
                                  <div key={c.id} style={{ display: "flex", gap: 12 }}>
                                    {/* Ligne verticale */}
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                                      <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: STATUS_COLORS[c.status] || "#444", marginTop: 4, flexShrink: 0 }} />
                                      {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "#f3f4f6", minHeight: 24 }} />}
                                    </div>
                                    {/* Contenu */}
                                    <div style={{ flex: 1, paddingBottom: 16 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: "#555" }}>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                                        <span style={{ fontWeight: 700, fontSize: 13 }}>Challenge {c.account_size}</span>
                                        <span style={{ color: "#888", fontSize: 12 }}>{c.model}</span>
                                        {badge(c.status, STATUS_COLORS[c.status] || "#888")}
                                        <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>€{c.amount_paid} payé</span>
                                      </div>
                                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "#555" }}>
                                        <span>Phase : <span style={{ color: "#888" }}>{c.phase}</span></span>
                                        <span>Jours tradés : <span style={{ color: c.trading_days >= 4 ? "#22c55e" : "#888" }}>{c.trading_days}</span></span>
                                        {c.balance && <span>Balance : <span style={{ color: "#fff" }}>${c.balance?.toLocaleString()}</span></span>}
                                        {profit && <span>P&L : <span style={{ color: Number(profit) >= 0 ? "#22c55e" : "#ef4444" }}>{profit}%</span></span>}
                                        {c.ctrader_account_id && <span>MT5 ID : <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{c.ctrader_account_id}</span></span>}
                                        {c.ctrader_password  && <span>Password : <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{c.ctrader_password}</span></span>}
                                        {c.server            && <span>Serveur : <span style={{ color: "#38bdf8" }}>{c.server}</span></span>}
                                      </div>
                                    </div>
                                  </div>
                                );
                              } else {
                                const p = item.data;
                                return (
                                  <div key={p.id} style={{ display: "flex", gap: 12 }}>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20, flexShrink: 0 }}>
                                      <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: STATUS_COLORS[p.status] || "#3b82f6", marginTop: 4, flexShrink: 0 }} />
                                      {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "#f3f4f6", minHeight: 24 }} />}
                                    </div>
                                    <div style={{ flex: 1, paddingBottom: 16 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, color: "#555" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#3b82f6" }}>Demande de récompense</span>
                                        <span style={{ fontWeight: 900, fontSize: 14, color: "#22c55e" }}>€{p.amount?.toLocaleString()}</span>
                                        {badge(p.status, STATUS_COLORS[p.status] || "#888")}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
            {traderCRM.length === 0 && <div style={{ color: "#555", textAlign: "center", padding: 40 }}>Aucun trader</div>}
          </div>
        )}

        {/* ══ FINANCIER ══ */}
        {tab === "financier" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "CA Total",          value: `€${challenges.reduce((s,c) => s + (c.amount_paid||0),0).toLocaleString()}` },
                { label: "Récompenses versées", value: `€${payouts.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()}` },
                { label: "Marge brute totale",value: `${kpis.margeYear}%` },
                { label: "Nb challenges total",value: challenges.length },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "18px 22px" }}>
                  <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Graphique CA mensuel */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>CA mensuel</div>
              {monthlyRevenue.length === 0
                ? <div style={{ color: "#555", textAlign: "center", padding: 20 }}>Aucune donnée</div>
                : <div style={{ display: "flex", gap: 8, alignItems: "flex-end", overflowX: "auto", paddingBottom: 8 }}>
                    {monthlyRevenue.map(m => (
                      <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 60 }}>
                        <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>€{Math.round(m.ca/1000)}k</div>
                        <div style={{ width: 44, backgroundColor: "#2D7DD2", borderRadius: "4px 4px 0 0", height: Math.max(4, m.ca / maxCA * 140) }} title={`€${m.ca}`} />
                        {m.payoutsAmt > 0 && <div style={{ width: 44, backgroundColor: "#ef4444", borderRadius: "0 0 4px 4px", height: Math.max(2, m.payoutsAmt / maxCA * 140), marginTop: -4 }} title={`Récompenses: €${m.payoutsAmt}`} />}
                        <div style={{ fontSize: 9, color: "#555", textAlign: "center" }}>{m.month.slice(5)}/{m.month.slice(2,4)}</div>
                        <div style={{ fontSize: 9, color: m.marge > 50 ? "#22c55e" : "#888" }}>{m.marge}%</div>
                      </div>
                    ))}
                  </div>}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <span style={{ fontSize: 10, color: "#2D7DD2" }}>■ CA</span>
                <span style={{ fontSize: 10, color: "#ef4444" }}>■ Récompenses</span>
                <span style={{ fontSize: 10, color: "#555" }}>% = marge brute</span>
              </div>
            </div>

            {/* CA par taille de compte */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid #e5e7eb" }}>Répartition par taille de compte</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    {["Compte", "Challenges vendus", "CA total", "% du CA", "Actifs", "Certified", "Failed"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byAccountSize.map(row => {
                    const totalCA = challenges.reduce((s, c) => s + (c.amount_paid || 0), 0);
                    const pct = totalCA > 0 ? Math.round(row.revenue / totalCA * 100) : 0;
                    return (
                      <tr key={row.size} style={{ borderBottom: "1px solid #111" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: "#fff" }}>{row.size}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff" }}>{row.count}</td>
                        <td style={{ padding: "12px 16px", color: "#22c55e", fontWeight: 700 }}>€{row.revenue.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 4, height: 6, maxWidth: 80 }}>
                              <div style={{ width: `${pct}%`, backgroundColor: "#2D7DD2", height: 6, borderRadius: 4 }} />
                            </div>
                            <span style={{ color: "#888", fontSize: 12 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#22c55e" }}>{row.active}</td>
                        <td style={{ padding: "12px 16px", color: "#3b82f6" }}>{row.certified}</td>
                        <td style={{ padding: "12px 16px", color: "#ef4444" }}>{row.failed}</td>
                      </tr>
                    );
                  })}
                  {byAccountSize.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#333" }}>Aucune donnée</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Tableau mensuel */}
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    {["Mois", "Challenges", "CA", "Récompenses versées", "Marge brute"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyRevenue].reverse().map(m => (
                    <tr key={m.month} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{m.month}</td>
                      <td style={{ padding: "12px 16px", color: "#888" }}>{m.count}</td>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 700 }}>€{m.ca.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: "#ef4444" }}>€{m.payoutsAmt.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: m.marge > 50 ? "#22c55e" : "#888", fontWeight: 700 }}>{m.marge}%</td>
                    </tr>
                  ))}
                  {monthlyRevenue.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#333" }}>Aucune donnée</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ RÉCOMPENSES ══ */}
        {tab === "payouts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { label: "En attente",  value: payouts.filter(p=>p.status==="pending").length,  color: "#f59e0b" },
                { label: "Validés",     value: payouts.filter(p=>p.status==="paid").length,     color: "#22c55e" },
                { label: "Refusés",     value: payouts.filter(p=>p.status==="rejected").length, color: "#ef4444" },
                { label: "Montant total versé", value: `€${payouts.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()}`, color: "#fff" },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 160 }}>
                  <div style={{ color: "#555", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    {["Trader", "Montant", "Statut", "Date", "Actions"].map(h => (
                      <th key={h} style={{ padding: "13px 16px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => (
                    <tr key={p.id} style={{ borderBottom: "1px solid #111" }}>
                      <td style={{ padding: "13px 16px", color: "#aaa" }}>{p.user_email || p.user_id}</td>
                      <td style={{ padding: "13px 16px", fontWeight: 800, color: "#22c55e", fontSize: 15 }}>€{p.amount?.toLocaleString()}</td>
                      <td style={{ padding: "13px 16px" }}>{badge(p.status, STATUS_COLORS[p.status] || "#888")}</td>
                      <td style={{ padding: "13px 16px", color: "#555", fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "13px 16px" }}>
                        {p.status === "pending" && (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => updatePayout(p.id, "paid")}
                              style={{ backgroundColor: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              ✓ Valider
                            </button>
                            <button onClick={() => updatePayout(p.id, "rejected")}
                              style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              ✕ Refuser
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payouts.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#333" }}>Aucune récompense</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ PROMO CODES ══ */}
        {tab === "promos" && (
          <>
            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ color: "#555", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>Créer un code promo</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "CODE *", key: "code", placeholder: "SUMMER25", transform: (v: string) => v.toUpperCase() },
                  { label: "REMISE % *", key: "discount_percent", placeholder: "50", type: "number" },
                  { label: "MAX UTILISATIONS", key: "max_uses", placeholder: "Illimité", type: "number" },
                  { label: "EXPIRE LE", key: "expires_at", type: "datetime-local" },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ color: "#555", fontSize: 10, marginBottom: 6 }}>{f.label}</div>
                    <input type={f.type || "text"} value={(newCode as Record<string,string>)[f.key]} placeholder={f.placeholder}
                      onChange={e => setNewCode(n => ({ ...n, [f.key]: f.transform ? f.transform(e.target.value) : e.target.value }))}
                      style={{ width: "100%", backgroundColor: "#f3f4f6", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", color: "#111", fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={createPromo} disabled={!newCode.code || !newCode.discount_percent}
                  style={{ backgroundColor: "#fff", color: "#000", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (!newCode.code || !newCode.discount_percent) ? 0.4 : 1 }}>
                  Créer
                </button>
                {promoMsg   && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{promoMsg}</span>}
                {promoError && <span style={{ color: "#ef4444", fontSize: 13 }}>{promoError}</span>}
              </div>
            </div>

            <div style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
              {promosLoading ? <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Chargement...</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        {["Code", "Remise", "Utilisé", "Max", "Expire", "Statut", "Créé", "Actions"].map(h => (
                          <th key={h} style={{ padding: "13px 16px", textAlign: "left", color: "#555", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => {
                        const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                        const isExhausted = p.max_uses !== null && p.used_count >= p.max_uses;
                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid #111", opacity: (!p.active || isExpired || isExhausted) ? 0.5 : 1 }}>
                            <td style={{ padding: "13px 16px", fontWeight: 800, fontFamily: "monospace", letterSpacing: 1 }}>{p.code}</td>
                            <td style={{ padding: "13px 16px", fontWeight: 700, color: p.discount_percent === 100 ? "#22c55e" : "#fff" }}>{p.discount_percent === 100 ? "100% (GRATUIT)" : `${p.discount_percent}%`}</td>
                            <td style={{ padding: "13px 16px", color: "#888" }}>{p.used_count}</td>
                            <td style={{ padding: "13px 16px", color: "#555" }}>{p.max_uses ?? "∞"}</td>
                            <td style={{ padding: "13px 16px", color: isExpired ? "#ef4444" : "#555", fontSize: 12 }}>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Jamais"}</td>
                            <td style={{ padding: "13px 16px" }}>
                              {isExpired ? badge("expiré", "#ef4444") : isExhausted ? badge("épuisé", "#f59e0b") : p.active ? badge("actif", "#22c55e") : badge("révoqué", "#555")}
                            </td>
                            <td style={{ padding: "13px 16px", color: "#555", fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: "13px 16px" }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => togglePromo(p)} style={{ backgroundColor: "#f3f4f6", color: p.active ? "#ef4444" : "#22c55e", border: `1px solid ${p.active ? "#ef444433" : "#22c55e33"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                                  {p.active ? "Révoquer" : "Restaurer"}
                                </button>
                                <button onClick={() => deletePromo(p.id)} style={{ backgroundColor: "#f3f4f6", color: "#555", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Suppr.</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {promos.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#333" }}>Aucun code promo</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
        {/* ══ KYC ══ */}
        {tab === "kyc" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "En attente", value: kycSubmissions.filter(k => k.kyc_status === "pending").length, color: "#f59e0b" },
                  { label: "Approuvés",  value: kycSubmissions.filter(k => k.kyc_status === "approved").length, color: "#22c55e" },
                  { label: "Refusés",   value: kycSubmissions.filter(k => k.kyc_status === "rejected").length, color: "#ef4444" },
                ].map((s, i) => (
                  <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 20px" }}>
                    <div style={{ color: "#555", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {kycMsg && <span style={{ color: kycMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 700 }}>{kycMsg}</span>}
            </div>

            {kycLoading && <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Chargement...</div>}

            {!kycLoading && kycSubmissions.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Aucune soumission KYC</div>
            )}

            {!kycLoading && kycSubmissions.map(k => {
              const isPending = k.kyc_status === "pending";
              const statusColor = k.kyc_status === "approved" ? "#22c55e" : k.kyc_status === "rejected" ? "#ef4444" : "#f59e0b";
              const docLabels: [keyof typeof k.doc_urls, string][] = [
                ["id_front", "Pièce ID recto"],
                ["id_back",  "Pièce ID verso"],
                ["residence","Justificatif domicile"],
                ["selfie",   "Selfie"],
              ];
              return (
                <div key={k.id} style={{ backgroundColor: "#ffffff", border: `1px solid ${isPending ? "#f59e0b30" : "#1a1a1a"}`, borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{k.user_email}</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#555" }}>
                        <span>Soumis le {new Date(k.kyc_submitted_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                        {k.kyc_reviewed_at && <span>• Révisé le {new Date(k.kyc_reviewed_at).toLocaleDateString("fr-FR")}</span>}
                      </div>
                    </div>
                    <span style={{ backgroundColor: `${statusColor}20`, color: statusColor, padding: "4px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700 }}>{k.kyc_status}</span>
                  </div>

                  {/* Documents */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {docLabels.map(([field, label]) => (
                      k.doc_urls[field] ? (
                        <a key={field} href={k.doc_urls[field]!} target="_blank" rel="noopener noreferrer"
                          style={{ backgroundColor: "#f3f4f6", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 14px", color: "#38bdf8", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                          📄 {label}
                        </a>
                      ) : (
                        <span key={field} style={{ backgroundColor: "#111", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", color: "#333", fontSize: 12 }}>{label} —</span>
                      )
                    ))}
                  </div>

                  {k.kyc_status === "rejected" && k.kyc_rejection_reason && (
                    <div style={{ color: "#ef4444", fontSize: 12, marginBottom: 12 }}>Motif de refus : {k.kyc_rejection_reason}</div>
                  )}

                  {isPending && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
                      <button onClick={() => updateKyc(k.id, "approved")}
                        style={{ backgroundColor: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        ✓ Approuver
                      </button>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1, minWidth: 280 }}>
                        <input
                          value={kycRejectReason[k.id] || ""}
                          onChange={e => setKycRejectReason(r => ({ ...r, [k.id]: e.target.value }))}
                          placeholder="Motif de refus (optionnel)..."
                          style={{ flex: 1, backgroundColor: "#f3f4f6", border: "1px solid #ccc", borderRadius: 8, padding: "8px 12px", color: "#111", fontSize: 12, outline: "none" }}
                        />
                        <button onClick={() => updateKyc(k.id, "rejected", kycRejectReason[k.id])}
                          style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
                          ✕ Refuser
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
