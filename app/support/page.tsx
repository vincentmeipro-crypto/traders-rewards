"use client";
import { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SupportPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName, email, message }),
    });
    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      setFirstName(""); setLastName(""); setEmail(""); setMessage("");
    } else {
      const d = await res.json();
      setError(d.error || "Erreur lors de l'envoi.");
    }
  };

  const inp: React.CSSProperties = {
    width: "100%", backgroundColor: "#f8fafc", border: "1.5px solid rgba(21,101,192,0.2)",
    borderRadius: 10, padding: "13px 16px", color: "#0D1B3E", fontSize: 15,
    outline: "none", transition: "border 0.2s", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    color: "#555", fontSize: 12, fontWeight: 700, letterSpacing: "0.8px",
    textTransform: "uppercase", display: "block", marginBottom: 8,
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", color: "#111" }}>
      <Navbar />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px 80px" }}>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, letterSpacing: "-1px", color: "#0D1B3E" }}>
            Contacter le Support
          </h1>
          <p style={{ color: "#7a90b0", fontSize: 16, lineHeight: 1.7 }}>
            Une question ? Un problème ? Notre équipe vous répond rapidement.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", backgroundColor: "#ffffff", border: "1.5px solid #111", borderRadius: 20, padding: "48px 40px", boxShadow: "0 8px 40px rgba(21,101,192,0.08)" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "#0D1B3E" }}>Message envoyé !</h2>
            <p style={{ color: "#7a90b0", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              Notre équipe vous répondra dans les plus brefs délais à <strong style={{ color: "#1565C0" }}>{email || "votre adresse email"}</strong>.
            </p>
            <button onClick={() => setSuccess(false)}
              style={{ background: "none", border: "1px solid #e5e7eb", borderRadius: 10, padding: "12px 28px", color: "#555", fontSize: 14, cursor: "pointer" }}>
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ backgroundColor: "#ffffff", border: "1.5px solid #111", borderRadius: 20, padding: "40px 36px", display: "flex", flexDirection: "column", gap: 20, boxShadow: "0 8px 40px rgba(21,101,192,0.08)" }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>Prénom *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" required style={inp}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>
              <div>
                <label style={lbl}>Nom *</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" required style={inp}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#222")} />
              </div>
            </div>

            <div>
              <label style={lbl}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@email.com" required style={inp}
                onFocus={e => (e.target.style.borderColor = "#1565C0")}
                onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")} />
            </div>

            <div>
              <label style={lbl}>Message *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez votre problème ou question..." required rows={6}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties}
                onFocus={e => (e.target.style.borderColor = "#1565C0")}
                onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")} />
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary"
              style={{ width: "100%", padding: "15px", fontSize: 15, fontWeight: 800, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Envoi en cours..." : "ENVOYER LE MESSAGE"}
            </button>

            <p style={{ textAlign: "center", color: "#444", fontSize: 13, margin: 0 }}>
              Vous pouvez aussi nous écrire directement à{" "}
              <a href="mailto:contact@traders-rewards.eu" style={{ color: "#C9A84C", textDecoration: "none" }}>
                contact@traders-rewards.eu
              </a>
            </p>
          </form>
        )}
      </div>
      <Footer />
    </div>
  );
}
