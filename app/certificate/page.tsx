"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useEffect } from "react";

const LOGO = "data:image/png;base64,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";

const BODY: Record<string, string> = {
  phase1: `Le trader a réussi la <b>Phase 1 du Challenge Traders Rewards</b> en atteignant les objectifs requis. En maintenant une gestion rigoureuse du risque et en générant les performances attendues, le trader a validé ses compétences et sa discipline. Ce certificat confirme l'accès à la <b>Phase 2</b> du programme.`,
  phase2: `Le trader a réussi la <b>Phase 2 du Challenge Traders Rewards</b>. Après avoir validé la Phase 1, le trader a confirmé sa régularité et sa maîtrise du risque sur une seconde période d'évaluation. Ce certificat atteste la réussite complète du processus de certification et l'accès au statut de <b>Trader Récompensé</b>.`,
  reward: `Le présent certificat atteste le versement d'une <b>récompense de trading</b> accordée par Traders Rewards, en reconnaissance des performances réalisées sur le compte reward. Ce paiement est effectué conformément aux conditions du programme.`,
};

const TITLE: Record<string, { top: string; main: string }> = {
  phase1: { top: "Traders Rewards — Certification", main: "Phase 1" },
  phase2: { top: "Traders Rewards — Certification", main: "Phase 2" },
  reward: { top: "Traders Rewards — Versement", main: "REWARD" },
};

function drawQR(canvas: HTMLCanvasElement, seed: string) {
  const SIZE = 21;
  const cs = canvas.width / SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000";

  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const rng = () => { h ^= h << 13; h ^= h >> 17; h ^= h << 5; return (h >>> 0) / 4294967296; };

  const m: boolean[][] = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

  const finder = (r: number, c: number) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) {
      if (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4)) m[r + i][c + j] = true;
    }
  };
  finder(0, 0); finder(0, 14); finder(14, 0);

  const reserved = new Set<string>();
  for (let i = 0; i < 7; i++) for (let j = 0; j < 8; j++) {
    reserved.add(`${i},${j}`); reserved.add(`${j},${i}`);
    reserved.add(`${i},${SIZE - 1 - j}`); reserved.add(`${j},${SIZE - 1 - i}`);
    reserved.add(`${SIZE - 1 - i},${j}`); reserved.add(`${SIZE - 1 - j},${i}`);
  }

  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) {
    if (!reserved.has(`${i},${j}`)) m[i][j] = rng() > 0.5;
  }

  for (let i = 0; i < SIZE; i++) for (let j = 0; j < SIZE; j++) {
    if (m[i][j]) ctx.fillRect(j * cs, i * cs, cs, cs);
  }
}

function CertContent() {
  const params = useSearchParams();
  const type = (params.get("type") || "phase1") as string;
  const firstname = params.get("firstname") || "";
  const lastname = params.get("lastname") || "";
  const name = firstname || lastname ? `${firstname} ${lastname}`.trim() : (params.get("name") || "Trader");
  const amount = params.get("amount") || "";
  const date = params.get("date") || new Date().toLocaleDateString("fr-FR");
  const id = params.get("id") || name + date;

  const certRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (qrRef.current) drawQR(qrRef.current, id);
  }, [id]);

  const download = async () => {
    if (!certRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(certRef.current, { scale: 3, useCORS: true, backgroundColor: null, logging: false });
    const link = document.createElement("a");
    link.download = `traders-rewards-${type}-${name.replace(/\s+/g, "-")}.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 0.96);
    link.click();
  };

  const cfg = TITLE[type] || TITLE.phase1;
  const body = BODY[type] || BODY.phase1;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <div className="no-print" style={{ position: "fixed", top: 20, right: 20, zIndex: 100, display: "flex", gap: 10 }}>
        <button onClick={download} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
          ↓ Télécharger JPEG
        </button>
        <button onClick={() => window.print()} style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #333", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Imprimer
        </button>
      </div>

      {/* CERTIFICATE */}
      <div ref={certRef} style={{ position: "relative", width: 680, minHeight: 520, background: "#0e0e0e", border: "1px solid #222", padding: "40px 56px 36px", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Corner deco top-right */}
        <svg style={{ position: "absolute", top: 0, right: 0, width: 160, height: 160, pointerEvents: "none" }} viewBox="0 0 160 160" fill="none">
          <polygon points="160,0 160,160 0,0" fill="#3b82f608"/>
          <polygon points="160,0 160,100 60,0" fill="#3b82f618"/>
          <polygon points="160,0 160,55 105,0" fill="#3b82f630"/>
          <line x1="0" y1="0" x2="160" y2="160" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
          <line x1="55" y1="0" x2="160" y2="105" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
          <line x1="105" y1="0" x2="160" y2="55" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
        </svg>

        {/* Corner deco bottom-left */}
        <svg style={{ position: "absolute", bottom: 0, left: 0, width: 90, height: 90, opacity: 0.3, pointerEvents: "none" }} viewBox="0 0 90 90" fill="none">
          <polygon points="0,90 90,90 0,0" fill="#3b82f612"/>
          <line x1="0" y1="0" x2="90" y2="90" stroke="#3b82f6" strokeWidth="0.5" opacity="0.5"/>
        </svg>

        {/* TOP ROW */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#3b82f6", marginBottom: 6 }}>{cfg.top}</div>
            <div style={{ fontSize: 50, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.01em", textTransform: "uppercase", color: "#fff" }}>{cfg.main}</div>
          </div>
          <img src={LOGO} alt="Traders Rewards" style={{ width: 211, height: 141, objectFit: "contain", flexShrink: 0 }} />
        </div>

        {/* DIVIDER */}
        <div style={{ height: 1, background: "linear-gradient(to right, #3b82f640, #3b82f6, #3b82f640)", marginBottom: 24, flexShrink: 0 }} />

        {/* BODY */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.01em", marginBottom: 14, lineHeight: 1 }}>{name}</div>
          <div style={{ fontSize: 13, lineHeight: 1.72, color: "#999", maxWidth: 500 }} dangerouslySetInnerHTML={{ __html: body.replace(/<b>/g, '<strong style="color:#ccc;font-weight:600">').replace(/<\/b>/g, "</strong>") }} />
          {type === "reward" && amount && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 18, padding: "13px 22px", flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#555", whiteSpace: "nowrap" }}>Montant versé</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{amount}</div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: 12, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>{date}</div>
          </div>
          <canvas ref={qrRef} width={82} height={82} style={{ imageRendering: "pixelated" }} />
        </div>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { background: #050505 !important; margin: 0; } }`}</style>
    </div>
  );
}

export default function CertificatePage() {
  return (
    <Suspense>
      <CertContent />
    </Suspense>
  );
}
