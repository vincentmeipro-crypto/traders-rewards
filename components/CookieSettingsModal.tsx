"use client";
import { useState } from "react";
import { useConsent } from "@/lib/ConsentContext";

interface CookieSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CookieSettingsModal({ isOpen, onClose }: CookieSettingsModalProps) {
  const { consent, updateCategory, setHasSeenBanner } = useConsent();
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [advertising, setAdvertising] = useState(consent.advertising);

  if (!isOpen) return null;

  const handleSave = () => {
    updateCategory("analytics", analytics);
    updateCategory("advertising", advertising);
    setHasSeenBanner(true);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.60)",
          zIndex: 10000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10001,
          backgroundColor: "#000000",
          borderRadius: "16px",
          border: "1px solid rgba(212,168,67,0.30)",
          padding: "40px",
          maxWidth: "500px",
          width: "90vw",
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.80)",
        }}
      >
        {/* Header */}
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "#FFFFFF",
            margin: "0 0 24px 0",
            letterSpacing: "-0.5px",
          }}
        >
          Préférences de confidentialité
        </h2>

        {/* Category: Nécessaires */}
        <div
          style={{
            marginBottom: "28px",
            paddingBottom: "24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#FFFFFF",
                margin: 0,
              }}
            >
              Nécessaires
            </h3>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "#D4A843",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Toujours actifs
            </span>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.55)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Indispensables à l'authentification, la sécurité et au fonctionnement du site.
          </p>
        </div>

        {/* Category: Mesure d'audience */}
        <div
          style={{
            marginBottom: "28px",
            paddingBottom: "24px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#FFFFFF",
                margin: 0,
              }}
            >
              Mesure d'audience
            </h3>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                style={{
                  cursor: "pointer",
                  width: "20px",
                  height: "20px",
                  accentColor: "#D4A843",
                }}
              />
            </label>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.55)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Nous aide à comprendre l'utilisation du site et à améliorer l'expérience.
          </p>
        </div>

        {/* Category: Publicité */}
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <h3
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: "#FFFFFF",
                margin: 0,
              }}
            >
              Publicité
            </h3>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={advertising}
                onChange={(e) => setAdvertising(e.target.checked)}
                style={{
                  cursor: "pointer",
                  width: "20px",
                  height: "20px",
                  accentColor: "#D4A843",
                }}
              />
            </label>
          </div>
          <p
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.55)",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Permet de mesurer nos campagnes et de proposer des communications adaptées.
          </p>
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          style={{
            width: "100%",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 700,
            borderRadius: "10px",
            border: "1px solid rgba(212,168,67,0.80)",
            background: "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)",
            color: "#111111",
            cursor: "pointer",
            transition: "all 0.2s ease",
            letterSpacing: "0.5px",
            marginTop: "16px",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.boxShadow = "0 6px 22px rgba(212,168,67,0.25)";
            el.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.boxShadow = "none";
            el.style.transform = "translateY(0)";
          }}
        >
          Enregistrer mes choix
        </button>
      </div>
    </>
  );
}
