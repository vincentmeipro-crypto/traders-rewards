"use client";

// ════════════════════════════════════════════════════════════════
//  PricingDetailModal.tsx — Modal Challenge V1
//  Contenu : règles Challenge uniquement
//  Pas de Reward Account / pas de graphiques pédagogiques
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

export type ModalCardData = {
  balance:       number;
  trailingDdPct: number;
  activFeeEur:   number;
};

type Props = {
  card:    ModalCardData | null;
  lang:    string;
  onClose: () => void;
};

// ── style tokens ───────────────────────────────────────────────

const ACCENT = "#9CCFEA";
const RED    = "#ff5364";
const GREEN  = "#47dc88";
const ORANGE = "#f97316";

const secTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: ACCENT,
  letterSpacing: "2.5px", textTransform: "uppercase",
  margin: "0 0 10px",
};
const bodyTxt: React.CSSProperties = {
  fontSize: 13, color: "rgba(255,255,255,0.48)",
  lineHeight: 1.65, margin: "0 0 14px",
};
const infoBox: React.CSSProperties = {
  background:   "rgba(255,255,255,0.025)",
  border:       "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12, padding: "12px 14px",
};
const miniLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)",
  letterSpacing: "1.8px", textTransform: "uppercase", marginBottom: 4,
};
const bigVal: React.CSSProperties = {
  fontSize: 15, fontWeight: 800, color: "#FFFFFF", marginBottom: 3,
};
const tinyNote: React.CSSProperties = {
  fontSize: 10.5, color: "rgba(255,255,255,0.32)", lineHeight: 1.4,
};
const rowLbl: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.40)", fontWeight: 500,
};
const rowVal: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, color: "#FFFFFF",
};

// ── helpers ────────────────────────────────────────────────────

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

// ── Composant principal ────────────────────────────────────────

export default function PricingDetailModal({ card, lang, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef   = useRef<HTMLButtonElement>(null);

  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  // Focus trap + Escape
  useEffect(() => {
    if (!card) return;
    closeRef.current?.focus();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const focusable = overlayRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      ) ?? [];
      const arr = Array.from(focusable);
      if (!arr.length) return;
      const first = arr[0], last = arr[arr.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [card, onClose]);

  if (!card) return null;

  const { balance, trailingDdPct } = card;
  const sizeK     = balance / 1000;
  const sizeLabel = `$${sizeK}K`;
  const targetAmt = balance * 0.06;
  const ddAmt     = balance * trailingDdPct / 100;
  const floorAmt  = balance - ddAmt;

  return (
    <div
      ref={overlayRef}
      role="presentation"
      style={{
        position:   "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.84)",
        backdropFilter: "blur(6px)",
        display:    "flex", alignItems: "center", justifyContent: "center",
        padding:    "16px",
        overflowY:  "auto",
      }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdm-title"
        style={{
          background:   "linear-gradient(160deg, #0f1114 0%, #080a0c 100%)",
          border:       "1px solid rgba(156,207,234,0.22)",
          borderRadius: 24,
          maxWidth:     880,
          width:        "100%",
          maxHeight:    "88vh",
          overflowY:    "auto",
          position:     "relative",
          boxShadow:    "0 40px 120px rgba(0,0,0,0.90), 0 0 60px rgba(156,207,234,0.07)",
        }}
      >
        {/* Fermer */}
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label={L("Fermer","Cerrar","Close")}
          style={{
            position:     "absolute", top: 14, right: 14,
            width: 34, height: 34, borderRadius: "50%",
            border:       "1px solid rgba(255,255,255,0.12)",
            background:   "rgba(255,255,255,0.05)",
            color:        "rgba(255,255,255,0.55)",
            cursor:       "pointer",
            display:      "grid", placeItems: "center",
            zIndex:       2,
            transition:   "all 0.16s ease",
            fontFamily:   "inherit",
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.12)"; b.style.color = "#fff"; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.05)"; b.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <X size={15} />
        </button>

        {/* ── HEADER ── */}
        <div style={{
          padding:      "28px 28px 22px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{
            fontSize: 9, fontWeight: 800, color: ACCENT,
            letterSpacing: "3px", textTransform: "uppercase", marginBottom: 7,
          }}>
            Challenge · {L("UNE SEULE ÉTAPE","UN SOLO PASO","ONE STEP")}
          </div>
          <h2 id="pdm-title" style={{
            fontSize:      "clamp(1.5rem, 4vw, 2.2rem)",
            fontWeight:    900, color: "#FFFFFF",
            letterSpacing: "-1px", lineHeight: 1, margin: "0 0 6px",
          }}>
            CHALLENGE {sizeLabel}
          </h2>
          <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.36)", margin: 0 }}>
            {L(
              `Compte simulé de ${sizeLabel} — Capital de départ : ${fmt(balance)}`,
              `Cuenta simulada de ${sizeLabel} — Capital inicial: ${fmt(balance)}`,
              `${sizeLabel} simulated account — Starting capital: ${fmt(balance)}`
            )}
          </p>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: "24px 28px 30px", display: "flex", flexDirection: "column", gap: 26 }}>

          {/* ── 1. RÈGLES ── */}
          <div>
            <h3 style={secTitle}>{L("Règles du Challenge","Reglas del Challenge","Challenge Rules")}</h3>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 8,
            }}>
              {[
                {
                  label: L("Objectif profit","Objetivo profit","Profit target"),
                  pctStr: "+6%", usd: fmt(targetAmt),
                  note: L(`Minimum ${fmt(targetAmt)} sur ${sizeLabel}`, `Mínimo ${fmt(targetAmt)} sobre ${sizeLabel}`, `Minimum ${fmt(targetAmt)} on ${sizeLabel}`),
                  color: GREEN,
                },
                {
                  label: L("Trailing DD EOD","Trailing DD EOD","Trailing DD EOD"),
                  pctStr: `${trailingDdPct}%`, usd: fmt(ddAmt),
                  note: L(`Plancher de protection initial : ${fmt(floorAmt)}`, `Plancher de protección inicial: ${fmt(floorAmt)}`, `Initial protection floor: ${fmt(floorAmt)}`),
                  color: ORANGE,
                },
                {
                  label: L("Consistance","Consistencia","Consistency"),
                  pctStr: L("Aucune","Ninguna","None"), usd: "",
                  note: L("Aucune contrainte sur la répartition des profits journaliers","Sin restricción en la distribución de ganancias diarias","No constraint on daily profit distribution"),
                  color: ACCENT,
                },
                {
                  label: L("Jours minimum","Días mínimos","Minimum days"),
                  pctStr: L("0 jour","0 días","0 days"), usd: "",
                  note: L("Aucun minimum — tradez à votre rythme","Sin mínimo — opere a su ritmo","No minimum — trade at your own pace"),
                  color: ACCENT,
                },
                {
                  label: L("Durée maximum","Duración máxima","Maximum duration"),
                  pctStr: L("30 j. cal.","30 d. cal.","30 cal. days"), usd: "",
                  note: L("À partir de la création du Challenge","Desde la creación del Challenge","From Challenge creation"),
                  color: "rgba(255,255,255,0.35)",
                },
              ].map((row, i) => (
                <div key={i} style={{ ...infoBox, borderLeft: `2px solid ${row.color}33` }}>
                  <div style={miniLabel}>{row.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF" }}>{row.pctStr}</span>
                    {row.usd && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>= {row.usd}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", lineHeight: 1.4 }}>{row.note}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── 2. TRAILING DRAWDOWN EOD ── */}
          <div>
            <h3 style={secTitle}>Trailing Drawdown EOD</h3>
            <p style={{ ...bodyTxt, marginBottom: 14 }}>
              {L(
                `Le plancher de protection part de ${fmt(floorAmt)} et remonte avec chaque nouveau plus haut EOD. Il ne se verrouille jamais pendant le Challenge — il continue de suivre votre progression même après avoir atteint l'objectif de +6%, tant que toutes les conditions ne sont pas réunies.`,
                `El plancher de protección comienza en ${fmt(floorAmt)} y sube con cada nuevo máximo EOD. No se bloquea nunca durante el Challenge — sigue la progresión incluso tras alcanzar el +6%, mientras no se cumplan todas las condiciones.`,
                `The protection floor starts at ${fmt(floorAmt)} and rises with each EOD new high. It never locks during the Challenge — it keeps following your progress even past the +6% target, until all conditions are met.`
              )}
            </p>

            {/* Exemple textuel */}
            <div style={{ ...infoBox, marginBottom: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: ACCENT, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>
                {L(`Exemple — ${sizeLabel}`,`Ejemplo — ${sizeLabel}`,`Example — ${sizeLabel}`)}
              </div>

              {/* Données de base */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 14 }}>
                {([
                  { lbl: L("Capital initial","Capital inicial","Starting capital"), val: fmt(balance), color: "#FFF" },
                  { lbl: `Trailing DD EOD ${trailingDdPct}%`,                      val: fmt(ddAmt),   color: ORANGE },
                  { lbl: L("Plancher initial","Plancher inicial","Initial floor"),  val: fmt(floorAmt), color: ORANGE },
                ] as { lbl: string; val: string; color: string }[]).map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0",
                    borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={rowLbl}>{row.lbl}</span>
                    <span style={{ ...rowVal, color: row.color }}>{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Progression des plafonds */}
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
                {L("Plus haut EOD → plancher de protection","Máximo EOD → plancher de protección","EOD high → protection floor")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {([
                  { eod: balance * 1.02,  floor: balance * 1.02  - ddAmt, note: "" },
                  { eod: balance * 1.04,  floor: balance * 1.04  - ddAmt, note: "" },
                  { eod: balance * 1.06,  floor: balance * 1.06  - ddAmt, note: L("+6% — objectif min. atteint","+6% — objetivo mín. alcanzado","+6% — min. target reached") },
                  { eod: balance * 1.08,  floor: balance * 1.08  - ddAmt, note: L("si le Challenge continue","si el Challenge continúa","if Challenge continues") },
                ] as { eod: number; floor: number; note: string }[]).map((row, i) => (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "5px 8px",
                    background: i === 2 ? "rgba(71,220,136,0.05)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${i === 2 ? "rgba(71,220,136,0.14)" : "rgba(255,255,255,0.05)"}`,
                    borderRadius: 6,
                  }}>
                    <div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#FFF" }}>{fmt(row.eod)}</span>
                      {row.note ? <span style={{ fontSize: 9, color: i === 2 ? GREEN : "rgba(255,255,255,0.28)", marginLeft: 6 }}>— {row.note}</span> : null}
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 800, color: ORANGE }}>→ {fmt(row.floor)}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)", margin: "10px 0 0", lineHeight: 1.5 }}>
                {L(
                  "Aucun verrouillage du plancher pendant le Challenge. Le plancher ne redescend jamais.",
                  "Sin bloqueo del plancher durante el Challenge. El plancher nunca retrocede.",
                  "No floor lock during the Challenge. The floor never comes back down."
                )}
              </p>
            </div>
          </div>

          {/* ── 3. CONSISTANCE ── */}
          <div>
            <h3 style={secTitle}>{L("Règle de Consistance","Regla de Consistencia","Consistency Rule")}</h3>
            <p style={bodyTxt}>
              {L(
                "Aucune contrainte sur la répartition de vos profits journaliers au Challenge — seul l'objectif de +6% et les limites de risque s'appliquent.",
                "Sin restricciones sobre la distribución de sus ganancias diarias en el Challenge — solo se aplican el objetivo del +6% y los límites de riesgo.",
                "No constraints on daily profit distribution during the Challenge — only the +6% target and the risk limits apply."
              )}
            </p>

          </div>

          {/* ── 4. DURÉE ── */}
          <div>
            <h3 style={secTitle}>{L("Durée du Challenge","Duración del Challenge","Challenge Duration")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={infoBox}>
                <div style={miniLabel}>{L("Minimum","Mínimo","Minimum")}</div>
                <div style={bigVal}>{L("0 jour minimum","0 días mínimos","0 minimum days")}</div>
                <div style={tinyNote}>{L("Aucun minimum — tradez à votre rythme","Sin mínimo — opere a su ritmo","No minimum — trade at your own pace")}</div>
              </div>
              <div style={infoBox}>
                <div style={miniLabel}>{L("Maximum","Máximo","Maximum")}</div>
                <div style={bigVal}>{L("30 jours calendaires","30 días calendario","30 calendar days")}</div>
                <div style={tinyNote}>{L("À partir de la création du Challenge","Desde la creación del Challenge","From Challenge creation")}</div>
              </div>
            </div>
          </div>

          {/* ── 5. CONDITION D'ÉCHEC ── */}
          <div>
            <h3 style={secTitle}>{L("Condition d'échec","Condición de fallo","Breach Condition")}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ ...infoBox, border: "1px solid rgba(255,83,100,0.22)", background: "rgba(255,83,100,0.04)" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: RED, letterSpacing: "1.5px", marginBottom: 6 }}>
                  ✗ {L("ÉCHEC","FALLO","BREACH")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                  {L("Equity < plancher de protection","Equity < plancher de protección","Equity < protection floor")}
                </div>
              </div>
              <div style={{ ...infoBox, border: "1px solid rgba(71,220,136,0.18)", background: "rgba(71,220,136,0.04)" }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: GREEN, letterSpacing: "1.5px", marginBottom: 6 }}>
                  ✓ {L("SUR LE FIL","AL LÍMITE","AT THE LIMIT")}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.55 }}>
                  {L("Equity = plancher de protection — pas encore d'échec","Equity = plancher — no es fallo aún","Equity = protection floor — not yet a breach")}
                </div>
              </div>
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
            <button
              onClick={onClose}
              style={{
                padding:       "11px 28px",
                borderRadius:  10,
                border:        "1px solid rgba(255,255,255,0.10)",
                background:    "transparent",
                color:         "rgba(255,255,255,0.45)",
                fontSize:      11, fontWeight: 700, letterSpacing: "1px",
                textTransform: "uppercase",
                cursor:        "pointer", fontFamily: "inherit",
                transition:    "all 0.18s ease",
              }}
              onMouseEnter={e => { const b = e.currentTarget; b.style.color = "#fff"; b.style.borderColor = "rgba(255,255,255,0.28)"; }}
              onMouseLeave={e => { const b = e.currentTarget; b.style.color = "rgba(255,255,255,0.45)"; b.style.borderColor = "rgba(255,255,255,0.10)"; }}
            >
              {L("Fermer","Cerrar","Close")}
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
