import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const BANNER_TRADERS = [
  { name: "Karim B.",       payout: "3 187 EUR", size: "$100K", date: "14/03/2026" },
  { name: "Marco V.",       payout: "3 094 EUR", size: "$100K", date: "02/04/2026" },
  { name: "Thomas D.",      payout: "1 847 EUR", size: "$50K",  date: "19/04/2026" },
  { name: "Antoine M.",     payout: "4 213 EUR", size: "$100K", date: "05/05/2026" },
  { name: "Mathieu R.",     payout: "3 731 EUR", size: "$100K", date: "21/05/2026" },
  { name: "Alexandre P.",   payout: "3 847 EUR", size: "$100K", date: "08/06/2026" },
  { name: "Sarah L.",       payout: "2 196 EUR", size: "$50K",  date: "17/06/2026" },
  { name: "Carlos G.",      payout: "1 438 EUR", size: "$50K",  date: "29/06/2026" },
  { name: "Camille F.",     payout: "2 941 EUR", size: "$100K", date: "07/07/2026" },
  { name: "Nicolas B.",     payout: "4 638 EUR", size: "$100K", date: "12/07/2026" },
  { name: "Jean-Pierre D.", payout: "4 612 EUR", size: "$100K", date: "15/07/2026" },
  { name: "Lukas W.",       payout: "3 574 EUR", size: "$100K", date: "18/07/2026" },
  { name: "Julien M.",      payout: "2 578 EUR", size: "$100K", date: "20/07/2026" },
  { name: "Lena H.",        payout: "1 163 EUR", size: "$25K",  date: "22/07/2026" },
  { name: "Lucas M.",       payout: "1 046 EUR", size: "$25K",  date: "24/07/2026" },
];

function certUrl(name: string, amount: string, date: string) {
  const parts = name.trim().split(" ");
  const firstname = parts[0] || "";
  const lastname = parts.slice(1).join(" ");
  return `/certificate?type=reward`
    + `&firstname=${encodeURIComponent(firstname)}`
    + `&lastname=${encodeURIComponent(lastname)}`
    + `&amount=${encodeURIComponent(amount)}`
    + `&date=${encodeURIComponent(date)}`;
}

function Row({ name, sub, url }: { name: string; sub: string; url: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 8,
      padding: "14px 20px", gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "#3b82f6", fontSize: 15 }}>{name}</div>
        <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>{sub}</div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{
        background: "#3b82f6", color: "#fff", textDecoration: "none",
        padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700,
        whiteSpace: "nowrap", flexShrink: 0,
      }}>
        Ouvrir →
      </a>
    </div>
  );
}

export default async function CertificatsPage() {
  const admin = createAdminClient();
  const { data: challenges } = await admin
    .from("challenges")
    .select("id, client_first_name, client_last_name, account_size, model, created_at, amount_paid")
    .eq("status", "funded")
    .order("created_at", { ascending: false });

  const funded = challenges || [];

  return (
    <main style={{ minHeight: "100vh", background: "#050505", fontFamily: "'Segoe UI', system-ui, sans-serif", padding: "40px 32px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        <div style={{ marginBottom: 36 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#3b82f6", marginBottom: 6 }}>Admin — Traders Rewards</div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: "#fff", margin: 0 }}>Certificats Reward</h1>
        </div>

        {/* Traders réels en base */}
        {funded.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#22c55e", marginBottom: 12 }}>
              Traders réels ({funded.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 36 }}>
              {funded.map((c) => {
                const name = `${c.client_first_name || ""} ${c.client_last_name || ""}`.trim() || "Trader";
                const date = new Date(c.created_at).toLocaleDateString("fr-FR");
                const amount = c.amount_paid ? `${c.amount_paid.toLocaleString("fr-FR")} EUR` : c.account_size;
                return (
                  <Row key={c.id} name={name} sub={`${c.account_size} · ${date}`}
                    url={certUrl(name, amount, date)} />
                );
              })}
            </div>
          </>
        )}

        {/* Traders bannière */}
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#3b82f6", marginBottom: 12 }}>
          Traders bannière ({BANNER_TRADERS.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {BANNER_TRADERS.map((t) => (
            <Row key={t.name} name={t.name} sub={`${t.size} · ${t.payout} · ${t.date}`}
              url={certUrl(t.name, t.payout, t.date)} />
          ))}
        </div>

        <div style={{ marginTop: 28, fontSize: 11 }}>
          <a href="/x8k3pz" style={{ color: "#333", textDecoration: "none" }}>← Retour admin</a>
        </div>
      </div>
    </main>
  );
}
