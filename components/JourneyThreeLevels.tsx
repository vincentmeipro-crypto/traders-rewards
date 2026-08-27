"use client";

// ════════════════════════════════════════════════════════════════
//  JourneyThreeLevels.tsx
//  Section pédagogique "Comprenez votre parcours en 3 niveaux"
//  Positionnée après PricingV1, avant WhyTradersRewards
//  Contrainte : tenir sur un écran desktop 1440×900
// ════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef } from "react";
import { X, CircleCheck, DollarSign, Trophy, BadgeDollarSign, Award } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS } from "@/lib/rewardsData";
import PricingDetailModal from "./PricingDetailModal";

// ── Palette & helpers ─────────────────────────────────────────
const ACCENT  = "#9CCFEA";
const ORANGE  = "#f97316";
const GREEN   = "#8FC9A3";
const VIOLET  = "#B8A8D8";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// ── Données contractuelles (importées / calculées) ────────────
// Source : lib/rewardsData.ts + lib/v1-engine.ts (sans l'importer côté client)
const DD_PCT: Record<number, number>    = { 25000: 4, 50000: 4, 100000: 3 };
const ACTIV_FEE: Record<number, number> = { 25000: 99, 50000: 99, 100000: 149 };
// APEX EOD : seuils journée qualifiante relevés (was 50/100/150)
const QUAL_MIN: Record<number, number>  = { 25000: 100, 50000: 250, 100000: 300 };
// Safety Net (seuil de lock Apex EOD)
const LOCK_AT: Record<number, number> = {
  25000:   26100,  // Safety Net 25K (was 26 000 = start×1.04)
  50000:   52100,  // Safety Net 50K (was 52 000 = start×1.04)
  100000: 103100,  // Safety Net 100K (was 103 000 = start×1.03)
};
const SIZES_DATA = [
  { bal: 25000,  label: "25K",  ddPct: 4, floorStart: 24000,  lockAt: 26100,  targetBal: 26400,  rewardCaps: REWARD_AMOUNTS[0] },
  { bal: 50000,  label: "50K",  ddPct: 4, floorStart: 48000,  lockAt: 52100,  targetBal: 52600,  rewardCaps: REWARD_AMOUNTS[1] },
  { bal: 100000, label: "100K", ddPct: 3, floorStart: 97000,  lockAt: 103100, targetBal: 103850, rewardCaps: REWARD_AMOUNTS[2] },
];

// ── Styles partagés ───────────────────────────────────────────
const secLabel: React.CSSProperties = {
  fontSize: 9, fontWeight: 800, color: ACCENT,
  letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 6,
};
const cardBodyTxt: React.CSSProperties = {
  fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: "0 0 10px",
};
const modalSecTitle: React.CSSProperties = {
  fontSize: 10, fontWeight: 800, color: ACCENT,
  letterSpacing: "2.5px", textTransform: "uppercase", margin: "0 0 10px",
};
const modalBodyTxt: React.CSSProperties = {
  fontSize: 13, color: "rgba(255,255,255,0.48)", lineHeight: 1.65, margin: "0 0 14px",
};
const infoBox: React.CSSProperties = {
  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: 12, padding: "12px 14px",
};

// ── Arrow connector ───────────────────────────────────────────
function Arrow() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "0 6px", flexShrink: 0, opacity: 0.50,
      alignSelf: "center",
    }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 8h12M9 4l5 4-5 4" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}


// ── Info button ───────────────────────────────────────────────
type InfoBtnRef = React.RefObject<HTMLButtonElement | null>;
function InfoBtn({ onClick, label, btnRef }: { onClick: () => void; label: string; btnRef?: InfoBtnRef }) {
  return (
    <button
      ref={btnRef as React.RefObject<HTMLButtonElement>}
      onClick={onClick}
      aria-label={label}
      style={{
        width: 22, height: 22, borderRadius: "50%",
        border: "1px solid rgba(156,207,234,0.35)",
        background: "rgba(156,207,234,0.07)",
        color: ACCENT, fontSize: 9, fontWeight: 900, fontStyle: "normal",
        cursor: "pointer", display: "grid", placeItems: "center",
        fontFamily: "inherit", flexShrink: 0, transition: "all 0.16s ease",
      }}
      onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(156,207,234,0.18)"; b.style.borderColor = "rgba(156,207,234,0.65)"; }}
      onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(156,207,234,0.07)"; b.style.borderColor = "rgba(156,207,234,0.35)"; }}
    >
      i
    </button>
  );
}

// ── Modal shell (UX partagé) ──────────────────────────────────
function ModalShell({ isOpen, onClose, titleId, children }: {
  isOpen: boolean; onClose: () => void; titleId: string; children: React.ReactNode;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef   = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const els = Array.from(overlayRef.current?.querySelectorAll<HTMLElement>(
        'button,[href],[tabindex]:not([tabindex="-1"])'
      ) ?? []);
      if (!els.length) return;
      const [first, last] = [els[0], els[els.length - 1]];
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={overlayRef} role="presentation"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.84)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px", overflowY: "auto",
      }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <section role="dialog" aria-modal="true" aria-labelledby={titleId}
        style={{
          background: "linear-gradient(160deg, #0f1114 0%, #080a0c 100%)",
          border: "1px solid rgba(156,207,234,0.22)", borderRadius: 24,
          maxWidth: 880, width: "100%", maxHeight: "88vh",
          overflowY: "auto", position: "relative",
          boxShadow: "0 40px 120px rgba(0,0,0,0.90), 0 0 60px rgba(156,207,234,0.07)",
        }}
      >
        <button ref={closeRef} onClick={onClose} aria-label="Fermer"
          style={{
            position: "absolute", top: 14, right: 14,
            width: 34, height: 34, borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)",
            cursor: "pointer", display: "grid", placeItems: "center",
            zIndex: 2, fontFamily: "inherit", transition: "all 0.16s ease",
          }}
          onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.12)"; b.style.color = "#fff"; }}
          onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(255,255,255,0.05)"; b.style.color = "rgba(255,255,255,0.55)"; }}
        >
          <X size={15} />
        </button>
        {children}
      </section>
    </div>
  );
}

// ── Modal 02 : Compte Reward ──────────────────────────────────
function Modal02({ onClose, L }: { onClose: () => void; L: (fr: string, es: string, en: string) => string }) {
  return (
    <div>
      {/* Header */}
      <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: ACCENT, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 7 }}>
          {L("Niveau 02","Nivel 02","Level 02")} · {L("Qualification Reward","Qualification Reward","Reward Qualification")}
        </div>
        <h2 id="m2-title" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#FFF", letterSpacing: "-0.8px", lineHeight: 1, margin: "0 0 6px" }}>
          {L("Débloquez votre première Reward","Desbloquee su primera Reward","Unlock your first Reward")}
        </h2>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.36)", margin: 0 }}>
          {L("Safety Net + cap · 5 journées qualifiantes · Trailing DD EOD avec verrou",
             "Safety Net + tope · 5 días calificados · Trailing DD EOD con bloqueo",
             "Safety Net + cap · 5 qualifying days · Trailing EOD DD with lock")}
        </p>
      </div>

      <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Règles */}
        <div>
          <h3 style={modalSecTitle}>{L("Règles de qualification","Reglas de calificación","Qualification Rules")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            {[
              { label: L("Seuil Reward #1","Umbral Reward #1","Reward #1 threshold"), val: L("Safety Net + cap","Safety Net + tope","Safety Net + cap"), note: L("Verrou déclenché au Safety Net","Bloqueo en Safety Net","Lock triggers at Safety Net"), color: GREEN },
              { label: L("Jours qualifiants","Días calificados","Qualifying days"), val: L("5 min","5 mín","5 min"), note: L("Journées avec profit ≥ seuil","Días con beneficio ≥ umbral","Days with profit ≥ threshold"), color: ACCENT },
              { label: L("Consistance","Consistencia","Consistency"),       val: "≤ 50%",  note: L("Meilleure journée ≤ 50% du profit total","Mejor día ≤ 50% del beneficio","Best day ≤ 50% of total profit"), color: ACCENT },
              { label: L("Durée","Duración","Duration"),                    val: L("Illimitée","Ilimitada","Unlimited"), note: L("Pas d'expiration","Sin expiración","No expiration"), color: "rgba(255,255,255,0.35)" },
            ].map((r, i) => (
              <div key={i} style={{ ...infoBox, borderLeft: `2px solid ${r.color}33` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>{r.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#FFF", marginBottom: 3 }}>{r.val}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", lineHeight: 1.4 }}>{r.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seuils journée qualifiante */}
        <div>
          <h3 style={modalSecTitle}>{L("Seuils journée qualifiante","Umbrales día calificado","Qualifying Day Thresholds")}</h3>
          <p style={modalBodyTxt}>
            {L(
              "Une journée est qualifiante uniquement si le profit de clôture est supérieur ou égal au seuil minimum applicable à votre compte. Une journée positive inférieure au seuil ne compte pas.",
              "Un día califica solo si el beneficio de cierre es igual o superior al umbral mínimo del tamaño de cuenta. Un día positivo por debajo del umbral no cuenta.",
              "A day qualifies only if the closing profit meets or exceeds the minimum threshold for your account size. A profitable day below the threshold does not count."
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { size: "25K",  min: 100, floorStart: 24000, lockAt: 26100,  target: 26400 },
              { size: "50K",  min: 250, floorStart: 48000, lockAt: 52100,  target: 52600 },
              { size: "100K", min: 300, floorStart: 97000, lockAt: 103100, target: 103850 },
            ].map((row, i) => (
              <div key={i} style={infoBox}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>{row.size}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#FFF", marginBottom: 3 }}>+{fmt(row.min)}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>/jour</span></div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", lineHeight: 1.4 }}>{L("Seuil Reward #1","Umbral Reward #1","Reward #1 threshold")} : {fmt(row.target)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trailing DD + verrou */}
        <div>
          <h3 style={modalSecTitle}>Trailing Drawdown EOD — {L("Verrou du plancher de protection","Bloqueo del plancher de protección","Protection floor lock")}</h3>
          <p style={modalBodyTxt}>
            {L(
              "Le plancher de protection part en dessous du capital initial. Il remonte avec chaque nouveau plus haut EOD. Une fois qu'il atteint le capital initial, il se verrouille définitivement. Le plancher de protection ne monte plus — votre capital de départ est protégé pour toujours.",
              "El plancher de protección comienza por debajo del capital inicial. Sube con cada nuevo máximo EOD. Una vez alcanzado el capital inicial, queda bloqueado definitivamente.",
              "The protection floor starts below the initial capital. It rises with each EOD new high. Once it reaches the starting capital, it locks permanently — your starting capital is protected forever."
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {SIZES_DATA.map((s, i) => (
              <div key={i} style={infoBox}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                {[
                  [L("Capital initial","Capital inicial","Starting capital"), fmt(s.bal)],
                  [L("Plancher de protection initial","Plancher inicial","Initial protection floor"), fmt(s.floorStart)],
                  [L("Verrou déclenché à","Bloqueo en","Lock triggers at"),   fmt(s.lockAt)],
                  [L("Plancher verrouillé à","Plancher bloqueado en","Protection floor locks to"), fmt(s.bal)],
                  [L("Seuil Reward #1 (Safety Net + cap)","Umbral Reward #1 (Safety Net + tope)","Reward #1 threshold (Safety Net + cap)"), fmt(s.targetBal)],
                ].map(([k, v], j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0",
                    borderBottom: j < 4 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>{k}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: j === 3 ? ACCENT : j === 4 ? GREEN : "#FFF" }}>{v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Rewards disponibles */}
        <div>
          <h3 style={modalSecTitle}>{L("Première Reward disponible","Primera Reward disponible","Compte Reward")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {SIZES_DATA.map((s, i) => (
              <div key={i} style={{ ...infoBox, textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT }}>{fmt(s.rewardCaps[0])}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>{L("maximum Reward #1","máximo Reward #1","Reward #1 max")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fermer */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <button onClick={onClose} style={{
            padding: "11px 28px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.10)", background: "transparent",
            color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700,
            letterSpacing: "1px", textTransform: "uppercase",
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s ease",
          }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.color = "#fff"; b.style.borderColor = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.color = "rgba(255,255,255,0.45)"; b.style.borderColor = "rgba(255,255,255,0.10)"; }}
          >
            {L("Fermer","Cerrar","Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal 03 : Rewards #2 → #5 — seuil = Safety Net + cap du niveau ─────
function Modal03({ onClose, L }: { onClose: () => void; L: (fr: string, es: string, en: string) => string }) {
  // Seuils de demande : Safety Net + cap du niveau. Tableau : seuil Reward #2 (= Safety Net + cap#2)
  const thresholds = [
    { size: "25K",  capital: "$25 000", threshold: "$26 400" },
    { size: "50K",  capital: "$50 000", threshold: "$52 600" },
    { size: "100K", capital: "$100 000",threshold: "$103 850" },
  ];

  // Cas exemples 50K — post-Reward #1 (balance après R#1 = 52 100$, Safety Net 50K)
  // Threshold R#2 = Safety Net + cap#2 = 52 100 + 650 = 52 750
  const PREV_BALANCE = 52_100;
  const CAP_R2 = 650; // plafond Reward #2 — 50K
  const THRESHOLD_R2 = 52_750; // Safety Net 52 100 + cap#2 650
  const cases = [
    {
      label:   L("CAS A","CASO A","CASE A"),
      balance: 52_400,
      profit:  52_400 - PREV_BALANCE, // 300
      reward:  0, // seuil 52 750 non atteint
      after:   52_400,
      note:    L("Seuil non atteint — Reward indisponible","Umbral no alcanzado — Reward no disponible","Threshold not reached — Reward unavailable"),
      noteColor: ORANGE,
    },
    {
      label:   L("CAS B","CASO B","CASE B"),
      balance: THRESHOLD_R2,
      profit:  THRESHOLD_R2 - PREV_BALANCE, // 650
      reward:  Math.min(THRESHOLD_R2 - PREV_BALANCE, CAP_R2), // 650
      after:   THRESHOLD_R2 - Math.min(THRESHOLD_R2 - PREV_BALANCE, CAP_R2), // 52 100
      note:    L("Exactement le plafond","Exactamente el tope","Exactly at the cap"),
      noteColor: GREEN,
    },
    {
      label:   L("CAS C","CASO C","CASE C"),
      balance: 53_200,
      profit:  53_200 - PREV_BALANCE, // 1 100
      reward:  Math.min(53_200 - PREV_BALANCE, CAP_R2), // 650
      after:   53_200 - Math.min(53_200 - PREV_BALANCE, CAP_R2), // 52 550
      note:    L("Limité par le plafond — 450$ conservés","Limitado por el tope — 450$ conservados","Capped — $450 stays in account"),
      noteColor: ACCENT,
    },
  ];

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: VIOLET, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 7 }}>
          TRADER REWARD · {L("Niveau 03","Nivel 03","Level 03")}
        </div>
        <h2 id="m3-title" style={{ fontSize: "clamp(1.3rem, 3vw, 1.75rem)", fontWeight: 900, color: "#FFF", letterSpacing: "-0.7px", lineHeight: 1.1, margin: "0 0 6px" }}>
          {L(
            "Comment fonctionnent les Rewards #2 à #5 ?",
            "¿Cómo funcionan las Rewards #2 a #5?",
            "How do Rewards #2 to #5 work?"
          )}
        </h2>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.36)", margin: 0 }}>
          {L(
            "Seuil = Safety Net + cap du niveau · Montant = min(profit, plafond) · Pas de reset · DD fixe",
            "Umbral = Safety Net + tope del nivel · Importe = min(beneficio, tope) · Sin reset · DD fijo",
            "Threshold = Safety Net + level cap · Amount = min(profit, cap) · No reset · Fixed DD"
          )}
        </p>
      </div>

      <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* ── Section 1 : Seuil permanent ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("1 · Seuil permanent de demande","1 · Umbral permanente de solicitud","1 · Permanent request threshold")}
          </h3>
          <p style={modalBodyTxt}>
            {L(
              "Pour demander une Reward, votre balance doit atteindre le seuil de demande : Safety Net + cap du niveau de Reward. Ce seuil augmente légèrement à chaque niveau en fonction du plafond associé.",
              "Para solicitar una Reward, su balance debe alcanzar el umbral de solicitud: Safety Net + tope del nivel de Reward. Este umbral aumenta ligeramente con cada nivel según el tope asociado.",
              "To request a Reward, your balance must reach the request threshold: Safety Net + cap of the Reward level. The threshold increases slightly at each level based on the associated cap."
            )}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                  {[
                    L("Taille","Tamaño","Size"),
                    L("Capital initial","Capital inicial","Starting capital"),
                    L("Seuil de demande (Safety Net + cap)","Umbral de solicitud (Safety Net + tope)","Request threshold (Safety Net + cap)"),
                  ].map((h, i) => (
                    <th key={i} style={{
                      textAlign: i === 0 ? "left" : "center",
                      padding: "7px 10px", fontSize: 9, fontWeight: 800,
                      color: i === 2 ? ACCENT : "rgba(255,255,255,0.30)",
                      letterSpacing: "1.5px", textTransform: "uppercase",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {thresholds.map((row, i) => (
                  <tr key={i} style={{ borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.055)" : "none" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 800, color: "#FFF", fontSize: 12 }}>{row.size}</td>
                    <td style={{ textAlign: "center", padding: "8px 10px", color: "rgba(255,255,255,0.52)", fontSize: 12 }}>{row.capital}</td>
                    <td style={{ textAlign: "center", padding: "8px 10px", fontWeight: 900, color: GREEN, fontSize: 13 }}>{row.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 2 : Formule du montant ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("2 · Montant de la Reward","2 · Importe de la Reward","2 · Reward amount")}
          </h3>
          <p style={{ ...modalBodyTxt, marginBottom: 10 }}>
            {L(
              "Seul le profit réalisé depuis la Reward précédente est pris en compte. Le montant versé est le plus petit des deux valeurs suivantes :",
              "Solo se tiene en cuenta el beneficio realizado desde la última Reward. El importe pagado es el menor de los dos valores siguientes:",
              "Only the profit earned since the previous Reward counts. The amount paid is whichever is lower:"
            )}
          </p>
          <div style={{ background: "rgba(143,201,163,0.04)", border: "1px solid rgba(143,201,163,0.16)", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: GREEN, letterSpacing: "-0.3px" }}>
              {L(
                "Reward = min( nouveau profit depuis dernière Reward, plafond du niveau )",
                "Reward = min( nuevo beneficio desde última Reward, tope del nivel )",
                "Reward = min( new profit since last Reward, level cap )"
              )}
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.32)", marginTop: 10, lineHeight: 1.55 }}>
            {L(
              "Après versement : balance = balance − Reward versée. Le plancher de protection reste verrouillé à votre capital initial. Aucun reset automatique.",
              "Tras el pago : balance = balance − Reward pagada. El plancher de protección sigue bloqueado en su capital inicial. Sin reset automático.",
              "After payment: balance = balance − Reward paid. The protection floor stays locked at your starting capital. No automatic reset."
            )}
          </p>
        </div>

        {/* ── Section 3 : 3 cas — 50K, Reward #2 ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("3 · Exemple 50K — Reward #2 (après R#1 = 500$)","3 · Ejemplo 50K — Reward #2 (tras R#1 = 500$)","3 · 50K example — Reward #2 (after R#1 = $500)")}
          </h3>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", margin: "0 0 12px", lineHeight: 1.5 }}>
            {L(
              "Balance après Reward #1 : 52 100 $ · Seuil de demande : 52 750 $ · Plafond Reward #2 : 650 $",
              "Balance tras Reward #1 : 52 100 $ · Umbral de solicitud : 52 750 $ · Tope Reward #2 : 650 $",
              "Balance after Reward #1: $52,100 · Request threshold: $52,750 · Reward #2 cap: $650"
            )}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cases.map((c, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10, padding: "12px 14px",
              }}>
                {/* Label cas */}
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                  {c.label}
                </div>
                {/* Données */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                  {[
                    { lbl: L("Balance","Balance","Balance"),  val: fmt(c.balance), col: "#FFF" },
                    { lbl: L("Nouveau profit","Nuevo beneficio","New profit"), val: fmt(c.profit), col: "rgba(255,255,255,0.85)" },
                    { lbl: L("Reward versée","Reward pagada","Reward paid"), val: fmt(c.reward),  col: GREEN },
                    { lbl: L("Balance après","Balance tras","Balance after"), val: fmt(c.after),  col: ACCENT },
                  ].map((cell, j) => (
                    <div key={j} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 8.5, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 4 }}>
                        {cell.lbl}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 900, color: cell.col }}>
                        {cell.val}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Note */}
                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: c.noteColor, opacity: 0.85 }}>
                  → {c.note}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 4 : Plafonds Rewards #2→#5 ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("4 · Plafonds Rewards #2 → #5","4 · Topes Rewards #2 → #5","4 · Reward #2 → #5 caps")}
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                  <th style={{ textAlign: "left", padding: "7px 8px", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    {L("Niveau","Nivel","Level")}
                  </th>
                  {["25K", "50K", "100K"].map(s => (
                    <th key={s} style={{ textAlign: "center", padding: "7px 12px", fontSize: 9, fontWeight: 800, color: ACCENT, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4].map(lv => {
                  const isTrader = lv === 4;
                  return (
                    <tr key={lv} style={{
                      borderBottom: lv < 4 ? "1px solid rgba(255,255,255,0.055)" : "none",
                      background: isTrader ? "rgba(156,207,234,0.05)" : "transparent",
                    }}>
                      <td style={{ padding: "8px 8px", fontWeight: 700, color: isTrader ? ACCENT : "rgba(255,255,255,0.60)", fontSize: 11.5, whiteSpace: "nowrap" }}>
                        {isTrader ? "★ TRADER REWARD" : `Reward #${lv + 1}`}
                      </td>
                      {REWARD_AMOUNTS.map((col, si) => (
                        <td key={si} style={{ textAlign: "center", padding: "8px 12px", fontWeight: 800, fontSize: 13,
                          color: isTrader ? ACCENT : "#FFF" }}>
                          {fmt(col[lv])}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.28)", marginTop: 8, lineHeight: 1.5 }}>
            {L(
              "Ces montants sont des plafonds maximums. Le montant effectif peut être inférieur si votre nouveau profit est plus faible que le plafond.",
              "Estos importes son topes máximos. El importe efectivo puede ser inferior si su nuevo beneficio es menor que el tope.",
              "These are maximum caps. The actual amount may be lower if your new profit is below the cap."
            )}
          </p>
        </div>

        {/* ── Fermer ── */}
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
          <button onClick={onClose} style={{
            padding: "11px 28px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.10)", background: "transparent",
            color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700,
            letterSpacing: "1px", textTransform: "uppercase",
            cursor: "pointer", fontFamily: "inherit", transition: "all 0.18s ease",
          }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.color = "#fff"; b.style.borderColor = "rgba(255,255,255,0.28)"; }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.color = "rgba(255,255,255,0.45)"; b.style.borderColor = "rgba(255,255,255,0.10)"; }}
          >
            {L("Fermer","Cerrar","Close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────
export default function JourneyThreeLevels() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const [isMobile, setIsMobile] = useState(false);
  const [selectedSizeIndex, setSelectedSizeIndex] = useState(1);
  // null=aucun, 0=Challenge, 1=Reward Account, 2=Rewards Journey
  const [activeModal, setActiveModal] = useState<0 | 1 | 2 | null>(null);
  const triggerRefs = [
    useRef<HTMLButtonElement>(null),
    useRef<HTMLButtonElement>(null),
    useRef<HTMLButtonElement>(null),
  ];

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const openModal  = (idx: 0 | 1 | 2) => setActiveModal(idx);
  const closeModal = () => {
    const idx = activeModal;
    setActiveModal(null);
    if (idx !== null) setTimeout(() => triggerRefs[idx]?.current?.focus(), 80);
  };

  const selectedSize = SIZES_DATA[selectedSizeIndex];
  const challengeTarget = selectedSize.bal * 1.06;
  const rewardThreshold = selectedSize.targetBal;              // Safety Net + cap#1 (seuil Reward #1)
  const ddUsd = selectedSize.bal - selectedSize.floorStart;    // DD EOD en $ (1000/2000/3000)
  const rewardOne = selectedSize.rewardCaps[0];
  const cumulativeRewards = selectedSize.rewardCaps.reduce((sum, amount) => sum + amount, 0);
  const money = (value: number) => `${value.toLocaleString("fr-FR")} $`;

  // ── Style commun des cartes ──────────────────────────────────
  const cardBase = (accent: boolean): React.CSSProperties => ({
    position:      "relative",
    overflow:      "hidden",
    flex:          1,
    minWidth:      0,
    display:       "flex",
    flexDirection: "column",
    padding:       isMobile ? "18px 16px" : "16px 16px 14px",
    borderRadius:  18,
    border:        `1px solid ${accent ? "rgba(156,207,234,0.40)" : "rgba(255,255,255,0.09)"}`,
    background:    accent
      ? "linear-gradient(155deg, #181a1c 0%, #0f1215 100%)"
      : "linear-gradient(155deg, #141414 0%, #0c0c0e 100%)",
    boxShadow: accent
      ? "0 28px 70px rgba(0,0,0,0.80), 0 0 32px rgba(156,207,234,0.10)"
      : "0 20px 56px rgba(0,0,0,0.72), 0 8px 22px rgba(0,0,0,0.52)",
  });

  // ── Rendu ────────────────────────────────────────────────────
  return (
    <>
      <section
        id="parcours-3-niveaux"
        aria-labelledby="j3l-heading"
        style={{
          padding:         isMobile ? "48px 16px" : "64px 24px",
          backgroundColor: "#000000",
          position:        "relative",
          overflow:        "hidden",
        }}
      >
        {/* Halo fond */}
        <div aria-hidden="true" style={{
          position: "absolute", top: "5%", left: "50%",
          width: "min(800px, 80vw)", height: 260, transform: "translateX(-50%)",
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(156,207,234,0.04), transparent 65%)",
          filter: "blur(20px)", pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* ── Titre ── */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 18 }}>
            <h2 id="j3l-heading" style={{
              fontSize:      isMobile ? "clamp(1.8rem, 7vw, 2.6rem)" : "clamp(2rem, 2.6vw, 3.4rem)",
              fontWeight:    900,
              color:         "#FFFFFF",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              lineHeight:    1.05,
              margin:        "0 0 12px",
            }}>
              {L("DE CHALLENGER À","DE CHALLENGER A","FROM CHALLENGER TO")}{" "}
              <span style={{ color: ACCENT }}>
                TRADER REWARD
              </span>
            </h2>
            {/* Sélecteur des trois produits */}
            <div role="group" aria-label={L("Taille du compte","Tamaño de la cuenta","Account size")} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: 4, borderRadius: 24,
              border: "1px solid rgba(156,207,234,0.18)",
              background: "rgba(255,255,255,0.025)",
            }}>
              {SIZES_DATA.map((size, index) => {
                const selected = selectedSizeIndex === index;
                return (
                  <button
                    key={size.label}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSelectedSizeIndex(index)}
                    style={{
                      minWidth: isMobile ? 62 : 72,
                      padding: isMobile ? "7px 12px" : "7px 16px",
                      borderRadius: 18,
                      border: selected ? "1px solid rgba(156,207,234,0.52)" : "1px solid transparent",
                      background: selected ? "rgba(156,207,234,0.16)" : "transparent",
                      color: selected ? ACCENT : "rgba(255,255,255,0.42)",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "1.4px",
                      cursor: "pointer",
                    }}
                  >
                    {size.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 3 cartes ── */}
          <div style={{
            display:        "flex",
            flexDirection:  isMobile ? "column" : "row",
            gap:            isMobile ? 12 : 0,
            alignItems:     isMobile ? "stretch" : "stretch",
          }}>

            {/* ── CARTE 01 : CHALLENGE ── */}
            <div style={cardBase(false)}>
              {/* Glow */}
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
                background: "radial-gradient(circle at 50% 0%, rgba(143,201,163,0.035), transparent 50%)" }} />

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
                <div style={{ ...secLabel, marginBottom: 0 }}>NIVEAU 01</div>
                <InfoBtn
                  btnRef={triggerRefs[0] as InfoBtnRef}
                  onClick={() => openModal(0)}
                  label={L("Détails du Challenge","Detalles del Challenge","Challenge details")}
                />
              </div>

              {/* Nom du niveau */}
              <div style={{ fontSize: isMobile ? 30 : 28, fontWeight: 900, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1, marginBottom: 14, position: "relative" }}>
                CHALLENGER
              </div>

              {/* Validation */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, position: "relative" }}>
                <CircleCheck size={15} color={GREEN} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.2px" }}>
                  {L("Validez votre Challenge","Valide su Challenge","Pass your Challenge")}
                </span>
              </div>

              {/* +6% + progression */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, position: "relative", flexWrap: "wrap" }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: GREEN, letterSpacing: "-1px", lineHeight: 1 }}>+6%</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.55)" }}>
                  {money(selectedSize.bal)}
                  <span style={{ color: "rgba(255,255,255,0.22)", margin: "0 5px" }}>→</span>
                  {money(challengeTarget)}
                </span>
              </div>

              {/* Durée */}
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.72)", marginBottom: 8, position: "relative", lineHeight: 1.5 }}>
                {L("0 jour minimum","0 días mínimo","0 days minimum")}
                <span style={{ color: "rgba(255,255,255,0.30)", margin: "0 6px" }}>→</span>
                {L("30 jours maximum","30 días máximo","30 days maximum")}
              </div>

              {/* Règles */}
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", position: "relative", letterSpacing: "0.2px", lineHeight: 1.5 }}>
                {L("DD EOD fixe","DD EOD fijo","Fixed DD EOD")} {money(ddUsd)}
                <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
                {L("Consistance 50%","Consistencia 50%","Consistency 50%")}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: 20 }} />

              {/* Bénéfice final — bloc premium vert */}
              <div style={{
                position:     "relative",
                background:   "linear-gradient(135deg, rgba(143,201,163,0.055), rgba(143,201,163,0.012))",
                border:       "1px solid rgba(143,201,163,0.20)",
                borderRadius: 12,
                padding:      "11px 14px",
                minHeight:    150,
                boxSizing:    "border-box",
                boxShadow:    "inset 0 0 24px rgba(143,201,163,0.018), 0 0 18px rgba(143,201,163,0.025)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(143,201,163,0.68)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    CHALLENGE
                  </div>
                  <CircleCheck size={16} color="rgba(143,201,163,0.58)" strokeWidth={1.8} />
                </div>
                <div aria-hidden="true" style={{ fontSize: 9, fontWeight: 700, visibility: "hidden", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>
                  {L("JUSQU'À","HASTA","UP TO")}
                </div>
                <div style={{
                  fontSize:      "clamp(36px, 3.6vw, 50px)",
                  fontWeight:    900,
                  color:         GREEN,
                  letterSpacing: "-1.5px",
                  lineHeight:    1,
                  textShadow:    "0 0 8px rgba(143,201,163,0.16), 0 0 16px rgba(143,201,163,0.07)",
                }}>
                  {L("VALIDÉ !","¡VALIDADO!","PASSED!")}
                </div>
              </div>
            </div>

            {/* Arrow 1→2 */}
            {!isMobile && <Arrow />}

            {/* ── CARTE 02 : PREMIÈRE REWARD ── */}
            <div style={cardBase(true)}>
              {/* Glow */}
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
                background: "radial-gradient(circle at 50% 0%, rgba(156,207,234,0.14), transparent 52%)" }} />

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
                <div style={{ ...secLabel, marginBottom: 0 }}>NIVEAU 02</div>
                <InfoBtn
                  btnRef={triggerRefs[1] as InfoBtnRef}
                  onClick={() => openModal(1)}
                  label={L("Détails du Compte Reward","Detalles del Compte Reward","Compte Reward details")}
                />
              </div>

              {/* Nom du niveau */}
              <div style={{ fontSize: isMobile ? 30 : 28, fontWeight: 900, color: ACCENT, letterSpacing: "-1px", lineHeight: 1, marginBottom: 14, position: "relative" }}>
                COMPTE REWARD
              </div>

              {/* Sous-titre */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, position: "relative" }}>
                <DollarSign size={15} color={ACCENT} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.2px" }}>
                  {L("Débloquez votre première Reward","Desbloquee su primera Reward","Unlock your first Reward")}
                </span>
              </div>

              {/* Safety Net + seuil Reward #1 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12, position: "relative" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(156,207,234,0.50)", letterSpacing: "1.5px", textTransform: "uppercase" }}>Safety Net</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: ACCENT, letterSpacing: "-0.5px", lineHeight: 1 }}>{money(selectedSize.lockAt)}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.42)" }}>
                  {L("Seuil Reward #1","Umbral Reward #1","Reward #1 threshold")}{" → "}
                  <span style={{ color: ACCENT, fontWeight: 800 }}>{money(rewardThreshold)}</span>
                  {" "}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)" }}>({L("cap","tope","cap")} {money(rewardOne)})</span>
                </div>
              </div>

              {/* Journées qualifiantes */}
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.72)", marginBottom: 8, position: "relative", lineHeight: 1.5 }}>
                {L("5 journées qualifiantes minimum","5 días calificados mínimo","5 qualifying days minimum")} · +{money(QUAL_MIN[selectedSize.bal])} / {L("jour","día","day")}
              </div>

              {/* Règles */}
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", position: "relative", letterSpacing: "0.2px", lineHeight: 1.5 }}>
                {L("DD EOD fixe","DD EOD fijo","Fixed DD EOD")} {money(ddUsd)}
                <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
                {L("Consistance 50%","Consistencia 50%","Consistency 50%")}
                <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
                {L("Temps illimité","Tiempo ilimitado","Unlimited duration")}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: 20 }} />

              {/* Bénéfice final */}
              <div style={{
                position:     "relative",
                background:   "linear-gradient(135deg, rgba(156,207,234,0.08), rgba(156,207,234,0.02))",
                border:       "1px solid rgba(156,207,234,0.25)",
                borderRadius: 12,
                padding:      "11px 14px",
                minHeight:    150,
                boxSizing:    "border-box",
                boxShadow:    "inset 0 0 30px rgba(156,207,234,0.03), 0 0 24px rgba(156,207,234,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(156,207,234,0.60)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    REWARD #1
                  </div>
                  <BadgeDollarSign size={16} color="rgba(156,207,234,0.45)" strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(156,207,234,0.35)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>
                  {L("JUSQU'À","HASTA","UP TO")}
                </div>
                <div style={{
                  fontSize:    "clamp(40px, 4vw, 56px)",
                  fontWeight:  900,
                  color:       ACCENT,
                  letterSpacing: "-2px",
                  lineHeight:  1,
                  textShadow:  "0 0 8px rgba(156,207,234,0.35), 0 0 20px rgba(156,207,234,0.18)",
                }}>
                  {money(rewardOne)}
                </div>
              </div>
            </div>

            {/* Arrow 2→3 */}
            {!isMobile && <Arrow />}

            {/* ── CARTE 03 : REWARDS SUIVANTES ── */}
            <div style={cardBase(false)}>
              {/* Glow violet */}
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
                background: "radial-gradient(circle at 50% 0%, rgba(184,168,216,0.035), transparent 50%)" }} />

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
                <div style={{ ...secLabel, marginBottom: 0 }}>NIVEAU 03</div>
                <InfoBtn
                  btnRef={triggerRefs[2] as InfoBtnRef}
                  onClick={() => openModal(2)}
                  label={L("Détails du parcours Rewards","Detalles del recorrido Rewards","Rewards journey details")}
                />
              </div>

              {/* Nom du niveau */}
              <div style={{ fontSize: isMobile ? 30 : 28, fontWeight: 900, color: VIOLET, letterSpacing: "-1px", lineHeight: 1, marginBottom: 10, position: "relative" }}>
                TRADER REWARD
              </div>

              {/* Sous-titre */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, position: "relative" }}>
                <Award size={15} color={VIOLET} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.2px" }}>
                  {L("Multipliez vos Rewards","Multiplique sus Rewards","Multiply your Rewards")}
                </span>
              </div>

              {/* Progression secondaire */}
              <div style={{ marginBottom: 8, position: "relative" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(184,168,216,0.62)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 3 }}>
                  REWARDS
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, color: VIOLET, letterSpacing: "-1px", lineHeight: 1 }}>
                  #2 → #5
                </div>
              </div>

              {/* Safety Net */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, position: "relative" }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(184,168,216,0.62)", textTransform: "uppercase", letterSpacing: "1px" }}>
                  SAFETY NET
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: VIOLET }}>{money(selectedSize.lockAt)}</span>
              </div>

              {/* Règles */}
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.72)", position: "relative", letterSpacing: "0.2px", lineHeight: 1.5, marginBottom: 8 }}>
                {L("DD fixe","DD fijo","Fixed DD")}
                <span style={{ margin: "0 6px", opacity: 0.5 }}>·</span>
                {L("Consistance 50%","Consistencia 50%","Consistency 50%")}
              </div>

              {/* Phrase */}
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", lineHeight: 1.6, position: "relative" }}>
                {L(
                  "Seuil de chaque Reward = Safety Net + cap du niveau demandé.",
                  "Umbral de cada Reward = Safety Net + tope del nivel solicitado.",
                  "Each Reward threshold = Safety Net + cap of the requested level."
                )}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: 12 }} />

              {/* Bloc final violet */}
              <div style={{
                position:     "relative",
                background:   "linear-gradient(135deg, rgba(184,168,216,0.055), rgba(184,168,216,0.012))",
                border:       "1px solid rgba(184,168,216,0.22)",
                borderRadius: 12,
                padding:      "11px 14px",
                minHeight:    150,
                boxSizing:    "border-box",
                boxShadow:    "inset 0 0 24px rgba(184,168,216,0.018), 0 0 18px rgba(184,168,216,0.025)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(184,168,216,0.68)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    STATUT
                  </div>
                  <Award size={16} color="rgba(184,168,216,0.58)" strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(184,168,216,0.44)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>
                  {L("JUSQU'À","HASTA","UP TO")}
                </div>
                <div style={{
                  fontSize:      "clamp(40px, 4vw, 56px)",
                  fontWeight:    900,
                  color:         VIOLET,
                  letterSpacing: "-2px",
                  lineHeight:    1,
                  textShadow:    "0 0 8px rgba(184,168,216,0.16), 0 0 16px rgba(184,168,216,0.07)",
                  marginBottom:  4,
                }}>
                  {money(cumulativeRewards)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modal 01 : Challenge — suit le produit sélectionné ── */}
      <PricingDetailModal
        card={activeModal === 0 ? { balance: selectedSize.bal, trailingDdPct: selectedSize.ddPct, activFeeEur: ACTIV_FEE[selectedSize.bal] } : null}
        lang={lang}
        onClose={closeModal}
      />

      {/* ── Modal 02 : Compte Reward ── */}
      <ModalShell isOpen={activeModal === 1} onClose={closeModal} titleId="m2-title">
        <Modal02 onClose={closeModal} L={L} />
      </ModalShell>

      {/* ── Modal 03 : Rewards Journey ── */}
      <ModalShell isOpen={activeModal === 2} onClose={closeModal} titleId="m3-title">
        <Modal03 onClose={closeModal} L={L} />
      </ModalShell>
    </>
  );
}
