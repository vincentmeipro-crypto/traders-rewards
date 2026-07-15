"use client";
import { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Check, Zap, Shield, Clock, TrendingUp } from "lucide-react";

const PLANS = [
  { size: "$25,000", price: "1 250€", monthly: null, features: ["Phase 1 : +10% objectif", "Phase 2 : +5% objectif", "Algorithme intégré actif", "60% des récompenses", "Sans limite de temps", "Résultats automatiques"] },
  { size: "$50,000", price: "2 500€", monthly: null, popular: true, features: ["Phase 1 : +10% objectif", "Phase 2 : +5% objectif", "Algorithme intégré actif", "60% des récompenses", "Sans limite de temps", "Résultats automatiques"] },
  { size: "$100,000", price: "5 000€", monthly: null, features: ["Phase 1 : +10% objectif", "Phase 2 : +5% objectif", "Algorithme intégré actif", "60% des récompenses", "Sans limite de temps", "Résultats automatiques"] },
];

const STEPS = [
  { icon: <Zap size={22} color="#3B82F6" />, title: "Tu choisis ton compte", desc: "Sélectionne la taille de compte VIP. Tu paies l'accès une seule fois." },
  { icon: <TrendingUp size={22} color="#3B82F6" />, title: "L'algorithme trade", desc: "Une stratégie algorithmique professionnelle s'active sur ton compte et passe les deux phases automatiquement." },
  { icon: <Shield size={22} color="#3B82F6" />, title: "Validation automatique", desc: "Une fois les objectifs atteints, ton compte Reward est activé automatiquement. Aucune action requise." },
  { icon: <Clock size={22} color="#3B82F6" />, title: "Récompenses tous les 30 jours", desc: "Les profits sont calculés et versés automatiquement tous les 30 jours sur ton compte Reward." },
];

export default function VipPage() {
  const { lang } = useLanguage();
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <>
      <style>{`
        @property --vip-bg-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes vipBgSpin { to { --vip-bg-angle: 360deg; } }
        @keyframes vipTextFlow {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .vip-hero-text {
          background: linear-gradient(90deg, #1d4ed8 0%, #3B82F6 20%, #ffffff 40%, #EF4444 60%, #1d4ed8 80%, #3B82F6 100%);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: vipTextFlow 3s linear infinite;
        }
        .fade-1 { animation: fadeUp 0.7s ease forwards; }
        .fade-2 { animation: fadeUp 0.7s ease 0.15s forwards; opacity: 0; }
        .fade-3 { animation: fadeUp 0.7s ease 0.3s forwards; opacity: 0; }
        .fade-4 { animation: fadeUp 0.7s ease 0.45s forwards; opacity: 0; }
        .plan-card {
          background: #0a0a0a;
          border: 1.5px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 36px 28px;
          transition: border-color 0.2s, transform 0.2s;
          cursor: default;
          position: relative;
        }
        .plan-card:hover {
          border-color: rgba(59,130,246,0.4);
          transform: translateY(-4px);
        }
        .plan-card.popular {
          border-color: #3B82F6;
          background: linear-gradient(135deg, #0a0a0a 0%, #0d1829 100%);
        }
        .step-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 16px;
          padding: 28px 24px;
        }
        .disclaimer {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px 24px;
          font-size: 12px;
          color: rgba(255,255,255,0.4);
          line-height: 1.7;
        }
      `}</style>

      <main style={{ background: "#000", minHeight: "100vh", paddingTop: "calc(72px + var(--promo-banner-height, 0px) + 80px)", paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 80 }}>
            <div className="fade-1" style={{ display: "inline-block", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 100, padding: "6px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", color: "#3B82F6", textTransform: "uppercase", marginBottom: 24 }}>
              ⚡ Accès Limité
            </div>
            <h1 className="fade-2" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", fontWeight: 900, color: "#fff", lineHeight: 1.05, marginBottom: 24 }}>
              Challenge <span className="vip-hero-text">VIP</span><br />
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.55em", fontWeight: 600 }}>L'algorithme s'occupe de tout</span>
            </h1>
            <p className="fade-3" style={{ fontSize: 17, color: "rgba(255,255,255,0.55)", maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.7 }}>
              Tu paies l'accès une seule fois. Une stratégie algorithmique professionnelle s'active sur ton compte, passe les phases, et les récompenses tombent automatiquement tous les 30 jours.
            </p>
            <div className="fade-4" style={{ display: "flex", gap: 32, justifyContent: "center", flexWrap: "wrap" }}>
              {[["60%", "Pour toi"], ["Automatique", "Validation"], ["30 jours", "Récompenses"], ["2 phases", "Même règles"]].map(([val, lbl]) => (
                <div key={lbl} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#3B82F6" }}>{val}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase" }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Comment ça marche */}
          <div style={{ marginBottom: 80 }}>
            <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 40 }}>Comment ça marche</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              {STEPS.map((s, i) => (
                <div key={i} className="step-card">
                  <div style={{ marginBottom: 16 }}>{s.icon}</div>
                  <div style={{ fontSize: 11, color: "#3B82F6", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>Étape {i + 1}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Plans */}
          <div style={{ marginBottom: 64 }}>
            <h2 style={{ textAlign: "center", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 12 }}>Choisir ton compte VIP</h2>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 14, marginBottom: 40 }}>Accès unique — aucun abonnement</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
              {PLANS.map((p, i) => (
                <div key={i} className={`plan-card${p.popular ? " popular" : ""}`}>
                  {p.popular && (
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", background: "#3B82F6", color: "#fff", fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", padding: "4px 16px", borderRadius: 100 }}>
                      Le Plus Populaire
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "1px" }}>Compte simulé</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 4 }}>{p.size}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#3B82F6", marginBottom: 24 }}>{p.price}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    {p.features.map((f, j) => (
                      <div key={j} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Check size={14} color="#22c55e" style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a href="/login" style={{
                    display: "block", textAlign: "center",
                    background: p.popular ? "#3B82F6" : "rgba(255,255,255,0.08)",
                    color: "#fff", borderRadius: 10, padding: "14px 0",
                    fontWeight: 800, fontSize: 13, letterSpacing: "1px",
                    textTransform: "uppercase", textDecoration: "none",
                    border: p.popular ? "none" : "1px solid rgba(255,255,255,0.15)",
                    transition: "opacity 0.2s",
                  }}>
                    Accéder au Challenge VIP
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer légal */}
          <div className="disclaimer">
            <strong style={{ color: "rgba(255,255,255,0.6)" }}>Avertissement :</strong> Les Challenges VIP Traders Rewards utilisent des comptes de trading simulés. L'algorithme activé opère sur un environnement de démonstration. Aucun capital réel n'est investi. Les récompenses versées proviennent du programme Traders Rewards et ne constituent pas des rendements d'investissement. Ce service est un outil d'entraînement algorithmique dans un cadre éducatif simulé. Les performances passées de l'algorithme ne garantissent pas les résultats futurs. Accès limité — Traders Rewards se réserve le droit de suspendre les nouvelles inscriptions à tout moment.
          </div>

        </div>
      </main>
    </>
  );
}
