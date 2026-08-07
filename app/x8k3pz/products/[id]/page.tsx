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

// ── Helpers UI ───────────────────────────────────────────────────
const Label = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "1.5px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>
    {children}
  </div>
);

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
      style={{
        background: readOnly ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 6, padding: "9px 12px", color: readOnly ? "rgba(255,255,255,0.35)" : "#fff",
        fontSize: 13, fontWeight: readOnly ? 400 : 500, width: "100%",
        outline: "none", fontFamily: "inherit",
      }}
      onFocus={e => { if (!readOnly) e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
      onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
    />
    {suffix && <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>{suffix}</span>}
  </div>
);

const Select = ({ value, onChange, options }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{
      background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontWeight: 500,
      width: "100%", outline: "none", fontFamily: "inherit", cursor: "pointer",
    }}
  >
    {options.map(o => <option key={o.value} value={o.value} style={{ background: "#111" }}>{o.label}</option>)}
  </select>
);

// Toggle switch
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: 36, height: 20, borderRadius: 10, border: "none", cursor: "pointer",
      background: checked ? "#22c55e" : "rgba(255,255,255,0.15)",
      position: "relative", transition: "background 0.2s", flexShrink: 0,
    }}
  >
    <div style={{
      width: 14, height: 14, borderRadius: "50%", background: "#fff",
      position: "absolute", top: 3, left: checked ? 18 : 4,
      transition: "left 0.2s",
    }} />
  </button>
);

// ── Page principale ──────────────────────────────────────────────
export default function ProductEditorPage() {
  const router   = useRouter();
  const params   = useParams();
  const productId = params.id as string;
  const isNew    = productId === "new";

  const [product, setProduct]     = useState<Product | null>(null);
  const [loading, setLoading]     = useState(!isNew);
  const [saving, setSaving]       = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "phases" | "rules">("general");
  const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Formulaire "Général" (états éditables)
  const [form, setForm] = useState({
    name: "", description: "", model: "2step", account_size: "$25,000",
    balance_usd: "25000", price_eur_cents: "", price_crypto_cents: "",
    leverage: "100", max_cumul_usd: "", display_order: "0",
    mt5_group_challenge: "", mt5_group_funded: "",
    slug: "",
  });

  // Phases édition
  const [phases, setPhases]      = useState<Phase[]>([]);
  const [editingPhase, setEditingPhase] = useState<number | null>(null);
  const [phaseForm, setPhaseForm] = useState<Partial<Phase>>({});

  // Règles édition
  const [rules, setRules]         = useState<Rule[]>([]);
  const [editingRule, setEditingRule] = useState<string | null>(null);
  const [ruleForm, setRuleForm]   = useState<{ rule_value: string }>({ rule_value: "" });

  const notify = (msg: string, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 3500);
  };

  const pf = (field: keyof typeof form) => (v: string) =>
    setForm(prev => ({ ...prev, [field]: v }));

  // Sync form depuis le produit chargé
  const syncFormFromProduct = (p: Product) => {
    setForm({
      name:                p.name,
      description:         p.description  || "",
      model:               p.model,
      account_size:        p.account_size,
      balance_usd:         String(p.balance_usd),
      price_eur_cents:     String(p.price_eur_cents),
      price_crypto_cents:  p.price_crypto_cents !== null ? String(p.price_crypto_cents) : "",
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

  // Auto-fill balance from account_size
  const BALANCES: Record<string, string> = {
    "$10,000": "10000", "$25,000": "25000", "$50,000": "50000",
    "$100,000": "100000", "$200,000": "200000",
  };

  const fetchProduct = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok) {
        setProduct(data);
        syncFormFromProduct(data);
      } else {
        notify(data.error || "Produit introuvable", false);
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, isNew]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  // ── Actions ────────────────────────────────────────────────────

  const saveGeneral = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name:                form.name,
        description:         form.description || null,
        model:               form.model,
        account_size:        form.account_size,
        balance_usd:         Number(form.balance_usd),
        price_eur_cents:     Number(form.price_eur_cents),
        price_crypto_cents:  form.price_crypto_cents ? Number(form.price_crypto_cents) : null,
        leverage:            Number(form.leverage) || 100,
        max_cumul_usd:       form.max_cumul_usd ? Number(form.max_cumul_usd) : null,
        display_order:       Number(form.display_order) || 0,
        mt5_group_challenge: form.mt5_group_challenge || null,
        mt5_group_funded:    form.mt5_group_funded    || null,
      };

      if (isNew) {
        payload.slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const res  = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          notify("Produit créé !");
          router.push(`/x8k3pz/products/${data.id}`);
        } else {
          notify(data.error || "Erreur lors de la création", false);
        }
      } else {
        const res = await fetch(`/api/admin/products/${productId}`, {
          method: "PUT",
          headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok) {
          setProduct(data);
          notify("Modifications sauvegardées");
        } else {
          notify(data.error || "Erreur lors de la sauvegarde", false);
        }
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!product) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });
      const data = await res.json();
      if (res.ok) {
        setProduct(data);
        notify(data.active ? "Produit activé" : "Produit désactivé");
      } else {
        notify(data.error || "Erreur", false);
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}/duplicate`, {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Dupliqué — ${data.product.slug}`);
        router.push(`/x8k3pz/products/${data.product.id}`);
      } else {
        notify(data.error || "Erreur lors de la duplication", false);
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok) {
        notify("Produit désactivé");
        router.push("/x8k3pz/products");
      } else {
        notify(data.error || "Erreur lors de la suppression", false);
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  // Sauvegarder une phase
  const savePhase = async (phase_order: number) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}/phases`, {
        method: "PUT",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ phase_order, ...phaseForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setPhases(prev => prev.map(ph => ph.phase_order === phase_order ? { ...ph, ...data } : ph));
        setEditingPhase(null);
        notify("Phase sauvegardée");
      } else {
        notify(data.error || "Erreur", false);
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setSaving(false);
    }
  };

  // Sauvegarder une règle
  const saveRule = async (rule_key: string) => {
    setSaving(true);
    try {
      let parsedValue: unknown = ruleForm.rule_value;
      try { parsedValue = JSON.parse(ruleForm.rule_value); } catch { /* garder comme string */ }

      const res = await fetch(`/api/admin/products/${productId}/rules`, {
        method: "PUT",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ rule_key, rule_value: parsedValue }),
      });
      const data = await res.json();
      if (res.ok) {
        setRules(prev => prev.map(r => r.rule_key === rule_key ? { ...r, ...data } : r));
        setEditingRule(null);
        notify("Règle sauvegardée");
      } else {
        notify(data.error || "Erreur", false);
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setSaving(false);
    }
  };

  // Basculer enabled d'une règle
  const toggleRule = async (rule: Rule) => {
    try {
      const res = await fetch(`/api/admin/products/${productId}/rules`, {
        method: "PUT",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ rule_key: rule.rule_key, enabled: !rule.enabled }),
      });
      if (res.ok) {
        setRules(prev => prev.map(r => r.rule_key === rule.rule_key ? { ...r, enabled: !r.enabled } : r));
      } else {
        notify("Erreur toggle règle", false);
      }
    } catch {
      notify("Erreur réseau", false);
    }
  };

  // ── Styles tabs ───────────────────────────────────────────────
  const tabStyle = (tab: string) => ({
    background: "transparent", border: "none",
    borderBottom: `2px solid ${activeTab === tab ? "#3B82F6" : "transparent"}`,
    color: activeTab === tab ? "#fff" : "rgba(255,255,255,0.4)",
    fontSize: 13, fontWeight: activeTab === tab ? 700 : 500,
    padding: "12px 20px", cursor: "pointer", transition: "all 0.15s",
    fontFamily: "inherit",
  });

  const fieldRow = { marginBottom: 20 };

  // ── Render ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 14 }}>
        Chargement…
      </div>
    );
  }

  const title = isNew ? "Nouveau produit" : (product?.name ?? "—");
  const cnt   = product?.challenge_count;

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

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

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "#000", zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <a href="/x8k3pz/products" style={{ color: "rgba(255,255,255,0.35)", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
            ← Produits
          </a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#fff" }}>{title}</h1>

          {!isNew && product && (
            <button
              onClick={toggleActive}
              disabled={saving}
              style={{
                background: product.active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.06)",
                border: `1px solid ${product.active ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.12)"}`,
                color: product.active ? "#4ade80" : "rgba(255,255,255,0.4)",
                borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                letterSpacing: "0.5px", transition: "all 0.2s",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: product.active ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
              {product.active ? "ACTIF" : "INACTIF"}
            </button>
          )}

          {!isNew && cnt && cnt.total > 0 && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
              {cnt.active} challenge{cnt.active > 1 ? "s" : ""} actif{cnt.active > 1 ? "s" : ""}
              {cnt.funded > 0 ? ` · ${cnt.funded} certifié${cnt.funded > 1 ? "s" : ""}` : ""}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {!isNew && (
            <>
              {/* Duplicate */}
              <button
                onClick={duplicate}
                disabled={saving}
                style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "8px 14px",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}
              >
                Dupliquer
              </button>

              {/* Delete with confirmation */}
              {confirmDelete ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)", borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={deleteProduct}
                    disabled={saving}
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", borderRadius: 6, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Confirmer suppression
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  style={{ background: "transparent", border: "1px solid rgba(239,68,68,0.15)", color: "rgba(239,68,68,0.5)", borderRadius: 6, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}
                >
                  Supprimer
                </button>
              )}
            </>
          )}

          {/* Save */}
          <button
            onClick={saveGeneral}
            disabled={saving || activeTab !== "general"}
            style={{
              background: activeTab === "general" ? "#3B82F6" : "rgba(59,130,246,0.15)",
              border: "none", color: activeTab === "general" ? "#fff" : "rgba(255,255,255,0.3)",
              borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700,
              cursor: activeTab === "general" ? "pointer" : "default", opacity: saving ? 0.6 : 1,
              transition: "all 0.15s",
            }}
          >
            {saving ? "…" : isNew ? "Créer" : "Sauvegarder"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px", display: "flex" }}>
        <button style={tabStyle("general")} onClick={() => setActiveTab("general")}>Général</button>
        {!isNew && (
          <>
            <button style={tabStyle("phases")} onClick={() => setActiveTab("phases")}>
              Phases <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{phases.length}</span>
            </button>
            <button style={tabStyle("rules")} onClick={() => setActiveTab("rules")}>
              Règles <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>{rules.length}</span>
            </button>
          </>
        )}
      </div>

      {/* Tab content */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px 64px" }}>

        {/* ── TAB GÉNÉRAL ───────────────────────────────────────── */}
        {activeTab === "general" && (
          <div>
            {/* Identité */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                Identité
              </div>
              <div style={fieldRow}>
                <Label>Nom du produit</Label>
                <Input value={form.name} onChange={pf("name")} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                <div>
                  <Label>Slug</Label>
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
                <Input value={form.description} onChange={pf("description")} />
              </div>
            </div>

            {/* Compte */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                Compte & Balance
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                <div>
                  <Label>Taille du compte</Label>
                  <Select
                    value={form.account_size}
                    onChange={v => {
                      setForm(prev => ({ ...prev, account_size: v, balance_usd: BALANCES[v] || prev.balance_usd }));
                    }}
                    options={["$10,000","$25,000","$50,000","$100,000","$200,000"].map(s => ({ value: s, label: s }))}
                  />
                </div>
                <div>
                  <Label>Balance simulée (USD)</Label>
                  <Input value={form.balance_usd} onChange={pf("balance_usd")} type="number" suffix="USD" />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                <div>
                  <Label>Levier</Label>
                  <Input value={form.leverage} onChange={pf("leverage")} type="number" suffix=":1" />
                </div>
                <div>
                  <Label>Plafond cumul max</Label>
                  <Input value={form.max_cumul_usd} onChange={pf("max_cumul_usd")} type="number" suffix="USD" />
                </div>
              </div>
            </div>

            {/* Tarification */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                Tarification
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, ...fieldRow }}>
                <div>
                  <Label>Prix carte (centimes)</Label>
                  <Input
                    value={form.price_eur_cents}
                    onChange={pf("price_eur_cents")}
                    type="number"
                    suffix={form.price_eur_cents ? `= €${Math.round(Number(form.price_eur_cents) / 100)}` : "cts"}
                  />
                </div>
                <div>
                  <Label>Prix crypto (centimes — vide = même que carte)</Label>
                  <Input
                    value={form.price_crypto_cents}
                    onChange={pf("price_crypto_cents")}
                    type="number"
                    suffix={form.price_crypto_cents ? `= €${Math.round(Number(form.price_crypto_cents) / 100)}` : "identique"}
                  />
                </div>
              </div>
            </div>

            {/* Avancé */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                Avancé
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, ...fieldRow }}>
                <div>
                  <Label>Ordre d&apos;affichage</Label>
                  <Input value={form.display_order} onChange={pf("display_order")} type="number" />
                </div>
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

        {/* ── TAB PHASES ────────────────────────────────────────── */}
        {activeTab === "phases" && (
          <div>
            {phases.map(phase => {
              const isEditing = editingPhase === phase.phase_order;
              const typeLabel = phase.phase_type === "challenge" ? "Challenge" : "Compte Certifié";
              const typeColor = phase.phase_type === "challenge" ? "#60a5fa" : "#4ade80";

              return (
                <div
                  key={phase.phase_order}
                  style={{
                    marginBottom: 12,
                    border: `1px solid ${isEditing ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}`,
                    borderRadius: 10,
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                >
                  {/* Phase header */}
                  <div
                    onClick={() => {
                      if (isEditing) { setEditingPhase(null); return; }
                      setEditingPhase(phase.phase_order);
                      setPhaseForm({
                        profit_target:    phase.profit_target,
                        daily_drawdown:   phase.daily_drawdown,
                        total_drawdown:   phase.total_drawdown,
                        min_trading_days: phase.min_trading_days,
                        max_trading_days: phase.max_trading_days,
                        profit_split:     phase.profit_split,
                        mt5_group:        phase.mt5_group,
                      });
                    }}
                    style={{ padding: "14px 20px", background: isEditing ? "rgba(59,130,246,0.05)" : "rgba(255,255,255,0.02)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Phase {phase.phase_order}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: typeColor, background: `${typeColor}18`, border: `1px solid ${typeColor}30`, borderRadius: 4, padding: "2px 8px" }}>
                        {typeLabel}
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>{phase.phase_label}</span>
                    </div>
                    <div style={{ display: "flex", gap: 20, alignItems: "center", fontSize: 12 }}>
                      {phase.profit_target !== null && (
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>
                          Obj. <strong style={{ color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>{phase.profit_target}%</strong>
                        </span>
                      )}
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>
                        DD/j <strong style={{ color: "#fbbf24", fontVariantNumeric: "tabular-nums" }}>{phase.daily_drawdown}%</strong>
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>
                        DD tot. <strong style={{ color: "#f87171", fontVariantNumeric: "tabular-nums" }}>{phase.total_drawdown}%</strong>
                      </span>
                      {phase.profit_split !== null && (
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>
                          Split <strong style={{ color: "#a78bfa", fontVariantNumeric: "tabular-nums" }}>{phase.profit_split}%</strong>
                        </span>
                      )}
                      <span style={{ fontSize: 16, color: isEditing ? "#60a5fa" : "rgba(255,255,255,0.2)" }}>
                        {isEditing ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Phase edit form */}
                  {isEditing && (
                    <div style={{ padding: "20px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#050505" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                        <div>
                          <Label>Objectif profit (%)</Label>
                          <Input
                            value={phaseForm.profit_target ?? ""}
                            onChange={v => setPhaseForm(p => ({ ...p, profit_target: v === "" ? null : Number(v) }))}
                            type="number" suffix="%"
                          />
                        </div>
                        <div>
                          <Label>Drawdown journalier (%)</Label>
                          <Input
                            value={phaseForm.daily_drawdown ?? ""}
                            onChange={v => setPhaseForm(p => ({ ...p, daily_drawdown: Number(v) }))}
                            type="number" suffix="%"
                          />
                        </div>
                        <div>
                          <Label>Drawdown total (%)</Label>
                          <Input
                            value={phaseForm.total_drawdown ?? ""}
                            onChange={v => setPhaseForm(p => ({ ...p, total_drawdown: Number(v) }))}
                            type="number" suffix="%"
                          />
                        </div>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
                        <div>
                          <Label>Jours min</Label>
                          <Input
                            value={phaseForm.min_trading_days ?? ""}
                            onChange={v => setPhaseForm(p => ({ ...p, min_trading_days: Number(v) }))}
                            type="number" suffix="j"
                          />
                        </div>
                        <div>
                          <Label>Jours max (vide = illimité)</Label>
                          <Input
                            value={phaseForm.max_trading_days ?? ""}
                            onChange={v => setPhaseForm(p => ({ ...p, max_trading_days: v === "" ? null : Number(v) }))}
                            type="number"
                          />
                        </div>
                        <div>
                          <Label>Partage profits (%)</Label>
                          <Input
                            value={phaseForm.profit_split ?? ""}
                            onChange={v => setPhaseForm(p => ({ ...p, profit_split: v === "" ? null : Number(v) }))}
                            type="number" suffix="%"
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => setEditingPhase(null)} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", borderRadius: 6, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>
                          Annuler
                        </button>
                        <button onClick={() => savePhase(phase.phase_order)} disabled={saving} style={{ background: "#3B82F6", border: "none", color: "#fff", borderRadius: 6, padding: "8px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          {saving ? "…" : "Sauvegarder"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB RÈGLES ────────────────────────────────────────── */}
        {activeTab === "rules" && (
          <div>
            {rules.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
                Aucune règle définie
              </div>
            ) : (
              rules.map(rule => {
                const isEditing = editingRule === rule.rule_key;
                const displayValue = typeof rule.rule_value === "object"
                  ? JSON.stringify(rule.rule_value)
                  : String(rule.rule_value);

                return (
                  <div
                    key={rule.rule_key}
                    style={{
                      padding: "14px 20px",
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      display: "flex", flexDirection: "column", gap: isEditing ? 12 : 0,
                    }}
                  >
                    {/* Rule header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Toggle checked={rule.enabled} onChange={() => toggleRule(rule)} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: rule.enabled ? "#fff" : "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                            {rule.rule_key}
                          </span>
                          <span style={{
                            fontSize: 12, fontWeight: 700, color: rule.enabled ? "#60a5fa" : "rgba(255,255,255,0.2)",
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {displayValue}
                          </span>
                        </div>
                        {rule.description && (
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
                            {rule.description}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          if (isEditing) { setEditingRule(null); return; }
                          setEditingRule(rule.rule_key);
                          setRuleForm({ rule_value: displayValue });
                        }}
                        style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)", borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer" }}
                      >
                        {isEditing ? "Annuler" : "Modifier"}
                      </button>
                    </div>

                    {/* Rule edit */}
                    {isEditing && (
                      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", paddingLeft: 48 }}>
                        <div style={{ flex: 1 }}>
                          <Label>Valeur (JSON ou string)</Label>
                          <Input
                            value={ruleForm.rule_value}
                            onChange={v => setRuleForm({ rule_value: v })}
                          />
                        </div>
                        <button
                          onClick={() => saveRule(rule.rule_key)}
                          disabled={saving}
                          style={{ background: "#3B82F6", border: "none", color: "#fff", borderRadius: 6, padding: "9px 20px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
                        >
                          {saving ? "…" : "OK"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
