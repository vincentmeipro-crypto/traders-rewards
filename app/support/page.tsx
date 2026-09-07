"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

const SUBMIT_BTN: React.CSSProperties = {
  width: "100%", padding: "15px", fontSize: 14, fontWeight: 800,
  letterSpacing: "1.5px", textTransform: "uppercase",
  background: "linear-gradient(135deg, #151719, #0B0C0E)",
  color: "#FFFFFF", border: "1px solid rgba(212,168,67,0.50)",
  borderRadius: 10, transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
};

export default function SupportPage() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

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
      setError(d.error || L("Erreur lors de l'envoi.", "Error al enviar.", "Error sending message."));
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
            {L("Contacter le Support", "Contactar con el Soporte", "Contact Support")}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, lineHeight: 1.7 }}>
            {L(
              "Une question ? Un problème ? Notre équipe vous répond rapidement.",
              "¿Una pregunta? ¿Un problema? Nuestro equipo te responde rápidamente.",
              "A question? A problem? Our team will get back to you quickly."
            )}
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: "center", backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "48px 40px" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: "#ffffff" }}>
              {L("Message envoyé !", "¡Mensaje enviado!", "Message sent!")}
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>
              {L("Notre équipe vous répondra dans les plus brefs délais à", "Nuestro equipo te responderá a la brevedad posible en", "Our team will reply as soon as possible to")}{" "}
              <strong style={{ color: "rgba(255,255,255,0.8)" }}>{email || L("votre adresse email", "tu dirección de email", "your email address")}</strong>.
            </p>
            <button onClick={() => setSuccess(false)}
              style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "12px 28px", color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer" }}>
              {L("Envoyer un autre message", "Enviar otro mensaje", "Send another message")}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ backgroundColor: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "40px 36px", display: "flex", flexDirection: "column", gap: 20 }}>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={lbl}>{L("Prénom *", "Nombre *", "First name *")}</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={L("Jean", "Juan", "John")} required style={inp}
                  onFocus={e => (e.target.style.borderColor = "rgba(212,168,67,0.65)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              </div>
              <div>
                <label style={lbl}>{L("Nom *", "Apellido *", "Last name *")}</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={L("Dupont", "García", "Smith")} required style={inp}
                  onFocus={e => (e.target.style.borderColor = "rgba(212,168,67,0.65)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
              </div>
            </div>

            <div>
              <label style={lbl}>Email *</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={L("jean.dupont@email.com", "juan.garcia@email.com", "john.smith@email.com")} required style={inp}
                onFocus={e => (e.target.style.borderColor = "rgba(212,168,67,0.65)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
            </div>

            <div>
              <label style={lbl}>{L("Message *", "Mensaje *", "Message *")}</label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={L("Décrivez votre problème ou question...", "Describe tu problema o pregunta...", "Describe your issue or question...")} required rows={6}
                style={{ ...inp, resize: "vertical", lineHeight: 1.6, colorScheme: "dark" } as React.CSSProperties}
                onFocus={e => (e.target.style.borderColor = "rgba(212,168,67,0.65)")}
                onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")} />
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{ ...SUBMIT_BTN, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
              onMouseEnter={e => { if (!loading) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,168,67,0.85)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 22px rgba(212,168,67,0.10)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(212,168,67,0.50)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}>
              {loading
                ? L("Envoi en cours...", "Enviando...", "Sending...")
                : L("ENVOYER LE MESSAGE", "ENVIAR EL MENSAJE", "SEND MESSAGE")}
            </button>

            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.35)", fontSize: 13, margin: 0 }}>
              {L("Vous pouvez aussi nous écrire directement à", "También puedes escribirnos directamente a", "You can also write to us directly at")}{" "}
              <a href="mailto:contact@traders-rewards.eu" style={{ color: "#D4A843", textDecoration: "none" }}>
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
