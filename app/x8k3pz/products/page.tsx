"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ────────────────────────────────────────────────────────
type Phase = {
  phase_order: number;
  phase_type:  string;
  profit_target:    number | null;
  daily_drawdown:   number;
  total_drawdown:   number;
  min_trading_days: number;
};

type ChallengeCount = { active: number; funded: number; total: number };

type Product = {
  id:              string;
  slug:            string;
  name:            string;
  model:           "2step" | "1step" | "vip";
  account_size:    string;
  price_eur_cents: number;
  active:          boolean;
  display_order:   number;
  phases:          Phase[];
  rules:           unknown[];
  challenge_count: ChallengeCount;
};

// ── Helpers ──────────────────────────────────────────────────────
function phase1(phases: Phase[]): Phase | undefined {
  return phases.find(ph => ph.phase_order === 1 && ph.phase_type === "challenge");
}

function phase2(phases: Phase[]): Phase | undefined {
  return phases.find(ph => ph.phase_order === 2 && ph.phase_type === "challenge");
}

// ── Composants atomiques ─────────────────────────────────────────
const ModelBadge = ({ model }: { model: string }) => (
  <span style={{
    fontSize: 10, fontWeight: 800, letterSpacing: "1px",
    padding: "3px 8px", borderRadius: 4,
    background: model === "2step" ? "rgba(59,130,246,0.12)" : "rgba(168,85,247,0.12)",
    color:      model === "2step" ? "#60a5fa"               : "#c084fc",
    border: `1px solid ${model === "2step" ? "rgba(59,130,246,0.25)" : "rgba(168,85,247,0.25)"}`,
  }}>
    {model === "2step" ? "2-STEP" : "1-STEP"}
  </span>
);

const StatusDot = ({ active }: { active: boolean }) => (
  <div style={{
    width: 8, height: 8, borderRadius: "50%",
    background: active ? "#22c55e" : "rgba(255,255,255,0.18)",
    boxShadow: active ? "0 0 6px rgba(34,197,94,0.5)" : "none",
    flexShrink: 0,
  }} />
);

// ── Composant principal ──────────────────────────────────────────
export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts]       = useState<Product[]>([]);
  const [loading, setLoading]         = useState(true);
  const [filterModel, setFilterModel] = useState<"all" | "2step" | "1step">("all");
  const [showInactive, setShowInactive] = useState(true);
  const [hoveredId, setHoveredId]     = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);
  const [togglingId, setTogglingId]   = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null);

  const notify = (msg: string, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const close = () => setMenuOpenId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products", {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      notify("Erreur de chargement", false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleActive = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingId(product.id);
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PUT",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ active: !product.active }),
      });
      if (res.ok) {
        setProducts(prev => prev.map(p => p.id === product.id ? { ...p, active: !p.active } : p));
        notify(`${product.name} — ${!product.active ? "activé" : "désactivé"}`);
      } else {
        notify("Erreur lors du changement de statut", false);
      }
    } catch {
      notify("Erreur réseau", false);
    } finally {
      setTogglingId(null);
      setMenuOpenId(null);
    }
  };

  const duplicate = async (product: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/duplicate`, {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok && data.product?.id) {
        notify(`Produit dupliqué — ${data.product.slug}`);
        router.push(`/x8k3pz/products/${data.product.id}`);
      } else {
        notify(data.error || "Erreur lors de la duplication", false);
      }
    } catch {
      notify("Erreur réseau", false);
    }
  };

  const filtered = products.filter(p => {
    if (!showInactive && !p.active) return false;
    if (filterModel !== "all" && p.model !== filterModel) return false;
    return true;
  });

  // Grouper par modèle pour l'affichage
  const groups: { label: string; model: string; items: Product[] }[] = [
    { label: "2-Step", model: "2step", items: filtered.filter(p => p.model === "2step") },
    { label: "1-Step", model: "1step", items: filtered.filter(p => p.model === "1step") },
    { label: "VIP",   model: "vip",   items: filtered.filter(p => p.model === "vip") },
  ].filter(g => g.items.length > 0);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Toast notification */}
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
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 6 }}>
            Back Office · Traders Rewards
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
            Produits Challenge
          </h1>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="/x8k3pz" style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textDecoration: "none", padding: "8px 14px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6 }}>
            ← Dashboard
          </a>
          <a href="/x8k3pz/products/new" style={{
            background: "#3B82F6", color: "#fff", border: "none", borderRadius: 8,
            padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer",
            textDecoration: "none", display: "inline-block", letterSpacing: "0.2px",
          }}>
            + Nouveau produit
          </a>
        </div>
      </div>

      {/* Filters */}
      <div style={{ padding: "14px 32px", borderBottom: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: 8 }}>
        {(["all", "2step", "1step"] as const).map(f => (
          <button key={f} onClick={() => setFilterModel(f)} style={{
            background:  filterModel === f ? "rgba(59,130,246,0.12)" : "transparent",
            border:      filterModel === f ? "1px solid rgba(59,130,246,0.35)" : "1px solid rgba(255,255,255,0.08)",
            color:       filterModel === f ? "#60a5fa" : "rgba(255,255,255,0.4)",
            borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            transition: "all 0.15s",
          }}>
            {f === "all" ? "Tous" : f === "2step" ? "2-Step" : "1-Step"}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, userSelect: "none" }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              style={{ accentColor: "#3B82F6", width: 14, height: 14 }}
            />
            Afficher inactifs
          </label>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 32px 48px" }}>
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            Aucun produit
          </div>
        ) : (
          groups.map(group => (
            <div key={group.model} style={{ marginTop: 32 }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <ModelBadge model={group.model} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>
                  {group.items.length} produit{group.items.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Column headers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "20px 180px 88px 120px 1fr 120px 164px",
                gap: "0 16px",
                padding: "8px 16px",
                fontSize: 10, fontWeight: 600, letterSpacing: "1.5px",
                textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div />
                <div>Produit</div>
                <div>Balance</div>
                <div>Prix carte</div>
                <div>Règles Phase 1</div>
                <div>Challenges</div>
                <div />
              </div>

              {/* Product rows */}
              {group.items.map(product => {
                const p1 = phase1(product.phases);
                const p2 = phase2(product.phases);
                const priceEur = Math.round(product.price_eur_cents / 100);
                const cnt = product.challenge_count;
                const isHovered = hoveredId === product.id;
                const isMenuOpen = menuOpenId === product.id;
                const isToggling = togglingId === product.id;

                return (
                  <div
                    key={product.id}
                    onMouseEnter={() => setHoveredId(product.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 180px 88px 120px 1fr 120px 164px",
                      gap: "0 16px",
                      padding: "13px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      alignItems: "center",
                      borderRadius: 6,
                      background: isHovered ? "rgba(255,255,255,0.025)" : "transparent",
                      transition: "background 0.1s",
                      cursor: "default",
                    }}
                  >
                    {/* Status */}
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <StatusDot active={product.active} />
                    </div>

                    {/* Produit */}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: product.active ? "#fff" : "rgba(255,255,255,0.4)", lineHeight: 1.2 }}>
                        {product.account_size}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 2, fontFamily: "monospace" }}>
                        {product.slug}
                      </div>
                    </div>

                    {/* Balance */}
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" }}>
                      {product.account_size}
                    </div>

                    {/* Prix */}
                    <div style={{
                      fontSize: 18, fontWeight: 800,
                      color: product.active ? "#fff" : "rgba(255,255,255,0.3)",
                      fontVariantNumeric: "tabular-nums",
                      letterSpacing: "-0.5px",
                    }}>
                      €{priceEur}
                    </div>

                    {/* Règles Phase 1 */}
                    <div>
                      {p1 ? (
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          {p1.profit_target !== null && (
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                              Obj. <strong style={{ color: "#4ade80", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{p1.profit_target}%</strong>
                            </span>
                          )}
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                            DD/j <strong style={{ color: "#fbbf24", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{p1.daily_drawdown}%</strong>
                          </span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                            DD tot. <strong style={{ color: "#f87171", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{p1.total_drawdown}%</strong>
                          </span>
                          {p2 && (
                            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                              · P2: {p2.profit_target}%
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>—</span>
                      )}
                    </div>

                    {/* Challenges */}
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                        {cnt.active}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>
                        actifs{cnt.funded > 0 ? ` · ${cnt.funded} cert.` : ""}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                      <a
                        href={`/x8k3pz/products/${product.id}`}
                        style={{
                          background: isHovered ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
                          color: isHovered ? "#60a5fa" : "rgba(255,255,255,0.5)",
                          border: `1px solid ${isHovered ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.08)"}`,
                          borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600,
                          textDecoration: "none", cursor: "pointer", transition: "all 0.15s",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Éditer
                      </a>

                      {/* Overflow menu */}
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : product.id); }}
                          style={{
                            background: "transparent", border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 6, width: 30, height: 30, cursor: "pointer",
                            color: "rgba(255,255,255,0.4)", fontSize: 16, display: "flex",
                            alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          ⋯
                        </button>

                        {isMenuOpen && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100,
                              background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 8, padding: "6px", minWidth: 180,
                              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                            }}
                          >
                            <button
                              onClick={e => duplicate(product, e)}
                              style={{ width: "100%", background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500, padding: "8px 12px", textAlign: "left", cursor: "pointer", borderRadius: 6 }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              Dupliquer
                            </button>
                            <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "4px 0" }} />
                            <button
                              onClick={e => toggleActive(product, e)}
                              disabled={isToggling}
                              style={{
                                width: "100%", background: "transparent", border: "none",
                                color: product.active ? "#fca5a5" : "#86efac",
                                fontSize: 13, fontWeight: 500, padding: "8px 12px",
                                textAlign: "left", cursor: "pointer", borderRadius: 6,
                                opacity: isToggling ? 0.5 : 1,
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                            >
                              {isToggling ? "…" : product.active ? "Désactiver" : "Activer"}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
