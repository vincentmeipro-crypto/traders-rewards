"use client";
import { useEffect, useState, useMemo, useRef } from "react";

// Clé admin statique — accès sans connexion Supabase
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

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
  daily_start_balance?: number;
  daily_low_equity?: number;
  daily_dd?: number;
  highest_balance?: number;
  breach_equity?: number;
  breach_reason?: string;
  breach_value?: number;
  breach_at?: string;
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

type Tab = "overview" | "pipeline" | "algo" | "crm" | "financier" | "financier_algo" | "payouts" | "payouts_algo" | "promos" | "kyc" | "create" | "stats" | "compta" | "affilies" | "securite" | "settings" | "maintenance";
// Note : algo / financier_algo / payouts_algo retirés du menu — contenu conservé en code

type LoginEvent = {
  id: string;
  user_id: string;
  user_email: string;
  ip: string;
  country: string;
  is_vpn: boolean;
  fingerprint: string;
  user_agent: string;
  created_at: string;
};

type SecurityData = {
  shared_ips: { ip: string; emails: string[]; count: number; events: LoginEvent[] }[];
  shared_fingerprints: { fingerprint: string; emails: string[]; count: number; events: LoginEvent[] }[];
  vpn_users: LoginEvent[];
  events: LoginEvent[];
};

type MT5Session = {
  user_email: string;
  mt5_login: number;
  account_size: string;
  model: string;
  status: string;
  last_ip: string | null;
  last_login: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  funded: "Active",
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
  funded:  "#22c55e",
  pending: "#f59e0b",
  paid:    "#22c55e",
  rejected:"#ef4444",
};

// Labels pour le header (titre de page)
const TAB_LABELS: Record<Tab, string> = {
  overview:      "🏠 Overview",
  pipeline:      "📋 Challenges",
  algo:          "⚡ Algo",
  crm:           "👥 Clients",
  kyc:           "KYC",
  payouts:       "💰 Rewards",
  financier:     "Transactions",
  financier_algo:"Financier Algo",
  compta:        "Comptabilité",
  payouts_algo:  "Rewards Algo",
  promos:        "Codes promo",
  affilies:      "Affiliés",
  stats:         "📊 Analytics",
  securite:      "🔐 Sécurité",
  create:        "➕ Nouveau Challenge",
  settings:      "Plateforme",
  maintenance:   "Maintenance",
};

// Structure de navigation groupée
type NavItem = { id: Tab; label: string; sub?: boolean };
type NavGroup = { section?: string; items: NavItem[] } | { separator: true } | { cta: Tab; label: string };

const NAV: (NavGroup)[] = [
  { items: [{ id: "overview", label: "🏠 Overview" }] },
  { section: "CHALLENGES", items: [
    { id: "pipeline", label: "Tous les challenges" },
  ]},
  { section: "TRADERS", items: [
    { id: "crm",  label: "Clients" },
    { id: "kyc",  label: "KYC", sub: true },
  ]},
  { section: "FINANCE", items: [
    { id: "payouts",   label: "Rewards" },
    { id: "financier", label: "Transactions", sub: true },
    { id: "compta",    label: "Comptabilité", sub: true },
  ]},
  { section: "MARKETING", items: [
    { id: "affilies", label: "Affiliés" },
    { id: "promos",   label: "Codes promo", sub: true },
  ]},
  { items: [
    { id: "stats",    label: "📊 Analytics" },
    { id: "securite", label: "🔐 Sécurité" },
  ]},
  { separator: true },
  { cta: "create", label: "➕ Nouveau Challenge" },
  { separator: true },
  { section: "SETTINGS", items: [
    { id: "settings",     label: "Plateforme" },
    { id: "maintenance",  label: "Maintenance", sub: true },
  ]},
];

// TABS conservé pour compatibilité (mobile nav)
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",     label: "🏠 Overview" },
  { id: "pipeline",     label: "📋 Challenges" },
  { id: "crm",          label: "👥 Clients" },
  { id: "kyc",          label: "KYC" },
  { id: "payouts",      label: "💰 Rewards" },
  { id: "financier",    label: "Transactions" },
  { id: "compta",       label: "Comptabilité" },
  { id: "promos",       label: "Codes promo" },
  { id: "affilies",     label: "Affiliés" },
  { id: "stats",        label: "Analytics" },
  { id: "securite",     label: "🔐 Sécurité" },
  { id: "create",       label: "➕ Nouveau" },
  { id: "settings",     label: "⚙️ Settings" },
  { id: "maintenance",  label: "Maintenance" },
];

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 24px", ...style }}>{children}</div>
);

const badge = (label: string, color: string) => (
  <span style={{ backgroundColor: `${color}20`, color, padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{label}</span>
);

function CustomSelect({ value, onChange, options, small }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selected = options.find(o => o.value === value);
  const pad = small ? "4px 8px" : "10px 16px";
  const fs = small ? 12 : 13;
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={() => setOpen(o => !o)} style={{ backgroundColor: small ? "rgba(255,255,255,0.06)" : "#111111", border: `1px solid ${small ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.1)"}`, borderRadius: small ? 6 : 8, padding: pad, color: "#fff", fontSize: fs, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, outline: "none", whiteSpace: "nowrap" }}>
        {selected?.label ?? value}
        <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 2 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: "100%", backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, overflow: "hidden", zIndex: 1000, boxShadow: "0 8px 24px rgba(0,0,0,0.6)" }}>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#2a2a2a")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = o.value === value ? "#222" : "transparent")}
              style={{ padding: small ? "6px 12px" : "9px 16px", cursor: "pointer", fontSize: fs, color: "#fff", backgroundColor: o.value === value ? "#222" : "transparent", whiteSpace: "nowrap" }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const token = true; // accès sans connexion — toujours autorisé
  const [tab, setTab] = useState<Tab>("overview");
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

  // Pipeline Algo state
  const [algoSearch, setAlgoSearch] = useState("");
  const [algoFilterStatus, setAlgoFilterStatus] = useState("all");

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
  const [profiles, setProfiles] = useState<{ user_id: string; email: string | null; first_name: string | null; last_name: string | null; phone: string | null; address: string | null; city: string | null; postal_code: string | null; country: string | null; registration_ip?: string; registration_country?: string; registration_is_vpn?: boolean }[]>([]);

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

  // Restore challenges state
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sécurité state
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [mt5Sessions, setMt5Sessions] = useState<MT5Session[]>([]);
  const [mt5Loading, setMt5Loading] = useState(false);

  // Affiliés state
  type AffiliateReferral = { id: string; referred_user_id: string; purchase_amount: number; commission_amount: number; status: string; created_at: string };
  type Affiliate = { id: string; user_id: string; code: string; commission_rate: number; total_earned: number; total_paid: number; created_at: string; referrals: AffiliateReferral[]; first_name?: string; last_name?: string; email?: string };
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [affiliatesLoaded, setAffiliatesLoaded] = useState(false);
  const [affiliateExpanded, setAffiliateExpanded] = useState<string | null>(null);
  const [affiliatePromoForm, setAffiliatePromoForm] = useState<{ affiliateId: string; userId: string } | null>(null);
  const [affiliatePromoData, setAffiliatePromoData] = useState({ code: "", discount: "10", maxUses: "" });
  const [affiliateMsg, setAffiliateMsg] = useState("");

  // Settings state (V2 Phase 1)
  type SettingRow = { key: string; value: unknown; category: string; description: string | null; updated_at: string };
  const [settingsData, setSettingsData] = useState<SettingRow[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsEdit, setSettingsEdit] = useState<Record<string, string>>({}); // key → edited value string
  const [settingsSaving, setSettingsSaving] = useState<string | null>(null); // key en cours de sauvegarde
  const [settingsMsg, setSettingsMsg] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const loadAdminData = async () => {
    const headers = { "x-admin-key": ADMIN_KEY };
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

  useEffect(() => { loadAdminData(); }, []);

  const handleRestoreChallenges = async () => {
    setRestoreLoading(true);
    setRestoreMsg("Restauration en cours...");
    try {
      const res = await fetch("/api/admin/restore-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({
          masterPassword: "M@SeSh2u",
          server: "XyloMarkets-Server",
          accounts: [
            { login: 9009094831596, firstName: "Bruno",    lastName: "Penard",  email: "bpenard@yahoo.fr",             model: "2step", phase: "phase1" },
            { login: 9009094831597, firstName: "Aurélien", lastName: "Roussel", email: "aurelien.rou@gmail.com",        model: "2step", phase: "phase1" },
            { login: 9009094831598, firstName: "Régis",    lastName: "Allidé",  email: "regis.allide-codjo@orange.fr", model: "2step", phase: "phase1" },
            { login: 9009094832394, firstName: "Régis",    lastName: "Allidé",  email: "regis.allide-codjo@orange.fr", model: "1step", phase: "funded"  },
            { login: 9009094835395, firstName: "Samir",    lastName: "KHELIF",  email: "samir.khelif@yahoo.fr",        model: "1step", phase: "phase1" },
          ],
        }),
      });
      const data = await res.json();
      const results = data.results as { login: number; status: string; email?: string; error?: string }[];
      const ok = results.filter(r => r.status === "restored" || r.status === "already_exists").length;
      const fail = results.filter(r => r.status !== "restored" && r.status !== "already_exists").length;
      setRestoreMsg(`✅ ${ok} compte(s) restauré(s)${fail ? ` — ⚠ ${fail} erreur(s): ${results.filter(r => r.status !== "restored" && r.status !== "already_exists").map(r => `${r.login}:${r.status}`).join(", ")}` : ""}`);
    } catch (e) {
      setRestoreMsg(`Erreur: ${e}`);
    } finally {
      setRestoreLoading(false);
    }
  };

  // handleAdminLogin supprimé — accès sans connexion

  const loadPromos = async () => {
    setPromosLoading(true);
    const res = await fetch("/api/admin/promo-codes", { headers: { "x-admin-key": ADMIN_KEY } });
    const data = await res.json();
    if (Array.isArray(data)) setPromos(data);
    setPromosLoading(false);
  };

  const loadKyc = async () => {
    setKycLoading(true);
    const res = await fetch("/api/admin/kyc", { headers: { "x-admin-key": ADMIN_KEY } });
    const data = await res.json();
    if (Array.isArray(data)) setKycSubmissions(data);
    setKycLoading(false);
  };

  const loadSecurity = async () => {
    setSecurityLoading(true);
    const res = await fetch("/api/admin/security", { headers: { "x-admin-key": ADMIN_KEY } });
    const data = await res.json();
    setSecurityData(data);
    setSecurityLoading(false);
    // Charger les IPs MT5 en parallèle
    setMt5Loading(true);
    try {
      const mt5Res = await fetch("/api/security/mt5-ips", { headers: { "x-admin-key": ADMIN_KEY } });
      if (mt5Res.ok) { const mt5Data = await mt5Res.json(); setMt5Sessions(mt5Data.sessions || []); }
    } catch { /* ignore */ }
    setMt5Loading(false);
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (tab === "promos" && promos.length === 0) loadPromos();
  }, [tab, token]);

  useEffect(() => {
    if ((tab === "kyc" || tab === "crm")) loadKyc();
  }, [tab, token]);

  useEffect(() => {
    if (tab === "securite") loadSecurity();
  }, [tab, token]);

  const [settingsApiError, setSettingsApiError] = useState<string>("");
  useEffect(() => {
    if (tab === "settings" && settingsData.length === 0) {
      setSettingsLoading(true);
      setSettingsApiError("");
      fetch("/api/admin/settings", { headers: { "x-admin-key": ADMIN_KEY } })
        .then(async r => {
          const data = await r.json();
          console.log("[settings] API response:", r.status, data);
          if (data.settings && data.settings.length > 0) {
            setSettingsData(data.settings);
          } else if (data.error) {
            setSettingsApiError(`Erreur API (${r.status}): ${data.error}`);
          } else if (data.settings && data.settings.length === 0) {
            setSettingsApiError("API OK mais table settings vide — migration SQL non exécutée ?");
          } else {
            setSettingsApiError(`Réponse inattendue: ${JSON.stringify(data)}`);
          }
        })
        .catch(e => setSettingsApiError(`Erreur réseau: ${e.message}`))
        .finally(() => setSettingsLoading(false));
    }
  }, [tab, token]);

  useEffect(() => {
    if (tab === "affilies" && !affiliatesLoaded) {
      fetch("/api/admin/affiliates", { headers: { "x-admin-key": ADMIN_KEY } })
        .then(r => r.json()).then(data => { if (Array.isArray(data)) { setAffiliates(data); setAffiliatesLoaded(true); } });
    }
  }, [tab, token, affiliatesLoaded]);

  const createAffiliatePromo = async () => {
    if (!affiliatePromoForm || !affiliatePromoData.code) return;
    const res = await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ action: "create_promo", code: affiliatePromoData.code, discount_percent: affiliatePromoData.discount, max_uses: affiliatePromoData.maxUses || null, affiliate_user_id: affiliatePromoForm.userId }),
    });
    const data = await res.json();
    if (res.ok) { setAffiliateMsg(`✓ Code ${data.code} créé`); setAffiliatePromoForm(null); setAffiliatePromoData({ code: "", discount: "10", maxUses: "" }); }
    else setAffiliateMsg(`Erreur : ${data.error}`);
    setTimeout(() => setAffiliateMsg(""), 4000);
  };

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const now = new Date();
    const yr = now.getFullYear();
    const mo = now.getMonth();

    const inYear  = (d: string) => new Date(d).getFullYear() === yr;
    const inMonth = (d: string) => { const dt = new Date(d); return dt.getFullYear() === yr && dt.getMonth() === mo; };
    const today = now.getDate();
    const inDay  = (d: string) => { const dt = new Date(d); return dt.getFullYear() === yr && dt.getMonth() === mo && dt.getDate() === today; };
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); weekStart.setHours(0,0,0,0);
    const inWeek = (d: string) => { const dt = new Date(d); return dt >= weekStart; };

    // Ne compter que les achats originaux (phase1 + instant) — phase2/funded sont auto-créés, pas de nouvelles ventes
    const isPurchase = (c: Challenge) => c.phase === "phase1" || c.model === "instant";
    const caYear  = challenges.filter(c => inYear(c.created_at)  && isPurchase(c)).reduce((s, c) => s + (c.amount_paid || 0), 0);
    const caMonth = challenges.filter(c => inMonth(c.created_at) && isPurchase(c)).reduce((s, c) => s + (c.amount_paid || 0), 0);
    const caWeek  = challenges.filter(c => inWeek(c.created_at)  && isPurchase(c)).reduce((s, c) => s + (c.amount_paid || 0), 0);
    const caToday = challenges.filter(c => inDay(c.created_at)   && isPurchase(c)).reduce((s, c) => s + (c.amount_paid || 0), 0);
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
    challenges.filter(isPurchase).forEach(c => traderSpend.set(c.user_email, (traderSpend.get(c.user_email) || 0) + (c.amount_paid || 0)));
    const ltv = traderSpend.size > 0 ? Array.from(traderSpend.values()).reduce((s, v) => s + v, 0) / traderSpend.size : 0;

    const alerts = challenges.filter(c => {
      if (c.status !== "active" || !c.start_balance || !c.balance) return false;
      const dd = (c.start_balance - c.balance) / c.start_balance * 100;
      const limit = c.total_drawdown_limit || 10;
      return dd >= limit * 0.75;
    });

    return { caYear, caMonth, caWeek, caToday, margeYear, margeMonth, totalTraders, activeTraders, phase1, oneStep, phase2, passed, certified, failed, total, pendingPayouts: pendingPayouts.length, pendingAmt, convP1P2, convP2Fund, ltv, alerts };
  }, [challenges, payouts]);

  /* ── Monthly revenue ── */
  const monthlyRevenue = useMemo(() => {
    const map = new Map<string, { ca: number; payoutsAmt: number; count: number }>();
    const isPurchase = (c: Challenge) => c.phase === "phase1" || c.model === "instant";
    challenges.filter(isPurchase).forEach(c => {
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
    const isPurchase = (c: Challenge) => c.phase === "phase1" || c.model === "instant";
    challenges.forEach(c => {
      const key = c.account_size;
      const ex = map.get(key) || { count: 0, revenue: 0, active: 0, certified: 0, failed: 0 };
      ex.count   += 1;
      ex.revenue += isPurchase(c) ? (c.amount_paid || 0) : 0;
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
      if (c.phase === "phase1" || c.model === "instant") ex.totalSpent += c.amount_paid || 0;
      if (c.created_at < ex.firstDate) ex.firstDate = c.created_at;
      map.set(c.user_email, ex);
    });
    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [challenges]);

  /* ── Actions ── */
  const saveChallenge = async (id: string) => {
    const res = await fetch("/api/admin/challenges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ id, ...editData }),
    });
    const updated = await res.json();
    if (!res.ok || updated.error) { alert(`Erreur : ${updated.error}`); return; }
    setChallenges(cs => cs.map(c => c.id === id ? { ...c, ...updated } : c));
    setEditing(null); setEditData({});
  };

  const deleteChallenge = async (id: string) => {
    const c = challenges.find(x => x.id === id);
    const label = c ? `${c.client_first_name} ${c.client_last_name} — ${c.account_size} ${c.model} (${c.phase})` : id;
    if (!confirm(`Supprimer définitivement ce challenge ?\n\n${label}\n\nCette action est irréversible.`)) return;
    await fetch("/api/admin/challenges", { method: "DELETE", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id }) });
    setChallenges(cs => cs.filter(x => x.id !== id));
  };

  const fixMT5Balance = async (c: Challenge) => {
    if (!c.mt5_login) { alert("Pas de login MT5 sur ce compte"); return; }
    const sizeMap: Record<string, number> = { "$10,000": 10000, "$25,000": 25000, "$50,000": 50000, "$100,000": 100000, "$200,000": 200000 };
    const expected = sizeMap[c.account_size] ?? 0;
    // Lire la vraie balance MT5
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${c.mt5_login}`, { headers: { "x-admin-key": ADMIN_KEY } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const diff = expected - mt5Balance;
    if (diff <= 0) { alert(`Balance MT5 déjà correcte : $${mt5Balance.toLocaleString()}`); return; }
    if (!confirm(`MT5 balance actuelle : $${mt5Balance.toLocaleString()}\nAjouter $${diff.toLocaleString()} pour atteindre $${expected.toLocaleString()} ?`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ login: c.mt5_login, amount: diff }) });
    const data = await res.json();
    if (res.ok) alert(`✅ +$${diff.toLocaleString()} ajoutés sur MT5 ${c.mt5_login}`);
    else alert(`Erreur : ${data.error}`);
  };

  const withdrawMT5Profit = async (c: Challenge) => {
    if (!c.mt5_login) { alert("Pas de login MT5 sur ce compte"); return; }
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${c.mt5_login}`, { headers: { "x-admin-key": ADMIN_KEY } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const profit = Math.round((mt5Balance - c.start_balance) * 100) / 100;
    if (profit <= 0) { alert(`Aucun profit à retirer. Balance MT5 : $${mt5Balance.toLocaleString()}`); return; }
    if (!confirm(`Retirer le profit de $${profit.toLocaleString()} sur MT5 ${c.mt5_login} ?\n(Balance actuelle : $${mt5Balance.toLocaleString()} → $${c.start_balance.toLocaleString()})`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ login: c.mt5_login, amount: profit, withdraw: true, comment: "Profit withdrawal" }) });
    const data = await res.json();
    if (res.ok) alert(`✅ Retrait de $${profit.toLocaleString()} effectué sur MT5 ${c.mt5_login}`);
    else alert(`Erreur : ${data.error}`);
  };

  const addMT5Custom = async (c: Challenge) => {
    if (!c.mt5_login) { alert("Pas de login MT5 sur ce compte"); return; }
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${c.mt5_login}`, { headers: { "x-admin-key": ADMIN_KEY } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const input = prompt(`MT5 #${c.mt5_login} — Balance actuelle : $${mt5Balance.toLocaleString()}\n\nMontant à ajouter ($) :`);
    if (!input) return;
    const amount = parseFloat(input.replace(",", "."));
    if (isNaN(amount) || amount <= 0) { alert("Montant invalide"); return; }
    if (!confirm(`Ajouter $${amount.toLocaleString()} sur MT5 ${c.mt5_login} ?\nBalance : $${mt5Balance.toLocaleString()} → $${(mt5Balance + amount).toLocaleString()}`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ login: c.mt5_login, amount, withdraw: false, comment: "Ajout manuel admin" }) });
    const data = await res.json();
    if (res.ok) {
      const newBalance = mt5Balance + amount;
      setChallenges(cs => cs.map(x => x.id === c.id ? { ...x, balance: newBalance } : x));
      alert(`✅ +$${amount.toLocaleString()} ajoutés sur MT5 ${c.mt5_login}`);
    } else alert(`Erreur : ${data.error}`);
  };

  const withdrawMT5Custom = async (c: Challenge) => {
    if (!c.mt5_login) { alert("Pas de login MT5 sur ce compte"); return; }
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${c.mt5_login}`, { headers: { "x-admin-key": ADMIN_KEY } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const input = prompt(`MT5 #${c.mt5_login} — Balance actuelle : $${mt5Balance.toLocaleString()}\n\nMontant à retirer ($) :`);
    if (!input) return;
    const amount = parseFloat(input.replace(",", "."));
    if (isNaN(amount) || amount <= 0) { alert("Montant invalide"); return; }
    if (amount > mt5Balance) { alert(`Impossible : $${amount.toLocaleString()} > balance ($${mt5Balance.toLocaleString()})`); return; }
    if (!confirm(`Retirer $${amount.toLocaleString()} sur MT5 ${c.mt5_login} ?\nBalance : $${mt5Balance.toLocaleString()} → $${(mt5Balance - amount).toLocaleString()}`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ login: c.mt5_login, amount, withdraw: true, comment: "Retrait manuel admin" }) });
    const data = await res.json();
    if (res.ok) {
      const newBalance = mt5Balance - amount;
      setChallenges(cs => cs.map(x => x.id === c.id ? { ...x, balance: newBalance } : x));
      alert(`✅ Retrait de $${amount.toLocaleString()} effectué sur MT5 ${c.mt5_login}`);
    } else alert(`Erreur : ${data.error}`);
  };

  const updatePayout = async (id: string, status: string) => {
    const res = await fetch("/api/admin/payouts", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (res.ok) {
      setPayouts(ps => ps.map(p => p.id === id ? { ...p, ...data } : p));
      // Refresh challenges so trading_days + balance display the reset values
      if (status === "paid") {
        fetch("/api/admin/challenges", { headers: { "x-admin-key": ADMIN_KEY } })
          .then(r => r.json()).then(d => { if (Array.isArray(d)) setChallenges(d); }).catch(() => {});
      }
    }
  };

  const triggerMT5WithdrawFromPayout = async (mt5Login: number, startBalance: number) => {
    if (!mt5Login) { alert("Pas de login MT5 sur ce compte"); return; }
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${mt5Login}`, { headers: { "x-admin-key": ADMIN_KEY } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    const profit = Math.round((mt5Balance - startBalance) * 100) / 100;
    if (profit <= 0) { alert(`Aucun profit MT5 à retirer.\nBalance actuelle : $${mt5Balance.toLocaleString()}`); return; }
    if (!confirm(`Retrait MT5 de $${profit.toLocaleString()} sur login ${mt5Login} ?\n(Balance : $${mt5Balance.toLocaleString()} → $${startBalance.toLocaleString()})`)) return;
    const res = await fetch("/api/admin/mt5-fix-balance", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ login: mt5Login, amount: profit, withdraw: true, comment: "Profit Withdrawal — Traders Rewards" }) });
    const data = await res.json();
    if (res.ok) alert(`✅ Retrait MT5 de $${profit.toLocaleString()} effectué`);
    else alert(`Erreur MT5 : ${data.error}`);
  };

  const [provisioningId, setProvisioningId] = useState<string | null>(null);
  const [provisionMsg, setProvisionMsg] = useState<Record<string, string>>({});

  const provisionMT5 = async (c: Challenge) => {
    setProvisioningId(c.id);
    try {
      const res = await fetch("/api/admin/provision-mt5", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ challengeId: c.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setProvisionMsg(m => ({ ...m, [c.id]: `✓ MT5 #${data.login}` }));
        setChallenges(cs => cs.map(x => x.id === c.id ? { ...x, mt5_login: data.login, mt5_password: data.password, mt5_server: data.server } : x));
      } else {
        setProvisionMsg(m => ({ ...m, [c.id]: `✗ ${data.error}` }));
      }
    } catch (e) {
      setProvisionMsg(m => ({ ...m, [c.id]: `✗ ${String(e)}` }));
    }
    setProvisioningId(null);
    setTimeout(() => setProvisionMsg(m => { const n = { ...m }; delete n[c.id]; return n; }), 8000);
  };

  const createChallenge = async () => {
    if (!token || !createForm.userEmail || !createForm.accountSize) return;
    setCreateLoading(true); setCreateError(""); setCreateMsg("");
    const res = await fetch("/api/admin/challenges", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ ...createForm, amountPaid: parseFloat(createForm.amountPaid) || 0 }) });
    const data = await res.json();
    setCreateLoading(false);
    if (res.ok) {
      setCreateMsg("✅ Challenge créé ! Email envoyé au trader.");
      setCreateForm(f => ({ ...f, userEmail: "", firstName: "", lastName: "", amountPaid: "" }));
      const r = await fetch("/api/admin/challenges", { headers: { "x-admin-key": ADMIN_KEY } });
      const d = await r.json();
      if (Array.isArray(d)) setChallenges(d);
    } else setCreateError(data.error || "Erreur");
  };

  const createPromo = async () => {
    if (!token || !newCode.code || !newCode.discount_percent) return;
    setPromoError("");
    const res = await fetch("/api/admin/promo-codes", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ code: newCode.code, discount_percent: Number(newCode.discount_percent), max_uses: newCode.max_uses ? Number(newCode.max_uses) : null, expires_at: newCode.expires_at || null }) });
    const data = await res.json();
    if (res.ok) { setPromos(p => [data, ...p]); setNewCode({ code: "", discount_percent: "", max_uses: "", expires_at: "" }); setPromoMsg("Code créé !"); setTimeout(() => setPromoMsg(""), 3000); }
    else setPromoError(data.error || "Erreur");
  };

  const togglePromo = async (promo: PromoCode) => {
    const res = await fetch("/api/admin/promo-codes", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id: promo.id, active: !promo.active }) });
    const data = await res.json();
    if (res.ok) setPromos(p => p.map(x => x.id === promo.id ? data : x));
  };

  const [accessEmailMsg, setAccessEmailMsg] = useState<Record<string, string>>({});
  const sendAccessEmail = async (email: string) => {
    const res = await fetch("/api/admin/send-access-email", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ email }) });
    setAccessEmailMsg(m => ({ ...m, [email]: res.ok ? "✓ Email envoyé" : "Erreur" }));
    setTimeout(() => setAccessEmailMsg(m => { const n = { ...m }; delete n[email]; return n; }), 4000);
  };

  const updateKyc = async (user_id: string, status: string, rejection_reason?: string) => {
    const res = await fetch("/api/admin/kyc", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ user_id, status, rejection_reason }) });
    if (res.ok) {
      setKycSubmissions(ks => ks.map(k => k.id === user_id ? { ...k, kyc_status: status, kyc_rejection_reason: rejection_reason || null } : k));
      setKycMsg(status === "approved" ? "✓ KYC approuvé" : "KYC refusé");
      setTimeout(() => setKycMsg(""), 3000);
    }
  };

  const deletePromo = async (id: string) => {
    if (!token || !confirm("Supprimer ce code ?")) return;
    await fetch("/api/admin/promo-codes", { method: "DELETE", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id }) });
    setPromos(p => p.filter(x => x.id !== id));
  };

  const runSync = async () => {
    setSyncing(true); setSyncMsg(""); setSyncDetail("");
    try {
      const res = await fetch("/api/metaapi/sync", { headers: { Authorization: `Bearer admin-vincentmeipro@gmail.com` } });
      const data = await res.json();
      setSyncMsg(`✓ ${data.synced ?? 0}/${data.total ?? 0} synchronisé(s)`);
      setSyncDetail(JSON.stringify(data.results ?? data, null, 2));
      if (token) { const r = await fetch("/api/admin/challenges", { headers: { "x-admin-key": ADMIN_KEY } }); const d = await r.json(); if (Array.isArray(d)) setChallenges(d); }
    } catch (e) { setSyncMsg("Erreur sync"); setSyncDetail(String(e)); }
    setSyncing(false);
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const filteredChallenges = challenges.filter(c => {
    if (c.model === "vip") return false;
    const matchSearch = c.user_email?.toLowerCase().includes(search.toLowerCase()) || c.client_first_name?.toLowerCase().includes(search.toLowerCase()) || c.client_last_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredAlgoChallenges = challenges.filter(c => {
    if (c.model !== "vip") return false;
    const matchSearch = c.user_email?.toLowerCase().includes(algoSearch.toLowerCase()) || c.client_first_name?.toLowerCase().includes(algoSearch.toLowerCase()) || c.client_last_name?.toLowerCase().includes(algoSearch.toLowerCase());
    const matchStatus = algoFilterStatus === "all" || c.status === algoFilterStatus;
    return matchSearch && matchStatus;
  });

  const maxCA = monthlyRevenue.length > 0 ? Math.max(...monthlyRevenue.map(m => m.ca)) : 1;

  // Formulaire login supprimé — accès direct sans connexion

  if (loading) return <div style={{ minHeight: "100vh", backgroundColor: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>Chargement...</div>;
  if (error) return <div style={{ minHeight: "100vh", backgroundColor: "#000000", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div style={{ backgroundColor: "#0a0a0a", border: "1px solid #fca5a5", borderRadius: 12, padding: 32 }}><div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 12 }}>Erreur admin</div><div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "monospace" }}>{error}</div></div></div>;

  const p = isMobile ? "16px" : "32px";

  return (
    <>
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "system-ui, sans-serif", color: "#fff", background: "#000000", flexDirection: isMobile ? "column" : "row" }}>

      {/* ── SIDEBAR desktop ── */}
      {!isMobile && (
        <div style={{ width: 220, backgroundColor: "#0a0a0a", borderRight: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          {/* Logo */}
          <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo-nom-noir.png" style={{ width: 34, height: 34, objectFit: "contain" }} />
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>Traders Rewards</div>
              <div style={{ color: "rgba(255,255,255,0.35)", fontWeight: 600, fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>Admin Panel</div>
            </div>
          </div>

          {/* Nav groupée */}
          <nav style={{ padding: "10px 8px", flex: 1 }}>
            {NAV.map((group, gi) => {
              if ("separator" in group) return (
                <div key={gi} style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", margin: "8px 8px" }} />
              );
              if ("cta" in group) return (
                <button key={gi} onClick={() => setTab(group.cta)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", padding: "9px 14px", background: tab === group.cta ? "#2563eb" : "rgba(59,130,246,0.18)", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 8, color: "#60a5fa", fontWeight: 700, fontSize: 12, cursor: "pointer", margin: "4px 0", letterSpacing: 0.3 }}>
                  {group.label}
                </button>
              );
              const kycBadge = kycSubmissions.filter(k => k.kyc_status === "pending").length;
              const secBadge = (securityData?.shared_ips?.length ?? 0) > 0;
              return (
                <div key={gi} style={{ marginBottom: 4 }}>
                  {"section" in group && group.section && (
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, textTransform: "uppercase", padding: "10px 14px 4px" }}>{group.section}</div>
                  )}
                  {group.items.map((item: NavItem) => (
                    <button key={item.id} onClick={() => setTab(item.id)} style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: item.sub ? "7px 14px 7px 22px" : "9px 14px", background: tab === item.id ? "rgba(59,130,246,0.15)" : "none", border: "none", borderLeft: `3px solid ${tab === item.id ? "#3B82F6" : "transparent"}`, color: tab === item.id ? "#fff" : item.sub ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.6)", fontWeight: tab === item.id ? 700 : 400, fontSize: item.sub ? 12 : 13, cursor: "pointer", textAlign: "left", borderRadius: "0 8px 8px 0", marginBottom: 1 }}>
                      {item.label}
                      {item.id === "payouts" && kpis.pendingPayouts > 0 && <span style={{ marginLeft: "auto", backgroundColor: "#ef4444", color: "#fff", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{kpis.pendingPayouts}</span>}
                      {item.id === "kyc" && kycBadge > 0 && <span style={{ marginLeft: "auto", backgroundColor: "#f59e0b", color: "#000", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{kycBadge}</span>}
                      {item.id === "securite" && secBadge && <span style={{ marginLeft: "auto", backgroundColor: "#ef4444", color: "#fff", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>!</span>}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>

          <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <a href="/dashboard" style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, textDecoration: "none", textAlign: "center", display: "block" }}>← Dashboard</a>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div style={{ flex: 1, backgroundColor: "transparent", overflowY: "auto", color: "#fff", paddingBottom: isMobile ? 70 : 0 }}>
        {/* Header */}
        <div style={{ backgroundColor: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: isMobile ? "12px 16px" : "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 1 }}>Admin</div>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "#fff" }}>{TAB_LABELS[tab] ?? tab}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isMobile && syncMsg && <span style={{ color: syncMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 12, fontWeight: 600 }}>{syncMsg}</span>}
            <button onClick={runSync} disabled={syncing} style={{ backgroundColor: syncing ? "rgba(255,255,255,0.08)" : "#3B82F6", color: syncing ? "rgba(255,255,255,0.35)" : "#fff", border: "none", borderRadius: 8, padding: isMobile ? "7px 12px" : "8px 18px", fontSize: isMobile ? 12 : 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", whiteSpace: "nowrap" }}>
              {syncing ? "Sync..." : "Sync MT5"}
            </button>
          </div>
        </div>

        {/* Mobile bottom nav — 6 onglets principaux uniquement */}
        {isMobile && (() => {
          const mobileNav: { id: Tab; label: string }[] = [
            { id: "overview",  label: "🏠" },
            { id: "pipeline",  label: "📋" },
            { id: "payouts",   label: "💰" },
            { id: "kyc",       label: "KYC" },
            { id: "create",    label: "➕" },
            { id: "settings",  label: "⚙️" },
          ];
          return (
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, backgroundColor: "#0a0a0a", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", padding: "4px 0" }}>
              {mobileNav.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ position: "relative", flex: 1, padding: "10px 4px", background: "none", border: "none", borderTop: `2px solid ${tab === t.id ? "#3B82F6" : "transparent"}`, color: tab === t.id ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: tab === t.id ? 700 : 400, fontSize: 13, cursor: "pointer" }}>
                  {t.label}
                  {t.id === "payouts" && kpis.pendingPayouts > 0 && <span style={{ position: "absolute", top: 4, right: "20%", backgroundColor: "#ef4444", color: "#fff", borderRadius: 100, padding: "1px 4px", fontSize: 8 }}>{kpis.pendingPayouts}</span>}
                  {t.id === "kyc" && kycSubmissions.filter(k => k.kyc_status === "pending").length > 0 && <span style={{ position: "absolute", top: 4, right: "20%", backgroundColor: "#f59e0b", color: "#000", borderRadius: 100, padding: "1px 4px", fontSize: 8 }}>{kycSubmissions.filter(k => k.kyc_status === "pending").length}</span>}
                </button>
              ))}
            </div>
          );
        })()}
        {syncDetail && (
          <div style={{ margin: "16px 32px 0", background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Résultat sync</span>
              <button onClick={() => setSyncDetail("")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer" }}>✕</button>
            </div>
            <pre style={{ color: "#fff", fontSize: 11, margin: 0, overflowX: "auto", whiteSpace: "pre-wrap" }}>{syncDetail}</pre>
          </div>
        )}
        <div style={{ padding: isMobile ? "16px 12px" : "28px 32px" }}>

        {/* ══ VUE D'ENSEMBLE ══ */}
        {tab === "overview" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Restauration déplacée → Settings > Maintenance */}

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
                { label: "CA Année en cours",   value: `€${kpis.caYear.toLocaleString()}`,   color: "#fff" },
                { label: "CA Mois en cours",    value: `€${kpis.caMonth.toLocaleString()}`,  color: "#fff" },
                { label: "Marge brute Année",   value: `${kpis.margeYear}%`,                 color: "#22c55e" },
                { label: "Marge brute Mois",    value: `${kpis.margeMonth}%`,                color: "#22c55e" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "18px 22px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
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
                { label: "Reward",             value: kpis.certified     },
                { label: "Failed",             value: kpis.failed        },
                { label: "Total Challenges",   value: kpis.total         },
              ].map((s, i) => (
                <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 20px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>{s.value}</div>
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
                <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "18px 22px", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{s.sub}</div>
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
                { label: "Phase 1 (2-Step)", value: kpis.phase1,    fs: "active"  },
                { label: "1-Step actifs",    value: kpis.oneStep,   fs: "active"  },
                { label: "Phase 2 (2-Step)", value: kpis.phase2,    fs: "active"  },
                { label: "Passés",           value: kpis.passed,    fs: "passed"  },
                { label: "Reward",           value: kpis.certified, fs: "funded"  },
                { label: "Failed",           value: kpis.failed,    fs: "failed"  },
              ].map((s, i) => (
                <div key={i} onClick={() => setFilterStatus(s.fs)}
                  style={{ flex: 1, backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "14px 16px", textAlign: "center", cursor: "pointer" }}>
                  <div style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>{s.value}</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
              <input placeholder="Recherche email / nom..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: 13, outline: "none", minWidth: 220 }} />
              <CustomSelect value={filterStatus} onChange={setFilterStatus} options={[
                { value: "all", label: "Tous les statuts" },
                { value: "active", label: "Active" },
                { value: "passed", label: "Passed" },
                { value: "funded", label: "Reward" },
                { value: "failed", label: "Failed" },
              ]} />
              <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, alignSelf: "center" }}>{filteredChallenges.length} résultat(s)</span>
            </div>

            {/* Table */}
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      {["Trader", "Compte", "Type", "Statut", "Balance", "Gain", "Payé", "J", "MT5", "Actions"].map(h => (
                        <th key={h} style={{ padding: "9px 8px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChallenges.map(c => (
                      <>
                        {(c.client_first_name || c.client_last_name) && (
                          <tr key={`${c.id}-icm`} style={{ backgroundColor: "rgba(201,168,76,0.03)" }}>
                            <td colSpan={10} style={{ padding: "6px 8px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {[
                                  { label: "Prénom", value: c.client_first_name },
                                  { label: "Nom", value: c.client_last_name },
                                  { label: "Email", value: c.user_email },
                                  { label: "Mobile", value: c.client_phone || "+33" },
                                  { label: "Balance", value: c.account_size.replace("$","").replace(",","") },
                                ].map((f, i) => (
                                  <button key={i} onClick={() => copyToClipboard(f.value)}
                                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid #ddd", borderRadius: 6, padding: "3px 8px", color: "rgba(255,255,255,0.45)", fontSize: 11, cursor: "pointer" }}>
                                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>{f.label}: </span>
                                    <span style={{ color: "#fff", fontWeight: 600 }}>{f.value}</span>
                                    <span style={{ color: "#999", fontSize: 10 }}> ⎘</span>
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                        <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: "9px 8px", color: "rgba(255,255,255,0.7)", maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 11 }}>{c.user_email}</td>
                          <td style={{ padding: "9px 8px", fontWeight: 800, color: "#fff", fontSize: 12, whiteSpace: "nowrap" }}>{c.account_size}</td>
                          <td style={{ padding: "9px 8px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <span style={{ background: c.model === "vip" ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.06)", color: c.model === "vip" ? "#a78bfa" : "rgba(255,255,255,0.75)", fontWeight: 700, fontSize: 10, padding: "2px 5px", borderRadius: 4, textTransform: "uppercase", letterSpacing: "0.5px", alignSelf: "flex-start" }}>{c.model === "vip" ? "ALGO" : c.model}</span>
                              {editing === c.id
                                ? <CustomSelect small value={editData.phase || c.phase} onChange={v => setEditData(d => ({ ...d, phase: v }))} options={[{ value: "phase1", label: "Phase 1" }, { value: "phase2", label: "Phase 2" }, { value: "funded", label: "Reward" }]} />
                                : <span style={{ color: c.phase === "funded" ? "#22c55e" : c.phase === "phase2" ? "#f59e0b" : "#8a96aa", fontWeight: 600, fontSize: 11 }}>{c.phase === "funded" ? "reward" : c.phase}</span>}
                            </div>
                          </td>
                          <td style={{ padding: "9px 8px" }}>
                            {editing === c.id
                              ? <CustomSelect small value={editData.status || c.status} onChange={v => setEditData(d => ({ ...d, status: v }))} options={[{ value: "active", label: "Active" }, { value: "passed", label: "Passed" }, { value: "funded", label: "Reward" }, { value: "failed", label: "Failed" }]} />
                              : badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                          </td>
                          <td style={{ padding: "9px 8px", fontWeight: 700 }}>
                            {editing === c.id
                              ? <input type="number" value={editData.balance ?? c.balance} onChange={e => {
                                  const nb = Number(e.target.value);
                                  setEditData(d => {
                                    const curLow = d.daily_low_equity ?? c.daily_low_equity ?? c.balance;
                                    return { ...d, balance: nb, daily_low_equity: Math.min(curLow, nb) };
                                  });
                                }} style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 90 }} />
                              : c.status === "failed" && c.breach_equity
                                ? <div>
                                    <div style={{ color: "#ef4444", fontSize: 13 }}>${Math.round(c.breach_equity).toLocaleString()}</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>cramé à -{c.breach_value?.toFixed(2)}%</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{c.breach_reason === "daily_drawdown" ? "DD jour" : "DD max"}</div>
                                  </div>
                                : `$${c.balance?.toLocaleString()}`}
                          </td>
                          <td style={{ padding: "6px 8px", minWidth: 130 }}>
                            {(() => {
                              if (!c.start_balance || !c.balance) return <span style={{ color: "#ccc" }}>—</span>;
                              const is1Step = c.model === "1step";
                              const maxTotal = c.total_drawdown_limit ?? 10;
                              const maxDaily = c.daily_drawdown_limit ?? (is1Step ? 3 : 5);
                              const highestBal = c.highest_balance ?? c.start_balance;
                              const totalRef = c.start_balance;

                              // Pour comptes failed : afficher info breach uniquement
                              if (c.status === "failed") {
                                const gain = ((c.balance - c.start_balance) / c.start_balance * 100);
                                const gainColor = gain > 0 ? "#22c55e" : gain < 0 ? "#ef4444" : "#9ca3af";
                                return (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                    <span style={{ fontWeight: 800, fontSize: 13, color: gainColor }}>{gain > 0 ? "+" : ""}{gain.toFixed(2)}%</span>
                                    {c.breach_value != null && (
                                      <div style={{ backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 6, padding: "4px 7px", border: "1px solid rgba(239,68,68,0.25)" }}>
                                        <div style={{ fontSize: 9, color: "#ef4444", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px", marginBottom: 2 }}>
                                          {c.breach_reason === "daily_drawdown" ? "DD Jour" : "DD Max"} — BREACH
                                        </div>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: "#ef4444" }}>
                                          -{c.breach_value.toFixed(2)}%
                                        </div>
                                        {c.breach_equity != null && (
                                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                                            equity crash: ${Math.round(c.breach_equity).toLocaleString()}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              }

                              // Pour comptes actifs : calcul DD live
                              const gain = ((c.balance - c.start_balance) / c.start_balance * 100);
                              const gainColor = gain > 0 ? "#22c55e" : gain < 0 ? "#ef4444" : "#9ca3af";

                              // DD Jour — recalcule depuis daily_start_balance / daily_low_equity
                              // Si daily_start_balance = start_balance (ancien code EOD), on prend balance actuelle
                              const _dS2 = c.daily_start_balance ?? null;
                              const _dL2 = c.daily_low_equity ?? c.balance;
                              const _st1 = _dS2 !== null && Math.abs(_dS2 - c.start_balance) < 1;
                              const _st2 = _dS2 !== null && _dS2 > c.start_balance + 1 && c.balance < c.start_balance - 1;
                              const _pStart = (_dS2 !== null && !_st1 && !_st2) ? _dS2 : c.balance;
                              const _pLow   = (_st1 || _st2) ? c.balance : (_dL2 >= c.balance - c.start_balance * 0.015 ? _dL2 : c.balance);
                              const dailyUsed = _pStart > 0 ? Math.max(0, (_pStart - _pLow) / _pStart * 100) : 0;
                              const dailyFloor = Math.round(_pStart * (1 - maxDaily / 100));
                              const ddPct = Math.min(dailyUsed / maxDaily * 100, 100);
                              const ddColor = dailyUsed >= maxDaily ? "#ef4444" : dailyUsed >= maxDaily * 0.7 ? "#f59e0b" : "#60a5fa";

                              // DD Max — divise par totalRef (pas start_balance) pour trailing correct
                              const totalUsed = Math.max(0, (totalRef - c.balance) / totalRef * 100);
                              const totalFloor = Math.round(c.start_balance * (1 - maxTotal / 100));
                              const totalPct = Math.min(totalUsed / maxTotal * 100, 100);
                              const totalColor = totalUsed >= maxTotal ? "#ef4444" : totalUsed >= maxTotal * 0.7 ? "#f59e0b" : "#a78bfa";

                              return (
                                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                  <span style={{ fontWeight: 800, fontSize: 13, color: gainColor }}>{gain > 0 ? "+" : ""}{gain.toFixed(2)}%</span>
                                  <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "4px 7px", border: `1px solid ${ddColor}33` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>DD Jour</span>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: ddColor }}>-{dailyUsed.toFixed(2)}% / {maxDaily}%</span>
                                    </div>
                                    <div style={{ height: 3, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                                      <div style={{ width: `${ddPct}%`, height: "100%", backgroundColor: ddColor, borderRadius: 99 }} />
                                    </div>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Plancher : <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>${dailyFloor.toLocaleString()}</span></div>
                                  </div>
                                  <div style={{ backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "4px 7px", border: `1px solid ${totalColor}33` }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.5px" }}>DD Max</span>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: totalColor }}>-{totalUsed.toFixed(2)}% / {maxTotal}%</span>
                                    </div>
                                    <div style={{ height: 3, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, overflow: "hidden" }}>
                                      <div style={{ width: `${totalPct}%`, height: "100%", backgroundColor: totalColor, borderRadius: 99 }} />
                                    </div>
                                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Plancher : <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>${totalFloor.toLocaleString()}</span></div>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td style={{ padding: "9px 8px", color: "#22c55e", fontSize: 12, whiteSpace: "nowrap" }}>€{c.amount_paid}</td>
                          <td style={{ padding: "9px 8px", textAlign: "center" }}>
                            {editing === c.id
                              ? <input type="number" value={editData.trading_days ?? c.trading_days} onChange={e => setEditData(d => ({ ...d, trading_days: Number(e.target.value) }))} style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "3px 5px", color: "#fff", fontSize: 12, width: 45 }} />
                              : <span style={{ color: c.trading_days >= 5 ? "#22c55e" : "#888", fontWeight: 700 }}>{c.trading_days}</span>}
                          </td>
                          <td style={{ padding: "9px 8px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {editing === c.id
                                ? <input type="text" value={editData.mt5_login ?? c.mt5_login ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_login: Number(e.target.value) }))} style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "3px 6px", color: "#60A5FA", fontSize: 11, width: 108, fontFamily: "monospace" }} />
                                : <span onClick={() => c.mt5_login && copyToClipboard(String(c.mt5_login))} style={{ color: c.mt5_login ? "#60A5FA" : "rgba(255,255,255,0.25)", fontSize: 11, cursor: c.mt5_login ? "pointer" : "default", fontFamily: "monospace" }} title="Copier ID">{c.mt5_login || "—"}</span>}
                              {editing === c.id
                                ? <input type="text" value={editData.mt5_password ?? c.mt5_password ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_password: e.target.value }))} style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "3px 6px", color: "#fff", fontSize: 11, width: 88, fontFamily: "monospace" }} />
                                : <span onClick={() => c.mt5_password && copyToClipboard(c.mt5_password)} style={{ color: c.mt5_password ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", fontSize: 10, cursor: c.mt5_password ? "pointer" : "default", fontFamily: "monospace" }} title="Copier MDP">{c.mt5_password || "—"}</span>}
                              {editing === c.id
                                ? <input type="text" value={editData.mt5_server ?? c.mt5_server ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_server: e.target.value }))} style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "3px 6px", color: "#fff", fontSize: 10, width: 108, fontFamily: "monospace" }} />
                                : <span onClick={() => c.mt5_server && copyToClipboard(c.mt5_server)} style={{ color: c.mt5_server ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)", fontSize: 9, cursor: c.mt5_server ? "pointer" : "default", fontFamily: "monospace" }} title="Copier Serveur">{c.mt5_server || "—"}</span>}
                            </div>
                          </td>
                          <td style={{ padding: "9px 8px" }}>
                            {editing === c.id
                              ? <div style={{ display: "flex", gap: 6 }}>
                                  <button onClick={() => saveChallenge(c.id)} style={{ backgroundColor: "#22c55e", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✓</button>
                                  <button onClick={() => { setEditing(null); setEditData({}); }} style={{ backgroundColor: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                </div>
                              : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                  <button onClick={() => { setEditing(c.id); setEditData({}); }} style={{ backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                                  {!c.mt5_login && (
                                    provisionMsg[c.id]
                                      ? <span style={{ fontSize: 11, color: provisionMsg[c.id].startsWith("✓") ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{provisionMsg[c.id]}</span>
                                      : <button onClick={() => provisionMT5(c)} disabled={provisioningId === c.id} style={{ backgroundColor: "rgba(249,115,22,0.12)", color: "#f97316", border: "1px solid rgba(249,115,22,0.35)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: provisioningId === c.id ? "not-allowed" : "pointer", opacity: provisioningId === c.id ? 0.5 : 1, fontWeight: 700 }}>
                                        {provisioningId === c.id ? "..." : "MT5"}
                                      </button>
                                  )}
                                  {c.mt5_login && <button onClick={() => addMT5Custom(c)} style={{ backgroundColor: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid #22c55e33", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>+$</button>}
                                  {c.mt5_login && <button onClick={() => withdrawMT5Custom(c)} style={{ backgroundColor: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>−$</button>}
                                  <button onClick={() => deleteChallenge(c.id)} style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                </div>}
                          </td>
                        </tr>
                      </>
                    ))}
                    {filteredChallenges.length === 0 && <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucun challenge</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ══ PIPELINE ALGO ══ */}
        {tab === "algo" && (() => {
          const algoChallenges = challenges.filter(c => c.model === "vip");
          const algoActive  = algoChallenges.filter(c => c.status === "active").length;
          const algoFunded  = algoChallenges.filter(c => c.status === "funded").length;
          const algoFailed  = algoChallenges.filter(c => c.status === "failed").length;
          const algoPassed  = algoChallenges.filter(c => c.status === "passed").length;
          return (
            <>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 8, padding: "6px 14px", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚡</span>
                  <span style={{ color: "#a78bfa", fontWeight: 800, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>Challenge ALGO</span>
                </div>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Comptes avec algorithme intégré — mots de passe séparés client / master</span>
              </div>

              {/* KPI cards */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {[
                  { label: "Total Algo", value: algoChallenges.length, color: "#a78bfa" },
                  { label: "Actifs",     value: algoActive,           color: "#22c55e" },
                  { label: "Passés",     value: algoPassed,           color: "#f59e0b" },
                  { label: "Reward",     value: algoFunded,           color: "#3b82f6" },
                  { label: "Failed",     value: algoFailed,           color: "#ef4444" },
                ].map((s, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 90, background: "#111111", border: `1px solid ${s.color}33`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                    <div style={{ color: s.color, fontSize: 22, fontWeight: 900 }}>{s.value}</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <input placeholder="Recherche email / nom..." value={algoSearch} onChange={e => setAlgoSearch(e.target.value)}
                  style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: 13, outline: "none", minWidth: 220 }} />
                <CustomSelect value={algoFilterStatus} onChange={setAlgoFilterStatus} options={[
                  { value: "all",    label: "Tous les statuts" },
                  { value: "active", label: "Active" },
                  { value: "passed", label: "Passed" },
                  { value: "funded", label: "Reward" },
                  { value: "failed", label: "Failed" },
                ]} />
                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, alignSelf: "center" }}>{filteredAlgoChallenges.length} compte(s)</span>
              </div>

              {/* Table */}
              <div style={{ background: "#111111", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(139,92,246,0.15)", background: "rgba(139,92,246,0.06)" }}>
                        {["Trader", "Compte", "Statut", "Balance", "Gain", "Login MT5", "🔒 MDP Investisseur (client)", "🗝️ MDP Master (admin)", "Serveur", "Date", "Actions"].map(h => (
                          <th key={h} style={{ padding: "13px 14px", textAlign: "left", color: "rgba(167,139,250,0.75)", fontWeight: 700, fontSize: 11, whiteSpace: "nowrap", letterSpacing: "0.3px" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAlgoChallenges.map(c => (
                        <>
                          {(c.client_first_name || c.client_last_name) && (
                            <tr key={`${c.id}-info`} style={{ background: "rgba(139,92,246,0.04)" }}>
                              <td colSpan={11} style={{ padding: "8px 14px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  {[
                                    { label: "Prénom",  value: c.client_first_name },
                                    { label: "Nom",     value: c.client_last_name  },
                                    { label: "Email",   value: c.user_email        },
                                    { label: "Mobile",  value: c.client_phone || "+33" },
                                  ].map((f, i) => (
                                    <button key={i} onClick={() => copyToClipboard(f.value)}
                                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, padding: "3px 8px", color: "#a78bfa", fontSize: 11, cursor: "pointer" }}>
                                      <span style={{ color: "rgba(167,139,250,0.6)", fontSize: 10 }}>{f.label}: </span>
                                      <span style={{ fontWeight: 600 }}>{f.value}</span>
                                      <span style={{ color: "#999", fontSize: 10 }}> ⎘</span>
                                    </button>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                            <td style={{ padding: "13px 14px", color: "rgba(255,255,255,0.6)", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>{c.user_email}</td>
                            <td style={{ padding: "13px 14px", fontWeight: 800, color: "#fff" }}>{c.account_size}</td>
                            <td style={{ padding: "13px 14px" }}>
                              {editing === c.id
                                ? <CustomSelect small value={editData.status || c.status} onChange={v => setEditData(d => ({ ...d, status: v }))} options={[{ value: "active", label: "Active" }, { value: "passed", label: "Passed" }, { value: "funded", label: "Reward" }, { value: "failed", label: "Failed" }]} />
                                : badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                            </td>
                            <td style={{ padding: "9px 8px", fontWeight: 700 }}>
                              {editing === c.id
                                ? <input type="number" value={editData.balance ?? c.balance} onChange={e => setEditData(d => ({ ...d, balance: Number(e.target.value) }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 90 }} />
                                : `$${c.balance?.toLocaleString()}`}
                            </td>
                            <td style={{ padding: "13px 14px" }}>
                              {(() => {
                                if (!c.start_balance || !c.balance) return <span style={{ color: "#ccc" }}>—</span>;
                                const gain = (c.balance - c.start_balance) / c.start_balance * 100;
                                const color = gain > 0 ? "#22c55e" : gain < 0 ? "#ef4444" : "#9ca3af";
                                return <span style={{ fontWeight: 700, color }}>{gain > 0 ? "+" : ""}{gain.toFixed(2)}%</span>;
                              })()}
                            </td>
                            <td style={{ padding: "13px 14px" }}>
                              {editing === c.id
                                ? <input type="text" value={editData.mt5_login ?? c.mt5_login ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_login: Number(e.target.value) }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 100 }} />
                                : <span onClick={() => c.mt5_login && copyToClipboard(String(c.mt5_login))} style={{ color: c.mt5_login ? "#a78bfa" : "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "monospace", cursor: c.mt5_login ? "pointer" : "default" }} title="Copier">{c.mt5_login || "—"}</span>}
                            </td>
                            {/* Investisseur (client) */}
                            <td style={{ padding: "13px 14px" }}>
                              {editing === c.id
                                ? <input type="text" value={editData.mt5_password_investor ?? c.mt5_password_investor ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_password_investor: e.target.value }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 120 }} />
                                : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#22c55e", fontWeight: 700, whiteSpace: "nowrap" }}>CLIENT</span>
                                    <span onClick={() => c.mt5_password_investor && copyToClipboard(c.mt5_password_investor)} style={{ color: c.mt5_password_investor ? "#a78bfa" : "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "monospace", cursor: c.mt5_password_investor ? "pointer" : "default" }} title="Copier">{c.mt5_password_investor || "—"}</span>
                                  </div>
                                )}
                            </td>
                            {/* Master (admin) */}
                            <td style={{ padding: "13px 14px" }}>
                              {editing === c.id
                                ? <input type="text" value={editData.mt5_password ?? c.mt5_password ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_password: e.target.value }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 120 }} />
                                : (
                                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <span style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#ef4444", fontWeight: 700, whiteSpace: "nowrap" }}>MASTER</span>
                                    <span onClick={() => c.mt5_password && copyToClipboard(c.mt5_password)} style={{ color: c.mt5_password ? "#f87171" : "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "monospace", cursor: c.mt5_password ? "pointer" : "default" }} title="Copier">{c.mt5_password || "—"}</span>
                                  </div>
                                )}
                            </td>
                            <td style={{ padding: "13px 14px" }}>
                              {editing === c.id
                                ? <input type="text" value={editData.mt5_server ?? c.mt5_server ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_server: e.target.value }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 130 }} />
                                : <span onClick={() => c.mt5_server && copyToClipboard(c.mt5_server)} style={{ color: c.mt5_server ? "#a78bfa" : "rgba(255,255,255,0.25)", fontSize: 12, fontFamily: "monospace", cursor: c.mt5_server ? "pointer" : "default" }} title="Copier">{c.mt5_server || "—"}</span>}
                            </td>
                            <td style={{ padding: "13px 14px", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: "13px 14px" }}>
                              {editing === c.id
                                ? <div style={{ display: "flex", gap: 6 }}>
                                    <button onClick={() => saveChallenge(c.id)} style={{ background: "#a78bfa", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✓</button>
                                    <button onClick={() => { setEditing(null); setEditData({}); }} style={{ background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                  </div>
                                : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <button onClick={() => { setEditing(c.id); setEditData({}); }} style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                                    {c.mt5_login && <button onClick={() => addMT5Custom(c)} style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid #22c55e33", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>+$</button>}
                                    {c.mt5_login && <button onClick={() => withdrawMT5Custom(c)} style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>−$</button>}
                                    <button onClick={() => deleteChallenge(c.id)} style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                  </div>}
                            </td>
                          </tr>
                        </>
                      ))}
                      {filteredAlgoChallenges.length === 0 && (
                        <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucun compte Algo</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          );
        })()}

        {/* ══ CRM TRADERS ══ */}
        {tab === "crm" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, marginBottom: 8 }}>{traderCRM.length} traders — triés par dépense totale</div>
            {traderCRM.map(trader => {
              const activeC   = trader.challenges.filter(c => c.status === "active").length;
              const certC     = trader.challenges.filter(c => c.status === "funded").length;
              const failedC   = trader.challenges.filter(c => c.status === "failed").length;
              const isOpen    = crmExpanded === trader.email;
              return (
                <div key={trader.email} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
                  <div onClick={() => setCrmExpanded(isOpen ? null : trader.email)}
                    style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{trader.name || trader.email}</div>
                      {trader.name && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{trader.email}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                      <div><span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>LTV </span><span style={{ color: "#22c55e", fontWeight: 800 }}>€{trader.totalSpent}</span></div>
                      <div><span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Challenges </span><span style={{ fontWeight: 700 }}>{trader.challenges.length}</span></div>
                      <div><span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Actifs </span><span style={{ color: "#22c55e", fontWeight: 700 }}>{activeC}</span></div>
                      {certC > 0   && <div><span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Reward </span><span style={{ color: "#3b82f6", fontWeight: 700 }}>{certC}</span></div>}
                      {failedC > 0 && <div><span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Failed </span><span style={{ color: "#ef4444", fontWeight: 700 }}>{failedC}</span></div>}
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>depuis {new Date(trader.firstDate).toLocaleDateString()}</div>
                    </div>
                    <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
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
                        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <div>
                            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Contact</div>
                            <div style={{ fontWeight: 700 }}>{trader.name || "—"}</div>
                            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{trader.email}</div>
                            {(profile?.phone || firstChallenge?.client_phone) && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{profile?.phone || firstChallenge?.client_phone}</div>}
                            {profile?.address && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 4 }}>{profile.address}{profile.postal_code ? `, ${profile.postal_code}` : ""} {profile.city || ""}{profile.country ? ` — ${profile.country}` : ""}</div>}
                            <button onClick={() => sendAccessEmail(trader.email)} style={{ marginTop: 8, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 6, color: "#60A5FA", fontSize: 11, padding: "4px 10px", cursor: "pointer" }}>
                              {accessEmailMsg[trader.email] || "✉ Envoyer email d'accès"}
                            </button>
                          </div>
                          <div>
                            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Client depuis</div>
                            <div style={{ fontWeight: 700 }}>{new Date(trader.firstDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</div>
                          </div>
                          <div>
                            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total dépensé (LTV)</div>
                            <div style={{ fontWeight: 900, fontSize: 18, color: "#22c55e" }}>€{trader.totalSpent}</div>
                          </div>
                          <div>
                            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Récompenses reçues</div>
                            <div style={{ fontWeight: 900, fontSize: 18, color: totalPaid > 0 ? "#3b82f6" : "rgba(255,255,255,0.35)" }}>€{totalPaid.toLocaleString()}</div>
                          </div>
                          <div>
                            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Challenges</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                              {[
                                { label: "Total",    value: trader.challenges.length,                                color: "#fff"    },
                                { label: "Actifs",   value: activeC,                                                 color: "#22c55e" },
                                { label: "Reward",   value: certC,                                                   color: "#3b82f6" },
                                { label: "Failed",   value: failedC,                                                 color: "#ef4444" },
                              ].map(s => s.value > 0 && (
                                <span key={s.label} style={{ fontSize: 11 }}>
                                  <span style={{ color: "rgba(255,255,255,0.45)" }}>{s.label} </span>
                                  <span style={{ color: s.color, fontWeight: 800 }}>{s.value}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                          );
                        })()}

                        {/* Comptes MT5 */}
                        {(() => {
                          const traderChallenges = trader.challenges.filter(c => c.model !== "vip");
                          const algoChallenges   = trader.challenges.filter(c => c.model === "vip");
                          const hasTrader = traderChallenges.length > 0;
                          const hasAlgo   = algoChallenges.length > 0;
                          if (!hasTrader && !hasAlgo) return null;
                          return (
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Comptes MT5</div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

                                {/* Challenges Trader */}
                                {hasTrader && (
                                  <div>
                                    <div style={{ color: "#60A5FA", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 4, padding: "1px 8px" }}>TRADER</span>
                                      <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, fontSize: 10, textTransform: "none" }}>{traderChallenges.length} compte(s)</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                      {traderChallenges.map(c => (
                                        <div key={c.id} style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "8px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                                          <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>{c.account_size}</span>
                                          <span style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, padding: "1px 7px", fontSize: 10, color: "rgba(255,255,255,0.55)", textTransform: "uppercase" }}>{c.model}</span>
                                          {badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                                          {c.mt5_login && (
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                                              Login : <span onClick={() => copyToClipboard(String(c.mt5_login))} style={{ color: "#60A5FA", fontFamily: "monospace", cursor: "pointer" }} title="Copier">{c.mt5_login}</span>
                                            </span>
                                          )}
                                          {c.mt5_password && (
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                                              MDP : <span onClick={() => copyToClipboard(c.mt5_password)} style={{ color: "#60A5FA", fontFamily: "monospace", cursor: "pointer" }} title="Copier">{c.mt5_password}</span>
                                            </span>
                                          )}
                                          {c.mt5_server && (
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                              Serveur : <span style={{ color: "rgba(255,255,255,0.55)" }}>{c.mt5_server}</span>
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Challenges Algo */}
                                {hasAlgo && (
                                  <div style={{ marginTop: hasTrader ? 8 : 0 }}>
                                    <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                      <span style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 4, padding: "1px 8px" }}>⚡ ALGO</span>
                                      <span style={{ color: "rgba(255,255,255,0.3)", fontWeight: 400, fontSize: 10, textTransform: "none" }}>{algoChallenges.length} compte(s)</span>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                      {algoChallenges.map(c => (
                                        <div key={c.id} style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 8, padding: "8px 12px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                                          <span style={{ fontWeight: 800, color: "#fff", fontSize: 13 }}>{c.account_size}</span>
                                          {badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                                          {c.mt5_login && (
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                                              Login : <span onClick={() => copyToClipboard(String(c.mt5_login))} style={{ color: "#a78bfa", fontFamily: "monospace", cursor: "pointer" }} title="Copier">{c.mt5_login}</span>
                                            </span>
                                          )}
                                          {c.mt5_password_investor && (
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 4 }}>
                                              <span style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 3, padding: "1px 5px", fontSize: 9, color: "#22c55e", fontWeight: 700 }}>CLIENT</span>
                                              <span onClick={() => copyToClipboard(c.mt5_password_investor)} style={{ color: "#a78bfa", fontFamily: "monospace", cursor: "pointer" }} title="Copier MDP investisseur">{c.mt5_password_investor}</span>
                                            </span>
                                          )}
                                          {c.mt5_password && (
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", display: "flex", alignItems: "center", gap: 4 }}>
                                              <span style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 3, padding: "1px 5px", fontSize: 9, color: "#ef4444", fontWeight: 700 }}>MASTER</span>
                                              <span onClick={() => copyToClipboard(c.mt5_password)} style={{ color: "#f87171", fontFamily: "monospace", cursor: "pointer" }} title="Copier MDP master">{c.mt5_password}</span>
                                            </span>
                                          )}
                                          {c.mt5_server && (
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                              Serveur : <span style={{ color: "rgba(255,255,255,0.55)" }}>{c.mt5_server}</span>
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

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
                            <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginRight: 4 }}>KYC</div>
                              <span style={{ backgroundColor: `${kycColor}20`, color: kycColor, padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{kycLabel}</span>
                              {kyc?.kyc_submitted_at && <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>soumis le {new Date(kyc.kyc_submitted_at).toLocaleDateString("fr-FR")}</span>}

                              {kyc && docFields.map(([field, label]) => (
                                kyc.doc_urls[field] ? (
                                  <a key={field} href={kyc.doc_urls[field]!} target="_blank" rel="noopener noreferrer"
                                    style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, padding: "4px 10px", color: "#38bdf8", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
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
                                    placeholder="Motif de refus..." style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 7, padding: "4px 10px", color: "#fff", fontSize: 11, outline: "none", width: 150 }} />
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
                          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Historique complet</div>
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
                                      {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.1)", minHeight: 24 }} />}
                                    </div>
                                    {/* Contenu */}
                                    <div style={{ flex: 1, paddingBottom: 16 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                                        <span style={{ fontWeight: 700, fontSize: 13 }}>Challenge {c.account_size}</span>
                                        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{c.model}</span>
                                        {badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                                        <span style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>€{c.amount_paid} payé</span>
                                        {c.payment_method && <span style={{ backgroundColor: c.payment_method === "crypto" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.12)", color: c.payment_method === "crypto" ? "#f59e0b" : "#60A5FA", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{c.payment_method === "crypto" ? "🔶 Crypto" : "🏦 Carte"}</span>}
                                      </div>
                                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                                        <span>Phase : <span style={{ color: "rgba(255,255,255,0.45)" }}>{c.phase}</span></span>
                                        <span>Jours tradés : <span style={{ color: c.trading_days >= 5 ? "#22c55e" : "#888" }}>{c.trading_days}</span></span>
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
                                      {!isLast && <div style={{ width: 1, flex: 1, backgroundColor: "rgba(255,255,255,0.1)", minHeight: 24 }} />}
                                    </div>
                                    <div style={{ flex: 1, paddingBottom: 16 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
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
            {traderCRM.length === 0 && <div style={{ color: "rgba(255,255,255,0.45)", textAlign: "center", padding: 40 }}>Aucun trader</div>}
          </div>
        )}

        {/* ══ FINANCIER ══ */}
        {tab === "financier" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              {[
                { label: "CA Aujourd'hui",     value: `€${kpis.caToday.toLocaleString()}`,  color: kpis.caToday > 0 ? "#22c55e" : "#fff" },
                { label: "CA Cette semaine",   value: `€${kpis.caWeek.toLocaleString()}`,   color: kpis.caWeek  > 0 ? "#22c55e" : "#fff" },
                { label: "CA Ce mois",         value: `€${kpis.caMonth.toLocaleString()}`,  color: "#fff" },
                { label: "CA Total",           value: `€${challenges.filter(c => c.phase === "phase1" || c.model === "instant").reduce((s,c) => s + (c.amount_paid||0),0).toLocaleString()}`, color: "#fff" },
                { label: "Récompenses versées",value: `€${payouts.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()}`, color: "#ef4444" },
                { label: "Marge brute totale", value: `${kpis.margeYear}%`,                 color: "#22c55e" },
                { label: "Nb challenges total",value: String(challenges.length),             color: "#fff" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#111111", border: `1px solid ${i < 2 ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "18px 22px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Graphique CA mensuel */}
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>CA mensuel</div>
              {monthlyRevenue.length === 0
                ? <div style={{ color: "rgba(255,255,255,0.45)", textAlign: "center", padding: 20 }}>Aucune donnée</div>
                : <div style={{ display: "flex", gap: 8, alignItems: "flex-end", overflowX: "auto", paddingBottom: 8 }}>
                    {monthlyRevenue.map(m => (
                      <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 60 }}>
                        <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>€{Math.round(m.ca/1000)}k</div>
                        <div style={{ width: 44, backgroundColor: "#00C2FF", borderRadius: "4px 4px 0 0", height: Math.max(4, m.ca / maxCA * 140) }} title={`€${m.ca}`} />
                        {m.payoutsAmt > 0 && <div style={{ width: 44, backgroundColor: "#ef4444", borderRadius: "0 0 4px 4px", height: Math.max(2, m.payoutsAmt / maxCA * 140), marginTop: -4 }} title={`Récompenses: €${m.payoutsAmt}`} />}
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>{m.month.slice(5)}/{m.month.slice(2,4)}</div>
                        <div style={{ fontSize: 9, color: m.marge > 50 ? "#22c55e" : "#888" }}>{m.marge}%</div>
                      </div>
                    ))}
                  </div>}
              <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                <span style={{ fontSize: 10, color: "#00C2FF" }}>■ CA</span>
                <span style={{ fontSize: 10, color: "#ef4444" }}>■ Récompenses</span>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>% = marge brute</span>
              </div>
            </div>

            {/* CA par taille de compte */}
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Répartition par taille de compte</div>
              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Compte", "Challenges vendus", "CA total", "% du CA", "Actifs", "Reward", "Failed"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byAccountSize.map(row => {
                    const totalCA = challenges.reduce((s, c) => s + (c.amount_paid || 0), 0);
                    const pct = totalCA > 0 ? Math.round(row.revenue / totalCA * 100) : 0;
                    return (
                      <tr key={row.size} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: "#fff" }}>{row.size}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 700, color: "#fff" }}>{row.count}</td>
                        <td style={{ padding: "12px 16px", color: "#22c55e", fontWeight: 700 }}>€{row.revenue.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 4, height: 6, maxWidth: 80 }}>
                              <div style={{ width: `${pct}%`, backgroundColor: "#00C2FF", height: 6, borderRadius: 4 }} />
                            </div>
                            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", color: "#22c55e" }}>{row.active}</td>
                        <td style={{ padding: "12px 16px", color: "#3b82f6" }}>{row.certified}</td>
                        <td style={{ padding: "12px 16px", color: "#ef4444" }}>{row.failed}</td>
                      </tr>
                    );
                  })}
                  {byAccountSize.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucune donnée</td></tr>}
                </tbody>
              </table>
              </div>
            </div>

            {/* Tableau mensuel */}
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 400 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Mois", "Challenges", "CA", "Récompenses versées", "Marge brute"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...monthlyRevenue].reverse().map(m => (
                    <tr key={m.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{m.month}</td>
                      <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.45)" }}>{m.count}</td>
                      <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 700 }}>€{m.ca.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: "#ef4444" }}>€{m.payoutsAmt.toLocaleString()}</td>
                      <td style={{ padding: "12px 16px", color: m.marge > 50 ? "#22c55e" : "#888", fontWeight: 700 }}>{m.marge}%</td>
                    </tr>
                  ))}
                  {monthlyRevenue.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucune donnée</td></tr>}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ FINANCIER ALGO ══ */}
        {tab === "financier_algo" && (() => {
          const algoCh = challenges.filter(c => c.model === "vip");
          const isPurchase = (c: Challenge) => c.phase === "phase1" || c.model === "vip";
          const algoRev = algoCh.filter(isPurchase);
          const now = new Date(); const yr = now.getFullYear(); const mo = now.getMonth();
          const inMonth = (d: string) => { const dt = new Date(d); return dt.getFullYear() === yr && dt.getMonth() === mo; };
          const inDay   = (d: string) => { const dt = new Date(d); return dt.getFullYear() === yr && dt.getMonth() === mo && dt.getDate() === now.getDate(); };
          const caTotal = algoRev.reduce((s, c) => s + (c.amount_paid || 0), 0);
          const caMonth = algoRev.filter(c => inMonth(c.created_at)).reduce((s, c) => s + (c.amount_paid || 0), 0);
          const caDay   = algoRev.filter(c => inDay(c.created_at)).reduce((s, c) => s + (c.amount_paid || 0), 0);
          const algoPayouts = payouts.filter(p => {
            const c = challenges.find(x => x.id === p.challenge_id) || challenges.find(x => x.user_email === p.user_email && x.model === "vip" && x.status === "funded");
            return c?.model === "vip";
          });
          const payoutsTotal = algoPayouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
          // Monthly revenue algo
          const revMap = new Map<string, { ca: number; payoutsAmt: number; count: number }>();
          algoRev.forEach(c => {
            const d = new Date(c.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
            const ex = revMap.get(key) || { ca: 0, payoutsAmt: 0, count: 0 };
            ex.ca += c.amount_paid || 0; ex.count += 1;
            revMap.set(key, ex);
          });
          algoPayouts.filter(p => p.status === "paid").forEach(p => {
            const d = new Date(p.created_at);
            const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
            const ex = revMap.get(key) || { ca: 0, payoutsAmt: 0, count: 0 };
            ex.payoutsAmt += p.amount;
            revMap.set(key, ex);
          });
          const algoMonthly = Array.from(revMap.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([month,v]) => ({ month, ...v, marge: v.ca > 0 ? Math.round((v.ca - v.payoutsAmt)/v.ca*100) : 0 }));
          const maxAlgoCA = algoMonthly.length > 0 ? Math.max(...algoMonthly.map(m => m.ca)) : 1;
          // By account size algo
          const sizeMap = new Map<string, { count: number; revenue: number; active: number; certified: number; failed: number }>();
          algoCh.forEach(c => {
            const key = c.account_size;
            const ex = sizeMap.get(key) || { count: 0, revenue: 0, active: 0, certified: 0, failed: 0 };
            ex.count += 1; ex.revenue += isPurchase(c) ? (c.amount_paid || 0) : 0;
            if (c.status === "active" || c.status === "passed") ex.active    += 1;
            if (c.status === "funded")                          ex.certified += 1;
            if (c.status === "failed")                          ex.failed    += 1;
            sizeMap.set(key, ex);
          });
          const algoBySize = Array.from(sizeMap.entries()).sort(([a],[b]) => parseInt(a.replace(/\D/g,"")) - parseInt(b.replace(/\D/g,""))).map(([size, v]) => ({ size, ...v }));
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 8, padding: "6px 14px" }}>
                  <span style={{ color: "#a78bfa", fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>⚡ FINANCIER ALGO</span>
                </div>
              </div>
              {/* KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
                {[
                  { label: "CA Aujourd'hui",      value: `€${caDay.toLocaleString()}`,          color: caDay   > 0 ? "#a78bfa" : "#fff" },
                  { label: "CA Ce mois",          value: `€${caMonth.toLocaleString()}`,         color: caMonth > 0 ? "#a78bfa" : "#fff" },
                  { label: "CA Total Algo",        value: `€${caTotal.toLocaleString()}`,         color: "#fff" },
                  { label: "Rewards versés",       value: `€${payoutsTotal.toLocaleString()}`,    color: "#ef4444" },
                  { label: "Comptes Algo total",   value: String(algoCh.length),                  color: "#a78bfa" },
                  { label: "Actifs",               value: String(algoCh.filter(c=>c.status==="active").length), color: "#22c55e" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#111111", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 12, padding: "18px 22px" }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {/* Graph mensuel */}
              <div style={{ background: "#111111", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ color: "#a78bfa", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 20 }}>CA mensuel Algo</div>
                {algoMonthly.length === 0
                  ? <div style={{ color: "rgba(255,255,255,0.45)", textAlign: "center", padding: 20 }}>Aucune donnée</div>
                  : <div style={{ display: "flex", gap: 8, alignItems: "flex-end", overflowX: "auto", paddingBottom: 8 }}>
                      {algoMonthly.map(m => (
                        <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 60 }}>
                          <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700 }}>€{Math.round(m.ca/1000)}k</div>
                          <div style={{ width: 44, backgroundColor: "#7c3aed", borderRadius: "4px 4px 0 0", height: Math.max(4, m.ca / maxAlgoCA * 140) }} title={`€${m.ca}`} />
                          {m.payoutsAmt > 0 && <div style={{ width: 44, backgroundColor: "#ef4444", borderRadius: "0 0 4px 4px", height: Math.max(2, m.payoutsAmt/maxAlgoCA*140), marginTop: -4 }} />}
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", textAlign: "center" }}>{m.month.slice(5)}/{m.month.slice(2,4)}</div>
                          <div style={{ fontSize: 9, color: m.marge > 50 ? "#22c55e" : "#888" }}>{m.marge}%</div>
                        </div>
                      ))}
                    </div>}
                <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
                  <span style={{ fontSize: 10, color: "#7c3aed" }}>■ CA Algo</span>
                  <span style={{ fontSize: 10, color: "#ef4444" }}>■ Rewards</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>% = marge brute</span>
                </div>
              </div>
              {/* Par taille */}
              <div style={{ background: "#111111", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", color: "#a78bfa", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, borderBottom: "1px solid rgba(139,92,246,0.1)" }}>Répartition par taille de compte Algo</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Compte", "Vendus", "CA total", "% du CA", "Actifs", "Reward", "Failed"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {algoBySize.map(row => {
                        const pct = caTotal > 0 ? Math.round(row.revenue / caTotal * 100) : 0;
                        return (
                          <tr key={row.size} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <td style={{ padding: "12px 16px", fontWeight: 800, color: "#fff" }}>{row.size}</td>
                            <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 700 }}>{row.count}</td>
                            <td style={{ padding: "12px 16px", color: "#a78bfa", fontWeight: 700 }}>€{row.revenue.toLocaleString()}</td>
                            <td style={{ padding: "12px 16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 6, maxWidth: 80 }}>
                                  <div style={{ width: `${pct}%`, background: "#7c3aed", height: 6, borderRadius: 4 }} />
                                </div>
                                <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{pct}%</span>
                              </div>
                            </td>
                            <td style={{ padding: "12px 16px", color: "#22c55e" }}>{row.active}</td>
                            <td style={{ padding: "12px 16px", color: "#3b82f6" }}>{row.certified}</td>
                            <td style={{ padding: "12px 16px", color: "#ef4444" }}>{row.failed}</td>
                          </tr>
                        );
                      })}
                      {algoBySize.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucun compte Algo</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
              {/* Tableau mensuel */}
              <div style={{ background: "#111111", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 400 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Mois", "Comptes", "CA", "Rewards versés", "Marge brute"].map(h => (
                          <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 12 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...algoMonthly].reverse().map(m => (
                        <tr key={m.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700 }}>{m.month}</td>
                          <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.45)" }}>{m.count}</td>
                          <td style={{ padding: "12px 16px", color: "#fff", fontWeight: 700 }}>€{m.ca.toLocaleString()}</td>
                          <td style={{ padding: "12px 16px", color: "#ef4444" }}>€{m.payoutsAmt.toLocaleString()}</td>
                          <td style={{ padding: "12px 16px", color: m.marge > 50 ? "#22c55e" : "#888", fontWeight: 700 }}>{m.marge}%</td>
                        </tr>
                      ))}
                      {algoMonthly.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucune donnée</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ REWARDS TRADER ══ */}
        {(tab === "payouts" || tab === "payouts_algo") && (() => {
          const isAlgoPayout = (p: Payout) => {
            const c = challenges.find(x => x.id === p.challenge_id);
            if (c) return c.model === "vip";
            return challenges.some(x => x.user_email === p.user_email && x.model === "vip" && x.status === "funded");
          };
          const isAlgo = tab === "payouts_algo";
          const filteredPayouts = payouts.filter(p => isAlgo ? isAlgoPayout(p) : !isAlgoPayout(p));
          const accentColor  = isAlgo ? "#a78bfa" : "#22c55e";
          const borderColor  = isAlgo ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.1)";
          const headerColor  = isAlgo ? "rgba(167,139,250,0.7)" : "rgba(255,255,255,0.45)";
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {isAlgo && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                  <div style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.35)", borderRadius: 8, padding: "6px 14px" }}>
                    <span style={{ color: "#a78bfa", fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>⚡ REWARDS ALGO</span>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {[
                  { label: "En attente",          value: filteredPayouts.filter(p=>p.status==="pending").length,  color: "#f59e0b" },
                  { label: "Validés",             value: filteredPayouts.filter(p=>p.status==="paid").length,     color: accentColor },
                  { label: "Refusés",             value: filteredPayouts.filter(p=>p.status==="rejected").length, color: "#ef4444" },
                  { label: "Montant total versé", value: `€${filteredPayouts.filter(p=>p.status==="paid").reduce((s,p)=>s+p.amount,0).toLocaleString()}`, color: accentColor },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#111111", border: `1px solid ${borderColor}`, borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 160 }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: "#111111", border: `1px solid ${borderColor}`, borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: isAlgo ? "rgba(139,92,246,0.05)" : "transparent" }}>
                      {["Client", "Montant", "KYC", "Capital / MT5", "Réception", "Adresse / IBAN", "Statut", "Date", "Actions"].map(h => (
                        <th key={h} style={{ padding: "13px 16px", textAlign: "left", color: headerColor, fontWeight: 600, fontSize: 12 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayouts.map(p => {
                      const userKyc = kycSubmissions.find(k => k.user_email === p.user_email);
                      const userChallenge = challenges.find(c => c.id === p.challenge_id) || challenges.filter(c => c.user_email === p.user_email && c.phase === "funded").sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                      const kycColor = userKyc?.kyc_status === "approved" ? "#22c55e" : userKyc?.kyc_status === "rejected" ? "#ef4444" : "#f59e0b";
                      const kycLabel = userKyc?.kyc_status === "approved" ? "✓ Validé" : userKyc?.kyc_status === "rejected" ? "✕ Refusé" : "En attente";
                      return (
                      <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.45)" }}>{p.user_email || p.user_id}</td>
                        <td style={{ padding: "13px 16px", fontWeight: 800, color: accentColor, fontSize: 15 }}>€{p.amount?.toLocaleString()}</td>
                        <td style={{ padding: "13px 16px" }}><span style={{ color: kycColor, fontWeight: 700, fontSize: 12 }}>{kycLabel}</span></td>
                        <td style={{ padding: "13px 16px", fontSize: 12 }}>
                          {userChallenge ? <><div style={{ fontWeight: 700 }}>{userChallenge.account_size}</div><div style={{ color: "#fff", fontFamily: "monospace" }}>{userChallenge.mt5_login}</div></> : <span style={{ color: "rgba(255,255,255,0.45)" }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          {p.payment_method ? (
                            <span style={{ backgroundColor: p.payment_method === "crypto" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.12)", color: p.payment_method === "crypto" ? "#f59e0b" : "#60A5FA", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 100 }}>
                              {p.payment_method === "crypto" ? "🔶 Crypto" : "🏦 Virement"}
                            </span>
                          ) : <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 16px" }}>
                          {p.wallet_address ? (
                            <span onClick={() => navigator.clipboard.writeText(p.wallet_address!)} style={{ color: "#fff", fontSize: 12, fontFamily: "monospace", cursor: "pointer" }} title="Cliquer pour copier">
                              {p.wallet_address.length > 20 ? p.wallet_address.slice(0, 10) + "…" + p.wallet_address.slice(-6) : p.wallet_address} ⎘
                            </span>
                          ) : <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>—</span>}
                        </td>
                        <td style={{ padding: "13px 16px" }}>{badge(STATUS_LABELS[p.status] || p.status, STATUS_COLORS[p.status] || "#888")}</td>
                        <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "13px 16px" }}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {p.status === "pending" && (<>
                              <button onClick={() => updatePayout(p.id, "paid")}
                                style={{ backgroundColor: "#22c55e20", color: "#22c55e", border: "1px solid #22c55e40", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                ✓ Valider
                              </button>
                              <button onClick={async () => {
                                const reason = prompt("Motif du refus (visible par le client) :") || "";
                                const res = await fetch("/api/admin/payouts", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id: p.id, status: "rejected", rejection_reason: reason }) });
                                const data = await res.json();
                                if (res.ok) setPayouts(ps => ps.map(x => x.id === p.id ? { ...x, ...data } : x));
                              }} style={{ backgroundColor: "#ef444420", color: "#ef4444", border: "1px solid #ef444440", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                ✕ Refuser
                              </button>
                            </>)}
                            {userChallenge?.mt5_login && (
                              <button onClick={() => triggerMT5WithdrawFromPayout(userChallenge.mt5_login!, userChallenge.start_balance)}
                                style={{ backgroundColor: "rgba(201,168,76,0.15)", color: "#60A5FA", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                                title="Retrait profit MT5">
                                💰 MT5
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                    {filteredPayouts.length === 0 && <tr><td colSpan={9} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucune récompense{isAlgo ? " Algo" : " Trader"}</td></tr>}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ══ PROMO CODES ══ */}
        {tab === "promos" && (
          <>
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", marginBottom: 18 }}>Créer un code promo</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                {[
                  { label: "CODE *", key: "code", placeholder: "SUMMER25", transform: (v: string) => v.toUpperCase() },
                  { label: "REMISE % *", key: "discount_percent", placeholder: "50", type: "number" },
                  { label: "MAX UTILISATIONS", key: "max_uses", placeholder: "Illimité", type: "number" },
                  { label: "EXPIRE LE", key: "expires_at", type: "datetime-local" },
                ].map(f => (
                  <div key={f.key}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginBottom: 6 }}>{f.label}</div>
                    <input type={f.type || "text"} value={(newCode as Record<string,string>)[f.key]} placeholder={f.placeholder}
                      onChange={e => setNewCode(n => ({ ...n, [f.key]: f.transform ? f.transform(e.target.value) : e.target.value }))}
                      style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={createPromo} disabled={!newCode.code || !newCode.discount_percent}
                  style={{ backgroundColor: "#3B82F6", color: "#fff", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (!newCode.code || !newCode.discount_percent) ? 0.4 : 1 }}>
                  Créer
                </button>
                {promoMsg   && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{promoMsg}</span>}
                {promoError && <span style={{ color: "#ef4444", fontSize: 13 }}>{promoError}</span>}
              </div>
            </div>

            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
              {promosLoading ? <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.45)" }}>Chargement...</div> : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Code", "Remise", "Utilisé", "Max", "Expire", "Statut", "Créé", "Actions"].map(h => (
                          <th key={h} style={{ padding: "13px 16px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => {
                        const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                        const isExhausted = p.max_uses !== null && p.used_count >= p.max_uses;
                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", opacity: (!p.active || isExpired || isExhausted) ? 0.5 : 1 }}>
                            <td style={{ padding: "13px 16px" }}><button onClick={() => { navigator.clipboard.writeText(p.code); }} title="Copier" style={{ fontWeight: 800, fontFamily: "monospace", letterSpacing: 1, background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 13, padding: 0 }}>{p.code} ⎘</button></td>
                            <td style={{ padding: "13px 16px", fontWeight: 700, color: "#22c55e" }}>{p.discount_percent === 100 ? "100% (GRATUIT)" : `${p.discount_percent}%`}</td>
                            <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.45)" }}>{p.used_count}</td>
                            <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.45)" }}>{p.max_uses ?? "∞"}</td>
                            <td style={{ padding: "13px 16px", color: isExpired ? "#ef4444" : "#555", fontSize: 12 }}>{p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Jamais"}</td>
                            <td style={{ padding: "13px 16px" }}>
                              {isExpired ? badge("expiré", "#ef4444") : isExhausted ? badge("épuisé", "#f59e0b") : p.active ? badge("actif", "#22c55e") : badge("révoqué", "#555")}
                            </td>
                            <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: "13px 16px" }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => togglePromo(p)} style={{ backgroundColor: "rgba(255,255,255,0.05)", color: p.active ? "#ef4444" : "#22c55e", border: `1px solid ${p.active ? "#ef444433" : "#22c55e33"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                                  {p.active ? "Révoquer" : "Restaurer"}
                                </button>
                                <button onClick={() => deletePromo(p.id)} style={{ backgroundColor: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Suppr.</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {promos.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucun code promo</td></tr>}
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
                  <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 20px" }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
              {kycMsg && <span style={{ color: kycMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 700 }}>{kycMsg}</span>}
            </div>

            {kycLoading && <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.45)" }}>Chargement...</div>}

            {!kycLoading && kycSubmissions.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.45)" }}>Aucune soumission KYC</div>
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
                <div key={k.id} style={{ backgroundColor: "#111111", border: `1px solid ${isPending ? "#f59e0b40" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{k.user_email}</div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
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
                          style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 14px", color: "#38bdf8", fontSize: 12, fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                          📄 {label}
                        </a>
                      ) : (
                        <span key={field} style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 14px", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{label} —</span>
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
                          style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, outline: "none" }}
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
                    backgroundColor: createForm.type === val ? (val === "reward" ? "#60A5FA" : "#0D1B3E") : "transparent",
                    color: createForm.type === val ? "#fff" : "#6b7280",
                    transition: "all 0.2s",
                  }}>{label}</button>
                ))}
              </div>

              {createForm.type === "reward" && (
                <div style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(21,101,192,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#fff" }}>
                  Le client recevra directement un <strong>compte Trader Reward</strong> (phase funded) avec son email MT5 + certificat.
                </div>
              )}

              <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 20, color: "#fff" }}>
                {createForm.type === "reward" ? "Créer un compte Reward" : "Créer un challenge"} manuellement
              </div>

              {[
                { label: "Email du trader", el: <input type="email" value={createForm.userEmail} onChange={e => setCreateForm(f => ({ ...f, userEmail: e.target.value }))} placeholder="trader@email.com" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" as const }} /> },
                { label: "Prénom", el: <input type="text" value={createForm.firstName} onChange={e => setCreateForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jean" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" as const }} /> },
                { label: "Nom", el: <input type="text" value={createForm.lastName} onChange={e => setCreateForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Dupont" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" as const }} /> },
                { label: "Taille du compte", el: <select value={createForm.accountSize} onChange={e => setCreateForm(f => ({ ...f, accountSize: e.target.value }))} style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none" }}><option>$10,000</option><option>$25,000</option><option>$50,000</option><option>$100,000</option><option>$200,000</option></select> },
                { label: "Modèle", el: <select value={createForm.model} onChange={e => setCreateForm(f => ({ ...f, model: e.target.value }))} style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none" }}><option value="1step">1-Step</option><option value="2step">2-Step</option>{/* vip masqué */}</select> },
                { label: "Montant payé (€)", el: <input type="number" value={createForm.amountPaid} onChange={e => setCreateForm(f => ({ ...f, amountPaid: e.target.value }))} placeholder="ex: 6.90" style={{ width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#fff", outline: "none", boxSizing: "border-box" as const }} /> },
              ].map((f, i) => (
                <div key={i} style={{ marginBottom: 16 }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{f.label}</div>
                  {f.el}
                </div>
              ))}
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, cursor: "pointer" }}>
                <input type="checkbox" checked={createForm.createMT5} onChange={e => setCreateForm(f => ({ ...f, createMT5: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 14 }}>Créer le compte MT5 automatiquement</span>
              </label>
              {createError && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12, padding: "10px 14px", backgroundColor: "#ef444410", borderRadius: 8 }}>{createError}</div>}
              {createMsg && <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 12, padding: "10px 14px", backgroundColor: "#22c55e10", borderRadius: 8 }}>{createMsg}</div>}
              <button onClick={createChallenge} disabled={createLoading || !createForm.userEmail}
                style={{ width: "100%", backgroundColor: createForm.type === "reward" ? "#60A5FA" : "#60A5FA", color: createForm.type === "reward" ? "#fff" : "#000", border: "none", borderRadius: 10, padding: "14px", fontSize: 15, fontWeight: 800, cursor: createLoading ? "not-allowed" : "pointer", opacity: createLoading ? 0.7 : 1 }}>
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
          challenges.filter(c => c.phase === "phase1" || c.model === "instant").forEach(c => {
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
                  { label: "Total versé (USD)", value: `$${totalVersé.toLocaleString()}`, color: "#fff" },
                  { label: "Virements bancaires", value: paidPayouts.filter(p => p.payment_method === "bank").length, color: "#fff" },
                  { label: "Crypto USDC", value: paidPayouts.filter(p => p.payment_method === "crypto").length, color: "#60A5FA" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 22px", flex: 1, minWidth: 160 }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Registre des versements */}
              <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>🧾 Registre des versements</div>
                  <button onClick={exportCSV} style={{ background: "#60A5FA", color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ⬇ Export CSV
                  </button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.04)" }}>
                      {["Référence","Date","Client","Montant","Méthode","IBAN / Wallet","Justificatif"].map(h => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paidPayouts.map((p, i) => {
                      const ref = `ELY-${new Date(p.created_at).getFullYear()}-${p.id.slice(0,6).toUpperCase()}`;
                      const ch = challenges.find(c => c.id === p.challenge_id);
                      const receiptUrl = `/payout-receipt?ref=${ref}&date=${new Date(p.created_at).toLocaleDateString("fr-FR")}&amount=${p.amount}&method=${p.payment_method||""}&email=${encodeURIComponent(p.user_email||"")}&size=${encodeURIComponent(ch?.account_size||"")}&login=${ch?.mt5_login||""}`;
                      return (
                        <tr key={p.id} style={{ borderBottom: i < paidPayouts.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none", background: "transparent" }}>
                          <td style={{ padding: "11px 14px", fontWeight: 700, color: "#fff", fontSize: 12, fontFamily: "monospace" }}>{ref}</td>
                          <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.45)" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                          <td style={{ padding: "11px 14px", color: "#fff" }}>{p.user_email}</td>
                          <td style={{ padding: "11px 14px", fontWeight: 800, color: "#22c55e" }}>${p.amount?.toLocaleString()}</td>
                          <td style={{ padding: "11px 14px" }}>
                            <span style={{ background: p.payment_method === "crypto" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.12)", color: p.payment_method === "crypto" ? "#f59e0b" : "#60A5FA", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>
                              {p.payment_method === "crypto" ? "🔶 Crypto" : "🏦 Virement"}
                            </span>
                          </td>
                          <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.wallet_address ? (p.wallet_address.length > 20 ? p.wallet_address.slice(0,12)+"…"+p.wallet_address.slice(-6) : p.wallet_address) : "—"}
                          </td>
                          <td style={{ padding: "11px 14px" }}>
                            <a href={receiptUrl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(59,130,246,0.15)", color: "#fff", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 8, border: "1px solid rgba(21,101,192,0.2)", textDecoration: "none" }}>
                              📄 PDF
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                    {paidPayouts.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.45)" }}>Aucun versement enregistré</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* Récap mensuel */}
              <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontWeight: 800, fontSize: 16 }}>📅 Récapitulatif mensuel</div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.04)" }}>
                      {["Mois","CA (€)","Récompenses versées ($)","Ventes","Marge brute"].map(h => (
                        <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(monthly.entries()).reverse().map(([m, v], i) => (
                      <tr key={m} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "transparent" }}>
                        <td style={{ padding: "11px 14px", fontWeight: 700, color: "#fff" }}>{m}</td>
                        <td style={{ padding: "11px 14px", color: "#fff", fontWeight: 700 }}>€{v.ca.toLocaleString()}</td>
                        <td style={{ padding: "11px 14px", color: "#ef4444", fontWeight: 700 }}>-${v.versements.toLocaleString()}</td>
                        <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.45)" }}>{v.count}</td>
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

          const StatRow = ({ label, n, d = total, color = "#60A5FA" }: { label: string; n: number; d?: number; color?: string }) => (
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize:13, color:"rgba(255,255,255,0.6)" }}>{label}</span>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:20, fontWeight:900, color, minWidth:36, textAlign:"right" }}>{n}</span>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)", minWidth:40, textAlign:"right", background:"rgba(255,255,255,0.07)", borderRadius:6, padding:"2px 6px" }}>{pct(n,d)}%</span>
              </div>
            </div>
          );

          const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
            <div style={{ background:"#111111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"20px 24px" }}>
              <div style={{ fontWeight:800, fontSize:14, color:"#fff", marginBottom:12, paddingBottom:8, borderBottom:"2px solid rgba(255,255,255,0.1)" }}>{title}</div>
              {children}
            </div>
          );

          return (
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

              {/* Résumé global */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12 }}>
                {[
                  { label:"Total achetés",  value:String(total),              color:"#fff" },
                  { label:"CA total",       value:`€${Math.round(totalCA)}`,  color:"#fff" },
                  { label:"Actifs",         value:String(totalActive),         color:"#22c55e" },
                  { label:"Reward",          value:String(totalCert),           color:"#3b82f6" },
                  { label:"Failed",         value:String(totalFailed),         color:"#ef4444" },
                  { label:"Passed",         value:String(totalPassed),         color:"#f59e0b" },
                ].map((s,i) => (
                  <div key={i} style={{ background:"#111111", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, padding:"16px 18px" }}>
                    <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{s.label}</div>
                    <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:18 }}>
                <Section title="💳 Par moyen de paiement">
                  <StatRow label="Carte bancaire" n={byCard} />
                  <StatRow label="Crypto" n={byCrypto} />
                  <div style={{ display:"flex", justifyContent:"space-between", paddingTop:10, fontSize:12, color:"rgba(255,255,255,0.45)" }}>
                    <span>CA carte : <strong style={{color:"#fff"}}>€{Math.round(caCard)}</strong></span>
                    <span>CA crypto : <strong style={{color:"#fff"}}>€{Math.round(caCrypto)}</strong></span>
                  </div>
                </Section>

                <Section title="📦 Par taille de compte">
                  {sizes.map(s => <StatRow key={s} label={s} n={challenges.filter(c=>c.account_size===s).length} />)}
                </Section>
              </div>

              <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:18 }}>
                <Section title={`🔵 2-Step — ${t2tot} comptes au total`}>
                  <StatRow label="Phase 1 — Actifs"            n={t2p1Active}  d={t2tot} />
                  <StatRow label="Phase 1 — Passed (→Phase 2)" n={t2p1Passed}  d={t2tot} color="#f59e0b" />
                  <StatRow label="Phase 1 — Failed"            n={t2p1Failed}  d={t2tot} color="#ef4444" />
                  <StatRow label="Phase 2 — Actifs"            n={t2p2Active}  d={t2tot} />
                  <StatRow label="Phase 2 — Passed (→Reward)" n={t2p2Passed} d={t2tot} color="#f59e0b" />
                  <StatRow label="Phase 2 — Failed"            n={t2p2Failed}  d={t2tot} color="#ef4444" />
                  <StatRow label="Reward — Actifs"          n={t2cert}      d={t2tot} color="#3b82f6" />
                  <StatRow label="Reward — Failed"          n={t2certFail}  d={t2tot} color="#ef4444" />
                </Section>

                <Section title={`🟣 1-Step — ${t1tot} comptes au total`}>
                  <StatRow label="Phase 1 — Actifs"   n={t1p1Active}  d={t1tot} />
                  <StatRow label="Phase 1 — Failed"   n={t1p1Failed}  d={t1tot} color="#ef4444" />
                  <StatRow label="Reward — Actifs" n={t1cert}      d={t1tot} color="#3b82f6" />
                  <StatRow label="Reward — Failed" n={t1certFail}  d={t1tot} color="#ef4444" />
                </Section>
              </div>

              <Section title="📈 Taux de conversion & d'échec">
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, paddingTop:8 }}>
                  {[
                    { label:"Taux failed global",        value:`${pct(totalFailed)}%`,                                                                                           color:"#ef4444" },
                    { label:"Taux failed Phase 1",       value:`${pct(t2p1Failed+t1p1Failed, t2tot+t1tot)}%`,                                                                    color:"#ef4444" },
                    { label:"Taux failed Phase 2 (2S)",  value:`${pct(t2p2Failed, t2p2Active+t2p2Failed+t2p2Passed+t2cert+t2certFail)}%`,                                       color:"#ef4444" },
                    { label:"Taux failed Reward",        value:`${pct(t2certFail+t1certFail, t2cert+t1cert+t2certFail+t1certFail||1)}%`,                                        color:"#ef4444" },
                    { label:"Conv. P1→P2 (2-Step)",      value:`${pct(t2p1Passed+t2p2Active+t2p2Failed+t2p2Passed+t2cert+t2certFail, t2tot)}%`,                                color:"#22c55e" },
                    { label:"Conv. P2→Reward (2S)",      value:`${pct(t2cert+t2certFail, t2p2Active+t2p2Failed+t2p2Passed+t2cert+t2certFail||1)}%`,                            color:"#22c55e" },
                    { label:"Conv. Reward (1-Step)",     value:`${pct(t1cert+t1certFail, t1tot)}%`,                                                                             color:"#22c55e" },
                    { label:"Taux reward global",        value:`${pct(totalCert)}%`,                                                                                            color:"#3b82f6" },
                  ].map((s,i) => (
                    <div key={i} style={{ background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"14px 16px" }}>
                      <div style={{ color:"rgba(255,255,255,0.45)", fontSize:10, textTransform:"uppercase", letterSpacing:1, marginBottom:6 }}>{s.label}</div>
                      <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </Section>

            </div>
          );
        })()}

        {/* ══ AFFILIÉS ══ */}
        {tab === "affilies" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
              {[
                { label: "Total affiliés", value: affiliates.length, color: "#fff" },
                { label: "Total conversions", value: affiliates.reduce((s, a) => s + a.referrals.length, 0), color: "#3b82f6" },
                { label: "Commissions en attente", value: `€${affiliates.reduce((s, a) => s + a.referrals.filter(r => r.status === "pending").reduce((ss, r) => ss + (r.commission_amount || 0), 0), 0).toLocaleString()}`, color: "#f59e0b" },
                { label: "Commissions payées", value: `€${affiliates.reduce((s, a) => s + (a.total_paid || 0), 0).toLocaleString()}`, color: "#22c55e" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 20px" }}>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {affiliateMsg && <div style={{ color: affiliateMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 700, padding: "10px 16px", background: affiliateMsg.startsWith("✓") ? "#22c55e10" : "#ef444410", borderRadius: 8 }}>{affiliateMsg}</div>}

            {/* Table affiliés */}
            <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Tous les affiliés</span>
                <a href="/partenariat" target="_blank" style={{ fontSize: 12, color: "#60A5FA", textDecoration: "none" }}>Voir la page partenariat →</a>
              </div>
              {affiliates.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Aucun affilié pour le moment</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {affiliates.map(a => {
                    const pending = a.referrals.filter(r => r.status === "pending").reduce((s, r) => s + (r.commission_amount || 0), 0);
                    const paid = a.referrals.filter(r => r.status === "paid").reduce((s, r) => s + (r.commission_amount || 0), 0);
                    const isOpen = affiliateExpanded === a.id;
                    const tierLabel = a.commission_rate >= 20 ? "Elite" : a.commission_rate >= 15 ? "Partenaire" : "Débutant";
                    const tierColor = a.commission_rate >= 20 ? "#60A5FA" : a.commission_rate >= 15 ? "#60A5FA" : "#6b7280";
                    return (
                      <div key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {/* Ligne principale */}
                        <div onClick={() => setAffiliateExpanded(isOpen ? null : a.id)} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 2 }}>
                              {a.first_name || a.last_name ? `${a.first_name} ${a.last_name}`.trim() : a.user_id.slice(0, 8) + "…"}
                            </div>
                            {a.email && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>{a.email}</div>}
                            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <code style={{ fontSize: 12, background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 6, color: "#fff", fontWeight: 700 }}>?ref={a.code}</code>
                              <span style={{ fontSize: 11, fontWeight: 700, color: tierColor, background: `${tierColor}15`, padding: "2px 8px", borderRadius: 100 }}>{tierLabel}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Taux</div>
                              <div style={{ fontWeight: 800, color: tierColor }}>{a.commission_rate}%</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Conversions</div>
                              <div style={{ fontWeight: 800, color: "#fff" }}>{a.referrals.length}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>En attente</div>
                              <div style={{ fontWeight: 800, color: "#f59e0b" }}>€{pending.toLocaleString()}</div>
                            </div>
                            <div style={{ textAlign: "center" }}>
                              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Payé</div>
                              <div style={{ fontWeight: 800, color: "#22c55e" }}>€{paid.toLocaleString()}</div>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                            <button onClick={e => { e.stopPropagation(); setAffiliatePromoForm({ affiliateId: a.id, userId: a.user_id }); setAffiliatePromoData({ code: `${a.code}10`, discount: "10", maxUses: "" }); }} style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", color: "#60A5FA", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                              + Code promo
                            </button>
                            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>{isOpen ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {/* Formulaire code promo */}
                        {affiliatePromoForm?.affiliateId === a.id && (
                          <div style={{ margin: "0 20px 16px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, padding: "16px 20px" }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 12 }}>Créer un code promo pour cet affilié</div>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                              <div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Code</div>
                                <input value={affiliatePromoData.code} onChange={e => setAffiliatePromoData(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="PARTENAIRE10" style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#fff", outline: "none", width: 140 }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Remise %</div>
                                <input type="number" value={affiliatePromoData.discount} onChange={e => setAffiliatePromoData(d => ({ ...d, discount: e.target.value }))} min={1} max={100} style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#fff", outline: "none", width: 80 }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>Max utilisations</div>
                                <input type="number" value={affiliatePromoData.maxUses} onChange={e => setAffiliatePromoData(d => ({ ...d, maxUses: e.target.value }))} placeholder="illimité" style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#fff", outline: "none", width: 100 }} />
                              </div>
                              <button onClick={createAffiliatePromo} style={{ background: "#3B82F6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Créer</button>
                              <button onClick={() => setAffiliatePromoForm(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                            </div>
                          </div>
                        )}

                        {/* Détail referrals */}
                        {isOpen && (
                          <div style={{ margin: "0 20px 16px", background: "rgba(255,255,255,0.04)", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                            {a.referrals.length === 0 ? (
                              <div style={{ padding: "20px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucune conversion pour le moment</div>
                            ) : (
                              <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                  <thead>
                                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
                                      {["Referred User", "Achat", "Commission", "Statut", "Date"].map(h => (
                                        <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {a.referrals.map(r => (
                                      <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                        <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: 11 }}>{r.referred_user_id?.slice(0, 16)}…</td>
                                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#fff" }}>€{((r.purchase_amount || 0) / 100).toLocaleString()}</td>
                                        <td style={{ padding: "10px 14px", fontWeight: 800, color: "#60A5FA" }}>€{((r.commission_amount || 0) / 100).toLocaleString()}</td>
                                        <td style={{ padding: "10px 14px" }}>
                                          <span style={{ background: r.status === "paid" ? "#22c55e15" : "#f59e0b15", color: r.status === "paid" ? "#22c55e" : "#f59e0b", padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>{r.status === "paid" ? "Payé" : "En attente"}</span>
                                        </td>
                                        <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "securite" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* KPIs sécurité */}
            {securityData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                {[
                  { label: "Connexions totales", value: securityData.events.length, color: "#fff" },
                  { label: "IPs partagées", value: securityData.shared_ips.length, color: securityData.shared_ips.length > 0 ? "#ef4444" : "#22c55e" },
                  { label: "Appareils partagés", value: securityData.shared_fingerprints.length, color: securityData.shared_fingerprints.length > 0 ? "#ef4444" : "#22c55e" },
                  { label: "Connexions VPN", value: securityData.vpn_users.length, color: securityData.vpn_users.length > 0 ? "#f59e0b" : "#22c55e" },
                ].map((s, i) => (
                  <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {securityLoading && <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.3)" }}>Chargement…</div>}

            {securityData && (
              <>
                {/* IPs partagées entre comptes */}
                <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🚨</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>IPs partagées entre plusieurs comptes</span>
                    {securityData.shared_ips.length === 0 && <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 12, fontWeight: 700 }}>✓ Aucune détection</span>}
                  </div>
                  {securityData.shared_ips.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucune IP partagée détectée</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr style={{ background: "rgba(255,255,255,0.04)" }}>
                          {["IP", "Pays", "Comptes concernés", "Nb comptes", "Dernière connexion"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {securityData.shared_ips.map((item, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: item.count >= 3 ? "#ef444412" : "transparent" }}>
                              <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: "#fff" }}>{item.ip}</td>
                              <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{item.events[0]?.country || "—"}</td>
                              <td style={{ padding: "12px 14px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {item.emails.map((email, j) => (
                                    <span key={j} style={{ fontSize: 12, color: "#60A5FA", background: "rgba(96,165,250,0.1)", padding: "2px 8px", borderRadius: 6, display: "inline-block", width: "fit-content" }}>{email}</span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: "12px 14px" }}>
                                <span style={{ background: item.count >= 3 ? "#ef444415" : "#f59e0b15", color: item.count >= 3 ? "#ef4444" : "#f59e0b", padding: "3px 10px", borderRadius: 100, fontSize: 12, fontWeight: 800 }}>{item.count} comptes</span>
                              </td>
                              <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{new Date(item.events[0]?.created_at).toLocaleString("fr-FR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Appareils partagés */}
                <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>💻</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Appareils partagés entre plusieurs comptes</span>
                    {securityData.shared_fingerprints.length === 0 && <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 12, fontWeight: 700 }}>✓ Aucune détection</span>}
                  </div>
                  {securityData.shared_fingerprints.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucun appareil partagé détecté</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr style={{ background: "rgba(255,255,255,0.04)" }}>
                          {["Fingerprint", "Comptes concernés", "Nb comptes", "OS / Navigateur", "Dernière connexion"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {securityData.shared_fingerprints.map((item, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "#ef444412" }}>
                              <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{item.fingerprint.slice(0, 16)}…</td>
                              <td style={{ padding: "12px 14px" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  {item.emails.map((email, j) => (
                                    <span key={j} style={{ fontSize: 12, color: "#ef4444", background: "#ef444410", padding: "2px 8px", borderRadius: 6, display: "inline-block", width: "fit-content" }}>{email}</span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ padding: "12px 14px" }}>
                                <span style={{ background: "#ef444415", color: "#ef4444", padding: "3px 10px", borderRadius: 100, fontSize: 12, fontWeight: 800 }}>{item.count} comptes</span>
                              </td>
                              <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{item.events[0]?.user_agent?.slice(0, 60) || "—"}</td>
                              <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{new Date(item.events[0]?.created_at).toLocaleString("fr-FR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Connexions VPN */}
                <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🛡️</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Connexions via VPN / Proxy détectées</span>
                    {securityData.vpn_users.length === 0 && <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 12, fontWeight: 700 }}>✓ Aucune détection</span>}
                  </div>
                  {securityData.vpn_users.length === 0 ? (
                    <div style={{ padding: 32, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucune connexion VPN détectée</div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr style={{ background: "rgba(255,255,255,0.04)" }}>
                          {["Trader", "IP", "Pays", "Date"].map(h => (
                            <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {securityData.vpn_users.map((e, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                              <td style={{ padding: "12px 14px", color: "#60A5FA", fontSize: 13 }}>{e.user_email}</td>
                              <td style={{ padding: "12px 14px", fontFamily: "monospace", fontSize: 12, color: "#fff" }}>{e.ip}</td>
                              <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>{e.country}</td>
                              <td style={{ padding: "12px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{new Date(e.created_at).toLocaleString("fr-FR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* ── Comparaison IP Inscription vs Login vs MT5 ── */}
                <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🔍</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Comparaison IP : Inscription vs Login vs MT5</span>
                    {mt5Loading && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Chargement MT5…</span>}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        {["Trader", "IP Inscription", "IP Dernière Connexion Site", "IP Trading MT5", "Statut"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {(() => {
                          // Grouper les events par email pour avoir la dernière IP de login
                          const lastLoginByEmail = new Map<string, string>();
                          if (securityData) {
                            for (const e of securityData.events) {
                              if (!lastLoginByEmail.has(e.user_email)) lastLoginByEmail.set(e.user_email, e.ip);
                            }
                          }
                          // Grouper les MT5 sessions par email
                          const mt5ByEmail = new Map<string, MT5Session[]>();
                          for (const s of mt5Sessions) {
                            if (!mt5ByEmail.has(s.user_email)) mt5ByEmail.set(s.user_email, []);
                            mt5ByEmail.get(s.user_email)!.push(s);
                          }
                          // Construire la liste unique des traders depuis challenges
                          const emails = Array.from(new Set([
                            ...Array.from(lastLoginByEmail.keys()),
                            ...Array.from(mt5ByEmail.keys()),
                          ]));
                          if (emails.length === 0) return (
                            <tr><td colSpan={5} style={{ padding: 24, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucune donnée disponible</td></tr>
                          );
                          return emails.map((email, i) => {
                            const loginIP = lastLoginByEmail.get(email) || null;
                            const sessions = mt5ByEmail.get(email) || [];
                            const mt5IPs = [...new Set(sessions.map(s => s.last_ip).filter(Boolean))];
                            const regIP = profiles.find(p => p.email === email)?.registration_ip || null;
                            const mismatch = regIP && loginIP && regIP !== loginIP;
                            const mt5Mismatch = loginIP && mt5IPs.length > 0 && !mt5IPs.includes(loginIP);
                            const alert = mismatch || mt5Mismatch;
                            return (
                              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: alert ? "#ef444412" : "transparent" }}>
                                <td style={{ padding: "10px 14px", color: "#60A5FA", fontSize: 12, fontWeight: 600 }}>{email}</td>
                                <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>
                                  {regIP ? <span style={{ color: "rgba(255,255,255,0.7)" }}>{regIP}</span> : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                                </td>
                                <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>
                                  {loginIP
                                    ? <span style={{ color: mismatch ? "#ef4444" : "#22c55e" }}>{loginIP}</span>
                                    : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                                </td>
                                <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>
                                  {mt5IPs.length > 0
                                    ? mt5IPs.map((ip, j) => <div key={j} style={{ color: mt5Mismatch ? "#ef4444" : "#374151" }}>{ip}</div>)
                                    : <span style={{ color: "rgba(255,255,255,0.2)" }}>{mt5Loading ? "…" : "—"}</span>}
                                </td>
                                <td style={{ padding: "10px 14px" }}>
                                  {alert
                                    ? <span style={{ background: "#ef444415", color: "#ef4444", padding: "3px 8px", borderRadius: 100, fontSize: 10, fontWeight: 800 }}>⚠ IP DIFFÉRENTE</span>
                                    : <span style={{ color: "#22c55e", fontSize: 11, fontWeight: 700 }}>✓ OK</span>}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Historique complet des connexions */}
                <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 18 }}>📋</span>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>Historique des connexions</span>
                    </div>
                    <button onClick={() => token && loadSecurity()} style={{ fontSize: 12, color: "#60A5FA", background: "none", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 6, padding: "4px 12px", cursor: "pointer" }}>↻ Rafraîchir</button>
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead><tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        {["Trader", "IP", "Pays", "VPN", "Fingerprint", "Date"].map(h => (
                          <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "rgba(255,255,255,0.45)", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {securityData.events.slice(0, 100).map((e, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: e.is_vpn ? "#f59e0b12" : "transparent" }}>
                            <td style={{ padding: "10px 14px", color: "#60A5FA", fontSize: 12 }}>{e.user_email}</td>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11, color: "#fff" }}>{e.ip}</td>
                            <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{e.country}</td>
                            <td style={{ padding: "10px 14px" }}>
                              {e.is_vpn
                                ? <span style={{ background: "#f59e0b15", color: "#f59e0b", padding: "2px 8px", borderRadius: 100, fontSize: 10, fontWeight: 700 }}>VPN</span>
                                : <span style={{ color: "#22c55e", fontSize: 11 }}>✓</span>}
                            </td>
                            <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{e.fingerprint?.slice(0, 12)}…</td>
                            <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11, whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString("fr-FR")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── MAINTENANCE ── */}
        {tab === "maintenance" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginBottom: 4 }}>Outils de maintenance — actions ponctuelles et réparations.</div>
            <div style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 12, padding: "20px 24px" }}>
              <div style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Restauration clients (action unique)</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 16 }}>Bruno Penard · Aurélien Roussel · Régis Allidé (x2) · Samir KHELIF</div>
              {restoreMsg && <div style={{ color: restoreMsg.startsWith("✅") ? "#22c55e" : "#f59e0b", fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{restoreMsg}</div>}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={async () => {
                  await fetch("/api/admin/preview-apology-email", { method: "POST", headers: { "x-admin-key": ADMIN_KEY } });
                  setRestoreMsg("📧 Email de prévisualisation envoyé à vincentmeipro@gmail.com");
                }} style={{ background: "transparent", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.4)", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  Recevoir une copie email
                </button>
                <button onClick={handleRestoreChallenges} disabled={restoreLoading} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 13, cursor: restoreLoading ? "not-allowed" : "pointer", opacity: restoreLoading ? 0.6 : 1 }}>
                  {restoreLoading ? "En cours..." : "Restaurer les dashboards"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SETTINGS ── V2 Phase 1 ──────────────────────────── */}
        {tab === "settings" && (() => {
          const CATEGORY_LABELS: Record<string, string> = {
            branding:   "🎨 Branding",
            trading:    "📈 Trading / MT5 Groups",
            challenges: "🎯 Challenges (defaults globaux)",
            payouts:    "💰 Payouts",
            emails:     "✉️ Emails",
            general:    "⚙️ Général",
          };
          const grouped = settingsData.reduce((acc: Record<string, SettingRow[]>, row) => {
            if (!acc[row.category]) acc[row.category] = [];
            acc[row.category].push(row);
            return acc;
          }, {});

          const saveSetting = async (key: string) => {
                    const rawVal = settingsEdit[key];
            if (rawVal === undefined) return;
            // Tenter de parser en nombre si possible
            let value: unknown = rawVal;
            const num = Number(rawVal);
            if (rawVal.trim() !== "" && !isNaN(num)) value = num;

            setSettingsSaving(key);
            try {
              const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
                body: JSON.stringify({ key, value }),
              });
              const data = await res.json();
              if (data.success) {
                setSettingsMsg(p => ({ ...p, [key]: { ok: true, msg: "✓ Sauvegardé" } }));
                // Mettre à jour la liste locale
                setSettingsData(prev => prev.map(r => r.key === key ? { ...r, value } : r));
                setSettingsEdit(p => { const n = { ...p }; delete n[key]; return n; });
              } else {
                setSettingsMsg(p => ({ ...p, [key]: { ok: false, msg: data.error || "Erreur" } }));
              }
            } catch {
              setSettingsMsg(p => ({ ...p, [key]: { ok: false, msg: "Erreur réseau" } }));
            } finally {
              setSettingsSaving(null);
              setTimeout(() => setSettingsMsg(p => { const n = { ...p }; delete n[key]; return n; }), 3000);
            }
          };

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Header */}
              <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 4 }}>⚙️ Paramètres de la plateforme</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                      V2 Phase 1 — Les modifications prennent effet dans les 5 minutes (cache TTL).<br/>
                      <span style={{ color: "#f59e0b" }}>⚠ Ne jamais stocker des secrets ici (Stripe keys, API keys, passwords)</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSettingsData([]); setSettingsLoading(true);
                      fetch("/api/admin/settings", { headers: { "x-admin-key": ADMIN_KEY } })
                        .then(r => r.json()).then(d => { if (d.settings) setSettingsData(d.settings); })
                        .finally(() => setSettingsLoading(false));
                    }}
                    style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 8, color: "#60A5FA", padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                  >
                    ↻ Rafraîchir
                  </button>
                </div>
              </div>

              {settingsLoading && (
                <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Chargement des settings…</div>
              )}

              {!settingsLoading && settingsData.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: "#ef4444", background: "#ef444410", borderRadius: 8, border: "1px solid #ef444430" }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠ Settings non chargés</div>
                  <div style={{ fontSize: 13, opacity: 0.8 }}>{settingsApiError || "Erreur inconnue"}</div>
                  <div style={{ fontSize: 11, marginTop: 12, color: "rgba(255,255,255,0.3)" }}>Détails dans la console navigateur (F12)</div>
                </div>
              )}

              {/* Settings par catégorie */}
              {Object.entries(CATEGORY_LABELS).map(([cat, catLabel]) => {
                const rows = grouped[cat] || [];
                if (rows.length === 0) return null;
                const isCritical = cat === "trading" || cat === "challenges" || cat === "payouts";
                return (
                  <div key={cat} style={{ background: "#111", border: `1px solid ${isCritical ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)"}`, borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{catLabel}</span>
                      {isCritical && <span style={{ fontSize: 10, background: "#ef444415", color: "#ef4444", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>CRITIQUE — fallback logué</span>}
                      {cat === "challenges" && <span style={{ fontSize: 10, background: "#f59e0b15", color: "#f59e0b", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>DEFAULTS GLOBAUX Phase 1</span>}
                    </div>
                    <div style={{ padding: "8px 0" }}>
                      {rows.map(row => {
                        const currentEdit = settingsEdit[row.key];
                        const displayVal = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
                        const editVal = currentEdit !== undefined ? currentEdit : displayVal;
                        const isDirty = currentEdit !== undefined;
                        const msg = settingsMsg[row.key];
                        const saving = settingsSaving === row.key;
                        return (
                          <div key={row.key} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 2, fontFamily: "monospace" }}>{row.key}</div>
                              {row.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{row.description}</div>}
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                                Modifié le {new Date(row.updated_at).toLocaleString("fr-FR")}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                              <input
                                value={editVal}
                                onChange={e => setSettingsEdit(p => ({ ...p, [row.key]: e.target.value }))}
                                style={{
                                  background: isDirty ? "rgba(96,165,250,0.08)" : "rgba(255,255,255,0.05)",
                                  border: `1px solid ${isDirty ? "#60A5FA" : "rgba(255,255,255,0.1)"}`,
                                  borderRadius: 6, padding: "6px 10px", color: "#fff",
                                  fontSize: 12, fontFamily: "monospace", width: 260, outline: "none",
                                }}
                              />
                              {isDirty && (
                                <button
                                  onClick={() => saveSetting(row.key)}
                                  disabled={saving}
                                  style={{
                                    background: saving ? "#374151" : "#60A5FA",
                                    border: "none", borderRadius: 6, color: saving ? "rgba(255,255,255,0.4)" : "#000",
                                    padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {saving ? "…" : "Sauvegarder"}
                                </button>
                              )}
                              {isDirty && !saving && (
                                <button
                                  onClick={() => setSettingsEdit(p => { const n = { ...p }; delete n[row.key]; return n; })}
                                  style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.35)", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                                >
                                  ✕
                                </button>
                              )}
                              {msg && (
                                <span style={{ fontSize: 11, fontWeight: 700, color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.msg}</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        </div>
      </div>
    </div>
    </>
  );
}
