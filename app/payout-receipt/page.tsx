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
  const isCrypto    = method === "crypto";

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", backgroundColor: "#fff", minHeight: "100vh", padding: "40px 24px", color: "#000" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; }
          @page { margin: 20mm; }
        }
        table { border-collapse: collapse; width: 100%; }
        td, th { padding: 8px 12px; font-size: 12px; }
      `}</style>

      <div className="no-print" style={{ textAlign: "right", marginBottom: 24, maxWidth: 750, margin: "0 auto 24px" }}>
        <button onClick={() => window.print()} style={{ background: "#000", color: "#fff", border: "none", padding: "10px 24px", fontSize: 13, cursor: "pointer" }}>
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div style={{ maxWidth: 750, margin: "0 auto" }}>

        {/* En-tête */}
        <table style={{ marginBottom: 32 }}>
          <tbody>
            <tr>
              <td style={{ padding: 0, verticalAlign: "top" }}>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase" }}>TRADERS REWARDS</div>
                <div style={{ fontSize: 11, color: "#555" }}>support@elysium-rewards.com</div>
                <div style={{ fontSize: 11, color: "#555" }}>www.elysium-rewards.com</div>
              </td>
              <td style={{ padding: 0, textAlign: "right", verticalAlign: "top" }}>
                <div style={{ fontSize: 18, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>Justificatif de versement</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>Référence : <strong>{ref}</strong></div>
                <div style={{ fontSize: 13 }}>Date : {date}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={{ borderTop: "2px solid #000", marginBottom: 24 }} />

        {/* Bénéficiaire */}
        <table style={{ marginBottom: 24 }}>
          <tbody>
            <tr>
              <td style={{ padding: 0, verticalAlign: "top", width: "50%" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, color: "#555" }}>Bénéficiaire</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{`${firstName} ${lastName}`.trim() || "—"}</div>
                <div style={{ fontSize: 12, color: "#333" }}>{email}</div>
              </td>
              <td style={{ padding: 0, verticalAlign: "top", width: "50%", textAlign: "right" }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, color: "#555" }}>Compte certifié</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Taille : {accountSize || "—"}</div>
                <div style={{ fontSize: 12, color: "#333" }}>N° MT5 : {mt5Login || "—"}</div>
              </td>
            </tr>
          </tbody>
        </table>

        <hr style={{ borderTop: "1px solid #ccc", marginBottom: 24 }} />

        {/* Détail du versement */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, color: "#555" }}>Détail du versement</div>
        <table style={{ border: "1px solid #ccc", marginBottom: 24 }}>
          <thead>
            <tr style={{ background: "#f5f5f5", borderBottom: "1px solid #ccc" }}>
              <th style={{ textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Description</th>
              <th style={{ textAlign: "left", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Référence compte</th>
              <th style={{ textAlign: "right", fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontSize: 13 }}>Récompense trader — {accountSize}</td>
              <td style={{ fontSize: 12, color: "#555" }}>{mt5Login || "—"}</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontSize: 14 }}>${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD</td>
            </tr>
            <tr>
              <td colSpan={2} style={{ textAlign: "right", fontWeight: 700, fontSize: 12, textTransform: "uppercase", paddingTop: 12 }}>Total versé</td>
              <td style={{ textAlign: "right", fontWeight: 700, fontSize: 16, borderTop: "2px solid #000", paddingTop: 8 }}>
                ${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
              </td>
            </tr>
          </tbody>
        </table>

        {/* Méthode de paiement */}
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 12, color: "#555" }}>Méthode de versement</div>
        <table style={{ border: "1px solid #ccc", marginBottom: 32 }}>
          <tbody>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontSize: 12, color: "#555", width: "30%" }}>Mode</td>
              <td style={{ fontSize: 13, fontWeight: 700 }}>{isCrypto ? "Virement crypto — USDC réseau Solana" : "Virement bancaire (SEPA)"}</td>
            </tr>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ fontSize: 12, color: "#555" }}>{isCrypto ? "Adresse wallet" : "IBAN"}</td>
              <td style={{ fontSize: 12, fontFamily: "monospace" }}>{address || "—"}</td>
            </tr>
            <tr>
              <td style={{ fontSize: 12, color: "#555" }}>Statut</td>
              <td style={{ fontSize: 13, fontWeight: 700 }}>✓ Versement effectué</td>
            </tr>
          </tbody>
        </table>

        <hr style={{ borderTop: "1px solid #ccc", marginBottom: 16 }} />

        {/* Pied de page */}
        <div style={{ fontSize: 10, color: "#777", lineHeight: 1.7 }}>
          Ce document certifie le versement de la récompense ci-dessus par Traders Rewards à la date indiquée.<br />
          Référence unique : <strong>{ref}</strong> — Ce justificatif peut être utilisé à des fins comptables et fiscales.<br />
          Pour toute question : support@elysium-rewards.com
        </div>
      </div>
    </div>
  );
}

export default function PayoutReceiptPage() {
  return <Suspense><PayoutReceiptContent /></Suspense>;
}
