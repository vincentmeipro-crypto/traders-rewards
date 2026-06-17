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
  payment_method?: string;
  balance: number;
  start_balance: number;
  amount_paid: number;
  client_first_name: string;
  client_last_name: string;
  client_phone: string;
  created_at: string;
  trading_days: number;
  mt5_login: number;
  mt5_password: string;
  mt5_password_investor: string;
  mt5_server: string;
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
  challenge_id?: string;
  amount: number;
  status: string;
  created_at: string;
  payment_method?: string;
  wallet_address?: string;
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

type Tab = "overview" | "pipeline" | "crm" | "financier" | "payouts" | "promos" | "kyc" | "create" | "stats" | "compta";

const STATUS_LABELS: Record<string, string> = {
  funded: "Certified",
  active: "Active",
  failed: "Failed",
  passed: "Passed",
  pending: "Pending",
  paid: "Paid",
  rejected: "Rejected",
};

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
  { id: "stats",     label: "📊 Statistiques" },
  { id: "compta",    label: "🧾 Comptabilité" },
  { id: "create",    label: "➕ Créer Challenge" },
];

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, padding: "20px 24px", ...style }}>{children}</div>
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

  // Create challenge state
  const [createForm, setCreateForm] = useState({ userEmail: "", firstName: "", lastName: "", accountSize: "$10,000", model: "1step", amountPaid: "", createMT5: true, type: "challenge" as "challenge" | "reward" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createError, setCreateError] = useState("");

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

  const fixMT5Balance = async (c: Challenge) => {
    if (!c.mt5_login) { alert("Pas de login MT5 sur ce compte"); return; }
    const sizeMap: Record<string, number> = { "$10,000": 10000, "$25,000": 25000, "$50,000": 50000, "$100,000": 100000, "$200,000": 200000 };
    const expected = sizeMap[c.account_size] ?? 0;
    // Lire la vraie balance MT5
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${c.mt5_login}`, { headers: { Authorization: `Bearer ${token}` } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const diff = expected - mt5Balance;
    if (diff <= 0) { alert(`Balance MT5 déjà correcte : $${mt5Balance.toLocaleString()}`); return; }
    if (!confirm(`MT5 balance actuelle : $${mt5Balance.toLocaleString()}\nAjouter $${diff.toLocaleString()} pour atteindre $${expected.toLocaleString()} ?`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ login: c.mt5_login, amount: diff }) });
    const data = await res.json();
    if (res.ok) alert(`✅ +$${diff.toLocaleString()} ajoutés sur MT5 ${c.mt5_login}`);
    else alert(`Erreur : ${data.error}`);
  };

  const withdrawMT5Profit = async (c: Challenge) => {
    if (!c.mt5_login) { alert("Pas de login MT5 sur ce compte"); return; }
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${c.mt5_login}`, { headers: { Authorization: `Bearer ${token}` } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const profit = Math.round((mt5Balance - c.start_balance) * 100) / 100;
    if (profit <= 0) { alert(`Aucun profit à retirer. Balance MT5 : $${mt5Balance.toLocaleString()}`); return; }
    if (!confirm(`Retirer le profit de $${profit.toLocaleString()} sur MT5 ${c.mt5_login} ?\n(Balance actuelle : $${mt5Balance.toLocaleString()} → $${c.start_balance.toLocaleString()})`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ login: c.mt5_login, amount: profit, withdraw: true, comment: "Profit withdrawal" }) });
    const data = await res.json();
    if (res.ok) alert(`✅ Retrait de $${profit.toLocaleString()} effectué sur MT5 ${c.mt5_login}`);
    else alert(`Erreur : ${data.error}`);
  };

  const updatePayout = async (id: string, status: string) => {
    if (!token) return;
    const res = await fetch("/api/admin/payouts", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (res.ok) {
      setPayouts(ps => ps.map(p => p.id === id ? { ...p, ...data } : p));
      // Refresh challenges so trading_days + balance display the reset values
      if (status === "paid") {
        fetch("/api/admin/challenges", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(d => { if (Array.isArray(d)) setChallenges(d); }).catch(() => {});
      }
    }
  };

  const triggerMT5WithdrawFromPayout = async (mt5Login: number, startBalance: number) => {
    if (!mt5Login) { alert("Pas de login MT5 sur ce compte"); return; }
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${mt5Login}`, { headers: { Authorization: `Bearer ${token}` } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const profit = Math.round((mt5Balance - startBalance) * 100) / 100;
    if (profit <= 0) { alert(`Aucun profit MT5 à retirer.\nBalance actuelle : $${mt5Balance.toLocaleString()}`); return; }
    if (!confirm(`Retrait MT5 de $${profit.toLocaleString()} sur login ${mt5Login} ?\n(Balance : $${mt5Balance.toLocaleString()} → $${startBalance.toLocaleString()})`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ login: mt5Login, amount: profit, withdraw: true, comment: "Profit Withdrawal — Traders Rewards" }) });
    const data = await res.json();
    if (res.ok) alert(`✅ Retrait MT5 de $${profit.toLocaleString()} effectué`);
    else alert(`Erreur MT5 : ${data.error}`);
  };

  const createChallenge = async () => {
    if (!token || !createForm.userEmail || !createForm.accountSize) return;
    setCreateLoading(true); setCreateError(""); setCreateMsg("");
    const res = await fetch("/api/admin/challenges", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ ...createForm, amountPaid: parseFloat(createForm.amountPaid) || 0 }) });
    const data = await res.json();
    setCreateLoading(false);
    if (res.ok) {
      setCreateMsg("✅ Challenge créé ! Email envoyé au trader.");
      setCreateForm(f => ({ ...f, userEmail: "", firstName: "", lastName: "", amountPaid: "" }));
      const r = await fetch("/api/admin/challenges", { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      if (Array.isArray(d)) setChallenges(d);
    } else setCreateError(data.error || "Erreur");
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
      const res = await fetch("/api/metaapi/sync", { headers: { Authorization: `Bearer admin-vincentmeipro@gmail.com` } });
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
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/nouveau-logo.png" style={{ width: 60, height: 60, objectFit: "contain", mixBlendMode: "screen" }} />
          <div style={{ color: "#C9A84C", fontWeight: 800, fontSize: 13, letterSpacing: 3, textTransform: "uppercase", marginTop: 12 }}>Admin Panel</div>
        </div>
        <div style={{ backgroundColor: "#ffffff", border: "1px solid #1e1e1e", borderRadius: 20, padding: "36px 32px" }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, textAlign: "center" }}>Connexion Admin</h2>
          <form onSubmit={handleAdminLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Email</div>
              <input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="vincentmeipro@gmail.com" required
                style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 10, padding: "12px 16px", color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Mot de passe</div>
              <input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 10, padding: "12px 16px", color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
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
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#111", background: "#ffffff" }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 220, backgroundColor: "rgba(255,255,255,0.88)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRight: "1px solid rgba(255,255,255,0.6)", boxShadow: "4px 0 24px rgba(21,101,192,0.08)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(21,101,192,0.1)", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/nouveau-logo.png" style={{ width: 34, height: 34, objectFit: "contain" }} />
          <div>
            <div style={{ color: "#111", fontWeight: 900, fontSize: 14, letterSpacing: 0.5 }}>Traders Rewards</div>
            <div style={{ color: "#111", fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Admin Panel</div>
          </div>
        </div>
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px", background: tab === t.id ? "rgba(21,101,192,0.1)" : "none", border: "none", borderLeft: `3px solid ${tab === t.id ? "#1565C0" : "transparent"}`, color: tab === t.id ? "#111" : "#6b7280", fontWeight: tab === t.id ? 700 : 500, fontSize: 13, cursor: "pointer", textAlign: "left", marginBottom: 2, borderRadius: "0 8px 8px 0" }}>
              {t.label}
              {t.id === "payouts" && kpis.pendingPayouts > 0 && <span style={{ marginLeft: "auto", backgroundColor: "#ef4444", color: "#fff", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{kpis.pendingPayouts}</span>}
              {t.id === "kyc" && kycSubmissions.filter(k => k.kyc_status === "pending").length > 0 && <span style={{ marginLeft: "auto", backgroundColor: "#f59e0b", color: "#000", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{kycSubmissions.filter(k => k.kyc_status === "pending").length}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid rgba(21,101,192,0.1)" }}>
          <a href="/dashboard" style={{ color: "#8a96aa", fontSize: 11, textDecoration: "none", textAlign: "center", display: "block" }}>← Dashboard</a>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, backgroundColor: "transparent", overflowY: "auto", color: "#111" }}>
        <div style={{ backgroundColor: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 16px rgba(21,101,192,0.06)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: "#8a96aa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Admin</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#111" }}>{TABS.find(t => t.id === tab)?.label}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {kycMsg && <span style={{ color: kycMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{kycMsg}</span>}
            {syncMsg && <span style={{ color: syncMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{syncMsg}</span>}
            <button onClick={runSync} disabled={syncing} style={{ backgroundColor: syncing ? "rgba(0,0,0,0.06)" : "#1565C0", color: syncing ? "#8a96aa" : "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer" }}>
              {syncing ? "Syncing..." : "Sync MT5"}
            </button>
            <button onClick={async () => {
              const login = prompt("Login MT5 du compte à diagnostiquer :");
              if (!login) return;
              const res = await fetch(`/api/admin/mt5-test-withdraw?login=${login}`, { headers: { Authorization: `Bearer ${token}` } });
              const data = await res.json();
              setSyncDetail(JSON.stringify(data, null, 2));
            }} style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid #C9A84C33", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
              🔍 Diag Retrait
            </button>
          </div>
        </div>
        {syncDetail && (
          <div style={{ margin: "16px 32px 0", background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Résultat sync</span>
              <button onClick={() => setSyncDetail("")} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }}>✕</button>
            </div>
            <pre style={{ color: "#111", fontSize: 11, margin: 0, overflowX: "auto", whiteSpace: "pre-wrap" }}>{syncDetail}</pre>
          </div>
        )}
        <div style={{ padding: "28px 32px" }}>

        {/* ══ VUE D'ENSEMBLE ══ */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Alertes drawdown */}
            {kpis.alerts.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.08)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "14px 20px" }}>
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
                { label: "CA Année en cours",   value: `€${kpis.caYear.toLocaleString()}`,   color: "#111" },
                { label: "CA Mois en cours",    value: `€${kpis.caMonth.toLocaleString()}`,  color: "#111" },
                { label: "Marge brute Année",   value: `${kpis.margeYear}%`,                 color: "#22c55e" },
                { label: "Marge brute Mois",    value: `${kpis.margeMonth}%`,                color: "#22c55e" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.75)", borderRadius: 12, padding: "18px 22px", boxShadow: "0 8px 32px rgba(21,101,192,0.1)" }}>
                  <div style={{ color: "#8a96aa", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
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
                <div key={i} style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.75)", borderRadius: 12, padding: "16px 20px", boxShadow: "0 4px 16px rgba(21,101,192,0.08)" }}>
                  <div style={{ color: "#8a96aa", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#111" }}>{s.value}</div>
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
                <div key={i} style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.75)", borderRadius: 12, padding: "18px 22px", boxShadow: "0 4px 16px rgba(21,101,192,0.08)" }}>
                  <div style={{ color: "#8a96aa", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#111", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "#8a96aa" }}>{s.sub}</div>
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
                { label: "Phase 1 (2-Step)", value: kpis.phase1,    color: "#8a96aa",    fs: "active"  },
                { label: "1-Step actifs",    value: kpis.oneStep,   color: "#a78bfa", fs: "active"  },
                { label: "Phase 2 (2-Step)", value: kpis.phase2,    color: "#fff",    fs: "active"  },
                { label: "Passés",           value: kpis.passed,    color: "#f59e0b", fs: "passed"  },
                { label: "Certified",        value: kpis.certified, color: "#3b82f6", fs: "funded"  },
                { label: "Failed",           value: kpis.failed,    color: "#ef4444", fs: "failed"  },
              ].map((s, i) => (
                <div key={i} onClick={() => setFilterStatus(s.fs)}
                  style={{ flex: 1, backgroundColor: "#ffffff", border: `1px solid ${s.color}30`, borderRadius: 10, padding: "14px 16px", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ color: "#6b7280", fontSize: 11, marginTop: 4 }}>{s.label}</div>
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
              <span style={{ color: "#6b7280", fontSize: 13, alignSelf: "center" }}>{filteredChallenges.length} résultat(s)</span>
            </div>

            {/* Table */}
            <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      {["Trader", "Compte", "Modèle", "Phase", "Statut", "Balance", "Payé", "Jours", "Account ID", "Password", "Serveur", "Date", "Actions"].map(h => (
                        <th key={h} style={{ padding: "13px 14px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
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
                                {[
                                  { label: "Prénom", value: c.client_first_name },
                                  { label: "Nom", value: c.client_last_name },
                                  { label: "Email", value: c.user_email },
                                  { label: "Mobile", value: c.client_phone || "+33" },
                                  { label: "Balance", value: c.account_size.replace("$","").replace(",","") },
                                ].map((f, i) => (
                                  <button key={i} onClick={() => copyToClipboard(f.value)}
                                    style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", color: "#6b7280", fontSize: 11, cursor: "pointer" }}>
                                    <span style={{ color: "#8a96aa", fontSize: 10 }}>{f.label}: </span>
                                    <span style={{ color: "#111", fontWeight: 600 }}>{f.value}</span>
                                    <span style={{ color: "#999", fontSize: 10 }}> ⎘</span>
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr key={c.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                          <td style={{ padding: "13px 14px", color: "#6b7280", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</td>
                          <td style={{ padding: "13px 14px", fontWeight: 700 }}>{c.account_size}</td>
                          <td style={{ padding: "13px 14px", color: "#8a96aa" }}>{c.model}</td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <select value={editData.phase || c.phase} onChange={e => setEditData(d => ({ ...d, phase: e.target.value }))} style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12 }}><option value="phase1">Phase 1</option><option value="phase2">Phase 2</option><option value="funded">Certified</option></select>
                              : <span style={{ color: c.phase === "funded" ? "#3b82f6" : c.phase === "phase2" ? "#f59e0b" : "#8a96aa", fontWeight: 600, fontSize: 12 }}>{c.phase === "funded" ? "certified" : c.phase}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <select value={editData.status || c.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))} style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12 }}><option value="active">Active</option><option value="passed">Passed</option><option value="funded">Certified</option><option value="failed">Failed</option></select>
                              : badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                          </td>
                          <td style={{ padding: "13px 14px", fontWeight: 700 }}>
                            {editing === c.id
                              ? <input type="number" value={editData.balance ?? c.balance} onChange={e => setEditData(d => ({ ...d, balance: Number(e.target.value) }))} style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 90 }} />
                              : `$${c.balance?.toLocaleString()}`}
                          </td>
                          <td style={{ padding: "13px 14px", color: "#22c55e" }}>€{c.amount_paid}</td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="number" value={editData.trading_days ?? c.trading_days} onChange={e => setEditData(d => ({ ...d, trading_days: Number(e.target.value) }))} style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 55 }} />
                              : <span style={{ color: c.trading_days >= 4 ? "#22c55e" : "#888" }}>{c.trading_days}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="text" value={editData.mt5_login ?? c.mt5_login ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_login: Number(e.target.value) }))} style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 120 }} />
                              : <span onClick={() => c.mt5_login && copyToClipboard(String(c.mt5_login))} style={{ color: c.mt5_login ? "#111" : "#8a96aa", fontSize: 12, fontWeight: 400, cursor: c.mt5_login ? "pointer" : "default", fontFamily: "monospace" }} title="Cliquer pour copier">{c.mt5_login || "—"}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="text" value={editData.mt5_password ?? c.mt5_password ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_password: e.target.value }))} style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 100 }} />
                              : <span onClick={() => c.mt5_password && copyToClipboard(c.mt5_password)} style={{ color: c.mt5_password ? "#111" : "#8a96aa", fontSize: 12, fontWeight: 400, cursor: c.mt5_password ? "pointer" : "default", fontFamily: "monospace" }} title="Cliquer pour copier">{c.mt5_password || "—"}</span>}
                          </td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <input type="text" value={editData.mt5_server ?? c.mt5_server ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_server: e.target.value }))} style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 6, padding: "4px 8px", color: "#111", fontSize: 12, width: 140 }} />
                              : <span onClick={() => c.mt5_server && copyToClipboard(c.mt5_server)} style={{ color: c.mt5_server ? "#111" : "#8a96aa", fontSize: 12, fontWeight: 400, cursor: c.mt5_server ? "pointer" : "default", fontFamily: "monospace" }} title="Cliquer pour copier">{c.mt5_server || "—"}</span>}
                          </td>
                          <td style={{ padding: "13px 14px", color: "#6b7280", fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: "13px 14px" }}>
                            {editing === c.id
                              ? <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => saveChallenge(c.id)} style={{ backgroundColor: "#fff", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✓</button>
                                  <button onClick={() => { setEditing(null); setEditData({}); }} style={{ backgroundColor: "transparent", color: "#6b7280", border: "1px solid #333", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                </div>
                              : <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => { setEditing(c.id); setEditData({}); }} style={{ backgroundColor: "rgba(255,255,255,0.6)", color: "#111", border: "1px solid #ccc", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                                  <button onClick={() => fixMT5Balance(c)} style={{ backgroundColor: "rgba(255,193,7,0.15)", color: "#b45309", border: "1px solid #b4530933", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }} title="Corriger balance MT5">⚡</button>
                                  {c.phase === "funded" && <button onClick={() => withdrawMT5Profit(c)} style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid #C9A84C33", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }} title="Retirer profit MT5">💰</button>}
                                  {c.status === "failed" && c.mt5_login && <button onClick={async () => {
                                    if (!confirm(`Bloquer MT5 ${c.mt5_login} (grp5) ?`)) return;
                                    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ login: c.mt5_login, group: "Starwave\\demo\\FX1\\grp5" }) });
                                    const data = await res.json();
                                    if (res.ok) alert(`✅ Compte ${c.mt5_login} bloqué (grp5)`);
                                    else alert(`Erreur : ${data.error}`);
                                  }} style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 8px", fontSize: 11, cursor: "pointer" }} title="Bloquer compte MT5">🔴</button>}
                                  <button onClick={() => deleteChallenge(c.id)} style={{ backgroundColor: "rgba(255,255,255,0.6)", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                </div>}
                          </td>
                        </tr>
                      </>
                    ))}
                    {filteredChallenges.length === 0 && <tr><td colSpan={13} style={{ padding: 40, textAlign: "center", color: "#4a5568" }}>Aucun challenge</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══ CRM TRADERS ══ */}
        {tab === "crm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "#6b7280", fontSize: 12, marginBottom: 8 }}>{traderCRM.length} traders — triés par dépense totale</div>
            {traderCRM.map(trader => {
              const activeC   = trader.challenges.filter(c => c.status === "active").length;
              const certC     = trader.challenges.filter(c => c.status === "funded").length;
              const failedC   = trader.challenges.filter(c => c.status === "failed").length;
              const isOpen    = crmExpanded === trader.email;
              return (
                <div key={trader.email} style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, overflow: "hidden" }}>
                  <div onClick={() => setCrmExpanded(isOpen ? null : trader.email)}
                    style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{trader.name || trader.email}</div>
                      {trader.name && <div style={{ color: "#6b7280", fontSize: 12 }}>{trader.email}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                      <div><span style={{ color: "#6b7280", fontSize: 11 }}>LTV </span><span style={{ color: "#22c55e", fontWeight: 800 }}>€{trader.totalSpent}</span></div>
                      <div><span style={{ color: "#6b7280", fontSize: 11 }}>Challenges </span><span style={{ fontWeight: 700 }}>{trader.challenges.length}</span></div>
                      <div><span style={{ color: "#6b7280", fontSize: 11 }}>Actifs </span><span style={{ color: "#22c55e", fontWeight: 700 }}>{activeC}</span></div>
                      {certC > 0   && <div><span style={{ color: "#6b7280", fontSize: 11 }}>Certified </span><span style={{ color: "#3b82f6", fontWeight: 700 }}>{certC}</span></div>}
                      {failedC > 0 && <div><span style={{ color: "#6b7280", fontSize: 11 }}>Failed </span><span style={{ color: "#ef4444", fontWeight: 700 }}>{failedC}</span></div>}
                      <div style={{ color: "#6b7280", fontSize: 11 }}>depuis {new Date(trader.firstDate).toLocaleDateString()}</div>
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
                        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                          <div>
                            <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Contact</div>
                            <div style={{ fontWeight: 700 }}>{trader.name || "—"}</div>
                            <div style={{ color: "#8a96aa", fontSize: 12 }}>{trader.email}</div>
                            {(profile?.phone || firstChallenge?.client_phone) && <div style={{ color: "#8a96aa", fontSize: 12 }}>{profile?.phone || firstChallenge?.client_phone}</div>}
                            {profile?.address && <div style={{ color: "#666", fontSize: 11, marginTop: 4 }}>{profile.address}{profile.postal_code ? `, ${profile.postal_code}` : ""} {profile.city || ""}{profile.country ? ` — ${profile.country}` : ""}</div>}
                            <button onClick={() => sendAccessEmail(trader.email)} style={{ marginTop: 8, backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid #333", borderRadius: 6, color: "#C9A84C", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>
                              {accessEmailMsg[trader.email] || "✉ Envoyer email d'accès"}
                            </button>
                          </div>
                          <div>
                            <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Client depuis</div>
                            <div style={{ fontWeight: 700 }}>{new Date(trader.firstDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                          </div>
                          <div>
                            <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total dépensé (LTV)</div>
                            <div style={{ fontWeight: 900, fontSize: 18, color: "#22c55e" }}>€{trader.totalSpent}</div>
                          </div>
                          <div>
                            <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Récompenses reçues</div>
                            <div style={{ fontWeight: 900, fontSize: 18, color: totalPaid > 0 ? "#3b82f6" : "#333" }}>€{totalPaid.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Challenges</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                              {[
                                { label: "Total",    value: trader.challenges.length,                                color: "#fff"    },
                                { label: "Actifs",   value: activeC,                                                 color: "#22c55e" },
                                { label: "Certified",value: certC,                                                   color: "#3b82f6" },
                                { label: "Failed",   value: failedC,                                                 color: "#ef4444" },
                              ].map(s => s.value > 0 && (
                                <span key={s.label} style={{ fontSize: 11 }}>
                                  <span style={{ color: "#6b7280" }}>{s.label} </span>
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
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                              <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginRight: 4 }}>KYC</div>
                              <span style={{ backgroundColor: `${kycColor}20`, color: kycColor, padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{kycLabel}</span>
                              {kyc?.kyc_submitted_at && <span style={{ color: "#6b7280", fontSize: 11 }}>soumis le {new Date(kyc.kyc_submitted_at).toLocaleDateString("fr-FR")}</span>}

                              {kyc && docFields.map(([field, label]) => (
                                kyc.doc_urls[field] ? (
                                  <a key={field} href={kyc.doc_urls[field]!} target="_blank" rel="noopener noreferrer"
                                    style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid #2a2a2a", borderRadius: 7, padding: "4px 10px", color: "#38bdf8", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
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
                                    placeholder="Motif de refus..." style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 7, padding: "4px 10px", color: "#111", fontSize: 11, outline: "none", width: 150 }} />
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
                          <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Historique complet</div>
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
                                      {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.6)", minHeight: 24 }} />}
                                    </div>
                                    {/* Contenu */}
                                    <div style={{ flex: 1, paddingBottom: 16 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: "#6b7280" }}>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                                        <span style={{ fontWeight: 700, fontSize: 13 }}>Challenge {c.account_size}</span>
                                        <span style={{ color: "#8a96aa", fontSize: 12 }}>{c.model}</span>
                                        {badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                                        <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>€{c.amount_paid} payé</span>
                                        {c.payment_method && <span style={{ backgroundColor: c.payment_method === "crypto" ? "rgba(245,158,11,0.1)" : "rgba(21,101,192,0.1)", color: c.payment_method === "crypto" ? "#f59e0b" : "#1565C0", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{c.payment_method === "crypto" ? "🔶 Crypto" : "🏦 Carte"}</span>}
                                      </div>
                                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "#6b7280" }}>
                                        <span>Phase : <span style={{ color: "#8a96aa" }}>{c.phase}</span></span>
                                        <span>Jours tradés : <span style={{ color: c.trading_days >= 4 ? "#22c55e" : "#888" }}>{c.trading_days}</span></span>
                                        {c.balance && <span>Balance : <span style={{ color: "#fff" }}>${c.balance?.toLocaleString()}</span></span>}
                                        {profit && <span>P&L : <span style={{ color: Number(profit) >= 0 ? "#22c55e" : "#ef4444" }}>{profit}%</span></span>}
                                        {c.mt5_login    && <span>MT5 Login : <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{c.mt5_login}</span></span>}
                                        {c.mt5_password && <span>Password : <span style={{ color: "#38bdf8", fontFamily: "monospace" }}>{c.mt5_password}</span></span>}
                                        {c.mt5_server   && <span>Serveur : <span style={{ color: "#38bdf8" }}>{c.mt5_server}</span></span>}
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
                                      {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.6)", minHeight: 24 }} />}
                                    </div>
                                    <div style={{ flex: 1, paddingBottom: 16 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, color: "#6b7280" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                                        <span style={{ fontWeight: 700, fontSize: 13, color: "#3b82f6" }}>Demande de récompense</span>
                                        <span style={{ fontWeight: 900, fontSize: 14, color: "#22c55e" }}>€{p.amount?.toLocaleString()}</span>
                                        {badge(STATUS_LABELS[p.status] || p.status, STATUS_COLORS[p.status] || "#888")}
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
            {traderCRM.length === 0 && <div style={{ color: "#6b7280", textAlign: "center", padding: 40 }}>Aucun trader</div>}
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
                <div key={i} style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, padding: "18px 22px" }}>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Graphique CA mensuel */}
            <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>CA mensuel</div>
              {monthlyRevenue.length === 0
                ? <div style={{ color: "#6b7280", textAlign: "center", padding: 20 }}>Aucune donnée</div>
                : <div style={{ display: "flex", gap: 8, alignItems: "flex-end", overflowX: "auto", paddingBottom: 8 }}>
                    {monthlyRevenue.map(m => (
                      <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 60 }}>
                        <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>€{Math.round(m.ca/1000)}k</div>
                        <div style={{ width: 44, backgroundColor: "#00C2FF", borderRadius: "4px 4px 0 0", height: Math.max(4, m.ca / maxCA * 140) }} title={`€${m.ca}`} />
                        {m.payoutsAmt > 0 && <div style={{ width: 44, backgroundColor: "#ef4444", borderRadius: "0 0 4px 4px", height: Math.max(2, m.payoutsAmt / maxCA * 140), marginTop: -4 }} title={`Récompenses: €${m.payoutsAmt}`} />}
                        <div style={{ fontSize: 9, color: "#6b7280", textAlign: "center" }}>{m.month.slice(5)}/{m.month.slice(2,4)}</div>
                        <div style={{ fontSize: 9, color: m.marge > 50 ? "#22c55e" : "#888" }}>{m.marge}%</div>
                      </div>
                    ))}
                  </div>}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <span style={{ fontSize: 10, color: "#00C2FF" }}>■ CA</span>
                <span style={{ fontSize: 10, color: "#ef4444" }}>■ Récompenses</span>
                <span style={{ fontSize: 10, color: "#6b7280" }}>% = marge brute</span>
              </div>
            </div>

            {/* CA par taille de compte */}
            <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>Répartition par taille de compte</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    {["Compte", "Challenges vendus", "CA total", "% du CA", "Actifs", "Certified", "Failed"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byAccountSize.map(row => {
                    const totalCA = challenges.reduce((s, c) => s + (c.amount_paid || 0), 0);
                    const pct = totalCA > 0 ? Math.round(row.revenue / totalCA * 100) : 0;
                    return (
                      <tr key={row.size} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: "#fff" }}>{row.size}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff" }}>{row.count}</td>
                        <td style={{ padding: "12px 16px", color: "#22c55e", fontWeight: 700 }}>€{row.revenue.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 4, height: 6, maxWidth: 80 }}>
                              <div style={{ width: `${pct}%`, backgroundColor: "#00C2FF", height: 6, borderRadius: 4 }} />
                            </div>
                            <span style={{ color: "#8a96aa", fontSize: 12 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#22c55e" }}>{row.active}</td>
                        <td style={{ padding: "12px 16px", color: "#3b82f6" }}>{row.certified}</td>
                        <td style={{ padding: "12px 16px", color: "#ef4444" }}>{row.failed}</td>
                      </tr>
                    );
                  })}
                  {byAccountSize.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#4a5568" }}>Aucune donnée</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Tableau mensuel */}
            <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    {["Mois", "Challenges", "CA", "Récompenses versées", "Marge brute"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyRevenue].reverse().map(m => (
                    <tr key={m.month} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{m.month}</td>
                      <td style={{ padding: "12px 16px", color: "#8a96aa" }}>{m.count}</td>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 700 }}>€{m.ca.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: "#ef4444" }}>€{m.payoutsAmt.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: m.marge > 50 ? "#22c55e" : "#888", fontWeight: 700 }}>{m.marge}%</td>
                    </tr>
                  ))}
                  {monthlyRevenue.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "#4a5568" }}>Aucune donnée</td></tr>}
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
                { label: "Montant total versé", value: `€${payouts.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()}`, color: "#22c55e" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 160 }}>
                  <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                    {["Trader", "Montant", "KYC", "Capital / MT5", "Réception", "Adresse / IBAN", "Statut", "Date", "Actions"].map(h => (
                      <th key={h} style={{ padding: "13px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payouts.map(p => {
                    const userKyc = kycSubmissions.find(k => k.user_email === p.user_email);
                    const userChallenge = challenges.find(c => c.id === p.challenge_id) || challenges.filter(c => c.user_email === p.user_email && c.phase === "funded").sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                    const kycColor = userKyc?.kyc_status === "approved" ? "#22c55e" : userKyc?.kyc_status === "rejected" ? "#ef4444" : "#f59e0b";
                    const kycLabel = userKyc?.kyc_status === "approved" ? "✓ Validé" : userKyc?.kyc_status === "rejected" ? "✕ Refusé" : "En attente";
                    return (
                    <tr key={p.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                      <td style={{ padding: "13px 16px", color: "#6b7280" }}>{p.user_email || p.user_id}</td>
                      <td style={{ padding: "13px 16px", fontWeight: 800, color: "#22c55e", fontSize: 15 }}>€{p.amount?.toLocaleString()}</td>
                      <td style={{ padding: "13px 16px" }}><span style={{ color: kycColor, fontWeight: 700, fontSize: 12 }}>{kycLabel}</span></td>
                      <td style={{ padding: "13px 16px", fontSize: 12 }}>
                        {userChallenge ? <><div style={{ fontWeight: 700 }}>{userChallenge.account_size}</div><div style={{ color: "#111", fontFamily: "monospace" }}>{userChallenge.mt5_login}</div></> : <span style={{ color: "#8a96aa" }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        {p.payment_method ? (
                          <span style={{ backgroundColor: p.payment_method === "crypto" ? "rgba(245,158,11,0.1)" : "rgba(21,101,192,0.1)", color: p.payment_method === "crypto" ? "#f59e0b" : "#1565C0", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>
                            {p.payment_method === "crypto" ? "🔶 Crypto" : "🏦 Virement"}
                          </span>
                        ) : <span style={{ color: "#8a96aa", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        {p.wallet_address ? (
                          <span onClick={() => navigator.clipboard.writeText(p.wallet_address!)} style={{ color: "#111", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }} title="Cliquer pour copier">
                            {p.wallet_address.length > 20 ? p.wallet_address.slice(0, 10) + "…" + p.wallet_address.slice(-6) : p.wallet_address} ⎘
                          </span>
                        ) : <span style={{ color: "#8a96aa", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>{badge(STATUS_LABELS[p.status] || p.status, STATUS_COLORS[p.status] || "#888")}</td>
                      <td style={{ padding: "13px 16px", color: "#6b7280", fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: "13px 16px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {p.status === "pending" && (<>
                            <button onClick={() => updatePayout(p.id, "paid")}
                              style={{ backgroundColor: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              ✓ Valider
                            </button>
                            <button onClick={async () => {
                              const reason = prompt("Motif du refus (visible par le client) :") || "";
                              const res = await fetch("/api/admin/payouts", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ id: p.id, status: "rejected", rejection_reason: reason }) });
                              const data = await res.json();
                              if (res.ok) setPayouts(ps => ps.map(x => x.id === p.id ? { ...x, ...data } : x));
                            }} style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                              ✕ Refuser
                            </button>
                          </>)}
                          {userChallenge?.mt5_login && (
                            <button onClick={() => triggerMT5WithdrawFromPayout(userChallenge.mt5_login!, userChallenge.start_balance)}
                              style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#C9A84C", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              title="Retrait profit MT5">
                              💰 MT5
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                  {payouts.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "#4a5568" }}>Aucune récompense</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ PROMO CODES ══ */}
        {tab === "promos" && (
          <>
            <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>Créer un code promo</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "CODE *", key: "code", placeholder: "SUMMER25", transform: (v: string) => v.toUpperCase() },
                  { label: "REMISE % *", key: "discount_percent", placeholder: "50", type: "number" },
                  { label: "MAX UTILISATIONS", key: "max_uses", placeholder: "Illimité", type: "number" },
                  { label: "EXPIRE LE", key: "expires_at", type: "datetime-local" },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ color: "#6b7280", fontSize: 10, marginBottom: 6 }}>{f.label}</div>
                    <input type={f.type || "text"} value={(newCode as Record<string,string>)[f.key]} placeholder={f.placeholder}
                      onChange={e => setNewCode(n => ({ ...n, [f.key]: f.transform ? f.transform(e.target.value) : e.target.value }))}
                      style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 8, padding: "10px 12px", color: "#111", fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
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

            <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 16, overflow: "hidden" }}>
              {promosLoading ? <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Chargement...</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        {["Code", "Remise", "Utilisé", "Max", "Expire", "Statut", "Créé", "Actions"].map(h => (
                          <th key={h} style={{ padding: "13px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => {
                        const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                        const isExhausted = p.max_uses !== null && p.used_count >= p.max_uses;
                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", opacity: (!p.active || isExpired || isExhausted) ? 0.5 : 1 }}>
                            <td style={{ padding: "13px 16px" }}><button onClick={() => { navigator.clipboard.writeText(p.code); }} title="Copier" style={{ fontWeight: 800, fontFamily: "monospace", letterSpacing: 1, background: "none", border: "none", cursor: "pointer", color: "#111", fontSize: 13, padding: 0 }}>{p.code} ⎘</button></td>
                            <td style={{ padding: "13px 16px", fontWeight: 700, color: "#22c55e" }}>{p.discount_percent === 100 ? "100% (GRATUIT)" : `${p.discount_percent}%`}</td>
                            <td style={{ padding: "13px 16px", color: "#8a96aa" }}>{p.used_count}</td>
                            <td style={{ padding: "13px 16px", color: "#6b7280" }}>{p.max_uses ?? "∞"}</td>
                            <td style={{ padding: "13px 16px", color: isExpired ? "#ef4444" : "#555", fontSize: 12 }}>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Jamais"}</td>
                            <td style={{ padding: "13px 16px" }}>
                              {isExpired ? badge("expiré", "#ef4444") : isExhausted ? badge("épuisé", "#f59e0b") : p.active ? badge("actif", "#22c55e") : badge("révoqué", "#555")}
                            </td>
                            <td style={{ padding: "13px 16px", color: "#6b7280", fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: "13px 16px" }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => togglePromo(p)} style={{ backgroundColor: "rgba(255,255,255,0.6)", color: p.active ? "#ef4444" : "#22c55e", border: `1px solid ${p.active ? "#ef444433" : "#22c55e33"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                                  {p.active ? "Révoquer" : "Restaurer"}
                                </button>
                                <button onClick={() => deletePromo(p.id)} style={{ backgroundColor: "rgba(255,255,255,0.6)", color: "#6b7280", border: "1px solid #e5e7eb", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Suppr.</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {promos.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#4a5568" }}>Aucun code promo</td></tr>}
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
                  <div key={i} style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 10, padding: "12px 20px" }}>
                    <div style={{ color: "#6b7280", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {kycMsg && <span style={{ color: kycMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 700 }}>{kycMsg}</span>}
            </div>

            {kycLoading && <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Chargement...</div>}

            {!kycLoading && kycSubmissions.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Aucune soumission KYC</div>
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
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#6b7280" }}>
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
                          style={{ backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 14px", color: "#38bdf8", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                          📄 {label}
                        </a>
                      ) : (
                        <span key={field} style={{ backgroundColor: "#111", border: "1px solid #e5e7eb", borderRadius: 8, padding: "8px 14px", color: "#4a5568", fontSize: 12 }}>{label} —</span>
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
                          style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.15)", borderRadius: 8, padding: "8px 12px", color: "#111", fontSize: 12, outline: "none" }}
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

        {/* ══ CRÉER CHALLENGE / REWARD ══ */}
        {tab === "create" && (
          <div style={{ maxWidth: 520 }}>
            {card(<>
              {/* Toggle Challenge / Reward */}
              <div style={{ display: "flex", background: "rgba(0,0,0,0.05)", borderRadius: 10, padding: 4, marginBottom: 24, gap: 4 }}>
                {([["challenge", "🎯 Challenge"], ["reward", "⭐ Compte Reward"]] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setCreateForm(f => ({ ...f, type: val }))} style={{
                    flex: 1, padding: "10px", borderRadius: 7, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 700,
                    backgroundColor: createForm.type === val ? (val === "reward" ? "#1565C0" : "#0D1B3E") : "transparent",
                    color: createForm.type === val ? "#fff" : "#6b7280",
                    transition: "all 0.2s",
                  }}>{label}</button>
                ))}
              </div>

              {createForm.type === "reward" && (
                <div style={{ background: "rgba(21,101,192,0.08)", border: "1px solid rgba(21,101,192,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#111" }}>
                  Le client recevra directement un <strong>compte Trader Reward</strong> (phase funded) avec son email MT5 + certificat.
                </div>
              )}

              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20, color: "#111" }}>
                {createForm.type === "reward" ? "Créer un compte Reward" : "Créer un challenge"} manuellement
              </div>

              {[
                { label: "Email du trader", el: <input type="email" value={createForm.userEmail} onChange={e => setCreateForm(f => ({ ...f, userEmail: e.target.value }))} placeholder="trader@email.com" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" as const }} /> },
                { label: "Prénom", el: <input type="text" value={createForm.firstName} onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jean" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" as const }} /> },
                { label: "Nom", el: <input type="text" value={createForm.lastName} onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" as const }} /> },
                { label: "Taille du compte", el: <select value={createForm.accountSize} onChange={e => setCreateForm(f => ({ ...f, accountSize: e.target.value }))} style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#111", outline: "none" }}><option>$10,000</option><option>$25,000</option><option>$50,000</option><option>$100,000</option><option>$200,000</option></select> },
                { label: "Modèle", el: <select value={createForm.model} onChange={e => setCreateForm(f => ({ ...f, model: e.target.value }))} style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#111", outline: "none" }}><option value="1step">1-Step</option><option value="2step">2-Step</option></select> },
                { label: "Montant payé (€)", el: <input type="number" value={createForm.amountPaid} onChange={e => setCreateForm(f => ({ ...f, amountPaid: e.target.value }))} placeholder="ex: 6.90" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.6)", border: "1px solid rgba(21,101,192,0.1)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" as const }} /> },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ color: "#6b7280", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.label}</div>
                  {f.el}
                </div>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, cursor: "pointer" }}>
                <input type="checkbox" checked={createForm.createMT5} onChange={e => setCreateForm(f => ({ ...f, createMT5: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <span style={{ color: "#4a5568", fontSize: 14 }}>Créer le compte MT5 automatiquement</span>
              </label>
              {createError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, padding: "10px 14px", backgroundColor: "#ef444410", borderRadius: 8 }}>{createError}</div>}
              {createMsg && <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 12, padding: "10px 14px", backgroundColor: "#22c55e10", borderRadius: 8 }}>{createMsg}</div>}
              <button onClick={createChallenge} disabled={createLoading || !createForm.userEmail}
                style={{ width: "100%", backgroundColor: createForm.type === "reward" ? "#1565C0" : "#C9A84C", color: createForm.type === "reward" ? "#fff" : "#000", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 800, cursor: createLoading ? "not-allowed" : "pointer", opacity: createLoading ? 0.7 : 1 }}>
                {createLoading ? "Création en cours..." : createForm.type === "reward" ? "⭐ Créer le compte Reward" : "🎯 Créer le challenge"}
              </button>
            </>)}
          </div>
        )}

        {/* ══ COMPTABILITÉ ══ */}
        {tab === "compta" && (() => {
          const paidPayouts = payouts.filter(p => p.status === "paid").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          const totalVersé = paidPayouts.reduce((s, p) => s + p.amount, 0);

          // Récap mensuel
          const monthly = new Map<string, { ca: number; versements: number; count: number }>();
          challenges.forEach(c => {
            const m = new Date(c.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "short" });
            const ex = monthly.get(m) || { ca: 0, versements: 0, count: 0 };
            ex.ca += c.amount_paid || 0; ex.count += 1;
            monthly.set(m, ex);
          });
          paidPayouts.forEach(p => {
            const m = new Date(p.created_at).toLocaleDateString("fr-FR", { year: "numeric", month: "short" });
            const ex = monthly.get(m) || { ca: 0, versements: 0, count: 0 };
            ex.versements += p.amount;
            monthly.set(m, ex);
          });

          const exportCSV = () => {
            const headers = ["Référence","Date","Email","Montant USD","Méthode","IBAN/Wallet","Statut"];
            const rows = paidPayouts.map(p => {
              const ref = `ELY-${new Date(p.created_at).getFullYear()}-${p.id.slice(0,6).toUpperCase()}`;
              return [ref, new Date(p.created_at).toLocaleDateString("fr-FR"), p.user_email, p.amount, p.payment_method === "crypto" ? "Crypto USDC" : "Virement", p.wallet_address || "", "Versé"].join(";");
            });
            const csv = [headers.join(";"), ...rows].join("\n");
            const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `traders-rewards-compta-${new Date().toISOString().slice(0,10)}.csv`; a.click();
          };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* KPIs */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "Récompenses versées", value: paidPayouts.length, color: "#22c55e" },
                  { label: "Total versé (USD)", value: `$${totalVersé.toLocaleString()}`, color: "#111" },
                  { label: "Virements bancaires", value: paidPayouts.filter(p => p.payment_method === "bank").length, color: "#111" },
                  { label: "Crypto USDC", value: paidPayouts.filter(p => p.payment_method === "crypto").length, color: "#C9A84C" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 160 }}>
                    <div style={{ color: "#6b7280", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Registre des versements */}
              <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>🧾 Registre des versements</div>
                  <button onClick={exportCSV} style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ⬇ Export CSV
                  </button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#f8faff" }}>
                      {["Référence","Date","Client","Montant","Méthode","IBAN / Wallet","Justificatif"].map(h => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paidPayouts.map((p, i) => {
                      const ref = `ELY-${new Date(p.created_at).getFullYear()}-${p.id.slice(0,6).toUpperCase()}`;
                      const ch = challenges.find(c => c.id === p.challenge_id);
                      const receiptUrl = `/payout-receipt?ref=${ref}&date=${new Date(p.created_at).toLocaleDateString("fr-FR")}&amount=${p.amount}&method=${p.payment_method||""}&email=${encodeURIComponent(p.user_email||"")}&size=${encodeURIComponent(ch?.account_size||"")}&login=${ch?.mt5_login||""}`;
                      return (
                        <tr key={p.id} style={{ borderBottom: i < paidPayouts.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: i % 2 === 0 ? "#fff" : "#f8faff" }}>
                          <td style={{ padding: "11px 14px", fontWeight: 700, color: "#111", fontSize: 12, fontFamily: "monospace" }}>{ref}</td>
                          <td style={{ padding: "11px 14px", color: "#6b7280" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                          <td style={{ padding: "11px 14px", color: "#111" }}>{p.user_email}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 800, color: "#22c55e" }}>${p.amount?.toLocaleString()}</td>
                          <td style={{ padding: "11px 14px" }}>
                            <span style={{ background: p.payment_method === "crypto" ? "rgba(245,158,11,0.1)" : "rgba(21,101,192,0.1)", color: p.payment_method === "crypto" ? "#f59e0b" : "#1565C0", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>
                              {p.payment_method === "crypto" ? "🔶 Crypto" : "🏦 Virement"}
                            </span>
                          </td>
                          <td style={{ padding: "11px 14px", color: "#6b7280", fontSize: 11, fontFamily: "monospace", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.wallet_address ? (p.wallet_address.length > 20 ? p.wallet_address.slice(0,12)+"…"+p.wallet_address.slice(-6) : p.wallet_address) : "—"}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <a href={receiptUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(21,101,192,0.08)", color: "#111", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(21,101,192,0.2)", textDecoration: "none" }}>
                              📄 PDF
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                    {paidPayouts.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Aucun versement enregistré</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* Récap mensuel */}
              <div style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", fontWeight: 800, fontSize: 16 }}>📅 Récapitulatif mensuel</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#f8faff" }}>
                      {["Mois","CA (€)","Récompenses versées ($)","Ventes","Marge brute"].map(h => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(monthly.entries()).reverse().map(([m, v], i) => (
                      <tr key={m} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)", background: i % 2 === 0 ? "#fff" : "#f8faff" }}>
                        <td style={{ padding: "11px 14px", fontWeight: 700, color: "#111" }}>{m}</td>
                        <td style={{ padding: "11px 14px", color: "#111", fontWeight: 700 }}>€{v.ca.toLocaleString()}</td>
                        <td style={{ padding: "11px 14px", color: "#ef4444", fontWeight: 700 }}>-${v.versements.toLocaleString()}</td>
                        <td style={{ padding: "11px 14px", color: "#6b7280" }}>{v.count}</td>
                        <td style={{ padding: "11px 14px", fontWeight: 800, color: v.ca - v.versements > 0 ? "#22c55e" : "#ef4444" }}>
                          €{(v.ca - v.versements).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* ══ STATISTIQUES ══ */}
        {tab === "stats" && (() => {
          const is1 = (m: string) => m?.toLowerCase().replace(/[\s-]/g,"").includes("1step");
          const total = challenges.length;
          const pct = (n: number, d = total) => d > 0 ? Math.round(n / d * 100) : 0;

          const sizes = ["$10,000","$25,000","$50,000","$100,000","$200,000"];

          const t2 = challenges.filter(c => !is1(c.model));
          const t2tot = t2.length;
          const t2p1Active  = t2.filter(c => c.phase==="phase1" && c.status==="active").length;
          const t2p1Failed  = t2.filter(c => c.phase==="phase1" && c.status==="failed").length;
          const t2p1Passed  = t2.filter(c => c.phase==="phase1" && c.status==="passed").length;
          const t2p2Active  = t2.filter(c => c.phase==="phase2" && c.status==="active").length;
          const t2p2Failed  = t2.filter(c => c.phase==="phase2" && c.status==="failed").length;
          const t2p2Passed  = t2.filter(c => c.phase==="phase2" && c.status==="passed").length;
          const t2cert      = t2.filter(c => c.phase==="funded" && c.status==="funded").length;
          const t2certFail  = t2.filter(c => c.phase==="funded" && c.status==="failed").length;

          const t1 = challenges.filter(c => is1(c.model));
          const t1tot = t1.length;
          const t1p1Active  = t1.filter(c => c.phase==="phase1" && c.status==="active").length;
          const t1p1Failed  = t1.filter(c => c.phase==="phase1" && c.status==="failed").length;
          const t1cert      = t1.filter(c => c.phase==="funded" && c.status==="funded").length;
          const t1certFail  = t1.filter(c => c.phase==="funded" && c.status==="failed").length;

          const totalActive  = challenges.filter(c => c.status==="active").length;
          const totalFailed  = challenges.filter(c => c.status==="failed").length;
          const totalCert    = challenges.filter(c => c.status==="funded").length;
          const totalPassed  = challenges.filter(c => c.status==="passed").length;
          const totalCA      = challenges.reduce((s,c) => s+(c.amount_paid||0), 0);
          const byCard       = challenges.filter(c => !c.payment_method||c.payment_method==="card").length;
          const byCrypto     = challenges.filter(c => c.payment_method==="crypto").length;
          const caCard       = challenges.filter(c => !c.payment_method||c.payment_method==="card").reduce((s,c)=>s+(c.amount_paid||0),0);
          const caCrypto     = challenges.filter(c => c.payment_method==="crypto").reduce((s,c)=>s+(c.amount_paid||0),0);

          const StatRow = ({ label, n, d = total, color = "#1565C0" }: { label: string; n: number; d?: number; color?: string }) => (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
              <span style={{ fontSize:13, color:"#4a5568" }}>{label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20, fontWeight:900, color, minWidth:36, textAlign:"right" }}>{n}</span>
                <span style={{ fontSize:11, color:"#8a96aa", minWidth:40, textAlign:"right", background:"rgba(0,0,0,0.04)", borderRadius:6, padding:"2px 6px" }}>{pct(n,d)}%</span>
              </div>
            </div>
          );

          const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
            <div style={{ background:"rgba(255,255,255,0.75)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.8)", borderRadius:12, padding:"20px 24px" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#1565C0", marginBottom:12, paddingBottom:8, borderBottom:"2px solid rgba(21,101,192,0.12)" }}>{title}</div>
              {children}
            </div>
          );

          return (
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

              {/* Résumé global */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
                {[
                  { label:"Total achetés",  value:String(total),              color:"#1565C0" },
                  { label:"CA total",       value:`€${Math.round(totalCA)}`,  color:"#1565C0" },
                  { label:"Actifs",         value:String(totalActive),         color:"#22c55e" },
                  { label:"Certified",      value:String(totalCert),           color:"#3b82f6" },
                  { label:"Failed",         value:String(totalFailed),         color:"#ef4444" },
                  { label:"Passed",         value:String(totalPassed),         color:"#f59e0b" },
                ].map((s,i) => (
                  <div key={i} style={{ background:"rgba(255,255,255,0.75)", backdropFilter:"blur(20px)", WebkitBackdropFilter:"blur(20px)", border:"1px solid rgba(255,255,255,0.8)", borderRadius:12, padding:"16px 18px" }}>
                    <div style={{ color:"#8a96aa", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                <Section title="💳 Par moyen de paiement">
                  <StatRow label="Carte bancaire" n={byCard} />
                  <StatRow label="Crypto" n={byCrypto} />
                  <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, fontSize:12, color:"#8a96aa" }}>
                    <span>CA carte : <strong style={{color:"#1565C0"}}>€{Math.round(caCard)}</strong></span>
                    <span>CA crypto : <strong style={{color:"#1565C0"}}>€{Math.round(caCrypto)}</strong></span>
                  </div>
                </Section>

                <Section title="📦 Par taille de compte">
                  {sizes.map(s => <StatRow key={s} label={s} n={challenges.filter(c=>c.account_size===s).length} />)}
                </Section>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
                <Section title={`🔵 2-Step — ${t2tot} comptes au total`}>
                  <StatRow label="Phase 1 — Actifs"            n={t2p1Active}  d={t2tot} />
                  <StatRow label="Phase 1 — Passed (→Phase 2)" n={t2p1Passed}  d={t2tot} color="#f59e0b" />
                  <StatRow label="Phase 1 — Failed"            n={t2p1Failed}  d={t2tot} color="#ef4444" />
                  <StatRow label="Phase 2 — Actifs"            n={t2p2Active}  d={t2tot} />
                  <StatRow label="Phase 2 — Passed (→Certif.)" n={t2p2Passed} d={t2tot} color="#f59e0b" />
                  <StatRow label="Phase 2 — Failed"            n={t2p2Failed}  d={t2tot} color="#ef4444" />
                  <StatRow label="Certified — Actifs"          n={t2cert}      d={t2tot} color="#3b82f6" />
                  <StatRow label="Certified — Failed"          n={t2certFail}  d={t2tot} color="#ef4444" />
                </Section>

                <Section title={`🟣 1-Step — ${t1tot} comptes au total`}>
                  <StatRow label="Phase 1 — Actifs"   n={t1p1Active}  d={t1tot} />
                  <StatRow label="Phase 1 — Failed"   n={t1p1Failed}  d={t1tot} color="#ef4444" />
                  <StatRow label="Certified — Actifs" n={t1cert}      d={t1tot} color="#3b82f6" />
                  <StatRow label="Certified — Failed" n={t1certFail}  d={t1tot} color="#ef4444" />
                </Section>
              </div>

              <Section title="📈 Taux de conversion & d'échec">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, paddingTop:8 }}>
                  {[
                    { label:"Taux failed global",        value:`${pct(totalFailed)}%`,                                                                                           color:"#ef4444" },
                    { label:"Taux failed Phase 1",       value:`${pct(t2p1Failed+t1p1Failed, t2tot+t1tot)}%`,                                                                    color:"#ef4444" },
                    { label:"Taux failed Phase 2 (2S)",  value:`${pct(t2p2Failed, t2p2Active+t2p2Failed+t2p2Passed+t2cert+t2certFail)}%`,                                       color:"#ef4444" },
                    { label:"Taux failed Certified",     value:`${pct(t2certFail+t1certFail, t2cert+t1cert+t2certFail+t1certFail||1)}%`,                                        color:"#ef4444" },
                    { label:"Conv. P1→P2 (2-Step)",      value:`${pct(t2p1Passed+t2p2Active+t2p2Failed+t2p2Passed+t2cert+t2certFail, t2tot)}%`,                                color:"#22c55e" },
                    { label:"Conv. P2→Certif. (2S)",     value:`${pct(t2cert+t2certFail, t2p2Active+t2p2Failed+t2p2Passed+t2cert+t2certFail||1)}%`,                            color:"#22c55e" },
                    { label:"Conv. Certified (1-Step)",  value:`${pct(t1cert+t1certFail, t1tot)}%`,                                                                             color:"#22c55e" },
                    { label:"Taux certified global",     value:`${pct(totalCert)}%`,                                                                                            color:"#3b82f6" },
                  ].map((s,i) => (
                    <div key={i} style={{ background:"rgba(255,255,255,0.5)", border:"1px solid rgba(0,0,0,0.06)", borderRadius:10, padding:"14px 16px" }}>
                      <div style={{ color:"#8a96aa", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{s.label}</div>
                      <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </Section>

            </div>
          );
        })()}

        </div>
      </div>
    </div>
  );
}
