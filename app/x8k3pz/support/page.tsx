"use client";
// ── Support Center — /x8k3pz/support ─────────────────────────────────────────
// Interface admin de traitement des tickets de support.
// Tickets créés via /api/support (formulaire public).
// Notes internes via admin_notes (target_type = 'support_ticket').
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ────────────────────────────────────────────────────────────────────

type SupportTicket = {
  id:          string;
  user_id:     string | null;
  first_name:  string;
  last_name:   string;
  email:       string;
  subject:     string | null;
  message?:    string;          // chargé à l'expand
  status:      "new" | "open" | "resolved";
  category:    string | null;
  assigned_to: string | null;
  created_at:  string;
  updated_at:  string;
  resolved_at: string | null;
};

type Note = {
  id:           string;
  content:      string;
  author_email: string;
  created_at:   string;
};

// ── Constantes ───────────────────────────────────────────────────────────────

const CATEGORIES = ["billing", "challenge", "mt5", "reward", "kyc", "technical", "other"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<string, string> = {
  billing:   "Facturation",
  challenge: "Challenge",
  mt5:       "MT5",
  reward:    "Reward",
  kyc:       "KYC",
  technical: "Technique",
  other:     "Autre",
};

const CATEGORY_COLORS: Record<string, string> = {
  billing:   "#f59e0b",
  challenge: "#3b82f6",
  mt5:       "#8b5cf6",
  reward:    "#22c55e",
  kyc:       "#06b6d4",
  technical: "#f97316",
  other:     "rgba(255,255,255,0.4)",
};

const STATUS_CONFIG = {
  new:      { label: "Nouveau",    bg: "rgba(59,130,246,0.15)",  color: "#60a5fa",  border: "rgba(59,130,246,0.3)"  },
  open:     { label: "En cours",   bg: "rgba(245,158,11,0.15)",  color: "#fbbf24",  border: "rgba(245,158,11,0.3)"  },
  resolved: { label: "Résolu",     bg: "rgba(34,197,94,0.12)",   color: "#4ade80",  border: "rgba(34,197,94,0.25)"  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)       return "À l'instant";
  if (diff < 3600)     return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}j`;
  return fmtDate(iso);
}

// ── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" as const,
      padding: "3px 9px", borderRadius: 100, whiteSpace: "nowrap" as const,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

// ── CategoryBadge ────────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>—</span>;
  const color = CATEGORY_COLORS[category] ?? "rgba(255,255,255,0.4)";
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const,
      padding: "2px 8px", borderRadius: 4,
      background: `${color}18`, color, border: `1px solid ${color}30`,
    }}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

// ── TicketNotes — section notes internes ─────────────────────────────────────

function TicketNotes({ ticketId }: { ticketId: string }) {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [draft, setDraft]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/notes?target_type=support_ticket&target_id=${ticketId}`, {
      headers: { "x-admin-key": ADMIN_KEY },
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setNotes(d.notes ?? []); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [ticketId]);

  const addNote = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ target_type: "support_ticket", target_id: ticketId, content: trimmed }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Erreur inconnue"); return; }
      setNotes(prev => [d.note as Note, ...prev]);
      setDraft("");
    } catch { setError("Erreur réseau"); }
    finally { setSaving(false); }
  };

  const deleteNote = async (id: string) => {
    setDeleting(id); setError(null);
    try {
      const res = await fetch(`/api/admin/notes?id=${id}`, { method: "DELETE", headers: { "x-admin-key": ADMIN_KEY } });
      if (!res.ok) { const d = await res.json(); setError(d.error || "Erreur"); return; }
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch { setError("Erreur réseau"); }
    finally { setDeleting(null); }
  };

  if (!loaded) return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", padding: "8px 0" }}>Chargement des notes…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Formulaire */}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <textarea
          value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="Ajouter une note interne…" rows={3}
          style={{ width: "100%", boxSizing: "border-box", background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "9px 13px", color: "#fff", fontSize: 13, resize: "vertical", outline: "none", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={addNote} disabled={saving || !draft.trim()}
            style={{ padding: "7px 16px", background: saving || !draft.trim() ? "rgba(59,130,246,0.2)" : "#3b82f6", border: "none", borderRadius: 7, color: "#fff", fontSize: 12, fontWeight: 700, cursor: saving || !draft.trim() ? "not-allowed" : "pointer" }}
          >
            {saving ? "Enregistrement…" : "Ajouter"}
          </button>
          {draft.trim().length > 0 && (
            <span style={{ fontSize: 11, color: draft.trim().length > 3800 ? "#ef4444" : "rgba(255,255,255,0.25)" }}>
              {draft.trim().length} / 4000
            </span>
          )}
          {error && <span style={{ fontSize: 12, color: "#ef4444" }}>{error}</span>}
        </div>
      </div>

      {/* Liste */}
      {notes.length === 0
        ? <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucune note.</div>
        : notes.map(note => (
          <div key={note.id} style={{ background: "#0f1117", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "11px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{note.author_email}</span>
                <span>{fmtDateTime(note.created_at)}</span>
              </div>
              <button
                onClick={() => deleteNote(note.id)} disabled={deleting === note.id}
                style={{ background: "none", border: "none", color: deleting === note.id ? "rgba(255,255,255,0.2)" : "rgba(239,68,68,0.5)", cursor: deleting === note.id ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600, flexShrink: 0, padding: "1px 4px" }}
              >
                {deleting === note.id ? "…" : "Supprimer"}
              </button>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: "1.55", whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const }}>
              {note.content}
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ── TicketDetail — contenu accordéon ─────────────────────────────────────────

function TicketDetail({
  ticket,
  onStatusChange,
  onCategoryChange,
}: {
  ticket: SupportTicket;
  onStatusChange: (id: string, status: SupportTicket["status"]) => Promise<void>;
  onCategoryChange: (id: string, category: string | null) => Promise<void>;
}) {
  const [statusSaving, setStatusSaving]     = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);

  const changeStatus = async (newStatus: SupportTicket["status"]) => {
    setStatusSaving(true);
    try { await onStatusChange(ticket.id, newStatus); }
    finally { setStatusSaving(false); }
  };

  const changeCategory = async (newCat: string) => {
    setCategorySaving(true);
    try { await onCategoryChange(ticket.id, newCat === "" ? null : newCat); }
    finally { setCategorySaving(false); }
  };

  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 22 }}>

      {/* ── Identité + actions statut ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const, justifyContent: "space-between", alignItems: "flex-start" }}>

        {/* Identité */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>
            {ticket.first_name} {ticket.last_name}
          </div>
          <a href={`mailto:${ticket.email}`} style={{ fontSize: 13, color: "#60a5fa", textDecoration: "none" }}>
            {ticket.email}
          </a>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginTop: 4, alignItems: "center" }}>
            {ticket.user_id && (
              <Link href={`/x8k3pz/traders/${ticket.user_id}`} style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(59,130,246,0.3)", padding: "2px 8px", borderRadius: 4 }}>
                Voir fiche trader ↗
              </Link>
            )}
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
              #{ticket.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
          {ticket.resolved_at && (
            <div style={{ fontSize: 11, color: "#4ade80", marginTop: 2 }}>
              Résolu le {fmtDateTime(ticket.resolved_at)}
            </div>
          )}
        </div>

        {/* Actions statut */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
            {ticket.status === "new" && (
              <button
                onClick={() => changeStatus("open")} disabled={statusSaving}
                style={{ padding: "7px 16px", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 7, color: "#fbbf24", fontSize: 12, fontWeight: 700, cursor: statusSaving ? "not-allowed" : "pointer" }}
              >
                {statusSaving ? "…" : "Prendre en charge"}
              </button>
            )}
            {ticket.status === "open" && (
              <button
                onClick={() => changeStatus("resolved")} disabled={statusSaving}
                style={{ padding: "7px 16px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 7, color: "#4ade80", fontSize: 12, fontWeight: 700, cursor: statusSaving ? "not-allowed" : "pointer" }}
              >
                {statusSaving ? "…" : "Marquer résolu"}
              </button>
            )}
            {ticket.status === "resolved" && (
              <button
                onClick={() => changeStatus("open")} disabled={statusSaving}
                style={{ padding: "7px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7, color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, cursor: statusSaving ? "not-allowed" : "pointer" }}
              >
                {statusSaving ? "…" : "Rouvrir"}
              </button>
            )}
          </div>

          {/* Catégorie */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Catégorie</span>
            <select
              value={ticket.category ?? ""}
              onChange={e => changeCategory(e.target.value)}
              disabled={categorySaving}
              style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, cursor: "pointer", outline: "none" }}
            >
              <option value="">— Non catégorisé</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            {categorySaving && <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>…</span>}
          </div>
        </div>
      </div>

      {/* ── Métadonnées ─────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
        {([
          { label: "Créé le",       value: fmtDateTime(ticket.created_at)  },
          { label: "Mis à jour",    value: fmtDateTime(ticket.updated_at)  },
          { label: "Statut",        value: STATUS_CONFIG[ticket.status].label },
          { label: "Assigné à",     value: ticket.assigned_to ?? "—"       },
          { label: "User ID",       value: ticket.user_id ? ticket.user_id.slice(0, 16) + "…" : "Visiteur" },
        ] as { label: string; value: string }[]).map((m, i) => (
          <div key={i} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 7, padding: "9px 12px" }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* ── Subject ─────────────────────────────────────────────────────────── */}
      {ticket.subject && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 6 }}>Objet</div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>{ticket.subject}</div>
        </div>
      )}

      {/* ── Message ──────────────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 8 }}>Message</div>
        {ticket.message
          ? (
            <div style={{
              fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: "1.7",
              background: "#0f1117", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8, padding: "14px 16px",
              whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const,
            }}>
              {ticket.message}
            </div>
          )
          : <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Message non chargé.</div>
        }
      </div>

      {/* ── Notes internes ───────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 }}>Notes internes</div>
        <TicketNotes ticketId={ticket.id} />
      </div>

    </div>
  );
}

// ── TicketRow — ligne accordéon ───────────────────────────────────────────────

function TicketRow({
  ticket,
  isOpen,
  onToggle,
  onStatusChange,
  onCategoryChange,
}: {
  ticket: SupportTicket;
  isOpen: boolean;
  onToggle: () => void;
  onStatusChange: (id: string, status: SupportTicket["status"]) => Promise<void>;
  onCategoryChange: (id: string, category: string | null) => Promise<void>;
}) {
  return (
    <div style={{
      background: "#0c0c0c",
      border: `1px solid ${isOpen ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 10, overflow: "hidden",
    }}>
      {/* Ligne fermée */}
      <div
        onClick={onToggle}
        style={{ padding: "13px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", flexWrap: "wrap" as const }}
      >
        {/* Indicateur statut new */}
        {ticket.status === "new" && (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#60a5fa", flexShrink: 0, boxShadow: "0 0 8px #60a5fa" }} />
        )}

        {/* Identité */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
            {ticket.first_name} {ticket.last_name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{ticket.email}</div>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" as const }}>
          <CategoryBadge category={ticket.category} />
          <StatusBadge status={ticket.status} />
        </div>

        {/* Dates */}
        <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{fmtDate(ticket.created_at)}</div>
          {ticket.updated_at !== ticket.created_at && (
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
              màj {fmtRelative(ticket.updated_at)}
            </div>
          )}
        </div>

        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, flexShrink: 0 }}>{isOpen ? "▲" : "▼"}</div>
      </div>

      {/* Accordéon */}
      {isOpen && (
        <TicketDetail
          ticket={ticket}
          onStatusChange={onStatusChange}
          onCategoryChange={onCategoryChange}
        />
      )}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────

export default function SupportPage() {
  const [tickets, setTickets]     = useState<SupportTicket[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(1);
  const [totalNew, setTotalNew]   = useState(0);

  // Filtres
  const [statusFilter, setStatusFilter]     = useState<"all" | "new" | "open" | "resolved">("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch]                 = useState("");
  const [searchInput, setSearchInput]       = useState("");
  const searchTimer                         = useRef<ReturnType<typeof setTimeout> | null>(null);

  // UI
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Stocke le message complet quand un ticket est étendu
  const [fullTickets, setFullTickets] = useState<Record<string, string>>({});

  const LIMIT = 25;

  // ── Chargement tickets ──────────────────────────────────────────────────
  const loadTickets = useCallback(async (
    st: string, cat: string, q: string, pg: number
  ) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({
        status:   st,
        category: cat,
        search:   q,
        page:     String(pg),
        limit:    String(LIMIT),
      });
      const res = await fetch(`/api/admin/support?${params}`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setTickets(d.tickets ?? []);
      setTotal(d.total ?? 0);
      setTotalPages(d.totalPages ?? 1);
      setTotalNew(d.totalNew ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets(statusFilter, categoryFilter, search, page);
  }, [statusFilter, categoryFilter, search, page, loadTickets]);

  // Debounce search
  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val.trim());
      setPage(1);
    }, 350);
  };

  // Changement de filtre → reset page
  const changeStatus = (st: "all" | "new" | "open" | "resolved") => {
    setStatusFilter(st); setPage(1); setExpandedId(null);
  };
  const changeCategory = (cat: string) => {
    setCategoryFilter(cat); setPage(1); setExpandedId(null);
  };

  // ── Expand ticket + chargement message complet ──────────────────────────
  const toggleExpand = useCallback(async (ticketId: string) => {
    if (expandedId === ticketId) { setExpandedId(null); return; }
    setExpandedId(ticketId);

    // Charger le message complet si pas déjà en cache
    if (!fullTickets[ticketId]) {
      try {
        const res = await fetch(`/api/admin/support/${ticketId}`, {
          headers: { "x-admin-key": ADMIN_KEY },
        });
        if (res.ok) {
          const d = await res.json();
          setFullTickets(prev => ({ ...prev, [ticketId]: d.ticket?.message ?? "" }));
        }
      } catch {
        // Le message ne sera pas affiché — pas bloquant
      }
    }
  }, [expandedId, fullTickets]);

  // ── Changement de statut ────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (
    ticketId: string,
    newStatus: SupportTicket["status"]
  ) => {
    const res = await fetch(`/api/admin/support/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) return;
    const d = await res.json();
    const updated = d.ticket as SupportTicket;
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updated } : t));
    // Mettre à jour le compteur new
    if (newStatus !== "new") setTotalNew(prev => Math.max(0, prev - (updated.status === "new" ? 0 : 0)));
    // Recharger proprement pour que les compteurs soient à jour
    await loadTickets(statusFilter, categoryFilter, search, page);
  }, [statusFilter, categoryFilter, search, page, loadTickets]);

  // ── Changement de catégorie ─────────────────────────────────────────────
  const handleCategoryChange = useCallback(async (
    ticketId: string,
    newCat: string | null
  ) => {
    const res = await fetch(`/api/admin/support/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
      body: JSON.stringify({ category: newCat }),
    });
    if (!res.ok) return;
    const d = await res.json();
    const updated = d.ticket as SupportTicket;
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...updated } : t));
  }, []);

  // Enrichir les tickets avec le message complet depuis le cache
  const enrichedTickets = tickets.map(t => ({
    ...t,
    message: fullTickets[t.id] ?? t.message,
  }));

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <main style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: "#fff", margin: 0 }}>Support Center</h1>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", margin: "4px 0 0" }}>
            {loading ? "Chargement…" : `${total} ticket${total !== 1 ? "s" : ""}${totalNew > 0 ? ` · ${totalNew} nouveau${totalNew !== 1 ? "x" : ""}` : ""}`}
          </p>
        </div>
      </div>

      {/* Filtres statut (tabs) */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
        {([
          { key: "all",      label: "Tous",     count: total          },
          { key: "new",      label: "Nouveaux", count: totalNew       },
          { key: "open",     label: "En cours", count: null           },
          { key: "resolved", label: "Résolus",  count: null           },
        ] as { key: "all" | "new" | "open" | "resolved"; label: string; count: number | null }[]).map(tab => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => changeStatus(tab.key)}
              style={{
                padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 500, cursor: "pointer",
                background: active ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "rgba(59,130,246,0.35)" : "rgba(255,255,255,0.08)"}`,
                color: active ? "#60a5fa" : "rgba(255,255,255,0.55)",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 800, background: active ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.1)", color: active ? "#93c5fd" : "rgba(255,255,255,0.5)", padding: "1px 6px", borderRadius: 10 }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Recherche + filtre catégorie */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" }}>
        <input
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Rechercher (email, nom, objet)…"
          style={{ flex: 1, minWidth: 220, maxWidth: 360, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 13px", color: "#fff", fontSize: 13, outline: "none" }}
        />
        <select
          value={categoryFilter}
          onChange={e => changeCategory(e.target.value)}
          style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 13px", color: categoryFilter ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", outline: "none" }}
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: "14px 18px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, color: "#ef4444", fontSize: 13 }}>
          Erreur : {error}
          <button onClick={() => loadTickets(statusFilter, categoryFilter, search, page)} style={{ marginLeft: 12, background: "none", border: "none", color: "#60a5fa", cursor: "pointer", fontSize: 12, textDecoration: "underline" }}>
            Réessayer
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 40, textAlign: "center" as const, color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
          Chargement…
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && tickets.length === 0 && (
        <div style={{ padding: "48px 24px", textAlign: "center" as const, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
          {search || categoryFilter || statusFilter !== "all"
            ? "Aucun ticket ne correspond aux filtres."
            : "Aucun ticket support."}
        </div>
      )}

      {/* Liste */}
      {!loading && tickets.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {enrichedTickets.map(ticket => (
            <TicketRow
              key={ticket.id}
              ticket={ticket}
              isOpen={expandedId === ticket.id}
              onToggle={() => toggleExpand(ticket.id)}
              onStatusChange={handleStatusChange}
              onCategoryChange={handleCategoryChange}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center" as const, gap: 8, paddingTop: 8 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ padding: "7px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: page <= 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 12, cursor: page <= 1 ? "not-allowed" : "pointer" }}
          >
            ← Précédent
          </button>
          <span style={{ padding: "7px 14px", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ padding: "7px 14px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: page >= totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", fontSize: 12, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
          >
            Suivant →
          </button>
        </div>
      )}

    </main>
  );
}
