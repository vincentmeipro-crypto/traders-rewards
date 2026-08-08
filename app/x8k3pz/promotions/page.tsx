"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

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

// ── Status badge ─────────────────────────────────────────────────
const STATUS_CFG: Record<PromoStatus, { label: string; bg: string; color: string; border: string }> = {
  active:    { label: "ACTIVE",    bg: "rgba(34,197,94,0.1)",   color: "#4ade80", border: "rgba(34,197,94,0.2)"   },
  revoked:   { label: "RÉVOQUÉE",  bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "rgba(255,255,255,0.1)" },
  expired:   { label: "EXPIRÉE",   bg: "rgba(245,158,11,0.1)",  color: "#fbbf24", border: "rgba(245,158,11,0.2)"  },
  exhausted: { label: "ÉPUISÉE",   bg: "rgba(59,130,246,0.1)",  color: "#60a5fa", border: "rgba(59,130,246,0.2)"  },
  scheduled: { label: "PLANIFIÉE", bg: "rgba(168,85,247,0.1)",  color: "#c084fc", border: "rgba(168,85,247,0.2)"  },
};

const StatusBadge = ({ status }: { status: PromoStatus }) => {
  const cfg = STATUS_CFG[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
      padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" as const,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
};

// ── Date formatter ───────────────────────────────────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main ─────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const [promos, setPromos]             = useState<Promo[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatus]       = useState<"all" | PromoStatus>("all");
  const [menuId, setMenuId]             = useState<string | null>(null);
  const [deleteConfirmId, setDelConfId] = useState<string | null>(null);
  const [toggling, setToggling]         = useState<string | null>(null);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [notification, setNotif]        = useState<{ msg: string; ok: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const notify = (msg: string, ok = true) => {
    setNotif({ msg, ok });
    setTimeout(() => setNotif(null), 3500);
  };

  const closeMenu = () => { setMenuId(null); setDelConfId(null); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/promo-codes", { headers: { "x-admin-key": ADMIN_KEY } });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setPromos(data);
      else notify(data.error || "Erreur chargement", false);
    } catch { notify("Erreur réseau", false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) closeMenu();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Toggle active (re-fetch to get fresh server-computed status) ──
  const toggleActive = async (promo: Promo) => {
    setToggling(promo.id);
    closeMenu();
    try {
      const res  = await fetch(`/api/admin/promo-codes/${promo.id}`, {
        method: "PATCH",
        headers: { "x-admin-key": ADMIN_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ active: !promo.active }),
      });
      const data = await res.json();
      if (res.ok) {
        await load(); // re-fetch pour avoir le status recalculé server-side
        notify(data.active ? "Promotion activée" : "Promotion révoquée");
      } else notify(data.error || "Erreur", false);
    } catch { notify("Erreur réseau", false); }
    finally { setToggling(null); }
  };

  // ── canDelete: must match API rule (both counters = 0) ──────────
  const canDeletePromo = (p: Promo) => p.used_count === 0 && p.usage_records_count === 0;

  const deletePromo = async (promo: Promo) => {
    setDeleting(promo.id);
    closeMenu();
    try {
      const res  = await fetch(`/api/admin/promo-codes/${promo.id}`, {
        method: "DELETE",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const data = await res.json();
      if (res.ok) { setPromos(prev => prev.filter(p => p.id !== promo.id)); notify("Code supprimé"); }
      else notify(data.error || "Erreur suppression", false);
    } catch { notify("Erreur réseau", false); }
    finally { setDeleting(null); }
  };

  // ── Filters ──────────────────────────────────────────────────────
  const visible = promos.filter(p => {
    const matchStatus = statusFilter === "all" ? true : p.status === statusFilter;
    const q = search.trim().toLowerCase();
    const matchSearch = !q || p.code.toLowerCase().includes(q) || (p.name || "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const PILLS: { id: "all" | PromoStatus; label: string }[] = [
    { id: "all",       label: "Tous"       },
    { id: "active",    label: "Actives"    },
    { id: "scheduled", label: "Planifiées" },
    { id: "expired",   label: "Expirées"   },
    { id: "exhausted", label: "Épuisées"   },
    { id: "revoked",   label: "Révoquées"  },
  ];

  const activeCount = promos.filter(p => p.status === "active").length;
  const skeletonWidths = [220, 80, 90, 80, 90, 70, 40];

  return (
    <div style={{ minHeight: "100vh", background: "#050505", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes sk-fade { 0%,100%{opacity:.18} 50%{opacity:.07} }
        .promo-row:hover { background: rgba(255,255,255,0.02) !important; }
        .menu-btn:hover  { background: rgba(255,255,255,0.07) !important; }
        .pill-btn:hover  { color: rgba(255,255,255,0.7) !important; }
        .action-item:hover { background: rgba(255,255,255,0.06) !important; }
        .promo-link:hover  { color: #60a5fa !important; }
        input:focus-visible, select:focus-visible, button:focus-visible {
          outline: 2px solid rgba(59,130,246,0.5); outline-offset: 2px;
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
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        padding: "16px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: "#0c0c0c",
        zIndex: 50, gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/x8k3pz?t=promos" className="promo-link" style={{ color: "rgba(255,255,255,0.28)", textDecoration: "none", fontSize: 12 }}>
            Marketing
          </a>
          <span style={{ color: "rgba(255,255,255,0.15)", fontSize: 12 }}>/</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>Promotions</span>
          <span style={{
            background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.45)", borderRadius: 20,
            padding: "2px 10px", fontSize: 12, fontWeight: 700,
          }}>
            {promos.length}
          </span>
        </div>
        <Link href="/x8k3pz/promotions/new" style={{
          background: "#3B82F6", border: "none", color: "#fff",
          borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700,
          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7,
        }}>
          + Nouveau code
        </Link>
      </div>

      {/* ── Body ────────────────────────────────────────────────── */}
      <div style={{ padding: "24px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* KPI row — 2 cards */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 20px", minWidth: 100 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Actives</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#4ade80", fontVariantNumeric: "tabular-nums" }}>{activeCount}</div>
          </div>
          <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "14px 20px", minWidth: 100 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 6 }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{promos.length}</div>
          </div>
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
          <input
            placeholder="Rechercher un code ou un nom…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex: 1, maxWidth: 280,
              background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 7, padding: "8px 12px",
              color: "#fff", fontSize: 13, outline: "none",
            }}
          />
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {PILLS.map(pill => (
              <button key={pill.id} onClick={() => setStatus(pill.id)} className="pill-btn" style={{
                padding: "7px 13px",
                background: statusFilter === pill.id ? "#111" : "transparent",
                border: `1px solid ${statusFilter === pill.id ? "rgba(255,255,255,0.12)" : "transparent"}`,
                borderRadius: 7,
                color: statusFilter === pill.id ? "#fff" : "rgba(255,255,255,0.35)",
                fontSize: 12, fontWeight: statusFilter === pill.id ? 700 : 400,
                cursor: "pointer",
              }}>
                {pill.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "24px 20px" }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
                  {skeletonWidths.map((w, j) => (
                    <div key={j} style={{
                      height: 13, borderRadius: 4, background: "rgba(255,255,255,0.18)",
                      width: w, flexShrink: 0,
                      animation: "sk-fade 1.6s ease-in-out infinite",
                      animationDelay: `${(i * skeletonWidths.length + j) * 0.04}s`,
                    }} />
                  ))}
                </div>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div style={{ padding: "60px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
                {promos.length === 0 ? "Aucun code promo" : "Aucun résultat"}
              </div>
              {promos.length === 0 && (
                <Link href="/x8k3pz/promotions/new" style={{
                  display: "inline-block", padding: "8px 20px", background: "rgba(59,130,246,0.1)",
                  border: "1px solid rgba(59,130,246,0.25)", borderRadius: 7,
                  color: "#60a5fa", fontSize: 13, fontWeight: 700, textDecoration: "none",
                }}>
                  Créer le premier code
                </Link>
              )}
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    {["Promotion", "Remise", "Utilisations", "Statut", "Expire le", "Cible", ""].map(h => (
                      <th key={h} style={{
                        padding: "12px 16px", textAlign: "left",
                        color: "rgba(255,255,255,0.3)", fontWeight: 600,
                        fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8,
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visible.map(p => {
                    const busy   = toggling === p.id || deleting === p.id;
                    const canDel = canDeletePromo(p);
                    return (
                      <tr key={p.id} className="promo-row" style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        opacity: busy ? 0.5 : 1,
                        transition: "background 0.1s",
                      }}>

                        {/* PROMOTION — nom (primary) + code (monospace sub) */}
                        <td style={{ padding: "13px 16px" }}>
                          <a href={`/x8k3pz/promotions/${p.id}`} className="promo-link" style={{
                            textDecoration: "none", display: "block",
                          }}>
                            {p.name ? (
                              <>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{p.name}</div>
                                <div style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.38)", marginTop: 2, letterSpacing: "0.3px" }}>{p.code}</div>
                              </>
                            ) : (
                              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "monospace", letterSpacing: "0.5px" }}>{p.code}</div>
                            )}
                          </a>
                        </td>

                        {/* Remise */}
                        <td style={{ padding: "13px 16px", fontWeight: 800, color: "#22c55e", fontVariantNumeric: "tabular-nums", fontSize: 13 }}>
                          -{p.discount_percent}%
                        </td>

                        {/* Utilisations */}
                        <td style={{ padding: "13px 16px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                          <span style={{ color: "#fff", fontWeight: 700 }}>{p.used_count}</span>
                          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginLeft: 3 }}>
                            {p.max_uses !== null ? `/ ${p.max_uses}` : "/ ∞"}
                          </span>
                        </td>

                        {/* Statut */}
                        <td style={{ padding: "13px 16px" }}>
                          <StatusBadge status={p.status} />
                        </td>

                        {/* Expire */}
                        <td style={{ padding: "13px 16px", color: "rgba(255,255,255,0.4)", fontSize: 12, whiteSpace: "nowrap" }}>
                          {fmtDate(p.expires_at)}
                        </td>

                        {/* Cible — warning si specific + 0 produits */}
                        <td style={{ padding: "13px 16px" }}>
                          {p.targeting_mode === "specific" ? (
                            p.product_ids.length === 0 ? (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                                background: "rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.8)",
                                border: "1px solid rgba(239,68,68,0.2)",
                              }}>
                                Aucun produit
                              </span>
                            ) : (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                                background: "rgba(168,85,247,0.1)", color: "#c084fc",
                                border: "1px solid rgba(168,85,247,0.2)",
                              }}>
                                {p.product_ids.length} produit{p.product_ids.length !== 1 ? "s" : ""}
                              </span>
                            )
                          ) : (
                            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Tous</span>
                          )}
                        </td>

                        {/* Actions menu */}
                        <td style={{ padding: "13px 16px", textAlign: "right", position: "relative" }}>
                          <div style={{ position: "relative", display: "inline-block" }}>
                            <button
                              className="menu-btn"
                              onClick={() => {
                                if (menuId === p.id) closeMenu();
                                else { setMenuId(p.id); setDelConfId(null); }
                              }}
                              disabled={busy}
                              aria-label="Actions de la promotion"
                              style={{
                                width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
                                background: "transparent", color: "rgba(255,255,255,0.4)",
                                cursor: busy ? "default" : "pointer", fontSize: 16,
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              ···
                            </button>

                            {menuId === p.id && (
                              <div ref={menuRef} style={{
                                position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100,
                                background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: 8, padding: 4, minWidth: 170,
                                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                              }}>
                                {deleteConfirmId === p.id ? (
                                  /* ─ Confirmation step ─ */
                                  <>
                                    <div style={{ padding: "8px 12px 6px", fontSize: 12, color: "rgba(255,255,255,0.45)", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
                                      Supprimer définitivement ?
                                    </div>
                                    <button
                                      className="action-item"
                                      onClick={() => deletePromo(p)}
                                      style={{
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "8px 12px", background: "transparent", border: "none",
                                        borderRadius: 5, color: "rgba(239,68,68,0.9)",
                                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                                      }}
                                    >
                                      Confirmer la suppression
                                    </button>
                                    <button
                                      className="action-item"
                                      onClick={() => setDelConfId(null)}
                                      style={{
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "8px 12px", background: "transparent", border: "none",
                                        borderRadius: 5, color: "rgba(255,255,255,0.45)",
                                        fontSize: 12, cursor: "pointer",
                                      }}
                                    >
                                      Annuler
                                    </button>
                                  </>
                                ) : (
                                  /* ─ Normal menu ─ */
                                  <>
                                    <button
                                      className="action-item"
                                      onClick={() => toggleActive(p)}
                                      style={{
                                        display: "block", width: "100%", textAlign: "left",
                                        padding: "8px 12px", background: "transparent", border: "none",
                                        borderRadius: 5,
                                        color: p.active ? "rgba(245,158,11,0.85)" : "#4ade80",
                                        fontSize: 12, cursor: "pointer",
                                      }}
                                    >
                                      {p.active ? "Révoquer" : "Activer"}
                                    </button>
                                    {canDel ? (
                                      <button
                                        className="action-item"
                                        onClick={() => setDelConfId(p.id)}
                                        style={{
                                          display: "block", width: "100%", textAlign: "left",
                                          padding: "8px 12px", background: "transparent", border: "none",
                                          borderRadius: 5, color: "rgba(239,68,68,0.85)",
                                          fontSize: 12, cursor: "pointer",
                                        }}
                                      >
                                        Supprimer
                                      </button>
                                    ) : (
                                      <div style={{ padding: "7px 12px", fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                                        Code utilisé — révoquez plutôt
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && visible.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "right" }}>
            {visible.length} sur {promos.length} code{promos.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
