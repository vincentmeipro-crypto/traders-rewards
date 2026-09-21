"use client";
import { useState, useRef, useEffect } from "react";
import { useConsent } from "@/lib/ConsentContext";
import CookieSettingsModal from "./CookieSettingsModal";

export default function CookieBanner() {
  const { hasSeenBanner, setHasSeenBanner, acceptAll, rejectAll } = useConsent();
  const [showSettings, setShowSettings] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Measure height and expose via CSS variable
  useEffect(() => {
    if (!bannerRef.current) return;

    const updateHeight = () => {
      if (bannerRef.current) {
        const height = bannerRef.current.getBoundingClientRect().height;
        document.documentElement.style.setProperty("--cookie-banner-height", `${height}px`);
      }
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(bannerRef.current);

    return () => {
      resizeObserver.disconnect();
      document.documentElement.style.removeProperty("--cookie-banner-height");
    };
  }, []);

  if (hasSeenBanner) return null;

  return (
    <>
      {/* Cookie Banner */}
      <div
        ref={bannerRef}
        role="region"
        aria-label="Cookie consent banner"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: "#000000",
          borderTop: "1px solid rgba(212,168,67,0.25)",
          padding: "24px",
          boxSizing: "border-box",
          maxHeight: "40vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: "24px",
            alignItems: "end",
          }}
          className="cookie-banner-grid"
        >
          {/* Text content */}
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "#FFFFFF",
                margin: "0 0 8px 0",
                letterSpacing: "0.5px",
              }}
            >
              Votre confidentialité
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.72)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Nous utilisons des technologies nécessaires au fonctionnement et à la sécurité
              de Traders Rewards. Avec votre accord, nous pouvons également utiliser des outils
              de mesure d'audience et de publicité.
            </p>
          </div>

          {/* Buttons */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexShrink: 0,
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
            className="cookie-buttons"
          >
            <button
              onClick={() => rejectAll()}
              style={{
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1px solid rgba(212,168,67,0.40)",
                backgroundColor: "transparent",
                color: "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.5px",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(212,168,67,0.70)";
                el.style.backgroundColor = "rgba(212,168,67,0.05)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(212,168,67,0.40)";
                el.style.backgroundColor = "transparent";
              }}
            >
              Tout refuser
            </button>

            <button
              onClick={() => setShowSettings(true)}
              style={{
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 600,
                borderRadius: "8px",
                border: "1px solid rgba(212,168,67,0.60)",
                backgroundColor: "rgba(212,168,67,0.08)",
                color: "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.5px",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(212,168,67,0.85)";
                el.style.backgroundColor = "rgba(212,168,67,0.14)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.borderColor = "rgba(212,168,67,0.60)";
                el.style.backgroundColor = "rgba(212,168,67,0.08)";
              }}
            >
              Personnaliser
            </button>

            <button
              onClick={() => acceptAll()}
              style={{
                padding: "10px 20px",
                fontSize: "13px",
                fontWeight: 700,
                borderRadius: "8px",
                border: "1px solid rgba(212,168,67,0.80)",
                background: "linear-gradient(110deg, #B88746 0%, #D6AD63 25%, #F2D79A 52%, #C6964D 78%, #E6C57E 100%)",
                color: "#111111",
                cursor: "pointer",
                transition: "all 0.2s ease",
                letterSpacing: "0.5px",
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
              Tout accepter
            </button>
          </div>
        </div>
      </div>

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 768px) {
          .cookie-banner-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .cookie-buttons {
            justify-content: stretch !important;
          }
          .cookie-buttons button {
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }
        }
      `}</style>

      {/* CookieSettings Modal */}
      <CookieSettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </>
  );
}
