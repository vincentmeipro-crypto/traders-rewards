"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ────────────────────────────────────────────────────────
type Product   = { id: string; name: string; account_size: string; model: string; active: boolean };
type Affiliate = { id: string; user_id: string; code: string; first_name?: string; last_name?: string; email?: string };

// ── Atomic UI ────────────────────────────────────────────────────
const Label = ({ children, required, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor?: string }) => (
  <label htmlFor={htmlFor} style={{
    display: "flex", gap: 4, alignItems: "center",
    fontSize: 10, fontWeight: 600, letterSpacing: "1.5px",
    textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 6,
    cursor: htmlFor ? "pointer" : "default",
  }}>
    {children}
    {required && <span style={{ color: "rgba(239,68,68,0.7)", fontSize: 10 }}>*</span>}
  </label>
);

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 6, padding: "9px 12px", color: "#fff", fontSize: 13, fontWeight: 500,
  width: "100%", outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};

const Input = ({ id, value, onChange, type = "text", placeholder }: {
  id?: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) => (
  <input
    id={id}
    type={type}
    value={value}
    placeholder={placeholder}
    onChange={e => onChange(e.target.value)}
    style={inputStyle}
    onFocus={e => { e.target.style.borderColor = "rgba(59,130,246,0.5)"; }}
    onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; }}
  />
);

const Select = ({ id, value, onChange, children }: {
  id?: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) => (
  <select
    id={id}
    value={value}
    onChange={e => onChange(e.target.value)}
    style={{ ...inputStyle, cursor: "pointer" }}
  >
    {children}
  </select>
);

const Toggle = ({ checked, onChange, label, id }: {
  checked: boolean; onChange: (v: boolean) => void; label?: string; id?: string;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
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

// ── Page ─────────────────────────────────────────────────────────
export default function NewPromoPage() {
  const router = useRouter();

  const [products, setProducts]     = useState<Product[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [saving, setSaving]         = useState(false);
  const [notification, setNotif]    = useState<{ msg: string; ok: boolean } | null>(null);

  const [form, setForm] = useState({
    code:                "",
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

  // Load products (active only) + affiliates
  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products",  { headers: { "x-admin-key": ADMIN_KEY } }).then(r => r.json()),
      fetch("/api/admin/affiliates", { headers: { "x-admin-key": ADMIN_KEY } }).then(r => r.json()),
    ]).then(([prod, aff]) => {
      if (Array.isArray(prod)) setProducts(prod.filter((p: Product) => p.active));
      if (Array.isArray(aff))  setAffiliates(aff);
    }).catch(() => {});
  }, []);

  const pf = (field: keyof typeof form) => (v: string) => setForm(prev => ({ ...prev, [field]: v }));

  const toggleProduct = (id: string) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(id)
        ? prev.product_ids.filter(x => x !== id)
        : [...prev.product_ids, id],
    }));
  };

  // ── Submit — convert datetime-local to UTC ISO before send ───────
  const submit = async () => {
    if (!form.code.trim())       { notify("Le code est requis", false); return; }
    if (!form.discount_percent)  { notify("La remise est requise", false); return; }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        code:                form.code.trim().toUpperCase(),
        name:                form.name.trim() || null,
        discount_percent:    Number(form.discount_percent),
        // Convert local datetime to UTC ISO to avoid timezone offset
        starts_at:           form.starts_at  ? new Date(form.starts_at).toISOString()  : null,
        expires_at:          form.expires_at ? new Date(form.expires_at).toISOString() : null,
        max_uses:            form.max_uses   ? Number(form.max_uses) : null,
        single_use_per_user: form.single_use_per_user,
        targeting_mode:      form.targeting_mode,
        product_ids:         form.targeting_mode === "specific" ? form.product_ids : [],
        affiliate_user_id:   form.affiliate_user_id || null,
        active:              form.active,
      };

      const res  = await fetch("/api/admin/promo-codes", {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        notify("Code créé !");
        setTimeout(() => router.push(`/x8k3pz/promotions/${data.id}`), 600);
      } else {
        notify(data.error || "Erreur lors de la création", false);
      }
    } catch { notify("Erreur réseau", false); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        select option { background: #111; }
        input[type="datetime-local"] { color-scheme: dark; }
        input:focus-visible, select:focus-visible, button:focus-visible {
          outline: 2px solid rgba(59,130,246,0.5); outline-offset: 2px;
        }
        @media (max-width: 640px) {
          .form-grid-2 { grid-template-columns: 1fr !important; }
          .promo-body  { padding: 20px !important; }
          .promo-header-pad { padding: 12px 16px !important; }
        }
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
      <div className="promo-header-pad" style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: "#0c0c0c",
        zIndex: 50, gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/x8k3pz/promotions" style={{ color: "rgba(255,255,255,0.28)", textDecoration: "none", fontSize: 12 }}
            onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
          >
            Promotions
          </a>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Nouveau code</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="/x8k3pz/promotions" style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.48)", borderRadius: 6, padding: "8px 14px",
            fontSize: 12, fontWeight: 600, textDecoration: "none",
          }}>
            Annuler
          </a>
          <button
            onClick={submit}
            disabled={saving}
            style={{
              background: "#3B82F6", border: "none", color: "#fff",
              borderRadius: 8, padding: "8px 22px", fontSize: 13, fontWeight: 700,
              cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {saving ? "Création…" : "Créer le code"}
          </button>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="promo-body" style={{ padding: "32px", maxWidth: 760, margin: "0 auto" }}>

        {/* ─ Informations générales ─ */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
          <SectionTitle>Informations générales</SectionTitle>
          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={fieldRow}>
              <Label htmlFor="new-code" required>Code</Label>
              <Input
                id="new-code"
                value={form.code}
                onChange={v => setForm(prev => ({ ...prev, code: v.toUpperCase() }))}
                placeholder="EX: SUMMER25"
              />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>
                2 à 32 caractères · A-Z 0-9 tiret uniquement
              </div>
            </div>
            <div style={fieldRow}>
              <Label htmlFor="new-remise" required>Remise</Label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Input id="new-remise" value={form.discount_percent} onChange={pf("discount_percent")} type="number" placeholder="25" />
                <span style={{ fontSize: 20, color: "rgba(255,255,255,0.3)", flexShrink: 0 }}>%</span>
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Entier entre 1 et 100</div>
            </div>
          </div>
          <div style={fieldRow}>
            <Label htmlFor="new-name">Nom interne</Label>
            <Input id="new-name" value={form.name} onChange={pf("name")} placeholder="Ex: Campagne été 2026" />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Optionnel · max 120 caractères</div>
          </div>
        </div>

        {/* ─ Période ─ */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
          <SectionTitle>Période</SectionTitle>
          <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={fieldRow}>
              <Label htmlFor="new-starts">Démarre le</Label>
              <Input id="new-starts" value={form.starts_at} onChange={pf("starts_at")} type="datetime-local" />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Vide = disponible immédiatement</div>
            </div>
            <div style={fieldRow}>
              <Label htmlFor="new-expires">Expire le</Label>
              <Input id="new-expires" value={form.expires_at} onChange={pf("expires_at")} type="datetime-local" />
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>Vide = pas d'expiration</div>
            </div>
          </div>
        </div>

        {/* ─ Limites ─ */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
          <SectionTitle>Limites</SectionTitle>
          <div style={fieldRow}>
            <Label htmlFor="new-maxuses">Nombre maximum d'utilisations</Label>
            <Input id="new-maxuses" value={form.max_uses} onChange={pf("max_uses")} type="number" placeholder="Illimité si vide" />
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>
              Laissez vide pour un nombre d'utilisations illimité.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
            <Toggle
              id="new-single-use"
              checked={form.single_use_per_user}
              onChange={v => setForm(prev => ({ ...prev, single_use_per_user: v }))}
              label="Usage unique par trader"
            />
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>
            Empêche le même compte d'utiliser ce code plus d'une fois.
          </div>
        </div>

        {/* ─ Ciblage produits ─ */}
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
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginBottom: 14 }}>
                Seuls les produits sélectionnés accepteront ce code.
                Si aucun n'est sélectionné, le code sera refusé à l'utilisation.
              </div>
              {products.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, padding: "16px 0" }}>Chargement des produits…</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {products.map(prod => {
                    const selected = form.product_ids.includes(prod.id);
                    return (
                      <label
                        key={prod.id}
                        htmlFor={`prod-${prod.id}`}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", borderRadius: 8, cursor: "pointer",
                          background: selected ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${selected ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)"}`,
                          transition: "all 0.1s",
                        }}
                      >
                        <input
                          type="checkbox"
                          id={`prod-${prod.id}`}
                          checked={selected}
                          onChange={() => toggleProduct(prod.id)}
                          style={{ position: "absolute", opacity: 0, width: 1, height: 1, overflow: "hidden" }}
                        />
                        {/* Custom checkbox visual */}
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
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 1 }}>
                            {prod.account_size} · {prod.model.toUpperCase()}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              {form.targeting_mode === "specific" && form.product_ids.length === 0 && (
                <div style={{ fontSize: 10, color: "rgba(239,68,68,0.7)", marginTop: 10 }}>
                  Aucun produit sélectionné — le code sera refusé à l'utilisation.
                </div>
              )}
              {form.product_ids.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 10, color: "#60a5fa" }}>
                  {form.product_ids.length} produit{form.product_ids.length !== 1 ? "s" : ""} sélectionné{form.product_ids.length !== 1 ? "s" : ""}
                </div>
              )}
            </>
          )}

          {form.targeting_mode === "all" && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
              Le code sera accepté sur tous les produits du catalogue.
            </div>
          )}
        </div>

        {/* ─ Affiliation ─ */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 16 }}>
          <SectionTitle>Affiliation</SectionTitle>
          <div style={fieldRow}>
            <Label htmlFor="new-affiliate">Affilié lié</Label>
            <Select id="new-affiliate" value={form.affiliate_user_id} onChange={pf("affiliate_user_id")}>
              <option value="">Aucun</option>
              {affiliates.map(a => (
                <option key={a.user_id} value={a.user_id}>
                  {a.first_name || a.last_name ? `${a.first_name || ""} ${a.last_name || ""}`.trim() : a.email || a.user_id.slice(0, 16)} ({a.code})
                </option>
              ))}
            </Select>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 5 }}>
              Lier un affilié permet d'identifier le propriétaire du code. Cela ne crée pas automatiquement une commission.
            </div>
          </div>
        </div>

        {/* ─ Activation ─ */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "24px 28px", marginBottom: 24 }}>
          <SectionTitle>Activation</SectionTitle>
          <Toggle
            id="new-active"
            checked={form.active}
            onChange={v => setForm(prev => ({ ...prev, active: v }))}
            label={form.active ? "Code actif dès la création" : "Code inactif"}
          />
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 10 }}>
            Un code inactif est créé mais refusé à l'utilisation. Peut être activé ultérieurement.
          </div>
        </div>

        {/* Bottom Annuler only — Créer is in the header */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <a href="/x8k3pz/promotions" style={{
            padding: "10px 20px", borderRadius: 7, fontSize: 13, fontWeight: 600,
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.5)", textDecoration: "none",
          }}>
            Annuler
          </a>
        </div>
      </div>
    </div>
  );
}
