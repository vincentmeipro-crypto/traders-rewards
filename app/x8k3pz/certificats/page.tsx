import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

type CertScan = {
  scanned_at: string;
  source: string;
};

type Cert = {
  id: string;
  public_token: string;
  certificate_type: "phase1" | "phase2" | "reward";
  trader_display_name: string;
  account_size: string | null;
  amount: string | null;
  issued_at: string;
  reward_certificate_scans: CertScan[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function certPreviewUrl(cert: Cert, amount: string, date: string): string {
  const parts = cert.trader_display_name.trim().split(" ");
  const pageType = cert.certificate_type === "phase2" ? "phase2" : cert.certificate_type;
  const firstname = encodeURIComponent(parts[0] || "");
  const lastname  = encodeURIComponent(parts.slice(1).join(" "));
  return (
    `/certificate?type=${pageType}&token=${encodeURIComponent(cert.public_token)}` +
    `&firstname=${firstname}&lastname=${lastname}` +
    `&amount=${encodeURIComponent(amount)}&date=${encodeURIComponent(date)}`
  );
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR");
}

function fmtDatetime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
        textTransform: "uppercase", color: "#444",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 18, fontWeight: 800, color, lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      }}>
        {value}
      </span>
    </div>
  );
}

function Row({ cert }: { cert: Cert }) {
  const scans = cert.reward_certificate_scans ?? [];
  const qr    = scans.filter(s => s.source === "qr").length;
  const lien  = scans.filter(s => s.source === "link").length;
  const total = scans.length;

  // MAX(scanned_at) — comparaison de chaînes ISO : correct car format fixe
  const last = scans.length > 0
    ? scans.reduce((a, b) => (a.scanned_at > b.scanned_at ? a : b))
    : null;

  const issuedStr  = fmtDate(cert.issued_at);
  const amountStr  = cert.amount || cert.account_size || "—";
  const previewUrl = certPreviewUrl(cert, amountStr, issuedStr);
  const typeLabel = cert.certificate_type === "phase1"
    ? "Challenge validé"
    : cert.certificate_type === "phase2"
      ? "Historique"
      : "Reward";
  // "Vérifier →" ouvert par l'admin = source='link', distingué des scans QR physiques
  const verifyUrl  = `/verify/${cert.public_token}?source=link`;

  return (
    <div style={{
      background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 8, padding: "16px 20px",
    }}>

      {/* ── Ligne du haut : identité + boutons ── */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: 16, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 700, color: "#3b82f6", fontSize: 15 }}>
              {cert.trader_display_name}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
              color: "#9CCFEA", border: "1px solid #9CCFEA35", background: "#9CCFEA0d",
              borderRadius: 999, padding: "3px 7px",
            }}>
              {typeLabel}
            </span>
          </div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>
            {cert.account_size || "—"} · {amountStr} · {issuedStr}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#1a1a1a", color: "#aaa", border: "1px solid #2a2a2a",
              textDecoration: "none", padding: "7px 14px", borderRadius: 6,
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            }}
          >
            Ouvrir →
          </a>
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              background: "#3b82f6", color: "#fff",
              textDecoration: "none", padding: "7px 14px", borderRadius: 6,
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
            }}
          >
            Vérifier →
          </a>
        </div>
      </div>

      {/* ── Ligne du bas : stats scans ── */}
      <div style={{
        marginTop: 14, paddingTop: 12, borderTop: "1px solid #161616",
        display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center",
      }}>
        <Stat label="Total"     value={String(total)} color={total > 0 ? "#22c55e" : "#444"} />
        <Stat label="Scans QR"  value={String(qr)}    color={qr > 0   ? "#60a5fa" : "#444"} />
        <Stat label="Ouv. lien" value={String(lien)}  color={lien > 0 ? "#a78bfa" : "#444"} />

        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "#444",
          }}>
            Dernière vérification
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: last ? "#d1d5db" : "#444" }}>
            {last ? fmtDatetime(last.scanned_at) : "Jamais vérifié"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CertificatsPage() {
  const admin = createAdminClient();

  const result = await admin
    .from("reward_certificates")
    .select(
      "id, public_token, certificate_type, trader_display_name, account_size, amount, issued_at," +
      " reward_certificate_scans(scanned_at, source)"
    )
    .is("revoked_at", null)
    .order("issued_at", { ascending: false });

  let loadError = result.error;
  let certificates = (result.data ?? []) as unknown as Cert[];

  if (loadError && /certificate_type/i.test(loadError.message)) {
    const fallback = await admin
      .from("reward_certificates")
      .select(
        "id, public_token, trader_display_name, account_size, amount, issued_at," +
        " reward_certificate_scans(scanned_at, source)"
      )
      .is("revoked_at", null)
      .order("issued_at", { ascending: false });
    loadError = fallback.error;
    certificates = ((fallback.data ?? []) as unknown as Omit<Cert, "certificate_type">[]).map(cert => ({
      ...cert,
      certificate_type: "reward" as const,
    })) as unknown as Cert[];
  }

  return (
    <main style={{
      minHeight: "100vh", background: "#050505",
      fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "40px 32px",
    }}>
      <div style={{ maxWidth: 920, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
            textTransform: "uppercase", color: "#3b82f6", marginBottom: 6,
          }}>
            Admin — Traders Rewards
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: 0 }}>
            Certificats vérifiables
          </h1>
          <p style={{ color: "#555", fontSize: 12, marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
            <span style={{ color: "#666", fontWeight: 700 }}>Ouvrir →</span> prévisualise le certificat imprimable.{" "}
            <span style={{ color: "#666", fontWeight: 700 }}>Vérifier →</span> ouvre la page publique
            <span style={{ color: "#3a3a3a" }}> (enregistré comme source=link, distinct des scans QR physiques)</span>.
          </p>
        </div>

        {/* ── Contenu ── */}
        {loadError ? (
          <div style={{
            color: "#fca5a5", background: "#450a0a55",
            border: "1px solid #7f1d1d", padding: 16, borderRadius: 6,
          }}>
            Erreur de chargement des certificats. Vérifiez que la migration a bien été exécutée.
          </div>
        ) : (
          <>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
              textTransform: "uppercase", color: "#22c55e", marginBottom: 14,
            }}>
              Certificats actifs — {certificates.length}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {certificates.map(cert => (
                <Row key={cert.id} cert={cert} />
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 28, fontSize: 11 }}>
          <a href="/x8k3pz" style={{ color: "#555", textDecoration: "none" }}>← Retour admin</a>
        </div>
      </div>
    </main>
  );
}
