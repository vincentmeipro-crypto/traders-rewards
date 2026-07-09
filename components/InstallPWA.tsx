"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";

const STEP_DURATION = 2200;

const steps = {
  fr: [
    { label: "Ouvre le site dans\nton navigateur mobile", sub: "Safari (iOS) ou Chrome (Android)" },
    { label: "Appuie sur le bouton\nPartager / Menu", sub: "En bas (iOS) ou en haut à droite (Android)" },
    { label: "Sélectionne\n\"Ajouter à l'écran d'accueil\"", sub: "Puis confirme" },
    { label: "L'app est installée ✓", sub: "Lance-la depuis ton écran d'accueil" },
  ],
  es: [
    { label: "Abre el sitio en\ntu navegador móvil", sub: "Safari (iOS) o Chrome (Android)" },
    { label: "Pulsa el botón\nCompartir / Menú", sub: "Abajo (iOS) o arriba a la derecha (Android)" },
    { label: "Selecciona\n\"Añadir a pantalla de inicio\"", sub: "Luego confirma" },
    { label: "App instalada ✓", sub: "Ábrela desde tu pantalla de inicio" },
  ],
  en: [
    { label: "Open the site in\nyour mobile browser", sub: "Safari (iOS) or Chrome (Android)" },
    { label: "Tap the Share / Menu\nbutton", sub: "Bottom (iOS) or top right (Android)" },
    { label: "Select\n\"Add to Home Screen\"", sub: "Then confirm" },
    { label: "App installed ✓", sub: "Launch it from your home screen" },
  ],
};

function PhoneScreen({ step }: { step: number }) {
  return (
    <div style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 20, overflow: "hidden", position: "relative", display: "flex", flexDirection: "column" }}>
      {/* Status bar */}
      <div style={{ height: 24, background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", flexShrink: 0 }}>
        <span style={{ fontSize: 9, color: "#555", fontWeight: 600 }}>9:41</span>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 9, color: "#555" }}>●●●●</span>
          <span style={{ fontSize: 9, color: "#555" }}>WiFi</span>
          <span style={{ fontSize: 9, color: "#555" }}>🔋</span>
        </div>
      </div>

      {step === 0 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Browser bar */}
          <div style={{ background: "#f0f0f0", padding: "6px 8px", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 8, color: "#1565C0", fontWeight: 700, border: "1px solid #ddd" }}>
              traders-rewards.eu
            </div>
          </div>
          {/* Site preview */}
          <div style={{ flex: 1, background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#0D1B3E", textAlign: "center", letterSpacing: 1 }}>TRADERS REWARDS</div>
            <div style={{ width: 60, height: 2, background: "#60A5FA", borderRadius: 2 }} />
            <div style={{ fontSize: 7, color: "#0D1B3E", textAlign: "center", opacity: 0.7 }}>Performez votre Trading Demo</div>
            <div style={{ marginTop: 4, background: "#1565C0", borderRadius: 8, padding: "4px 10px" }}>
              <span style={{ fontSize: 7, color: "#fff", fontWeight: 700 }}>COMMENCER →</span>
            </div>
          </div>
          {/* iOS bottom bar */}
          <div style={{ height: 32, background: "#f8f8f8", borderTop: "1px solid #e0e0e0", display: "flex", alignItems: "center", justifyContent: "space-around", padding: "0 8px" }}>
            <span style={{ fontSize: 14 }}>←</span>
            <span style={{ fontSize: 14 }}>→</span>
            <div style={{ width: 18, height: 18, border: "2px solid #1565C0", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 8, color: "#1565C0", fontWeight: 700 }}>↑</span>
            </div>
            <span style={{ fontSize: 14 }}>⊡</span>
            <span style={{ fontSize: 14 }}>⋯</span>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ background: "#f0f0f0", padding: "6px 8px", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ flex: 1, background: "#fff", borderRadius: 8, padding: "4px 8px", fontSize: 8, color: "#1565C0", fontWeight: 700, border: "1px solid #ddd" }}>
              traders-rewards.eu
            </div>
          </div>
          <div style={{ flex: 1, background: "#f8fafc", opacity: 0.4 }} />
          {/* Share sheet */}
          <div style={{ background: "#f2f2f7", borderRadius: "16px 16px 0 0", padding: "12px 8px 6px", boxShadow: "0 -4px 20px rgba(0,0,0,0.15)" }}>
            <div style={{ width: 36, height: 4, background: "#ccc", borderRadius: 2, margin: "0 auto 10px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
              {["Messages", "Mail", "Notes", "Plus"].map(a => (
                <div key={a} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                    {a === "Messages" ? "💬" : a === "Mail" ? "✉️" : a === "Notes" ? "📝" : "···"}
                  </div>
                  <span style={{ fontSize: 7, color: "#333" }}>{a}</span>
                </div>
              ))}
            </div>
            {/* Highlighted option */}
            <div style={{ background: "#fff", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#1565C0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 13 }}>+</span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#1565C0" }}>Ajouter à l'écran d'accueil</span>
              </div>
              <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: "#e0e0e0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 13 }}>🔖</span>
                </div>
                <span style={{ fontSize: 9, color: "#666" }}>Ajouter aux signets</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", gap: 0 }}>
          <div style={{ background: "#fff", borderRadius: 14, width: "85%", overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <div style={{ padding: "14px 12px 8px", borderBottom: "1px solid #eee", textAlign: "center" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #1565C0, #0D1B3E)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px" }}>
                <span style={{ color: "#60A5FA", fontSize: 16, fontWeight: 800 }}>TR</span>
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#0D1B3E" }}>Traders Rewards</div>
              <div style={{ fontSize: 8, color: "#888", marginTop: 2 }}>traders-rewards.eu</div>
            </div>
            <div style={{ padding: "8px", display: "flex", gap: 6 }}>
              <button style={{ flex: 1, padding: "7px", background: "#f0f0f0", border: "none", borderRadius: 8, fontSize: 10, color: "#666", fontWeight: 600 }}>Annuler</button>
              <button style={{ flex: 1, padding: "7px", background: "#1565C0", border: "none", borderRadius: 8, fontSize: 10, color: "#fff", fontWeight: 700 }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Home screen */}
          <div style={{ flex: 1, background: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)", padding: 12, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginTop: 8 }}>
              {["📸","📱","🎵","🗺️","📧","📅","🕐","⚙️","📷","🎮","💰","📊"].map((e, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{e}</div>
                  <span style={{ fontSize: 6, color: "rgba(255,255,255,0.6)" }}>App</span>
                </div>
              ))}
            </div>
            {/* New app highlighted */}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, paddingLeft: 4 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #1565C0, #0D1B3E)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 3px #60A5FA, 0 4px 12px rgba(197,164,76,0.4)" }}>
                <span style={{ color: "#60A5FA", fontSize: 14, fontWeight: 900 }}>TR</span>
              </div>
              <span style={{ fontSize: 7, color: "#fff", fontWeight: 700 }}>Traders</span>
              <span style={{ fontSize: 7, color: "#fff", fontWeight: 700 }}>Rewards</span>
            </div>
            <div style={{ marginTop: "auto", textAlign: "center" }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <div style={{ fontSize: 8, color: "#60A5FA", fontWeight: 700, marginTop: 2 }}>Installé !</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InstallPWA() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const stepsData = isFr ? steps.fr : isEs ? steps.es : steps.en;
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let start: number | null = null;
    let raf: number;

    function tick(ts: number) {
      if (!start) start = ts;
      const elapsed = ts - start;
      const pct = Math.min((elapsed / STEP_DURATION) * 100, 100);
      setProgress(pct);
      if (elapsed < STEP_DURATION) {
        raf = requestAnimationFrame(tick);
      } else {
        setCurrent(c => (c + 1) % 4);
        start = null;
        setProgress(0);
        raf = requestAnimationFrame(tick);
      }
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const title = L("Installer l'app sur votre téléphone","Instala la app en tu teléfono","Install the app on your phone");
  const sub = L("Accédez à Traders Rewards depuis votre écran d'accueil — sans passer par les stores.","Accede a Traders Rewards desde tu pantalla de inicio — sin pasar por las tiendas.","Access Traders Rewards from your home screen — no app store needed.");

  return (
    <section style={{ background: "#000000", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#3B82F6", marginBottom: 16 }}>
        {L("Application Mobile","Aplicación Móvil","Mobile App")}
      </div>
      <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.5px", marginBottom: 12 }}>
        {title}
      </h2>
      <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, maxWidth: 700, margin: "0 auto 48px" }}>{sub}</p>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32, maxWidth: 420, margin: "0 auto" }}>
        {/* Phone mockup */}
        <div style={{ position: "relative", width: 200, height: 400 }}>
          {/* Phone outer frame */}
          <div style={{
            position: "absolute", inset: 0,
            background: "#0D1B3E",
            borderRadius: 36,
            boxShadow: "0 20px 60px rgba(13,27,62,0.3), inset 0 0 0 2px rgba(255,255,255,0.08)",
          }} />
          {/* Side buttons */}
          <div style={{ position: "absolute", right: -3, top: 80, width: 3, height: 40, background: "#1a2a4a", borderRadius: "0 2px 2px 0" }} />
          <div style={{ position: "absolute", left: -3, top: 70, width: 3, height: 25, background: "#1a2a4a", borderRadius: "2px 0 0 2px" }} />
          <div style={{ position: "absolute", left: -3, top: 105, width: 3, height: 25, background: "#1a2a4a", borderRadius: "2px 0 0 2px" }} />
          {/* Screen area */}
          <div style={{
            position: "absolute", top: 10, left: 10, right: 10, bottom: 10,
            borderRadius: 28,
            overflow: "hidden",
            background: "#000",
          }}>
            {/* Notch */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 60, height: 18, background: "#0D1B3E", borderRadius: "0 0 12px 12px", zIndex: 10 }} />
            <PhoneScreen step={current} />
          </div>
        </div>

        {/* Step indicators */}
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{
              width: i === current ? 28 : 8,
              height: 8,
              borderRadius: 4,
              background: i === current ? "#3B82F6" : "rgba(255,255,255,0.12)",
              transition: "all 0.4s ease",
              overflow: "hidden",
              position: "relative",
            }}>
              {i === current && (
                <div style={{
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  width: `${progress}%`,
                  background: "rgba(255,255,255,0.5)",
                  borderRadius: 4,
                  transition: "width 0.1s linear",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step text */}
        <div style={{ minHeight: 70, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#3B82F6", color: "#000", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {current + 1}
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", margin: 0, textAlign: "left", whiteSpace: "pre-line" }}>
              {stepsData[current].label}
            </p>
          </div>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 }}>
            {stepsData[current].sub}
          </p>
        </div>
      </div>
    </section>
  );
}
