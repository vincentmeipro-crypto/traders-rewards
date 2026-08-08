"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ────────────────────────────────────────────────────────
type PromoStatus = "revoked" | "exhausted" | "expired" | "scheduled" | "active";

type Promo = {
  id:                  string;
  code:                string;
  name:                string | null;
  discount_percent:    number;
  max_uses:            number | null;
  used_count:          number;
  expires_at:          string | null;
  starts_at:           string | null;
  active:              boolean;
  created_at:          string;
  targeting_mode:      "all" | "specific";
  single_use_per_user: boolean;
  affiliate_user_id:   string | null;
  product_ids:         string[];
  usage_records_count: number;
  unique_users_count:  number;
  last_used_at:        string | null;
  status:              PromoStatus;
};

type UsageItem = {
  id:                string;
  used_at:           string;
  provider:          string;
  discount_applied:  number;
  user_id:           string;
  trader_email:      string | null;
  trader_name:       string | null;
  challenge_id:      string | null;
  product_name:      string | null;
  amount_paid:       number | null;
  payment_reference: string | null;
};

type UsagePage = {
  items:      UsageItem[];
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
};

type Product   = { id: string; name: string; account_size: string; model: string; active: boolean };
type Affiliate = { id: string; user_id: string; code: string; first_name?: string; last_name?: string; email?: string };

// ── Status config ────────────────────────────────────────────────
const STATUS_CFG: Record<PromoStatus, { label: string; bg: string; color: string; border: string }> = {
  active:    { label: "ACTIVE",    bg: "rgba(34,197,94,0.1)",   color: "#4ade80", border: "rgba(34,197,94,0.2)"  },
  revoked:   { label: "RÉVOQUÉE", bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "rgba(255,255,255,0.1)" },
  expired:   { label: "EXPIRÉE",  bg: "rgba(245,158,11,0.1)",  color: "#fbbf24", border: "rgba(245,158,11,0.2)" },
  exhausted: { label: "ÉPUISÉE",  bg: "rgba(59,130,246,0.1)",  color: "#60a5fa", border: "rgba(59,130,246,0.2)" },
  scheduled: { label: "PLANIFIÉE",bg: "rgba(168,85,247,0.1)",  color: "#c084fc", border: "rgba(168,85,247,0.2)" },
};

// ── Atomic UI ────────────────────────────────────────────────────
const Label = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <div style={{
    fontSize: 10, fontWeight: 600, letterSpacing: "1.5px",
    textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6,
  }}>
    {children}{required && <span style={{ color: "rgba(239,68,68,0.7)", marginLeft: 3 }}>*</span>}
  </div>
);

const inputBaseStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontWeight: 500,
  width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const Input = ({ value, onChange, type = "text", placeholder, readOnly }: {
  value: string; onChange?: (v: string) => void;
  type?: string; placeholder?: string; readOnly?: boolean;
}) => (
  <input
    type={type}
    value={value}
    readOnly={readOnly}
    placeholder={placeholder}
    onChange={e => onChange?.(e.target.value)}
    style={readOnly ? { ...inputBaseStyle, background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)" } : inputBaseStyle}
    onFocus={e => { if (!readOnly) e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
  />
);

const Select = ({ value, onChange, children, disabled }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; disabled?: boolean;
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    style={{ ...inputBaseStyle, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.5 : 1 }}
  >
    {children}
  </select>
);

const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: "none",
        cursor: "pointer", background: checked ? "#22c55e" : "rgba(255,255,255,0.15)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: checked ? 18 : 4, transition: "left 0.2s",
      }} />
    </button>
    {label && <span style={{ fontSize: 13, color: checked ? "#fff" : "rgba(255,255,255,0.45)" }}>{label}</span>}
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.35)",
    letterSpacing: "1.5px", textTransform: "uppercase",
    marginBottom: 18, paddingBottom: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingLeft: 10, borderLeft: "3px solid rgba(59,130,246,0.3)",
  }}>
    {children}
  </div>
);

const fieldRow: React.CSSProperties = { marginBottom: 18 };

// ── Helpers ──────────────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Page ─────────────────────────────────────────────────────────
export default function PromoEditorPage() {
  const router = useRouter();
  const params = useParams();
  const promoId = params.id as string;

  const [promo, setPromo]           = useState<Promo | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [activeTab, setActiveTab]   = useState<"general" | "history">("general");
  const [notification, setNotif]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfDel] = useState(false);
  const [products, setProducts]     = useState<Product[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);

  // History
  const [usage, setUsage]           = useState<UsagePage | null>(null);
  const [usagePage, setUsagePage]   = useState(1);
  const [usageLoading, setULoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name:                "",
    discount_percent:    "",
    starts_at:           "",
    expires_at:          "",
    max_uses:            "",
    single_use_per_user: false,
    targeting_mode:      "all" as "all" | "specific",
    product_ids:         [] as string[],
    affiliate_user_id:   "",
    active:              true,
  });

  const notify = (msg: string, ok = true) => {
    setNotif({ msg, ok });
    setTimeout(() => setNotif(null), 4000);
  };

  // Load promo (fetch all + find by id)
  const loadPromo = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/promo-codes", { headers: { "x-admin-key": ADMIN_KEY } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        const found = data.find((p: Promo) => p.id === promoId);
        if (found) {
          setPromo(found);
          setForm({
            name:                found.name || "",
            discount_percent:    String(found.discount_percent),
            starts_at:           isoToLocal(found.starts_at),
            expires_at:          isoToLocal(found.expires_at),
            max_uses:            found.max_uses !== null ? String(found.max_uses) : "",
            single_use_per_user: found.single_use_per_user,
            targeting_mode:      found.targeting_mode,
            product_ids:         found.product_ids || [],
            affiliate_user_id:   found.affiliate_user_id || "",
            active:              found.active,
          });
        } else {
          notify("Promotion introuvable", false);
          setTimeout(() => router.push("/x8k3pz/promotions"), 1500);
        }
      }
    } catch { notify("Erreur réseau", false); }
    finally { setLoading(false); }
  }, [promoId, router]);

  // Load products + affiliates
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products", { headers: { "x-admin-key": ADMIN_KEY } }).then(r => r.json()),
      fetch("/api/admin/affiliates", { headers: { "x-admin-key": ADMIN_KEY } }).then(r => r.json()),
    ]).then(([prod, aff]) => {
      if (Array.isArray(prod)) setProducts(prod.filter((p: Product) => p.active));
      if (Array.isArray(aff))  setAffiliates(aff);
    }).catch(() => {});
  }, []);

  useEffect(() => { loadPromo(); }, [loadPromo]);

  // Load usage history
  const loadUsage = useCallback(async (page: number) => {
    setULoading(true);
    try {
      const res  = await fetch(`/api/admin/promo-codes/${promoId}/usages?page=${page}&limit=25`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok) setUsage(data);
    } catch { /* silent */ }
    finally { setULoading(false); }
  }, [promoId]);

  useEffect(() => {
    if (activeTab === "history") loadUsage(usagePage);
  }, [activeTab, usagePage, loadUsage]);

  const pf = (field: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [field]: v }));

  const toggleProduct = (id: string) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(id)
        ? prev.product_ids.filter(x => x !== id)
        : [...prev.product_ids, id],
    }));
  };

  // ── Save ─────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:                form.name.trim() || null,
        discount_percent:    Number(form.discount_percent),
        starts_at:           form.starts_at  || null,
        expires_at:          form.expires_at || null,
        max_uses:            form.max_uses   ? Number(form.max_uses) : null,
        single_use_per_user: form.single_use_per_user,
        targeting_mode:      form.targeting_mode,
        product_ids:         form.targeting_mode === "specific" ? form.product_ids : [],
        affiliate_user_id:   form.affiliate_user_id || null,
        active:              form.active,
      };
      const res  = await fetch(`/api/admin/promo-codes/${promoId}`, {
        method: "PATCH",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) { notify("Modifications sauvegardées"); await loadPromo(); }
      else notify(data.error || "Erreur lors de la sauvegarde", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!promo) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/promo-codes/${promoId}`, {
        method: "PATCH",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ active: !promo.active }),
      });
      const data = await res.json();
      if (res.ok) { notify(data.active ? "Promotion activée" : "Promotion révoquée"); await loadPromo(); }
      else notify(data.error || "Erreur", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  const deletePromo = async () => {
    if (!promo || promo.used_count > 0) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/promo-codes/${promoId}`, {
        method: "DELETE",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok) { notify("Code supprimé"); setTimeout(() => router.push("/x8k3pz/promotions"), 600); }
      else notify(data.error || "Erreur suppression", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); setConfDel(false); }
  };

  // ── Tab style ────────────────────────────────────────────────────
  const tabStyle = (tab: string): React.CSSProperties => ({
    background: "transparent", border: "none",
    borderBottom: `2px solid ${activeTab === tab ? "#3B82F6" : "transparent"}`,
    color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.38)",
    fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
    padding: "12px 20px", cursor: "pointer",
    transition: "all 0.15s", fontFamily: "inherit",
  });

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", padding: "80px 48px" }}>
        <style>{`@keyframes sk-fade { 0%,100%{opacity:.18} 50%{opacity:.07} }`}</style>
        {[260, 160, 340, 100, 220, 180, 280, 130].map((w, i) => (
          <div key={i} style={{
            height: 13, borderRadius: 5, marginBottom: i === 1 ? 32 : 18,
            background: "rgba(255,255,255,0.18)", maxWidth: w,
            animation: "sk-fade 1.6s ease-in-out infinite",
            animationDelay: `${i * 0.1}s`,
          }} />
        ))}
      </div>
    );
  }

  if (!promo) return null;

  const status     = promo.status;
  const statusCfg  = STATUS_CFG[status];
  const canDelete  = promo.used_count === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(.75)} }
        @keyframes sk-fade    { 0%,100%{opacity:.18} 50%{opacity:.07} }
        select option         { background: #111; }
        input[type="datetime-local"] { color-scheme: dark; }
      `}</style>

      {/* Toast */}
      {notification && (
        <div style={{
          position: "fixed", top: 24, right: 24, zIndex: 1000,
          background: notification.ok ? "#0a1a0e" : "#1a0a0a",
          border: `1px solid ${notification.ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: notification.ok ? "#86efac" : "#fca5a5",
          padding: "12px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
        }}>
          {notification.msg}
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: "#0c0c0c",
        zIndex: 50, gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <a href="/x8k3pz/promotions" style={{ color: "rgba(255,255,255,0.28)", textDecoration: "none", fontSize: 12 }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            Promotions
          </a>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px", fontFamily: "monospace" }}>
            {promo.code}
          </span>
          {/* Status badge */}
          <span style={{
            background: statusCfg.bg, border: `1px solid ${statusCfg.border}`,
            color: statusCfg.color, borderRadius: 20,
            padding: "3px 10px 3px 8px", fontSize: 10, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.5px",
            userSelect: "none",
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: status === "active" ? "#22c55e" : statusCfg.color,
              animation: status === "active" ? "pulse-dot 2.4s ease-in-out infinite" : undefined,
            }} />
            {statusCfg.label}
          </span>
        </div>

        {/* Header actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={toggleActive}
            disabled={saving}
            style={{
              background: promo.active ? "rgba(239,68,68,0.05)" : "transparent",
              border: `1px solid ${promo.active ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
              color: promo.active ? "rgba(239,68,68,0.85)" : "#4ade80",
              borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600,
              cursor: "pointer", opacity: saving ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {saving ? "…" : promo.active ? "Révoquer" : "Activer"}
          </button>
          {activeTab === "general" && (
            <button
              onClick={save}
              disabled={saving}
              style={{
                background: "#3B82F6", border: "none", color: "#fff",
                borderRadius: 8, padding: "8px 22px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", opacity: saving ? 0.6 : 1, transition: "opacity 0.15s",
              }}
            >
              {saving ? "…" : "Sauvegarder"}
            </button>
          )}
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "16px 32px" }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {([
            { label: "Utilisations",    value: String(promo.used_count), color: "#fff", sub: promo.max_uses !== null ? `/ ${promo.max_uses} max` : "/ illimité" },
            { label: "Utilisateurs",    value: String(promo.unique_users_count), color: "#60a5fa", sub: "uniques" },
            { label: "Remise",          value: `-${promo.discount_percent}%`, color: "#22c55e", sub: "par utilisation" },
            { label: "Dernier usage",   value: fmtDate(promo.last_used_at), color: "rgba(255,255,255,0.7)", sub: "" },
          ] as { label: string; value: string; color: string; sub: string }[]).map(k => (
            <div key={k.label}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>{k.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: k.color, fontVariantNumeric: "tabular-nums" }}>{k.value}</span>
                {k.sub && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>{k.sub}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", paddingLeft: 32 }}>
        <button style={tabStyle("general")} onClick={() => setActiveTab("general")}>Général</button>
        <button style={tabStyle("history")} onClick={() => setActiveTab("history")}>
          Historique
          {promo.usage_records_count > 0 && (
            <span style={{
              marginLeft: 7, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
              borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 800,
            }}>
              {promo.usage_records_count}
            </span>
          )}
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ padding: "28px 32px", maxWidth: 820, margin: "0 auto" }}>

        {/* ═══════════ TAB GÉNÉRAL ═══════════ */}
        {activeTab === "general" && (
          <>
            {/* Informations générales */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
              <SectionTitle>Informations générales</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={fieldRow}>
                  <Label>Code</Label>
                  <Input value={promo.code} readOnly />
                  {promo.used_count > 0 && (
                    <div style={{ fontSize: 10, color: "rgba(245,158,11,0.7)", marginTop: 5 }}>
                      Code immuable — déjà utilisé {promo.used_count} fois
                    </div>
                  )}
                </div>
                <div style={fieldRow}>
                  <Label required>Remise</Label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Input value={form.discount_percent} onChange={pf("discount_percent")} type="number" />
                    <span style={{ fontSize: 20, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>%</span>
                  </div>
                </div>
              </div>
              <div style={fieldRow}>
                <Label>Nom interne</Label>
                <Input value={form.name} onChange={pf("name")} placeholder="Ex: Campagne été 2026" />
              </div>
            </div>

            {/* Période */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
              <SectionTitle>Période</SectionTitle>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div style={fieldRow}>
                  <Label>Démarre le</Label>
                  <Input value={form.starts_at} onChange={pf("starts_at")} type="datetime-local" />
                </div>
                <div style={fieldRow}>
                  <Label>Expire le</Label>
                  <Input value={form.expires_at} onChange={pf("expires_at")} type="datetime-local" />
                </div>
              </div>
            </div>

            {/* Limites */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
              <SectionTitle>Limites</SectionTitle>
              <div style={fieldRow}>
                <Label>Max utilisations</Label>
                <Input value={form.max_uses} onChange={pf("max_uses")} type="number" placeholder="Illimité si vide" />
                {form.max_uses && Number(form.max_uses) < promo.used_count && (
                  <div style={{ fontSize: 10, color: "#ef4444", marginTop: 5 }}>
                    Max doit être ≥ {promo.used_count} (utilisations actuelles)
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
                <Toggle
                  checked={form.single_use_per_user}
                  onChange={v => setForm(prev => ({ ...prev, single_use_per_user: v }))}
                  label="Usage unique par utilisateur"
                />
              </div>
            </div>

            {/* Ciblage produits */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
              <SectionTitle>Ciblage produits</SectionTitle>
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                {(["all", "specific"] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, targeting_mode: mode }))}
                    style={{
                      padding: "8px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                      cursor: "pointer",
                      background: form.targeting_mode === mode ? "rgba(59,130,246,0.12)" : "transparent",
                      border: `1px solid ${form.targeting_mode === mode ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.1)"}`,
                      color: form.targeting_mode === mode ? "#60a5fa" : "rgba(255,255,255,0.45)",
                    }}
                  >
                    {mode === "all" ? "Tous les produits" : "Produits spécifiques"}
                  </button>
                ))}
              </div>

              {form.targeting_mode === "specific" && (
                <>
                  {products.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12 }}>Chargement des produits…</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {products.map(prod => {
                        const selected = form.product_ids.includes(prod.id);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => toggleProduct(prod.id)}
                            style={{
                              display: "flex", alignItems: "center", gap: 12,
                              padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                              background: selected ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.03)",
                              border: `1px solid ${selected ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)"}`,
                              transition: "all 0.1s",
                            }}
                          >
                            <div style={{
                              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                              background: selected ? "#3B82F6" : "transparent",
                              border: `2px solid ${selected ? "#3B82F6" : "rgba(255,255,255,0.2)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {selected && <div style={{ width: 8, height: 8, background: "#fff", borderRadius: 1 }} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{prod.name}</div>
                              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                                {prod.account_size} · {prod.model.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {form.targeting_mode === "specific" && form.product_ids.length === 0 && (
                    <div style={{ fontSize: 11, color: "rgba(239,68,68,0.7)", marginTop: 10 }}>
                      Aucun produit sélectionné — le code sera refusé à l'utilisation
                    </div>
                  )}
                </>
              )}

              {form.targeting_mode === "all" && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
                  Le code sera accepté sur tous les produits du catalogue.
                </div>
              )}
            </div>

            {/* Affiliation */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
              <SectionTitle>Affiliation</SectionTitle>
              <div style={fieldRow}>
                <Label>Affilié lié</Label>
                <Select value={form.affiliate_user_id} onChange={pf("affiliate_user_id")}>
                  <option value="">Aucun</option>
                  {affiliates.map(a => (
                    <option key={a.user_id} value={a.user_id}>
                      {a.first_name || a.last_name ? `${a.first_name || ""} ${a.last_name || ""}`.trim() : a.email || a.user_id.slice(0, 16)} ({a.code})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Activation */}
            <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
              <SectionTitle>Activation</SectionTitle>
              <Toggle
                checked={form.active}
                onChange={v => setForm(prev => ({ ...prev, active: v }))}
                label={form.active ? "Code actif" : "Code révoqué (inactif)"}
              />
            </div>

            {/* Save CTA */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button
                onClick={save}
                disabled={saving}
                style={{
                  background: "#3B82F6", border: "none", color: "#fff",
                  borderRadius: 8, padding: "10px 28px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Sauvegarde…" : "Sauvegarder les modifications"}
              </button>
            </div>

            {/* ─── Danger Zone ─── */}
            <div style={{
              background: "#0c0c0c", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 12, padding: "24px 28px",
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: "rgba(239,68,68,0.6)",
                letterSpacing: "1.5px", textTransform: "uppercase",
                marginBottom: 18, paddingBottom: 10,
                borderBottom: "1px solid rgba(239,68,68,0.1)",
                paddingLeft: 10, borderLeft: "3px solid rgba(239,68,68,0.3)",
              }}>
                Zone de danger
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 4 }}>
                    Supprimer ce code promo
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                    {canDelete
                      ? "Le code n'a jamais été utilisé — suppression définitive autorisée."
                      : `Code utilisé ${promo.used_count} fois — suppression impossible (révoquer à la place).`}
                  </div>
                </div>
                {canDelete && !confirmDelete && (
                  <button
                    onClick={() => setConfDel(true)}
                    style={{
                      padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                      background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)",
                      color: "rgba(239,68,68,0.85)", cursor: "pointer", flexShrink: 0,
                    }}
                  >
                    Supprimer
                  </button>
                )}
                {canDelete && confirmDelete && (
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Confirmer ?</span>
                    <button
                      onClick={deletePromo}
                      disabled={saving}
                      style={{
                        padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700,
                        background: "#ef4444", border: "none", color: "#fff",
                        cursor: "pointer", opacity: saving ? 0.6 : 1,
                      }}
                    >
                      {saving ? "…" : "Supprimer définitivement"}
                    </button>
                    <button
                      onClick={() => setConfDel(false)}
                      style={{
                        padding: "8px 16px", borderRadius: 6, fontSize: 12,
                        background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.4)", cursor: "pointer",
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ═══════════ TAB HISTORIQUE ═══════════ */}
        {activeTab === "history" && (
          <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
            {usageLoading ? (
              <div style={{ padding: "24px 20px" }}>
                <style>{`@keyframes sk-fade { 0%,100%{opacity:.18} 50%{opacity:.07} }`}</style>
                {[...Array(5)].map((_, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    {[180, 100, 120, 80, 80, 100].map((w, j) => (
                      <div key={j} style={{
                        height: 12, borderRadius: 4, background: "rgba(255,255,255,0.18)", width: w,
                        animation: "sk-fade 1.6s ease-in-out infinite",
                        animationDelay: `${(i * 6 + j) * 0.04}s`,
                      }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : !usage || usage.total === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                Aucune utilisation enregistrée
              </div>
            ) : (
              <>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
                    {usage.total} utilisation{usage.total !== 1 ? "s" : ""} · page {usage.page}/{usage.totalPages}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => { const p = usagePage - 1; setUsagePage(p); loadUsage(p); }}
                      disabled={usagePage <= 1}
                      style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 12,
                        background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.4)", cursor: usagePage <= 1 ? "default" : "pointer",
                        opacity: usagePage <= 1 ? 0.3 : 1,
                      }}
                    >
                      Préc.
                    </button>
                    <button
                      onClick={() => { const p = usagePage + 1; setUsagePage(p); loadUsage(p); }}
                      disabled={!usage || usagePage >= usage.totalPages}
                      style={{
                        padding: "5px 12px", borderRadius: 6, fontSize: 12,
                        background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.4)", cursor: !usage || usagePage >= usage.totalPages ? "default" : "pointer",
                        opacity: !usage || usagePage >= usage.totalPages ? 0.3 : 1,
                      }}
                    >
                      Suiv.
                    </button>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 580 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        {["Date", "Trader", "Produit", "Remise", "Montant payé", "Provider"].map(h => (
                          <th key={h} style={{
                            padding: "11px 16px", textAlign: "left",
                            color: "rgba(255,255,255,0.3)", fontWeight: 600,
                            fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8,
                            whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usage.items.map((row, i) => (
                        <tr key={row.id} style={{ borderBottom: i < usage.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.45)", whiteSpace: "nowrap" }}>
                            {fmtDate(row.used_at)}
                          </td>
                          <td style={{ padding: "12px 16px", maxWidth: 180 }}>
                            <div style={{ color: "#fff", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row.trader_name || row.trader_email || row.user_id.slice(0, 12) + "…"}
                            </div>
                            {row.trader_email && row.trader_name && (
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row.trader_email}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.5)", maxWidth: 140 }}>
                            <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {row.product_name || "—"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#22c55e", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                            -{row.discount_applied}%
                          </td>
                          <td style={{ padding: "12px 16px", color: "rgba(255,255,255,0.6)", fontVariantNumeric: "tabular-nums" }}>
                            {row.amount_paid !== null ? `€${(row.amount_paid / 100).toFixed(2)}` : "—"}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                              background: row.provider === "stripe" ? "rgba(99,102,241,0.1)" : "rgba(245,158,11,0.1)",
                              color: row.provider === "stripe" ? "#818cf8" : "#fbbf24",
                              border: `1px solid ${row.provider === "stripe" ? "rgba(99,102,241,0.2)" : "rgba(245,158,11,0.2)"}`,
                              textTransform: "uppercase",
                            }}>
                              {row.provider}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
