"use client";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PayoutReceiptContent() {
  const p = useSearchParams();
  const ref         = p.get("ref")    || "ELY-000000";
  const date        = p.get("date")   || new Date().toLocaleDateString("fr-FR");
  const amount      = p.get("amount") || "0";
  const method      = p.get("method") || "bank";
  const address     = p.get("address")|| "";
  const firstName   = p.get("first")  || "";
  const lastName    = p.get("last")   || "";
  const email       = p.get("email")  || "";
  const accountSize = p.get("size")   || "";
  const mt5Login    = p.get("login")  || "";

  const isCrypto = method === "crypto";

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: "#f8faff", minHeight: "100vh", padding: "40px 24px" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print" style={{ textAlign: "right", marginBottom: 24, maxWidth: 700, margin: "0 auto 24px" }}>
        <button onClick={() => window.print()} style={{ background: "#1565C0", color: "#fff", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          🖨 Imprimer / PDF
        </button>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", background: "#fff", borderRadius: 20, boxShadow: "0 4px 40px rgba(21,101,192,0.1)", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "linear-gradient(135deg, #0D1B3E, #1a2f5e)", padding: "36px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src="/nouveau-logo.png" alt="Elysium" style={{ height: 52, filter: "brightness(10)" }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "5px", color: "#fff" }}>ELYSIUM</div>
              <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: "3px", color: "rgba(255,255,255,0.4)" }}>— REWARDS —</div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>Justificatif de versement</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#C9A84C" }}>{ref}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>{date}</div>
          </div>
        </div>

        <div style={{ padding: "40px 48px" }}>

          {/* Montant */}
          <div style={{ textAlign: "center", marginBottom: 40, padding: "28px", background: "linear-gradient(135deg, #f0f7ff, #e8f2ff)", borderRadius: 16, border: "1px solid #c5d5f5" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#7a90b0", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Montant versé</div>
            <div style={{ fontSize: 48, fontWeight: 900, color: "#1B4FD8", lineHeight: 1 }}>${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
            <div style={{ fontSize: 13, color: "#7a90b0", marginTop: 8 }}>USD · Récompense Elysium Rewards</div>
          </div>

          {/* Infos client + compte */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
            <div style={{ background: "#f8faff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e0eaff" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7a90b0", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>Bénéficiaire</div>
              {[
                { label: "Nom", value: `${firstName} ${lastName}`.trim() || "—" },
                { label: "Email", value: email || "—" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i === 0 ? "1px solid #e8f0ff" : "none" }}>
                  <span style={{ fontSize: 12, color: "#7a90b0" }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0D1B3E" }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "#f8faff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e0eaff" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7a90b0", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>Compte certifié</div>
              {[
                { label: "Taille", value: accountSize || "—" },
                { label: "N° MT5", value: mt5Login || "—" },
              ].map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i === 0 ? "1px solid #e8f0ff" : "none" }}>
                  <span style={{ fontSize: 12, color: "#7a90b0" }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#0D1B3E", fontFamily: "monospace" }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Méthode de versement */}
          <div style={{ background: "#f8faff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e0eaff", marginBottom: 32 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#7a90b0", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14 }}>Méthode de versement</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{isCrypto ? "🔶" : "🏦"}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0D1B3E" }}>{isCrypto ? "Crypto — USDC réseau Solana" : "Virement bancaire"}</div>
                  <div style={{ fontSize: 12, color: "#7a90b0", fontFamily: "monospace", marginTop: 2 }}>
                    {address ? (address.length > 30 ? address.slice(0, 18) + "..." + address.slice(-8) : address) : "—"}
                  </div>
                </div>
              </div>
              <span style={{ backgroundColor: "#22c55e18", color: "#22c55e", fontWeight: 700, fontSize: 11, padding: "4px 12px", borderRadius: 100, border: "1px solid #22c55e33" }}>
                ✓ Versé
              </span>
            </div>
          </div>

          {/* Footer légal */}
          <div style={{ borderTop: "1px solid #e8f0ff", paddingTop: 24, textAlign: "center" }}>
            <p style={{ fontSize: 11, color: "#9aa5be", lineHeight: 1.6, margin: 0 }}>
              Ce document certifie le versement de la récompense ci-dessus par Elysium Rewards.<br />
              Référence : <strong>{ref}</strong> · Date : {date} · support@elysium-rewards.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PayoutReceiptPage() {
  return <Suspense><PayoutReceiptContent /></Suspense>;
}
