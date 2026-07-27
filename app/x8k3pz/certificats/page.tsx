import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function CertificatsPage() {
  const admin = createAdminClient();

  const { data: challenges } = await admin
    .from("challenges")
    .select("id, client_first_name, client_last_name, account_size, model, created_at, amount_paid")
    .eq("phase", "funded")
    .eq("status", "funded")
    .order("created_at", { ascending: false });

  const rows = challenges || [];

  return (
    <main style={{
      minHeight: "100vh",
      background: "#050505",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: "40px 32px",
    }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#3b82f6", marginBottom: 6 }}>
            Admin — Traders Rewards
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: 0 }}>
            Certificats Reward
          </h1>
          <div style={{ color: "#555", fontSize: 13, marginTop: 6 }}>
            {rows.length} trader{rows.length !== 1 ? "s" : ""} reward
          </div>
        </div>

        {rows.length === 0 ? (
          <div style={{ color: "#555", fontSize: 14, padding: "40px 0" }}>
            Aucun trader reward pour le moment.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((c) => {
              const name = `${c.client_first_name || ""} ${c.client_last_name || ""}`.trim() || "Trader";
              const date = new Date(c.created_at).toLocaleDateString("fr-FR");
              const amount = c.amount_paid ? `${c.amount_paid.toLocaleString("fr-FR")} EUR` : c.account_size;

              const certUrl = `/certificate?type=reward`
                + `&firstname=${encodeURIComponent(c.client_first_name || "")}`
                + `&lastname=${encodeURIComponent(c.client_last_name || "")}`
                + `&amount=${encodeURIComponent(amount)}`
                + `&date=${encodeURIComponent(date)}`;

              return (
                <div key={c.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#0e0e0e",
                  border: "1px solid #1a1a1a",
                  borderRadius: 8,
                  padding: "16px 20px",
                  gap: 16,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#3b82f6", fontSize: 16 }}>{name}</div>
                    <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
                      {c.account_size} · {c.model?.toUpperCase()} · {date}
                      {c.amount_paid ? ` · Versement : ${c.amount_paid.toLocaleString("fr-FR")} EUR` : ""}
                    </div>
                    <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>{c.id}</div>
                  </div>
                  <a
                    href={certUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "#3b82f6",
                      color: "#fff",
                      textDecoration: "none",
                      padding: "9px 18px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    Ouvrir le certificat
                  </a>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: 24, fontSize: 11, color: "#2a2a2a" }}>
          <a href="/x8k3pz" style={{ color: "#333", textDecoration: "none" }}>← Retour admin</a>
        </div>
      </div>
    </main>
  );
}
