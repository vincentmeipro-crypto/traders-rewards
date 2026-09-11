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
import { REWARD_AMOUNTS, SIZES_DATA, QUAL_DAY_USD } from "@/lib/rewardsData";
import { useSizeSync } from "@/lib/SizeSyncContext";
import PricingDetailModal from "./PricingDetailModal";

// ── Palette & helpers ─────────────────────────────────────────
const ACCENT  = "#D4A843";
const ORANGE  = "#f97316";
const GREEN   = "#8FC9A3";
const VIOLET  = "#B8A8D8";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// ── Données contractuelles (importées de lib/rewardsData) ─────
const ACTIV_FEE: Record<number, number> = { 25000: 99, 50000: 99, 100000: 149 };

// Plancher fixe après première Reward = capital nominal
const FIXED_FLOOR: Record<string, string> = { "25K": "$25,000", "50K": "$50,000", "100K": "$100,000" };
// Plancher EOD maximum avant première Reward (Trailing DD EOD)
const MAX_EOD_FLOOR: Record<string, string> = { "25K": "$26,000", "50K": "$52,000", "100K": "$103,000" };

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
        border: "1px solid rgba(184,135,70,0.35)",
        background: "rgba(184,135,70,0.07)",
        color: ACCENT, fontSize: 9, fontWeight: 900, fontStyle: "normal",
        cursor: "pointer", display: "grid", placeItems: "center",
        fontFamily: "inherit", flexShrink: 0, transition: "all 0.16s ease",
      }}
      onMouseEnter={e => { const b = e.currentTarget; b.style.background = "rgba(184,135,70,0.18)"; b.style.borderColor = "rgba(184,135,70,0.65)"; }}
      onMouseLeave={e => { const b = e.currentTarget; b.style.background = "rgba(184,135,70,0.07)"; b.style.borderColor = "rgba(184,135,70,0.35)"; }}
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
          border: "1px solid rgba(184,135,70,0.22)", borderRadius: 24,
          maxWidth: 880, width: "100%", maxHeight: "88vh",
          overflowY: "auto", position: "relative",
          boxShadow: "0 40px 120px rgba(0,0,0,0.90), 0 0 60px rgba(184,135,70,0.07)",
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
function Modal02({ onClose, L, selectedSize }: {
  onClose: () => void;
  L: (fr: string, es: string, en: string) => string;
  selectedSize: typeof SIZES_DATA[number];
}) {
  const rewardOne = selectedSize.rewardCaps[0];
  return (
    <div>
      {/* Header */}
      <div style={{ padding: "28px 28px 20px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: ACCENT, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 7 }}>
          {L("Niveau 02","Nivel 02","Level 02")} · {L("Qualification Reward","Qualification Reward","Reward Qualification")}
        </div>
        <h2 id="m2-title" style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 900, color: "#FFF", letterSpacing: "-0.8px", lineHeight: 1, margin: "0 0 6px" }}>
          {L("Debloquez votre premiere Reward","Desbloquee su primera Reward","Unlock your first Reward")}
        </h2>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.36)", margin: 0 }}>
          {L("5 journees qualifiantes · consistance 50 % · paiement 48H",
             "5 dias calificados · consistencia 50 % · pago 48H",
             "5 qualifying days · 50% consistency · 48H payment")}
        </p>
      </div>

      <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Regles */}
        <div>
          <h3 style={modalSecTitle}>{L("Regles de qualification","Reglas de calificacion","Qualification Rules")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            {[
              { label: L("Jours qualifiants","Dias calificados","Qualifying days"), val: L("5 min","5 min","5 min"), note: L("Journees avec profit >= seuil","Dias con beneficio >= umbral","Days with profit >= threshold"), color: ACCENT },
              { label: L("Consistance","Consistencia","Consistency"), val: "50%", note: L("Meilleure journee <= 50% du profit total","Mejor dia <= 50% del beneficio total","Best day <= 50% of total profit"), color: ACCENT },
              { label: L("Retrait minimum","Retiro minimo","Minimum withdrawal"), val: "$100", note: L("Libre de retirer de $100 jusqu'au plafond","Libre de retirar de $100 hasta el limite","Free to withdraw from $100 up to the cap"), color: GREEN },
              { label: L("Duree","Duracion","Duration"), val: L("Illimitee","Ilimitada","Unlimited"), note: L("Pas d'expiration","Sin expiracion","No expiration"), color: "rgba(255,255,255,0.35)" },
            ].map((r, i) => (
              <div key={i} style={{ ...infoBox, borderLeft: `2px solid ${r.color}33` }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>{r.label}</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#FFF", marginBottom: 3 }}>{r.val}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", lineHeight: 1.4 }}>{r.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seuils journee qualifiante */}
        <div>
          <h3 style={modalSecTitle}>{L("Seuils journee qualifiante","Umbrales dia calificado","Qualifying Day Thresholds")}</h3>
          <p style={modalBodyTxt}>
            {L(
              "Une journee est qualifiante uniquement si le profit de cloture est superieur ou egal au seuil minimum applicable a votre compte. Une journee positive inferieure au seuil ne compte pas.",
              "Un dia califica solo si el beneficio de cierre es igual o superior al umbral minimo del tamano de cuenta. Un dia positivo por debajo del umbral no cuenta.",
              "A day qualifies only if the closing profit meets or exceeds the minimum threshold for your account size. A profitable day below the threshold does not count."
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { size: "25K",  min: 100 },
              { size: "50K",  min: 250 },
              { size: "100K", min: 300 },
            ].map((row, i) => (
              <div key={i} style={infoBox}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>{row.size}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: "#FFF", marginBottom: 3 }}>+{fmt(row.min)}<span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 500 }}>/jour</span></div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", lineHeight: 1.4 }}>{L("Profit minimum par journee qualifiante","Beneficio minimo por dia calificado","Minimum profit per qualifying day")}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trailing DD + verrou */}
        <div>
          <h3 style={modalSecTitle}>{L("PLANCHER DD EOD - AVANT ET APRES PREMIERE REWARD","TRAILING DRAWDOWN EOD - ANTES Y DESPUES DE LA PRIMERA RECOMPENSA","TRAILING EOD DD - BEFORE AND AFTER YOUR FIRST REWARD")}</h3>
          <p style={modalBodyTxt}>
            {L(
              "Avant votre premiere Reward, le plancher suit la progression de votre compte (Trailing DD EOD). Une fois votre premiere Reward effectuee, le plancher devient definitivement fixe au capital nominal de votre compte.",
              "Antes de su primera Recompensa, el piso sigue la progresion de su cuenta (Trailing DD EOD). Una vez realizada su primera Recompensa, el piso queda definitivamente fijo en el capital nominal de su cuenta.",
              "Before your first Reward, the floor follows your account's progression (Trailing DD EOD). Once your first Reward is made, the floor becomes permanently fixed at your account's nominal capital."
            )}
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {SIZES_DATA.map((s, i) => (
              <div key={i} style={infoBox}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
                {[
                  [L("Capital initial","Capital inicial","Starting capital"), fmt(s.bal), false],
                  [L("Plancher initial","Piso inicial","Initial floor"), fmt(s.floorStart), false],
                  [L("Plancher EOD maximum (avant Reward #1)","Piso EOD maximo (antes Reward #1)","Max EOD floor (before Reward #1)"), MAX_EOD_FLOOR[s.label], true],
                  [L("Plancher fixe (apres premiere Reward)","Piso fijo (despues de la primera Recompensa)","Fixed floor (after first Reward)"), FIXED_FLOOR[s.label], true],
                ].map(([k, v, gold], j) => (
                  <div key={j} style={{ display: "flex", justifyContent: "space-between", padding: "2.5px 0",
                    borderBottom: j < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.38)", fontWeight: 500 }}>{k as string}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: gold ? ACCENT : "#FFF" }}>{v as string}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.30)", marginTop: 10, lineHeight: 1.5 }}>
            {L(
              "Le plancher EOD maximum n'est pas un objectif obligatoire. Le Trailing DD EOD cesse simplement de remonter une fois ce niveau atteint.",
              "El piso EOD maximo no es un objetivo obligatorio. El Trailing DD EOD simplemente deja de subir una vez alcanzado este nivel.",
              "The max EOD floor is not a mandatory objective. The Trailing DD EOD simply stops rising once this level is reached."
            )}
          </p>
        </div>

        {/* Rewards disponibles */}
        <div>
          <h3 style={modalSecTitle}>{L("Premiere Reward disponible","Primera Reward disponible","First Reward available")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {SIZES_DATA.map((s, i) => (
              <div key={i} style={{ ...infoBox, textAlign: "center" }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT }}>{fmt(s.rewardCaps[0])}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.30)", marginTop: 2 }}>{L("plafond maximum Reward #1","limite maximo Reward #1","Reward #1 maximum cap")}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10.5, color: "rgba(255,255,255,0.30)", marginTop: 8, lineHeight: 1.5 }}>
            {L(
              "Vous pouvez demander de 100 $ jusqu'au plafond du niveau. Le montant effectif est limite au profit disponible depuis la derniere Reward.",
              "Puede solicitar desde $100 hasta el limite del nivel. El importe efectivo se limita al beneficio disponible desde la ultima Recompensa.",
              "You can request from $100 up to the level cap. The actual amount is limited to the profit available since the last Reward."
            )}
          </p>
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

// ── Modal 03 : Rewards #2 → #5 ───────────────────────────────
function Modal03({ onClose, L }: { onClose: () => void; L: (fr: string, es: string, en: string) => string }) {
  // Exemple 50K apres Reward #1 (500$ verses)
  // Hypothese : solde avant R#1 = 51 250 $, R#1 demandee = 500 $
  // Solde apres R#1 = 50 750 $, plancher fixe = 50 000 $, coussin = 750 $
  const BALANCE_AFTER_R1 = 50_750;
  const FIXED_FLOOR_50K  = 50_000;
  const CAP_R2_50K       = 750; // plafond Reward #2 — 50K

  // 3 exemples apres le nouveau cycle de 5 jours qualifiants
  const cases = [
    {
      label:   L("CAS A — RETRAIT MAXIMUM","CASO A — RETIRO MAXIMO","CASE A — MAXIMUM WITHDRAWAL"),
      balance: BALANCE_AFTER_R1 + 800, // 51 550 $ (bon parcours)
      reward:  Math.min(800, CAP_R2_50K), // 750 (plafond atteint)
      floor:   FIXED_FLOOR_50K,
      note:    L("Plafond Reward #2 applique — $50 conserves","Limite Reward #2 aplicado — $50 conservados","Reward #2 cap applied — $50 stays in account"),
      noteColor: ACCENT,
    },
    {
      label:   L("CAS B — RETRAIT PARTIEL","CASO B — RETIRO PARCIAL","CASE B — PARTIAL WITHDRAWAL"),
      balance: BALANCE_AFTER_R1 + 400, // 51 150 $
      reward:  250, // retrait partiel choisi
      floor:   FIXED_FLOOR_50K,
      note:    L("Retrait libre — coussin conserve plus important","Retiro libre — mayor colchon conservado","Free withdrawal — larger cushion retained"),
      noteColor: GREEN,
    },
    {
      label:   L("CAS C — RETRAIT MINIMUM","CASO C — RETIRO MINIMO","CASE C — MINIMUM WITHDRAWAL"),
      balance: BALANCE_AFTER_R1 + 200, // 50 950 $
      reward:  100, // minimum
      floor:   FIXED_FLOOR_50K,
      note:    L("Retrait minimum $100 — coussin maximum preserve","Retiro minimo $100 — maximo colchon preservado","Minimum $100 withdrawal — maximum cushion preserved"),
      noteColor: GREEN,
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
            "Comment fonctionnent les Rewards #2 a #5 ?",
            "Como funcionan las Rewards #2 a #5?",
            "How do Rewards #2 to #5 work?"
          )}
        </h2>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.36)", margin: 0 }}>
          {L(
            "Nouveau cycle apres chaque Reward · 5 nouveaux jours qualifiants · plancher fixe · min. $100",
            "Nuevo ciclo tras cada Recompensa · 5 nuevos dias calificados · piso fijo · min. $100",
            "New cycle after each Reward · 5 new qualifying days · fixed floor · min. $100"
          )}
        </p>
      </div>

      <div style={{ padding: "22px 28px 28px", display: "flex", flexDirection: "column", gap: 22 }}>

        {/* ── Section 1 : Nouveau cycle ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("1 · Un nouveau cycle apres chaque Reward","1 · Un nuevo ciclo tras cada Recompensa","1 · A new cycle after each Reward")}
          </h3>
          <p style={modalBodyTxt}>
            {L(
              "Apres chaque Reward versee, le compteur de jours qualifiants repart a zero. Vous devez realiser 5 nouveaux jours qualifiants en respectant la consistance de 50 % pour debloquer la suivante. Les jours qualifiants utilises ne sont pas reportes.",
              "Tras cada Recompensa pagada, el contador de dias calificados vuelve a cero. Debe realizar 5 nuevos dias calificados respetando la consistencia del 50 % para desbloquear la siguiente. Los dias utilizados no se transfieren.",
              "After each Reward is paid, the qualifying day counter resets to zero. You must complete 5 new qualifying days while respecting the 50% consistency rule to unlock the next one. Used days do not carry over."
            )}
          </p>
          {/* Chaine cycles */}
          <div style={{ background: "rgba(184,135,70,0.025)", border: "1px solid rgba(184,135,70,0.14)", borderRadius: 10, padding: "12px 14px" }}>
            {[1, 2, 3, 4, 5].map((n, i) => (
              <div key={n}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    minWidth: 28, height: 28, borderRadius: "50%",
                    border: "1px solid rgba(212,168,67,0.40)", background: "rgba(212,168,67,0.07)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, color: ACCENT, flexShrink: 0,
                  }}>R{n}</div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.60)", lineHeight: 1.4 }}>
                    {n === 1
                      ? L("5 jours qualifiants · consistance 50 %","5 dias calificados · consistencia 50 %","5 qualifying days · 50% consistency")
                      : L("5 nouveaux jours qualifiants · consistance 50 %","5 nuevos dias calificados · consistencia 50 %","5 new qualifying days · 50% consistency")
                    }
                  </span>
                </div>
                {i < 4 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0 4px 12px" }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.20)" }}>|</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", letterSpacing: "0.5px" }}>
                      {L(`Reward #${n} payee — compteur remis a zero`,`Recompensa #${n} pagada — contador a cero`,`Reward #${n} paid — counter reset`)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Section 2 : Montant de la Reward ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("2 · Montant de la Reward","2 · Importe de la Reward","2 · Reward amount")}
          </h3>
          <p style={{ ...modalBodyTxt, marginBottom: 10 }}>
            {L(
              "Vous choisissez librement le montant a demander, a partir d'un minimum de 100 $. Seul le profit realise depuis la Reward precedente est pris en compte. Le montant verse est le plus petit des deux valeurs suivantes :",
              "Elige libremente el importe a solicitar, a partir de un minimo de $100. Solo se tiene en cuenta el beneficio realizado desde la ultima Recompensa. El importe pagado es el menor de los dos valores siguientes:",
              "You freely choose the amount to request, starting from a minimum of $100. Only the profit earned since the previous Reward counts. The amount paid is whichever is lower:"
            )}
          </p>
          <div style={{ background: "rgba(143,201,163,0.04)", border: "1px solid rgba(143,201,163,0.16)", borderRadius: 10, padding: "12px 16px", textAlign: "center" }}>
            <span style={{ fontSize: 14, fontWeight: 900, color: GREEN, letterSpacing: "-0.3px" }}>
              {L(
                "Reward = montant demande (min $100), dans la limite : profit disponible et plafond du niveau",
                "Recompensa = importe solicitado (min $100), dentro del limite : beneficio disponible y tope del nivel",
                "Reward = requested amount (min $100), limited to: available profit and level cap"
              )}
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.32)", marginTop: 10, lineHeight: 1.55 }}>
            {L(
              "Apres versement : balance = balance − Reward demandee. Le plancher reste fixe a votre capital nominal. Aucun reset automatique.",
              "Tras el pago : balance = balance − Recompensa solicitada. El piso permanece fijo en su capital nominal. Sin reset automatico.",
              "After payment: balance = balance − requested Reward. The floor stays fixed at your nominal capital. No automatic reset."
            )}
          </p>
        </div>

        {/* ── Section 3 : 3 cas — 50K, Reward #2 ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("3 · Exemple 50K — Reward #2 (apres R#1 = 500 $)","3 · Ejemplo 50K — Reward #2 (tras R#1 = 500 $)","3 · 50K example — Reward #2 (after R#1 = $500)")}
          </h3>
          <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", margin: "0 0 12px", lineHeight: 1.5 }}>
            {L(
              "Solde apres Reward #1 : 50 750 $ · Plancher fixe : 50 000 $ · Plafond Reward #2 : 750 $ · 5 nouveaux jours qualifiants effectues",
              "Saldo tras Recompensa #1 : 50 750 $ · Piso fijo : 50 000 $ · Limite Recompensa #2 : 750 $ · 5 nuevos dias calificados realizados",
              "Balance after Reward #1: $50,750 · Fixed floor: $50,000 · Reward #2 cap: $750 · 5 new qualifying days completed"
            )}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {cases.map((c, i) => {
              const after = c.balance - c.reward;
              const cushion = after - c.floor;
              return (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 8 }}>
                    {c.label}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                    {[
                      { lbl: L("Balance","Balance","Balance"),       val: fmt(c.balance), col: "#FFF" },
                      { lbl: L("Reward demandee","Recompensa","Reward"), val: fmt(c.reward),  col: GREEN },
                      { lbl: L("Balance apres","Balance tras","Balance after"), val: fmt(after),   col: "#FFF" },
                      { lbl: L("Coussin","Colchon","Cushion"),        val: fmt(cushion),  col: ACCENT },
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
                  <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: c.noteColor, opacity: 0.85 }}>
                    {c.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Section 4 : Plafonds Rewards #1→#5 ── */}
        <div>
          <h3 style={modalSecTitle}>
            {L("4 · Plafonds Rewards #1 → #5","4 · Topes Rewards #1 → #5","4 · Reward #1 → #5 caps")}
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
                {[0, 1, 2, 3, 4].map(lv => {
                  const isTrader = lv === 4;
                  return (
                    <tr key={lv} style={{
                      borderBottom: lv < 4 ? "1px solid rgba(255,255,255,0.055)" : "none",
                      background: isTrader ? "rgba(184,135,70,0.05)" : "transparent",
                    }}>
                      <td style={{ padding: "8px 8px", fontWeight: 700, color: isTrader ? ACCENT : "rgba(255,255,255,0.60)", fontSize: 11.5, whiteSpace: "nowrap" }}>
                        {isTrader ? L("★ Reward #5 (TRADER REWARD)","★ Recompensa #5 (TRADER REWARD)","★ Reward #5 (TRADER REWARD)") : `Reward #${lv + 1}`}
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
              "Ces montants sont des plafonds maximums. Vous choisissez librement le montant a demander a partir de 100 $, dans la limite du profit disponible et du plafond du niveau.",
              "Estos importes son topes maximos. Elige libremente el importe a solicitar desde $100, dentro del limite del beneficio disponible y del tope del nivel.",
              "These are maximum caps. You freely choose the amount to request from $100, within the available profit and the level cap."
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

  const { selectedSizeIndex, setSelectedSizeIndex } = useSizeSync();
  const selectedSize = SIZES_DATA[selectedSizeIndex as 0 | 1 | 2];
  const rewardOne = selectedSize.rewardCaps[0];
  const cumulativeRewards = (selectedSize.rewardCaps as readonly number[]).reduce((a, v) => a + v, 0);
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
    border:        `1px solid ${accent ? "rgba(184,135,70,0.40)" : "rgba(255,255,255,0.09)"}`,
    background:    accent
      ? "linear-gradient(155deg, #181a1c 0%, #0f1215 100%)"
      : "linear-gradient(155deg, #141414 0%, #0c0c0e 100%)",
    boxShadow: accent
      ? "0 28px 70px rgba(0,0,0,0.80), 0 0 32px rgba(184,135,70,0.10)"
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
          background: "radial-gradient(ellipse, rgba(184,135,70,0.04), transparent 65%)",
          filter: "blur(20px)", pointerEvents: "none",
        }} />

        <div style={{ maxWidth: 1160, margin: "0 auto", position: "relative", zIndex: 1 }}>

          {/* ── Titre ── */}
          <div style={{ textAlign: "center", marginBottom: isMobile ? 24 : 18 }}>
            <h2 id="j3l-heading" style={{
              fontSize:      isMobile ? "clamp(2.1rem, 7vw, 2.75rem)" : "clamp(2.4rem, 3.5vw, 3.5rem)",
              fontWeight:    900,
              color:         "#FFFFFF",
              letterSpacing: "0.5px",
              lineHeight:    1.05,
              margin:        "0 0 12px",
            }}>
              {L("De Challenger a","De Challenger a","From Challenger to")}{" "}
              <span style={{ color: "#FFFFFF" }}>
                Trader Reward
              </span>
            </h2>
            {/* Selecteur des trois produits */}
            <div role="group" aria-label={L("Taille du compte","Tamano de la cuenta","Account size")} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: 4, borderRadius: 24,
              border: "1px solid rgba(184,135,70,0.18)",
              background: "rgba(255,255,255,0.025)",
            }}>
              {(SIZES_DATA as readonly { label: string }[]).map((size, index) => {
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
                      border: selected ? "1px solid rgba(184,135,70,0.52)" : "1px solid transparent",
                      background: selected ? "rgba(184,135,70,0.16)" : "transparent",
                      color: selected ? ACCENT : "rgba(255,255,255,0.42)",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: "1.4px",
                      cursor: "pointer",
                      fontFamily: "inherit",
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
                background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.012), transparent 50%)" }} />

              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
                <div style={{ ...secLabel, marginBottom: 0, color: "rgba(255,255,255,0.38)" }}>NIVEAU 01</div>
                <InfoBtn
                  btnRef={triggerRefs[0] as InfoBtnRef}
                  onClick={() => openModal(0)}
                  label={L("Details du Challenge","Detalles del Challenge","Challenge details")}
                />
              </div>

              {/* Nom du niveau */}
              <div style={{ fontSize: isMobile ? 30 : 28, fontWeight: 900, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1, marginBottom: 14, position: "relative" }}>
                CHALLENGER
              </div>

              {/* Validation */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, position: "relative" }}>
                <CircleCheck size={15} color="rgba(255,255,255,0.40)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.2px" }}>
                  {L("Validez votre Challenge","Valide su Challenge","Pass your Challenge")}
                </span>
              </div>

              {/* +6% */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12, position: "relative" }}>
                <span style={{ fontSize: 28, fontWeight: 900, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1 }}>+6%</span>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: 20 }} />

              {/* Benefice final — bloc premium */}
              <div style={{
                position:     "relative",
                background:   "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                border:       "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding:      "11px 14px",
                minHeight:    150,
                boxSizing:    "border-box",
                boxShadow:    "0 2px 12px rgba(0,0,0,0.30)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    CHALLENGE
                  </div>
                  <CircleCheck size={16} color="rgba(255,255,255,0.22)" strokeWidth={1.8} />
                </div>
                <div aria-hidden="true" style={{ fontSize: 9, fontWeight: 700, visibility: "hidden", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>
                  {L("JUSQU'A","HASTA","UP TO")}
                </div>
                <div style={{
                  fontSize:      "clamp(36px, 3.6vw, 50px)",
                  fontWeight:    900,
                  color:         "#FFFFFF",
                  letterSpacing: "-1.5px",
                  lineHeight:    1,
                  textShadow:    "0 0 8px rgba(184,135,70,0.16), 0 0 16px rgba(184,135,70,0.07)",
                }}>
                  {L("VALIDE !","VALIDADO!","PASSED!")}
                </div>
              </div>
            </div>

            {/* Arrow 1→2 */}
            {!isMobile && <Arrow />}

            {/* ── CARTE 02 : PREMIERE REWARD ── */}
            <div style={cardBase(false)}>
              {/* Glow */}
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
                background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.015), transparent 52%)" }} />

              {/* Zone superieure */}
              <div>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
                  <div style={{ ...secLabel, marginBottom: 0, color: "rgba(255,255,255,0.38)" }}>NIVEAU 02</div>
                  <InfoBtn
                    btnRef={triggerRefs[1] as InfoBtnRef}
                    onClick={() => openModal(1)}
                    label={L("Details du Compte Reward","Detalles del Compte Reward","Compte Reward details")}
                  />
                </div>

                {/* Nom du niveau */}
                <div style={{ fontSize: isMobile ? 30 : 28, fontWeight: 900, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1, marginBottom: 14, position: "relative" }}>
                  COMPTE REWARD
                </div>

                {/* Promesse du niveau */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, position: "relative" }}>
                  <DollarSign size={15} color="rgba(255,255,255,0.40)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.2px" }}>
                    {L("Debloquez votre Reward #1","Desbloquee su Reward #1","Unlock your Reward #1")}
                  </span>
                </div>

              </div>{/* /zone superieure */}

              {/* Delai de traitement */}
              <div style={{ marginTop: 48, position: "relative" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.20)", borderRadius: 100, padding: "6px 12px" }}>
                  <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 900, lineHeight: 1 }}>✓</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#22c55e", letterSpacing: "0.5px" }}>
                    {L("Reward Paye en Automatique en 48H","Reward Pagada Automaticamente en 48H","Reward Paid Automatically in 48H")}
                  </span>
                </span>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: 20 }} />

              {/* Benefice final — meme format que les autres niveaux */}
              <div style={{
                position:     "relative",
                background:   "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                border:       "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding:      "11px 14px",
                minHeight:    150,
                boxSizing:    "border-box",
                boxShadow:    "0 2px 12px rgba(0,0,0,0.30)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    REWARD #1
                  </div>
                  <BadgeDollarSign size={16} color="rgba(255,255,255,0.22)" strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>
                  {L("JUSQU'A","HASTA","UP TO")}
                </div>
                <div style={{
                  fontSize:      "clamp(40px, 4vw, 56px)",
                  fontWeight:    900,
                  color:         "#FFFFFF",
                  letterSpacing: "-2px",
                  lineHeight:    1,
                  textShadow:    "0 0 8px rgba(184,135,70,0.35), 0 0 20px rgba(184,135,70,0.18)",
                }}>
                  {money(rewardOne)}
                </div>
              </div>
            </div>

            {/* Arrow 2→3 */}
            {!isMobile && <Arrow />}

            {/* ── CARTE 03 : REWARDS SUIVANTES ── */}
            <div style={cardBase(false)}>
              {/* Glow */}
              <div aria-hidden="true" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
                background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.012), transparent 50%)" }} />

              {/* Zone superieure */}
              <div>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, position: "relative" }}>
                  <div style={{ ...secLabel, marginBottom: 0, color: "rgba(255,255,255,0.38)" }}>NIVEAU 03</div>
                  <InfoBtn
                    btnRef={triggerRefs[2] as InfoBtnRef}
                    onClick={() => openModal(2)}
                    label={L("Details du parcours Rewards","Detalles del recorrido Rewards","Rewards journey details")}
                  />
                </div>

                {/* Nom du niveau */}
                <div style={{ fontSize: isMobile ? 30 : 28, fontWeight: 900, color: "#FFFFFF", letterSpacing: "-1px", lineHeight: 1, marginBottom: 10, position: "relative" }}>
                  TRADER REWARD
                </div>

                {/* Sous-titre */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, position: "relative" }}>
                  <Award size={15} color="rgba(255,255,255,0.40)" strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.2px" }}>
                    {L("Multipliez vos Rewards","Multiplique sus Rewards","Multiply your Rewards")}
                  </span>
                </div>

                {/* Progression secondaire */}
                <div style={{ marginBottom: 8, position: "relative" }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.40)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 3 }}>
                    REWARDS
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.72)", letterSpacing: "-1px", lineHeight: 1 }}>
                    #2 → #5
                  </div>
                </div>

              </div>{/* /zone superieure */}

              {/* Reward auto 48H — aligne avec le niveau 02 */}
              <div style={{ marginTop: 12, position: "relative" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.20)", borderRadius: 100, padding: "6px 12px" }}>
                  <span style={{ fontSize: 10, color: "#22c55e", fontWeight: 900, lineHeight: 1 }}>✓</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#22c55e", letterSpacing: "0.5px" }}>
                    {L("Reward Paye en Automatique en 48H","Reward Pagada Automaticamente en 48H","Reward Paid Automatically in 48H")}
                  </span>
                </span>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: 12 }} />

              {/* Bloc final */}
              <div style={{
                position:     "relative",
                background:   "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                border:       "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                padding:      "11px 14px",
                minHeight:    150,
                boxSizing:    "border-box",
                boxShadow:    "0 2px 12px rgba(0,0,0,0.30)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.30)", letterSpacing: "2px", textTransform: "uppercase" }}>
                    STATUT
                  </div>
                  <Award size={16} color="rgba(255,255,255,0.22)" strokeWidth={1.8} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 5 }}>
                  {L("JUSQU'A","HASTA","UP TO")}
                </div>
                <div style={{
                  fontSize:      "clamp(40px, 4vw, 56px)",
                  fontWeight:    900,
                  color:         "#FFFFFF",
                  letterSpacing: "-2px",
                  lineHeight:    1,
                  textShadow:    "0 0 8px rgba(184,135,70,0.16), 0 0 16px rgba(184,135,70,0.07)",
                  marginBottom:  4,
                }}>
                  {money(cumulativeRewards)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modal 01 : Challenge — suit le produit selectionne ── */}
      <PricingDetailModal
        card={activeModal === 0 ? { balance: selectedSize.bal, trailingDdPct: selectedSize.ddPct, activFeeEur: ACTIV_FEE[selectedSize.bal], qualDayUsd: QUAL_DAY_USD[selectedSizeIndex as 0|1|2] } : null}
        lang={lang}
        onClose={closeModal}
      />

      {/* ── Modal 02 : Compte Reward ── */}
      <ModalShell isOpen={activeModal === 1} onClose={closeModal} titleId="m2-title">
        <Modal02 onClose={closeModal} L={L} selectedSize={selectedSize} />
      </ModalShell>

      {/* ── Modal 03 : Rewards Journey ── */}
      <ModalShell isOpen={activeModal === 2} onClose={closeModal} titleId="m3-title">
        <Modal03 onClose={closeModal} L={L} />
      </ModalShell>
    </>
  );
}
