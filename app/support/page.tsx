"use client";
import { useState } from "react";
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
    width: "100%", backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 10, padding: "13px 16px", color: "#ffffff", fontSize: 15,
    outline: "none", transition: "border 0.2s", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: 700, letterSpacing: "0.8px",
    textTransform: "uppercase", display: "block", marginBottom: 8,
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000000", color: "#fff" }}>
      <Navbar />
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "120px 24px 80px" }}>

        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, letterSpacing: "-1px", color: "#ffffff" }}>
            Contacter le Support
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, lineHeight: 1.7 }}>
            Une question ? Un problème ? Notre équipe vous répond rapidement.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "48px 40px" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "#ffffff" }}>Message envoyé !</h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              Notre équipe vous répondra dans les plus brefs délais à <strong style={{ color: "#69C5FD" }}>{email || "votre adresse email"}</strong>.
            </p>
            <button onClick={() => setSuccess(false)}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 28px", color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer" }}>
              Envoyer un autre message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "40px 36px", display: "flex", flexDirection: "column", gap: 20 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>Prénom *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" required style={inp}
                  onFocus={e => (e.target.style.borderColor = "#69C5FD")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              </div>
              <div>
                <label style={lbl}>Nom *</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" required style={inp}
                  onFocus={e => (e.target.style.borderColor = "#69C5FD")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              </div>
            </div>

            <div>
              <label style={lbl}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@email.com" required style={inp}
                onFocus={e => (e.target.style.borderColor = "#69C5FD")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
            </div>

            <div>
              <label style={lbl}>Message *</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Décrivez votre problème ou question..." required rows={6}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6, colorScheme: "dark" } as React.CSSProperties}
                onFocus={e => (e.target.style.borderColor = "#69C5FD")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ width: "100%", padding: "15px", fontSize: 14, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, background: "#69C5FD", color: "#000", border: "none", borderRadius: 10, transition: "opacity 0.2s" }}>
              {loading ? "Envoi en cours..." : "ENVOYER LE MESSAGE"}
            </button>

            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>
              Vous pouvez aussi nous écrire directement à{" "}
              <a href="mailto:contact@traders-rewards.eu" style={{ color: "#69C5FD", textDecoration: "none" }}>
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
