"use client";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/LanguageContext";

export default function SupportPage() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [message,   setMessage]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");

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

  // ── Styles champs ────────────────────────────────────────────
  const inp: React.CSSProperties = {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 10,
    padding: "13px 16px",
    color: "#ffffff",
    fontSize: 15,
    outline: "none",
    transition: "border-color 0.2s ease",
    boxSizing: "border-box",
    colorScheme: "dark" as const,
  };
  const lbl: React.CSSProperties = {
    color: "rgba(255,255,255,0.40)",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.9px",
    textTransform: "uppercase",
    display: "block",
    marginBottom: 7,
  };

  // ── Bloc header (titre + sous-titre) ────────────────────────
  const headerBlock = (
    <div style={{ marginBottom: isMobile ? 0 : 32 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: "#D4A843",
        letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12,
      }}>
        SUPPORT
      </div>
      <h1 style={{
        fontSize: isMobile ? "clamp(1.9rem,7vw,2.5rem)" : "clamp(2rem,3.5vw,2.8rem)",
        fontWeight: 900, color: "#FFFFFF",
        letterSpacing: "-1px", lineHeight: 1.05,
        margin: "0 0 14px",
      }}>
        {L("Contacter le Support","Contactar con el Soporte","Contact Support")}
      </h1>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.7, margin: 0 }}>
        {L(
          "Une question ? Un problème ? Notre équipe vous répond rapidement.",
          "¿Una pregunta? ¿Un problema? Nuestro equipo te responde rápidamente.",
          "A question? A problem? Our team will get back to you quickly."
        )}
      </p>
    </div>
  );

  // ── Bloc formulaire ──────────────────────────────────────────
  const formBlock = success ? (
    <div style={{
      border: "1px solid rgba(184,135,70,0.20)",
      borderRadius: 16,
      padding: "40px 32px",
      background: "radial-gradient(ellipse at 50% 20%, #0c0c0c, #000000 70%)",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 42, marginBottom: 16 }}>✅</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10, color: "#ffffff" }}>
        {L("Message envoyé !","¡Mensaje enviado!","Message sent!")}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
        {L("Notre équipe vous répondra dans les plus brefs délais à","Nuestro equipo te responderá a la brevedad posible en","Our team will reply as soon as possible to")}{" "}
        <strong style={{ color: "rgba(255,255,255,0.8)" }}>{email || L("votre adresse email","tu dirección de email","your email address")}</strong>.
      </p>
      <button onClick={() => setSuccess(false)} style={{
        background: "none", border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 8, padding: "10px 24px",
        color: "rgba(255,255,255,0.55)", fontSize: 13, cursor: "pointer",
      }}>
        {L("Envoyer un autre message","Enviar otro mensaje","Send another message")}
      </button>
    </div>
  ) : (
    <form onSubmit={handleSubmit} style={{
      display: "flex", flexDirection: "column", gap: 18,
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 16,
      padding: isMobile ? "24px 20px" : "32px 28px",
      background: "radial-gradient(ellipse at 50% 0%, #0d0d0d, #000000 72%)",
    }}>
      {/* Prénom + Nom */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        <div>
          <label style={lbl}>{L("Prénom *","Nombre *","First name *")}</label>
          <input
            className="sup-input" value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder={L("Jean","Juan","John")} required style={inp}
          />
        </div>
        <div>
          <label style={lbl}>{L("Nom *","Apellido *","Last name *")}</label>
          <input
            className="sup-input" value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder={L("Dupont","García","Smith")} required style={inp}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label style={lbl}>Email *</label>
        <input
          className="sup-input" type="email" value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={L("jean.dupont@email.com","juan.garcia@email.com","john.smith@email.com")}
          required style={inp}
        />
      </div>

      {/* Message */}
      <div>
        <label style={lbl}>{L("Message *","Mensaje *","Message *")}</label>
        <textarea
          className="sup-input" value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={L("Décrivez votre problème ou question...","Describe tu problema o pregunta...","Describe your issue or question...")}
          required rows={5}
          style={{ ...inp, resize: "vertical", lineHeight: 1.6 } as React.CSSProperties}
        />
      </div>

      {/* Erreur */}
      {error && (
        <div style={{
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
          borderRadius: 8, padding: "11px 14px", color: "#ef4444", fontSize: 13,
        }}>
          {error}
        </div>
      )}

      {/* Bouton */}
      <button
        type="submit" className="sup-btn" disabled={loading}
        style={{
          width: "100%", padding: "14px", fontSize: 13, fontWeight: 800,
          letterSpacing: "1.5px", textTransform: "uppercase",
          background: "#000000", color: "#FFFFFF",
          border: "1px solid rgba(212,168,67,0.52)",
          borderRadius: 10,
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        {loading
          ? L("Envoi en cours...","Enviando...","Sending...")
          : L("ENVOYER LE MESSAGE","ENVIAR EL MENSAJE","SEND MESSAGE")}
      </button>

      <p style={{ textAlign: "center", color: "rgba(255,255,255,0.28)", fontSize: 12, margin: 0 }}>
        {L("Vous pouvez aussi nous écrire directement à","También puedes escribirnos directamente a","You can also write to us directly at")}{" "}
        <a href="mailto:contact@traders-rewards.eu" style={{ color: "#D4A843", textDecoration: "none" }}>
          contact@traders-rewards.eu
        </a>
      </p>
    </form>
  );

  // ── Image support ────────────────────────────────────────────
  const imageBlock = (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/IMAGE%20SUPPORT.png"
      alt="Équipe support Traders Rewards"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "cover",
        objectPosition: isMobile ? "62% top" : "center top",
        WebkitMaskImage: isMobile
          ? "linear-gradient(to bottom, black 0%, black 60%, rgba(0,0,0,0.4) 80%, transparent 100%)"
          : "linear-gradient(to right, transparent 0%, black 15%), linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.3) 85%, transparent 100%)",
        WebkitMaskComposite: isMobile ? undefined : "destination-in",
        maskImage: isMobile
          ? "linear-gradient(to bottom, black 0%, black 60%, rgba(0,0,0,0.4) 80%, transparent 100%)"
          : "linear-gradient(to right, transparent 0%, black 15%), linear-gradient(to bottom, black 0%, black 68%, rgba(0,0,0,0.3) 85%, transparent 100%)",
        maskComposite: isMobile ? undefined : "intersect",
      }}
    />
  );

  // ════════════════════════════════════════════════════════
  //  RENDU
  // ════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#000000", color: "#fff" }}>
      <Navbar />

      <style>{`
        .sup-input:focus { border-color: rgba(212,168,67,0.65) !important; }
        .sup-input::placeholder { color: rgba(255,255,255,0.22); }
        .sup-btn:hover:not(:disabled) {
          border-color: rgba(212,168,67,0.85) !important;
          box-shadow: 0 6px 22px rgba(212,168,67,0.10) !important;
          transform: translateY(-1px) !important;
        }
        .sup-btn:active:not(:disabled) { transform: translateY(0) scale(0.99) !important; }
      `}</style>

      {isMobile ? (
        /* ══ MOBILE : titre → image → formulaire ══ */
        <main style={{
          paddingTop: "calc(60px + var(--promo-banner-height, 0px) + 28px)",
          paddingBottom: 60,
          paddingLeft: 16, paddingRight: 16,
          boxSizing: "border-box",
        }}>
          {/* Titre */}
          <div style={{ marginBottom: 24 }}>{headerBlock}</div>

          {/* Image */}
          <div style={{
            marginLeft: -16, marginRight: -16,
            height: "clamp(220px, 60vw, 340px)",
            overflow: "hidden",
            position: "relative",
            marginBottom: 28,
          }}>
            {imageBlock}
          </div>

          {/* Formulaire */}
          {formBlock}
        </main>
      ) : (
        /* ══ DESKTOP : 2 colonnes ══ */
        <main style={{
          paddingTop: "calc(72px + var(--promo-banner-height, 0px))",
          paddingBottom: 0,
          minHeight: "100vh",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}>
          <div style={{
            maxWidth: 1380,
            margin: "0 auto",
            paddingLeft: "max(40px, 4vw)",
            paddingRight: 0,
            display: "flex",
            alignItems: "stretch",
            flex: 1,
            minHeight: "calc(100vh - 72px - var(--promo-banner-height, 0px))",
          }}>

            {/* ── Colonne gauche — formulaire ── */}
            <div style={{
              flex: "0 0 52%",
              maxWidth: 580,
              paddingRight: "max(36px, 3.5vw)",
              paddingTop: 56,
              paddingBottom: 56,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}>
              {headerBlock}
              {formBlock}
            </div>

            {/* ── Colonne droite — image ── */}
            <div style={{
              flex: "1 1 0",
              position: "relative",
              overflow: "hidden",
              minHeight: 0,
            }}>
              {imageBlock}
            </div>

          </div>
        </main>
      )}

      <Footer />
    </div>
  );
}
