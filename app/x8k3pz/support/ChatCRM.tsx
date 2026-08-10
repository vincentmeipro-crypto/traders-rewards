"use client";
// ── ChatCRM — Live Chat CRM Admin ─────────────────────────────────────────────
// Interface admin 2 colonnes : liste conversations + détail.
// Polling liste 4s / détail 3s (pas de Realtime : admin utilise x-admin-key, pas JWT).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ────────────────────────────────────────────────────────────────────

type ChatStatus = "waiting_support" | "open" | "waiting_client" | "closed";

type ConvSummary = {
  id:                   string;
  user_id:              string | null;
  email:                string | null;
  first_name:           string | null;
  last_name:            string | null;
  status:               ChatStatus;
  last_message_at:      string | null;
  created_at:           string;
  support_ticket_id:    string | null;
  unread_count:         number;
  last_message_preview: string | null;
  last_message_sender:  string | null;
};

type ConvDetail = ConvSummary & {
  updated_at:         string;
  admin_last_read_at: string | null;
  client_last_read_at: string | null;
};

type ChatMessage = {
  id:          string;
  sender_type: "client" | "admin" | "system";
  message:     string;
  created_at:  string;
};

type Note = {
  id:           string;
  content:      string;
  author_email: string;
  created_at:   string;
};

// ── Constantes ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ChatStatus, { label: string; bg: string; color: string; border: string }> = {
  waiting_support: { label: "À répondre",     bg: "rgba(239,68,68,0.12)",   color: "#f87171", border: "rgba(239,68,68,0.25)"  },
  open:            { label: "En cours",        bg: "rgba(245,158,11,0.15)",  color: "#fbbf24", border: "rgba(245,158,11,0.3)"  },
  waiting_client:  { label: "Attend client",   bg: "rgba(59,130,246,0.15)",  color: "#60a5fa", border: "rgba(59,130,246,0.3)"  },
  closed:          { label: "Fermée",          bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.3)", border: "rgba(255,255,255,0.1)" },
};

const STATUS_FILTER_TABS: { key: "all" | ChatStatus; label: string }[] = [
  { key: "all",             label: "Tous"          },
  { key: "waiting_support", label: "À répondre"    },
  { key: "open",            label: "En cours"      },
  { key: "waiting_client",  label: "Attend client" },
  { key: "closed",          label: "Fermées"       },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)       return "À l'instant";
  if (diff < 3600)     return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)    return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function displayName(conv: Pick<ConvSummary, "first_name" | "last_name" | "email">): string {
  const name = [conv.first_name, conv.last_name].filter(Boolean).join(" ");
  return name || conv.email || "Visiteur anonyme";
}

// ── ChatStatusBadge ──────────────────────────────────────────────────────────

function ChatStatusBadge({ status }: { status: ChatStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase" as const,
      padding: "2px 8px", borderRadius: 100, whiteSpace: "nowrap" as const,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

// ── ConvNotes — notes internes sur une conversation ───────────────────────────

function ConvNotes({ convId }: { convId: string }) {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [draft, setDraft]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/admin/notes?target_type=chat_conversation&target_id=${convId}`, {
      headers: { "x-admin-key": ADMIN_KEY },
    })
      .then(r => r.json())
      .then(d => { if (!cancelled) { setNotes(d.notes ?? []); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [convId]);

  const addNote = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ target_type: "chat_conversation", target_id: convId, content: trimmed }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Erreur"); return; }
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

  if (!loaded) return <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Chargement…</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <textarea
          value={draft} onChange={e => setDraft(e.target.value)}
          placeholder="Ajouter une note interne…" rows={2}
          style={{ width: "100%", boxSizing: "border-box", background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px", color: "#fff", fontSize: 12, resize: "vertical", outline: "none", fontFamily: "inherit" }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={addNote} disabled={saving || !draft.trim()}
            style={{ padding: "6px 14px", background: saving || !draft.trim() ? "rgba(59,130,246,0.15)" : "#3b82f6", border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 700, cursor: saving || !draft.trim() ? "not-allowed" : "pointer" }}
          >
            {saving ? "…" : "Ajouter"}
          </button>
          {error && <span style={{ fontSize: 11, color: "#ef4444" }}>{error}</span>}
        </div>
      </div>
      {notes.length === 0
        ? <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", margin: 0 }}>Aucune note.</p>
        : notes.map(note => (
          <div key={note.id} style={{ background: "#0f1117", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 8, padding: "10px 13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>{note.author_email}</span>
                {" · "}{fmtDateTime(note.created_at)}
              </span>
              <button
                onClick={() => deleteNote(note.id)} disabled={deleting === note.id}
                style={{ background: "none", border: "none", color: deleting === note.id ? "rgba(255,255,255,0.2)" : "rgba(239,68,68,0.5)", cursor: deleting === note.id ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600 }}
              >
                {deleting === note.id ? "…" : "Suppr."}
              </button>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", lineHeight: "1.55", whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const, margin: 0 }}>
              {note.content}
            </p>
          </div>
        ))
      }
    </div>
  );
}

// ── ConvRow — ligne dans la liste gauche ──────────────────────────────────────

function ConvRow({
  conv,
  isSelected,
  onClick,
}: {
  conv: ConvSummary;
  isSelected: boolean;
  onClick: () => void;
}) {
  const name = displayName(conv);
  const isUnread = conv.unread_count > 0;

  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        background: isSelected ? "rgba(59,130,246,0.08)" : "transparent",
        border: `1px solid ${isSelected ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 8, cursor: "pointer",
        transition: "background 0.1s, border-color 0.1s",
        display: "flex", flexDirection: "column", gap: 5,
      }}
    >
      {/* Ligne 1 : nom + badge statut + unread */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, flex: 1 }}>
          {isUnread && (
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f87171", flexShrink: 0, boxShadow: "0 0 6px #f87171" }} />
          )}
          <span style={{
            fontSize: 12, fontWeight: isUnread ? 700 : 600, color: isUnread ? "#fff" : "rgba(255,255,255,0.75)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1,
          }}>
            {name}
          </span>
        </div>
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexShrink: 0 }}>
          {conv.unread_count > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, background: "#ef4444", color: "#fff", padding: "1px 6px", borderRadius: 10, minWidth: 18, textAlign: "center" as const }}>
              {conv.unread_count}
            </span>
          )}
          <ChatStatusBadge status={conv.status} />
        </div>
      </div>

      {/* Ligne 2 : preview + date */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{
          fontSize: 11, color: "rgba(255,255,255,0.3)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, flex: 1,
        }}>
          {conv.last_message_preview
            ? `${conv.last_message_sender === "admin" ? "Vous : " : ""}${conv.last_message_preview}`
            : conv.email ?? "Email non renseigné"}
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>
          {fmtRelative(conv.last_message_at ?? conv.created_at)}
        </span>
      </div>
    </div>
  );
}

// ── ChatDetail — panneau droit ────────────────────────────────────────────────

function ChatDetail({
  convId,
  onConvUpdate,
}: {
  convId: string;
  onConvUpdate: (conv: ConvSummary) => void;
}) {
  const [conv, setConv]         = useState<ConvDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState<string | null>(null);

  // Compose
  const [draft, setDraft]       = useState("");
  const [sending, setSending]   = useState(false);
  const [sendErr, setSendErr]   = useState<string | null>(null);

  // Actions
  const [actionBusy, setActionBusy] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convertDone, setConvertDone] = useState<string | null>(null); // ticketId

  // Notes tab
  const [showNotes, setShowNotes] = useState(false);

  const messagesEndRef         = useRef<HTMLDivElement>(null);
  const pollingRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchFnRef             = useRef<(() => Promise<void>) | undefined>(undefined);
  // Anti-spam /read : on ne rappelle que si un nouveau message client arrive
  const lastMarkedTimestampRef = useRef<string | null>(null);
  const inFlightReadRef        = useRef(false);

  // ── Fetch détail ──────────────────────────────────────────────────────────
  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/chat/${convId}`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      if (!res.ok) { if (!conv) setLoadErr("Conversation introuvable"); return; }
      const d = await res.json();
      const convData = d.conversation as ConvDetail;
      const msgsData = d.messages as ChatMessage[];
      setConv(convData);
      setMessages(msgsData);
      setLoading(false);
      setLoadErr(null);
      // Remonter pour MAJ unread_count dans la liste
      onConvUpdate({ ...convData, unread_count: 0, last_message_preview: null, last_message_sender: null });

      // ── Auto-mark lu : détection de nouveau message client non lu ─────────
      // Appelé uniquement si un message client plus récent que admin_last_read_at
      // est détecté. Protection anti-spam : lock inFlightReadRef + suivi du
      // timestamp du dernier message marqué (lastMarkedTimestampRef).
      const clientMsgs   = msgsData.filter((m: ChatMessage) => m.sender_type === "client");
      const latestClient = clientMsgs.at(-1);
      if (latestClient) {
        const adminLastRead = convData.admin_last_read_at;
        const isUnread = !adminLastRead || latestClient.created_at > adminLastRead;
        if (
          isUnread &&
          latestClient.created_at !== lastMarkedTimestampRef.current &&
          !inFlightReadRef.current
        ) {
          inFlightReadRef.current        = true;
          lastMarkedTimestampRef.current = latestClient.created_at;
          fetch(`/api/admin/chat/${convId}/read`, {
            method: "POST",
            headers: { "x-admin-key": ADMIN_KEY },
          }).catch(() => null).finally(() => { inFlightReadRef.current = false; });
        }
      }
    } catch {
      if (!conv) setLoadErr("Erreur réseau");
    }
  }, [convId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toujours à jour dans le ref pour le polling
  useEffect(() => { fetchFnRef.current = fetchDetail; }, [fetchDetail]);

  // ── Initialisation + polling 3s ───────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setLoadErr(null);
    setConv(null);
    setMessages([]);
    setDraft("");
    setSendErr(null);
    setShowNotes(false);
    setConvertDone(null);
    lastMarkedTimestampRef.current = null;
    inFlightReadRef.current        = false;

    fetchFnRef.current?.();

    pollingRef.current = setInterval(() => {
      fetchFnRef.current?.();
    }, 3_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [convId]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // /read est désormais géré entièrement dans fetchDetail (auto-mark).
  // Plus besoin d'un useEffect séparé — logique centralisée + anti-spam.

  // ── Envoyer message admin ─────────────────────────────────────────────────
  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed || sending) return;
    setSending(true); setSendErr(null);
    try {
      const res = await fetch(`/api/admin/chat/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ message: trimmed }),
      });
      const d = await res.json();
      if (!res.ok) { setSendErr(d.error || "Erreur"); return; }
      setDraft("");
      // Ajouter immédiatement + refresh complet
      setMessages(prev => [...prev, d.message as ChatMessage]);
      if (conv) setConv(c => c ? { ...c, status: "waiting_client" } : c);
      await fetchFnRef.current?.();
    } catch { setSendErr("Erreur réseau"); }
    finally { setSending(false); }
  };

  // ── Changer statut ────────────────────────────────────────────────────────
  const changeStatus = async (status: ChatStatus) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/admin/chat/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ status }),
      });
      const d = await res.json();
      if (!res.ok) return;
      const updated = d.conversation as ConvDetail;
      setConv(updated);
      onConvUpdate({ ...updated, unread_count: 0, last_message_preview: null, last_message_sender: null });
    } catch { /* silent */ }
    finally { setActionBusy(false); }
  };

  // ── Convertir en ticket ───────────────────────────────────────────────────
  const convertToTicket = async () => {
    if (converting) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/admin/chat/${convId}/convert-ticket`, {
        method: "POST",
        headers: { "x-admin-key": ADMIN_KEY },
      });
      const d = await res.json();
      if (!res.ok) return;
      setConvertDone(d.ticketId as string);
      if (conv) setConv(c => c ? { ...c, support_ticket_id: d.ticketId } : c);
    } catch { /* silent */ }
    finally { setConverting(false); }
  };

  // ── Envoi au Enter (Shift+Enter = nouvelle ligne) ─────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading && !conv) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.2)", fontSize: 13 }}>
        Chargement…
      </div>
    );
  }

  if (loadErr || !conv) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#ef4444", fontSize: 13 }}>
        {loadErr ?? "Erreur de chargement"}
      </div>
    );
  }

  const name = displayName(conv);

  // ── Boutons statut ────────────────────────────────────────────────────────
  const statusActions: { label: string; status: ChatStatus; color: string; bg: string; border: string }[] = [];
  if (conv.status === "waiting_support") {
    statusActions.push({ label: "Prendre en charge", status: "open",   color: "#fbbf24", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" });
    statusActions.push({ label: "Fermer",            status: "closed", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" });
  } else if (conv.status === "open") {
    statusActions.push({ label: "Fermer",            status: "closed",          color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" });
  } else if (conv.status === "waiting_client") {
    statusActions.push({ label: "Réouvrir",          status: "open",            color: "#fbbf24", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" });
    statusActions.push({ label: "Fermer",            status: "closed",          color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" });
  } else if (conv.status === "closed") {
    statusActions.push({ label: "Rouvrir",           status: "waiting_support", color: "#f87171", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)" });
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>

      {/* ── Header conversation ────────────────────────────────────────────── */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{name}</span>
            <ChatStatusBadge status={conv.status} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" as const, alignItems: "center" }}>
            {conv.email
              ? <a href={`mailto:${conv.email}`} style={{ fontSize: 11, color: "#60a5fa", textDecoration: "none" }}>{conv.email}</a>
              : <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>Email non renseigné</span>
            }
            {conv.user_id && (
              <Link href={`/x8k3pz/traders/${conv.user_id}`} target="_blank" style={{ fontSize: 11, color: "#3b82f6", fontWeight: 600, textDecoration: "none", border: "1px solid rgba(59,130,246,0.3)", padding: "2px 7px", borderRadius: 4 }}>
                Fiche trader ↗
              </Link>
            )}
            {(conv.support_ticket_id ?? convertDone) && (
              <span style={{ fontSize: 10, color: "#4ade80", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                Ticket #{(conv.support_ticket_id ?? convertDone)!.slice(0, 8).toUpperCase()}
              </span>
            )}
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
              #{conv.id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Actions statut + convert */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const, alignItems: "center" }}>
          {statusActions.map(a => (
            <button
              key={a.status}
              onClick={() => changeStatus(a.status)}
              disabled={actionBusy}
              style={{ padding: "5px 12px", background: a.bg, border: `1px solid ${a.border}`, borderRadius: 7, color: a.color, fontSize: 11, fontWeight: 700, cursor: actionBusy ? "not-allowed" : "pointer" }}
            >
              {actionBusy ? "…" : a.label}
            </button>
          ))}
          {!(conv.support_ticket_id ?? convertDone) && (
            <button
              onClick={convertToTicket}
              disabled={converting}
              style={{ padding: "5px 12px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 7, color: "#a78bfa", fontSize: 11, fontWeight: 700, cursor: converting ? "not-allowed" : "pointer" }}
            >
              {converting ? "…" : "→ Ticket"}
            </button>
          )}
          <button
            onClick={() => setShowNotes(n => !n)}
            style={{ padding: "5px 12px", background: showNotes ? "rgba(250,204,21,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${showNotes ? "rgba(250,204,21,0.3)" : "rgba(255,255,255,0.1)"}`, borderRadius: 7, color: showNotes ? "#fde047" : "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            📝 Notes
          </button>
        </div>
      </div>

      {/* ── Panel Notes (optionnel) ────────────────────────────────────────── */}
      {showNotes && (
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", background: "#080a0e" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase" as const, letterSpacing: 1, marginBottom: 10 }}>Notes internes</div>
          <ConvNotes convId={convId} />
        </div>
      )}

      {/* ── Messages ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center" as const, color: "rgba(255,255,255,0.2)", fontSize: 12, paddingTop: 20 }}>
            Aucun message pour le moment.
          </div>
        )}
        {messages.map(msg => {
          const isAdmin  = msg.sender_type === "admin";
          const isSystem = msg.sender_type === "system";
          if (isSystem) {
            return (
              <div key={msg.id} style={{ textAlign: "center" as const }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)", padding: "3px 10px", borderRadius: 20 }}>
                  {msg.message}
                </span>
              </div>
            );
          }
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
              <div style={{
                maxWidth: "75%", padding: "9px 14px", borderRadius: 12,
                background: isAdmin ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.07)",
                border: `1px solid ${isAdmin ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.1)"}`,
              }}>
                <p style={{
                  margin: "0 0 4px 0", fontSize: 12.5, color: isAdmin ? "#93c5fd" : "rgba(255,255,255,0.85)",
                  lineHeight: "1.55", whiteSpace: "pre-wrap" as const, wordBreak: "break-word" as const,
                }}>
                  {msg.message}
                </p>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                  {isAdmin ? "Admin · " : ""}{fmtDateTime(msg.created_at)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Compose ───────────────────────────────────────────────────────── */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 10, alignItems: "flex-end" }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Répondre… (Enter pour envoyer, Shift+Enter pour nouvelle ligne)"
          rows={2}
          disabled={sending}
          style={{
            flex: 1, background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9, padding: "9px 13px",
            color: "#fff", fontSize: 13, resize: "none" as const, outline: "none", fontFamily: "inherit", minHeight: 56,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !draft.trim()}
          style={{
            padding: "9px 18px", background: sending || !draft.trim() ? "rgba(59,130,246,0.2)" : "#3b82f6",
            border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 700,
            cursor: sending || !draft.trim() ? "not-allowed" : "pointer", height: 56, flexShrink: 0,
          }}
        >
          {sending ? "…" : "Envoyer"}
        </button>
      </div>
      {sendErr && (
        <div style={{ padding: "0 18px 10px", fontSize: 12, color: "#ef4444" }}>{sendErr}</div>
      )}
    </div>
  );
}

// ── ChatCRM — composant principal ─────────────────────────────────────────────

export default function ChatCRM() {
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [total, setTotal]                 = useState(0);
  const [totalPages, setTotalPages]       = useState(1);
  const [page, setPage]                   = useState(1);
  const [totalWaiting, setTotalWaiting]   = useState(0);

  const [statusFilter, setStatusFilter] = useState<"all" | ChatStatus>("all");
  const [searchInput, setSearchInput]   = useState("");
  const [search, setSearch]             = useState("");

  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listPollingRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchListFnRef  = useRef<(() => Promise<void>) | undefined>(undefined);
  const searchTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const LIMIT = 25;

  // ── Fetch liste ──────────────────────────────────────────────────────────
  const fetchList = useCallback(async (
    st: "all" | ChatStatus, q: string, pg: number
  ) => {
    try {
      const params = new URLSearchParams({ status: st, search: q, page: String(pg) });
      const res = await fetch(`/api/admin/chat?${params}`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setConversations(d.conversations ?? []);
      setTotal(d.total ?? 0);
      setTotalPages(d.totalPages ?? 1);
      setTotalWaiting(d.totalWaiting ?? 0);
      setLoadErr(null);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListFnRef.current = () => fetchList(statusFilter, search, page);
  });

  // ── Init + polling liste 4s ──────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetchListFnRef.current?.();

    listPollingRef.current = setInterval(() => {
      fetchListFnRef.current?.();
    }, 4_000);

    return () => {
      if (listPollingRef.current) clearInterval(listPollingRef.current);
    };
  }, [statusFilter, search, page]);

  // ── Debounce search ──────────────────────────────────────────────────────
  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setSearch(val.trim());
      setPage(1);
    }, 350);
  };

  // ── MAJ conversation dans la liste (depuis le détail) ────────────────────
  const handleConvUpdate = useCallback((updated: ConvSummary) => {
    setConversations(prev =>
      prev.map(c => c.id === updated.id ? { ...c, status: updated.status, unread_count: 0 } : c)
    );
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "calc(100vh - 160px)", minHeight: 400, gap: 0 }}>

      {/* ── Colonne gauche : liste ─────────────────────────────────────────── */}
      <div style={{
        width: 320, flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", gap: 0,
        background: "#080a0e",
      }}>
        {/* Filtres + recherche */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Search */}
          <input
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher (email, nom)…"
            style={{ width: "100%", boxSizing: "border-box", background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 11px", color: "#fff", fontSize: 12, outline: "none" }}
          />
          {/* Tabs statut */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" as const }}>
            {STATUS_FILTER_TABS.map(tab => {
              const active = statusFilter === tab.key;
              const badge  = tab.key === "all" ? total : tab.key === "waiting_support" ? totalWaiting : null;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setStatusFilter(tab.key); setPage(1); setSelectedId(null); }}
                  style={{
                    padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: active ? 700 : 500, cursor: "pointer",
                    background: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.07)"}`,
                    color: active ? "#60a5fa" : "rgba(255,255,255,0.4)",
                    display: "flex", alignItems: "center", gap: 5,
                  }}
                >
                  {tab.label}
                  {badge !== null && badge > 0 && (
                    <span style={{ fontSize: 9, fontWeight: 800, background: tab.key === "waiting_support" ? "#ef4444" : (active ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.1)"), color: "#fff", padding: "1px 5px", borderRadius: 8 }}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste */}
        <div style={{ flex: 1, overflowY: "auto" as const, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
          {loading && conversations.length === 0 && (
            <div style={{ textAlign: "center" as const, color: "rgba(255,255,255,0.2)", fontSize: 12, paddingTop: 20 }}>Chargement…</div>
          )}
          {!loading && loadErr && (
            <div style={{ color: "#ef4444", fontSize: 12, padding: 10 }}>{loadErr}</div>
          )}
          {!loading && !loadErr && conversations.length === 0 && (
            <div style={{ textAlign: "center" as const, color: "rgba(255,255,255,0.2)", fontSize: 12, paddingTop: 20 }}>
              {search || statusFilter !== "all" ? "Aucun résultat." : "Aucune conversation."}
            </div>
          )}
          {conversations.map(conv => (
            <ConvRow
              key={conv.id}
              conv={conv}
              isSelected={selectedId === conv.id}
              onClick={() => setSelectedId(conv.id)}
            />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: "8px 10px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: page <= 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >←</button>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{page}/{totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ padding: "4px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: page >= totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.5)", fontSize: 11, cursor: page >= totalPages ? "not-allowed" : "pointer" }}
            >→</button>
          </div>
        )}
      </div>

      {/* ── Colonne droite : détail ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, background: "#09090d" }}>
        {!selectedId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, color: "rgba(255,255,255,0.15)" }}>
            <span style={{ fontSize: 32 }}>💬</span>
            <span style={{ fontSize: 13 }}>Sélectionnez une conversation</span>
          </div>
        ) : (
          <ChatDetail
            key={selectedId}
            convId={selectedId}
            onConvUpdate={handleConvUpdate}
          />
        )}
      </div>
    </div>
  );
}
