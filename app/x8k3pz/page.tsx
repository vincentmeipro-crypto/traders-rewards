"use client";
import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OverviewCockpit from "@/components/admin/OverviewCockpit";
import RewardReviewPanel from "@/components/admin/RewardReviewPanel";
import type { RewardReviewData } from "@/lib/reward-review";

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
  open_positions?: Record<string, unknown>[];
  positions_synced_at?: string;
  reward_review?: RewardReviewData;
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
  affiliate_user_id?: string | null;
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
  funded:   "Certifié",
  active:   "Actif",
  failed:   "Échoué",
  passed:   "Validé",
  pending:  "En attente",
  paid:     "Versé",
  rejected: "Refusé",
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
  overview:      "Cockpit",
  pipeline:      "Challenges",
  algo:          "Algo",
  crm:           "Clients",
  kyc:           "KYC",
  payouts:       "Rewards",
  financier:     "Transactions",
  financier_algo:"Financier Algo",
  compta:        "Comptabilité",
  payouts_algo:  "Rewards Algo",
  promos:        "Codes promo",
  affilies:      "Affiliés",
  stats:         "Analytics",
  securite:      "Sécurité",
  create:        "Nouveau Challenge",
  settings:      "Plateforme",
  maintenance:   "Maintenance",
};

// Structure de navigation groupée
type NavItem = { id: Tab | "products"; label: string; sub?: boolean; href?: string };
type NavGroup = { section?: string; items: NavItem[] } | { separator: true } | { cta: Tab; label: string };

const NAV: (NavGroup)[] = [
  { items: [{ id: "overview", label: "Overview" }] },
  { section: "CHALLENGES", items: [
    { id: "pipeline", label: "Tous les challenges" },
    { id: "products", label: "Produits", sub: true, href: "/x8k3pz/products" },
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
    { id: "stats",    label: "Analytics" },
    { id: "securite", label: "Sécurité" },
  ]},
  { separator: true },
  { cta: "create", label: "Nouveau Challenge" },
  { separator: true },
  { section: "SETTINGS", items: [
    { id: "settings",     label: "Plateforme" },
    { id: "maintenance",  label: "Maintenance", sub: true },
  ]},
];

// TABS — référence pour compatibilité interne
const TABS: { id: Tab; label: string }[] = [
  { id: "overview",     label: "Cockpit" },
  { id: "pipeline",     label: "Challenges" },
  { id: "crm",          label: "Clients" },
  { id: "kyc",          label: "KYC" },
  { id: "payouts",      label: "Rewards" },
  { id: "financier",    label: "Transactions" },
  { id: "compta",       label: "Comptabilité" },
  { id: "promos",       label: "Codes promo" },
  { id: "affilies",     label: "Affiliés" },
  { id: "stats",        label: "Analytics" },
  { id: "securite",     label: "Sécurité" },
  { id: "create",       label: "Nouveau" },
  { id: "settings",     label: "Paramètres" },
  { id: "maintenance",  label: "Maintenance" },
];

const card = (children: React.ReactNode, style?: React.CSSProperties) => (
  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "20px 24px", ...style }}>{children}</div>
);

const badge = (label: string, color: string) => (
  <span style={{ backgroundColor: `${color}20`, color, padding: "3px 10px", borderRadius: 100, fontSize: 10, fontWeight: 700 }}>{label}</span>
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

function AdminPageInner() {
  const token = true; // accès sans connexion — toujours autorisé
  const searchParams = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => (searchParams.get("t") as Tab) ?? "overview");

  // Sync tab state quand l'URL change (ex: clic sidebar)
  useEffect(() => {
    const t = searchParams.get("t") as Tab | null;
    const next: Tab = t ?? "overview";
    if (next !== tab) setTab(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
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

  // Pipeline 2D-C state
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [pipelineFilter, setPipelineFilter] = useState("all");

  // Pipeline Algo state
  const [algoSearch, setAlgoSearch] = useState("");
  const [algoFilterStatus, setAlgoFilterStatus] = useState("all");

  // Promo state
  const [promosLoading, setPromosLoading] = useState(false);


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
  const [crmSearch, setCrmSearch] = useState("");

  // Finance Hub state
  const [financeView, setFinanceView] = useState("overview");
  const [payoutRejectReason, setPayoutRejectReason] = useState<Record<string, string>>({});
  const [financeSearch, setFinanceSearch] = useState("");
  const [rewardsFilter, setRewardsFilter] = useState("all");

  // Marketing Hub state
  const [marketingView, setMarketingView] = useState("overview");
  const [marketingSearch, setMarketingSearch] = useState("");

  const [rateEditId, setRateEditId] = useState<string | null>(null);
  const [rateEditValue, setRateEditValue] = useState("");

  // Analytics Hub state
  const [analyticsView, setAnalyticsView] = useState("overview");

  // Security Center state
  const [securityView, setSecurityView] = useState("overview");
  const [securitySearch, setSecuritySearch] = useState("");
  const [ipMismatchShowAll, setIpMismatchShowAll] = useState(false);

  // Create challenge state
  const [createForm, setCreateForm] = useState({ userEmail: "", firstName: "", lastName: "", accountSize: "$10,000", model: "1step", amountPaid: "", createMT5: true, type: "challenge" as "challenge" | "reward" });
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createError, setCreateError] = useState("");

  const [isMobile, setIsMobile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // MT5 custom inline form (remplace prompt())
  const [mt5CustomModal, setMt5CustomModal] = useState<{ id: string; type: "add" | "withdraw"; mt5Login: number; mt5Balance: number } | null>(null);
  const [mt5CustomAmount, setMt5CustomAmount] = useState("");
  const [mt5CustomLoading, setMt5CustomLoading] = useState(false);
  const [mt5CustomMsg, setMt5CustomMsg] = useState("");

  // Inline delete confirm for challenges
  const [challengeDeleteConfirmId, setChallengeDeleteConfirmId] = useState<string | null>(null);

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

  // Settings & Maintenance Hub state
  const [settingsLegacyOpen, setSettingsLegacyOpen] = useState(false);
  const [maintenanceDangerOpen, setMaintenanceDangerOpen] = useState(false);

  const loadAdminData = async () => {
    const headers = { "x-admin-key": ADMIN_KEY };
    const [cRes, pRes, kRes, prRes] = await Promise.all([
      fetch("/api/admin/challenges?include=review", { headers }),
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
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if ((tab === "promos" || tab === "affilies") && promos.length === 0) loadPromos();
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
    if ((tab === "affilies" || tab === "promos") && !affiliatesLoaded) {
      fetch("/api/admin/affiliates", { headers: { "x-admin-key": ADMIN_KEY } })
        .then(r => r.json()).then(data => { if (Array.isArray(data)) { setAffiliates(data); setAffiliatesLoaded(true); } });
    }
  }, [tab, token, affiliatesLoaded]);

  useEffect(() => {
    if (tab === "payouts" || tab === "payouts_algo") setFinanceView("rewards");
    else if (tab === "financier" || tab === "financier_algo") setFinanceView("transactions");
    else if (tab === "compta") setFinanceView("historique");
    if (tab === "affilies") setMarketingView("affilies");
    else if (tab === "promos") setMarketingView("promotions");
  }, [tab]);

  const createAffiliatePromo = async () => {
    if (!affiliatePromoForm || !affiliatePromoData.code) return;
    const res = await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ action: "create_promo", code: affiliatePromoData.code, discount_percent: affiliatePromoData.discount, max_uses: affiliatePromoData.maxUses || null, affiliate_user_id: affiliatePromoForm.userId }),
    });
    const data = await res.json();
    if (res.ok) { setAffiliateMsg(`Code ${data.code} créé`); setAffiliatePromoForm(null); setAffiliatePromoData({ code: "", discount: "10", maxUses: "" }); }
    else setAffiliateMsg(`Erreur : ${data.error}`);
    setTimeout(() => setAffiliateMsg(""), 4000);
  };

  const updateCommissionRate = async (affiliateId: string, rate: number) => {
    const res = await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ action: "set_rate", affiliate_id: affiliateId, commission_rate: rate }),
    });
    if (res.ok) {
      const data = await res.json();
      setAffiliates(prev => prev.map(a => a.id === affiliateId ? { ...a, commission_rate: data.commission_rate } : a));
      setRateEditId(null);
    }
  };

  const payCommission = async (referralId: string) => {
    const res = await fetch("/api/admin/affiliates", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ action: "pay_commission", referral_id: referralId }),
    });
    if (res.ok) {
      const data = await res.json();
      setAffiliates(prev => prev.map(a => ({
        ...a,
        referrals: a.referrals.map(r => r.id === referralId ? { ...r, status: data.status } : r),
      })));
    }
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
    const res = await fetch("/api/admin/challenges?include=review", {
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
    await fetch("/api/admin/challenges?include=review", { method: "DELETE", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id }) });
    setChallenges(cs => cs.filter(x => x.id !== id));
    setChallengeDeleteConfirmId(null);
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
    setMt5CustomModal({ id: c.id, type: "add", mt5Login: c.mt5_login, mt5Balance });
    setMt5CustomAmount("");
    setMt5CustomMsg("");
  };

  const withdrawMT5Custom = async (c: Challenge) => {
    if (!c.mt5_login) { alert("Pas de login MT5 sur ce compte"); return; }
    const syncRes = await fetch(`/api/admin/mt5-fix-balance?login=${c.mt5_login}`, { headers: { "x-admin-key": ADMIN_KEY } });
    const syncData = await syncRes.json();
    const mt5Balance = syncData.balance ?? 0;
    setMt5CustomModal({ id: c.id, type: "withdraw", mt5Login: c.mt5_login, mt5Balance });
    setMt5CustomAmount("");
    setMt5CustomMsg("");
  };

  const executeMT5Custom = async () => {
    if (!mt5CustomModal) return;
    const amount = parseFloat(mt5CustomAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) { setMt5CustomMsg("Montant invalide"); return; }
    const { type, mt5Login, mt5Balance, id } = mt5CustomModal;
    if (type === "withdraw" && amount > mt5Balance) { setMt5CustomMsg(`Impossible : $${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} > balance`); return; }
    setMt5CustomLoading(true);
    setMt5CustomMsg("");
    const res = await fetch("/api/admin/mt5-fix-balance", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ login: mt5Login, amount, withdraw: type === "withdraw", comment: type === "add" ? "Ajout manuel admin" : "Retrait manuel admin" }),
    });
    const data = await res.json();
    if (res.ok) {
      const newBalance = type === "add" ? mt5Balance + amount : mt5Balance - amount;
      setChallenges(cs => cs.map(x => x.id === id ? { ...x, balance: newBalance } : x));
      setMt5CustomMsg(type === "add" ? `+$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ajoutés` : `$${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} retirés`);
      setTimeout(() => { setMt5CustomModal(null); setMt5CustomMsg(""); }, 2000);
    } else {
      setMt5CustomMsg(`Erreur : ${data.error}`);
    }
    setMt5CustomLoading(false);
  };

  const updatePayout = async (id: string, status: string) => {
    const res = await fetch("/api/admin/payouts", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id, status }) });
    const data = await res.json();
    if (res.ok) {
      setPayouts(ps => ps.map(p => p.id === id ? { ...p, ...data } : p));
      // Refresh challenges so trading_days + balance display the reset values
      if (status === "paid") {
        fetch("/api/admin/challenges?include=review", { headers: { "x-admin-key": ADMIN_KEY } })
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
    const res = await fetch("/api/admin/challenges?include=review", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ ...createForm, amountPaid: parseFloat(createForm.amountPaid) || 0 }) });
    const data = await res.json();
    setCreateLoading(false);
    if (res.ok) {
      setCreateMsg("Challenge créé — email envoyé au trader.");
      setCreateForm(f => ({ ...f, userEmail: "", firstName: "", lastName: "", amountPaid: "" }));
      const r = await fetch("/api/admin/challenges?include=review", { headers: { "x-admin-key": ADMIN_KEY } });
      const d = await r.json();
      if (Array.isArray(d)) setChallenges(d);
    } else setCreateError(data.error || "Erreur");
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

  const runSync = async () => {
    setSyncing(true); setSyncMsg(""); setSyncDetail("");
    try {
      const res = await fetch("/api/metaapi/sync", { headers: { Authorization: `Bearer admin-vincentmeipro@gmail.com` } });
      const data = await res.json();
      setSyncMsg(`✓ ${data.synced ?? 0}/${data.total ?? 0} synchronisé(s)`);
      setSyncDetail(JSON.stringify(data.results ?? data, null, 2));
      if (token) { const r = await fetch("/api/admin/challenges?include=review", { headers: { "x-admin-key": ADMIN_KEY } }); const d = await r.json(); if (Array.isArray(d)) setChallenges(d); }
    } catch (e) { setSyncMsg("Erreur sync"); setSyncDetail(String(e)); }
    setSyncing(false);
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const filteredChallenges = useMemo(() => challenges.filter(c => {
    if (c.model === "vip") return false;
    const q = search.toLowerCase();
    const matchSearch = !q || c.user_email?.toLowerCase().includes(q) || c.client_first_name?.toLowerCase().includes(q) || c.client_last_name?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  }), [challenges, search, filterStatus]);

  const filteredAlgoChallenges = useMemo(() => challenges.filter(c => {
    if (c.model !== "vip") return false;
    const q = algoSearch.toLowerCase();
    const matchSearch = !q || c.user_email?.toLowerCase().includes(q) || c.client_first_name?.toLowerCase().includes(q) || c.client_last_name?.toLowerCase().includes(q);
    const matchStatus = algoFilterStatus === "all" || c.status === algoFilterStatus;
    return matchSearch && matchStatus;
  }), [challenges, algoSearch, algoFilterStatus]);

  const maxCA = useMemo(() => monthlyRevenue.length > 0 ? Math.max(...monthlyRevenue.map(m => m.ca)) : 1, [monthlyRevenue]);

  const kycPendingCount = useMemo(() => kycSubmissions.filter(k => k.kyc_status === "pending").length, [kycSubmissions]);

  // Formulaire login supprimé — accès direct sans connexion

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#050505", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`@keyframes sk-fade { 0%,100%{opacity:.18} 50%{opacity:.07} }`}</style>
      {/* Skeleton header */}
      <div style={{ backgroundColor: "#0c0c0c", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px 32px", height: 56, display: "flex", alignItems: "center" }}>
        <div style={{ width: 120, height: 18, borderRadius: 6, background: "rgba(255,255,255,0.18)", animation: "sk-fade 1.6s ease-in-out infinite" }} />
      </div>
      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Skeleton KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ width: "60%", height: 10, borderRadius: 4, background: "rgba(255,255,255,0.12)", marginBottom: 12, animation: "sk-fade 1.6s ease-in-out infinite" }} />
              <div style={{ width: "40%", height: 28, borderRadius: 6, background: "rgba(255,255,255,0.18)", animation: "sk-fade 1.6s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
        {/* Skeleton card */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 24px" }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 0", borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ width: 180, height: 13, borderRadius: 4, background: "rgba(255,255,255,0.12)", animation: "sk-fade 1.6s ease-in-out infinite" }} />
              <div style={{ width: 80, height: 13, borderRadius: 4, background: "rgba(255,255,255,0.08)", animation: "sk-fade 1.6s ease-in-out infinite" }} />
              <div style={{ width: 60, height: 20, borderRadius: 100, background: "rgba(255,255,255,0.08)", marginLeft: "auto", animation: "sk-fade 1.6s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  if (error) return <div style={{ minHeight: "100vh", backgroundColor: "#050505", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}><div style={{ backgroundColor: "#0c0c0c", border: "1px solid #fca5a5", borderRadius: 12, padding: 32 }}><div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 12 }}>Erreur admin</div><div style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, fontFamily: "monospace" }}>{error}</div></div></div>;

  const p = isMobile ? "16px" : "32px";

  return (
    <>
      {/* ── MAIN ── */}
      <div style={{ flex: 1, backgroundColor: "#050505", color: "#fff", paddingBottom: isMobile ? 70 : 0 }}>
        {/* Header */}
        <div style={{ backgroundColor: "#0c0c0c", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: isMobile ? "12px 16px" : "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontSize: isMobile ? 16 : 20, fontWeight: 800, color: "#fff" }}>{TAB_LABELS[tab] ?? tab}</div>
          </div>
          <div />
        </div>

        {/* Mobile bottom nav + drawer — tous modules accessibles */}
        {isMobile && (() => {
          const primaryNav = [
            { id: "overview" as Tab, label: "Cockpit" },
            { id: "pipeline" as Tab, label: "Challenges" },
            { id: "crm"      as Tab, label: "Clients" },
            { id: "payouts"  as Tab, label: "Finance" },
            { id: "create"   as Tab, label: "Créer" },
          ];
          const drawerNav: { id: Tab | null; label: string; href?: string }[] = [
            { id: "affilies"    as Tab, label: "Marketing" },
            { id: "stats"       as Tab, label: "Analytics" },
            { id: "securite"    as Tab, label: "Sécurité" },
            { id: "settings"    as Tab, label: "Paramètres" },
            { id: "maintenance" as Tab, label: "Maintenance" },
            { id: null, label: "Produits", href: "/x8k3pz/products" },
          ];
          return (
            <>
              {/* Drawer overlay */}
              {drawerOpen && (
                <div
                  onClick={() => setDrawerOpen(false)}
                  style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 45 }}
                />
              )}

              {/* Drawer panel */}
              <div style={{
                position: "fixed", bottom: 56, left: 0, right: 0,
                background: "#0c0c0c", borderTop: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "12px 12px 0 0", zIndex: 46,
                transform: drawerOpen ? "translateY(0)" : "translateY(100%)",
                transition: "transform 0.22s cubic-bezier(.4,0,.2,1)",
                paddingTop: 8, paddingBottom: 4,
              }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "4px auto 12px" }} />
                <div style={{ padding: "0 16px 8px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase" }}>Modules</div>
                {drawerNav.map(item => item.href ? (
                  <a key={item.label} href={item.href}
                    style={{ display: "block", padding: "12px 20px", color: "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 400, textDecoration: "none", borderLeft: "3px solid transparent" }}
                    onClick={() => setDrawerOpen(false)}>
                    {item.label}
                  </a>
                ) : (
                  <button key={item.id} onClick={() => { if (item.id) setTab(item.id); setDrawerOpen(false); }}
                    aria-label={item.label}
                    style={{
                      width: "100%", textAlign: "left", padding: "12px 20px",
                      background: tab === item.id ? "rgba(59,130,246,0.06)" : "transparent",
                      border: "none",
                      borderLeft: `3px solid ${tab === item.id ? "#3b82f6" : "transparent"}`,
                      color: tab === item.id ? "#fff" : "rgba(255,255,255,0.65)",
                      fontSize: 13, fontWeight: tab === item.id ? 700 : 400, cursor: "pointer",
                    }}>
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Bottom bar */}
              <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50, background: "#0c0c0c", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", height: 56 }}>
                {primaryNav.map(t => {
                  const isActive = tab === t.id && !drawerOpen;
                  const badgeCount = t.id === "payouts" ? kpis.pendingPayouts : t.id === "crm" ? kycPendingCount : 0;
                  return (
                    <button key={t.id} onClick={() => { setTab(t.id); setDrawerOpen(false); }}
                      aria-label={t.label}
                      style={{ flex: 1, padding: "4px 2px 6px", background: "none", border: "none", borderTop: `2px solid ${isActive ? "#3b82f6" : "transparent"}`, color: isActive ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: isActive ? 700 : 400, cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 2, letterSpacing: "0.2px" }}>
                      {badgeCount > 0 && <span style={{ position: "absolute", top: 6, right: "15%", background: t.id === "crm" ? "#f59e0b" : "#ef4444", color: t.id === "crm" ? "#000" : "#fff", borderRadius: 100, padding: "1px 4px", fontSize: 8, fontWeight: 900, lineHeight: 1.4 }}>{badgeCount}</span>}
                      {t.label}
                    </button>
                  );
                })}
                {/* Menu button */}
                <button onClick={() => setDrawerOpen(o => !o)}
                  aria-label="Menu secondaire"
                  aria-expanded={drawerOpen}
                  style={{ flex: 1, padding: "4px 2px 6px", background: "none", border: "none", borderTop: `2px solid ${drawerOpen ? "#3b82f6" : "transparent"}`, color: drawerOpen ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: drawerOpen ? 700 : 400, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 2 }}>
                  <span style={{ fontSize: 15, lineHeight: 1 }}>≡</span>
                  Menu
                </button>
              </div>
            </>
          );
        })()}
        <div style={{ padding: isMobile ? "16px 12px" : "28px 32px" }}>

        {/* ══ COCKPIT OVERVIEW ══ */}
        {tab === "overview" && <OverviewCockpit />}

        {/* ══ COCKPIT OVERVIEW INLINE — REMPLACÉ (laissé pour référence, supprimé) ══ */}
        {false && (() => {
          const kycPending  = kycSubmissions.filter(k => k.kyc_status === "pending").length;
          const activeCount = kpis.phase1 + kpis.oneStep + kpis.phase2;

          // ── Risk Watch : top 5 comptes les plus proches de leur limite ──
          const riskWatch = challenges
            .filter(c => c.status === "active" && c.start_balance && c.balance)
            .map(c => {
              const totalDD       = Math.max(0, (c.start_balance - c.balance) / c.start_balance * 100);
              const totalLimit    = c.total_drawdown_limit  || 10;
              const totalConsumed = totalDD / totalLimit * 100;

              const dS     = c.daily_start_balance;
              const dL     = c.daily_low_equity ?? c.balance;
              const stale  = dS !== undefined && Math.abs(dS - c.start_balance) < 1;
              let dailyDD = 0; let dailyConsumed = 0;
              const hasDailyData = !!(dS && !stale);
              if (hasDailyData && dS) {
                dailyDD       = Math.max(0, (dS - Math.min(dL, c.balance)) / dS * 100);
                dailyConsumed = dailyDD / (c.daily_drawdown_limit || 5) * 100;
              }
              return { c, totalDD, totalConsumed, dailyDD, dailyConsumed, hasDailyData };
            })
            .filter(x => x.totalConsumed >= 40 || x.dailyConsumed >= 40)
            .sort((a, b) => Math.max(b.totalConsumed, b.dailyConsumed) - Math.max(a.totalConsumed, a.dailyConsumed))
            .slice(0, 5);

          // ── Activité récente : merge + tri par date desc ──
          type EvType = { at: string; label: string; sub: string; color: string };
          const events: EvType[] = [
            ...challenges
              .filter(c => c.phase === "phase1" || c.model === "instant")
              .map(c => ({ at: c.created_at, label: "Nouveau challenge", sub: `${c.account_size} · ${c.user_email}`, color: "#3b82f6" })),
            ...challenges
              .filter(c => c.phase === "phase2" && c.status !== "failed")
              .map(c => ({ at: c.created_at, label: "Phase 1 réussie", sub: `${c.account_size} · ${c.user_email}`, color: "#22c55e" })),
            ...payouts.map(p => ({
              at: p.created_at,
              label: p.status === "paid" ? "Reward validé" : "Reward demandé",
              sub: `€${p.amount?.toLocaleString() ?? "—"} · ${p.user_email}`,
              color: p.status === "paid" ? "#22c55e" : "#f59e0b",
            })),
            ...challenges
              .filter(c => c.status === "failed" && !!c.breach_at)
              .map(c => ({ at: c.breach_at as string, label: "Challenge échoué", sub: `${c.account_size} · ${c.user_email}`, color: "#ef4444" })),
          ]
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
            .slice(0, 8);

          // ── Helpers ──
          const fmtTime = (iso: string) => {
            const d = new Date(iso);
            const diffH = (Date.now() - d.getTime()) / 3600000;
            if (diffH < 24) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
            if (diffH < 48) return "Hier";
            return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          };
          const riskBadge = (pct: number) => {
            if (pct >= 90) return { label: "Critique", color: "#ef4444" };
            if (pct >= 75) return { label: "Élevé",    color: "#f97316" };
            return               { label: "Modéré",    color: "#f59e0b" };
          };

          // ── KPI cards ──
          const kpiCards: { label: string; value: string | number; sub: string; tabId?: Tab; accent?: string }[] = [
            { label: "Challenges actifs",  value: activeCount,                           sub: `${kpis.phase1} Ph1 · ${kpis.oneStep} 1-Step · ${kpis.phase2} Ph2`, tabId: "pipeline" },
            { label: "Comptes certifiés",  value: kpis.certified,                        sub: `${kpis.passed} en attente de certification`,                        tabId: "pipeline" },
            { label: "Rewards à traiter",  value: kpis.pendingPayouts,                   sub: kpis.pendingPayouts > 0 ? `€${kpis.pendingAmt.toLocaleString()} en attente` : "Aucun reward en attente", tabId: "payouts", accent: kpis.pendingPayouts > 0 ? "#f59e0b" : undefined },
            { label: "CA du mois",         value: `€${kpis.caMonth.toLocaleString()}`,   sub: `€${kpis.caYear.toLocaleString()} sur l'année`,                      accent: "#22c55e" },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* A — KPI ROW */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(196px, 1fr))", gap: 12 }}>
                {kpiCards.map((k, i) => (
                  <div key={i} onClick={() => k.tabId && setTab(k.tabId)} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px", cursor: k.tabId ? "pointer" : "default" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>{k.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: k.accent ?? "#fff", marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* B + C — À TRAITER / CHALLENGES À SURVEILLER */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.5fr", gap: 16, alignItems: "start" }}>

                {/* B — À TRAITER */}
                <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5 }}>À traiter</span>
                  </div>
                  <div>
                    {kycPending === 0 && kpis.pendingPayouts === 0 && kpis.alerts.length === 0 ? (
                      <div style={{ padding: "24px 20px", color: "#22c55e", fontSize: 13, fontWeight: 600, textAlign: "center" }}>Aucune action requise</div>
                    ) : (<>
                      {kycPending > 0 && (
                        <button onClick={() => setTab("kyc")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 20px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "left" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>KYC en attente</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{kycPending} dossier{kycPending > 1 ? "s" : ""} à traiter</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ background: "#f59e0b20", color: "#f59e0b", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>{kycPending}</span>
                            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>→</span>
                          </div>
                        </button>
                      )}
                      {kpis.pendingPayouts > 0 && (
                        <button onClick={() => setTab("payouts")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 20px", background: "none", border: "none", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", textAlign: "left" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>Rewards en attente</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>€{kpis.pendingAmt.toLocaleString()} à valider</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ background: "#3b82f620", color: "#3b82f6", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>{kpis.pendingPayouts}</span>
                            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>→</span>
                          </div>
                        </button>
                      )}
                      {kpis.alerts.length > 0 && (
                        <button onClick={() => setTab("pipeline")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>Comptes à risque</div>
                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>DD proche de la limite</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ background: "#ef444420", color: "#ef4444", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>{kpis.alerts.length}</span>
                            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>→</span>
                          </div>
                        </button>
                      )}
                    </>)}
                  </div>
                </div>

                {/* C — CHALLENGES À SURVEILLER */}
                <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5 }}>Challenges à surveiller</span>
                    {riskWatch.length > 0 && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{riskWatch.length} compte{riskWatch.length > 1 ? "s" : ""}</span>}
                  </div>
                  {riskWatch.length === 0 ? (
                    <div style={{ padding: "24px 20px", color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center" }}>Aucun compte en zone de risque</div>
                  ) : riskWatch.map(({ c, totalDD, totalConsumed, dailyDD, dailyConsumed, hasDailyData }) => {
                    const tLimit = c.total_drawdown_limit || 10;
                    const dLimit = c.daily_drawdown_limit || 5;
                    const rb     = riskBadge(Math.max(totalConsumed, dailyConsumed));
                    return (
                      <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                            {c.account_size} · {c.phase === "phase2" ? "Phase 2" : c.phase === "phase1" ? "Phase 1" : (c.model?.toUpperCase() || "—")}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
                            Max <span style={{ color: "#fff", fontWeight: 700 }}>{totalDD.toFixed(1)}%</span> / {tLimit}%
                          </div>
                          {hasDailyData && (
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
                              Daily {dailyDD.toFixed(1)}% / {dLimit}%
                            </div>
                          )}
                        </div>
                        <span style={{ background: `${rb.color}18`, color: rb.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>{rb.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* D + E — ACTIVITÉ RÉCENTE / ACTIONS RAPIDES */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr", gap: 16, alignItems: "start" }}>

                {/* D — ACTIVITÉ RÉCENTE */}
                <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5 }}>Activité récente</span>
                  </div>
                  {events.length === 0 ? (
                    <div style={{ padding: "24px 20px", color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center" }}>Aucune activité</div>
                  ) : events.map((ev, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", borderBottom: i < events.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <div style={{ width: 3, height: 30, borderRadius: 2, background: ev.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 1 }}>{ev.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.sub}</div>
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{fmtTime(ev.at)}</div>
                    </div>
                  ))}
                </div>

                {/* E — ACTIONS RAPIDES */}
                <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5 }}>Actions rapides</span>
                  </div>
                  <div>
                    {([
                      { label: "+ Nouveau challenge",  action: () => setTab("create"),   accent: true  },
                      { label: "Traiter les Rewards",  action: () => setTab("payouts"),  accent: false },
                      { label: "Voir les KYC",         action: () => setTab("kyc"),      accent: false },
                      { label: "Voir les Challenges",  action: () => setTab("pipeline"), accent: false },
                      { label: "Ajouter un Produit",   action: () => { window.location.href = "/x8k3pz/products"; }, accent: false },
                      { label: "Créer un Code Promo",  action: () => setTab("promos"),   accent: false },
                    ] as { label: string; action: () => void; accent: boolean }[]).map((a, i) => (
                      <button key={i} onClick={a.action} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "13px 20px", background: a.accent ? "rgba(59,130,246,0.07)" : "none", border: "none", borderBottom: i < 5 ? "1px solid rgba(255,255,255,0.04)" : "none", color: a.accent ? "#60a5fa" : "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: a.accent ? 700 : 500, cursor: "pointer", textAlign: "left" }}>
                        {a.label}
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

        {/* ══ PIPELINE CHALLENGES ══ */}
        {tab === "pipeline" && (() => {
          // Helper : est-ce un modèle 1-Step ?
          const is1StepM = (m: string) => m?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
          // IDs en alerte (Risk Watch)
          const riskIds = new Set(kpis.alerts.map((a: Challenge) => a.id));

          // Challenges filtrés selon filtre rapide + recherche
          const pipelineChallenges = challenges.filter(c => {
            if (c.model === "vip") return false;
            const s = search.toLowerCase();
            const matchSearch = !s ||
              c.user_email?.toLowerCase().includes(s) ||
              (c.client_first_name || "").toLowerCase().includes(s) ||
              (c.client_last_name  || "").toLowerCase().includes(s) ||
              String(c.mt5_login   || "").includes(s);
            if (!matchSearch) return false;
            switch (pipelineFilter) {
              case "active":    return c.status === "active";
              case "risk":      return riskIds.has(c.id);
              case "phase1":    return c.phase === "phase1" && !is1StepM(c.model) && c.status !== "failed";
              case "phase2":    return c.phase === "phase2" && c.status !== "failed";
              case "certified": return c.status === "funded";
              case "failed":    return c.status === "failed";
              case "1step":     return is1StepM(c.model);
              default:          return true;
            }
          });

          // Calcul risk compact (même logique que Risk Watch dans Overview)
          const calcRisk = (c: Challenge) => {
            if (c.status !== "active" || !c.start_balance || !c.balance) return null;
            const maxTotal = c.total_drawdown_limit || 10;
            const maxDaily = c.daily_drawdown_limit || 5;
            const _dS = c.daily_start_balance ?? null;
            const _dL = c.daily_low_equity ?? c.balance;
            const _st1 = _dS !== null && Math.abs(_dS - c.start_balance) < 1;
            const pStart = (_dS !== null && !_st1) ? _dS : c.balance;
            const pLow   = _st1 ? c.balance : (_dL >= c.balance - c.start_balance * 0.015 ? _dL : c.balance);
            const dailyUsed = Math.max(0, (pStart - pLow) / pStart * 100);
            const totalUsed = Math.max(0, (c.start_balance - c.balance) / c.start_balance * 100);
            const dCol = dailyUsed >= maxDaily ? "#ef4444" : dailyUsed >= maxDaily * 0.7 ? "#f59e0b" : "rgba(255,255,255,0.4)";
            const tCol = totalUsed >= maxTotal ? "#ef4444" : totalUsed >= maxTotal * 0.7 ? "#f59e0b" : "rgba(255,255,255,0.4)";
            return { dailyUsed, totalUsed, maxDaily, maxTotal, dCol, tCol };
          };

          // Filtres rapides
          const pills = [
            { id: "all",       label: "Tous",      cnt: challenges.filter(c => c.model !== "vip").length },
            { id: "active",    label: "Actifs",    cnt: kpis.phase1 + kpis.oneStep + kpis.phase2 },
            { id: "risk",      label: "À risque",  cnt: kpis.alerts.length },
            { id: "phase1",    label: "Phase 1",   cnt: kpis.phase1 },
            { id: "phase2",    label: "Phase 2",   cnt: kpis.phase2 },
            { id: "certified", label: "Certifiés", cnt: kpis.certified },
            { id: "failed",    label: "Échoués",   cnt: kpis.failed },
            { id: "1step",     label: "1-Step",    cnt: kpis.oneStep },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* En-tête */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#fff" }}>Challenges</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>Gestion et surveillance des comptes</div>
                </div>
                <button onClick={() => setTab("create")} style={{ padding: "9px 18px", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  + Nouveau Challenge
                </button>
              </div>

              {/* KPI pills — 4 indicateurs */}
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`, gap: 8 }}>
                {([
                  { label: "Actifs",   value: kpis.phase1 + kpis.oneStep + kpis.phase2, color: "#22c55e" },
                  { label: "À risque", value: kpis.alerts.length, color: kpis.alerts.length > 0 ? "#ef4444" : "rgba(255,255,255,0.3)" },
                  { label: "Passés",   value: kpis.passed,  color: "#f59e0b" },
                  { label: "Échoués",  value: kpis.failed,  color: kpis.failed > 0 ? "#ef4444" : "rgba(255,255,255,0.3)" },
                ] as { label: string; value: number; color: string }[]).map((k, i) => (
                  <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: isMobile ? "12px 14px" : "14px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 700 }}>{k.label}</span>
                    <span style={{ fontSize: 20, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</span>
                  </div>
                ))}
              </div>

              {/* Recherche + filtres rapides */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    placeholder="Email, nom, login MT5..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ flex: 1, maxWidth: 300, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                  />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                    {pipelineChallenges.length} résultat{pipelineChallenges.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {pills.map(p => (
                    <button key={p.id} onClick={() => setPipelineFilter(p.id)} style={{
                      padding: "5px 12px", borderRadius: 100, cursor: "pointer", whiteSpace: "nowrap",
                      border: `1px solid ${pipelineFilter === p.id ? "#3b82f6" : "rgba(255,255,255,0.1)"}`,
                      background: pipelineFilter === p.id ? "rgba(59,130,246,0.12)" : "transparent",
                      color: pipelineFilter === p.id ? "#60a5fa" : "rgba(255,255,255,0.5)",
                      fontSize: 12, fontWeight: pipelineFilter === p.id ? 700 : 400,
                    }}>
                      {p.label}{p.cnt > 0 && p.id !== "all" ? ` · ${p.cnt}` : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Trader", "Compte", "Phase", "Statut", "Balance", "Risk", "MT5", ""].map((h, i) => (
                          <th key={i} style={{ padding: "10px 12px", textAlign: "left", color: "rgba(255,255,255,0.35)", fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    {pipelineChallenges.length === 0
                      ? <tbody><tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                          {search || pipelineFilter !== "all" ? "Aucun résultat pour ces filtres" : "Aucun challenge"}
                        </td></tr></tbody>
                      : pipelineChallenges.map(c => {
                          const isExpanded = expandedChallenge === c.id;
                          const isEditing  = editing === c.id;
                          const name       = [c.client_first_name, c.client_last_name].filter(Boolean).join(" ");
                          const risk       = calcRisk(c);
                          const gainPct    = c.start_balance ? ((c.balance - c.start_balance) / c.start_balance * 100) : 0;
                          const gainColor  = gainPct > 0 ? "#22c55e" : gainPct < 0 ? "#ef4444" : "rgba(255,255,255,0.4)";

                          return (
                            <tbody key={c.id}>
                              {/* Ligne principale */}
                              <tr
                                style={{ borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.05)", background: isExpanded ? "rgba(59,130,246,0.04)" : isEditing ? "rgba(59,130,246,0.02)" : "transparent", cursor: isEditing ? "default" : "pointer" }}
                                onClick={isEditing ? undefined : () => setExpandedChallenge(isExpanded ? null : c.id)}
                              >
                                {/* Trader */}
                                <td style={{ padding: "11px 12px", maxWidth: 180, minWidth: 140 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {name || c.user_email}
                                  </div>
                                  {name && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</div>}
                                </td>

                                {/* Compte */}
                                <td style={{ padding: "11px 12px", whiteSpace: "nowrap" }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.account_size}</div>
                                  <span style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", fontSize: 10, padding: "1px 5px", borderRadius: 4, fontWeight: 700, textTransform: "uppercase" }}>
                                    {c.model === "instant" ? "INSTANT" : c.model?.toUpperCase() || "—"}
                                  </span>
                                </td>

                                {/* Phase */}
                                <td style={{ padding: "11px 12px" }}>
                                  {isEditing
                                    ? <CustomSelect small value={editData.phase || c.phase} onChange={v => setEditData(d => ({ ...d, phase: v }))} options={[{ value: "phase1", label: "Phase 1" }, { value: "phase2", label: "Phase 2" }, { value: "funded", label: "Reward" }]} />
                                    : <span style={{ background: c.phase === "funded" ? "rgba(34,197,94,0.12)" : c.phase === "phase2" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)", color: c.phase === "funded" ? "#22c55e" : c.phase === "phase2" ? "#f59e0b" : "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                                        {c.phase === "funded" ? "Reward" : c.phase === "phase2" ? "Phase 2" : c.model === "instant" ? "Instant" : "Phase 1"}
                                      </span>
                                  }
                                </td>

                                {/* Statut */}
                                <td style={{ padding: "11px 12px" }}>
                                  {isEditing
                                    ? <CustomSelect small value={editData.status || c.status} onChange={v => setEditData(d => ({ ...d, status: v }))} options={[{ value: "active", label: "Active" }, { value: "passed", label: "Passed" }, { value: "funded", label: "Reward" }, { value: "failed", label: "Failed" }]} />
                                    : badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                                </td>

                                {/* Balance */}
                                <td style={{ padding: "11px 12px", minWidth: 90 }}>
                                  {isEditing
                                    ? <input type="number" value={editData.balance ?? c.balance} onChange={e => { const nb = Number(e.target.value); setEditData(d => ({ ...d, balance: nb, daily_low_equity: Math.min(d.daily_low_equity ?? c.daily_low_equity ?? c.balance, nb) })); }} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 90 }} />
                                    : <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: c.status === "failed" ? "#ef4444" : "#fff", fontVariantNumeric: "tabular-nums" }}>
                                          ${(c.status === "failed" && c.breach_equity ? Math.round(c.breach_equity) : c.balance)?.toLocaleString() ?? "—"}
                                        </div>
                                        {c.status !== "failed" && c.start_balance
                                          ? <div style={{ fontSize: 11, color: gainColor, fontVariantNumeric: "tabular-nums" }}>{gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%</div>
                                          : c.status === "failed" && c.breach_value != null
                                            ? <div style={{ fontSize: 10, color: "#ef4444" }}>-{c.breach_value.toFixed(2)}%</div>
                                            : null
                                        }
                                      </div>
                                  }
                                </td>

                                {/* Risk */}
                                <td style={{ padding: "11px 12px", minWidth: 110 }}>
                                  {risk ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 2, fontVariantNumeric: "tabular-nums" }}>
                                      <div style={{ fontSize: 11, color: risk.dCol }}>
                                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>J </span>{risk.dailyUsed.toFixed(1)}% / {risk.maxDaily}%
                                      </div>
                                      <div style={{ fontSize: 11, color: risk.tCol }}>
                                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>M </span>{risk.totalUsed.toFixed(1)}% / {risk.maxTotal}%
                                      </div>
                                    </div>
                                  ) : c.status === "failed" && c.breach_value != null ? (
                                    <div style={{ fontSize: 11, color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>
                                      -{c.breach_value.toFixed(2)}%
                                      <div style={{ fontSize: 10, color: "rgba(239,68,68,0.65)" }}>{c.breach_reason === "daily_drawdown" ? "DD Jour" : "DD Max"}</div>
                                    </div>
                                  ) : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>—</span>}
                                </td>

                                {/* MT5 login */}
                                <td style={{ padding: "11px 12px" }} onClick={e => e.stopPropagation()}>
                                  {isEditing
                                    ? <input type="text" value={editData.mt5_login ?? c.mt5_login ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_login: Number(e.target.value) }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "3px 6px", color: "#60A5FA", fontSize: 11, width: 90, fontFamily: "monospace" }} />
                                    : c.mt5_login
                                      ? <button onClick={() => copyToClipboard(String(c.mt5_login))} title="Copier login" style={{ background: "none", border: "none", color: "#60A5FA", fontSize: 11, fontFamily: "monospace", cursor: "pointer", padding: 0 }}>{c.mt5_login} ⎘</button>
                                      : <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 11 }}>—</span>
                                  }
                                </td>

                                {/* Actions */}
                                <td style={{ padding: "11px 12px" }} onClick={e => e.stopPropagation()}>
                                  {isEditing
                                    ? <div style={{ display: "flex", gap: 6 }}>
                                        <button onClick={() => saveChallenge(c.id)} aria-label="Sauvegarder" style={{ background: "#22c55e", color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✓</button>
                                        <button onClick={() => { setEditing(null); setEditData({}); }} aria-label="Annuler" style={{ background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                      </div>
                                    : <button
                                        onClick={() => { setEditing(c.id); setEditData({}); setExpandedChallenge(c.id); }}
                                        style={{ background: "rgba(255,255,255,0.07)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}
                                      >
                                        Éditer
                                      </button>
                                  }
                                </td>
                              </tr>

                              {/* ── Panneau de détail expandable P1-P9 ── */}
                              {isExpanded && (
                                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                  <td colSpan={8} style={{ padding: 0 }}>
                                    <div style={{ background: "rgba(0,0,0,0.22)", borderTop: "1px solid rgba(59,130,246,0.1)", padding: isMobile ? "16px" : "20px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

                                      {/* P7 — Challenge card dominante (pleine largeur) */}
                                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "18px 20px" }}>
                                        {/* En-tête : taille · modèle · phase · statut · date */}
                                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                                          <span style={{ fontSize: 16, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{c.account_size}</span>
                                          <span style={{ fontSize: 10, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)", padding: "2px 7px", borderRadius: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
                                            {c.model === "instant" ? "INSTANT" : c.model?.toUpperCase() || "—"}
                                          </span>
                                          <span style={{ background: c.phase === "funded" ? "rgba(34,197,94,0.12)" : c.phase === "phase2" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)", color: c.phase === "funded" ? "#22c55e" : c.phase === "phase2" ? "#f59e0b" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                                            {c.phase === "funded" ? "Reward" : c.phase === "phase2" ? "Phase 2" : c.model === "instant" ? "Instant" : "Phase 1"}
                                          </span>
                                          {badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                                          <div style={{ flex: 1 }} />
                                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
                                        </div>

                                        <RewardReviewPanel data={c.reward_review} />

                                        {/* DD bars — comptes actifs uniquement */}
                                        {c.status === "active" && risk && (
                                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
                                            {([
                                              { label: "DD Jour", used: risk.dailyUsed, max: risk.maxDaily, col: risk.dCol },
                                              { label: "DD Max",  used: risk.totalUsed, max: risk.maxTotal, col: risk.tCol },
                                            ] as { label: string; used: number; max: number; col: string }[]).map((d, i) => (
                                              <div key={i}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                                                  <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1 }}>{d.label}</span>
                                                  <span style={{ fontSize: 13, fontWeight: 800, color: d.col, fontVariantNumeric: "tabular-nums" }}>{d.used.toFixed(1)}<span style={{ fontSize: 11, fontWeight: 400 }}>% / {d.max}%</span></span>
                                                </div>
                                                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                                                  <div style={{ width: `${Math.min(d.used / d.max * 100, 100)}%`, height: "100%", background: d.col, borderRadius: 99 }} />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {/* Breach banner — comptes failed */}
                                        {c.status === "failed" && c.breach_at && (
                                          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(239,68,68,0.8)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                                              BREACH · {c.breach_reason === "daily_drawdown" ? "DD Jour" : "DD Max"}
                                            </div>
                                            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "baseline" }}>
                                              <span style={{ fontSize: 16, fontWeight: 800, color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>-{c.breach_value?.toFixed(2) ?? "?"}%</span>
                                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{new Date(c.breach_at).toLocaleDateString("fr-FR")}</span>
                                              {c.breach_equity && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" }}>Equity : ${Math.round(c.breach_equity).toLocaleString()}</span>}
                                            </div>
                                          </div>
                                        )}

                                        {/* Métadonnées secondaires */}
                                        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                            <span style={{ color: c.trading_days >= 5 ? "#22c55e" : "rgba(255,255,255,0.65)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{c.trading_days}</span> j. tradés
                                          </span>
                                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                            Départ <span style={{ color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>${c.start_balance?.toLocaleString()}</span>
                                          </span>
                                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                            Payé <span style={{ color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>€{c.amount_paid}</span>
                                          </span>
                                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                            Limites <span style={{ color: "rgba(255,255,255,0.45)" }}>{c.daily_drawdown_limit || 5}% J / {c.total_drawdown_limit || 10}% max</span>
                                          </span>
                                        </div>
                                      </div>

                                      {/* P3/P4 — Identité | MT5 & Actions (2 cols desktop/tablette, 1 col mobile) */}
                                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>

                                        {/* Colonne Identité */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Identité</div>
                                          {([
                                            { label: "Prénom",    value: c.client_first_name },
                                            { label: "Nom",       value: c.client_last_name  },
                                            { label: "Email",     value: c.user_email         },
                                            { label: "Téléphone", value: c.client_phone       },
                                          ] as { label: string; value?: string | null }[]).filter(f => f.value).map((f, i) => (
                                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                              <span style={{ width: 68, flexShrink: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{f.label}</span>
                                              <button onClick={() => copyToClipboard(f.value!)} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "5px 10px", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer", textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                {f.value} <span style={{ color: "rgba(255,255,255,0.25)" }}>⎘</span>
                                              </button>
                                            </div>
                                          ))}
                                          {isEditing && (
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                              <span style={{ width: 68, flexShrink: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>J. tradés</span>
                                              <input type="number" value={editData.trading_days ?? c.trading_days} onChange={e => setEditData(d => ({ ...d, trading_days: Number(e.target.value) }))} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "5px 8px", color: "#fff", fontSize: 12, width: 70 }} />
                                            </div>
                                          )}
                                        </div>

                                        {/* Colonne MT5 + Actions */}
                                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                                          {/* P6 — Fiche MT5 */}
                                          <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "14px 16px" }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>MT5</div>
                                            {c.mt5_login ? (
                                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                                {/* Login + Serveur */}
                                                {([
                                                  { label: "Login",   value: String(c.mt5_login) },
                                                  { label: "Serveur", value: c.mt5_server || "—"  },
                                                ] as { label: string; value: string }[]).map((f, i) => (
                                                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ width: 56, flexShrink: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{f.label}</span>
                                                    <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.75)", fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.value}</span>
                                                    <button onClick={() => copyToClipboard(f.value)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "3px 9px", color: "rgba(255,255,255,0.35)", fontSize: 10, cursor: "pointer", flexShrink: 0 }}>⎘</button>
                                                  </div>
                                                ))}
                                                {/* Passwords masqués — P6 alignement uniforme */}
                                                {([
                                                  { label: "Password", value: c.mt5_password,          key: `${c.id}_pw`  },
                                                  { label: "Investor", value: c.mt5_password_investor,  key: `${c.id}_inv` },
                                                ] as { label: string; value: string; key: string }[]).filter(f => f.value).map(f => (
                                                  <div key={f.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                    <span style={{ width: 56, flexShrink: 0, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{f.label}</span>
                                                    <span style={{ flex: 1, fontSize: 12, fontFamily: "monospace", letterSpacing: revealedPasswords.has(f.key) ? 0 : 2 }}>
                                                      {revealedPasswords.has(f.key)
                                                        ? <span style={{ color: "rgba(255,255,255,0.75)" }}>{f.value}</span>
                                                        : <span style={{ color: "rgba(255,255,255,0.2)" }}>••••••••</span>
                                                      }
                                                    </span>
                                                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                                      {revealedPasswords.has(f.key) && (
                                                        <button onClick={() => copyToClipboard(f.value)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "3px 9px", color: "rgba(255,255,255,0.35)", fontSize: 10, cursor: "pointer" }}>⎘</button>
                                                      )}
                                                      <button onClick={() => setRevealedPasswords(s => { const n = new Set(s); n.has(f.key) ? n.delete(f.key) : n.add(f.key); return n; })} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 4, padding: "3px 9px", color: "rgba(255,255,255,0.35)", fontSize: 10, cursor: "pointer" }}>
                                                        {revealedPasswords.has(f.key) ? "Masquer" : "Révéler"}
                                                      </button>
                                                    </div>
                                                  </div>
                                                ))}
                                                {/* Inputs edit en mode édition */}
                                                {isEditing && (
                                                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                                                    <input type="text" placeholder="Modifier password" value={editData.mt5_password ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_password: e.target.value }))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "5px 10px", color: "#fff", fontSize: 11, fontFamily: "monospace" }} />
                                                    <input type="text" placeholder="Modifier serveur" value={editData.mt5_server ?? ""} onChange={e => setEditData(d => ({ ...d, mt5_server: e.target.value }))} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 5, padding: "5px 10px", color: "#fff", fontSize: 11, fontFamily: "monospace" }} />
                                                  </div>
                                                )}
                                              </div>
                                            ) : (
                                              provisionMsg[c.id]
                                                ? <div style={{ fontSize: 11, color: provisionMsg[c.id].startsWith("✓") ? "#22c55e" : "#ef4444" }}>{provisionMsg[c.id]}</div>
                                                : <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)" }}>Non provisionné</div>
                                            )}
                                          </div>

                                          {/* P5 — Actions rapides */}
                                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>Actions rapides</div>
                                            <button onClick={() => sendAccessEmail(c.user_email)} style={{ padding: "9px 14px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 7, color: "#60a5fa", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
                                              {accessEmailMsg[c.user_email] || "Renvoyer accès email"}
                                            </button>
                                            {!c.mt5_login && !provisionMsg[c.id] && (
                                              <button onClick={() => provisionMT5(c)} disabled={provisioningId === c.id} style={{ padding: "9px 14px", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.22)", borderRadius: 7, color: "#f97316", fontSize: 12, fontWeight: 600, cursor: provisioningId === c.id ? "not-allowed" : "pointer", textAlign: "left", opacity: provisioningId === c.id ? 0.5 : 1 }}>
                                                {provisioningId === c.id ? "Provisionnement..." : "Provisionner MT5"}
                                              </button>
                                            )}
                                            {c.mt5_login && (
                                              <button onClick={() => addMT5Custom(c)} style={{ padding: "9px 14px", background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.18)", borderRadius: 7, color: "#22c55e", fontSize: 12, fontWeight: 600, cursor: "pointer", textAlign: "left" }}>+ Ajouter balance</button>
                                            )}
                                          </div>

                                          {/* P5 — Actions techniques */}
                                          {c.mt5_login && (
                                            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.18)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 2 }}>Techniques</div>
                                              <button onClick={() => withdrawMT5Custom(c)} style={{ padding: "7px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", textAlign: "left" }}>− Retirer balance</button>
                                              <button onClick={() => withdrawMT5Profit(c)} style={{ padding: "7px 12px", background: "transparent", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer", textAlign: "left" }}>Retrait profit MT5</button>
                                            </div>
                                          )}

                                        </div>
                                      </div>

                                      {/* Zone dangereuse — double confirm inline */}
                                      <div style={{ borderTop: "1px solid rgba(239,68,68,0.1)", paddingTop: 16 }}>
                                        {challengeDeleteConfirmId !== c.id ? (
                                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 8, padding: "14px 18px", flexWrap: "wrap" }}>
                                            <div>
                                              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(239,68,68,0.6)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>Zone dangereuse</div>
                                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Supprimer définitivement ce challenge. Action irréversible.</div>
                                            </div>
                                            <button onClick={() => setChallengeDeleteConfirmId(c.id)} style={{ padding: "8px 18px", background: "transparent", border: "1px solid rgba(239,68,68,0.4)", borderRadius: 7, color: "#ef4444", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                                              Supprimer
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, padding: "14px 18px" }}>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 6 }}>Confirmer la suppression ?</div>
                                            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 12 }}>Cette action est irréversible. Le challenge sera supprimé de la base de données.</div>
                                            <div style={{ display: "flex", gap: 10 }}>
                                              <button onClick={() => setChallengeDeleteConfirmId(null)} style={{ padding: "7px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                                              <button onClick={() => deleteChallenge(c.id)} style={{ padding: "7px 16px", background: "#ef4444", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirmer la suppression</button>
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                    </div>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          );
                        })
                    }
                  </table>
                </div>
              </div>

            </div>
          );
        })()}

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
                                    <button onClick={() => saveChallenge(c.id)} aria-label="Sauvegarder" style={{ background: "#a78bfa", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>✓</button>
                                    <button onClick={() => { setEditing(null); setEditData({}); }} aria-label="Annuler" style={{ background: "transparent", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                  </div>
                                : <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                    <button onClick={() => { setEditing(c.id); setEditData({}); }} style={{ background: "rgba(139,92,246,0.12)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.25)", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                                    {c.mt5_login && <button onClick={() => addMT5Custom(c)} style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid #22c55e33", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>+$</button>}
                                    {c.mt5_login && <button onClick={() => withdrawMT5Custom(c)} style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>−$</button>}
                                    {challengeDeleteConfirmId === c.id
                                      ? <><button onClick={() => deleteChallenge(c.id)} style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirmer</button><button onClick={() => setChallengeDeleteConfirmId(null)} style={{ background: "transparent", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 8px", fontSize: 12, cursor: "pointer" }}>✕</button></>
                                      : <button onClick={() => setChallengeDeleteConfirmId(c.id)} aria-label="Supprimer ce challenge" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
                                    }
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

        {/* ══ TRADER HUB CRM 360° ══ */}
        {tab === "crm" && (() => {
          const crmFiltered = crmSearch.trim()
            ? traderCRM.filter(t => {
                const s = crmSearch.toLowerCase();
                return t.email.toLowerCase().includes(s) || t.name.toLowerCase().includes(s);
              })
            : traderCRM;

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Barre de recherche */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <input
                  placeholder="Rechercher un trader (nom ou email)..."
                  value={crmSearch}
                  onChange={e => setCrmSearch(e.target.value)}
                  style={{ flex: 1, maxWidth: 340, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 13, outline: "none" }}
                />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>
                  {crmFiltered.length} trader{crmFiltered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {crmFiltered.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                  {crmSearch ? "Aucun résultat" : "Aucun trader"}
                </div>
              )}

              {crmFiltered.map(trader => {
                const isOpen           = crmExpanded === trader.email;
                const profile          = profiles.find(p => p.email === trader.email);
                const traderPayouts    = payouts.filter(p => p.user_email === trader.email);
                const kyc              = kycSubmissions.find(k => k.user_email === trader.email);
                const activeC          = trader.challenges.filter(c => c.status === "active").length;
                const certC            = trader.challenges.filter(c => c.status === "funded").length;
                const failedC          = trader.challenges.filter(c => c.status === "failed").length;
                const totalRewardsPaid = traderPayouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
                const country          = profile?.country || null;
                const kycBg    = !kyc ? "rgba(255,255,255,0.06)" : kyc.kyc_status === "approved" ? "rgba(34,197,94,0.12)" : kyc.kyc_status === "rejected" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)";
                const kycClr   = !kyc ? "rgba(255,255,255,0.3)" : kyc.kyc_status === "approved" ? "#22c55e" : kyc.kyc_status === "rejected" ? "#ef4444" : "#f59e0b";
                const kycLbl   = !kyc ? "Non soumis" : kyc.kyc_status === "approved" ? "KYC" : kyc.kyc_status === "rejected" ? "Refusé" : "En attente";

                return (
                  <div key={trader.email} style={{ background: "#0c0c0c", border: `1px solid ${isOpen ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, overflow: "hidden" }}>

                    {/* Ligne — fermée */}
                    <div
                      onClick={() => setCrmExpanded(isOpen ? null : trader.email)}
                      style={{ padding: "14px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", flexWrap: "wrap" }}
                    >
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{trader.name || trader.email}</div>
                        {trader.name && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{trader.email}</div>}
                        {country && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>{country}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ background: kycBg, color: kycClr, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{kycLbl}</span>
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                          {trader.challenges.length} challenge{trader.challenges.length !== 1 ? "s" : ""}
                          {activeC > 0 && <span style={{ color: "#22c55e", fontWeight: 700 }}> · {activeC} actif{activeC !== 1 ? "s" : ""}</span>}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>€{trader.totalSpent.toLocaleString()}</span>
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</div>
                    </div>

                    {/* HUB 360° */}
                    {isOpen && (() => {
                      const pendingPayouts = traderPayouts.filter(p => p.status === "pending");
                      const paidPayouts    = traderPayouts.filter(p => p.status === "paid");
                      const margeBrute     = trader.totalSpent - totalRewardsPaid;
                      const traderId       = profile?.user_id;
                      const traderAffil    = affiliatesLoaded ? affiliates.find(a => a.email === trader.email) : null;
                      const traderReferrer = (affiliatesLoaded && traderId != null)
                        ? affiliates.find(a => a.referrals.some(r => r.referred_user_id === traderId))
                        : null;
                      const docFields: Array<{ field: keyof KycSubmission["doc_urls"]; label: string }> = [
                        { field: "id_front",  label: "ID recto" },
                        { field: "id_back",   label: "ID verso" },
                        { field: "residence", label: "Domicile" },
                        { field: "selfie",    label: "Selfie"   },
                      ];
                      const statusOrd: Record<string, number> = { active: 0, passed: 1, funded: 2, failed: 3 };

                      return (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>

                          {/* HEADER */}
                          <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {/* Identité + actions */}
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 }}>
                              <div>
                                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: "1.2" }}>{trader.name || trader.email}</div>
                                {trader.name && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>{trader.email}</div>}
                                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                                  {country && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{country}</span>}
                                  {country && <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>}
                                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Depuis {new Date(trader.firstDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</span>
                                  <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>
                                  <span style={{ background: kycBg, color: kycClr, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{kycLbl}</span>
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <button onClick={() => sendAccessEmail(trader.email)}
                                  style={{ padding: "8px 16px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, color: "#60a5fa", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                  {accessEmailMsg[trader.email] || "Renvoyer accès"}
                                </button>
                                <button onClick={() => { setTab("pipeline"); setSearch(trader.email); }}
                                  style={{ padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                                  Voir Pipeline
                                </button>
                                {traderId && (
                                  <a href={`/x8k3pz/traders/${traderId}`}
                                    style={{ padding: "8px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
                                    Fiche trader
                                  </a>
                                )}
                                <button onClick={() => setTab("create")}
                                  style={{ padding: "8px 16px", background: "#3b82f6", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                  + Challenge
                                </button>
                              </div>
                            </div>

                            {/* KPI strip */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                              {([
                                { label: "LTV",         value: `€${trader.totalSpent.toLocaleString()}`,   color: "#22c55e" },
                                { label: "Challenges",  value: String(trader.challenges.length),            color: "#fff"    },
                                { label: "Actifs",      value: String(activeC),                             color: activeC > 0 ? "#22c55e" : "rgba(255,255,255,0.25)" },
                                { label: "Certifiés",   value: String(certC),                               color: certC > 0  ? "#3b82f6"  : "rgba(255,255,255,0.25)" },
                                { label: "Rewards",     value: `€${totalRewardsPaid.toLocaleString()}`,     color: totalRewardsPaid > 0 ? "#3b82f6" : "rgba(255,255,255,0.25)" },
                                { label: "Marge brute", value: `€${margeBrute.toLocaleString()}`,           color: margeBrute >= 0 ? "#22c55e" : "#ef4444" },
                              ] as { label: string; value: string; color: string }[]).map((k, i) => (
                                <div key={i} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px" }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>{k.label}</div>
                                  <div style={{ fontSize: 16, fontWeight: 800, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* BODY 2 colonnes */}
                          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.5fr 1fr" }}>

                            {/* COL GAUCHE — Challenges · Rewards · Finance */}
                            <div style={{ padding: "20px 24px", borderRight: isMobile ? "none" : "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 24 }}>

                              {/* S1 Challenges */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Challenges</div>
                                {trader.challenges.length === 0
                                  ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucun challenge</div>
                                  : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                      {[...trader.challenges]
                                        .sort((a, b) => (statusOrd[a.status] ?? 4) - (statusOrd[b.status] ?? 4))
                                        .map(c => {
                                          const gain   = c.start_balance ? ((c.balance - c.start_balance) / c.start_balance * 100) : 0;
                                          const gainClr = gain > 0 ? "#22c55e" : gain < 0 ? "#ef4444" : "rgba(255,255,255,0.3)";
                                          const totDD  = (c.status === "active" && c.start_balance && c.balance)
                                            ? Math.max(0, (c.start_balance - c.balance) / c.start_balance * 100) : null;
                                          const maxDD  = c.total_drawdown_limit || 10;
                                          const ddClr  = totDD !== null ? (totDD >= maxDD ? "#ef4444" : totDD >= maxDD * 0.7 ? "#f59e0b" : "rgba(255,255,255,0.35)") : "rgba(255,255,255,0.2)";
                                          return (
                                            <div key={c.id} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                              <div style={{ flex: 1, minWidth: 80 }}>
                                                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                  <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.account_size}</span>
                                                  <span style={{ fontSize: 10, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)", padding: "1px 5px", borderRadius: 3, fontWeight: 700, textTransform: "uppercase" }}>{c.model === "instant" ? "INST" : (c.model || "").toUpperCase()}</span>
                                                  <span style={{ background: c.phase === "funded" ? "rgba(34,197,94,0.12)" : c.phase === "phase2" ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.06)", color: c.phase === "funded" ? "#22c55e" : c.phase === "phase2" ? "#f59e0b" : "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 4 }}>
                                                    {c.phase === "funded" ? "Reward" : c.phase === "phase2" ? "Ph2" : "Ph1"}
                                                  </span>
                                                  {badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                                                </div>
                                              </div>
                                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: c.status === "failed" ? "#ef4444" : "#fff", fontVariantNumeric: "tabular-nums" }}>
                                                  ${c.balance?.toLocaleString() ?? "—"}
                                                </div>
                                                {c.status === "active" && c.start_balance ? (
                                                  <div style={{ fontSize: 10, color: gainClr, fontVariantNumeric: "tabular-nums" }}>
                                                    {gain >= 0 ? "+" : ""}{gain.toFixed(1)}%
                                                    {totDD !== null && <span style={{ color: ddClr, marginLeft: 4 }}>DD {totDD.toFixed(1)}%</span>}
                                                  </div>
                                                ) : c.status === "failed" && c.breach_value != null ? (
                                                  <div style={{ fontSize: 10, color: "#ef4444" }}>-{c.breach_value.toFixed(2)}%</div>
                                                ) : null}
                                              </div>
                                              <button onClick={e => { e.stopPropagation(); setTab("pipeline"); setSearch(trader.email); }}
                                                style={{ padding: "4px 10px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 5, color: "#60a5fa", fontSize: 10, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                                                Pipeline
                                              </button>
                                            </div>
                                          );
                                        })}
                                    </div>
                                }
                              </div>

                              {/* S2 Rewards */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Rewards</div>
                                {traderPayouts.length === 0
                                  ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucune demande</div>
                                  : <>
                                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                        {[...traderPayouts]
                                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                          .map(p => (
                                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7 }}>
                                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
                                              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>€{p.amount?.toLocaleString()}</span>
                                              {badge(STATUS_LABELS[p.status] || p.status, STATUS_COLORS[p.status] || "#888")}
                                              {p.payment_method && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.payment_method}</span>}
                                            </div>
                                          ))}
                                      </div>
                                      {paidPayouts.length > 0 && (
                                        <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                                          Total reçu : <span style={{ color: "#22c55e", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>€{totalRewardsPaid.toLocaleString()}</span>
                                          {pendingPayouts.length > 0 && <span style={{ marginLeft: 12 }}>En attente : <span style={{ color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>€{pendingPayouts.reduce((s, p) => s + p.amount, 0).toLocaleString()}</span></span>}
                                        </div>
                                      )}
                                    </>
                                }
                              </div>

                              {/* S4 Finance */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Finance</div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                  {([
                                    { label: "Total dépensé", value: `€${trader.totalSpent.toLocaleString()}`,  color: "#fff" },
                                    { label: "Rewards reçus", value: `€${totalRewardsPaid.toLocaleString()}`,   color: totalRewardsPaid > 0 ? "#3b82f6" : "rgba(255,255,255,0.25)" },
                                    { label: "Marge brute",   value: `€${margeBrute.toLocaleString()}`,         color: margeBrute >= 0 ? "#22c55e" : "#ef4444" },
                                    ...(failedC > 0 ? [{ label: "Échecs", value: String(failedC), color: "#ef4444" }] : []),
                                  ] as { label: string; value: string; color: string }[]).map((f, i) => (
                                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{f.label}</span>
                                      <span style={{ fontSize: 12, fontWeight: 700, color: f.color, fontVariantNumeric: "tabular-nums" }}>{f.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>

                            {/* COL DROITE — KYC · Sécurité · Affiliation */}
                            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>

                              {/* S3 KYC */}
                              <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>KYC</div>
                                {!kyc
                                  ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Non soumis</div>
                                  : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                        <span style={{ background: kycBg, color: kycClr, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 }}>{kycLbl}</span>
                                        {kyc.kyc_submitted_at && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Soumis {new Date(kyc.kyc_submitted_at).toLocaleDateString("fr-FR")}</span>}
                                        {kyc.kyc_reviewed_at  && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Revu {new Date(kyc.kyc_reviewed_at).toLocaleDateString("fr-FR")}</span>}
                                      </div>
                                      {kyc.kyc_rejection_reason && (
                                        <div style={{ fontSize: 11, color: "#ef4444", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 6, padding: "8px 12px" }}>
                                          Motif : {kyc.kyc_rejection_reason}
                                        </div>
                                      )}
                                      {kyc.doc_urls && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                          {docFields.map(({ field, label }) =>
                                            kyc.doc_urls[field] ? (
                                              <a key={field} href={kyc.doc_urls[field]!} target="_blank" rel="noopener noreferrer"
                                                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "4px 10px", color: "#60a5fa", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
                                                {label}
                                              </a>
                                            ) : null
                                          )}
                                        </div>
                                      )}
                                      {kyc.kyc_status === "pending" && (
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                          <button onClick={() => updateKyc(kyc.id, "approved")}
                                            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                            Approuver
                                          </button>
                                          <input value={kycRejectReason[kyc.id] || ""} onChange={e => setKycRejectReason(r => ({ ...r, [kyc.id]: e.target.value }))}
                                            placeholder="Motif de refus..."
                                            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 11, outline: "none", flex: 1, minWidth: 80 }} />
                                          <button onClick={() => updateKyc(kyc.id, "rejected", kycRejectReason[kyc.id])}
                                            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                            Refuser
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                }
                              </div>

                              {/* S5 Sécurité & Identité */}
                              {profile && (profile.registration_ip || profile.registration_country || profile.phone || profile.address) && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Sécurité & Identité</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                                    {profile.registration_ip && (
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>IP inscription</span>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>{profile.registration_ip}</span>
                                      </div>
                                    )}
                                    {profile.registration_country && (
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>Pays inscription</span>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>{profile.registration_country}</span>
                                      </div>
                                    )}
                                    {profile.registration_ip != null && (
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>VPN</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: profile.registration_is_vpn ? "#f59e0b" : "#22c55e" }}>
                                          {profile.registration_is_vpn ? "Détecté" : "Non"}
                                        </span>
                                      </div>
                                    )}
                                    {profile.phone && (
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>Téléphone</span>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>{profile.phone}</span>
                                      </div>
                                    )}
                                    {profile.address && (
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>Adresse</span>
                                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "right" }}>
                                          {profile.address}{profile.postal_code ? ` ${profile.postal_code}` : ""}{profile.city ? ` ${profile.city}` : ""}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* S6 Affiliation (si onglet affiliés visité) */}
                              {affiliatesLoaded && (traderAffil || traderReferrer) && (
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 10 }}>Affiliation</div>
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {traderAffil && (
                                      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "12px 14px" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Affilié</div>
                                        {([
                                          { label: "Code",       value: traderAffil.code,                                       mono: true  },
                                          { label: "Commission", value: `${traderAffil.commission_rate}%`,                      mono: false },
                                          { label: "Referrals",  value: String(traderAffil.referrals?.length ?? 0),             mono: false },
                                          { label: "Gagné",      value: `€${(traderAffil.total_earned || 0).toLocaleString()}`, mono: false },
                                          { label: "Payé",       value: `€${(traderAffil.total_paid   || 0).toLocaleString()}`, mono: false },
                                        ] as { label: string; value: string; mono: boolean }[]).map((f, i) => (
                                          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i < 4 ? 5 : 0 }}>
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{f.label}</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: f.mono ? "monospace" : "inherit", fontVariantNumeric: "tabular-nums" }}>{f.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {traderReferrer && (
                                      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "12px 14px" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Parrain</div>
                                        {([
                                          { label: "Code",       value: traderReferrer.code,                  mono: true  },
                                          { label: "Commission", value: `${traderReferrer.commission_rate}%`, mono: false },
                                        ] as { label: string; value: string; mono: boolean }[]).map((f, i) => (
                                          <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: i === 0 ? 5 : 0 }}>
                                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{f.label}</span>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", fontFamily: f.mono ? "monospace" : "inherit" }}>{f.value}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                            </div>
                          </div>

                        </div>
                      );
                    })()}

                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ══ FINANCE HUB ══ */}
        {(tab === "financier" || tab === "financier_algo" || tab === "payouts" || tab === "payouts_algo" || tab === "compta") && (() => {
          const pendingRewards = payouts.filter(p => p.status === "pending");
          const paidRewards    = payouts.filter(p => p.status === "paid");
          const totalPaid      = paidRewards.reduce((s, p) => s + p.amount, 0);
          const pendingAmt     = pendingRewards.reduce((s, p) => s + p.amount, 0);
          const isPurchase     = (c: Challenge) => c.phase === "phase1" || c.model === "instant";

          const rwBase = rewardsFilter === "pending" ? pendingRewards
            : rewardsFilter === "paid"     ? paidRewards
            : rewardsFilter === "rejected" ? payouts.filter(p => p.status === "rejected")
            : payouts;
          const rwList = (financeSearch.trim()
            ? rwBase.filter(p => (p.user_email || "").toLowerCase().includes(financeSearch.toLowerCase()))
            : rwBase
          ).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          const txBase = challenges.filter(isPurchase);
          const txList = (financeSearch.trim()
            ? txBase.filter(c => {
                const s = financeSearch.toLowerCase();
                return (c.user_email || "").toLowerCase().includes(s)
                  || `${c.client_first_name || ""} ${c.client_last_name || ""}`.toLowerCase().includes(s);
              })
            : txBase
          ).slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          const histList = paidRewards.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          const exportCSV = () => {
            const headers = ["Référence","Date","Email","Montant","Méthode","IBAN/Wallet","Statut"];
            const rows = histList.map(p => {
              const ref = `TR-${new Date(p.created_at).getFullYear()}-${p.id.slice(0,6).toUpperCase()}`;
              return [ref, new Date(p.created_at).toLocaleDateString("fr-FR"), p.user_email || "", String(p.amount), p.payment_method === "crypto" ? "Crypto" : p.payment_method || "—", p.wallet_address || "", "Versé"].join(";");
            });
            const csv = [headers.join(";"), ...rows].join("\n");
            const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `traders-rewards-finance-${new Date().toISOString().slice(0,10)}.csv`; a.click();
            URL.revokeObjectURL(url);
          };

          const views = [
            { id: "overview",     label: "Vue d'ensemble" },
            { id: "rewards",      label: "Rewards" },
            { id: "transactions", label: "Transactions" },
            { id: "historique",   label: "Historique" },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Header */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Finance</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Revenus, Rewards et historique financier</div>
              </div>

              {/* Sous-navigation */}
              <div style={{ display: "flex", gap: 2, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 4, width: "fit-content" }}>
                {views.map(v => (
                  <button key={v.id} onClick={() => setFinanceView(v.id)}
                    style={{ padding: "7px 16px", background: financeView === v.id ? "#111" : "transparent", border: financeView === v.id ? "1px solid rgba(255,255,255,0.1)" : "1px solid transparent", borderRadius: 7, color: financeView === v.id ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: financeView === v.id ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    {v.label}
                    {v.id === "rewards" && pendingRewards.length > 0 && (
                      <span style={{ background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 900, padding: "1px 5px", borderRadius: 10 }}>
                        {pendingRewards.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ─── OVERVIEW ─── */}
              {financeView === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {([
                      { label: "CA du mois",     value: `€${kpis.caMonth.toLocaleString()}`,     color: "#fff" },
                      { label: "Rewards versés", value: `€${totalPaid.toLocaleString()}`,         color: totalPaid  > 0 ? "#3b82f6" : "rgba(255,255,255,0.25)" },
                      { label: "En attente",     value: `€${pendingAmt.toLocaleString()}`,        color: pendingAmt > 0 ? "#f59e0b" : "rgba(255,255,255,0.25)" },
                      { label: "Marge du mois",  value: `${kpis.margeMonth}%`,                   color: kpis.margeMonth > 0 ? "#22c55e" : "#ef4444" },
                    ] as { label: string; value: string; color: string }[]).map((k, i) => (
                      <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{k.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {pendingRewards.length > 0 && (
                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>À traiter</div>
                        <span style={{ fontSize: 13, color: "#fff" }}>{pendingRewards.length} reward{pendingRewards.length !== 1 ? "s" : ""} en attente</span>
                        <span style={{ marginLeft: 12, fontSize: 20, fontWeight: 900, color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>€{pendingAmt.toLocaleString()}</span>
                      </div>
                      <button onClick={() => setFinanceView("rewards")}
                        style={{ padding: "8px 20px", background: "#f59e0b", border: "none", borderRadius: 8, color: "#000", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                        Traiter
                      </button>
                    </div>
                  )}

                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 20 }}>CA mensuel</div>
                    {monthlyRevenue.length === 0
                      ? <div style={{ color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 20, fontSize: 13 }}>Aucune donnée</div>
                      : <>
                          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", overflowX: "auto", paddingBottom: 8 }}>
                            {monthlyRevenue.map(m => (
                              <div key={m.month} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 52 }}>
                                <div style={{ fontSize: 10, color: "#22c55e", fontWeight: 700 }}>€{Math.round(m.ca / 1000)}k</div>
                                <div style={{ width: 38, backgroundColor: "#3b82f6", borderRadius: "4px 4px 0 0", height: Math.max(4, m.ca / maxCA * 120) }} title={`€${m.ca}`} />
                                {m.payoutsAmt > 0 && <div style={{ width: 38, backgroundColor: "#ef4444", borderRadius: "0 0 4px 4px", height: Math.max(2, m.payoutsAmt / maxCA * 120), marginTop: -4 }} title={`Rewards: €${m.payoutsAmt}`} />}
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>{m.month.slice(5)}/{m.month.slice(2, 4)}</div>
                                <div style={{ fontSize: 9, color: m.marge > 50 ? "#22c55e" : "rgba(255,255,255,0.3)" }}>{m.marge}%</div>
                              </div>
                            ))}
                          </div>
                          <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
                            <span style={{ fontSize: 10, color: "#3b82f6" }}>■ CA</span>
                            <span style={{ fontSize: 10, color: "#ef4444" }}>■ Rewards</span>
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>% marge</span>
                          </div>
                        </>}
                  </div>
                </div>
              )}

              {/* ─── REWARDS ─── */}
              {financeView === "rewards" && (() => {
                const filterDefs: Array<{ id: string; label: string; count: number; color: string }> = [
                  { id: "all",      label: "Tous",       count: payouts.length,                                       color: "#fff"    },
                  { id: "pending",  label: "En attente", count: pendingRewards.length,                                color: "#f59e0b" },
                  { id: "paid",     label: "Validés",    count: paidRewards.length,                                   color: "#22c55e" },
                  { id: "rejected", label: "Refusés",    count: payouts.filter(p => p.status === "rejected").length,  color: "#ef4444" },
                ];
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", gap: 3 }}>
                        {filterDefs.map(f => (
                          <button key={f.id} onClick={() => setRewardsFilter(f.id)}
                            style={{ padding: "6px 13px", background: rewardsFilter === f.id ? "#111" : "transparent", border: `1px solid ${rewardsFilter === f.id ? "rgba(255,255,255,0.12)" : "transparent"}`, borderRadius: 7, color: rewardsFilter === f.id ? f.color : "rgba(255,255,255,0.35)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            {f.label}{f.count > 0 ? ` (${f.count})` : ""}
                          </button>
                        ))}
                      </div>
                      <input placeholder="Recherche email..."
                        value={financeSearch} onChange={e => setFinanceSearch(e.target.value)}
                        style={{ flex: 1, maxWidth: 260, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "7px 12px", color: "#fff", fontSize: 12, outline: "none" }} />
                      {financeSearch && <button onClick={() => setFinanceSearch("")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", fontSize: 11, cursor: "pointer", padding: 0 }}>Effacer</button>}
                    </div>

                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                              {["Trader","Montant","Méthode","Statut","Date","Actions"].map(h => (
                                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rwList.map(p => {
                              const ch = challenges.find(c => c.id === p.challenge_id)
                                || challenges.filter(c => c.user_email === p.user_email && c.phase === "funded").sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                              const kyc = kycSubmissions.find(k => k.user_email === p.user_email);
                              const kycOk  = kyc?.kyc_status === "approved";
                              const isPend = p.status === "pending";
                              const mLabel = p.payment_method === "crypto" ? "Crypto" : p.payment_method === "bank" ? "Virement" : p.payment_method || "—";
                              return (
                                <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                  <td style={{ padding: "12px 16px", minWidth: 160 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{p.user_email}</div>
                                    {kyc && <div style={{ fontSize: 10, color: kycOk ? "#22c55e" : kyc.kyc_status === "rejected" ? "#ef4444" : "#f59e0b", marginTop: 2 }}>KYC {kycOk ? "Validé" : kyc.kyc_status === "rejected" ? "Refusé" : "En attente"}</div>}
                                    {ch && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginTop: 1 }}>MT5 {ch.mt5_login}</div>}
                                    {p.wallet_address && <div onClick={() => navigator.clipboard.writeText(p.wallet_address!)} style={{ fontSize: 10, color: "#60a5fa", fontFamily: "monospace", cursor: "pointer", marginTop: 1 }} title="Copier">{p.wallet_address.length > 16 ? p.wallet_address.slice(0,8) + "…" + p.wallet_address.slice(-6) : p.wallet_address}</div>}
                                  </td>
                                  <td style={{ padding: "12px 16px" }}>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: p.status === "paid" ? "#22c55e" : p.status === "rejected" ? "#ef4444" : "#fff", fontVariantNumeric: "tabular-nums" }}>€{p.amount?.toLocaleString()}</div>
                                  </td>
                                  <td style={{ padding: "12px 16px" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: p.payment_method === "crypto" ? "#f59e0b" : "rgba(255,255,255,0.4)" }}>{mLabel}</span>
                                  </td>
                                  <td style={{ padding: "12px 16px" }}>{badge(STATUS_LABELS[p.status] || p.status, STATUS_COLORS[p.status] || "#888")}</td>
                                  <td style={{ padding: "12px 16px", fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                                  <td style={{ padding: "12px 16px", minWidth: 140 }}>
                                    {isPend ? (
                                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                                        <button onClick={() => updatePayout(p.id, "paid")}
                                          style={{ padding: "6px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                          Valider
                                        </button>
                                        {ch?.mt5_login && (
                                          <button onClick={() => triggerMT5WithdrawFromPayout(ch!.mt5_login!, ch!.start_balance)}
                                            style={{ padding: "5px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, color: "rgba(255,255,255,0.45)", fontSize: 11, cursor: "pointer" }}>
                                            MT5
                                          </button>
                                        )}
                                        <div style={{ borderTop: "1px solid rgba(239,68,68,0.12)", paddingTop: 5, marginTop: 2 }}>
                                          <input value={payoutRejectReason[p.id] || ""}
                                            onChange={e => setPayoutRejectReason(r => ({ ...r, [p.id]: e.target.value }))}
                                            placeholder="Motif de refus..."
                                            style={{ width: "100%", background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 5, padding: "4px 8px", color: "#fff", fontSize: 10, outline: "none", boxSizing: "border-box", marginBottom: 3 }} />
                                          <button onClick={async () => {
                                            const reason = payoutRejectReason[p.id] || "";
                                            const res = await fetch("/api/admin/payouts", { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY }, body: JSON.stringify({ id: p.id, status: "rejected", rejection_reason: reason }) });
                                            const data = await res.json();
                                            if (res.ok) setPayouts(ps => ps.map(x => x.id === p.id ? { ...x, ...data } : x));
                                          }}
                                            style={{ width: "100%", padding: "4px 10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 5, color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>
                                            Refuser
                                          </button>
                                        </div>
                                      </div>
                                    ) : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>—</span>}
                                  </td>
                                </tr>
                              );
                            })}
                            {rwList.length === 0 && (
                              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>{financeSearch ? "Aucun résultat" : "Aucune récompense"}</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── TRANSACTIONS ─── */}
              {financeView === "transactions" && (() => {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input placeholder="Recherche email ou nom..."
                        value={financeSearch} onChange={e => setFinanceSearch(e.target.value)}
                        style={{ flex: 1, maxWidth: 320, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "8px 13px", color: "#fff", fontSize: 13, outline: "none" }} />
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{txList.length} transaction{txList.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 420 }}>
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                              {["Date","Trader","Produit","Montant","Méthode","Statut"].map(h => (
                                <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {txList.map(c => {
                              const mLabel = c.payment_method === "crypto" ? "Crypto" : c.payment_method === "card" || c.payment_method === "stripe" ? "Carte" : c.payment_method || "—";
                              const traderName = `${c.client_first_name || ""} ${c.client_last_name || ""}`.trim() || c.user_email;
                              return (
                                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                  <td style={{ padding: "12px 16px", fontSize: 12, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{new Date(c.created_at).toLocaleDateString("fr-FR")}</td>
                                  <td style={{ padding: "12px 16px" }}>
                                    <button onClick={() => { setTab("crm"); setCrmExpanded(c.user_email); }}
                                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>{traderName}</div>
                                      {traderName !== c.user_email && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{c.user_email}</div>}
                                    </button>
                                  </td>
                                  <td style={{ padding: "12px 16px" }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{c.account_size}</div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", marginTop: 1 }}>{c.model === "instant" ? "Instant" : c.model}</div>
                                  </td>
                                  <td style={{ padding: "12px 16px", fontWeight: 800, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>€{(c.amount_paid || 0).toLocaleString()}</td>
                                  <td style={{ padding: "12px 16px" }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: c.payment_method === "crypto" ? "#f59e0b" : "rgba(255,255,255,0.4)" }}>{mLabel}</span>
                                  </td>
                                  <td style={{ padding: "12px 16px" }}>{badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}</td>
                                </tr>
                              );
                            })}
                            {txList.length === 0 && (
                              <tr><td colSpan={6} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>{financeSearch ? "Aucun résultat" : "Aucune transaction"}</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── HISTORIQUE ─── */}
              {financeView === "historique" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
                        Registre des versements <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>({histList.length})</span>
                      </div>
                      <button onClick={exportCSV}
                        style={{ padding: "7px 16px", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", borderRadius: 8, color: "#60a5fa", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                        Export CSV
                      </button>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {["Référence","Date","Trader","Montant","Méthode","IBAN / Wallet","Justificatif"].map(h => (
                              <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {histList.map(p => {
                            const ref = `TR-${new Date(p.created_at).getFullYear()}-${p.id.slice(0,6).toUpperCase()}`;
                            const ch  = challenges.find(c => c.id === p.challenge_id);
                            const receiptUrl = `/payout-receipt?ref=${ref}&date=${new Date(p.created_at).toLocaleDateString("fr-FR")}&amount=${p.amount}&method=${p.payment_method||""}&email=${encodeURIComponent(p.user_email||"")}&size=${encodeURIComponent(ch?.account_size||"")}&login=${ch?.mt5_login||""}`;
                            return (
                              <tr key={p.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "11px 14px", fontWeight: 700, color: "rgba(255,255,255,0.5)", fontSize: 11, fontFamily: "monospace" }}>{ref}</td>
                                <td style={{ padding: "11px 14px", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                                <td style={{ padding: "11px 14px", fontSize: 12, color: "#fff" }}>{p.user_email}</td>
                                <td style={{ padding: "11px 14px", fontWeight: 800, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>€{p.amount?.toLocaleString()}</td>
                                <td style={{ padding: "11px 14px" }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: p.payment_method === "crypto" ? "#f59e0b" : "rgba(255,255,255,0.45)" }}>
                                    {p.payment_method === "crypto" ? "Crypto" : p.payment_method === "bank" ? "Virement" : p.payment_method || "—"}
                                  </span>
                                </td>
                                <td style={{ padding: "11px 14px", fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {p.wallet_address ? (p.wallet_address.length > 18 ? p.wallet_address.slice(0,10) + "…" + p.wallet_address.slice(-6) : p.wallet_address) : "—"}
                                </td>
                                <td style={{ padding: "11px 14px" }}>
                                  <a href={receiptUrl} target="_blank" rel="noreferrer"
                                    style={{ background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontWeight: 700, fontSize: 11, padding: "4px 10px", borderRadius: 7, border: "1px solid rgba(59,130,246,0.2)", textDecoration: "none" }}>
                                    PDF
                                  </a>
                                </td>
                              </tr>
                            );
                          })}
                          {histList.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Aucun versement</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Récapitulatif mensuel</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 380 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {["Mois","CA","Rewards versés","Ventes","Marge brute"].map(h => (
                              <th key={h} style={{ padding: "11px 14px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...monthlyRevenue].reverse().map(m => (
                            <tr key={m.month} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "11px 14px", fontWeight: 700, color: "#fff" }}>{m.month}</td>
                              <td style={{ padding: "11px 14px", color: "#22c55e", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>€{m.ca.toLocaleString()}</td>
                              <td style={{ padding: "11px 14px", color: "#ef4444", fontVariantNumeric: "tabular-nums" }}>€{m.payoutsAmt.toLocaleString()}</td>
                              <td style={{ padding: "11px 14px", color: "rgba(255,255,255,0.4)" }}>{m.count}</td>
                              <td style={{ padding: "11px 14px", fontWeight: 800, color: m.marge > 50 ? "#22c55e" : "#ef4444", fontVariantNumeric: "tabular-nums" }}>€{(m.ca - m.payoutsAmt).toLocaleString()} <span style={{ fontWeight: 400, fontSize: 11 }}>({m.marge}%)</span></td>
                            </tr>
                          ))}
                          {monthlyRevenue.length === 0 && <tr><td colSpan={5} style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Aucune donnée</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })()}


        {/* ══ MARKETING HUB ══ */}
        {(tab === "promos" || tab === "affilies") && (() => {
          const now = new Date();
          const activePromos = promos.filter(p => {
            const isExp = p.expires_at && new Date(p.expires_at) < now;
            const isExh = p.max_uses !== null && p.used_count >= p.max_uses;
            return p.active && !isExp && !isExh;
          });
          const activeAffiliates = affiliates.filter(a => a.referrals.length > 0);
          const totalConversions = affiliates.reduce((s, a) => s + a.referrals.length, 0);
          const totalCommissions = affiliates.reduce((s, a) => s + a.referrals.reduce((ss, r) => ss + (r.commission_amount || 0), 0), 0);
          const topAffiliates = [...affiliates].sort((a, b) => b.referrals.length - a.referrals.length).slice(0, 5);

          const affiliatesFiltered = affiliates.filter(a => {
            const q = marketingSearch.trim().toLowerCase();
            if (!q) return true;
            return (a.email || "").toLowerCase().includes(q)
              || `${a.first_name || ""} ${a.last_name || ""}`.toLowerCase().includes(q)
              || a.code.toLowerCase().includes(q);
          });

          const hubViews = [
            { id: "overview",    label: "Vue d'ensemble" },
            { id: "promotions",  label: "Promotions"     },
            { id: "affilies",    label: "Affiliés"       },
            { id: "campagnes",   label: "Campagnes"      },
            { id: "emails",      label: "Emails"         },
            { id: "segments",    label: "Segments"       },
            { id: "acquisition", label: "Acquisition"    },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* En-tête */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Marketing</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Affiliation, promotions et acquisition</div>
              </div>

              {/* Sous-navigation */}
              <div style={{ display: "flex", gap: 2, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 4, overflowX: "auto" }}>
                {hubViews.map(v => (
                  <button key={v.id} onClick={() => setMarketingView(v.id)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: marketingView === v.id ? "#111" : "transparent", border: `1px solid ${marketingView === v.id ? "rgba(255,255,255,0.1)" : "transparent"}`, borderRadius: 7, color: marketingView === v.id ? "#fff" : "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: marketingView === v.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {v.label}
                    {v.id === "promotions" && activePromos.length > 0 && <span style={{ background: "#22c55e", color: "#000", fontSize: 10, fontWeight: 900, padding: "1px 5px", borderRadius: 10, lineHeight: 1.4 }}>{activePromos.length}</span>}
                    {v.id === "affilies"   && activeAffiliates.length > 0 && <span style={{ background: "#3b82f6", color: "#fff", fontSize: 10, fontWeight: 900, padding: "1px 5px", borderRadius: 10, lineHeight: 1.4 }}>{activeAffiliates.length}</span>}
                  </button>
                ))}
              </div>

              {/* ─── VUE D'ENSEMBLE ─── */}
              {marketingView === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {([
                      { label: "Affiliés actifs",      value: String(activeAffiliates.length),                        color: "#fff"    },
                      { label: "Codes actifs",          value: String(activePromos.length),                            color: "#22c55e" },
                      { label: "Conversions totales",   value: String(totalConversions),                               color: "#3b82f6" },
                      { label: "Commissions générées",  value: `€${totalCommissions.toLocaleString()}`,                color: "#f59e0b" },
                    ] as { label: string; value: string; color: string }[]).map((k, i) => (
                      <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{k.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Top affiliés</div>
                        <button onClick={() => setMarketingView("affilies")} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", padding: 0 }}>Voir tous</button>
                      </div>
                      {!affiliatesLoaded
                        ? <div style={{ padding: "28px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Chargement...</div>
                        : topAffiliates.length === 0
                          ? <div style={{ padding: "28px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Aucun affilié actif</div>
                          : topAffiliates.map((a, i) => {
                              const comm = a.referrals.reduce((s, r) => s + (r.commission_amount || 0), 0);
                              return (
                                <div key={a.id} style={{ padding: "12px 20px", borderBottom: i < topAffiliates.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                                  <div style={{ width: 22, height: 22, background: "rgba(255,255,255,0.06)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", flexShrink: 0 }}>{i + 1}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {a.first_name || a.last_name ? `${a.first_name || ""} ${a.last_name || ""}`.trim() : a.email || a.user_id.slice(0, 12) + "…"}
                                    </div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{a.code}</div>
                                  </div>
                                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 800, color: "#3b82f6" }}>{a.referrals.length} conv.</div>
                                    <div style={{ fontSize: 10, color: "#f59e0b" }}>€{comm.toLocaleString()}</div>
                                  </div>
                                </div>
                              );
                            })}
                    </div>
                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Promotions actives</div>
                        <button onClick={() => setMarketingView("promotions")} style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", padding: 0 }}>Voir toutes</button>
                      </div>
                      {promosLoading
                        ? <div style={{ padding: "28px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Chargement...</div>
                        : activePromos.length === 0
                          ? <div style={{ padding: "28px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Aucune promotion active</div>
                          : activePromos.slice(0, 5).map((p, i) => (
                              <div key={p.id} style={{ padding: "12px 20px", borderBottom: i < Math.min(5, activePromos.length) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{p.code}</div>
                                  <div style={{ fontSize: 10, color: "#22c55e", marginTop: 1 }}>-{p.discount_percent}%</div>
                                </div>
                                <div style={{ textAlign: "right", flexShrink: 0 }}>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{p.used_count} util.</div>
                                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.max_uses ? `max ${p.max_uses}` : "illimité"}</div>
                                </div>
                              </div>
                            ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ─── PROMOTIONS — cockpit vers le Promotion Builder ─── */}
              {marketingView === "promotions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Cockpit card */}
                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Promotion Builder</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", maxWidth: 420, lineHeight: 1.6 }}>
                        Créez, éditez et gérez les codes promo depuis le Builder dédié.
                        Ciblage produits, affiliation, planification et historique d'usage inclus.
                      </div>
                      <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Codes actifs</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>{activePromos.length}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>Total codes</div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{promos.length}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>
                      <a href="/x8k3pz/promotions" style={{
                        display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "10px 22px", background: "#3B82F6", border: "none",
                        borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700,
                        textDecoration: "none", whiteSpace: "nowrap",
                      }}>
                        Ouvrir le Builder
                      </a>
                      <a href="/x8k3pz/promotions/new" style={{
                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                        padding: "9px 22px", background: "transparent",
                        border: "1px solid rgba(59,130,246,0.3)",
                        borderRadius: 8, color: "#60a5fa", fontSize: 12, fontWeight: 600,
                        textDecoration: "none", whiteSpace: "nowrap",
                      }}>
                        + Nouveau code
                      </a>
                    </div>
                  </div>

                  {/* Quick list — 5 codes actifs */}
                  {activePromos.length > 0 && (
                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.45)" }}>Codes actifs récents</div>
                        <a href="/x8k3pz/promotions" style={{ background: "none", border: "none", color: "#60a5fa", fontSize: 12, cursor: "pointer", textDecoration: "none" }}>Voir tous</a>
                      </div>
                      {activePromos.slice(0, 5).map((p, i) => (
                        <a key={p.id} href={`/x8k3pz/promotions/${p.id}`} style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                          borderBottom: i < Math.min(5, activePromos.length) - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                          textDecoration: "none",
                        }}
                          onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontFamily: "monospace" }}>{p.code}</div>
                            <div style={{ fontSize: 10, color: "#22c55e", marginTop: 1 }}>-{p.discount_percent}%</div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{p.used_count} util.</div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{p.max_uses ? `max ${p.max_uses}` : "illimité"}</div>
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── AFFILIÉS ─── */}
              {marketingView === "affilies" && (() => {
                const pendingTotal = affiliates.reduce((s, a) => s + a.referrals.filter(r => r.status === "pending").reduce((ss, r) => ss + (r.commission_amount || 0), 0), 0);
                const paidTotal    = affiliates.reduce((s, a) => s + (a.total_paid || 0), 0);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                      {([
                        { label: "Total affiliés",         value: String(affiliates.length),          color: "#fff"    },
                        { label: "Total conversions",      value: String(totalConversions),            color: "#3b82f6" },
                        { label: "Commissions en attente", value: `€${pendingTotal.toLocaleString()}`, color: "#f59e0b" },
                        { label: "Commissions payées",     value: `€${paidTotal.toLocaleString()}`,   color: "#22c55e" },
                      ] as { label: string; value: string; color: string }[]).map((k, i) => (
                        <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>{k.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      <input placeholder="Recherche email, nom ou code..." value={marketingSearch} onChange={e => setMarketingSearch(e.target.value)}
                        style={{ flex: 1, maxWidth: 340, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "8px 13px", color: "#fff", fontSize: 13, outline: "none" }} />
                      <a href="/partenariat" target="_blank" style={{ fontSize: 12, color: "#60a5fa", textDecoration: "none", flexShrink: 0 }}>Page partenariat</a>
                    </div>

                    {affiliateMsg && (
                      <div style={{ color: affiliateMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 700, padding: "10px 16px", background: affiliateMsg.startsWith("✓") ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", borderRadius: 8, border: `1px solid ${affiliateMsg.startsWith("✓") ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}` }}>
                        {affiliateMsg}
                      </div>
                    )}

                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      {!affiliatesLoaded ? (
                        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Chargement...</div>
                      ) : affiliatesFiltered.length === 0 ? (
                        <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                          {marketingSearch ? "Aucun résultat" : "Aucun affilié"}
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          {affiliatesFiltered.map(a => {
                            const isOpen       = affiliateExpanded === a.id;
                            const pending      = a.referrals.filter(r => r.status === "pending").reduce((s, r) => s + (r.commission_amount || 0), 0);
                            const earned       = a.referrals.reduce((s, r) => s + (r.commission_amount || 0), 0);
                            const tierLabel    = a.commission_rate >= 20 ? "Elite" : a.commission_rate >= 15 ? "Partenaire" : "Débutant";
                            const tierColor    = a.commission_rate >= 20 ? "#60a5fa" : a.commission_rate >= 15 ? "#60a5fa" : "#6b7280";
                            const linkedPromos = promos.filter(p => p.affiliate_user_id === a.user_id);
                            return (
                              <div key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <div onClick={() => setAffiliateExpanded(isOpen ? null : a.id)}
                                  style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", flexWrap: "wrap" }}>
                                  <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: "#fff", marginBottom: 2 }}>
                                      {a.first_name || a.last_name ? `${a.first_name || ""} ${a.last_name || ""}`.trim() : a.email || a.user_id.slice(0, 12) + "…"}
                                    </div>
                                    {a.email && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>{a.email}</div>}
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                      <code style={{ fontSize: 12, background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 6, color: "#fff", fontWeight: 700 }}>{a.code}</code>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: tierColor, background: `${tierColor}18`, padding: "2px 8px", borderRadius: 100 }}>{tierLabel}</span>
                                    </div>
                                  </div>
                                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13 }}>
                                    {([
                                      { label: "Taux",        val: `${a.commission_rate}%`,           color: tierColor },
                                      { label: "Conversions", val: String(a.referrals.length),         color: "#fff"    },
                                      { label: "En attente",  val: `€${pending.toLocaleString()}`,     color: "#f59e0b" },
                                      { label: "Total gagné", val: `€${earned.toLocaleString()}`,      color: "#22c55e" },
                                    ] as { label: string; val: string; color: string }[]).map(m => (
                                      <div key={m.label} style={{ textAlign: "center" }}>
                                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>{m.label}</div>
                                        <div style={{ fontWeight: 800, color: m.color }}>{m.val}</div>
                                      </div>
                                    ))}
                                  </div>
                                  <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "center" }}>
                                    <button onClick={e => { e.stopPropagation(); setAffiliatePromoForm({ affiliateId: a.id, userId: a.user_id }); setAffiliatePromoData({ code: `${a.code}10`, discount: "10", maxUses: "" }); }}
                                      style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa", borderRadius: 6, padding: "5px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Promo</button>
                                    <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 14 }}>{isOpen ? "▲" : "▼"}</span>
                                  </div>
                                </div>

                                {affiliatePromoForm?.affiliateId === a.id && (
                                  <div style={{ margin: "0 20px 16px", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "16px 20px" }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 12 }}>Créer un code promo pour cet affilié</div>
                                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                                      <div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Code</div>
                                        <input value={affiliatePromoData.code} onChange={e => setAffiliatePromoData(d => ({ ...d, code: e.target.value.toUpperCase() }))} placeholder="PARTENAIRE10"
                                          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#fff", outline: "none", width: 140 }} />
                                      </div>
                                      <div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Remise %</div>
                                        <input type="number" value={affiliatePromoData.discount} onChange={e => setAffiliatePromoData(d => ({ ...d, discount: e.target.value }))} min={1} max={100}
                                          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#fff", outline: "none", width: 80 }} />
                                      </div>
                                      <div>
                                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Max utilisations</div>
                                        <input type="number" value={affiliatePromoData.maxUses} onChange={e => setAffiliatePromoData(d => ({ ...d, maxUses: e.target.value }))} placeholder="illimité"
                                          style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "7px 12px", fontSize: 13, color: "#fff", outline: "none", width: 100 }} />
                                      </div>
                                      <button onClick={createAffiliatePromo}
                                        style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Créer</button>
                                      <button onClick={() => setAffiliatePromoForm(null)}
                                        style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                                    </div>
                                  </div>
                                )}

                                {isOpen && (
                                  <div style={{ margin: "0 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                                    <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px" }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Taux de commission</div>
                                      {rateEditId === a.id ? (
                                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                          <input type="number" value={rateEditValue} onChange={e => setRateEditValue(e.target.value)} min={5} max={50} step={5}
                                            style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 14, fontWeight: 800, outline: "none", width: 80 }} />
                                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>%</span>
                                          <button onClick={() => updateCommissionRate(a.id, Number(rateEditValue))}
                                            style={{ padding: "6px 14px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 6, color: "#22c55e", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Sauvegarder</button>
                                          <button onClick={() => setRateEditId(null)}
                                            style={{ padding: "6px 12px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                                        </div>
                                      ) : (
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                          <span style={{ fontSize: 20, fontWeight: 900, color: tierColor }}>{a.commission_rate}%</span>
                                          <span style={{ fontSize: 11, fontWeight: 700, color: tierColor, background: `${tierColor}18`, padding: "2px 8px", borderRadius: 100 }}>{tierLabel}</span>
                                          <button onClick={() => { setRateEditId(a.id); setRateEditValue(String(a.commission_rate)); }}
                                            style={{ padding: "4px 10px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.45)", fontSize: 11, cursor: "pointer" }}>Modifier</button>
                                        </div>
                                      )}
                                    </div>

                                    {linkedPromos.length > 0 && (
                                      <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px" }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Codes promo liés ({linkedPromos.length})</div>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                          {linkedPromos.map(lp => {
                                            const expLp = lp.expires_at && new Date(lp.expires_at) < now;
                                            const exhLp = lp.max_uses !== null && lp.used_count >= lp.max_uses;
                                            return (
                                              <div key={lp.id} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "6px 12px" }}>
                                                <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: "#fff" }}>{lp.code}</div>
                                                <div style={{ fontSize: 10, color: "#22c55e", marginTop: 2 }}>-{lp.discount_percent}% · {lp.used_count} util.{lp.max_uses ? ` / ${lp.max_uses}` : ""}</div>
                                                {(expLp || exhLp || !lp.active) && <div style={{ fontSize: 9, color: "#ef4444", marginTop: 2 }}>Inactif</div>}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, overflow: "hidden" }}>
                                      <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                                        Referrals <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.3)" }}>({a.referrals.length})</span>
                                      </div>
                                      {a.referrals.length === 0 ? (
                                        <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Aucune conversion</div>
                                      ) : (
                                        <div style={{ overflowX: "auto" }}>
                                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 440 }}>
                                            <thead>
                                              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                                {["Trader","Achat","Commission","Statut","Date","Action"].map(h => (
                                                  <th key={h} style={{ padding: "9px 14px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                                                ))}
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {a.referrals.map(r => {
                                                const rProfile = profiles.find(p => p.user_id === r.referred_user_id);
                                                const rEmail   = rProfile?.email || r.referred_user_id.slice(0, 14) + "…";
                                                return (
                                                  <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                                    <td style={{ padding: "9px 14px", fontSize: 12, color: "#fff" }}>{rEmail}</td>
                                                    <td style={{ padding: "9px 14px", fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>€{((r.purchase_amount || 0) / 100).toLocaleString()}</td>
                                                    <td style={{ padding: "9px 14px", fontWeight: 800, color: "#60a5fa", fontVariantNumeric: "tabular-nums" }}>€{((r.commission_amount || 0) / 100).toLocaleString()}</td>
                                                    <td style={{ padding: "9px 14px" }}>
                                                      <span style={{ background: r.status === "paid" ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.1)", color: r.status === "paid" ? "#22c55e" : "#f59e0b", padding: "2px 8px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                                                        {r.status === "paid" ? "Payé" : "En attente"}
                                                      </span>
                                                    </td>
                                                    <td style={{ padding: "9px 14px", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                                                    <td style={{ padding: "9px 14px" }}>
                                                      {r.status === "pending" && (
                                                        <button onClick={() => payCommission(r.id)}
                                                          style={{ padding: "4px 10px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 6, color: "#22c55e", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Marquer payé</button>
                                                      )}
                                                    </td>
                                                  </tr>
                                                );
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
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
                );
              })()}

              {/* ─── CAMPAGNES ─── */}
              {marketingView === "campagnes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Campagnes Marketing</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7, maxWidth: 580 }}>
                      Disponible en Phase 3. Les campagnes permettront de piloter promotions, emails, notifications, landing pages et automatisations depuis un cockpit unifié.
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    {["Promotions ciblées","Emails","Notifications","Landing Pages","Automatisations"].map(item => (
                      <div key={item} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "22px 22px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{item}</div>
                        <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 8px" }}>Phase 3</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── EMAILS ─── */}
              {marketingView === "emails" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Email Marketing</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Infrastructure en cours de déploiement — disponible en Phase 3.</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    {["Templates","Séquences","Emails automatiques","Emails manuels","Historique"].map(item => (
                      <div key={item} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "22px 22px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 10 }}>{item}</div>
                        <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 8px" }}>Disponible en Phase 3</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── SEGMENTS ─── */}
              {marketingView === "segments" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Segments</div>
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Segmentation dynamique de votre base trader — disponible en Phase 3.</div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                    {["Tous les traders","Challenges actifs","Comptes certifiés","Challenges échoués","Clients VIP","Paiement Stripe","Paiement Crypto","France","Belgique","Jamais acheté"].map(seg => (
                      <div key={seg} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{seg}</div>
                        <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.2, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "3px 8px" }}>Coming Soon</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── ACQUISITION ─── */}
              {marketingView === "acquisition" && (() => {
                const refCount    = affiliates.reduce((s, a) => s + a.referrals.length, 0);
                const directCount = Math.max(0, challenges.filter(c => c.amount_paid && c.amount_paid > 0).length - refCount);
                const refCA       = affiliates.reduce((s, a) => s + a.referrals.reduce((ss, r) => ss + (r.purchase_amount || 0), 0), 0) / 100;
                const stripeCount = challenges.filter(c => c.payment_method === "stripe" || c.payment_method === "card").length;
                const cryptoCount = challenges.filter(c => c.payment_method === "crypto").length;
                const totalPurch  = Math.max(1, challenges.filter(c => c.amount_paid && c.amount_paid > 0).length);
                const topByCA     = [...affiliates].sort((a, b) => {
                  const caA = a.referrals.reduce((s, r) => s + (r.purchase_amount || 0), 0);
                  const caB = b.referrals.reduce((s, r) => s + (r.purchase_amount || 0), 0);
                  return caB - caA;
                }).slice(0, 8);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Acquisition</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Données réelles — basées sur les achats et conversions affiliées enregistrées.</div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 }}>Répartition des ventes</div>
                        {([
                          { label: "Directes",    count: directCount, color: "#3b82f6", pct: Math.round(directCount / totalPurch * 100) },
                          { label: "Via affilié", count: refCount,    color: "#f59e0b", pct: Math.round(refCount    / totalPurch * 100) },
                        ] as { label: string; count: number; color: string; pct: number }[]).map(row => (
                          <div key={row.label} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{row.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: row.color }}>{row.count} ventes</span>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${row.pct}%`, background: row.color, borderRadius: 4, height: 6 }} />
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{row.pct}% du total</div>
                          </div>
                        ))}
                        {refCA > 0 && <div style={{ fontSize: 12, color: "#f59e0b", marginTop: 8 }}>CA référé : €{refCA.toLocaleString()}</div>}
                      </div>

                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 }}>Méthodes de paiement</div>
                        {([
                          { label: "Stripe / Carte", count: stripeCount, color: "#3b82f6" },
                          { label: "Crypto",          count: cryptoCount, color: "#f59e0b" },
                          ...(totalPurch - stripeCount - cryptoCount > 0 ? [{ label: "Autre", count: totalPurch - stripeCount - cryptoCount, color: "#6b7280" }] : []),
                        ] as { label: string; count: number; color: string }[]).map(row => (
                          <div key={row.label} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{row.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: row.color }}>{row.count} ventes</span>
                            </div>
                            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6 }}>
                              <div style={{ width: `${Math.round(row.count / totalPurch * 100)}%`, background: row.color, borderRadius: 4, height: 6 }} />
                            </div>
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{Math.round(row.count / totalPurch * 100)}% du total</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {topByCA.length > 0 && (
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Top affiliés par CA référé</div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 400 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                {["Affilié","Code","Conversions","CA référé","Commissions"].map(h => (
                                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {topByCA.map(a => {
                                const ca   = a.referrals.reduce((s, r) => s + (r.purchase_amount   || 0), 0) / 100;
                                const comm = a.referrals.reduce((s, r) => s + (r.commission_amount || 0), 0) / 100;
                                return (
                                  <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                    <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                                      {a.first_name || a.last_name ? `${a.first_name || ""} ${a.last_name || ""}`.trim() : a.email || a.user_id.slice(0, 12) + "…"}
                                    </td>
                                    <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{a.code}</td>
                                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "#3b82f6" }}>{a.referrals.length}</td>
                                    <td style={{ padding: "10px 16px", fontWeight: 800, color: "#22c55e", fontVariantNumeric: "tabular-nums" }}>€{ca.toLocaleString()}</td>
                                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "#f59e0b", fontVariantNumeric: "tabular-nums" }}>€{comm.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 18px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>Données non disponibles</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.22)", lineHeight: 1.7 }}>
                        UTM source / medium / campaign · Codes promo par challenge · Attribution first-touch · Entonnoir multi-étapes<br />
                        <span style={{ color: "rgba(255,255,255,0.15)" }}>Disponible lors de la Phase Analytics.</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>
          );
        })()}
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
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.value}</div>
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


        {/* ══ STATISTIQUES ══ */}
        {/* ══ ANALYTICS HUB ══ */}
        {tab === "stats" && (() => {
          const now   = new Date();
          const yr    = now.getFullYear();
          const mo    = now.getMonth();
          const isPurchase = (c: Challenge) => c.phase === "phase1" || c.model === "instant";
          const is1Step    = (m: string) => m?.toLowerCase().replace(/[\s-]/g, "").includes("1step");
          const inMonth    = (d: string) => { const dt = new Date(d); return dt.getFullYear() === yr && dt.getMonth() === mo; };
          const inYear     = (d: string) => new Date(d).getFullYear() === yr;

          // ── Business
          const salesThisMonth = challenges.filter(c => inMonth(c.created_at) && isPurchase(c)).length;
          const salesThisYear  = challenges.filter(c => inYear(c.created_at)  && isPurchase(c)).length;
          const avgBasket      = salesThisMonth > 0 ? Math.round(kpis.caMonth / salesThisMonth) : 0;
          const totalCAPurch   = challenges.filter(isPurchase).reduce((s, c) => s + (c.amount_paid || 0), 0);
          const caByCrypto     = challenges.filter(c => c.payment_method === "crypto").reduce((s, c) => s + (c.amount_paid || 0), 0);
          const caByCard       = totalCAPurch - caByCrypto;
          const countByCrypto  = challenges.filter(c => c.payment_method === "crypto").length;
          const countByCard    = challenges.filter(c => !c.payment_method || c.payment_method === "card").length;
          const cryptoPct      = totalCAPurch > 0 ? Math.round(caByCrypto / totalCAPurch * 100) : 0;

          // ── Previous month comparison
          const prevDate  = new Date(yr, mo - 1, 1);
          const prevKey   = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
          const prevMonth = monthlyRevenue.find(m => m.month === prevKey);
          const caGrowth  = prevMonth && prevMonth.ca > 0 ? Math.round((kpis.caMonth - prevMonth.ca) / prevMonth.ca * 100) : null;

          // ── Challenges
          const total       = challenges.length;
          const totalActive = challenges.filter(c => c.status === "active").length;
          const totalCert   = challenges.filter(c => c.status === "funded").length;
          const totalFailed = challenges.filter(c => c.status === "failed").length;
          const t1Count     = challenges.filter(c => is1Step(c.model)).length;
          const t2Count     = challenges.filter(c => !is1Step(c.model)).length;
          const pct = (n: number, d = total) => d > 0 ? Math.round(n / d * 100) : 0;

          // ── Traders
          const countryMap = new Map<string, number>();
          profiles.forEach(p => { if (p.country) countryMap.set(p.country, (countryMap.get(p.country) || 0) + 1); });
          const topCountries = Array.from(countryMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
          const certifiedTraders = new Set(challenges.filter(c => c.status === "funded").map(c => c.user_email)).size;
          const avgChallenges = traderCRM.length > 0 ? (challenges.length / traderCRM.length).toFixed(1) : "0";

          // ── Marketing
          const activePromos = promos.filter(p => {
            const isExp = p.expires_at && new Date(p.expires_at) < now;
            const isExh = p.max_uses !== null && p.used_count >= p.max_uses;
            return p.active && !isExp && !isExh;
          });
          const totalConversions = affiliates.reduce((s, a) => s + a.referrals.length, 0);
          const affiliateCA      = affiliates.reduce((s, a) => s + a.referrals.reduce((ss, r) => ss + (r.purchase_amount || 0), 0), 0) / 100;
          const topAffiliates    = [...affiliates].sort((a, b) => b.referrals.length - a.referrals.length).slice(0, 5);
          const topPromos        = [...promos].sort((a, b) => b.used_count - a.used_count).slice(0, 5);
          const directCount      = Math.max(0, salesThisYear - totalConversions);

          // ── Risques
          const riskAccounts = challenges.filter(c => {
            if (c.status !== "active" || !c.start_balance || !c.balance) return false;
            return (c.start_balance - c.balance) / c.start_balance * 100 >= (c.total_drawdown_limit || 10) * 0.75;
          }).sort((a, b) => {
            const ddA = a.start_balance > 0 ? (a.start_balance - a.balance) / a.start_balance * 100 : 0;
            const ddB = b.start_balance > 0 ? (b.start_balance - b.balance) / b.start_balance * 100 : 0;
            return ddB - ddA;
          });
          const kycPending  = kycSubmissions.filter(k => k.kyc_status === "pending").length;
          const pendingRw   = payouts.filter(p => p.status === "pending").length;
          const breached    = challenges.filter(c => c.status === "failed" && !!c.breach_reason).length;
          const totalAlert  = riskAccounts.length + kycPending + pendingRw;

          // ── Insights
          const insights = [
            caGrowth !== null
              ? { text: caGrowth >= 0 ? `Le CA progresse de +${caGrowth}% par rapport au mois précédent.` : `Le CA recule de ${Math.abs(caGrowth)}% par rapport au mois précédent.`, ok: caGrowth >= 0 }
              : null,
            cryptoPct > 0
              ? { text: `Les ventes Crypto représentent ${cryptoPct}% du CA total.`, ok: true }
              : null,
            byAccountSize.length > 0
              ? { text: `Le produit le plus vendu : ${[...byAccountSize].sort((a, b) => b.count - a.count)[0]?.size} (${[...byAccountSize].sort((a, b) => b.count - a.count)[0]?.count} ventes).`, ok: true }
              : null,
            totalConversions > 0
              ? { text: `Les affiliés ont généré ${totalConversions} conversion${totalConversions > 1 ? "s" : ""} au total.`, ok: true }
              : null,
            kpis.pendingPayouts > 0
              ? { text: `${kpis.pendingPayouts} reward${kpis.pendingPayouts > 1 ? "s" : ""} en attente — €${Math.round(kpis.pendingAmt).toLocaleString()} à valider.`, ok: false }
              : null,
          ].filter((x): x is { text: string; ok: boolean } => x !== null);

          // ── Helpers
          const PBar = ({ value, max, color = "#3b82f6" }: { value: number; max: number; color?: string }) => (
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
              <div style={{ width: `${max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0}%`, background: color, borderRadius: 4, height: 6 }} />
            </div>
          );

          const analyticsViews = [
            { id: "overview",   label: "Overview"   },
            { id: "business",   label: "Business"   },
            { id: "challenges", label: "Challenges" },
            { id: "traders",    label: "Traders"    },
            { id: "marketing",  label: "Marketing"  },
            { id: "risques",    label: "Risques",   alert: totalAlert },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* En-tête */}
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>Analytics</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>Centre de pilotage — Traders Rewards</div>
              </div>

              {/* Sous-navigation */}
              <div style={{ display: "flex", gap: 2, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 4, overflowX: "auto" }}>
                {analyticsViews.map(v => (
                  <button key={v.id} onClick={() => setAnalyticsView(v.id)}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: analyticsView === v.id ? "#111" : "transparent", border: `1px solid ${analyticsView === v.id ? "rgba(255,255,255,0.1)" : "transparent"}`, borderRadius: 7, color: analyticsView === v.id ? "#fff" : "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: analyticsView === v.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {v.label}
                    {v.alert && v.alert > 0 && <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 900, padding: "1px 5px", borderRadius: 10, lineHeight: 1.4 }}>{v.alert}</span>}
                  </button>
                ))}
              </div>

              {/* ─── OVERVIEW ─── */}
              {analyticsView === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {([
                      { label: "CA du mois",        value: `€${Math.round(kpis.caMonth).toLocaleString()}`,  color: "#fff"    },
                      { label: "Marge du mois",     value: `${kpis.margeMonth}%`,                            color: kpis.margeMonth >= 60 ? "#22c55e" : "#f59e0b" },
                      { label: "Challenges actifs", value: String(totalActive),                               color: "#22c55e" },
                      { label: "Rewards en attente",value: String(kpis.pendingPayouts),                      color: kpis.pendingPayouts > 0 ? "#f59e0b" : "#6b7280" },
                    ] as { label: string; value: string; color: string }[]).map((k, i) => (
                      <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{k.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 16 }}>Insights</div>
                    {insights.length === 0 ? (
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)" }}>Données insuffisantes pour générer des insights.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {insights.map((ins, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 16px", background: "#111", borderRadius: 8, border: `1px solid ${ins.ok ? "rgba(34,197,94,0.1)" : "rgba(245,158,11,0.15)"}` }}>
                            <div style={{ width: 6, height: 6, borderRadius: 3, background: ins.ok ? "#22c55e" : "#f59e0b", flexShrink: 0, marginTop: 5 }} />
                            <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.5 }}>{ins.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                    {([
                      { label: "CA annuel",         value: `€${Math.round(kpis.caYear).toLocaleString()}`,  color: "#fff"    },
                      { label: "Traders uniques",   value: String(kpis.totalTraders),                        color: "#3b82f6" },
                      { label: "Certifiés",         value: String(totalCert),                                 color: "#60a5fa" },
                      { label: "Échoués",           value: String(totalFailed),                               color: "#ef4444" },
                      { label: "LTV moyenne",       value: `€${Math.round(kpis.ltv).toLocaleString()}`,      color: "#f59e0b" },
                      { label: "KYC en attente",    value: String(kycPending),                                color: kycPending > 0 ? "#f59e0b" : "#6b7280" },
                    ] as { label: string; value: string; color: string }[]).map((k, i) => (
                      <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 18px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>{k.label}</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── BUSINESS ─── */}
              {analyticsView === "business" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {([
                      { label: "CA du mois",     value: `€${Math.round(kpis.caMonth).toLocaleString()}`,  color: "#fff"    },
                      { label: "CA de l'année",  value: `€${Math.round(kpis.caYear).toLocaleString()}`,   color: "#fff"    },
                      { label: "Marge du mois",  value: `${kpis.margeMonth}%`,                            color: kpis.margeMonth >= 60 ? "#22c55e" : "#f59e0b" },
                      { label: "Marge annuelle", value: `${kpis.margeYear}%`,                             color: kpis.margeYear >= 60 ? "#22c55e" : "#f59e0b" },
                      { label: "Panier moyen",   value: avgBasket > 0 ? `€${avgBasket}` : "—",           color: "#3b82f6" },
                      { label: "Ventes ce mois", value: String(salesThisMonth),                            color: "#3b82f6" },
                    ] as { label: string; value: string; color: string }[]).map((k, i) => (
                      <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{k.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                      </div>
                    ))}
                  </div>

                  {monthlyRevenue.length > 0 && (() => {
                    const last12 = monthlyRevenue.slice(-12);
                    const maxCA  = Math.max(...last12.map(m => m.ca), 1);
                    const curKey = `${yr}-${String(mo + 1).padStart(2, "0")}`;
                    return (
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Chiffre d'affaires mensuel</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
                          {last12.map(m => {
                            const h = Math.max(2, Math.round(m.ca / maxCA * 100));
                            const isCur = m.month === curKey;
                            return (
                              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" }}>
                                  {m.ca >= 1000 ? `€${Math.round(m.ca / 1000)}k` : `€${Math.round(m.ca)}`}
                                </div>
                                <div style={{ width: "100%", flex: `0 0 ${h}%`, background: isCur ? "#3b82f6" : "rgba(59,130,246,0.35)", borderRadius: "3px 3px 0 0" }} />
                                <div style={{ fontSize: 9, color: isCur ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: isCur ? 700 : 400 }}>
                                  {m.month.slice(5, 7)}/{m.month.slice(2, 4)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {monthlyRevenue.length > 0 && (() => {
                    const last12 = monthlyRevenue.slice(-12);
                    const curKey = `${yr}-${String(mo + 1).padStart(2, "0")}`;
                    return (
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 20 }}>Marge mensuelle (%)</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100 }}>
                          {last12.map(m => {
                            const h = Math.max(2, Math.min(100, m.marge));
                            const isCur = m.month === curKey;
                            const col = m.marge >= 60 ? "#22c55e" : m.marge >= 30 ? "#f59e0b" : "#ef4444";
                            return (
                              <div key={m.month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{m.marge}%</div>
                                <div style={{ width: "100%", flex: `0 0 ${h}%`, background: isCur ? col : `${col}55`, borderRadius: "3px 3px 0 0" }} />
                                <div style={{ fontSize: 9, color: isCur ? "#fff" : "rgba(255,255,255,0.3)", fontWeight: isCur ? 700 : 400 }}>
                                  {m.month.slice(5, 7)}/{m.month.slice(2, 4)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Méthodes de paiement</div>
                    {([
                      { label: "Stripe / Carte", amount: caByCard,   count: countByCard,   color: "#3b82f6" },
                      { label: "Crypto",          amount: caByCrypto, count: countByCrypto, color: "#f59e0b" },
                    ] as { label: string; amount: number; count: number; color: string }[]).map(row => (
                      <div key={row.label} style={{ marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{row.label}</span>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: row.color }}>€{Math.round(row.amount).toLocaleString()}</span>
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 8 }}>{row.count} ventes</span>
                          </div>
                        </div>
                        <PBar value={row.amount} max={totalCAPurch} color={row.color} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── CHALLENGES ─── */}
              {analyticsView === "challenges" && (() => {
                const maxBySizeCount = Math.max(...byAccountSize.map(b => b.count), 1);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                      {([
                        { label: "Total",      value: String(total),        color: "#fff"    },
                        { label: "Actifs",     value: String(totalActive),   color: "#22c55e" },
                        { label: "Certifiés",  value: String(totalCert),     color: "#3b82f6" },
                        { label: "Échoués",    value: String(totalFailed),   color: "#ef4444" },
                        { label: "1-Step",     value: String(t1Count),       color: "#a78bfa" },
                        { label: "2-Step",     value: String(t2Count),       color: "#60a5fa" },
                      ] as { label: string; value: string; color: string }[]).map((k, i) => (
                        <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>{k.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Par taille de compte</div>
                        {byAccountSize.map(b => (
                          <div key={b.size} style={{ marginBottom: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{b.size}</span>
                              <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
                                <span style={{ color: "#22c55e" }}>{b.active} act.</span>
                                <span style={{ color: "#3b82f6" }}>{b.certified} cert.</span>
                                <span style={{ color: "#ef4444" }}>{b.failed} éch.</span>
                              </div>
                            </div>
                            <PBar value={b.count} max={maxBySizeCount} color="#3b82f6" />
                            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{b.count} challenge{b.count > 1 ? "s" : ""} · €{Math.round(b.revenue).toLocaleString()} CA</div>
                          </div>
                        ))}
                        {byAccountSize.length === 0 && <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", padding: 20 }}>Aucune donnée</div>}
                      </div>

                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Modèle de challenge</div>
                        {([
                          { label: "1-Step", count: t1Count, color: "#a78bfa" },
                          { label: "2-Step", count: t2Count, color: "#60a5fa" },
                        ] as { label: string; count: number; color: string }[]).map(m => (
                          <div key={m.label} style={{ marginBottom: 16 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{m.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: m.color }}>{m.count} · {pct(m.count)}%</span>
                            </div>
                            <PBar value={m.count} max={total} color={m.color} />
                          </div>
                        ))}

                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 8 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Taux clés</div>
                          {([
                            { label: "P1 → P2 (2-Step)",   value: `${kpis.convP1P2}%`,     color: "#22c55e" },
                            { label: "P2 → Reward",          value: `${kpis.convP2Fund}%`,   color: "#22c55e" },
                            { label: "Taux reward global",   value: `${pct(totalCert)}%`,    color: "#3b82f6" },
                            { label: "Taux échec global",    value: `${pct(totalFailed)}%`,  color: "#ef4444" },
                          ] as { label: string; value: string; color: string }[]).map((r, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{r.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 800, color: r.color }}>{r.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── TRADERS ─── */}
              {analyticsView === "traders" && (() => {
                const top10 = traderCRM.slice(0, 10);
                const maxSpent = traderCRM[0]?.totalSpent || 1;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                      {([
                        { label: "Traders uniques",   value: String(kpis.totalTraders),                        color: "#fff"    },
                        { label: "Traders actifs",    value: String(kpis.activeTraders),                       color: "#22c55e" },
                        { label: "Certifiés",         value: String(certifiedTraders),                          color: "#3b82f6" },
                        { label: "LTV moyenne",       value: `€${Math.round(kpis.ltv).toLocaleString()}`,      color: "#f59e0b" },
                        { label: "Moy. challenges",   value: avgChallenges,                                     color: "#a78bfa" },
                        { label: "Paiement Crypto",   value: `${cryptoPct}%`,                                   color: "#f59e0b" },
                      ] as { label: string; value: string; color: string }[]).map((k, i) => (
                        <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>{k.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Top clients — Lifetime Value</div>
                        {top10.length === 0
                          ? <div style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Aucun trader</div>
                          : top10.map((t) => {
                              const certCount = t.challenges.filter(c => c.status === "funded").length;
                              return (
                                <div key={t.email} style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name || t.email}</div>
                                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                                        {t.challenges.length} challenge{t.challenges.length > 1 ? "s" : ""} · {certCount > 0 ? `${certCount} certifié${certCount > 1 ? "s" : ""}` : "Aucun certifié"}
                                      </div>
                                    </div>
                                    <div style={{ fontWeight: 900, fontSize: 13, color: "#f59e0b", flexShrink: 0, marginLeft: 12 }}>€{Math.round(t.totalSpent).toLocaleString()}</div>
                                  </div>
                                  <PBar value={t.totalSpent} max={maxSpent} color="#f59e0b" />
                                </div>
                              );
                            })}
                      </div>

                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Répartition par pays</div>
                        {topCountries.length === 0 ? (
                          <div style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Donnée indisponible</div>
                        ) : (() => {
                          const maxC = topCountries[0]?.[1] || 1;
                          return (
                            <div>
                              {topCountries.map(([country, count]) => (
                                <div key={country} style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{country}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{count}</span>
                                  </div>
                                  <PBar value={count} max={maxC} color="#3b82f6" />
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── MARKETING ─── */}
              {analyticsView === "marketing" && (() => {
                const maxConv  = topAffiliates[0]?.referrals.length || 1;
                const maxUsed  = topPromos[0]?.used_count || 1;
                const totalPurch = Math.max(1, salesThisYear);
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                      {([
                        { label: "Codes actifs",          value: String(activePromos.length),                                                color: "#22c55e" },
                        { label: "Conversions affiliées", value: String(totalConversions),                                                   color: "#3b82f6" },
                        { label: "CA affilié (estimé)",  value: `€${Math.round(affiliateCA).toLocaleString()}`,                             color: "#f59e0b" },
                        { label: "Affiliés actifs",       value: String(affiliates.filter(a => a.referrals.length > 0).length),              color: "#60a5fa" },
                      ] as { label: string; value: string; color: string }[]).map((k, i) => (
                        <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 22px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{k.label}</div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>Répartition acquisition</div>
                      {([
                        { label: "Ventes directes", count: directCount, color: "#3b82f6" },
                        { label: "Via affilié",      count: totalConversions, color: "#f59e0b" },
                      ] as { label: string; count: number; color: string }[]).map(row => (
                        <div key={row.label} style={{ marginBottom: 14 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{row.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 800, color: row.color }}>{row.count} · {Math.round(row.count / totalPurch * 100)}%</span>
                          </div>
                          <PBar value={row.count} max={totalPurch} color={row.color} />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Top affiliés</div>
                        {topAffiliates.length === 0
                          ? <div style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Aucun affilié</div>
                          : topAffiliates.map(a => (
                              <div key={a.id} style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      {a.first_name || a.last_name ? `${a.first_name || ""} ${a.last_name || ""}`.trim() : a.email || a.code}
                                    </div>
                                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{a.code}</div>
                                  </div>
                                  <span style={{ fontWeight: 800, fontSize: 13, color: "#3b82f6", flexShrink: 0, marginLeft: 12 }}>{a.referrals.length} conv.</span>
                                </div>
                                <PBar value={a.referrals.length} max={maxConv} color="#3b82f6" />
                              </div>
                            ))}
                      </div>

                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Top promotions utilisées</div>
                        {topPromos.length === 0
                          ? <div style={{ padding: 28, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>Aucun code promo</div>
                          : topPromos.map(p => (
                              <div key={p.id} style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: "#fff" }}>{p.code}</div>
                                    <div style={{ fontSize: 10, color: "#22c55e" }}>-{p.discount_percent}%</div>
                                  </div>
                                  <span style={{ fontWeight: 800, fontSize: 13, color: "#22c55e" }}>{p.used_count} util.</span>
                                </div>
                                <PBar value={p.used_count} max={maxUsed} color="#22c55e" />
                              </div>
                            ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* ─── RISQUES ─── */}
              {analyticsView === "risques" && (() => {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12 }}>
                      {([
                        { label: "Drawdown critique", value: String(riskAccounts.length), color: riskAccounts.length > 0 ? "#ef4444" : "#22c55e" },
                        { label: "KYC en attente",    value: String(kycPending),          color: kycPending > 0 ? "#f59e0b" : "#22c55e"          },
                        { label: "Rewards en attente",value: String(pendingRw),           color: pendingRw > 0 ? "#f59e0b" : "#22c55e"            },
                        { label: "Comptes breachés",  value: String(breached),            color: breached > 0 ? "#ef4444" : "#22c55e"             },
                      ] as { label: string; value: string; color: string }[]).map((k, i) => (
                        <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 18px" }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>{k.label}</div>
                          <div style={{ fontSize: 20, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 13, fontWeight: 700, color: "#fff" }}>Comptes en zone critique — Drawdown</div>
                      {riskAccounts.length === 0 ? (
                        <div style={{ padding: "28px 20px", textAlign: "center", color: "#22c55e", fontSize: 13, fontWeight: 700 }}>Aucun compte en zone critique</div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
                            <thead>
                              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                {["Trader","Compte","Drawdown","Limite","Alerte"].map(h => (
                                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "rgba(255,255,255,0.3)", fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {riskAccounts.slice(0, 10).map(c => {
                                const dd    = c.start_balance > 0 ? (c.start_balance - c.balance) / c.start_balance * 100 : 0;
                                const limit = c.total_drawdown_limit || 10;
                                const ratio = Math.min(100, Math.round(dd / limit * 100));
                                const col   = ratio >= 90 ? "#ef4444" : "#f59e0b";
                                return (
                                  <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                    <td style={{ padding: "10px 16px", fontSize: 12, fontWeight: 700, color: "#fff", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</td>
                                    <td style={{ padding: "10px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>{c.account_size} · {c.model}</td>
                                    <td style={{ padding: "10px 16px" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <div style={{ width: 60, background: "rgba(255,255,255,0.06)", borderRadius: 3, height: 5, flexShrink: 0 }}>
                                          <div style={{ width: `${ratio}%`, background: col, borderRadius: 3, height: 5 }} />
                                        </div>
                                        <span style={{ fontSize: 12, fontWeight: 800, color: col }}>{dd.toFixed(1)}%</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: "10px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{limit}%</td>
                                    <td style={{ padding: "10px 16px" }}>
                                      <span style={{ fontSize: 11, fontWeight: 700, color: col, background: `${col}15`, padding: "2px 8px", borderRadius: 100 }}>
                                        {ratio >= 90 ? "Critique" : "Attention"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {kycPending > 0 && (
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b", flexShrink: 0 }}>{kycPending}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>KYC en attente de validation</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Accéder à l'onglet KYC pour traiter les dossiers en cours</div>
                        </div>
                      </div>
                    )}

                    {pendingRw > 0 && (
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: "#f59e0b", flexShrink: 0 }}>{pendingRw}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Rewards en attente — €{Math.round(kpis.pendingAmt).toLocaleString()} à valider</div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Accéder à la section Finance pour traiter les demandes</div>
                        </div>
                      </div>
                    )}

                    {riskAccounts.length === 0 && kycPending === 0 && pendingRw === 0 && (
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 12, padding: "20px 24px", textAlign: "center" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#22c55e", marginBottom: 4 }}>Aucun risque identifié</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Tous les comptes sont dans les limites. Aucun KYC ni reward en attente.</div>
                      </div>
                    )}
                  </div>
                );
              })()}

            </div>
          );
        })()}

        {tab === "securite" && (() => {
          // ── Helpers ──────────────────────────────────────────────────────
          const parseUA = (ua: string): string => {
            if (!ua) return "—";
            const chromeM = ua.match(/Chrome\/(\d+)/);
            const firefoxM = ua.match(/Firefox\/(\d+)/);
            const edgeM = ua.match(/Edg\/(\d+)/);
            let browser = "Navigateur";
            if (edgeM) browser = `Edge ${edgeM[1]}`;
            else if (chromeM && !ua.includes("Edg")) browser = `Chrome ${chromeM[1]}`;
            else if (firefoxM) browser = `Firefox ${firefoxM[1]}`;
            else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
            let os = "Systeme";
            if (ua.includes("Windows NT")) os = "Windows";
            else if (ua.includes("Android")) os = "Android";
            else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
            else if (ua.includes("Mac OS X")) os = "macOS";
            else if (ua.includes("Linux")) os = "Linux";
            return `${browser} · ${os}`;
          };

          const copyText = (text: string) => { navigator.clipboard.writeText(text); };
          const goToCRM = (email: string) => { setCrmSearch(email); setCrmExpanded(email); setTab("crm"); };

          // ── VPN deduplication (traders uniques) ──────────────────────────
          const vpnTraderMap = new Map<string, { last: LoginEvent; first: LoginEvent }>();
          if (securityData) {
            for (const e of securityData.vpn_users) {
              const ex = vpnTraderMap.get(e.user_email);
              if (!ex) vpnTraderMap.set(e.user_email, { last: e, first: e });
              else vpnTraderMap.set(e.user_email, { last: ex.last, first: e });
            }
          }
          const uniqueVpnTraders = Array.from(vpnTraderMap.entries()).map(([email, d]) => ({ email, ...d }));

          // ── IP mismatch table ─────────────────────────────────────────────
          const lastLoginByEmail = new Map<string, string>();
          if (securityData) {
            for (const e of securityData.events) {
              if (!lastLoginByEmail.has(e.user_email)) lastLoginByEmail.set(e.user_email, e.ip);
            }
          }
          const mt5ByEmail = new Map<string, MT5Session[]>();
          for (const s of mt5Sessions) {
            if (!mt5ByEmail.has(s.user_email)) mt5ByEmail.set(s.user_email, []);
            mt5ByEmail.get(s.user_email)!.push(s);
          }
          const ipEmails = Array.from(new Set([...Array.from(lastLoginByEmail.keys()), ...Array.from(mt5ByEmail.keys())]));
          const ipRows = ipEmails.map(email => {
            const loginIP = lastLoginByEmail.get(email) || null;
            const sessions = mt5ByEmail.get(email) || [];
            const mt5IPs = [...new Set(sessions.map(s => s.last_ip).filter((ip): ip is string => !!ip))];
            const regIP = profiles.find(p => p.email === email)?.registration_ip || null;
            const mismatch = !!(regIP && loginIP && regIP !== loginIP);
            const mt5Mismatch = !!(loginIP && mt5IPs.length > 0 && !mt5IPs.includes(loginIP));
            return { email, loginIP, mt5IPs, regIP, mismatch, mt5Mismatch, hasAlert: mismatch || mt5Mismatch };
          });
          const mismatchRows = ipRows.filter(r => r.hasAlert);
          const displayedRows = ipMismatchShowAll ? ipRows : mismatchRows;

          // ── À investiguer ─────────────────────────────────────────────────
          const investigations: { type: "SIGNAL" | "ATTENTION"; label: string; emails: string[] }[] = [];
          if (securityData) {
            for (const fp of securityData.shared_fingerprints.filter(f => f.count >= 3))
              investigations.push({ type: "ATTENTION", label: `Fingerprint partage — ${fp.count} comptes`, emails: fp.emails });
            for (const ip of securityData.shared_ips.filter(i => i.count >= 5))
              investigations.push({ type: "ATTENTION", label: `IP partagee ${ip.ip} — ${ip.count} comptes`, emails: ip.emails });
            for (const fp of securityData.shared_fingerprints.filter(f => f.count === 2))
              investigations.push({ type: "SIGNAL", label: `Fingerprint partage — 2 comptes`, emails: fp.emails });
            for (const ip of securityData.shared_ips.filter(i => i.count >= 2 && i.count < 5))
              investigations.push({ type: "SIGNAL", label: `IP partagee ${ip.ip} — ${ip.count} comptes`, emails: ip.emails });
            for (const p of profiles.filter(p => p.registration_is_vpn && p.email))
              investigations.push({ type: "SIGNAL", label: `Inscription via VPN`, emails: [p.email!] });
          }
          const topInvestigations = investigations.slice(0, 8);

          // ── Activity search filter ─────────────────────────────────────────
          const filteredEvents = (securityData?.events || [])
            .filter(e => !securitySearch || e.user_email.toLowerCase().includes(securitySearch.toLowerCase()))
            .slice(0, 100);

          // ── Sub-nav ───────────────────────────────────────────────────────
          const secViews = [
            { id: "overview", label: "Vue d'ensemble" },
            { id: "ips",      label: "IP partagees" },
            { id: "devices",  label: "Appareils" },
            { id: "activity", label: "Activite" },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Sub-navigation — pattern unifié */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 2, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: 4, overflowX: "auto", flex: 1 }}>
                  {secViews.map(v => (
                    <button key={v.id} onClick={() => setSecurityView(v.id)}
                      style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 14px", background: securityView === v.id ? "#111" : "transparent", border: `1px solid ${securityView === v.id ? "rgba(255,255,255,0.1)" : "transparent"}`, borderRadius: 7, color: securityView === v.id ? "#fff" : "rgba(255,255,255,0.38)", fontSize: 12, fontWeight: securityView === v.id ? 700 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {v.label}
                    </button>
                  ))}
                </div>
                <button onClick={() => loadSecurity()} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "rgba(255,255,255,0.45)", fontSize: 12, cursor: "pointer", flexShrink: 0 }}>Rafraichir</button>
              </div>

              {securityLoading && (
                <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Chargement…</div>
              )}

              {!securityLoading && !securityData && (
                <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucune donnee. Cliquez sur Rafraichir.</div>
              )}

              {/* ── OVERVIEW ──────────────────────────────────────────────── */}
              {securityData && securityView === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
                    {[
                      { label: "Signaux IP",        value: securityData.shared_ips.length,          sub: "IPs partagees entre 2+ comptes" },
                      { label: "Signaux Appareil",   value: securityData.shared_fingerprints.length, sub: "Fingerprints partages" },
                      { label: "Traders VPN",        value: uniqueVpnTraders.length,                 sub: "Traders uniques (dedupliques)" },
                      { label: "Connexions tracees", value: securityData.events.length,              sub: "500 derniers events" },
                    ].map((kpi, i) => (
                      <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px" }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{kpi.label}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>{kpi.value}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{kpi.sub}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 16 }}>A investiguer</div>
                    {topInvestigations.length === 0 ? (
                      <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucun signal a investiguer</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {topInvestigations.map((item, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 16px", background: "#111111", borderRadius: 10, border: `1px solid ${item.type === "ATTENTION" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.06)"}` }}>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 100, flexShrink: 0, marginTop: 1, backgroundColor: item.type === "ATTENTION" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.07)", color: item.type === "ATTENTION" ? "#f59e0b" : "rgba(255,255,255,0.45)" }}>{item.type}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, color: "#fff", marginBottom: 6 }}>{item.label}</div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {item.emails.filter(Boolean).map((email, j) => (
                                  <button key={j} onClick={() => goToCRM(email)} style={{ fontSize: 11, color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>{email}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── IP PARTAGEES ──────────────────────────────────────────── */}
              {securityData && securityView === "ips" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>IPs partagees entre plusieurs comptes</div>
                    {securityData.shared_ips.length === 0 ? (
                      <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucune IP partagee detectee</div>
                    ) : (
                      securityData.shared_ips.map((item, i) => {
                        const level = item.count >= 3 ? "ATTENTION" : "SIGNAL";
                        return (
                          <div key={i} style={{ background: "#0c0c0c", border: `1px solid ${level === "ATTENTION" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "16px 20px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#fff" }}>{item.ip}</span>
                              <button onClick={() => copyText(item.ip)} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Copier</button>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 100, backgroundColor: level === "ATTENTION" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.07)", color: level === "ATTENTION" ? "#f59e0b" : "rgba(255,255,255,0.45)" }}>{level}</span>
                              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.count} comptes</span>
                              {item.events[0]?.country && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.events[0].country}</span>}
                              {item.events[0]?.is_vpn && <span style={{ fontSize: 10, background: "rgba(245,158,11,0.12)", color: "#f59e0b", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>VPN</span>}
                              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>{new Date(item.events[0]?.created_at).toLocaleDateString("fr-FR")}</span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                              {item.emails.map((email, j) => (
                                <button key={j} onClick={() => goToCRM(email)} style={{ fontSize: 12, color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>{email}</button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Comparaison IP */}
                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>Comparaison IP — Inscription / Login / MT5</span>
                      {mt5Loading && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Chargement MT5…</span>}
                      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{ipMismatchShowAll ? `${ipRows.length} traders` : `${mismatchRows.length} mismatch`}</span>
                        <button onClick={() => setIpMismatchShowAll(v => !v)} style={{ fontSize: 11, color: "#60a5fa", background: "none", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 6, padding: "3px 10px", cursor: "pointer" }}>{ipMismatchShowAll ? "Mismatches seulement" : "Voir tous"}</button>
                      </div>
                    </div>
                    {displayedRows.length === 0 ? (
                      <div style={{ padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>{ipMismatchShowAll ? "Aucune donnee disponible" : "Aucun mismatch detecte"}</div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead><tr style={{ background: "rgba(255,255,255,0.03)" }}>
                            {["Trader", "IP Inscription", "Dernier Login", "IP MT5", ""].map(h => (
                              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {displayedRows.map((row, i) => (
                              <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                <td style={{ padding: "10px 16px" }}>
                                  <button onClick={() => goToCRM(row.email)} style={{ fontSize: 12, color: "#60a5fa", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>{row.email}</button>
                                </td>
                                <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 11, color: row.mismatch ? "#f59e0b" : "rgba(255,255,255,0.45)" }}>{row.regIP || <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}</td>
                                <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 11, color: row.mismatch ? "#f59e0b" : "rgba(255,255,255,0.45)" }}>{row.loginIP || <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}</td>
                                <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 11 }}>
                                  {row.mt5IPs.length > 0
                                    ? <span style={{ color: row.mt5Mismatch ? "#f59e0b" : "rgba(255,255,255,0.45)" }}>{row.mt5IPs.join(", ")}</span>
                                    : <span style={{ color: "rgba(255,255,255,0.2)" }}>{mt5Loading ? "…" : "—"}</span>}
                                </td>
                                <td style={{ padding: "10px 16px" }}>
                                  {row.hasAlert
                                    ? <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 100 }}>Mismatch</span>
                                    : <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>OK</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── APPAREILS ─────────────────────────────────────────────── */}
              {securityData && securityView === "devices" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Appareils partages entre plusieurs comptes</div>
                  {securityData.shared_fingerprints.length === 0 ? (
                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucun appareil partage detecte</div>
                  ) : (
                    securityData.shared_fingerprints.map((item, i) => {
                      const level = item.count >= 3 ? "ATTENTION" : "SIGNAL";
                      const uaDisplay = parseUA(item.events[0]?.user_agent || "");
                      return (
                        <div key={i} style={{ background: "#0c0c0c", border: `1px solid ${level === "ATTENTION" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "16px 20px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{item.fingerprint.slice(0, 16)}…</span>
                            <button onClick={() => copyText(item.fingerprint)} style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Copier</button>
                            <span style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 100, backgroundColor: level === "ATTENTION" ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.07)", color: level === "ATTENTION" ? "#f59e0b" : "rgba(255,255,255,0.45)" }}>{level}</span>
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{item.count} comptes</span>
                            {uaDisplay !== "—" && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{uaDisplay}</span>}
                            {item.events[0]?.country && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{item.events[0].country}</span>}
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>{new Date(item.events[0]?.created_at).toLocaleDateString("fr-FR")}</span>
                          </div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {item.emails.map((email, j) => (
                              <button key={j} onClick={() => goToCRM(email)} style={{ fontSize: 12, color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>{email}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── ACTIVITE ──────────────────────────────────────────────── */}
              {securityData && securityView === "activity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* Traders VPN dedupliques */}
                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Traders VPN</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{uniqueVpnTraders.length} trader{uniqueVpnTraders.length !== 1 ? "s" : ""} unique{uniqueVpnTraders.length !== 1 ? "s" : ""}</span>
                    </div>
                    {uniqueVpnTraders.length === 0 ? (
                      <div style={{ padding: "32px 24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucun trader VPN detecte</div>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead><tr style={{ background: "rgba(255,255,255,0.03)" }}>
                            {["Trader", "Pays", "VPN Inscription", "Premiere VPN", "Derniere VPN", ""].map(h => (
                              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {uniqueVpnTraders.map((trader, i) => {
                              const regIsVpn = profiles.find(p => p.email === trader.email)?.registration_is_vpn;
                              return (
                                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                  <td style={{ padding: "10px 16px", fontSize: 12, color: "#60a5fa" }}>{trader.email}</td>
                                  <td style={{ padding: "10px 16px", fontSize: 12, color: "rgba(255,255,255,0.45)" }}>{trader.last.country || "—"}</td>
                                  <td style={{ padding: "10px 16px" }}>
                                    {regIsVpn
                                      ? <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 8px", borderRadius: 100 }}>Oui</span>
                                      : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Non</span>}
                                  </td>
                                  <td style={{ padding: "10px 16px", fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{new Date(trader.first.created_at).toLocaleDateString("fr-FR")}</td>
                                  <td style={{ padding: "10px 16px", fontSize: 11, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>{new Date(trader.last.created_at).toLocaleDateString("fr-FR")}</td>
                                  <td style={{ padding: "10px 16px" }}>
                                    <button onClick={() => goToCRM(trader.email)} style={{ fontSize: 11, color: "#60a5fa", background: "none", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 6, padding: "3px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>Voir CRM</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Historique connexions avec recherche */}
                  <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Historique connexions</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{filteredEvents.length} evenement{filteredEvents.length !== 1 ? "s" : ""}</span>
                      <input type="text" value={securitySearch} onChange={e => setSecuritySearch(e.target.value)} placeholder="Rechercher un trader…"
                        style={{ marginLeft: "auto", background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, outline: "none", width: 220 }} />
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr style={{ background: "rgba(255,255,255,0.03)" }}>
                          {["Trader", "IP", "Pays", "VPN", "Appareil", "Date"].map(h => (
                            <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {filteredEvents.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: "32px 16px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Aucun evenement</td></tr>
                          ) : filteredEvents.map((e, i) => (
                            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td style={{ padding: "10px 16px" }}>
                                <button onClick={() => goToCRM(e.user_email)} style={{ fontSize: 12, color: "#60a5fa", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>{e.user_email}</button>
                              </td>
                              <td style={{ padding: "10px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontFamily: "monospace", fontSize: 11, color: "#fff" }}>{e.ip}</span>
                                  <button onClick={() => copyText(e.ip)} style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 3, padding: "1px 5px", cursor: "pointer" }}>CP</button>
                                </div>
                              </td>
                              <td style={{ padding: "10px 16px", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{e.country || "—"}</td>
                              <td style={{ padding: "10px 16px" }}>
                                {e.is_vpn
                                  ? <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", padding: "2px 6px", borderRadius: 100 }}>VPN</span>
                                  : <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>—</span>}
                              </td>
                              <td style={{ padding: "10px 16px", fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{e.fingerprint?.slice(0, 12) || "—"}</td>
                              <td style={{ padding: "10px 16px", fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>{new Date(e.created_at).toLocaleString("fr-FR")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

            </div>
          );
        })()}

        {/* ── MAINTENANCE ── */}
        {tab === "maintenance" && (() => {
          const activeCount = challenges.filter(c => c.status === "active" || c.status === "funded").length;
          const platformVersion = settingsData.find(r => r.key === "general.platform_version")?.value as string | undefined;

          const integrations = [
            { name: "Supabase",          note: "Base de donnees principale — utilisee par toutes les routes" },
            { name: "MT5 / VPS",         note: "51.254.204.198:5000 — etat temps reel non verifie ici" },
            { name: "Stripe",            note: "Paiements carte — configure dans Vercel Env" },
            { name: "NOWPayments",       note: "Paiements crypto — configure dans Vercel Env" },
            { name: "Resend",            note: "Emails transactionnels — configure dans Vercel Env" },
            { name: "Vercel Cron",       note: "Synchronisation automatique MT5 — configure" },
            { name: "Fingerprint / IP",  note: "Collecte des login events — actif (voir Security Center)" },
          ];

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* 1 — Etat technique */}
              <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Etat technique</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                  {([
                    { label: "Version",           value: platformVersion ?? "2.0" },
                    { label: "Challenges actifs", value: String(activeCount) },
                    { label: "Total challenges",  value: String(challenges.length) },
                  ] as { label: string; value: string }[]).map((kpi, i) => (
                    <div key={i} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{kpi.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{kpi.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>Integrations configurees</div>
                  {integrations.map(int => (
                    <div key={int.name} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 14px", background: "#111111", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{int.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{int.note}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap", flexShrink: 0 }}>Configure</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2 — Operations */}
              <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Operations</div>

                <div style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Sync MT5</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Synchronise toutes les challenges actives depuis le serveur MT5. Peut declencher des transitions de phase et des emails automatiques.</div>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                    {syncMsg && <span style={{ fontSize: 12, fontWeight: 600, color: syncMsg.startsWith("✓") ? "#22c55e" : "#ef4444" }}>{syncMsg}</span>}
                    <button onClick={runSync} disabled={syncing} style={{ background: syncing ? "rgba(255,255,255,0.06)" : "#3b82f6", color: syncing ? "rgba(255,255,255,0.35)" : "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer" }}>
                      {syncing ? "Synchronisation en cours..." : "Lancer la sync"}
                    </button>
                  </div>
                  {syncDetail && (
                    <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, padding: "12px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Resultat</span>
                        <button onClick={() => setSyncDetail("")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12 }}>Fermer</button>
                      </div>
                      <pre style={{ color: "#fff", fontSize: 11, margin: 0, overflowX: "auto", whiteSpace: "pre-wrap", maxHeight: 360 }}>{syncDetail}</pre>
                    </div>
                  )}
                </div>
              </div>

              {/* 3 — Zone dangereuse */}
              <div style={{ background: "#0c0c0c", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12, overflow: "hidden" }}>
                <button
                  onClick={() => setMaintenanceDangerOpen(o => !o)}
                  style={{ width: "100%", padding: "14px 20px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>Zone dangereuse</span>
                    <span style={{ fontSize: 10, color: "rgba(239,68,68,0.55)", background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: 100, fontWeight: 700 }}>Legacy</span>
                  </div>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{maintenanceDangerOpen ? "Fermer" : "Afficher"}</span>
                </button>

                {maintenanceDangerOpen && (
                  <div style={{ borderTop: "1px solid rgba(239,68,68,0.1)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Restauration clients</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Operation legacy — Bruno Penard, Aurelien Roussel, Regis Allide (x2), Samir KHELIF</div>
                      <div style={{ fontSize: 11, color: "rgba(239,68,68,0.6)" }}>Action irreversible — cree des challenges Supabase et envoie des emails automatiques aux traders.</div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                      <button
                        onClick={async () => {
                          await fetch("/api/admin/preview-apology-email", { method: "POST", headers: { "x-admin-key": ADMIN_KEY } });
                        }}
                        style={{ background: "transparent", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        Recevoir copie email
                      </button>
                      <button
                        disabled
                        style={{ background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "not-allowed" }}
                      >
                        Restaurer les dashboards
                      </button>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Opération de migration terminée</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          );
        })()}

        {/* ── SETTINGS ── V2 Phase 2D-H ─────────────────────────── */}
        {tab === "settings" && (() => {
          const pendingEditCount = Object.keys(settingsEdit).length;

          const KEY_LABELS: Record<string, string> = {
            "branding.brand_name":           "Nom de la plateforme",
            "branding.site_url":             "URL du site",
            "branding.logo_url":             "URL du logo",
            "branding.support_email":        "Email de support",
            "branding.sender_name":          "Nom expediteur",
            "branding.sender_email":         "Email expediteur",
            "general.platform_version":      "Version plateforme",
            "trading.mt5_group_2step":       "Groupe 2-Step — Challenge",
            "trading.mt5_group_1step":       "Groupe 1-Step — Challenge",
            "trading.mt5_group_funded_2step":"Groupe 2-Step — Funded",
            "trading.mt5_group_funded_1step":"Groupe 1-Step — Funded",
            "trading.mt5_group_disabled":    "Groupe desactive",
            "payouts.profit_split_1step":    "Profit split 1-Step (%)",
            "payouts.profit_split_2step":    "Profit split 2-Step (%)",
            "challenges.profit_target":      "Objectif de profit (%)",
            "challenges.daily_dd_1step":     "Drawdown journalier 1-Step (%)",
            "challenges.daily_dd_2step":     "Drawdown journalier 2-Step (%)",
            "challenges.total_dd_default":   "Drawdown total (%)",
          };

          const saveSetting = async (key: string) => {
            const rawVal = settingsEdit[key];
            if (rawVal === undefined) return;
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
                setSettingsMsg(p => ({ ...p, [key]: { ok: true, msg: "Sauvegarde" } }));
                setSettingsData(prev => prev.map(r => r.key === key ? { ...r, value } : r));
                setSettingsEdit(p => { const n = { ...p }; delete n[key]; return n; });
              } else {
                setSettingsMsg(p => ({ ...p, [key]: { ok: false, msg: data.error || "Erreur" } }));
              }
            } catch {
              setSettingsMsg(p => ({ ...p, [key]: { ok: false, msg: "Erreur reseau" } }));
            } finally {
              setSettingsSaving(null);
              setTimeout(() => setSettingsMsg(p => { const n = { ...p }; delete n[key]; return n; }), 3000);
            }
          };

          const renderEditable = (row: SettingRow) => {
            const currentEdit = settingsEdit[row.key];
            const displayVal = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
            const editVal = currentEdit !== undefined ? currentEdit : displayVal;
            const isDirty = currentEdit !== undefined;
            const msg = settingsMsg[row.key];
            const saving = settingsSaving === row.key;
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{KEY_LABELS[row.key] || row.key}</div>
                  {row.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>{row.description}</div>}
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontFamily: "monospace" }}>{row.key}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                  <input
                    value={editVal}
                    onChange={e => setSettingsEdit(p => ({ ...p, [row.key]: e.target.value }))}
                    style={{ background: isDirty ? "rgba(96,165,250,0.08)" : "#111111", border: `1px solid ${isDirty ? "#60a5fa" : "rgba(255,255,255,0.08)"}`, borderRadius: 8, padding: "7px 12px", color: "#fff", fontSize: 12, fontFamily: "monospace", width: "100%", maxWidth: 240, outline: "none" }}
                  />
                  {isDirty && (
                    <button onClick={() => saveSetting(row.key)} disabled={saving} style={{ background: saving ? "#374151" : "#60a5fa", border: "none", borderRadius: 8, color: saving ? "rgba(255,255,255,0.4)" : "#000", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer" }}>
                      {saving ? "..." : "Enregistrer"}
                    </button>
                  )}
                  {isDirty && !saving && (
                    <button onClick={() => setSettingsEdit(p => { const n = { ...p }; delete n[row.key]; return n; })} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "rgba(255,255,255,0.35)", padding: "7px 10px", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                  )}
                  {msg && <span style={{ fontSize: 11, fontWeight: 700, color: msg.ok ? "#22c55e" : "#ef4444" }}>{msg.msg}</span>}
                </div>
              </div>
            );
          };

          const renderReadOnly = (row: SettingRow, hint?: string) => {
            const displayVal = typeof row.value === "string" ? row.value : JSON.stringify(row.value);
            return (
              <div key={row.key} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", marginBottom: 2 }}>{KEY_LABELS[row.key] || row.key}</div>
                  {(hint || row.description) && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 3 }}>{hint || row.description}</div>}
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>{row.key}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.04)", padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>{displayVal}</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", padding: "3px 8px", borderRadius: 100, whiteSpace: "nowrap" }}>Lecture seule</span>
                </div>
              </div>
            );
          };

          const brandingRows   = settingsData.filter(r => r.category === "branding");
          const tradingRows    = settingsData.filter(r => r.category === "trading");
          const payoutsRows    = settingsData.filter(r => r.category === "payouts");
          const challengesRows = settingsData.filter(r => r.category === "challenges");
          const generalRows    = settingsData.filter(r => r.category === "general");

          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Header */}
              <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Parametres</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Les modifications prennent effet sous 5 minutes (cache serveur). Ne jamais stocker de secrets ici.</div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  {pendingEditCount > 0 && (
                    <>
                      <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>{pendingEditCount} modification{pendingEditCount > 1 ? "s" : ""} non sauvegardee{pendingEditCount > 1 ? "s" : ""}</span>
                      <button onClick={() => setSettingsEdit({})} style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "5px 12px", cursor: "pointer" }}>Annuler tout</button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      setSettingsData([]); setSettingsLoading(true);
                      fetch("/api/admin/settings", { headers: { "x-admin-key": ADMIN_KEY } })
                        .then(r => r.json()).then(d => { if (d.settings) setSettingsData(d.settings); })
                        .finally(() => setSettingsLoading(false));
                    }}
                    style={{ fontSize: 12, color: "#60a5fa", background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontWeight: 600 }}
                  >
                    Rafraichir
                  </button>
                </div>
              </div>

              {settingsLoading && <div style={{ padding: 60, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Chargement des parametres...</div>}

              {!settingsLoading && settingsData.length === 0 && (
                <div style={{ padding: "24px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: 6, fontSize: 13 }}>Parametres non charges</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{settingsApiError || "Erreur inconnue — verifier la console navigateur"}</div>
                </div>
              )}

              {/* Section 1 — Plateforme */}
              {(brandingRows.length > 0 || generalRows.length > 0) && (
                <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 16 }}>Plateforme</div>
                  {brandingRows.map(row => renderEditable(row))}
                  {generalRows.map(row => renderReadOnly(row, "Valeur indicative — aucun impact fonctionnel"))}
                </div>
              )}

              {/* Section 2 — MT5 Groups */}
              {tradingRows.length > 0 && (
                <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>MT5 Groups</div>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: 100 }}>Lecture seule</span>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(245,158,11,0.8)", background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.12)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                    Les groupes effectifs sont definis dans le moteur MT5. Ces valeurs sont affichees a titre de reference uniquement.
                  </div>
                  {tradingRows.map(row => renderReadOnly(row))}
                </div>
              )}

              {/* Section 3 — Rewards & Emails */}
              {(payoutsRows.length > 0 || challengesRows.length > 0) && (
                <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1, fontWeight: 700, marginBottom: 12 }}>Rewards et Emails</div>
                  {payoutsRows.length > 0 && (
                    <>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
                        Ces valeurs sont affichees dans les emails automatiques (funded, mise a jour quotidienne). Verifier la coherence avec Product Builder.
                      </div>
                      {payoutsRows.map(row => renderEditable(row))}
                    </>
                  )}
                  {challengesRows.length > 0 && (
                    <div style={{ marginTop: payoutsRows.length > 0 ? 16 : 0 }}>
                      <button
                        onClick={() => setSettingsLegacyOpen(o => !o)}
                        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 14px", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontSize: 12 }}
                      >
                        <span style={{ fontWeight: 600 }}>Valeurs legacy ({challengesRows.length})</span>
                        <span>{settingsLegacyOpen ? "Masquer" : "Afficher"}</span>
                      </button>
                      {settingsLegacyOpen && (
                        <div style={{ paddingTop: 12 }}>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
                            Ces valeurs servent uniquement de fallback pour les anciens flux. Product Builder est la source de verite pour les nouveaux produits.
                          </div>
                          {challengesRows.map(row => renderReadOnly(row))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })()}

        </div>
      </div>

      {/* ── MT5 Custom Balance Modal ── (remplace prompt()) */}
      {mt5CustomModal && (
        <>
          <div onClick={() => { if (!mt5CustomLoading) { setMt5CustomModal(null); setMt5CustomMsg(""); } }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "24px 28px", zIndex: 101, width: "min(420px, 90vw)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
              {mt5CustomModal.type === "add" ? "Ajouter balance" : "Retirer balance"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
              MT5 #{mt5CustomModal.mt5Login} — Balance actuelle : <strong style={{ color: "#fff" }}>${mt5CustomModal.mt5Balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "block", marginBottom: 6 }}>
                Montant ($) à {mt5CustomModal.type === "add" ? "ajouter" : "retirer"}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Ex: 500"
                value={mt5CustomAmount}
                onChange={e => setMt5CustomAmount(e.target.value)}
                onKeyDown={e => e.key === "Enter" && executeMT5Custom()}
                autoFocus
                style={{ width: "100%", background: "#111", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
              />
            </div>
            {mt5CustomAmount && !isNaN(parseFloat(mt5CustomAmount)) && parseFloat(mt5CustomAmount) > 0 && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 16, padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 6 }}>
                Balance après : <strong style={{ color: "#fff" }}>
                  ${(mt5CustomModal.type === "add"
                    ? mt5CustomModal.mt5Balance + parseFloat(mt5CustomAmount)
                    : mt5CustomModal.mt5Balance - parseFloat(mt5CustomAmount)
                  ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </strong>
              </div>
            )}
            {mt5CustomMsg && (
              <div style={{ fontSize: 12, color: mt5CustomMsg.includes("Erreur") || mt5CustomMsg.includes("Impossible") ? "#ef4444" : "#22c55e", marginBottom: 12, fontWeight: 600 }}>{mt5CustomMsg}</div>
            )}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => { setMt5CustomModal(null); setMt5CustomMsg(""); }} disabled={mt5CustomLoading}
                style={{ padding: "9px 18px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
                Annuler
              </button>
              <button onClick={executeMT5Custom} disabled={mt5CustomLoading || !mt5CustomAmount}
                style={{ padding: "9px 18px", background: mt5CustomModal.type === "add" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)", border: `1px solid ${mt5CustomModal.type === "add" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`, borderRadius: 8, color: mt5CustomModal.type === "add" ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 700, cursor: mt5CustomLoading ? "not-allowed" : "pointer", opacity: mt5CustomLoading ? 0.6 : 1 }}>
                {mt5CustomLoading ? "En cours..." : (mt5CustomModal.type === "add" ? "Confirmer l'ajout" : "Confirmer le retrait")}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", backgroundColor: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>Chargement...</div>}>
      <AdminPageInner />
    </Suspense>
  );
}
