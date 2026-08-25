// ── Fiche Trader — Page dédiée /x8k3pz/traders/[userId] ─────────────────────
// Server Component : accès direct createAdminClient().
// Centralise toutes les informations d'un trader en un seul endroit.
// ─────────────────────────────────────────────────────────────────────────────

import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import NotesSection from "./NotesSection";

// ── Types locaux ─────────────────────────────────────────────────────────────

type Profile = {
  user_id:                string;
  first_name:             string | null;
  last_name:              string | null;
  phone:                  string | null;
  address:                string | null;
  city:                   string | null;
  postal_code:            string | null;
  country:                string | null;
  kyc_status:             string | null;
  kyc_rejection_reason:   string | null;
  kyc_submitted_at:       string | null;
  kyc_reviewed_at:        string | null;
  kyc_doc_id_front:       string | null;
  kyc_doc_id_back:        string | null;
  kyc_doc_residence:      string | null;
  kyc_doc_selfie:         string | null;
};

type Challenge = {
  id:                   string;
  user_id:              string;
  user_email:           string;
  account_size:         string;
  model:                string;
  phase:                string;
  status:               string;
  balance:              number;
  start_balance:        number;
  amount_paid:          number | null;
  mt5_login:            number | null;
  created_at:           string;
  trading_days:         number;
  total_drawdown_limit: number | null;
  breach_reason:        string | null;
  breach_at:            string | null;
};

type Payout = {
  id:             string;
  user_id:        string;
  user_email:     string;
  challenge_id:   string | null;
  amount:         number;
  status:         string;
  created_at:     string;
  payment_method: string | null;
};

type EmailLog = {
  id:         string;
  type:       string;
  to_email:   string;
  subject:    string | null;
  status:     string;
  error:      string | null;
  created_at: string;
};

type Note = {
  id:           string;
  content:      string;
  author_email: string;
  created_at:   string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  active:   "Actif",
  failed:   "Échoué",
  passed:   "Validé",
  funded:   "Reward Account",
  pending:  "En attente",
  paid:     "Versé",
  rejected: "Refusé",
};

const STATUS_COLORS: Record<string, string> = {
  active:   "#22c55e",
  failed:   "#ef4444",
  passed:   "#f59e0b",
  funded:   "#22c55e",
  pending:  "#f59e0b",
  paid:     "#22c55e",
  rejected: "#ef4444",
};

const KYC_LABEL: Record<string, string> = {
  approved:    "Approuvé",
  rejected:    "Refusé",
  pending:     "En attente",
  not_submitted: "Non soumis",
};

const KYC_COLOR: Record<string, string> = {
  approved:    "#22c55e",
  rejected:    "#ef4444",
  pending:     "#f59e0b",
  not_submitted: "rgba(255,255,255,0.25)",
};

function badge(label: string, color: string) {
  return (
    <span style={{
      backgroundColor: `${color}22`,
      color,
      padding: "3px 10px",
      borderRadius: 100,
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 0.4,
    }}>
      {label}
    </span>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: "#0c0c0c",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 1.5,
        color: "rgba(255,255,255,0.3)",
        textTransform: "uppercase",
      }}>
        {title}
      </div>
      <div style={{ padding: "16px 20px" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 130, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#fff", flex: 1 }}>
        {value ?? <span style={{ color: "rgba(255,255,255,0.18)" }}>—</span>}
      </span>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function TraderPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  // Validation UUID basique
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(userId)) notFound();

  const admin = createAdminClient();

  // ── Fetch parallèle ────────────────────────────────────────────────────────
  const [
    userRes,
    profileRes,
    challengesRes,
    payoutsRes,
    emailLogsRes,
    notesRes,
  ] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("*").eq("user_id", userId).single(),
    admin.from("challenges").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("payouts").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin.from("email_logs").select("id, type, to_email, subject, status, error, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(25),
    admin.from("admin_notes").select("id, content, author_email, created_at")
      .eq("target_type", "trader").eq("target_id", userId).order("created_at", { ascending: false }),
  ]);

  const user       = userRes.data?.user;
  const profile    = profileRes.data as Profile | null;
  const challenges = (challengesRes.data ?? []) as Challenge[];
  const payouts    = (payoutsRes.data   ?? []) as Payout[];
  const emailLogs  = (emailLogsRes.data ?? []) as EmailLog[];
  const notes      = (notesRes.data     ?? []) as Note[];

  if (!user) notFound();

  // ── KYC — URLs signées ────────────────────────────────────────────────────
  const kycDocs: Record<string, string | null> = {
    id_front:  null,
    id_back:   null,
    residence: null,
    selfie:    null,
  };

  if (profile) {
    const kycPaths: Record<string, string | null> = {
      id_front:  profile.kyc_doc_id_front,
      id_back:   profile.kyc_doc_id_back,
      residence: profile.kyc_doc_residence,
      selfie:    profile.kyc_doc_selfie,
    };
    await Promise.all(
      Object.entries(kycPaths).map(async ([key, path]) => {
        if (path) {
          const { data } = await admin.storage.from("kyc-documents").createSignedUrl(path, 3600);
          kycDocs[key] = data?.signedUrl ?? null;
        }
      })
    );
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalSpent    = challenges
    .filter(c => c.phase === "phase1" || c.model === "instant")
    .reduce((s, c) => s + (c.amount_paid || 0), 0);
  const activeCount   = challenges.filter(c => c.status === "active").length;
  const certifCount   = challenges.filter(c => c.status === "funded").length;
  const failedCount   = challenges.filter(c => c.status === "failed").length;
  const rewardsPaid   = payouts.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const rewardsPending = payouts.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  const fullName    = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || null;
  const displayName = fullName || user.email || userId;
  const kycStatus   = profile?.kyc_status ?? "not_submitted";
  const firstDate   = challenges.length > 0
    ? challenges.reduce((min, c) => c.created_at < min ? c.created_at : min, challenges[0].created_at)
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main style={{ padding: "28px 32px", maxWidth: 1100, display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
        <Link href="/x8k3pz?t=crm" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
          ← Clients
        </Link>
        <span>/</span>
        <span style={{ color: "rgba(255,255,255,0.7)" }}>{displayName}</span>
      </div>

      {/* HEADER — Identité + badges */}
      <div style={{
        background: "#0c0c0c",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "20px 24px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: "1.2" }}>
              {displayName}
            </div>
            {fullName && (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginTop: 3 }}>
                {user.email}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              {profile?.country && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{profile.country}</span>
              )}
              {firstDate && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>Depuis {fmtDate(firstDate)}</span>
              )}
              {badge(KYC_LABEL[kycStatus] ?? kycStatus, KYC_COLOR[kycStatus] ?? "#888")}
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)" }}>ID: {userId.slice(0, 8)}…</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link
              href={`/x8k3pz?t=pipeline&search=${encodeURIComponent(user.email ?? "")}`}
              style={{
                padding: "8px 16px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                color: "rgba(255,255,255,0.65)",
                fontSize: 12, fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Voir pipeline
            </Link>
          </div>
        </div>

        {/* KPIs strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 10,
          marginTop: 20,
        }}>
          {([
            { label: "Total payé", value: `€${totalSpent.toLocaleString()}`, color: "#22c55e" },
            { label: "Challenges", value: String(challenges.length),             color: "#fff" },
            { label: "Actifs",   value: String(activeCount),                     color: activeCount > 0 ? "#22c55e" : "rgba(255,255,255,0.25)" },
            { label: "Reward Accounts", value: String(certifCount), color: certifCount > 0 ? "#9ccfea" : "rgba(255,255,255,0.25)" },
            { label: "Échoués",  value: String(failedCount),                     color: failedCount > 0 ? "#ef4444" : "rgba(255,255,255,0.25)" },
            { label: "Rewards",  value: `€${rewardsPaid.toLocaleString()}`,      color: rewardsPaid > 0 ? "#22c55e" : "rgba(255,255,255,0.25)" },
            { label: "En attente", value: rewardsPending > 0 ? `€${rewardsPending.toLocaleString()}` : "—", color: rewardsPending > 0 ? "#f59e0b" : "rgba(255,255,255,0.2)" },
          ] as { label: string; value: string; color: string }[]).map((k, i) => (
            <div key={i} style={{
              background: "#111",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              padding: "10px 14px",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4 }}>
                {k.label}
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: k.color, fontVariantNumeric: "tabular-nums" }}>
                {k.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* IDENTITÉ */}
      <Section title="Identité">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Field label="Email"        value={user.email} />
          <Field label="Prénom"       value={profile?.first_name} />
          <Field label="Nom"          value={profile?.last_name} />
          <Field label="Téléphone"    value={profile?.phone} />
          <Field label="Adresse"      value={profile?.address} />
          <Field label="Ville"        value={profile?.city} />
          <Field label="Code postal"  value={profile?.postal_code} />
          <Field label="Pays"         value={profile?.country} />
          {user.created_at && (
            <Field label="Inscription" value={fmtDateTime(user.created_at)} />
          )}
          {user.last_sign_in_at && (
            <Field label="Dernière connexion" value={fmtDateTime(user.last_sign_in_at)} />
          )}
        </div>
      </Section>

      {/* CHALLENGES */}
      <Section title={`Challenges (${challenges.length})`}>
        {challenges.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucun challenge.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.8 }}>
                  {["Date", "Modèle", "Taille", "Phase", "Statut", "Balance", "Payé", "MT5", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "4px 10px 10px", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {challenges.map(c => {
                  const gain = c.start_balance
                    ? ((c.balance - c.start_balance) / c.start_balance * 100)
                    : 0;
                  const gainClr = gain > 0 ? "#22c55e" : gain < 0 ? "#ef4444" : "rgba(255,255,255,0.3)";
                  return (
                    <tr
                      key={c.id}
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <td style={{ padding: "10px 10px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                        {fmtDate(c.created_at)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", fontWeight: 700, fontSize: 11 }}>
                        {c.model === "instant" ? "Instant" : c.model}
                      </td>
                      <td style={{ padding: "10px 10px", color: "#fff", fontWeight: 700, whiteSpace: "nowrap" }}>
                        {c.account_size}
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        <span style={{ fontSize: 10, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                          {c.phase === "funded" ? "Reward Account" : c.phase === "phase2" ? "Historique" : "Challenger"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        {badge(STATUS_LABELS[c.status] || c.status, STATUS_COLORS[c.status] || "#888")}
                      </td>
                      <td style={{ padding: "10px 10px", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                        <span style={{ color: c.status === "failed" ? "#ef4444" : "#fff", fontWeight: 700 }}>
                          ${c.balance?.toLocaleString() ?? "—"}
                        </span>
                        {c.start_balance > 0 && (
                          <span style={{ fontSize: 11, color: gainClr, marginLeft: 6 }}>
                            {gain >= 0 ? "+" : ""}{gain.toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "10px 10px", color: "rgba(255,255,255,0.55)", fontVariantNumeric: "tabular-nums" }}>
                        {c.amount_paid ? `€${c.amount_paid.toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "10px 10px", color: "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums", fontSize: 11 }}>
                        {c.mt5_login ?? "—"}
                      </td>
                      <td style={{ padding: "10px 10px" }}>
                        {c.breach_reason && (
                          <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 600 }} title={`Breach: ${c.breach_reason}`}>
                            ⚠ {c.breach_reason.slice(0, 20)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* REWARDS / PAYOUTS */}
      <Section title={`Rewards / Payouts (${payouts.length})`}>
        {payouts.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucune demande de reward.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "rgba(255,255,255,0.3)", textTransform: "uppercase", fontSize: 10, letterSpacing: 0.8 }}>
                  {["Date", "Montant", "Statut", "Méthode", "Challenge"].map((h, i) => (
                    <th key={i} style={{ textAlign: "left", padding: "4px 10px 10px", fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => (
                  <tr key={p.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "10px 10px", color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap" }}>
                      {fmtDate(p.created_at)}
                    </td>
                    <td style={{ padding: "10px 10px", fontWeight: 800, color: p.status === "paid" ? "#22c55e" : "#fff", fontVariantNumeric: "tabular-nums" }}>
                      €{p.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      {badge(STATUS_LABELS[p.status] || p.status, STATUS_COLORS[p.status] || "#888")}
                    </td>
                    <td style={{ padding: "10px 10px", color: "rgba(255,255,255,0.5)" }}>
                      {p.payment_method ?? "—"}
                    </td>
                    <td style={{ padding: "10px 10px", color: "rgba(255,255,255,0.3)", fontSize: 11, fontFamily: "monospace" }}>
                      {p.challenge_id ? p.challenge_id.slice(0, 8) + "…" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* EMAILS */}
      <Section title={`Emails récents (${emailLogs.length})`}>
        {emailLogs.length === 0 ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Aucun email enregistré.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {emailLogs.map(e => (
              <div
                key={e.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 10px",
                  background: "#111",
                  borderRadius: 7,
                  flexWrap: "wrap",
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", flexShrink: 0,
                  background: e.status === "sent" ? "#22c55e" : "#ef4444",
                }} />
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
                  {fmtDateTime(e.created_at)}
                </span>
                <span style={{ fontSize: 11, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", padding: "1px 7px", borderRadius: 4, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {e.type}
                </span>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.subject ?? "—"}
                </span>
                {e.error && (
                  <span style={{ fontSize: 10, color: "#ef4444", flexShrink: 0 }} title={e.error}>
                    ⚠ erreur
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* KYC */}
      <Section title="KYC">
        {!profile || kycStatus === "not_submitted" ? (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>KYC non soumis.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
              {badge(KYC_LABEL[kycStatus] ?? kycStatus, KYC_COLOR[kycStatus] ?? "#888")}
              {profile.kyc_submitted_at && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  Soumis le {fmtDate(profile.kyc_submitted_at)}
                </span>
              )}
              {profile.kyc_reviewed_at && (
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  · Révisé le {fmtDate(profile.kyc_reviewed_at)}
                </span>
              )}
            </div>
            {profile.kyc_rejection_reason && (
              <div style={{ fontSize: 12, color: "#ef4444", padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 6 }}>
                Motif refus : {profile.kyc_rejection_reason}
              </div>
            )}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
              {([
                { key: "id_front",  label: "ID recto" },
                { key: "id_back",   label: "ID verso" },
                { key: "residence", label: "Domicile" },
                { key: "selfie",    label: "Selfie"   },
              ] as { key: string; label: string }[]).map(doc => (
                kycDocs[doc.key] ? (
                  <a
                    key={doc.key}
                    href={kycDocs[doc.key]!}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 14px",
                      background: "rgba(59,130,246,0.1)",
                      border: "1px solid rgba(59,130,246,0.25)",
                      borderRadius: 7,
                      color: "#60a5fa",
                      fontSize: 12,
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    {doc.label} ↗
                  </a>
                ) : (
                  <span
                    key={doc.key}
                    style={{
                      padding: "6px 14px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 7,
                      color: "rgba(255,255,255,0.2)",
                      fontSize: 12,
                    }}
                  >
                    {doc.label}
                  </span>
                )
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* NOTES INTERNES */}
      <Section title={`Notes internes (${notes.length})`}>
        <NotesSection traderId={userId} initialNotes={notes} />
      </Section>

    </main>
  );
}
