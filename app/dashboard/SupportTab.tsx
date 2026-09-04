"use client";

/**
 * TRADERS REWARDS — SupportTab
 * Phase 3B-3d
 *
 * Onglet "Support" du dashboard client.
 * Deux sous-onglets :
 *   - "Mes demandes"  : liste + détail des tickets support
 *   - "Chat"          : résumé de la conversation Live Chat + ouverture du widget
 *
 * Sécurité :
 *   - user_id JAMAIS envoyé côté client
 *   - assigned_to / notes admin jamais affichés
 *   - visitor_token_hash jamais retourné
 *   - service_role côté serveur uniquement
 */

import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SupportSubTab = "tickets" | "chat";

interface MyTicket {
  id:          string;
  subject:     string;
  category:    string | null;
  status:      "new" | "open" | "resolved";
  created_at:  string;
  updated_at:  string;
  resolved_at: string | null;
}

interface MyTicketDetail extends MyTicket {
  message: string;
}

interface ConvSummary {
  id:              string;
  status:          string;
  last_message_at: string | null;
  created_at:      string;
}

interface LastMsg {
  sender_type: "client" | "admin" | "system";
  message:     string;
  created_at:  string;
}

interface SupportMessage {
  id:          string;
  sender_type: "client" | "admin";
  content:     string;
  channel:     string;
  created_at:  string;
}

// ── Configs ───────────────────────────────────────────────────────────────────

const TICKET_STATUS: Record<string, { fr: string; en: string; color: string; bg: string }> = {
  new:      { fr: "Nouveau",  en: "New",         color: "rgba(255,255,255,0.75)", bg: "rgba(255,255,255,0.08)" },
  open:     { fr: "En cours", en: "In progress",  color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  resolved: { fr: "Résolu",   en: "Resolved",     color: "#22C55E", bg: "rgba(34,197,94,0.12)"  },
};

const CONV_STATUS: Record<string, { fr: string; en: string; color: string }> = {
  waiting_support: { fr: "En attente d'un agent",  en: "Waiting for agent",  color: "#F59E0B" },
  open:            { fr: "En cours",                en: "In progress",        color: "rgba(255,255,255,0.7)" },
  waiting_client:  { fr: "Réponse reçue ✓",        en: "Reply received ✓",   color: "#22C55E" },
  closed:          { fr: "Fermé",                   en: "Closed",             color: "#6B7280" },
};

const CATEGORIES = [
  { value: "",             fr: "Catégorie (optionnel)", en: "Category (optional)" },
  { value: "payout",      fr: "Récompense / Paiement", en: "Payout / Payment"    },
  { value: "challenge",   fr: "Challenge / Compte",    en: "Challenge / Account"  },
  { value: "kyc",         fr: "KYC / Documents",       en: "KYC / Documents"      },
  { value: "technical",   fr: "Problème technique",    en: "Technical issue"       },
  { value: "other",       fr: "Autre",                 en: "Other"                 },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function SupportTab({
  token,
  isFr,
  isMobile,
  firstName: initFirstName = "",
  lastName:  initLastName  = "",
  email:     initEmail     = "",
}: {
  token:      string;
  isFr:       boolean;
  isMobile:   boolean;
  firstName?: string;
  lastName?:  string;
  email?:     string;
}) {
  // ── Sub-tab ───────────────────────────────────────────────────────────────
  const [subTab, setSubTab] = useState<SupportSubTab>("tickets");

  // ── Tickets state ─────────────────────────────────────────────────────────
  const [tickets, setTickets]           = useState<MyTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<MyTicketDetail | null>(null);
  const [detailLoading, setDetailLoading]   = useState(false);

  // New ticket form
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm] = useState({
    firstName: initFirstName,
    lastName:  initLastName,
    email:     initEmail,
    subject:   "",
    category:  "",
    message:   "",
  });
  const [formSending, setFormSending] = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  // ── Chat state ────────────────────────────────────────────────────────────
  const [conv, setConv]           = useState<ConvSummary | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastMsg, setLastMsg]     = useState<LastMsg | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  // undefined = not checked yet
  const [convChecked, setConvChecked] = useState(false);

  // ── Thread state ──────────────────────────────────────────────────────────
  const [messages, setMessages]           = useState<SupportMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [reply, setReply]                 = useState("");
  const [replySending, setReplySending]   = useState(false);
  const [replyError, setReplyError]       = useState<string | null>(null);
  const threadContainerRef                = useRef<HTMLDivElement>(null);
  const pollRef                           = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Auth headers ──────────────────────────────────────────────────────────
  const authHeaders = useCallback((): Record<string, string> => {
    const h: Record<string, string> = {};
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  }, [token]);

  // ── Fetch tickets ─────────────────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    if (!token) return;
    setTicketsLoading(true);
    setTicketsError(null);
    try {
      const res = await fetch("/api/support/my-tickets", {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}) as Record<string,unknown>);
        setTicketsError((d as {error?:string}).error ?? (isFr ? "Erreur de chargement." : "Loading error."));
        return;
      }
      const d = await res.json() as { tickets: MyTicket[] };
      setTickets(d.tickets ?? []);
    } catch {
      setTicketsError(isFr ? "Erreur réseau." : "Network error.");
    } finally {
      setTicketsLoading(false);
    }
  }, [token, authHeaders, isFr]);

  // ── Fetch ticket detail ───────────────────────────────────────────────────
  const fetchDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/support/my-tickets/${id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const d = await res.json() as { ticket: MyTicketDetail };
      setSelectedTicket(d.ticket);
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  }, [authHeaders]);

  // ── Fetch messages d'un ticket ────────────────────────────────────────────
  const fetchMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/support/my-tickets/${id}/messages`, {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const d = await res.json() as { messages: SupportMessage[] };
      setMessages(d.messages ?? []);
    } catch { /* silent */ }
  }, [authHeaders]);

  // ── Fetch chat summary ────────────────────────────────────────────────────
  const fetchChat = useCallback(async () => {
    if (!token) return;
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await fetch("/api/chat/my-conversation", {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}) as Record<string,unknown>);
        setChatError((d as {error?:string}).error ?? (isFr ? "Erreur de chargement." : "Loading error."));
        return;
      }
      const d = await res.json() as {
        conversation: ConvSummary | null;
        unreadCount:  number;
        lastMessage:  LastMsg | null;
      };
      setConv(d.conversation);
      setUnreadCount(d.unreadCount);
      setLastMsg(d.lastMessage);
    } catch {
      setChatError(isFr ? "Erreur réseau." : "Network error.");
    } finally {
      setChatLoading(false);
      setConvChecked(true);
    }
  }, [token, authHeaders, isFr]);

  // ── Polling messages quand un ticket est sélectionné ─────────────────────
  useEffect(() => {
    if (!selectedTicket) {
      if (pollRef.current) clearInterval(pollRef.current);
      setMessages([]);
      setReply("");
      setReplyError(null);
      return;
    }
    setMessagesLoading(true);
    fetchMessages(selectedTicket.id).finally(() => setMessagesLoading(false));
    pollRef.current = setInterval(() => fetchMessages(selectedTicket.id), 4000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedTicket?.id, fetchMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (threadContainerRef.current) {
      threadContainerRef.current.scrollTop = threadContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Préfill form si props changent après mount
  useEffect(() => {
    setForm(f => ({
      ...f,
      firstName: f.firstName || initFirstName,
      lastName:  f.lastName  || initLastName,
      email:     f.email     || initEmail,
    }));
  }, [initFirstName, initLastName, initEmail]);

  // Init au montage
  useEffect(() => {
    if (!token) return;
    fetchTickets();
    fetchChat();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Submit new ticket ─────────────────────────────────────────────────────
  const submitTicket = useCallback(async () => {
    // Validation client
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) {
      setFormError(isFr ? "Prénom, nom et email sont obligatoires." : "First name, last name, and email are required.");
      return;
    }
    if (!form.subject.trim()) {
      setFormError(isFr ? "L'objet est obligatoire." : "Subject is required.");
      return;
    }
    if (form.subject.trim().length > 200) {
      setFormError(isFr ? "L'objet ne peut pas dépasser 200 caractères." : "Subject cannot exceed 200 characters.");
      return;
    }
    if (!form.message.trim()) {
      setFormError(isFr ? "Le message est obligatoire." : "Message is required.");
      return;
    }

    setFormSending(true);
    setFormError(null);
    try {
      const body: Record<string, string> = {
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email.trim(),
        subject:   form.subject.trim(),
        message:   form.message.trim(),
      };
      if (form.category) body.category = form.category;

      // Authorization: Bearer pour résolution user_id server-side (plus fiable que cookie)
      // credentials:"include" conservé en fallback
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/support", {
        method:      "POST",
        headers,
        credentials: "include",
        body:        JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}) as Record<string,unknown>);
        setFormError((d as {error?:string}).error ?? (isFr ? "Envoi impossible. Réessaie." : "Submission failed. Try again."));
        return;
      }

      setFormSuccess(true);
      // Reset tous les champs variables (prénom/nom/email conservés pour confort UX)
      setForm(f => ({ ...f, subject: "", category: "", message: "" }));
      setTimeout(() => {
        setShowForm(false);
        setFormSuccess(false);
        fetchTickets();
      }, 2800);
    } catch {
      setFormError(isFr ? "Erreur réseau. Réessaie." : "Network error. Try again.");
    } finally {
      setFormSending(false);
    }
  }, [form, isFr, fetchTickets, token]);

  // ── Envoyer une réponse client ────────────────────────────────────────────
  const sendReply = useCallback(async () => {
    if (!selectedTicket || !reply.trim() || replySending) return;
    const content = reply.trim();
    setReplySending(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/support/my-tickets/${selectedTicket.id}/messages`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body:    JSON.stringify({ message: content }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) {
        setReplyError(d.error ?? (isFr ? "Envoi impossible." : "Send failed."));
        return;
      }
      setReply("");
      await fetchMessages(selectedTicket.id);
    } catch {
      setReplyError(isFr ? "Erreur réseau." : "Network error.");
    } finally {
      setReplySending(false);
    }
  }, [selectedTicket, reply, replySending, authHeaders, fetchMessages, isFr]);

  // ── Open LiveChatWidget via CustomEvent ───────────────────────────────────
  const openChatWidget = useCallback(() => {
    window.dispatchEvent(new CustomEvent("open-chat-widget"));
  }, []);

  // ── Date helper ───────────────────────────────────────────────────────────
  const fmtDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(isFr ? "fr-FR" : "en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      });
    } catch { return "—"; }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="dash-chrome-title" style={{ fontSize: isMobile ? 22 : 26, fontWeight: 800, marginBottom: 6 }}>
          {isFr ? "Centre d'aide" : "Help Center"}
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
          {isFr
            ? "Suivez vos demandes de support et discutez en direct avec notre équipe."
            : "Track your support requests and chat live with our team."
          }
        </p>
      </div>

      {/* ── Sub-tab pills ─────────────────────────────────────────────────── */}
      <div style={{
        display:        "flex",
        gap:            8,
        marginBottom:   28,
        backgroundColor:"rgba(255,255,255,0.04)",
        borderRadius:   12,
        padding:        5,
        width:          "fit-content",
      }}>
        {(["tickets", "chat"] as SupportSubTab[]).map(t => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            style={{
              padding:         "8px 20px",
              borderRadius:    8,
              border:          "none",
              cursor:          "pointer",
              fontSize:        14,
              fontWeight:      subTab === t ? 700 : 500,
              color:           subTab === t ? "#ffffff" : "rgba(255,255,255,0.45)",
              background: subTab === t ? "rgba(255,255,255,0.10)" : "transparent",
              transition:      "all 0.15s",
              position:        "relative",
            }}
          >
            {t === "tickets"
              ? (isFr ? "Mes demandes" : "My requests")
              : "Chat"}
            {/* Unread badge on Chat tab */}
            {t === "chat" && unreadCount > 0 && (
              <span style={{
                position:        "absolute",
                top:             -4,
                right:           -4,
                minWidth:        17,
                height:          17,
                borderRadius:    9,
                backgroundColor: "#EF4444",
                color:           "#fff",
                fontSize:        10,
                fontWeight:      800,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                padding:         "0 4px",
                lineHeight:      1,
              }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
           SUB-TAB: MES DEMANDES
         ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "tickets" && (
        <div>

          {/* Header + "Nouvelle demande" */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>
              {ticketsLoading
                ? (isFr ? "Chargement…" : "Loading…")
                : `${tickets.length} ${isFr ? "demande(s)" : "request(s)"}`}
            </div>
            {!showForm && !selectedTicket && (
              <button
                onClick={() => {
                  setShowForm(true);
                  setFormError(null);
                  setFormSuccess(false);
                }}
                className="btn-primary"
                style={{
                  padding:         "9px 18px",
                  borderRadius:    9,
                  fontSize:        13,
                  fontWeight:      700,
                  cursor:          "pointer",
                  display:         "flex",
                  alignItems:      "center",
                  gap:             7,
                  transition:      "all 0.15s",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                {isFr ? "Nouvelle demande" : "New request"}
              </button>
            )}
          </div>

          {/* ── New ticket form ──────────────────────────────────────────── */}
          {showForm && !selectedTicket && (
            <div style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border:          "1px solid rgba(255,255,255,0.09)",
              borderRadius:    14,
              padding:         24,
              marginBottom:    24,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: 0 }}>
                  {isFr ? "Nouvelle demande de support" : "New support request"}
                </h2>
                <button
                  onClick={() => { setShowForm(false); setFormError(null); setFormSuccess(false); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 20, padding: 2, lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>

              {formSuccess ? (
                <div style={{
                  textAlign:       "center",
                  padding:         "24px 16px",
                  color:           "#22C55E",
                }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>✓</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {isFr ? "Demande envoyée !" : "Request sent!"}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
                    {isFr ? "Notre équipe vous répondra rapidement." : "Our team will reply shortly."}
                  </div>
                </div>
              ) : (
                <>
                  {/* Name row */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                        {isFr ? "Prénom *" : "First name *"}
                      </label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value.slice(0, 60) }))}
                        placeholder={isFr ? "Prénom" : "First name"}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                        {isFr ? "Nom *" : "Last name *"}
                      </label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={e => setForm(f => ({ ...f, lastName: e.target.value.slice(0, 60) }))}
                        placeholder={isFr ? "Nom" : "Last name"}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Email + Category */}
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                        {isFr ? "Email *" : "Email *"}
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value.slice(0, 120) }))}
                        placeholder="email@exemple.com"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                        {isFr ? "Catégorie" : "Category"}
                      </label>
                      <select
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        style={{ ...inputStyle, colorScheme: "dark" }}
                      >
                        {CATEGORIES.map(c => (
                          <option key={c.value} value={c.value}>
                            {isFr ? c.fr : c.en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Objet (Subject) */}
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                      {isFr ? "Objet *" : "Subject *"}
                    </label>
                    <input
                      type="text"
                      value={form.subject}
                      onChange={e => setForm(f => ({ ...f, subject: e.target.value.slice(0, 200) }))}
                      placeholder={isFr ? "Résumez votre demande en quelques mots" : "Summarize your request in a few words"}
                      maxLength={200}
                      style={inputStyle}
                    />
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "right", marginTop: 4 }}>
                      {form.subject.length}/200
                    </div>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
                      {isFr ? "Message *" : "Message *"}
                    </label>
                    <textarea
                      value={form.message}
                      onChange={e => setForm(f => ({ ...f, message: e.target.value.slice(0, 4000) }))}
                      placeholder={isFr ? "Décris ton problème ou ta question en détail…" : "Describe your issue or question in detail…"}
                      rows={5}
                      style={{ ...inputStyle, resize: "vertical", minHeight: 100, maxHeight: 280 }}
                    />
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "right", marginTop: 4 }}>
                      {form.message.length}/4000
                    </div>
                  </div>

                  {/* Error */}
                  {formError && (
                    <div style={{
                      padding:         "10px 14px",
                      backgroundColor: "rgba(239,68,68,0.06)",
                      border:          "1px solid rgba(239,68,68,0.2)",
                      borderRadius:    8,
                      color:           "rgba(239,68,68,0.85)",
                      fontSize:        13,
                      marginBottom:    14,
                    }}>
                      {formError}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button
                      onClick={() => { setShowForm(false); setFormError(null); }}
                      style={{
                        padding:         "9px 18px",
                        borderRadius:    9,
                        border:          "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: "transparent",
                        color:           "rgba(255,255,255,0.45)",
                        fontSize:        13,
                        fontWeight:      600,
                        cursor:          "pointer",
                      }}
                    >
                      {isFr ? "Annuler" : "Cancel"}
                    </button>
                    <button
                      onClick={submitTicket}
                      disabled={formSending}
                      style={{
                        padding:         "9px 24px",
                        borderRadius:    9,
                        border:          "1px solid rgba(255,255,255,0.12)",
                        backgroundColor: formSending ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.10)",
                        color:           "#ffffff",
                        fontSize:        13,
                        fontWeight:      700,
                        cursor:          formSending ? "not-allowed" : "pointer",
                        transition:      "background 0.15s",
                      }}
                    >
                      {formSending
                        ? (isFr ? "Envoi…" : "Sending…")
                        : (isFr ? "Envoyer" : "Send")}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Ticket detail (inline) ───────────────────────────────────── */}
          {selectedTicket && !showForm && (
            <div style={{
              backgroundColor: "rgba(255,255,255,0.03)",
              border:          "1px solid rgba(255,255,255,0.09)",
              borderRadius:    14,
              padding:         24,
              marginBottom:    24,
            }}>
              {/* Back button */}
              <button
                onClick={() => setSelectedTicket(null)}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6, padding: 0, marginBottom: 18,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                {isFr ? "Retour aux demandes" : "Back to requests"}
              </button>

              {detailLoading ? (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", padding: "24px 0", fontSize: 14 }}>
                  {isFr ? "Chargement…" : "Loading…"}
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", margin: "0 0 6px" }}>
                        {selectedTicket.subject || (isFr ? "Demande de support" : "Support request")}
                      </h2>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <StatusBadge status={selectedTicket.status} isFr={isFr} />
                        {selectedTicket.category && (
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", backgroundColor: "rgba(255,255,255,0.06)", padding: "2px 8px", borderRadius: 5 }}>
                            {selectedTicket.category}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "right" }}>
                      <div>{isFr ? "Créée le" : "Created"} {fmtDate(selectedTicket.created_at)}</div>
                      {selectedTicket.resolved_at && (
                        <div style={{ marginTop: 3, color: "rgba(34,197,94,0.7)" }}>
                          {isFr ? "Résolue le" : "Resolved"} {fmtDate(selectedTicket.resolved_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

                  {/* Fil de conversation */}
                  {messagesLoading && messages.length === 0 ? (
                    <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", paddingTop: 8 }}>
                      {isFr ? "Chargement…" : "Loading…"}
                    </div>
                  ) : (
                    <div
                      ref={threadContainerRef}
                      style={{
                        maxHeight:     340,
                        overflowY:     "auto",
                        display:       "flex",
                        flexDirection: "column",
                        gap:           8,
                        padding:       "4px 2px",
                      }}
                    >
                      {messages.length === 0 && (
                        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
                          {isFr ? "Aucun message." : "No messages."}
                        </div>
                      )}
                      {messages.map(msg => {
                        const isClient = msg.sender_type === "client";
                        return (
                          <div key={msg.id} style={{
                            display:        "flex",
                            justifyContent: isClient ? "flex-end" : "flex-start",
                          }}>
                            <div style={{
                              maxWidth:     "78%",
                              background:   isClient
                                ? "rgba(255,255,255,0.10)"
                                : "rgba(255,255,255,0.07)",
                              border:       `1px solid ${isClient ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.09)"}`,
                              borderRadius: isClient
                                ? "12px 12px 2px 12px"
                                : "12px 12px 12px 2px",
                              padding:      "10px 14px",
                            }}>
                              <div style={{
                                fontSize:     11,
                                fontWeight:   600,
                                color:        isClient
                                  ? "rgba(255,255,255,0.55)"
                                  : "rgba(255,255,255,0.35)",
                                marginBottom: 4,
                              }}>
                                {isClient
                                  ? (isFr ? "Vous" : "You")
                                  : (isFr ? "Support" : "Support")}
                                {" · "}
                                {(() => {
                                  const diff = Math.floor((Date.now() - new Date(msg.created_at).getTime()) / 1000);
                                  if (diff < 60)        return isFr ? "À l'instant" : "Just now";
                                  if (diff < 3600)      return `${Math.floor(diff / 60)}min`;
                                  if (diff < 86400)     return `${Math.floor(diff / 3600)}h`;
                                  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}j`;
                                  return new Date(msg.created_at).toLocaleDateString(isFr ? "fr-FR" : "en-GB", { day: "2-digit", month: "short" });
                                })()}
                              </div>
                              <div style={{
                                fontSize:   14,
                                color:      isClient ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.78)",
                                lineHeight: 1.65,
                                whiteSpace: "pre-wrap",
                                wordBreak:  "break-word",
                              }}>
                                {msg.content}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Formulaire de réponse */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 4 }}>
                    <textarea
                      value={reply}
                      onChange={e => setReply(e.target.value.slice(0, 4000))}
                      onKeyDown={e => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendReply();
                        }
                      }}
                      placeholder={isFr
                        ? "Votre réponse… (Entrée = envoyer · Maj+Entrée = saut de ligne)"
                        : "Your reply… (Enter = send · Shift+Enter = new line)"}
                      rows={3}
                      style={{
                        ...inputStyle,
                        resize:    "vertical",
                        minHeight: 72,
                        maxHeight: 200,
                        border:    `1px solid ${reply.trim() ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)"}`,
                        transition: "border-color 0.15s",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {replyError && (
                          <span style={{ fontSize: 12, color: "rgba(239,68,68,0.85)" }}>{replyError}</span>
                        )}
                        {reply.length > 3600 && (
                          <span style={{ fontSize: 11, color: reply.length > 3900 ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
                            {reply.length} / 4000
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => void sendReply()}
                        disabled={replySending || !reply.trim()}
                        style={{
                          padding:         "9px 22px",
                          borderRadius:    9,
                          border:          "1px solid rgba(255,255,255,0.12)",
                          backgroundColor: replySending || !reply.trim()
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(255,255,255,0.10)",
                          color:           "#ffffff",
                          fontSize:        13,
                          fontWeight:      700,
                          cursor:          replySending || !reply.trim() ? "not-allowed" : "pointer",
                          transition:      "background 0.15s",
                        }}
                      >
                        {replySending
                          ? (isFr ? "Envoi…" : "Sending…")
                          : (isFr ? "Envoyer" : "Send")}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Ticket list ──────────────────────────────────────────────── */}
          {!selectedTicket && !showForm && (
            <>
              {ticketsError && (
                <div style={{
                  padding:         "14px 18px",
                  backgroundColor: "rgba(239,68,68,0.06)",
                  border:          "1px solid rgba(239,68,68,0.15)",
                  borderRadius:    10,
                  color:           "rgba(239,68,68,0.8)",
                  fontSize:        13,
                  marginBottom:    16,
                }}>
                  {ticketsError}
                </div>
              )}

              {ticketsLoading && (
                <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "40px 0" }}>
                  {isFr ? "Chargement…" : "Loading…"}
                </div>
              )}

              {!ticketsLoading && !ticketsError && tickets.length === 0 && (
                <div style={{
                  textAlign:       "center",
                  padding:         "48px 24px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border:          "1px dashed rgba(255,255,255,0.1)",
                  borderRadius:    14,
                }}>
                  <div style={{ fontSize: 36, marginBottom: 14 }}>📬</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>
                    {isFr ? "Aucune demande pour l'instant" : "No requests yet"}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", marginBottom: 20, lineHeight: 1.6 }}>
                    {isFr
                      ? "Créez une demande de support et notre équipe vous répondra rapidement."
                      : "Create a support request and our team will reply quickly."
                    }
                  </div>
                  <button
                    onClick={() => setShowForm(true)}
                    style={{
                      padding:         "10px 22px",
                      borderRadius:    9,
                      border:          "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "rgba(255,255,255,0.10)",
                      color:           "#ffffff",
                      fontSize:        13,
                      fontWeight:      700,
                      cursor:          "pointer",
                    }}
                  >
                    {isFr ? "Créer une demande" : "Create a request"}
                  </button>
                </div>
              )}

              {!ticketsLoading && tickets.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tickets.map(t => (
                    <button
                      key={t.id}
                      onClick={() => fetchDetail(t.id)}
                      style={{
                        display:         "flex",
                        alignItems:      "center",
                        gap:             14,
                        width:           "100%",
                        padding:         "14px 18px",
                        backgroundColor: "rgba(255,255,255,0.03)",
                        border:          "1px solid rgba(255,255,255,0.07)",
                        borderRadius:    12,
                        cursor:          "pointer",
                        textAlign:       "left",
                        transition:      "all 0.15s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.055)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)"; }}
                      onMouseOut={e =>  { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.03)";  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; }}
                    >
                      {/* Icon */}
                      <div style={{
                        width:           36,
                        height:          36,
                        borderRadius:    9,
                        backgroundColor: "rgba(255,255,255,0.07)",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        flexShrink:      0,
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize:     14,
                          fontWeight:   600,
                          color:        "#ffffff",
                          overflow:     "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace:   "nowrap",
                          marginBottom: 4,
                        }}>
                          {t.subject || (isFr ? "Demande de support" : "Support request")}
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <StatusBadge status={t.status} isFr={isFr} />
                          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                            {fmtDate(t.created_at)}
                          </span>
                          {t.category && (
                            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                              · {t.category}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Chevron */}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
           SUB-TAB: CHAT
         ══════════════════════════════════════════════════════════════════════ */}
      {subTab === "chat" && (
        <div>
          {chatLoading && (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 14, padding: "48px 0" }}>
              {isFr ? "Chargement…" : "Loading…"}
            </div>
          )}

          {chatError && !chatLoading && (
            <div style={{
              padding:         "14px 18px",
              backgroundColor: "rgba(239,68,68,0.06)",
              border:          "1px solid rgba(239,68,68,0.15)",
              borderRadius:    10,
              color:           "rgba(239,68,68,0.8)",
              fontSize:        13,
              marginBottom:    16,
            }}>
              {chatError}
            </div>
          )}

          {!chatLoading && !chatError && convChecked && (
            <>
              {/* ── Existing conversation ──────────────────────────────── */}
              {conv ? (
                <div>
                  {/* Summary card */}
                  <div style={{
                    backgroundColor: "rgba(255,255,255,0.03)",
                    border:          unreadCount > 0
                      ? "1px solid rgba(255,255,255,0.2)"
                      : "1px solid rgba(255,255,255,0.09)",
                    borderRadius:    14,
                    padding:         24,
                    marginBottom:    16,
                  }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width:           38,
                          height:          38,
                          borderRadius:    10,
                          backgroundColor: "rgba(255,255,255,0.10)",
                          display:         "flex",
                          alignItems:      "center",
                          justifyContent:  "center",
                          fontSize:        14,
                          fontWeight:      900,
                          color:           "#fff",
                        }}>
                          TR
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff" }}>
                            {isFr ? "Support Traders Rewards" : "Traders Rewards Support"}
                          </div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                            {CONV_STATUS[conv.status]
                              ? (isFr ? CONV_STATUS[conv.status].fr : CONV_STATUS[conv.status].en)
                              : conv.status}
                          </div>
                        </div>
                      </div>

                      {/* Status + Unread */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {unreadCount > 0 && (
                          <span style={{
                            padding:         "3px 10px",
                            borderRadius:    20,
                            backgroundColor: "rgba(239,68,68,0.15)",
                            color:           "#EF4444",
                            fontSize:        12,
                            fontWeight:      700,
                          }}>
                            {unreadCount} {isFr ? "non lu(s)" : "unread"}
                          </span>
                        )}

                        <span style={{
                          width:           8,
                          height:          8,
                          borderRadius:    "50%",
                          backgroundColor: CONV_STATUS[conv.status]?.color ?? "#6B7280",
                          display:         "inline-block",
                          boxShadow:       `0 0 8px ${CONV_STATUS[conv.status]?.color ?? "#6B7280"}80`,
                        }} />
                      </div>
                    </div>

                    {/* Last message preview */}
                    {lastMsg && (
                      <div style={{
                        padding:         "12px 14px",
                        backgroundColor: "rgba(255,255,255,0.04)",
                        borderRadius:    9,
                        marginBottom:    16,
                        borderLeft:      `3px solid ${lastMsg.sender_type === "admin" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)"}`,
                      }}>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>
                          {lastMsg.sender_type === "admin"
                            ? (isFr ? "Dernier message — Support" : "Last message — Support")
                            : (isFr ? "Dernier message — Vous"    : "Last message — You")}
                          {" · "}
                          {new Date(lastMsg.created_at).toLocaleTimeString(isFr ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div style={{
                          fontSize:     13,
                          color:        "rgba(255,255,255,0.7)",
                          overflow:     "hidden",
                          display:      "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          lineHeight:   1.55,
                        }}>
                          {lastMsg.message}
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <button
                      onClick={openChatWidget}
                      style={{
                        width:           "100%",
                        padding:         "12px",
                        borderRadius:    10,
                        border:          "1px solid rgba(255,255,255,0.12)",
                        backgroundColor: "rgba(255,255,255,0.09)",
                        color:           "#ffffff",
                        fontSize:        14,
                        fontWeight:      700,
                        cursor:          "pointer",
                        display:         "flex",
                        alignItems:      "center",
                        justifyContent:  "center",
                        gap:             9,
                        transition:      "background 0.15s",
                      }}
                      onMouseOver={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.14)"; }}
                      onMouseOut={e =>  { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.09)"; }}
                    >
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {unreadCount > 0
                        ? (isFr ? `Ouvrir le chat (${unreadCount} non lu)` : `Open chat (${unreadCount} unread)`)
                        : (isFr ? "Ouvrir le chat" : "Open chat")}
                    </button>
                  </div>

                  {/* Info note */}
                  <div style={{
                    fontSize:   12,
                    color:      "rgba(255,255,255,0.3)",
                    lineHeight: 1.6,
                    padding:    "0 2px",
                  }}>
                    {isFr
                      ? "Le chat s'ouvre dans le widget en bas à droite de l'écran."
                      : "Chat opens in the widget at the bottom right of the screen."
                    }
                  </div>
                </div>
              ) : (
                /* ── No conversation yet ──────────────────────────────── */
                <div style={{
                  textAlign:       "center",
                  padding:         "56px 24px",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  border:          "1px dashed rgba(255,255,255,0.1)",
                  borderRadius:    14,
                }}>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>💬</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#ffffff", marginBottom: 8 }}>
                    {isFr ? "Chat en direct" : "Live Chat"}
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24, lineHeight: 1.7, maxWidth: 320, margin: "0 auto 24px" }}>
                    {isFr
                      ? "Parle directement avec un membre de notre équipe. Répons rapides garanties."
                      : "Talk directly with a member of our team. Quick responses guaranteed."
                    }
                  </div>
                  <button
                    onClick={openChatWidget}
                    style={{
                      padding:         "12px 28px",
                      borderRadius:    10,
                      border:          "1px solid rgba(255,255,255,0.12)",
                      backgroundColor: "rgba(255,255,255,0.09)",
                      color:           "#ffffff",
                      fontSize:        14,
                      fontWeight:      700,
                      cursor:          "pointer",
                      display:         "inline-flex",
                      alignItems:      "center",
                      gap:             9,
                      transition:      "background 0.15s",
                    }}
                    onMouseOver={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.14)"; }}
                    onMouseOut={e =>  { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.09)"; }}
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    {isFr ? "Démarrer le chat" : "Start chat"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status, isFr }: { status: string; isFr: boolean }) {
  const cfg = TICKET_STATUS[status];
  if (!cfg) return null;
  return (
    <span style={{
      fontSize:        11,
      fontWeight:      700,
      color:           cfg.color,
      backgroundColor: cfg.bg,
      padding:         "2px 8px",
      borderRadius:    5,
      letterSpacing:   0.3,
    }}>
      {isFr ? cfg.fr : cfg.en}
    </span>
  );
}

// ── Shared input style ────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width:           "100%",
  padding:         "10px 12px",
  backgroundColor: "rgba(255,255,255,0.05)",
  border:          "1px solid rgba(255,255,255,0.1)",
  borderRadius:    9,
  color:           "#ffffff",
  fontSize:        14,
  outline:         "none",
  fontFamily:      "inherit",
  lineHeight:      1.5,
  boxSizing:       "border-box",
};
