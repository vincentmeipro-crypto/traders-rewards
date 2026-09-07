"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { useLanguage } from "@/lib/LanguageContext";

// ── Palette dorée validée site ────────────────────────────────────
const GOLD = "linear-gradient(110deg, #B88746 0%, #D6AD63 35%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)";

const goldText: React.CSSProperties = {
  background: GOLD,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
};

const goldBorderBtn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: `linear-gradient(#090A0B, #090A0B) padding-box, ${GOLD} border-box`,
  border: "1.5px solid transparent",
  color: "#FFFFFF",
  borderRadius: 12,
  fontWeight: 700,
  textDecoration: "none",
  letterSpacing: "0.4px",
  cursor: "pointer",
  ...extra,
});

export default function PartenariatPage() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => (isFr ? fr : isEs ? es : en);

  const [form, setForm] = useState({ name: "", email: "", audience: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  // ── i18n ────────────────────────────────────────────────────────
  const badge        = L("Programme Partenariat", "Programa de Colaboración", "Partnership Program");
  const h1Part1      = L("Gagnez de l'argent en", "Gana dinero", "Earn money by");
  const h1Accent     = L("recommandant Traders Rewards", "recomendando Traders Rewards", "referring Traders Rewards");
  const desc         = L(
    "Rejoignez notre programme d'affiliation et touchez jusqu'à 20% de commission sur chaque vente générée par votre lien.",
    "Únete a nuestro programa de afiliación y gana hasta un 20% de comisión por cada venta generada a través de tu enlace.",
    "Join our affiliate program and earn up to 20% commission on every sale generated through your link."
  );
  const ctaDashboard = L("Accéder à mon dashboard →", "Acceder a mi panel →", "Access my dashboard →");
  const ctaPartner   = L("Devenir partenaire", "Hazte colaborador", "Become a partner");

  const commTitle    = L("Structure des", "Estructura de", "Commission");
  const commAccent   = L("commissions", "comisiones", "structure");
  const commSub      = L(
    "Plus vous apportez de clients, plus votre taux augmente automatiquement.",
    "Cuantos más clientes refieras, mayor será automáticamente tu tasa de comisión.",
    "The more clients you refer, the higher your commission rate becomes automatically."
  );
  const autoProgress = L(
    "Progression automatique — votre taux augmente dès que vous atteignez le palier suivant.",
    "Progresión automática — tu tasa aumenta en cuanto alcanzas el siguiente nivel.",
    "Automatic progression — your rate increases as soon as you reach the next tier."
  );
  const deCommission = L("de commission", "de comisión", "commission");

  const TIERS = [
    { label: L("Débutant", "Principiante", "Beginner"), sales: L("1 – 10 ventes", "1 – 10 ventas", "1 – 10 sales"), rate: "10%", color: "rgba(255,255,255,0.55)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.10)" },
    { label: L("Partenaire", "Colaborador", "Partner"), sales: L("11 – 29 ventes", "11 – 29 ventas", "11 – 29 sales"), rate: "15%", color: "rgba(212,168,67,0.85)", bg: "rgba(212,168,67,0.06)", border: "rgba(212,168,67,0.28)" },
    { label: "Elite", sales: L("30+ ventes", "30+ ventas", "30+ sales"), rate: "20%", color: "#D4A843", bg: "rgba(212,168,67,0.09)", border: "rgba(212,168,67,0.48)" },
  ];

  const howTitle  = L("Comment ça", "¿Cómo", "How does it");
  const howAccent = L("marche ?", "funciona?", "work?");

  const STEPS = [
    {
      num: "01",
      title: L("Obtenez votre lien", "Obtén tu enlace", "Get your link"),
      desc: L(
        "Créez votre compte et accédez à votre lien d'affiliation unique depuis votre dashboard.",
        "Crea tu cuenta y accede a tu enlace de afiliación único desde tu panel.",
        "Create your account and access your unique referral link from your dashboard."
      ),
    },
    {
      num: "02",
      title: L("Partagez", "Comparte", "Share"),
      desc: L(
        "Partagez votre lien sur vos réseaux sociaux, chaîne YouTube, Discord ou communauté trading.",
        "Comparte tu enlace en tus redes sociales, canal de YouTube, Discord o comunidad de trading.",
        "Share your link on your social networks, YouTube channel, Discord or trading community."
      ),
    },
    {
      num: "03",
      title: L("Touchez vos commissions", "Cobra tus comisiones", "Earn commissions"),
      desc: L(
        "Pour chaque trader qui s'inscrit via votre lien et achète un challenge, vous touchez votre commission.",
        "Por cada trader que se registre a través de tu enlace y compre un challenge, cobras tu comisión.",
        "For every trader who signs up through your link and purchases a challenge, you earn your commission."
      ),
    },
  ];

  const whyTitle  = L("Pourquoi nous", "¿Por qué", "Why");
  const whyAccent = L("choisir ?", "elegirnos?", "choose us?");

  const BENEFITS = [
    {
      icon: "💰",
      title: L("Paiements rapides", "Pagos rápidos", "Fast payments"),
      desc: L(
        "Commissions versées chaque semaine, directement sur votre IBAN ou en crypto.",
        "Comisiones pagadas semanalmente, directamente en tu IBAN o en cripto.",
        "Commissions paid weekly, directly to your IBAN or in crypto."
      ),
    },
    {
      icon: "📊",
      title: L("Dashboard dédié", "Panel dedicado", "Dedicated dashboard"),
      desc: L(
        "Suivez vos conversions, commissions et lien en temps réel depuis votre espace client.",
        "Sigue tus conversiones, comisiones y enlace en tiempo real desde tu área de cliente.",
        "Track your conversions, commissions and link in real time from your client area."
      ),
    },
    {
      icon: "🎯",
      title: L("Code promo personnel", "Código promo personal", "Personal promo code"),
      desc: L(
        "Obtenez un code promo exclusif à partager à votre communauté pour booster vos conversions.",
        "Obtén un código promo exclusivo para compartir con tu comunidad y aumentar tus conversiones.",
        "Get an exclusive promo code to share with your community to boost your conversions."
      ),
    },
    {
      icon: "🤝",
      title: L("Support prioritaire", "Soporte prioritario", "Priority support"),
      desc: L(
        "Un accès direct à l'équipe Traders Rewards pour toutes vos questions partenariat.",
        "Acceso directo al equipo de Traders Rewards para todas tus preguntas de colaboración.",
        "Direct access to the Traders Rewards team for all your partner questions."
      ),
    },
  ];

  const revenueTitle = L("Exemple de revenus", "Ejemplo de ingresos", "Revenue example");
  const REVENUE = [
    { label: L("5 ventes / mois", "5 ventas / mes", "5 sales / month"),  earn: "~€250 – €350"  },
    { label: L("15 ventes / mois", "15 ventas / mes", "15 sales / month"), earn: "~€900 – €1,500" },
    { label: L("50 ventes / mois", "50 ventas / mes", "50 sales / month"), earn: "~€4,000 – €7,000" },
  ];
  const revenueNote = L(
    "*Estimations basées sur un panier moyen de €250, avec tiers 10% à 20%.",
    "*Estimaciones basadas en un carrito medio de €250, con niveles del 10% al 20%.",
    "*Estimates based on an average basket of €250, with tiers from 10% to 20%."
  );

  const joinTitle  = L("Rejoindre le", "Únete al", "Join the");
  const joinAccent = L("programme", "programa", "program");
  const joinSub    = L(
    "Remplissez ce formulaire et notre équipe vous contacte sous 24h pour activer votre accès partenaire.",
    "Completa este formulario y nuestro equipo te contactará en 24h para activar tu acceso de colaborador.",
    "Fill out this form and our team will contact you within 24h to activate your partner access."
  );

  const sentTitle = L("Demande envoyée !", "¡Solicitud enviada!", "Request sent!");
  const sentDesc  = L(
    "Notre équipe vous contactera sous 24h à l'adresse",
    "Nuestro equipo te contactará en 24h en",
    "Our team will contact you within 24h at"
  );
  const sentDesc2 = L(
    "En attendant, vous pouvez déjà vous connecter pour obtenir votre lien.",
    "Mientras tanto, ya puedes iniciar sesión para obtener tu enlace.",
    "In the meantime, you can already log in to get your link."
  );
  const sentDashBtn = L("Mon dashboard →", "Mi panel →", "My dashboard →");

  const nameLbl      = L("Prénom / Pseudo", "Nombre / Usuario", "First name / Username");
  const namePh       = L("Jean Dupont", "Juan García", "John Smith");
  const emailLbl     = "Email";
  const emailPh      = L("vous@email.com", "tú@email.com", "you@email.com");
  const audienceLbl  = L("Audience / Communauté", "Audiencia / Comunidad", "Audience / Community");
  const audiencePh   = L(
    "Ex: YouTube 5000 abonnés, Discord 2000 membres, Instagram...",
    "Ej: YouTube 5000 suscriptores, Discord 2000 miembros, Instagram...",
    "Ex: YouTube 5000 subscribers, Discord 2000 members, Instagram..."
  );
  const messageLbl   = L("Message (optionnel)", "Mensaje (opcional)", "Message (optional)");
  const messagePh    = L(
    "Présentez-vous, votre méthode de promotion...",
    "Preséntate, tu método de promoción...",
    "Tell us about yourself and your promotion method..."
  );
  const submitBtn    = L("Envoyer ma demande →", "Enviar mi solicitud →", "Send my request →");
  const submittingTxt = L("Envoi en cours...", "Enviando...", "Sending...");
  const loginHint    = L("Déjà inscrit ?", "¿Ya registrado?", "Already registered?");
  const loginLink    = L("Accédez à votre lien de parrainage ici", "Accede a tu enlace de referido aquí", "Access your referral link here");
  const errorTxt     = L(
    "Erreur lors de l'envoi. Réessayez ou écrivez à support@traders-rewards.eu",
    "Error al enviar. Inténtalo de nuevo o escribe a support@traders-rewards.eu",
    "Error sending. Please try again or write to support@traders-rewards.eu"
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErr("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `[PARTENARIAT] ${form.name}`,
          message: `Nom: ${form.name}\nEmail: ${form.email}\nAudience: ${form.audience}\n\nMessage:\n${form.message}`,
          email: form.email,
          name: form.name,
        }),
      });
      if (!res.ok) throw new Error("send error");
      setSent(true);
    } catch {
      setErr(errorTxt);
    }
    setSending(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: "11px 14px",
    fontSize: 14,
    color: "#fff",
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <>
      <Navbar />
      <style>{`
        body { background: #000000; }
        .part-hero { padding: calc(72px + 60px) 24px 80px; text-align: center; }
        .part-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
        @media (max-width: 768px) {
          .part-grid-3 { grid-template-columns: 1fr !important; }
          .part-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* ── Hero ── */}
      <section className="part-hero" style={{ background: "#000000" }}>

        <div style={{
          display: "inline-block",
          background: "rgba(212,168,67,0.07)",
          border: "1px solid rgba(212,168,67,0.30)",
          borderRadius: 100,
          padding: "6px 18px",
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(212,168,67,0.85)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          marginBottom: 20,
        }}>
          {badge}
        </div>

        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.8rem)", fontWeight: 900, color: "#ffffff", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20 }}>
          {h1Part1}<br />
          <span style={goldText}>{h1Accent}</span>
        </h1>

        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 17, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.7 }}>
          {desc.split("20%").map((part, i, arr) => (
            i < arr.length - 1
              ? <span key={i}>{part}<strong style={{ color: "#ffffff" }}>20%</strong></span>
              : <span key={i}>{part}</span>
          ))}
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/dashboard" style={goldBorderBtn({ padding: "14px 32px", fontSize: 14 })}>
            {ctaDashboard}
          </a>
          <a href="#contact" style={{ background: "transparent", color: "#fff", padding: "14px 32px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1px solid rgba(255,255,255,0.25)", letterSpacing: "0.5px" }}>
            {ctaPartner}
          </a>
        </div>
      </section>

      {/* ── Structure des commissions ── */}
      <section style={{ padding: "80px 0", background: "#000000" }}>
        <div className="part-section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#ffffff", marginBottom: 12 }}>
              {commTitle}{" "}
              <span style={goldText}>{commAccent}</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>{commSub}</p>
          </div>
          <div className="part-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {TIERS.map((tier) => (
              <div key={tier.label} style={{ background: tier.bg, border: `1px solid ${tier.border}`, borderRadius: 16, padding: "32px 28px", textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tier.color, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>{tier.label}</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: tier.color, lineHeight: 1, marginBottom: 8 }}>{tier.rate}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{deCommission}</div>
                <div style={{ marginTop: 16, fontSize: 13, color: "rgba(255,255,255,0.7)", background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 16px", fontWeight: 600 }}>{tier.sales}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, marginTop: 20 }}>
            {autoProgress}
          </p>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section style={{ padding: "80px 0", background: "#000000", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="part-section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#ffffff", marginBottom: 12 }}>
              {howTitle}{" "}
              <span style={goldText}>{howAccent}</span>
            </h2>
          </div>
          <div className="part-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {STEPS.map((s) => (
              <div key={s.num} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "32px 24px" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: "rgba(255,255,255,0.12)", lineHeight: 1, marginBottom: 16 }}>{s.num}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#ffffff", marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pourquoi nous choisir ── */}
      <section style={{ padding: "80px 0", background: "#000000", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="part-section">
          <div className="part-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#ffffff", marginBottom: 20 }}>
                {whyTitle}{" "}
                <span style={goldText}>{whyAccent}</span>
              </h2>
              {BENEFITS.map((item) => (
                <div key={item.title} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>{item.title}</div>
                    <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{
              background: "linear-gradient(145deg, rgba(13,18,23,.98), rgba(5,7,9,.98))",
              border: "1px solid rgba(212,168,67,0.18)",
              borderRadius: 20,
              padding: "40px 32px",
              color: "#fff",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>{revenueTitle}</div>
              {REVENUE.map((ex) => (
                <div key={ex.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>{ex.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "#D4A843" }}>{ex.earn}</span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 16 }}>{revenueNote}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Contact / Formulaire ── */}
      <section id="contact" style={{ padding: "80px 0", background: "#000000", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="part-section" style={{ maxWidth: 640 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#ffffff", marginBottom: 12 }}>
              {joinTitle}{" "}
              <span style={goldText}>{joinAccent}</span>
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15 }}>{joinSub}</p>
          </div>

          {sent ? (
            <div style={{ background: "#111111", border: "1.5px solid #22c55e", borderRadius: 16, padding: "40px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#ffffff", marginBottom: 8 }}>{sentTitle}</div>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 15 }}>
                {sentDesc} <strong style={{ color: "#fff" }}>{form.email}</strong>.<br />{sentDesc2}
              </p>
              <a href="/dashboard" style={goldBorderBtn({ marginTop: 24, padding: "12px 28px", fontSize: 14 })}>
                {sentDashBtn}
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, padding: "40px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="part-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{nameLbl}</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder={namePh} style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{emailLbl}</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder={emailPh} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{audienceLbl}</label>
                <input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} placeholder={audiencePh} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>{messageLbl}</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder={messagePh} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </div>
              {err && <div style={{ color: "#ef4444", fontSize: 13 }}>{err}</div>}
              <button
                type="submit"
                disabled={sending}
                style={{
                  background: `linear-gradient(#090A0B, #090A0B) padding-box, ${GOLD} border-box`,
                  border: "1.5px solid transparent",
                  borderRadius: 10,
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#FFFFFF",
                  cursor: sending ? "not-allowed" : "pointer",
                  opacity: sending ? 0.7 : 1,
                  letterSpacing: "0.4px",
                }}
              >
                {sending ? submittingTxt : submitBtn}
              </button>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
                {loginHint}{" "}
                <a href="/dashboard" style={{ color: "rgba(212,168,67,0.80)", fontWeight: 600 }}>
                  {loginLink}
                </a>
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
