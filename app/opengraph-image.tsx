import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Traders Rewards — Propfirm Française | Challenge Trading";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          background: "#0A0A0A",
          fontFamily: "system-ui, sans-serif",
          padding: "0 80px",
          gap: 80,
        }}
      >
        {/* GAUCHE — Titre principal */}
        <div style={{ flex: "1 1 0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 80, fontWeight: 900, color: "#FFFFFF", lineHeight: 1.05, letterSpacing: "-2px" }}>
            Transformez votre trading démo en
          </div>
          <div style={{ fontSize: 80, fontWeight: 900, color: "#9A7B2F", lineHeight: 1.05, letterSpacing: "-2px", marginTop: 8 }}>
            vraies récompenses
          </div>
        </div>

        {/* Séparateur vertical */}
        <div style={{ width: 1, background: "rgba(255,255,255,0.12)", alignSelf: "stretch", margin: "60px 0", display: "flex" }} />

        {/* DROITE — Tagline tricolore */}
        <div style={{ flex: "0 0 420px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.3 }}>
            <span>La propfirm </span>
            <span style={{ color: "#002395", fontWeight: 900 }}>FRA</span>
            <span style={{ color: "#FFFFFF", fontWeight: 900 }}>NÇA</span>
            <span style={{ color: "#ED2939", fontWeight: 900 }}>ISE</span>
            <span> qui récompense les </span>
            <span style={{ color: "#9A7B2F" }}>traders disciplinés</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
