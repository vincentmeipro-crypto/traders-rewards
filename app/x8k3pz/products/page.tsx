"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ────────────────────────────────────────────────────────
type Phase = {
  phase_order:      number;
  phase_type:       string;
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
  updated_at:      string;
  phases:          Phase[];
  rules:           unknown[];
  challenge_count: ChallengeCount;
};

// ── Helpers ──────────────────────────────────────────────────────
function phase1(phases: Phase[]): Phase | undefined {
  return phases.find(ph => ph.phase_order === 1 && ph.phase_type === "challenge");
}

function formatRelativeDate(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)        return "À l'instant";
  if (diff < 3600)      return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)     return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ── Composants atomiques ─────────────────────────────────────────
const StatusBadge = ({ active }: { active: boolean }) => (
  <span style={{
    fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
    padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" as const,
    background: active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.06)",
    color:      active ? "#4ade80"             : "rgba(255,255,255,0.35)",
    border: `1px solid ${active ? "rgba(34,197,94,0.2)" : "rgba(255,255,255,0.1)"}`,
  }}>
    {active ? "ACTIF" : "INACTIF"}
  </span>
);

const ModelBadge = ({ model }: { model: string }) => {
  const cfg = model === "2step"
    ? { label: "2-STEP", bg: "rgba(59,130,246,0.1)",  color: "#60a5fa", border: "rgba(59,130,246,0.2)"  }
    : model === "1step"
    ? { label: "1-STEP", bg: "rgba(168,85,247,0.1)",  color: "#c084fc", border: "rgba(168,85,247,0.2)"  }
    : { label: "VIP",    bg: "rgba(234,179,8,0.1)",   color: "#fbbf24", border: "rgba(234,179,8,0.2)"   };
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "0.8px",
      padding: "2px 7px", borderRadius: 4,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>{cfg.label}</span>
  );
};

// ── Composant principal ──────────────────────────────────────────
export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts]         = useState<Product[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showInactive, setShowInactive] = useState(true);
  const [hoveredId, setHoveredId]       = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId]     = useState<string | null>(null);
  const [togglingId, setTogglingId]     = useState<string | null>(null);
  const [notification, setNotification] = useState<{ msg: string; ok: boolean } | null>(null);
  const [windowWidth, setWindowWidth]   = useState(1400);

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handle = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  const isNarrow = windowWidth < 900;

  const notify = (msg: string, ok = true) => {
    setNotification({ msg, ok });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const close = () => setMenuOpenId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/products", { headers: { "x-admin-key": ADMIN_KEY } });
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
      const res  = await fetch(`/api/admin/products/${product.id}/duplicate`, {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok && data.product?.id) {
        notify(`Dupliqué — ${data.product.slug}`);
        router.push(`/x8k3pz/products/${data.product.id}`);
      } else {
        notify(data.error || "Erreur lors de la duplication", false);
      }
    } catch {
      notify("Erreur réseau", false);
    }
  };

  const filtered  = products.filter(p => showInactive || p.active);
  const nbInactifs = products.filter(p => !p.active).length;

  const groups: { model: string; items: Product[] }[] = [
    { model: "2step", items: filtered.filter(p => p.model === "2step") },
    { model: "1step", items: filtered.filter(p => p.model === "1step") },
    { model: "vip",   items: filtered.filter(p => p.model === "vip")   },
  ].filter(g => g.items.length > 0);

  // P1#6: Actions 132px → 52px (bouton Éditer supprimé, uniquement ⋯)
  const COLS = isNarrow
    ? "88px 1fr 72px 88px 52px"
    : "88px 1fr 72px 1fr 88px 88px 52px";

  // P1#7: Labels de groupes complets
  const GROUP_LABELS: Record<string, string> = {
    "2step": "2-Step Challenge",
    "1step": "1-Step Challenge",
    "vip":   "VIP / Algo",
  };

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

      {/* ── Header — P1#5: breadcrumb "Back Office / Produits" à gauche */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap",
        background: "#050505",
      }}>
        {/* Gauche: breadcrumb + titre */}
        <div>
          {/* P1#5: breadcrumb cliquable */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <a href="/x8k3pz" style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.55)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
            >
              Back Office
            </a>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.15)" }}>/</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Produits</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.5px" }}>
            Produits Challenge
          </h1>
        </div>

        {/* Droite: filtre + CTA uniquement (← Dashboard supprimé) */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", cursor: "pointer", display: "flex", alignItems: "center", gap: 7, userSelect: "none" as const }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              style={{ accentColor: "#3B82F6", width: 14, height: 14 }}
            />
            Inactifs
            {/* Hint: nombre masqués quand le filtre est actif */}
            {!showInactive && nbInactifs > 0 && (
              <span style={{ color: "rgba(255,255,255,0.22)", fontWeight: 400 }}>
                ({nbInactifs} masqué{nbInactifs > 1 ? "s" : ""})
              </span>
            )}
          </label>
          <a
            href="/x8k3pz/products/new"
            style={{ background: "#3B82F6", color: "#fff", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, textDecoration: "none", display: "inline-block", whiteSpace: "nowrap" }}
          >
            + Nouveau produit
          </a>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "0 32px 64px", overflowX: "hidden" }}>
        {loading ? (
          /* P4: skeleton liste — imite 2 groupes + 3 lignes produit */
          <div style={{ paddingTop: 40 }}>
            <style>{`@keyframes sk-fade { 0%,100%{opacity:.18} 50%{opacity:.07} }`}</style>
            {[1, 2].map(g => (
              <div key={g} style={{ marginBottom: 40 }}>
                {/* header de groupe */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ width: 120, height: 13, borderRadius: 4, background: "rgba(255,255,255,0.18)", animation: "sk-fade 1.6s ease-in-out infinite" }} />
                  <div style={{ width: 48, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.1)", animation: "sk-fade 1.6s ease-in-out infinite", animationDelay: "0.05s" }} />
                </div>
                {/* lignes produit */}
                {[80, 60, 100].map((w, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ width: 52, height: 20, borderRadius: 4, background: "rgba(255,255,255,0.1)", animation: "sk-fade 1.6s ease-in-out infinite", animationDelay: `${i * 0.1}s`, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: `${w}%`, height: 13, borderRadius: 4, background: "rgba(255,255,255,0.14)", animation: "sk-fade 1.6s ease-in-out infinite", animationDelay: `${i * 0.1 + 0.05}s`, marginBottom: 6 }} />
                      <div style={{ width: "30%", height: 10, borderRadius: 4, background: "rgba(255,255,255,0.08)", animation: "sk-fade 1.6s ease-in-out infinite", animationDelay: `${i * 0.1 + 0.1}s` }} />
                    </div>
                    <div style={{ width: 48, height: 16, borderRadius: 4, background: "rgba(255,255,255,0.12)", animation: "sk-fade 1.6s ease-in-out infinite", animationDelay: `${i * 0.1 + 0.08}s`, flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
            Aucun produit{!showInactive ? " actif" : ""}
          </div>
        ) : (
          groups.map(group => (
            <div key={group.model} style={{ marginTop: 40 }}>

              {/* P1#7: Section group header renforcé */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                marginBottom: 12, paddingBottom: 12,
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
                  {GROUP_LABELS[group.model]}
                </span>
                <ModelBadge model={group.model} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
                  {group.items.length} produit{group.items.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* En-têtes colonnes */}
              <div style={{
                display: "grid", gridTemplateColumns: COLS,
                gap: "0 12px", padding: "8px 16px",
                fontSize: 10, fontWeight: 600, letterSpacing: "1.2px",
                textTransform: "uppercase", color: "rgba(255,255,255,0.2)",
                // P1#3: border plus contrastée
                borderBottom: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div>Statut</div>
                <div>Produit</div>
                <div>Prix</div>
                {!isNarrow && <div>Règles Phase 1</div>}
                {!isNarrow && <div>Modifié</div>}
                <div>Challenges</div>
                <div />
              </div>

              {/* Lignes produits */}
              {group.items.map(product => {
                const p1         = phase1(product.phases);
                const priceEur   = Math.round(product.price_eur_cents / 100);
                const cnt        = product.challenge_count;
                const isHovered  = hoveredId  === product.id;
                const isMenuOpen = menuOpenId === product.id;
                const isToggling = togglingId === product.id;

                return (
                  <div
                    key={product.id}
                    onClick={() => router.push(`/x8k3pz/products/${product.id}`)}
                    onMouseEnter={() => setHoveredId(product.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{
                      display: "grid", gridTemplateColumns: COLS,
                      gap: "0 12px", padding: "13px 16px",
                      // P1#3: row border plus visible
                      borderBottom: "1px solid rgba(255,255,255,0.06)",
                      alignItems: "center", borderRadius: 6,
                      // P1#3: hover plus perceptible sur #050505
                      background: isHovered ? "rgba(255,255,255,0.04)" : "transparent",
                      transition: "background 0.1s",
                      cursor: "pointer",
                    }}
                  >
                    {/* Statut */}
                    <div onClick={e => e.stopPropagation()}>
                      <StatusBadge active={product.active} />
                    </div>

                    {/* Produit : nom + taille + slug */}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: product.active ? "#fff" : "rgba(255,255,255,0.38)", lineHeight: 1.2, marginBottom: 1 }}>
                        {product.name}
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", marginBottom: 1 }}>
                        {product.account_size}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace" }}>
                        {product.slug}
                      </div>
                    </div>

                    {/* Prix */}
                    <div style={{ fontSize: 16, fontWeight: 800, color: product.active ? "#fff" : "rgba(255,255,255,0.28)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.3px" }}>
                      €{priceEur}
                    </div>

                    {/* Règles Phase 1 — masqué en narrow */}
                    {!isNarrow && (
                      <div>
                        {p1 ? (
                          <div style={{ display: "flex", gap: 12, fontSize: 12, color: "rgba(255,255,255,0.42)", flexWrap: "wrap" }}>
                            {p1.profit_target !== null && (
                              <span>Obj. <strong style={{ color: "rgba(255,255,255,0.78)", fontVariantNumeric: "tabular-nums" }}>{p1.profit_target}%</strong></span>
                            )}
                            <span>DD/j <strong style={{ color: "rgba(255,255,255,0.78)", fontVariantNumeric: "tabular-nums" }}>{p1.daily_drawdown}%</strong></span>
                            <span>DD <strong style={{ color: "rgba(255,255,255,0.78)", fontVariantNumeric: "tabular-nums" }}>{p1.total_drawdown}%</strong></span>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.18)" }}>—</span>
                        )}
                      </div>
                    )}

                    {/* Modifié — masqué en narrow */}
                    {!isNarrow && (
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>
                        {product.updated_at ? formatRelativeDate(product.updated_at) : "—"}
                      </div>
                    )}

                    {/* Challenges */}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                        {cnt.total}
                      </div>
                      {(cnt.active > 0 || cnt.funded > 0) && (
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 1 }}>
                          {cnt.active > 0 ? `${cnt.active} actif` : ""}
                          {cnt.funded > 0 ? `${cnt.active > 0 ? " · " : ""}${cnt.funded} cert.` : ""}
                        </div>
                      )}
                    </div>

                    {/* P1#6: Actions — bouton Éditer supprimé, uniquement ⋯ */}
                    <div onClick={e => e.stopPropagation()} style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                      <div style={{ position: "relative" }}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : product.id); }}
                          style={{
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6, width: 30, height: 30,
                            cursor: "pointer", color: "rgba(255,255,255,0.4)",
                            fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          ⋯
                        </button>

                        {isMenuOpen && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{
                              position: "absolute", right: 0, top: "calc(100% + 6px)",
                              zIndex: 100, background: "#111",
                              border: "1px solid rgba(255,255,255,0.1)",
                              borderRadius: 8, padding: 6, minWidth: 180,
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
                              style={{ width: "100%", background: "transparent", border: "none", color: product.active ? "#fca5a5" : "#86efac", fontSize: 13, fontWeight: 500, padding: "8px 12px", textAlign: "left", cursor: "pointer", borderRadius: 6, opacity: isToggling ? 0.5 : 1 }}
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
