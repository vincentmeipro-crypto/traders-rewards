"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { EMAIL_CATALOG } from "@/lib/email-catalog";

const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_KEY || "tr2026-admin-k9x";

// ── Types ─────────────────────────────────────────────────────────────────────

type EmailLog = {
  id:           string;
  type:         string;
  to_email:     string;
  subject:      string;
  status:       "sent" | "failed";
  error:        string | null;
  resend_id:    string | null;
  user_id:      string | null;
  challenge_id: string | null;
  event_key:    string | null;
  created_at:   string;
};

type Summary = {
  sent_24h:   number;
  failed_24h: number;
  sent_7d:    number;
  failed_7d:  number;
};

type PreviewData = {
  subject:   string;
  html:      string;
  label:     string;
  trigger:   string;
  sensitive: boolean;
  variables: Array<{ name: string; sensitive: boolean }>;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  welcome:               "Accès Challenge",
  phase2:                "Passage Phase 2",
  failed:                "Challenge échoué",
  funded:                "Compte certifié",
  daily_update:          "Récap journalier",
  phase1_certificate:    "Certificat Phase 1",
  challenge_certificate: "Certificat Challenge",
  reward_certificate:    "Certificat Reward",
  apology:               "Compte rétabli",
};

const TYPE_OPTIONS = [
  { value: "all",                   label: "Tous les types" },
  { value: "welcome",               label: "Accès Challenge" },
  { value: "phase2",                label: "Passage Phase 2" },
  { value: "failed",                label: "Challenge échoué" },
  { value: "funded",                label: "Compte certifié" },
  { value: "daily_update",          label: "Récap journalier" },
  { value: "phase1_certificate",    label: "Certificat Phase 1" },
  { value: "challenge_certificate", label: "Certificat Challenge" },
  { value: "reward_certificate",    label: "Certificat Reward" },
  { value: "apology",               label: "Compte rétabli" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)         return "À l'instant";
  if (diff < 3600)       return `${Math.floor(diff / 60)}min`;
  if (diff < 86400)      return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7)  return `${Math.floor(diff / 86400)}j`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

function typeLabel(t: string): string {
  return TYPE_LABELS[t] ?? t;
}

function pct(a: number, b: number): string {
  const total = a + b;
  if (total === 0) return "0%";
  return `${Math.round((a / total) * 100)}%`;
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "sent" | "failed" }) {
  const cfg = status === "sent"
    ? { label: "Envoyé", bg: "rgba(34,197,94,0.1)",  color: "#4ade80", border: "rgba(34,197,94,0.2)"  }
    : { label: "Échec",  bg: "rgba(239,68,68,0.1)",  color: "#f87171", border: "rgba(239,68,68,0.2)"  };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, letterSpacing: "0.5px",
      padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" as const,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 500, color: "rgba(255,255,255,0.55)",
      whiteSpace: "nowrap" as const,
    }}>
      {typeLabel(type)}
    </span>
  );
}

function SensitiveBadge() {
  return (
    <span
      aria-label="Contient des identifiants (données fictives en prévisualisation)"
      style={{
        fontSize: 9, fontWeight: 700, letterSpacing: "0.5px",
        padding: "2px 7px", borderRadius: 3, whiteSpace: "nowrap" as const,
        background: "rgba(251,191,36,0.08)", color: "#fbbf24",
        border: "1px solid rgba(251,191,36,0.2)",
        textTransform: "uppercase" as const,
      }}
    >
      Identifiants
    </span>
  );
}

function CopyButton({
  text, id, copied, onCopy,
}: { text: string; id: string; copied: string | null; onCopy: (t: string, i: string) => void }) {
  const isCopied = copied === id;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCopy(text, id); }}
      aria-label="Copier le Resend ID"
      style={{
        background: "transparent", border: "none", cursor: "pointer",
        color: isCopied ? "#4ade80" : "rgba(255,255,255,0.35)",
        fontSize: 11, padding: "2px 4px", borderRadius: 3,
        transition: "color 0.2s",
      }}
    >
      {isCopied ? "Copié" : "Copier"}
    </button>
  );
}

function KpiCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{
      background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 8, padding: "14px 18px", flex: 1, minWidth: 120,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || "#fff" }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 16,
          padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div className="email-skel" style={{ width: 90,  height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 4, flexShrink: 0 }} />
          <div className="email-skel" style={{ width: 120, height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 4, flexShrink: 0 }} />
          <div className="email-skel" style={{ width: 160, height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 4, flex: 1 }} />
          <div className="email-skel" style={{ width: 200, height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 4, flex: 2 }} />
          <div className="email-skel" style={{ width: 60,  height: 20, background: "rgba(255,255,255,0.1)", borderRadius: 4, flexShrink: 0 }} />
          <div className="email-skel" style={{ width: 80,  height: 12, background: "rgba(255,255,255,0.1)", borderRadius: 4, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

// ── Detail Panel (Journal) ────────────────────────────────────────────────────

function DetailPanel({
  log, onClose, copied, onCopy,
}: {
  log: EmailLog;
  onClose: () => void;
  copied: string | null;
  onCopy: (t: string, i: string) => void;
}) {
  const row = (label: string, value: React.ReactNode, mono = false) => (
    <div style={{ padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontFamily: mono ? "monospace" : undefined, wordBreak: "break-all" as const }}>
        {value}
      </div>
    </div>
  );

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 40 }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: "min(420px, 100vw)",
        background: "#0c0c0c", borderLeft: "1px solid rgba(255,255,255,0.08)",
        zIndex: 50, display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{
          padding: "20px 24px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#0c0c0c", zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{typeLabel(log.type)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>Détail de l'envoi</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer le détail"
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "rgba(255,255,255,0.6)", cursor: "pointer",
              fontSize: 12, fontWeight: 600, padding: "6px 12px",
            }}
          >
            Fermer
          </button>
        </div>

        <div style={{ padding: "0 24px 24px" }}>
          {row("Statut",       <StatusBadge status={log.status} />)}
          {row("Type",         typeLabel(log.type))}
          {row("Destinataire", log.to_email, true)}
          {row("Sujet",        log.subject)}
          {row("Date",         fmtDate(log.created_at))}
          {row("Resend ID",
            log.resend_id ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "monospace", fontSize: 11 }}>{log.resend_id}</span>
                <CopyButton text={log.resend_id} id={`detail-${log.id}`} copied={copied} onCopy={onCopy} />
              </span>
            ) : <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>,
            false
          )}
          {log.user_id      && row("User ID",      log.user_id,      true)}
          {log.challenge_id && row("Challenge ID", log.challenge_id, true)}
          {log.event_key    && row("Event key",    log.event_key,    true)}
          {log.status === "failed" && log.error && (
            <div style={{ padding: "12px 0" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "rgba(239,68,68,0.7)", textTransform: "uppercase" as const, marginBottom: 6 }}>
                Erreur
              </div>
              <div style={{
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: 6, padding: "10px 12px",
                fontSize: 12, color: "rgba(255,255,255,0.7)",
                fontFamily: "monospace", wordBreak: "break-word" as const, lineHeight: 1.6,
              }}>
                {log.error}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Preview Panel (Transactional) ─────────────────────────────────────────────

function PreviewPanel({
  data, mode, onSetMode, onClose,
}: {
  data:       PreviewData;
  mode:       "desktop" | "mobile";
  onSetMode:  (m: "desktop" | "mobile") => void;
  onClose:    () => void;
}) {
  const iframeWidth = mode === "desktop" ? "620px" : "min(390px, 100%)";

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 60 }}
      />
      <div
        role="dialog"
        aria-label={`Prévisualisation : ${data.label}`}
        style={{
          position: "fixed", top: 0, right: 0, bottom: 0,
          width: "min(800px, 100vw)",
          background: "#090909", borderLeft: "1px solid rgba(255,255,255,0.09)",
          zIndex: 70, display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{data.label}</span>
              {data.sensitive && <SensitiveBadge />}
            </div>
            <div style={{
              fontSize: 12, color: "rgba(255,255,255,0.4)",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const,
            }}>
              {data.subject}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer la prévisualisation"
            style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 6, color: "rgba(255,255,255,0.6)", cursor: "pointer",
              fontSize: 12, fontWeight: 600, padding: "6px 12px", flexShrink: 0,
            }}
          >
            Fermer
          </button>
        </div>

        {/* Meta bar */}
        <div style={{
          padding: "10px 24px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" as const,
          flexShrink: 0,
        }}>
          {/* Trigger */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>
              Déclencheur
            </span>
            <span style={{
              fontSize: 11, color: "rgba(255,255,255,0.6)",
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 4, padding: "2px 8px",
            }}>
              {data.trigger}
            </span>
          </div>

          {/* Variables */}
          {data.variables.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" as const }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>
                Variables
              </span>
              {data.variables.map(v => (
                <span
                  key={v.name}
                  aria-label={v.sensitive ? `${v.name} (identifiant sensible)` : v.name}
                  style={{
                    fontSize: 10, fontFamily: "monospace",
                    padding: "2px 6px", borderRadius: 3,
                    background: v.sensitive ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.05)",
                    color:      v.sensitive ? "#fbbf24"                : "rgba(255,255,255,0.5)",
                    border: `1px solid ${v.sensitive ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {"{{"}{v.name}{"}}"}
                </span>
              ))}
            </div>
          )}

          {/* Mode toggle */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
            {(["desktop", "mobile"] as const).map(m => (
              <button
                key={m}
                onClick={() => onSetMode(m)}
                aria-pressed={mode === m}
                style={{
                  fontSize: 11, fontWeight: mode === m ? 700 : 500,
                  padding: "5px 12px", borderRadius: 5, cursor: "pointer",
                  background: mode === m ? "rgba(59,130,246,0.12)" : "transparent",
                  border: `1px solid ${mode === m ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                  color: mode === m ? "#60a5fa" : "rgba(255,255,255,0.4)",
                  transition: "all 0.15s",
                }}
              >
                {m === "desktop" ? "Bureau" : "Mobile"}
              </button>
            ))}
          </div>
        </div>

        {/* iframe area */}
        <div style={{
          flex: 1, padding: "20px 24px", display: "flex", justifyContent: "center",
          background: "#111", overflowY: "auto",
        }}>
          <iframe
            title={`Prévisualisation email : ${data.label}`}
            srcDoc={data.html}
            sandbox="allow-same-origin"
            style={{
              width: iframeWidth,
              minHeight: 480,
              border: "none",
              borderRadius: 8,
              background: "#fff",
              display: "block",
              transition: "width 0.2s",
            }}
          />
        </div>

        {/* Footer */}
        <div style={{
          padding: "10px 24px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          fontSize: 11, color: "rgba(255,255,255,0.22)", textAlign: "center" as const,
          flexShrink: 0,
        }}>
          Données fictives — aucun email n'est envoyé depuis cette prévisualisation.
        </div>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmailCenterPage() {
  // ── Journal states
  const [logs,            setLogs]         = useState<EmailLog[]>([]);
  const [summary,         setSummary]      = useState<Summary | null>(null);
  const [loading,         setLoading]      = useState(true);
  const [err,             setErr]          = useState<string | null>(null);
  const [page,            setPage]         = useState(1);
  const [totalPages,      setTotalPages]   = useState(1);
  const [total,           setTotal]        = useState(0);
  const [search,          setSearch]       = useState("");
  const [debouncedSearch, setDebSearch]    = useState("");
  const [statusFilter,    setStatusFilter] = useState<"all" | "sent" | "failed">("all");
  const [typeFilter,      setTypeFilter]   = useState("all");
  const [detail,          setDetail]       = useState<EmailLog | null>(null);
  const [copied,          setCopied]       = useState<string | null>(null);
  const firstLoad = useRef(true);

  // ── Sub-navigation
  const [emailView, setEmailView] = useState<"journal" | "transactional">("journal");

  // ── Transactional states
  const [previewLoading, setPreviewLoading] = useState<Record<string, boolean>>({});
  const [previewData,    setPreviewData]    = useState<PreviewData | null>(null);
  const [previewMode,    setPreviewMode]    = useState<"desktop" | "mobile">("desktop");
  const [testConfirm,    setTestConfirm]    = useState<string | null>(null);
  const [testLoading,    setTestLoading]    = useState<Record<string, boolean>>({});
  const [testMsg,        setTestMsg]        = useState<Record<string, { ok: boolean; text: string }>>({});

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    if (firstLoad.current) return;
    setPage(1);
  }, [statusFilter, typeFilter, debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter   !== "all") params.set("type",   typeFilter);
      if (debouncedSearch)        params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/email-logs?${params.toString()}`, {
        headers: { "x-admin-key": ADMIN_KEY },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErr(d.error || "Impossible de charger le journal des emails.");
        return;
      }
      const data = await res.json();
      setLogs(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      if (data.summary) setSummary(data.summary);
    } catch {
      setErr("Impossible de charger le journal des emails.");
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [page, statusFilter, typeFilter, debouncedSearch]);

  useEffect(() => { load(); }, [load]);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch { /* ignore */ }
  };

  const pillStyle = (active: boolean) => ({
    fontSize: 12, fontWeight: active ? 700 : 500,
    padding: "6px 14px", borderRadius: 6, cursor: "pointer" as const,
    border: `1px solid ${active ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
    background: active ? "rgba(59,130,246,0.12)" : "transparent",
    color: active ? "#60a5fa" : "rgba(255,255,255,0.5)",
    transition: "all 0.15s",
  });

  const tabStyle = (active: boolean) => ({
    fontSize: 13, fontWeight: active ? 700 : 500,
    padding: "8px 18px", cursor: "pointer" as const,
    background: "transparent", border: "none",
    borderBottom: `2px solid ${active ? "#3b82f6" : "transparent"}`,
    color: active ? "#fff" : "rgba(255,255,255,0.38)",
    transition: "all 0.15s",
  });

  const failureRate7d = summary ? pct(summary.failed_7d, summary.sent_7d) : "—";
  const isEmpty = !loading && logs.length === 0;

  // ── Transactional handlers

  const clearMsg = (type: string, delay = 5000) => {
    setTimeout(() => setTestMsg(m => { const c = { ...m }; delete c[type]; return c; }), delay);
  };

  const handlePreview = async (type: string) => {
    setPreviewLoading(p => ({ ...p, [type]: true }));
    try {
      const res = await fetch("/api/admin/emails/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setTestMsg(m => ({ ...m, [type]: { ok: false, text: d.error || "Erreur de prévisualisation." } }));
        clearMsg(type, 4000);
        return;
      }
      const data: PreviewData = await res.json();
      setPreviewData(data);
      setPreviewMode("desktop");
    } catch {
      setTestMsg(m => ({ ...m, [type]: { ok: false, text: "Erreur de connexion." } }));
      clearMsg(type, 4000);
    } finally {
      setPreviewLoading(p => ({ ...p, [type]: false }));
    }
  };

  const handleTest = async (type: string) => {
    if (testConfirm !== type) {
      setTestConfirm(type);
      return;
    }
    setTestConfirm(null);
    setTestLoading(l => ({ ...l, [type]: true }));
    try {
      const res = await fetch("/api/admin/emails/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        setTestMsg(m => ({ ...m, [type]: { ok: false, text: "Échec de l'envoi test." } }));
      } else {
        setTestMsg(m => ({ ...m, [type]: { ok: true, text: "Email test envoyé." } }));
      }
      clearMsg(type, 5000);
    } catch {
      setTestMsg(m => ({ ...m, [type]: { ok: false, text: "Erreur de connexion." } }));
      clearMsg(type, 5000);
    } finally {
      setTestLoading(l => ({ ...l, [type]: false }));
    }
  };

  return (
    <>
      <style>{`
        @keyframes email-pulse {
          0%, 100% { opacity: 0.35; }
          50%       { opacity: 0.65; }
        }
        .email-skel      { animation: email-pulse 1.5s ease-in-out infinite; }
        .email-row:hover  { background: rgba(255,255,255,0.03) !important; }
        .email-row:focus-within { outline: 1px solid rgba(59,130,246,0.4); }
        .email-card:hover { background: rgba(255,255,255,0.04) !important; }
        .email-tpl-card:hover { border-color: rgba(255,255,255,0.15) !important; }
        .email-tpl-btn:focus-visible { outline: 2px solid #3b82f6; outline-offset: 2px; }

        @media (max-width: 640px) {
          .email-table    { display: none !important; }
          .email-cards    { display: flex !important; }
          .email-kpi-row  { flex-wrap: wrap; }
          .email-kpi-row > div { min-width: calc(50% - 6px) !important; }
          .email-tpl-grid { grid-template-columns: 1fr !important; }
        }
        @media (min-width: 641px) {
          .email-cards    { display: none !important; }
          .email-table    { display: block !important; }
          .email-tpl-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 641px) and (max-width: 960px) {
          .email-tpl-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── Sticky header ──────────────────────────────────────────── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20,
        background: "#050505", borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Breadcrumb + title */}
        <div style={{ padding: "18px 24px 0" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 6, letterSpacing: "0.3px" }}>
            Marketing / Emails
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0 }}>
              Email Center
            </h1>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
              Suivez les emails transactionnels envoyés par la plateforme.
            </span>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <div style={{ display: "flex", padding: "0 8px", marginTop: 10 }}>
          {(["journal", "transactional"] as const).map(v => (
            <button
              key={v}
              onClick={() => setEmailView(v)}
              aria-current={emailView === v ? "page" : undefined}
              style={tabStyle(emailView === v)}
            >
              {v === "journal" ? "Journal" : "Transactionnels"}
            </button>
          ))}
        </div>

        {/* Journal-only: KPI + filters + hint */}
        {emailView === "journal" && (
          <>
            <div className="email-kpi-row" style={{ display: "flex", gap: 10, padding: "16px 24px 0", flexWrap: "wrap" as const }}>
              <KpiCard label="Envoyés 24h"   value={summary ? summary.sent_24h   : "—"} color="#4ade80" />
              <KpiCard label="Echecs 24h"    value={summary ? summary.failed_24h : "—"} color={summary && summary.failed_24h > 0 ? "#f87171" : "rgba(255,255,255,0.5)"} />
              <KpiCard label="Envoyés 7j"    value={summary ? summary.sent_7d    : "—"} />
              <KpiCard
                label="Taux echec 7j"
                value={failureRate7d}
                color={summary && summary.failed_7d > 0
                  ? (summary.failed_7d / (summary.sent_7d + summary.failed_7d) > 0.1 ? "#f87171" : "#fbbf24")
                  : "rgba(255,255,255,0.5)"}
                sub={summary ? `${summary.failed_7d} echec(s) / ${summary.sent_7d + summary.failed_7d} total` : undefined}
              />
            </div>

            <div style={{ padding: "14px 24px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" as const }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher email ou sujet..."
                aria-label="Rechercher par email ou sujet"
                style={{
                  background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6, color: "#fff", fontSize: 12, padding: "7px 12px",
                  outline: "none", width: 220, flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                {(["all", "sent", "failed"] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)} style={pillStyle(statusFilter === s)}>
                    {s === "all" ? "Tous" : s === "sent" ? "Envoyés" : "Echecs"}
                  </button>
                ))}
              </div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                aria-label="Filtrer par type d'email"
                style={{
                  background: "#111", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 6, color: typeFilter === "all" ? "rgba(255,255,255,0.5)" : "#fff",
                  fontSize: 12, padding: "7px 10px", outline: "none", cursor: "pointer",
                }}
              >
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ padding: "0 24px 12px", fontSize: 11, color: "rgba(255,255,255,0.22)" }}>
              "Envoyé" signifie que Resend a accepté l'envoi. Le suivi de livraison n'est pas encore activé.
            </div>
          </>
        )}
      </div>

      {/* ── Journal view ───────────────────────────────────────────── */}
      {emailView === "journal" && (
        <div style={{ flex: 1, overflowX: "auto" }}>

          {err && (
            <div style={{
              margin: "20px 24px", padding: "12px 16px",
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: 8, fontSize: 13, color: "#f87171",
            }}>
              {err}
            </div>
          )}

          {/* Desktop table */}
          <div className="email-table" style={{ minWidth: 700 }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "130px 140px 180px 1fr 80px 130px 70px",
              padding: "10px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              fontSize: 10, fontWeight: 700, letterSpacing: "1px",
              color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const,
            }}>
              <div>Date</div><div>Type</div><div>Destinataire</div>
              <div>Sujet</div><div>Statut</div><div>Resend ID</div><div>Action</div>
            </div>

            {loading && <Skeleton />}

            {isEmpty && (
              <div style={{ padding: "48px 24px", textAlign: "center" as const }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                  {search || statusFilter !== "all" || typeFilter !== "all"
                    ? "Aucun email ne correspond à ces filtres."
                    : "Aucun email journalisé"}
                </div>
                {!search && statusFilter === "all" && typeFilter === "all" && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                    Les prochains emails transactionnels apparaîtront ici automatiquement.
                  </div>
                )}
              </div>
            )}

            {!loading && logs.map(log => (
              <div
                key={log.id}
                className="email-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 140px 180px 1fr 80px 130px 70px",
                  padding: "12px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                  alignItems: "center",
                  background: "transparent", transition: "background 0.1s",
                }}
              >
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontVariantNumeric: "tabular-nums" as const }}>
                  {fmtDateShort(log.created_at)}
                </div>
                <TypeBadge type={log.type} />
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }} title={log.to_email}>
                  {log.to_email}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, paddingRight: 12 }} title={log.subject}>
                  {log.subject}
                </div>
                <div><StatusBadge status={log.status} /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {log.resend_id ? (
                    <>
                      <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, maxWidth: 70 }} title={log.resend_id}>
                        {log.resend_id.slice(0, 8)}…
                      </span>
                      <CopyButton text={log.resend_id} id={`row-${log.id}`} copied={copied} onCopy={copyToClipboard} />
                    </>
                  ) : (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>—</span>
                  )}
                </div>
                <div>
                  <button
                    onClick={() => setDetail(log)}
                    aria-label={`Voir le détail de l'email pour ${log.to_email}`}
                    style={{
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 5, color: "rgba(255,255,255,0.55)", cursor: "pointer",
                      fontSize: 11, fontWeight: 500, padding: "4px 10px", whiteSpace: "nowrap" as const,
                    }}
                  >
                    Voir
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile cards */}
          <div className="email-cards" style={{ display: "none", flexDirection: "column", gap: 0 }}>
            {loading && (
              <div style={{ padding: "20px" }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="email-skel" style={{ height: 80, background: "rgba(255,255,255,0.06)", borderRadius: 8, marginBottom: 8 }} />
                ))}
              </div>
            )}
            {isEmpty && (
              <div style={{ padding: "48px 20px", textAlign: "center" as const }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
                  {search || statusFilter !== "all" || typeFilter !== "all"
                    ? "Aucun email ne correspond à ces filtres."
                    : "Aucun email journalisé"}
                </div>
                {!search && statusFilter === "all" && typeFilter === "all" && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
                    Les prochains emails transactionnels apparaîtront ici automatiquement.
                  </div>
                )}
              </div>
            )}
            {!loading && logs.map(log => (
              <div
                key={log.id}
                className="email-card"
                onClick={() => setDetail(log)}
                style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", background: "transparent", transition: "background 0.1s" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <TypeBadge type={log.type} />
                  <StatusBadge status={log.status} />
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", marginBottom: 3, fontWeight: 500 }}>{log.to_email}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginBottom: 4 }}>{log.subject}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>{fmtDateShort(log.created_at)}</div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {!loading && !err && totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" as const }}>
                Page {page} / {totalPages} — {total} résultat{total !== 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                  aria-label="Page précédente"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: page <= 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", cursor: page <= 1 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 500, padding: "6px 14px" }}
                >
                  Precedent
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  aria-label="Page suivante"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: page >= totalPages ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)", cursor: page >= totalPages ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 500, padding: "6px 14px" }}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
          {!loading && !err && totalPages <= 1 && total > 0 && (
            <div style={{ padding: "12px 24px", fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "right" as const }}>
              {total} email{total !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      )}

      {/* ── Transactional view ─────────────────────────────────────── */}
      {emailView === "transactional" && (
        <div style={{ padding: "24px", flex: 1 }}>
          <div className="email-tpl-grid" style={{ display: "grid", gap: 16 }}>
            {EMAIL_CATALOG.map(entry => {
              const isPreviewLoading = !!previewLoading[entry.type];
              const isTestLoading    = !!testLoading[entry.type];
              const isConfirm        = testConfirm === entry.type;
              const msg              = testMsg[entry.type];

              return (
                <div
                  key={entry.type}
                  className="email-tpl-card"
                  style={{
                    background: "#0c0c0c",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10, padding: "18px 20px",
                    display: "flex", flexDirection: "column", gap: 12,
                    transition: "border-color 0.15s",
                  }}
                >
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", flex: 1 }}>
                      {entry.label}
                    </span>
                    {entry.sensitive && <SensitiveBadge />}
                  </div>

                  {/* Description */}
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.55 }}>
                    {entry.description}
                  </p>

                  {/* Trigger */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "1px", color: "rgba(255,255,255,0.25)", textTransform: "uppercase" as const }}>
                      Déclencheur
                    </span>
                    <span style={{
                      fontSize: 11, color: "rgba(255,255,255,0.55)",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 4, padding: "2px 8px",
                    }}>
                      {entry.trigger}
                    </span>
                  </div>

                  {/* Variables */}
                  {entry.variables.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 4 }}>
                      {entry.variables.map(v => (
                        <span
                          key={v.name}
                          aria-label={v.sensitive ? `${v.name} (identifiant sensible)` : v.name}
                          style={{
                            fontSize: 10, fontFamily: "monospace",
                            padding: "2px 6px", borderRadius: 3,
                            background: v.sensitive ? "rgba(251,191,36,0.06)" : "rgba(255,255,255,0.04)",
                            color:      v.sensitive ? "#fbbf24"                : "rgba(255,255,255,0.4)",
                            border: `1px solid ${v.sensitive ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.07)"}`,
                          }}
                        >
                          {"{{"}{v.name}{"}}"}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Feedback */}
                  {msg && (
                    <div style={{
                      fontSize: 11, padding: "6px 10px", borderRadius: 5,
                      background: msg.ok ? "rgba(34,197,94,0.07)"  : "rgba(239,68,68,0.07)",
                      border: `1px solid ${msg.ok ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
                      color: msg.ok ? "#4ade80" : "#f87171",
                    }}>
                      {msg.text}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    {/* Preview */}
                    <button
                      className="email-tpl-btn"
                      onClick={() => handlePreview(entry.type)}
                      disabled={isPreviewLoading}
                      aria-label={`Prévisualiser l'email : ${entry.label}`}
                      style={{
                        flex: 1, fontSize: 12, fontWeight: 600,
                        padding: "8px 12px", borderRadius: 7,
                        cursor: isPreviewLoading ? "wait" : "pointer",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "rgba(255,255,255,0.7)",
                        opacity: isPreviewLoading ? 0.6 : 1,
                        transition: "opacity 0.15s",
                      }}
                    >
                      {isPreviewLoading ? "Chargement…" : "Prévisualiser"}
                    </button>

                    {/* Test — confirm state */}
                    {isConfirm ? (
                      <div style={{ display: "flex", gap: 6, flex: 1 }}>
                        <button
                          className="email-tpl-btn"
                          onClick={() => handleTest(entry.type)}
                          disabled={isTestLoading}
                          aria-label={`Confirmer l'envoi test : ${entry.label}`}
                          style={{
                            flex: 1, fontSize: 11, fontWeight: 700,
                            padding: "8px 10px", borderRadius: 7,
                            cursor: isTestLoading ? "wait" : "pointer",
                            background: "rgba(59,130,246,0.15)",
                            border: "1px solid rgba(59,130,246,0.35)",
                            color: "#60a5fa",
                            opacity: isTestLoading ? 0.6 : 1,
                            transition: "opacity 0.15s",
                          }}
                        >
                          Confirmer
                        </button>
                        <button
                          className="email-tpl-btn"
                          onClick={() => setTestConfirm(null)}
                          style={{
                            fontSize: 11, fontWeight: 600,
                            padding: "8px 10px", borderRadius: 7, cursor: "pointer",
                            background: "transparent",
                            border: "1px solid rgba(255,255,255,0.1)",
                            color: "rgba(255,255,255,0.4)",
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        className="email-tpl-btn"
                        onClick={() => handleTest(entry.type)}
                        disabled={isTestLoading}
                        aria-label={`Envoyer un email test : ${entry.label}`}
                        style={{
                          flex: 1, fontSize: 12, fontWeight: 600,
                          padding: "8px 12px", borderRadius: 7,
                          cursor: isTestLoading ? "wait" : "pointer",
                          background: "rgba(59,130,246,0.08)",
                          border: "1px solid rgba(59,130,246,0.2)",
                          color: "#60a5fa",
                          opacity: isTestLoading ? 0.6 : 1,
                          transition: "opacity 0.15s",
                        }}
                      >
                        {isTestLoading ? "Envoi…" : "Envoyer un test"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Detail panel (Journal) ─────────────────────────────────── */}
      {detail && (
        <DetailPanel
          log={detail}
          onClose={() => setDetail(null)}
          copied={copied}
          onCopy={copyToClipboard}
        />
      )}

      {/* ── Preview panel (Transactional) ─────────────────────────── */}
      {previewData && (
        <PreviewPanel
          data={previewData}
          mode={previewMode}
          onSetMode={setPreviewMode}
          onClose={() => setPreviewData(null)}
        />
      )}
    </>
  );
}
