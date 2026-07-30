"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useEffect, useState } from "react";

const BODY: Record<string, string> = {
  phase1: `Le trader a réussi la <b>Phase 1 du Challenge Traders Rewards</b> en atteignant les objectifs requis. En maintenant une gestion rigoureuse du risque et en générant les performances attendues, le trader a validé ses compétences et sa discipline. Ce certificat confirme l'accès à la <b>Phase 2</b> du programme.`,
  phase2: `Le trader a réussi la <b>Phase 2 du Challenge Traders Rewards</b>. Après avoir validé la Phase 1, le trader a confirmé sa régularité et sa maîtrise du risque sur une seconde période d'évaluation. Ce certificat atteste la réussite complète du processus de certification et l'accès au statut de <b>Trader Récompensé</b>.`,
  challenge: `Le trader a réussi la <b>Phase 2 du Challenge Traders Rewards</b>. Après avoir validé la Phase 1, le trader a confirmé sa régularité et sa maîtrise du risque sur une seconde période d'évaluation. Ce certificat atteste la réussite complète du processus de certification et l'accès au statut de <b>Trader Récompensé</b>.`,
  reward: `Le présent certificat atteste le versement d'une <b>récompense de trading</b> accordée par Traders Rewards, en reconnaissance des performances réalisées sur le compte reward. Ce paiement est effectué conformément aux conditions du programme.`,
};

const TITLE: Record<string, { top: string; main: string }> = {
  phase1:    { top: "Traders Rewards — Certification", main: "Phase 1" },
  phase2:    { top: "Traders Rewards — Certification", main: "Phase 2" },
  challenge: { top: "Traders Rewards — Certification", main: "Phase 2" },
  reward:    { top: "Traders Rewards — Versement",     main: "REWARD"  },
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
  const type = params.get("type") || "phase1";
  const firstname = params.get("firstname") || "";
  const lastname = params.get("lastname") || "";
  const name = firstname || lastname ? `${firstname} ${lastname}`.trim() : (params.get("name") || "Trader");
  const amount = params.get("amount") || "";
  const date = params.get("date") || new Date().toLocaleDateString("fr-FR");
  const id = params.get("id") || name + date;

  const certRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("/logo-blanc-transparent.png");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => { if (qrRef.current) drawQR(qrRef.current, id); }, [id]);

  useEffect(() => {
    fetch("/logo-blanc-transparent.png")
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }))
      .then(setLogoDataUrl)
      .catch(() => {});
  }, []);

  const download = async () => {
    if (!certRef.current || downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0e0e0e",
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `traders-rewards-${type}-${name.replace(/\s+/g, "-")}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.96);
      link.click();
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const cfg = TITLE[type] || TITLE.phase1;
  const body = BODY[type] || BODY.phase1;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <div className="no-print" style={{ position: "fixed", top: 20, right: 20, zIndex: 100, display: "flex", gap: 10 }}>
        <button onClick={download} disabled={downloading} style={{ background: downloading ? "#1d4ed8" : "#3b82f6", color: "#fff", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 800, cursor: downloading ? "wait" : "pointer", opacity: downloading ? 0.8 : 1 }}>
          {downloading ? "⏳ En cours…" : "↓ Télécharger JPEG"}
        </button>
        <button onClick={() => window.print()} style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #333", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Imprimer
        </button>
      </div>

      <div ref={certRef} style={{ position: "relative", width: 680, minHeight: 520, background: "#0e0e0e", border: "1px solid #222", padding: "40px 56px 36px", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Decorations — derrière tout le contenu */}
        <svg style={{ position: "absolute", top: 0, right: 0, width: 160, height: 160, pointerEvents: "none", zIndex: 0 }} viewBox="0 0 160 160" fill="none">
          <polygon points="160,0 160,160 0,0" fill="#3b82f608"/>
          <polygon points="160,0 160,100 60,0" fill="#3b82f618"/>
          <polygon points="160,0 160,55 105,0" fill="#3b82f630"/>
          <line x1="0" y1="0" x2="160" y2="160" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
          <line x1="55" y1="0" x2="160" y2="105" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
          <line x1="105" y1="0" x2="160" y2="55" stroke="#3b82f6" strokeWidth="0.5" opacity="0.3"/>
        </svg>
        <svg style={{ position: "absolute", bottom: 0, left: 0, width: 90, height: 90, opacity: 0.3, pointerEvents: "none", zIndex: 0 }} viewBox="0 0 90 90" fill="none">
          <polygon points="0,90 90,90 0,0" fill="#3b82f612"/>
          <line x1="0" y1="0" x2="90" y2="90" stroke="#3b82f6" strokeWidth="0.5" opacity="0.5"/>
        </svg>

        {/* TOP ROW */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#3b82f6", marginBottom: 6 }}>{cfg.top}</div>
            <div style={{ fontSize: 50, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.01em", textTransform: "uppercase", color: "#fff" }}>{cfg.main}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUrl} alt="Traders Rewards" style={{ width: 211, height: 141, objectFit: "contain", flexShrink: 0 }} />
        </div>

        {/* DIVIDER */}
        <div style={{ position: "relative", zIndex: 1, height: 1, background: "linear-gradient(to right, #3b82f640, #3b82f6, #3b82f640)", marginBottom: 24, flexShrink: 0 }} />

        {/* BODY */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#3b82f6", letterSpacing: "0.01em", marginBottom: 14, lineHeight: 1 }}>{name}</div>
          <div style={{ fontSize: 13, lineHeight: 1.72, color: "#999", maxWidth: 500 }} dangerouslySetInnerHTML={{ __html: body.replace(/<b>/g, '<strong style="color:#ccc;font-weight:600">').replace(/<\/b>/g, "</strong>") }} />
          {(type === "reward") && amount && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 18, flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#555", whiteSpace: "nowrap" }}>Montant versé</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" }}>{amount}</div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "0.03em" }}>{date}</div>
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
