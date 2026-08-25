"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useRef, useEffect, useState, type ReactNode } from "react";

// ── BodySegments ──────────────────────────────────────────────────────────────
// Parse <b>…</b> en éléments React — aucun dangerouslySetInnerHTML.
// Le résultat visuel est identique à l'ancien innerHTML.
import QRCode from "qrcode";

const TROPHY_SRC = "/NOUVELLE%20IMAGE%20HERO%20AVEC%20TROPHE.png";

function BodySegments({ html }: { html: string }): ReactNode {
  const parts = html.split(/(<b>[^<]*<\/b>)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("<b>") && part.endsWith("</b>") ? (
          <strong key={i} style={{ color: "#ccc", fontWeight: 600 }}>
            {part.slice(3, -4)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

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

function CertContent() {
  const params = useSearchParams();
  const type = params.get("type") || "phase1";
  const firstname = params.get("firstname") || "";
  const lastname = params.get("lastname") || "";
  const name = firstname || lastname ? `${firstname} ${lastname}`.trim() : (params.get("name") || "Trader");
  const amount = params.get("amount") || "";
  const date = params.get("date") || new Date().toLocaleDateString("fr-FR");
  const token = params.get("token") || "";

  const certRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<HTMLCanvasElement>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string>("/logo-blanc-transparent.png");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!qrRef.current || !/^[0-9a-f]{32}$/.test(token)) return;
    const verificationUrl = `${window.location.origin}/verify/${token}?source=qr`;
    QRCode.toCanvas(qrRef.current, verificationUrl, {
      width: 82,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).catch((error) => console.error("QR generation error:", error));
  }, [token]);

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
    if (downloading) return;
    setDownloading(true);
    try {
      const W = 680, H = 520, S = 3;
      const cv = document.createElement("canvas");
      cv.width = W * S; cv.height = H * S;
      const ctx = cv.getContext("2d")!;
      ctx.scale(S, S);

      // Background
      ctx.fillStyle = "#0e0e0e";
      ctx.fillRect(0, 0, W, H);

      // Top-right triangle decorations
      const tri = (pts: [number,number][], color: string) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
        ctx.closePath(); ctx.fill();
      };
      tri([[W,0],[W,160],[W-160,0]], "rgba(156,207,234,0.03)");
      tri([[W,0],[W,100],[W-100,0]], "rgba(156,207,234,0.09)");
      tri([[W,0],[W, 55],[W- 55,0]], "rgba(156,207,234,0.18)");
      // Diagonal line top-right
      ctx.strokeStyle = "rgba(156,207,234,0.3)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W-160,160); ctx.stroke();
      // Bottom-left triangle
      tri([[0,H],[90,H],[0,H-90]], "rgba(156,207,234,0.07)");

      // Trophée de marque — le mode screen fond son arrière-plan noir dans le certificat.
      const trophy = new Image();
      await new Promise<void>(resolve => {
        trophy.onload = () => resolve();
        trophy.onerror = () => resolve();
        trophy.src = TROPHY_SRC;
      });
      if (trophy.naturalWidth > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = type === "reward" ? 0.82 : type === "phase2" || type === "challenge" ? 0.72 : 0.62;
        ctx.drawImage(
          trophy,
          trophy.naturalWidth * 0.48, trophy.naturalHeight * 0.06,
          trophy.naturalWidth * 0.50, trophy.naturalHeight * 0.88,
          405, 145, 235, 275,
        );
        ctx.restore();
      }

      // Top label
      ctx.fillStyle = "#9CCFEA";
      ctx.font = "700 11px 'Segoe UI',system-ui,sans-serif";
      ctx.fillText(cfg.top.toUpperCase(), 56, 54);

      // Main title
      ctx.fillStyle = "#ffffff";
      ctx.font = "900 50px 'Segoe UI',system-ui,sans-serif";
      ctx.fillText(cfg.main, 56, 110);

      // Logo
      if (logoDataUrl) {
        const img = new Image();
        await new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); img.src = logoDataUrl; });
        ctx.drawImage(img, W - 56 - 211, 30, 211, 141);
      }

      // Divider (y = 40 + 141 logo + 28 gap = 209)
      const divY = 209;
      const grd = ctx.createLinearGradient(56, 0, W-56, 0);
      grd.addColorStop(0, "rgba(156,207,234,0.25)"); grd.addColorStop(0.5, "#9CCFEA"); grd.addColorStop(1, "rgba(156,207,234,0.25)");
      ctx.fillStyle = grd; ctx.fillRect(56, divY, W-112, 1);

      // Trader name
      ctx.fillStyle = "#9CCFEA";
      ctx.font = "700 30px 'Segoe UI',system-ui,sans-serif";
      ctx.fillText(name, 56, divY + 40);

      // Body text with inline bold (parse <b> tags)
      type Seg = {text: string; bold: boolean};
      const segs: Seg[] = [];
      let rem = body;
      while (rem.length) {
        const bs = rem.indexOf("<b>");
        if (bs === -1) { segs.push({text: rem, bold: false}); break; }
        if (bs > 0) segs.push({text: rem.slice(0, bs), bold: false});
        const be = rem.indexOf("</b>", bs);
        if (be === -1) { segs.push({text: rem.slice(bs+3), bold: true}); break; }
        segs.push({text: rem.slice(bs+3, be), bold: true});
        rem = rem.slice(be+4);
      }
      const words: Seg[] = segs.flatMap(s => s.text.split(/(\s+)/).filter(Boolean).map(t => ({text:t,bold:s.bold})));

      const getW = (w: Seg) => { ctx.font = w.bold ? "600 13px 'Segoe UI',sans-serif" : "13px 'Segoe UI',sans-serif"; return ctx.measureText(w.text).width; };
      let lWords: Seg[] = [], lW = 0, ty = divY + 68;
      const flushL = () => {
        let lx = 56;
        lWords.forEach(w => { ctx.font = w.bold ? "600 13px 'Segoe UI',sans-serif" : "13px 'Segoe UI',sans-serif"; ctx.fillStyle = w.bold ? "#cccccc" : "#999999"; ctx.fillText(w.text, lx, ty); lx += ctx.measureText(w.text).width; });
        ty += 22; lWords = []; lW = 0;
      };
      for (const w of words) {
        if (/^\s+$/.test(w.text)) { if (lWords.length) { lWords.push(w); lW += getW(w); } continue; }
        const ww = getW(w);
        if (lW + ww > 350 && lWords.length) flushL();
        lWords.push(w); lW += ww;
      }
      if (lWords.length) flushL();

      // Amount block (reward only)
      if (type === "reward" && amount) {
        ctx.fillStyle = "#555"; ctx.font = "700 9px 'Segoe UI',sans-serif";
        ctx.fillText("MONTANT VERSÉ", 56, ty + 14);
        ctx.fillStyle = "#fff"; ctx.font = "900 32px 'Segoe UI',sans-serif";
        ctx.fillText(amount, 56 + 115, ty + 18);
      }

      // Footer
      ctx.fillStyle = "#ffffff"; ctx.font = "700 16px 'Segoe UI',sans-serif";
      ctx.fillText(date, 56, H - 36);

      // QR code (copy from existing canvas — same origin, never tainted)
      if (qrRef.current) ctx.drawImage(qrRef.current, W - 56 - 82, H - 36 - 82, 82, 82);

      const link = document.createElement("a");
      link.download = `traders-rewards-${type}-${name.replace(/\s+/g, "-")}.jpg`;
      link.href = cv.toDataURL("image/jpeg", 0.96);
      link.click();
    } catch (e) {
      console.error("Certificate download error:", e);
      alert("Erreur: " + String(e));
    } finally {
      setDownloading(false);
    }
  };

  const cfg = TITLE[type] || TITLE.phase1;
  const body = BODY[type] || BODY.phase1;

  return (
    <div style={{ minHeight: "100vh", background: "#050505", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      <div className="no-print" style={{ position: "fixed", top: 20, right: 20, zIndex: 100, display: "flex", gap: 10 }}>
        <button onClick={download} disabled={downloading} style={{ background: downloading ? "#1d4ed8" : "#9CCFEA", color: downloading ? "#fff" : "#000", border: "none", borderRadius: 8, padding: "10px 22px", fontSize: 13, fontWeight: 800, cursor: downloading ? "wait" : "pointer", opacity: downloading ? 0.8 : 1 }}>
          {downloading ? "⏳ En cours…" : "↓ Télécharger JPEG"}
        </button>
        <button onClick={() => window.print()} style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #333", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
          Imprimer
        </button>
      </div>

      <div ref={certRef} style={{ position: "relative", width: 680, minHeight: 520, background: "#0e0e0e", border: "1px solid #222", padding: "40px 56px 36px", display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Decorations — derrière tout le contenu */}
        <svg style={{ position: "absolute", top: 0, right: 0, width: 160, height: 160, pointerEvents: "none", zIndex: 0 }} viewBox="0 0 160 160" fill="none">
          <polygon points="160,0 160,160 0,0" fill="#9CCFEA08"/>
          <polygon points="160,0 160,100 60,0" fill="#9CCFEA18"/>
          <polygon points="160,0 160,55 105,0" fill="#9CCFEA30"/>
          <line x1="0" y1="0" x2="160" y2="160" stroke="#9CCFEA" strokeWidth="0.5" opacity="0.3"/>
          <line x1="55" y1="0" x2="160" y2="105" stroke="#9CCFEA" strokeWidth="0.5" opacity="0.3"/>
          <line x1="105" y1="0" x2="160" y2="55" stroke="#9CCFEA" strokeWidth="0.5" opacity="0.3"/>
        </svg>
        <svg style={{ position: "absolute", bottom: 0, left: 0, width: 90, height: 90, opacity: 0.3, pointerEvents: "none", zIndex: 0 }} viewBox="0 0 90 90" fill="none">
          <polygon points="0,90 90,90 0,0" fill="#9CCFEA12"/>
          <line x1="0" y1="0" x2="90" y2="90" stroke="#9CCFEA" strokeWidth="0.5" opacity="0.5"/>
        </svg>

        {/* Trophée signature — le fond noir disparaît grâce au mode screen. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={TROPHY_SRC}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute", top: 145, right: 18, zIndex: 0,
            width: 235, height: 275, objectFit: "cover", objectPosition: "right center",
            opacity: type === "reward" ? 0.82 : type === "phase2" || type === "challenge" ? 0.72 : 0.62,
            mixBlendMode: "screen", pointerEvents: "none",
            filter: "contrast(1.06) saturate(1.08)",
            maskImage: "linear-gradient(to bottom, transparent 0%, #000 10%, #000 84%, transparent 100%)",
          }}
        />

        {/* TOP ROW */}
        <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#9CCFEA", marginBottom: 6 }}>{cfg.top}</div>
            <div style={{ fontSize: 50, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.01em", textTransform: "uppercase", color: "#fff" }}>{cfg.main}</div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoDataUrl} alt="Traders Rewards" style={{ width: 211, height: 141, objectFit: "contain", flexShrink: 0 }} />
        </div>

        {/* DIVIDER */}
        <div style={{ position: "relative", zIndex: 1, height: 1, background: "linear-gradient(to right, #9CCFEA40, #9CCFEA, #9CCFEA40)", marginBottom: 24, flexShrink: 0 }} />

        {/* BODY */}
        <div style={{ position: "relative", zIndex: 1, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#9CCFEA", letterSpacing: "0.01em", marginBottom: 14, lineHeight: 1 }}>{name}</div>
          <div style={{ fontSize: 13, lineHeight: 1.72, color: "#999", maxWidth: 350 }}>
            <BodySegments html={body} />
          </div>
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
