"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ────────────────────────────────────────────────────────
type Phase = {
  id:               string;
  phase_order:      number;
  phase_label:      string;
  phase_type:       "challenge" | "funded";
  profit_target:    number | null;
  daily_drawdown:   number;
  total_drawdown:   number;
  min_trading_days: number;
  max_trading_days: number | null;
  profit_split:     number | null;
  mt5_group:        string | null;
};

type Rule = {
  id:          string;
  rule_key:    string;
  rule_value:  unknown;
  enabled:     boolean;
  description: string | null;
};

type Product = {
  id:                  string;
  slug:                string;
  name:                string;
  description:         string | null;
  model:               "2step" | "1step" | "vip";
  account_size:        string;
  balance_usd:         number;
  price_eur_cents:     number;
  price_crypto_cents:  number | null;
  leverage:            number;
  max_cumul_usd:       number | null;
  display_order:       number;
  mt5_group_challenge: string | null;
  mt5_group_funded:    string | null;
  active:              boolean;
  version:             number;
  phases:              Phase[];
  rules:               Rule[];
  challenge_count:     { active: number; funded: number; total: number };
};

// ── Atomic UI ────────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 10, fontWeight: 600, letterSpacing: "1.5px",
    textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6,
  }}>
    {children}
  </div>
);

// P1#3: input border rgba(255,255,255,0.1) (from 0.08), bg légèrement plus visible
const inputBaseStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, padding: "9px 12px",
  color: "#fff", fontSize: 13, fontWeight: 500,
  width: "100%", outline: "none", fontFamily: "inherit",
};

const readOnlyStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, padding: "9px 12px",
  color: "rgba(255,255,255,0.35)", fontSize: 13, fontWeight: 400,
  width: "100%", outline: "none", fontFamily: "inherit",
};

const Input = ({
  value, onChange, type = "text", readOnly = false, suffix,
}: {
  value: string | number;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  suffix?: string;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <input
      type={type}
      value={value}
      readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      style={readOnly ? readOnlyStyle : inputBaseStyle}
      onFocus={e => { if (!readOnly) e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
    />
    {suffix && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{suffix}</span>}
  </div>
);

const Textarea = ({
  value, onChange, placeholder,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
}) => (
  <textarea
    value={value}
    onChange={e => onChange?.(e.target.value)}
    placeholder={placeholder}
    rows={3}
    style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6, padding: "9px 12px",
      color: "#fff", fontSize: 13, fontWeight: 500,
      width: "100%", outline: "none", fontFamily: "inherit",
      resize: "vertical", minHeight: 72, boxSizing: "border-box",
    }}
    onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
  />
);

// P1#3: Select border → rgba(255,255,255,0.1)
const Select = ({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 6, padding: "9px 12px",
      color: "#fff", fontSize: 13, fontWeight: 500,
      width: "100%", outline: "none", fontFamily: "inherit", cursor: "pointer",
    }}
  >
    {options.map(o => <option key={o.value} value={o.value} style={{ background: "#111" }}>{o.label}</option>)}
  </select>
);

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
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
);

// P1#3: SectionTitle — border bottom plus contrastée
const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.22)",
    letterSpacing: "2px", textTransform: "uppercase",
    marginBottom: 18, paddingBottom: 10,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  }}>
    {children}
  </div>
);

// ── Page principale ──────────────────────────────────────────────
export default function ProductEditorPage() {
  const router    = useRouter();
  const params    = useParams();
  const productId = params.id as string;
  const isNew     = productId === "new";

  const [product, setProduct]             = useState<Product | null>(null);
  const [loading, setLoading]             = useState(!isNew);
  const [saving, setSaving]               = useState(false);
  const [activeTab, setActiveTab]         = useState<"general" | "phases" | "rules">("general");
  const [notification, setNotification]   = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [windowWidth, setWindowWidth]     = useState(1400);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handle = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const isCompact = windowWidth < 1100;

  const [form, setForm] = useState({
    name: "", description: "", model: "2step", account_size: "$25,000",
    balance_usd: "25000",
    price_eur: "",
    price_crypto: "",
    leverage: "100", max_cumul_usd: "", display_order: "0",
    mt5_group_challenge: "", mt5_group_funded: "", slug: "",
  });

  const [phases, setPhases]             = useState<Phase[]>([]);
  const [editingPhase, setEditingPhase] = useState<number | null>(null);
  const [phaseForm, setPhaseForm]       = useState<Partial<Phase>>({});
  const [rules, setRules]               = useState<Rule[]>([]);
  const [editingRule, setEditingRule]   = useState<string | null>(null);
  const [ruleForm, setRuleForm]         = useState<{ rule_value: string }>({ rule_value: "" });

  const notify = (msg: string, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 3500);
  };

  const pf = (field: keyof typeof form) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }));

  const syncFormFromProduct = (p: Product) => {
    setForm({
      name:                p.name,
      description:         p.description  || "",
      model:               p.model,
      account_size:        p.account_size,
      balance_usd:         String(p.balance_usd),
      price_eur:           String(p.price_eur_cents / 100),
      price_crypto:        p.price_crypto_cents !== null ? String(p.price_crypto_cents / 100) : "",
      leverage:            String(p.leverage),
      max_cumul_usd:       p.max_cumul_usd !== null ? String(p.max_cumul_usd) : "",
      display_order:       String(p.display_order),
      mt5_group_challenge: p.mt5_group_challenge || "",
      mt5_group_funded:    p.mt5_group_funded    || "",
      slug:                p.slug,
    });
    setPhases(p.phases ?? []);
    setRules(p.rules ?? []);
  };

  const BALANCES: Record<string, string> = {
    "$10,000": "10000", "$25,000": "25000", "$50,000": "50000",
    "$100,000": "100000", "$200,000": "200000",
  };

  const fetchProduct = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}`, { headers: { "x-admin-key": ADMIN_KEY } });
      const data = await res.json();
      if (res.ok) { setProduct(data); syncFormFromProduct(data); }
      else notify(data.error || "Produit introuvable", false);
    } catch { notify("Erreur réseau", false); }
    finally { setLoading(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isNew]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  // ── Actions (logique métier inchangée) ────────────────────────

  const saveGeneral = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:                form.name,
        description:         form.description || null,
        model:               form.model,
        account_size:        form.account_size,
        balance_usd:         Number(form.balance_usd),
        price_eur_cents:     Math.round(Number(form.price_eur) * 100),
        price_crypto_cents:  form.price_crypto ? Math.round(Number(form.price_crypto) * 100) : null,
        leverage:            Number(form.leverage) || 100,
        max_cumul_usd:       form.max_cumul_usd ? Number(form.max_cumul_usd) : null,
        display_order:       Number(form.display_order) || 0,
        mt5_group_challenge: form.mt5_group_challenge || null,
        mt5_group_funded:    form.mt5_group_funded    || null,
      };
      if (isNew) {
        payload.slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const res  = await fetch("/api/admin/products", { method: "POST", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok) { notify("Produit créé !"); router.push(`/x8k3pz/products/${data.id}`); }
        else notify(data.error || "Erreur lors de la création", false);
      } else {
        const res  = await fetch(`/api/admin/products/${productId}`, { method: "PUT", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (res.ok) { setProduct(data); notify("Modifications sauvegardées"); }
        else notify(data.error || "Erreur lors de la sauvegarde", false);
      }
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}`, { method: "PUT", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ active: !product.active }) });
      const data = await res.json();
      if (res.ok) { setProduct(data); notify(data.active ? "Produit activé" : "Produit désactivé"); }
      else notify(data.error || "Erreur", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  const duplicate = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}/duplicate`, { method: "POST", headers: { "x-admin-key": ADMIN_KEY } });
      const data = await res.json();
      if (res.ok) { notify(`Dupliqué — ${data.product.slug}`); router.push(`/x8k3pz/products/${data.product.id}`); }
      else notify(data.error || "Erreur lors de la duplication", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  const deleteProduct = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}`, { method: "DELETE", headers: { "x-admin-key": ADMIN_KEY } });
      const data = await res.json();
      if (res.ok) { notify("Produit supprimé"); router.push("/x8k3pz/products"); }
      else notify(data.error || "Erreur lors de la suppression", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); setConfirmDelete(false); }
  };

  const savePhase = async (phase_order: number) => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}/phases`, { method: "PUT", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ phase_order, ...phaseForm }) });
      const data = await res.json();
      if (res.ok) { setPhases(prev => prev.map(ph => ph.phase_order === phase_order ? { ...ph, ...data } : ph)); setEditingPhase(null); notify("Phase sauvegardée"); }
      else notify(data.error || "Erreur", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  const saveRule = async (rule_key: string) => {
    setSaving(true);
    try {
      let parsedValue: unknown = ruleForm.rule_value;
      try { parsedValue = JSON.parse(ruleForm.rule_value); } catch { /* garder comme string */ }
      const res  = await fetch(`/api/admin/products/${productId}/rules`, { method: "PUT", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ rule_key, rule_value: parsedValue }) });
      const data = await res.json();
      if (res.ok) { setRules(prev => prev.map(r => r.rule_key === rule_key ? { ...r, ...data } : r)); setEditingRule(null); notify("Règle sauvegardée"); }
      else notify(data.error || "Erreur", false);
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  const toggleRule = async (rule: Rule) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/rules`, { method: "PUT", headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" }, body: JSON.stringify({ rule_key: rule.rule_key, enabled: !rule.enabled }) });
      if (res.ok) setRules(prev => prev.map(r => r.rule_key === rule.rule_key ? { ...r, enabled: !r.enabled } : r));
      else notify("Erreur toggle règle", false);
    } catch { notify("Erreur réseau", false); }
  };

  // ── Computed ──────────────────────────────────────────────────
  const tabStyle = (tab: string) => ({
    background: "transparent", border: "none",
    borderBottom: `2px solid ${activeTab === tab ? "#3B82F6" : "transparent"}`,
    color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.38)",
    fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
    padding: "12px 20px", cursor: "pointer", transition: "all 0.15s", fontFamily: "inherit",
  });

  const cnt    = product?.challenge_count;
  const hasAny = (cnt?.total ?? 0) > 0;
  const title  = isNew ? "Nouveau produit" : (product?.name ?? "—");
  const fieldRow = { marginBottom: 20 };

  // P1#3: Loading state sur surface #050505
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  return (
    // P1#3: surface page → #050505
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

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
        position: "sticky", top: 0,
        // P1#3: header sticky sur surface #050505
        background: "#050505",
        zIndex: 50, gap: 12, flexWrap: "wrap",
      }}>
        {/* Breadcrumb + titre + badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* P1#4: "Produits /" en 12px muted, nom du produit en 20px/800 */}
          <a href="/x8k3pz/products" style={{ color: "rgba(255,255,255,0.28)", textDecoration: "none", fontSize: 12 }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            Produits
          </a>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>{title}</span>

          {/* Badge statut — indicateur pur, non cliquable */}
          {!isNew && product && (
            <span style={{
              background: product.active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.06)",
              border: `1px solid ${product.active ? "rgba(34,197,94,0.22)" : "rgba(255,255,255,0.1)"}`,
              color: product.active ? "#4ade80" : "rgba(255,255,255,0.38)",
              borderRadius: 20, padding: "3px 10px 3px 8px", fontSize: 11, fontWeight: 700,
              display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.5px",
              userSelect: "none",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: product.active ? "#22c55e" : "rgba(255,255,255,0.25)" }} />
              {product.active ? "ACTIF" : "INACTIF"}
            </span>
          )}
        </div>

        {/* Actions header */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {!isNew && product && (
            <button
              onClick={toggleActive}
              disabled={saving}
              style={{
                background: "transparent",
                border: `1px solid ${product.active ? "rgba(255,255,255,0.12)" : "rgba(34,197,94,0.25)"}`,
                color: product.active ? "rgba(255,255,255,0.45)" : "#4ade80",
                borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 600,
                cursor: "pointer", opacity: saving ? 0.6 : 1, whiteSpace: "nowrap",
              }}
            >
              {saving ? "…" : product.active ? "Désactiver" : "Activer"}
            </button>
          )}
          {!isNew && (
            <button
              onClick={duplicate}
              disabled={saving}
              style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.48)", borderRadius: 6, padding: "8px 14px",
                fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              Dupliquer
            </button>
          )}
          {/* P1#1: Sauvegarder uniquement visible sur l'onglet Général */}
          {activeTab === "general" && (
            <button
              onClick={saveGeneral}
              disabled={saving}
              style={{
                background: "#3B82F6", border: "none", color: "#fff",
                borderRadius: 8, padding: "8px 22px", fontSize: 13, fontWeight: 700,
                cursor: "pointer", opacity: saving ? 0.6 : 1,
                transition: "opacity 0.15s", whiteSpace: "nowrap",
              }}
            >
              {saving ? "…" : isNew ? "Créer le produit" : "Sauvegarder"}
            </button>
          )}
        </div>
      </div>

      {/* ── Bannière sécurité ────────────────────────────────────── */}
      {!isNew && hasAny && (
        <div style={{
          background: "rgba(245,158,11,0.05)",
          borderBottom: "1px solid rgba(245,158,11,0.12)",
          padding: "9px 32px",
          display: "flex", alignItems: "center", gap: 8,
          fontSize: 12, color: "rgba(245,158,11,0.75)",
        }}>
          <span>⚠</span>
          <span>
            Ce produit est utilisé par{" "}
            <strong style={{ color: "rgba(245,158,11,0.95)" }}>{cnt!.total} challenge{cnt!.total > 1 ? "s" : ""}</strong>
            {cnt!.active > 0 ? ` (${cnt!.active} actif${cnt!.active > 1 ? "s" : ""})` : ""}
            {cnt!.funded > 0 ? `, ${cnt!.funded} certifié${cnt!.funded > 1 ? "s" : ""}` : ""}
            {" "}— les modifications n&apos;affectent pas les challenges existants.
          </span>
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────── */}
      {/* P1#3: border bottom plus contrastée */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0 32px", display: "flex" }}>
        <button style={tabStyle("general")} onClick={() => setActiveTab("general")}>Général</button>
        {!isNew && (
          <>
            <button style={tabStyle("phases")} onClick={() => setActiveTab("phases")}>
              Phases{phases.length > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginLeft: 5 }}>{phases.length}</span>}
            </button>
            <button style={tabStyle("rules")} onClick={() => setActiveTab("rules")}>
              Règles{rules.length > 0 && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginLeft: 5 }}>{rules.length}</span>}
            </button>
          </>
        )}
      </div>

      {/* ── Layout (form + sidebar) ──────────────────────────────── */}
      <div style={{
        display: "flex", flexDirection: isCompact ? "column" : "row",
        alignItems: "flex-start", maxWidth: 1120, margin: "0 auto", padding: "0 32px",
      }}>

        {/* ── Zone de formulaire ───────────────────────────────── */}
        <div style={{
          flex: 1, minWidth: 0, padding: "32px 0",
          paddingRight: !isNew && !isCompact ? 40 : 0,
        }}>

          {/* P10 — Guide création */}
          {isNew && (
            <div style={{
              marginBottom: 24, padding: "10px 16px",
              background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)",
              borderRadius: 8, fontSize: 12, color: "rgba(255,255,255,0.45)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ color: "#60a5fa", fontWeight: 700 }}>Étape 1/3</span>
              <span>— Après création, vous configurerez les phases et les règles.</span>
            </div>
          )}

          {/* ── TAB GÉNÉRAL ─────────────────────────────────────── */}
          {activeTab === "general" && (
            <div>
              {/* Informations commerciales */}
              <div style={{ marginBottom: 36 }}>
                <SectionTitle>Informations commerciales</SectionTitle>
                <div style={fieldRow}>
                  <Label>Nom du produit</Label>
                  <Input value={form.name} onChange={pf("name")} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                  <div>
                    <Label>Slug (identifiant URL)</Label>
                    <Input value={form.slug} onChange={isNew ? pf("slug") : undefined} readOnly={!isNew} />
                  </div>
                  <div>
                    <Label>Modèle</Label>
                    <Select value={form.model} onChange={pf("model")} options={[
                      { value: "2step", label: "2-Step Challenge" },
                      { value: "1step", label: "1-Step Challenge" },
                      { value: "vip",   label: "VIP / Algo" },
                    ]} />
                  </div>
                </div>
                <div style={fieldRow}>
                  <Label>Description (optionnel)</Label>
                  <Textarea value={form.description} onChange={pf("description")} placeholder="Description visible par les clients…" />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                  <div>
                    <Label>Taille du compte</Label>
                    <Select
                      value={form.account_size}
                      onChange={v => setForm(prev => ({ ...prev, account_size: v, balance_usd: BALANCES[v] || prev.balance_usd }))}
                      options={["$10,000","$25,000","$50,000","$100,000","$200,000"].map(s => ({ value: s, label: s }))}
                    />
                  </div>
                  <div>
                    <Label>Plafond cumul max</Label>
                    <Input value={form.max_cumul_usd} onChange={pf("max_cumul_usd")} type="number" suffix="USD" />
                  </div>
                </div>
                {/* Prix en euros — labels sans "(€)" redondant, suffix sur le champ */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                  <div>
                    <Label>Prix carte</Label>
                    <Input value={form.price_eur} onChange={pf("price_eur")} type="number" suffix="€" />
                  </div>
                  <div>
                    <Label>Prix crypto</Label>
                    <Input value={form.price_crypto} onChange={pf("price_crypto")} type="number" suffix={form.price_crypto ? "€" : "identique"} />
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 5 }}>
                      Vide = identique au prix carte
                    </div>
                  </div>
                </div>
              </div>

              {/* Paramètres techniques */}
              <div style={{ marginBottom: 36 }}>
                <SectionTitle>Paramètres techniques</SectionTitle>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, ...fieldRow }}>
                  <div>
                    <Label>Balance simulée</Label>
                    <Input value={form.balance_usd} onChange={pf("balance_usd")} type="number" suffix="USD" />
                  </div>
                  <div>
                    <Label>Levier</Label>
                    <Input value={form.leverage} onChange={pf("leverage")} type="number" suffix=":1" />
                  </div>
                  <div>
                    <Label>Ordre d&apos;affichage</Label>
                    <Input value={form.display_order} onChange={pf("display_order")} type="number" />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                  <div>
                    <Label>Groupe MT5 (challenge)</Label>
                    <Input value={form.mt5_group_challenge} onChange={pf("mt5_group_challenge")} />
                  </div>
                  <div>
                    <Label>Groupe MT5 (funded)</Label>
                    <Input value={form.mt5_group_funded} onChange={pf("mt5_group_funded")} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB PHASES ──────────────────────────────────────── */}
          {activeTab === "phases" && (
            <div>
              {phases.length === 0 ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Aucune phase définie</div>
              ) : (
                phases.map((phase, idx) => {
                  const isFunded  = phase.phase_type === "funded";
                  const accent    = isFunded ? "#4ade80" : "#60a5fa";
                  const isEditing = editingPhase === phase.phase_order;

                  return (
                    <div key={phase.phase_order}>
                      {/* P1#3: Phase card — surface #0c0c0c, border rgba(255,255,255,0.1) */}
                      <div style={{
                        border: `1px solid ${isEditing ? accent + "55" : "rgba(255,255,255,0.1)"}`,
                        borderLeft: `3px solid ${accent}`,
                        borderRadius: 8, overflow: "hidden",
                        background: isEditing ? "#111" : "#0c0c0c",
                        transition: "all 0.2s",
                      }}>
                        {/* Résumé */}
                        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: `${accent}15`, border: `1px solid ${accent}28`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isFunded ? 15 : 14, fontWeight: 800, color: accent, flexShrink: 0 }}>
                              {isFunded ? "✓" : phase.phase_order}
                            </div>
                            <div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", lineHeight: 1 }}>{phase.phase_label}</div>
                              {/* Sous-titre uniquement pour funded */}
                              {isFunded && (
                                <div style={{ fontSize: 11, color: accent, marginTop: 4, fontWeight: 600 }}>Compte Certifié</div>
                              )}
                            </div>
                          </div>

                          {/* Métriques */}
                          <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                            {phase.profit_target !== null && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{phase.profit_target}%</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>Objectif</div>
                              </div>
                            )}
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{phase.daily_drawdown}%</div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>DD/jour</div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{phase.total_drawdown}%</div>
                              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>DD total</div>
                            </div>
                            {phase.min_trading_days > 0 && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{phase.min_trading_days}</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>j. min</div>
                              </div>
                            )}
                            {phase.profit_split !== null && (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontSize: 16, fontWeight: 800, color: "#4ade80", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{phase.profit_split}%</div>
                                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 3 }}>Split</div>
                              </div>
                            )}
                            <button
                              onClick={() => {
                                if (isEditing) { setEditingPhase(null); return; }
                                setEditingPhase(phase.phase_order);
                                setPhaseForm({
                                  phase_label:      phase.phase_label,
                                  profit_target:    phase.profit_target,
                                  daily_drawdown:   phase.daily_drawdown,
                                  total_drawdown:   phase.total_drawdown,
                                  min_trading_days: phase.min_trading_days,
                                  max_trading_days: phase.max_trading_days,
                                  profit_split:     phase.profit_split,
                                  mt5_group:        phase.mt5_group,
                                });
                              }}
                              style={{
                                fontSize: 11, fontWeight: 600,
                                color: isEditing ? accent : "rgba(255,255,255,0.32)",
                                background: isEditing ? `${accent}14` : "rgba(255,255,255,0.05)",
                                border: `1px solid ${isEditing ? accent + "38" : "rgba(255,255,255,0.1)"}`,
                                borderRadius: 5, padding: "6px 14px",
                                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                                marginLeft: "auto",
                              }}
                            >
                              {isEditing ? "Fermer" : "Modifier"}
                            </button>
                          </div>
                        </div>

                        {/* Accordéon */}
                        {isEditing && (
                          // P1#3: accordéon sur surface #111
                          <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.1)", background: "#111" }}>
                            <div style={{ marginBottom: 16 }}>
                              <Label>Label de la phase</Label>
                              <Input value={phaseForm.phase_label ?? ""} onChange={v => setPhaseForm(p => ({ ...p, phase_label: v }))} />
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                              <div>
                                <Label>Objectif profit</Label>
                                <Input value={phaseForm.profit_target ?? ""} onChange={v => setPhaseForm(p => ({ ...p, profit_target: v === "" ? null : Number(v) }))} type="number" suffix="%" />
                              </div>
                              <div>
                                <Label>Drawdown journalier</Label>
                                <Input value={phaseForm.daily_drawdown ?? ""} onChange={v => setPhaseForm(p => ({ ...p, daily_drawdown: Number(v) }))} type="number" suffix="%" />
                              </div>
                              <div>
                                <Label>Drawdown total</Label>
                                <Input value={phaseForm.total_drawdown ?? ""} onChange={v => setPhaseForm(p => ({ ...p, total_drawdown: Number(v) }))} type="number" suffix="%" />
                              </div>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                              <div>
                                <Label>Jours min</Label>
                                <Input value={phaseForm.min_trading_days ?? ""} onChange={v => setPhaseForm(p => ({ ...p, min_trading_days: Number(v) }))} type="number" suffix="j" />
                              </div>
                              <div>
                                <Label>Jours max</Label>
                                <Input value={phaseForm.max_trading_days ?? ""} onChange={v => setPhaseForm(p => ({ ...p, max_trading_days: v === "" ? null : Number(v) }))} type="number" />
                                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 5 }}>Vide = illimité</div>
                              </div>
                              <div>
                                <Label>Partage profits</Label>
                                <Input value={phaseForm.profit_split ?? ""} onChange={v => setPhaseForm(p => ({ ...p, profit_split: v === "" ? null : Number(v) }))} type="number" suffix="%" />
                              </div>
                            </div>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button onClick={() => setEditingPhase(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.45)", borderRadius: 6, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                              <button onClick={() => savePhase(phase.phase_order)} disabled={saving} style={{ background: "#3B82F6", border: "none", color: "#fff", borderRadius: 6, padding: "8px 22px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                {saving ? "…" : "Sauvegarder"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Connecteur entre phases */}
                      {idx < phases.length - 1 && (
                        <div style={{ margin: "6px 0 6px 37px", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                          <div style={{ width: 2, height: 20, background: "rgba(255,255,255,0.1)" }} />
                          <div style={{ marginTop: -2, fontSize: 10, color: "rgba(255,255,255,0.2)", lineHeight: 1 }}>▼</div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── TAB RÈGLES ──────────────────────────────────────── */}
          {activeTab === "rules" && (
            <div>
              {rules.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>Aucune règle définie</div>
              ) : (
                rules.map(rule => {
                  const isEditing    = editingRule === rule.rule_key;
                  const displayValue = typeof rule.rule_value === "object" ? JSON.stringify(rule.rule_value) : String(rule.rule_value);
                  return (
                    <div key={rule.rule_key} style={{
                      padding: "14px 20px",
                      // P1#3: rule rows border plus contrastée
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                      display: "flex", flexDirection: "column", gap: isEditing ? 12 : 0,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <Toggle checked={rule.enabled} onChange={() => toggleRule(rule)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: rule.enabled ? "#fff" : "rgba(255,255,255,0.28)", fontFamily: "ui-monospace, 'Cascadia Code', monospace" }}>{rule.rule_key}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: rule.enabled ? "#60a5fa" : "rgba(255,255,255,0.18)", fontVariantNumeric: "tabular-nums" }}>{displayValue}</span>
                          </div>
                          {rule.description && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 2 }}>{rule.description}</div>}
                        </div>
                        <button
                          onClick={() => {
                            if (isEditing) { setEditingRule(null); return; }
                            setEditingRule(rule.rule_key);
                            setRuleForm({ rule_value: displayValue });
                          }}
                          style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.32)", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}
                        >
                          {isEditing ? "Annuler" : "Modifier"}
                        </button>
                      </div>
                      {isEditing && (
                        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingLeft: 48 }}>
                          <div style={{ flex: 1 }}>
                            <Label>Nouvelle valeur</Label>
                            <Input value={ruleForm.rule_value} onChange={v => setRuleForm({ rule_value: v })} />
                          </div>
                          <button onClick={() => saveRule(rule.rule_key)} disabled={saving} style={{ background: "#3B82F6", border: "none", color: "#fff", borderRadius: 6, padding: "9px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                            {saving ? "…" : "Enregistrer"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── DANGER ZONE — P1#2: uniquement sur l'onglet Général ── */}
          {!isNew && activeTab === "general" && (
            <div style={{ marginTop: 64, paddingTop: 32, borderTop: "1px solid rgba(239,68,68,0.1)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(239,68,68,0.38)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
                Zone dangereuse
              </div>

              {hasAny ? (
                <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8, padding: "20px 24px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
                    Supprimer ce produit
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.7 }}>
                    Ce produit est associé à{" "}
                    <strong style={{ color: "rgba(255,255,255,0.55)" }}>{cnt!.total} challenge{cnt!.total > 1 ? "s" : ""}</strong>.
                    {" "}La suppression est désactivée pour protéger les données existantes.
                    Pour retirer ce produit de la vente, utilisez le bouton <strong style={{ color: "rgba(255,255,255,0.45)" }}>Désactiver</strong> en haut de la page.
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 20, background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)", borderRadius: 8, padding: "20px 24px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>Supprimer ce produit</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.6 }}>Cette action est irréversible. Aucun challenge n&apos;est associé à ce produit.</div>
                  </div>
                  {confirmDelete ? (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => setConfirmDelete(false)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.38)", borderRadius: 6, padding: "9px 14px", fontSize: 12, cursor: "pointer" }}>Annuler</button>
                      <button onClick={deleteProduct} disabled={saving} style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "9px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                        {saving ? "…" : "Confirmer la suppression"}
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)} style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.18)", color: "rgba(239,68,68,0.55)", borderRadius: 6, padding: "9px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                      Supprimer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>{/* /form */}

        {/* ── Sidebar Aperçu client ────────────────────────────── */}
        {!isNew && (
          <div style={{
            width: isCompact ? "100%" : 256,
            flexShrink: 0,
            padding: isCompact ? "0 0 40px" : "32px 0",
            position: isCompact ? "static" : "sticky",
            top: 56,
            maxHeight: isCompact ? "none" : "calc(100vh - 56px)",
            overflowY: isCompact ? "visible" : "auto",
          }}>
            {/* P1#3: sidebar card → #0c0c0c + border rgba(255,255,255,0.1) */}
            <div style={{
              background: "#0c0c0c",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, padding: "20px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16 }}>
                Aperçu client
              </div>

              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 3 }}>{form.name || "—"}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginBottom: 16 }}>
                {form.account_size} · {form.model === "2step" ? "2-Step" : form.model === "1step" ? "1-Step" : "VIP"}
              </div>

              <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", letterSpacing: "-1px", lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
                {form.price_eur ? `€${form.price_eur}` : "—"}
              </div>
              {form.price_crypto && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginBottom: 4 }}>
                  Crypto : €{form.price_crypto}
                </div>
              )}

              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />

              {phases.length > 0 ? (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Parcours</div>
                  {phases.map((ph, idx) => (
                    <div key={ph.phase_order} style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: ph.phase_type === "funded" ? "#4ade80" : "#60a5fa", marginBottom: 5 }}>{ph.phase_label}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.7 }}>
                        {ph.profit_target !== null && <div>Objectif {ph.profit_target}%</div>}
                        <div>DD {ph.daily_drawdown}% / {ph.total_drawdown}%</div>
                        {ph.min_trading_days > 0 && <div>{ph.min_trading_days} jours min</div>}
                        {ph.profit_split !== null && <div>Split trader {ph.profit_split}%</div>}
                      </div>
                      {idx < phases.length - 1 && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginTop: 8 }}>↓</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.18)" }}>Aucune phase</div>
              )}

              {rules.filter(r => r.enabled).length > 0 && (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "16px 0" }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.22)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 10 }}>Règles actives</div>
                  {rules.filter(r => r.enabled).map(r => (
                    <div key={r.rule_key} style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 5, display: "flex", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontFamily: "ui-monospace, 'Cascadia Code', monospace", color: "rgba(255,255,255,0.3)", wordBreak: "break-all" }}>{r.rule_key}</span>
                      <span style={{ color: "#60a5fa", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                        {typeof r.rule_value === "object" ? JSON.stringify(r.rule_value) : String(r.rule_value)}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        )}

      </div>{/* /layout */}
    </div>
  );
}
