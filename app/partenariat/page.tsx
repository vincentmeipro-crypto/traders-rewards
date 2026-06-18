"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";

const TIERS = [
  { label: "Débutant", sales: "1 – 10 ventes", rate: "10%", color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.2)" },
  { label: "Partenaire", sales: "11 – 29 ventes", rate: "15%", color: "#C9A84C", bg: "rgba(201,168,76,0.08)", border: "rgba(201,168,76,0.3)" },
  { label: "Elite", sales: "30+ ventes", rate: "20%", color: "#1565C0", bg: "rgba(21,101,192,0.08)", border: "rgba(21,101,192,0.3)" },
];

const STEPS = [
  { num: "01", title: "Obtenez votre lien", desc: "Créez votre compte et accédez à votre lien d'affiliation unique depuis votre dashboard." },
  { num: "02", title: "Partagez", desc: "Partagez votre lien sur vos réseaux sociaux, chaîne YouTube, Discord ou communauté trading." },
  { num: "03", title: "Touchez vos commissions", desc: "Pour chaque trader qui s'inscrit via votre lien et achète un challenge, vous touchez votre commission." },
];

export default function PartenariatPage() {
  const [form, setForm] = useState({ name: "", email: "", audience: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setErr("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: `[PARTENARIAT] Demande de ${form.name}`,
          message: `Nom: ${form.name}\nEmail: ${form.email}\nAudience: ${form.audience}\n\nMessage:\n${form.message}`,
          email: form.email,
          name: form.name,
        }),
      });
      if (!res.ok) throw new Error("Erreur envoi");
      setSent(true);
    } catch {
      setErr("Erreur lors de l'envoi. Réessayez ou écrivez à support@traders-rewards.eu");
    }
    setSending(false);
  };

  return (
    <>
      <Navbar />
      <style>{`
        body { background: #ffffff; }
        .part-hero { padding: calc(72px + 60px) 24px 80px; text-align: center; }
        .part-section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        @media (max-width: 768px) {
          .part-grid-3 { grid-template-columns: 1fr !important; }
          .part-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Hero */}
      <section className="part-hero" style={{ background: "linear-gradient(180deg, #f8f9ff 0%, #ffffff 100%)" }}>
        <div style={{ display: "inline-block", background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 100, padding: "6px 18px", fontSize: 11, fontWeight: 700, color: "#C9A84C", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 20 }}>
          Programme Partenariat
        </div>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.8rem)", fontWeight: 900, color: "#0D1B3E", lineHeight: 1.1, letterSpacing: "-1.5px", marginBottom: 20 }}>
          Gagnez de l'argent en<br />
          <span style={{ color: "#1565C0" }}>recommandant Traders Rewards</span>
        </h1>
        <p style={{ color: "#6b7280", fontSize: 17, maxWidth: 560, margin: "0 auto 36px", lineHeight: 1.7 }}>
          Rejoignez notre programme d'affiliation et touchez jusqu'à <strong style={{ color: "#0D1B3E" }}>20% de commission</strong> sur chaque vente générée par votre lien.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/dashboard" style={{ background: "#0D1B3E", color: "#fff", padding: "14px 32px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", letterSpacing: "0.5px" }}>
            Accéder à mon dashboard →
          </a>
          <a href="#contact" style={{ background: "#fff", color: "#0D1B3E", padding: "14px 32px", borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none", border: "1.5px solid #0D1B3E", letterSpacing: "0.5px" }}>
            Devenir partenaire
          </a>
        </div>
      </section>

      {/* Tiers */}
      <section style={{ padding: "80px 0", background: "#fff" }}>
        <div className="part-section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#0D1B3E", marginBottom: 12 }}>Structure des commissions</h2>
            <p style={{ color: "#6b7280", fontSize: 15 }}>Plus vous apportez de clients, plus votre taux augmente automatiquement.</p>
          </div>
          <div className="part-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
            {TIERS.map((t) => (
              <div key={t.label} style={{ background: t.bg, border: `1.5px solid ${t.border}`, borderRadius: 16, padding: "32px 28px", textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: t.color, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>{t.label}</div>
                <div style={{ fontSize: 52, fontWeight: 900, color: t.color, lineHeight: 1, marginBottom: 8 }}>{t.rate}</div>
                <div style={{ fontSize: 14, color: "#6b7280" }}>de commission</div>
                <div style={{ marginTop: 16, fontSize: 13, color: "#4a5568", background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px 16px", fontWeight: 600 }}>{t.sales}</div>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 20 }}>
            Progression automatique — votre taux augmente dès que vous atteignez le palier suivant.
          </p>
        </div>
      </section>

      {/* Comment ça marche */}
      <section style={{ padding: "80px 0", background: "#f8f9ff" }}>
        <div className="part-section">
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#0D1B3E", marginBottom: 12 }}>Comment ça marche ?</h2>
          </div>
          <div className="part-grid-3" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
            {STEPS.map((s) => (
              <div key={s.num} style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: "32px 24px" }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: "#e5e7eb", lineHeight: 1, marginBottom: 16 }}>{s.num}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0D1B3E", marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section style={{ padding: "80px 0", background: "#fff" }}>
        <div className="part-section">
          <div className="part-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#0D1B3E", marginBottom: 20 }}>Pourquoi nous choisir ?</h2>
              {[
                { icon: "💰", title: "Paiements rapides", desc: "Commissions versées chaque semaine, directement sur votre IBAN ou en crypto." },
                { icon: "📊", title: "Dashboard dédié", desc: "Suivez vos conversions, commissions et lien en temps réel depuis votre espace client." },
                { icon: "🎯", title: "Code promo personnel", desc: "Obtenez un code promo exclusif à partager à votre communauté pour booster vos conversions." },
                { icon: "🤝", title: "Support prioritaire", desc: "Un accès direct à l'équipe Traders Rewards pour toutes vos questions partenariat." },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", gap: 16, marginBottom: 24 }}>
                  <div style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontWeight: 700, color: "#0D1B3E", marginBottom: 4 }}>{item.title}</div>
                    <div style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1565C0 100%)", borderRadius: 20, padding: "40px 32px", color: "#fff" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Exemple de revenus</div>
              {[
                { label: "5 ventes / mois", earn: "~€250 – €350" },
                { label: "15 ventes / mois", earn: "~€900 – €1,500" },
                { label: "50 ventes / mois", earn: "~€4,000 – €7,000" },
              ].map((ex) => (
                <div key={ex.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)" }}>{ex.label}</span>
                  <span style={{ fontWeight: 800, fontSize: 16, color: "#C9A84C" }}>{ex.earn}</span>
                </div>
              ))}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 16 }}>*Estimations basées sur un panier moyen de €250, avec tiers 10% à 20%.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / Formulaire */}
      <section id="contact" style={{ padding: "80px 0", background: "#f8f9ff" }}>
        <div className="part-section" style={{ maxWidth: 640 }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#0D1B3E", marginBottom: 12 }}>Rejoindre le programme</h2>
            <p style={{ color: "#6b7280", fontSize: 15 }}>Remplissez ce formulaire et notre équipe vous contacte sous 24h pour activer votre accès partenaire.</p>
          </div>

          {sent ? (
            <div style={{ background: "#fff", border: "1.5px solid #22c55e", borderRadius: 16, padding: "40px 32px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <div style={{ fontWeight: 800, fontSize: 20, color: "#0D1B3E", marginBottom: 8 }}>Demande envoyée !</div>
              <p style={{ color: "#6b7280", fontSize: 15 }}>Notre équipe vous contactera sous 24h à l'adresse <strong>{form.email}</strong>.<br />En attendant, vous pouvez déjà vous connecter pour obtenir votre lien.</p>
              <a href="/dashboard" style={{ display: "inline-block", marginTop: 24, background: "#0D1B3E", color: "#fff", padding: "12px 28px", borderRadius: 8, fontWeight: 700, textDecoration: "none" }}>Mon dashboard →</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: "40px 32px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="part-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Prénom / Pseudo</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Jean Dupont" style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Email</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vous@email.com" style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Audience / Communauté</label>
                <input value={form.audience} onChange={e => setForm(f => ({ ...f, audience: e.target.value }))} placeholder="Ex: YouTube 5000 abonnés, Discord 2000 membres, Instagram..." style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#111", outline: "none", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>Message (optionnel)</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4} placeholder="Présentez-vous, votre méthode de promotion..." style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "11px 14px", fontSize: 14, color: "#111", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              {err && <div style={{ color: "#ef4444", fontSize: 13 }}>{err}</div>}
              <button type="submit" disabled={sending} style={{ background: "#0D1B3E", color: "#fff", border: "none", borderRadius: 8, padding: "14px", fontSize: 15, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
                {sending ? "Envoi en cours..." : "Envoyer ma demande →"}
              </button>
              <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
                Déjà inscrit ? <a href="/dashboard" style={{ color: "#1565C0", fontWeight: 600 }}>Accédez à votre lien de parrainage ici</a>
              </p>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
