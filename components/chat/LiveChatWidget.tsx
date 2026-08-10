"use client";

/**
 * TRADERS REWARDS — Live Chat Widget client
 * Phase 3B-3c3
 *
 * Visiteur anonyme : API polling toutes les ~4s (widget ouvert seulement)
 * Trader connecté  : Supabase Realtime INSERT + fallback polling 6s si erreur
 *
 * Sécurité :
 *  - user_id JAMAIS envoyé dans les body
 *  - token visiteur inaccessible (httpOnly cookie)
 *  - service_role jamais exposé
 *  - pas de dangerouslySetInnerHTML
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatMsg {
  id: string;
  sender_type: "client" | "admin" | "system";
  message: string;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ── Widget ────────────────────────────────────────────────────────────────────

export default function LiveChatWidget() {
  // ── Stable Supabase instance ──────────────────────────────────────────────
  const sbRef = useRef(createClient());

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token, setToken]       = useState<string | null>(null);
  const [isTrader, setIsTrader] = useState(false);
  // Refs so Realtime callbacks always see current values
  const tokenRef    = useRef<string | null>(null);
  const isTraderRef = useRef(false);
  tokenRef.current    = token;
  isTraderRef.current = isTrader;

  // ── Widget state ──────────────────────────────────────────────────────────
  const [isOpen, setIsOpen]                 = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages]             = useState<ChatMsg[]>([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [inputValue, setInputValue]         = useState("");
  const [sending, setSending]               = useState(false);
  const [sendError, setSendError]           = useState<string | null>(null);
  const [loadError, setLoadError]           = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [realtimeOk, setRealtimeOk]         = useState<boolean | null>(null);

  // Stable refs for values used inside intervals / Realtime callbacks
  const convIdRef   = useRef<string | null>(null);
  const isOpenRef   = useRef(false);
  convIdRef.current = conversationId;
  isOpenRef.current = isOpen;

  // Lifecycle refs
  const pollingRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef      = useRef<RealtimeChannel | null>(null);
  const readTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initLockRef     = useRef(false);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const textareaRef     = useRef<HTMLTextAreaElement>(null);

  // "Latest" function refs so setInterval always calls the current version
  const fetchMsgsFnRef = useRef<((cid: string, doMark?: boolean) => Promise<void>) | undefined>(undefined);
  const markReadFnRef  = useRef<((cid: string) => void) | undefined>(undefined);

  // ── Build auth headers (reads tokenRef so always current) ─────────────────
  const buildHeaders = useCallback(
    (json = true): Record<string, string> => {
      const h: Record<string, string> = {};
      if (json) h["Content-Type"] = "application/json";
      if (tokenRef.current) h["Authorization"] = `Bearer ${tokenRef.current}`;
      return h;
    },
    []
  );

  // ── Mark read (debounced 400ms) ───────────────────────────────────────────
  const markRead = useCallback(
    (cid: string) => {
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
      readTimerRef.current = setTimeout(() => {
        fetch("/api/chat/read", {
          method: "PUT",
          headers: buildHeaders(),
          credentials: "include",
          body: JSON.stringify({ conversationId: cid }),
        }).catch(() => {});
        setUnreadCount(0);
      }, 400);
    },
    [buildHeaders]
  );
  markReadFnRef.current = markRead;

  // ── Fetch messages ─────────────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (cid: string, doMark = false) => {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${cid}`, {
          headers: buildHeaders(false),
          credentials: "include",
        });
        if (!res.ok) return;
        const body = await res.json() as { messages?: ChatMsg[]; unreadCount?: number };
        setMessages(body.messages ?? []);
        const uc = body.unreadCount ?? 0;
        setUnreadCount(uc);
        if (doMark && uc > 0) markReadFnRef.current?.(cid);
      } catch {
        // Silently ignore — polling will retry
      }
    },
    [buildHeaders]
  );
  fetchMsgsFnRef.current = fetchMessages;

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Focus textarea on open ────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 120);
  }, [isOpen]);

  // ── Auth init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const sb = sbRef.current;
    sb.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        setToken(session.access_token);
        setIsTrader(true);
      }
    });
    const { data: { subscription } } = sb.auth.onAuthStateChange((_e, session) => {
      if (session?.access_token) {
        setToken(session.access_token);
        setIsTrader(true);
      } else {
        setToken(null);
        setIsTrader(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Polling helpers ────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (cid: string, ms: number) => {
      stopPolling();
      pollingRef.current = setInterval(() => {
        if (!isOpenRef.current) return;
        fetchMsgsFnRef.current?.(cid, true).catch(() => {});
      }, ms);
    },
    [stopPolling]
  );

  // ── Realtime subscription ─────────────────────────────────────────────────
  const subscribeRealtime = useCallback(
    (cid: string) => {
      const sb = sbRef.current;
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = sb
        .channel(`tr_chat_${cid}`)
        .on(
          "postgres_changes",
          {
            event:  "INSERT",
            schema: "public",
            table:  "chat_messages",
            filter: `conversation_id=eq.${cid}`,
          },
          (payload) => {
            const msg = payload.new as ChatMsg;
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            if (msg.sender_type === "admin") {
              if (isOpenRef.current) {
                markReadFnRef.current?.(cid);
              } else {
                setUnreadCount((c) => c + 1);
              }
            }
          }
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeOk(true);
            stopPolling(); // No need for fallback
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            setRealtimeOk(false);
            // Activate fallback only if widget is open
            if (isOpenRef.current) startPolling(cid, 6_000);
          }
        });

      channelRef.current = channel;
    },
    [stopPolling, startPolling]
  );

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopPolling();
      if (readTimerRef.current) clearTimeout(readTimerRef.current);
      const sb = sbRef.current;
      if (channelRef.current) {
        sb.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [stopPolling]);

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpenRef.current) {
        setIsOpen(false);
        stopPolling();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [stopPolling]);

  // ── Open widget ───────────────────────────────────────────────────────────
  const openWidget = useCallback(async () => {
    if (initLockRef.current) return;
    setIsOpen(true);
    setSendError(null);
    setLoadError(null);

    // Resume existing conversation (already initialized)
    const existingCid = convIdRef.current;
    if (existingCid) {
      await fetchMessages(existingCid, true).catch(() => {});
      if (!isTraderRef.current) startPolling(existingCid, 4_000);
      else if (realtimeOk === false) startPolling(existingCid, 6_000);
      return;
    }

    // First open — init conversation
    initLockRef.current = true;
    setLoading(true);
    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: buildHeaders(),
        credentials: "include",
      });
      if (!res.ok) {
        setLoadError("Impossible de démarrer le chat. Réessaie dans un instant.");
        return;
      }
      const { conversationId: cid } = await res.json() as { conversationId: string };
      setConversationId(cid);
      convIdRef.current = cid;

      await fetchMessages(cid, true).catch(() => {});

      if (isTraderRef.current) {
        subscribeRealtime(cid);
      } else {
        startPolling(cid, 4_000);
      }
    } catch {
      setLoadError("Erreur de connexion. Vérifie ta connexion internet.");
    } finally {
      setLoading(false);
      initLockRef.current = false;
    }
  }, [buildHeaders, fetchMessages, startPolling, subscribeRealtime, realtimeOk]);

  // ── Close widget ───────────────────────────────────────────────────────────
  const closeWidget = useCallback(() => {
    setIsOpen(false);
    stopPolling();
    // Realtime stays subscribed → unread badge remains live for traders
  }, [stopPolling]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || sending || !convIdRef.current) return;

    setSending(true);
    setSendError(null);
    setInputValue("");

    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: buildHeaders(),
        credentials: "include",
        body: JSON.stringify({
          conversationId: convIdRef.current,
          message:        text,
          // JAMAIS user_id, sender_type, token, hash
        }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}) as { error?: string });
        setSendError((d as { error?: string }).error ?? "Message non envoyé. Réessaie.");
        setInputValue(text); // restore
        return;
      }

      const { message: sent } = await res.json() as { message: ChatMsg };
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
    } catch {
      setSendError("Erreur réseau. Réessaie.");
      setInputValue(text);
    } finally {
      setSending(false);
    }
  }, [inputValue, sending, buildHeaders]);

  // ── Textarea keyboard handler ─────────────────────────────────────────────
  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  // ── Auto-grow textarea ────────────────────────────────────────────────────
  const onInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value.slice(0, 4000));
    setSendError(null);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Scoped CSS ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes lcw-fadein {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .lcw-btn { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .lcw-btn:hover { transform: scale(1.07) !important; box-shadow: 0 8px 36px rgba(59,130,246,0.6), 0 2px 8px rgba(0,0,0,0.6) !important; }
        .lcw-btn:focus-visible { outline: 3px solid rgba(59,130,246,0.75); outline-offset: 3px; border-radius: 50%; }
        .lcw-panel { animation: lcw-fadein 0.2s ease; }
        .lcw-close:hover { background: rgba(255,255,255,0.07) !important; }
        .lcw-close:focus-visible { outline: 3px solid rgba(59,130,246,0.75); outline-offset: 2px; border-radius: 7px; }
        .lcw-send:hover:not(:disabled) { background: #2563EB !important; }
        .lcw-send:focus-visible { outline: 3px solid rgba(59,130,246,0.75); outline-offset: 2px; border-radius: 9px; }
        .lcw-retry:hover { background: rgba(239,68,68,0.08) !important; }
        .lcw-msgs { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .lcw-msgs::-webkit-scrollbar { width: 4px; }
        .lcw-msgs::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .lcw-ta:focus { border-color: rgba(59,130,246,0.5) !important; }
        .lcw-ta::placeholder { color: rgba(255,255,255,0.25); }
        @media (max-width: 639px) {
          .lcw-btn  { bottom: calc(16px + env(safe-area-inset-bottom, 0px)) !important; right: 16px !important; }
          .lcw-panel {
            left: 8px !important; right: 8px !important; width: auto !important;
            bottom: calc(82px + env(safe-area-inset-bottom, 0px)) !important;
            height: calc(100dvh - calc(100px + env(safe-area-inset-bottom, 0px))) !important;
            max-height: none !important;
            border-radius: 14px !important;
          }
        }
      `}</style>

      {/* ── Floating button ───────────────────────────────────────────────── */}
      <button
        className="lcw-btn"
        onClick={isOpen ? closeWidget : openWidget}
        aria-label={isOpen ? "Fermer le chat support" : "Ouvrir le chat support"}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        style={{
          position:        "fixed",
          bottom:          24,
          right:           24,
          zIndex:          9100,
          width:           56,
          height:          56,
          borderRadius:    "50%",
          backgroundColor: "#3B82F6",
          border:          "none",
          cursor:          "pointer",
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "center",
          boxShadow:       "0 4px 24px rgba(59,130,246,0.45), 0 2px 8px rgba(0,0,0,0.55)",
        }}
      >
        {isOpen ? (
          /* X close */
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <>
            {/* Chat bubble */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {/* Unread badge */}
            {unreadCount > 0 && (
              <span aria-label={`${unreadCount} message(s) non lu(s)`} style={{
                position:        "absolute",
                top:             -3,
                right:           -3,
                minWidth:        18,
                height:          18,
                borderRadius:    9,
                backgroundColor: "#EF4444",
                color:           "#fff",
                fontSize:        10,
                fontWeight:      800,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                padding:         "0 4px",
                border:          "2px solid #000",
                lineHeight:      1,
                fontFamily:      "inherit",
              }}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          className="lcw-panel"
          role="dialog"
          aria-label="Chat support Traders Rewards"
          aria-modal="false"
          style={{
            position:       "fixed",
            bottom:         92,
            right:          24,
            zIndex:         9099,
            width:          380,
            maxHeight:      "min(570px, calc(100vh - 120px))",
            height:         "min(570px, calc(100vh - 120px))",
            backgroundColor:"#0d0d0d",
            border:         "1px solid rgba(255,255,255,0.09)",
            borderRadius:   16,
            boxShadow:      "0 8px 48px rgba(0,0,0,0.88), 0 0 0 1px rgba(59,130,246,0.1)",
            display:        "flex",
            flexDirection:  "column",
            overflow:       "hidden",
            fontFamily:     "var(--font-outfit,'Outfit',system-ui,sans-serif)",
          }}
        >
          {/* ── Header ──────────────────────────────────────────────────── */}
          <div style={{
            padding:         "13px 15px",
            borderBottom:    "1px solid rgba(255,255,255,0.07)",
            backgroundColor: "#111111",
            display:         "flex",
            alignItems:      "center",
            gap:             11,
            flexShrink:      0,
          }}>
            {/* TR monogram */}
            <div style={{
              width:           34,
              height:          34,
              borderRadius:    9,
              backgroundColor: "#3B82F6",
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              fontSize:        12,
              fontWeight:      900,
              color:           "#fff",
              letterSpacing:   -0.3,
              flexShrink:      0,
            }}>
              TR
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize:      9,
                fontWeight:    700,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color:         "rgba(255,255,255,0.35)",
                lineHeight:    1,
              }}>
                Traders Rewards
              </div>
              <div style={{
                fontSize:   14,
                fontWeight: 700,
                color:      "#ffffff",
                lineHeight: 1.4,
                marginTop:  3,
              }}>
                Support
              </div>
            </div>

            <button
              className="lcw-close"
              onClick={closeWidget}
              aria-label="Fermer le chat"
              style={{
                width:           30,
                height:          30,
                borderRadius:    7,
                border:          "none",
                backgroundColor: "transparent",
                color:           "rgba(255,255,255,0.35)",
                cursor:          "pointer",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                transition:      "background 0.13s",
                flexShrink:      0,
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* ── Status bar ──────────────────────────────────────────────── */}
          <div style={{
            padding:         "7px 15px",
            borderBottom:    "1px solid rgba(255,255,255,0.05)",
            backgroundColor: "rgba(255,255,255,0.018)",
            display:         "flex",
            alignItems:      "center",
            gap:             6,
            flexShrink:      0,
          }}>
            <div style={{
              width:           6,
              height:          6,
              borderRadius:    "50%",
              backgroundColor: "#3B82F6",
              flexShrink:      0,
            }} />
            <span style={{
              fontSize:      11,
              color:         "rgba(255,255,255,0.32)",
              letterSpacing: 0.2,
            }}>
              Réponse généralement rapide
            </span>
          </div>

          {/* ── Messages area ────────────────────────────────────────────── */}
          <div
            className="lcw-msgs"
            style={{
              flex:          1,
              overflowY:     "auto",
              padding:       "14px 14px 8px",
              display:       "flex",
              flexDirection: "column",
              gap:           2,
            }}
          >
            {/* Loading state */}
            {loading && !loadError && (
              <div style={{
                margin:    "auto",
                textAlign: "center",
                color:     "rgba(255,255,255,0.3)",
                fontSize:  13,
                paddingTop: 24,
              }}>
                Chargement…
              </div>
            )}

            {/* Error state */}
            {loadError && !loading && (
              <div style={{
                margin:          "auto",
                textAlign:       "center",
                padding:         "18px 16px",
                backgroundColor: "rgba(239,68,68,0.04)",
                border:          "1px solid rgba(239,68,68,0.12)",
                borderRadius:    12,
              }}>
                <div style={{ color: "rgba(239,68,68,0.75)", fontSize: 13, lineHeight: 1.55 }}>
                  {loadError}
                </div>
                <button
                  className="lcw-retry"
                  onClick={openWidget}
                  style={{
                    marginTop:       10,
                    background:      "none",
                    border:          "1px solid rgba(239,68,68,0.25)",
                    borderRadius:    7,
                    color:           "rgba(239,68,68,0.7)",
                    fontSize:        12,
                    padding:         "5px 14px",
                    cursor:          "pointer",
                    transition:      "background 0.13s",
                  }}
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !loadError && messages.length === 0 && (
              <div style={{
                margin:    "auto",
                textAlign: "center",
                paddingTop: 12,
              }}>
                <div style={{ fontSize: 30, marginBottom: 10, lineHeight: 1 }}>👋</div>
                <div style={{
                  fontSize:   15,
                  fontWeight: 700,
                  color:      "#ffffff",
                  marginBottom: 7,
                }}>
                  Bonjour !
                </div>
                <div style={{
                  fontSize:   13,
                  color:      "rgba(255,255,255,0.38)",
                  lineHeight: 1.65,
                  maxWidth:   240,
                  margin:     "0 auto",
                }}>
                  Comment pouvons-nous t&apos;aider ?
                </div>
              </div>
            )}

            {/* Messages */}
            {!loading && messages.map((msg) => {
              if (msg.sender_type === "system") {
                return (
                  <div key={msg.id} style={{
                    alignSelf:   "center",
                    fontSize:    11,
                    color:       "rgba(255,255,255,0.22)",
                    fontStyle:   "italic",
                    padding:     "6px 0",
                    textAlign:   "center",
                  }}>
                    {msg.message}
                  </div>
                );
              }

              const isClient = msg.sender_type === "client";

              return (
                <div
                  key={msg.id}
                  style={{
                    display:       "flex",
                    flexDirection: "column",
                    alignItems:    isClient ? "flex-end" : "flex-start",
                    marginBottom:  6,
                  }}
                >
                  {/* Bubble */}
                  <div style={{
                    maxWidth:        "78%",
                    padding:         "9px 13px",
                    borderRadius:    isClient
                      ? "13px 13px 3px 13px"
                      : "13px 13px 13px 3px",
                    backgroundColor: isClient
                      ? "#3B82F6"
                      : "rgba(255,255,255,0.08)",
                    color:           isClient
                      ? "#ffffff"
                      : "rgba(255,255,255,0.88)",
                    fontSize:        14,
                    lineHeight:      1.55,
                    wordBreak:       "break-word",
                    whiteSpace:      "pre-wrap",
                  }}>
                    {msg.message}
                  </div>
                  {/* Timestamp */}
                  <span style={{
                    fontSize:  10,
                    color:     "rgba(255,255,255,0.22)",
                    marginTop: 3,
                    padding:   "0 3px",
                  }}>
                    {fmtTime(msg.created_at)}
                  </span>
                </div>
              );
            })}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Send error ───────────────────────────────────────────────── */}
          {sendError && (
            <div style={{
              padding:         "6px 14px",
              fontSize:        12,
              color:           "rgba(239,68,68,0.8)",
              borderTop:       "1px solid rgba(239,68,68,0.08)",
              backgroundColor: "rgba(239,68,68,0.025)",
              flexShrink:      0,
            }}>
              {sendError}
            </div>
          )}

          {/* ── Input area ───────────────────────────────────────────────── */}
          <div style={{
            padding:         "11px 12px",
            borderTop:       "1px solid rgba(255,255,255,0.07)",
            backgroundColor: "#0d0d0d",
            display:         "flex",
            gap:             8,
            alignItems:      "flex-end",
            flexShrink:      0,
          }}>
            {/* Visually hidden label for accessibility */}
            <label
              htmlFor="lcw-input"
              style={{
                position: "absolute",
                width: 1, height: 1,
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
              }}
            >
              Message
            </label>

            <textarea
              id="lcw-input"
              ref={textareaRef}
              className="lcw-ta"
              value={inputValue}
              onChange={onInput}
              onKeyDown={onKeyDown}
              placeholder="Écris un message…"
              disabled={sending || loading}
              rows={1}
              maxLength={4000}
              aria-label="Message à envoyer"
              style={{
                flex:            1,
                backgroundColor: "rgba(255,255,255,0.045)",
                border:          "1px solid rgba(255,255,255,0.09)",
                borderRadius:    10,
                color:           "#ffffff",
                fontSize:        14,
                padding:         "10px 12px",
                resize:          "none",
                minHeight:       42,
                maxHeight:       120,
                fontFamily:      "inherit",
                lineHeight:      1.5,
                colorScheme:     "dark",
                outline:         "none",
                transition:      "border-color 0.14s",
              }}
            />

            <button
              className="lcw-send"
              onClick={sendMessage}
              disabled={sending || !inputValue.trim() || loading}
              aria-label="Envoyer le message"
              style={{
                width:           42,
                height:          42,
                minWidth:        42,
                borderRadius:    10,
                backgroundColor: "#3B82F6",
                border:          "none",
                cursor:          sending || !inputValue.trim() || loading
                  ? "not-allowed"
                  : "pointer",
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                opacity:         sending || !inputValue.trim() || loading ? 0.42 : 1,
                transition:      "background 0.14s, opacity 0.14s",
                flexShrink:      0,
              }}
            >
              {/* Send (paper plane) icon */}
              <svg width="17" height="17" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div style={{
            padding:   "5px 14px 9px",
            textAlign: "center",
            fontSize:  10,
            color:     "rgba(255,255,255,0.12)",
            flexShrink: 0,
          }}>
            Traders Rewards · Support client
          </div>
        </div>
      )}
    </>
  );
}
