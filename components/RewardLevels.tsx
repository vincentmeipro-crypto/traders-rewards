"use client";

// ════════════════════════════════════════════════════════════════
//  RewardLevels.tsx — Section "5 levels of Rewards" — redesign premium
//  Matrice 5 × 3 : 5 niveaux × 3 tailles (25K / 50K / 100K)
//  Source des montants : lib/rewardsData.ts (frontend uniquement)
// ════════════════════════════════════════════════════════════════

import { useState } from "react";
import RewardConditions from "./RewardConditions";
import { useLanguage } from "@/lib/LanguageContext";
import { REWARD_AMOUNTS } from "@/lib/rewardsData";

const SIZES = ["25K", "50K", "100K"] as const;


function fmtUSD(n: number) { return "$" + n.toLocaleString("en-US"); }

const AMOUNTS = REWARD_AMOUNTS as readonly (readonly number[])[];

export default function RewardLevels() {
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) =>
    isFr ? fr : isEs ? es : en;

  const R = L("RÉCOMPENSE", "RECOMPENSA", "REWARD");

  const LEVELS = [
    { num: "01", label: `${R} 1`, isTrader: false },
    { num: "02", label: `${R} 2`, isTrader: false },
    { num: "03", label: `${R} 3`, isTrader: false },
    { num: "04", label: `${R} 4`, isTrader: false },
    { num: "05", label: `${R} 5`, isTrader: true  },
  ];

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section
      id="rewards"
      aria-labelledby="rl-heading"
      style={{
        padding:         "12px 0 16px",
        scrollMarginTop: 82,
        backgroundColor: "#000000",
        position:        "relative",
        overflow:        "hidden",
      }}
    >
      {/* Halo ambiant */}
      <div aria-hidden="true" style={{
        position: "absolute", bottom: "12%", left: "50%",
        width: "min(560px, 65vw)", height: 220,
        transform: "translateX(-50%)", borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(184,135,70,0.055) 0%, transparent 70%)",
        filter: "blur(44px)", pointerEvents: "none",
      }} />

      {/* Styles */}
      <style>{`
        .rl-overview { max-width:1160px; margin:0 auto; padding:0 24px; }
        .rl-summary { position:relative; isolation:isolate; display:grid; grid-template-columns:2.4fr 1fr; gap:32px; align-items:center; margin-bottom:14px; }
        .rl-eyebrow { color:#d4a843; font-size:10px; font-weight:800; letter-spacing:3px; margin-bottom:10px; }
        .rl-summary-copy { position:relative; z-index:1; }
        .rl-summary h2 { font-size:clamp(2.4rem,3.5vw,3.5rem); line-height:1.08; letter-spacing:-2px; font-weight:900; margin:0 0 12px; color:white; }
        .rl-summary h2 span { color:#dfbf76; }
        .rl-summary p { color:#b3b5bb; font-size:15px; line-height:1.5; max-width:540px; margin:0 0 14px; }
        .rl-details { padding:9px 14px; border:1px solid #665127; border-radius:10px; background:#d4a8430c; color:#e5cc96; font:inherit; font-size:13px; cursor:pointer; }
        .rl-details:focus-visible { outline:2px solid #e5cc96; outline-offset:4px; }
        .rl-summary-image { position:absolute; right:0; top:0; display:block; width:55%; height:270px; object-fit:cover; object-position:center; pointer-events:none; z-index:0; -webkit-mask-image:linear-gradient(to right,transparent 0%,black 38%,black 85%,transparent 100%),linear-gradient(to bottom,transparent 0%,black 18%,black 62%,transparent 100%); -webkit-mask-composite:source-in; mask-image:linear-gradient(to right,transparent 0%,black 38%,black 85%,transparent 100%),linear-gradient(to bottom,transparent 0%,black 18%,black 62%,transparent 100%); mask-composite:intersect; }
        .rl-table { position:relative; z-index:1; width:100%; border-collapse:separate; border-spacing:0 6px; table-layout:fixed; }
        .rl-table caption { text-align:left; color:#a6a9b0; font-size:12px; padding-bottom:6px; }
        .rl-table thead th { color:#dfbf76; font-size:13px; letter-spacing:1px; padding:8px; }
        .rl-table thead th:first-child { text-align:left; width:28%; padding-left:18px; }
        .rl-table tbody th, .rl-table td { background:#0c0d0f; border-top:1px solid #343024; border-bottom:1px solid #343024; padding:10px 12px; line-height:1.15; }
        .rl-table tbody th { text-align:left; border-left:1px solid #343024; border-radius:12px 0 0 12px; }
        .rl-table td { text-align:center; color:white; font-size:clamp(21px,2.3vw,30px); font-weight:750; font-variant-numeric:tabular-nums; }
        .rl-table td:last-child { border-right:1px solid #343024; border-radius:0 12px 12px 0; }
        .rl-level-number { color:#dfbf76; font-size:23px; font-weight:800; margin-right:14px; }
        .rl-level-label { color:#afb2b9; font-size:11px; }
        .rl-table .rl-final-level > * { border-color:#94773b; background:#19150c; color:#e5c77e; }
        @media (max-width:759px) {
          .rl-overview { padding:0 16px; }
          .rl-summary { display:block; margin-bottom:16px; }
          .rl-summary-image { display:none; }
          .rl-summary-copy { position:relative; z-index:1; }
        .rl-summary h2 { font-size:clamp(2.1rem,7vw,2.75rem); }
          .rl-summary p { font-size:14px; margin-bottom:10px; }
          .rl-table caption { font-size:11px; line-height:1.4; }
          .rl-table thead th:first-child { width:19%; padding-left:10px; }
          .rl-table thead th { font-size:12px; padding:7px 3px; }
          .rl-table tbody th, .rl-table td { padding:13px 4px; }
          .rl-table tbody th { padding-left:10px; }
          .rl-table td { font-size:clamp(16px,4.5vw,22px); }
          .rl-level-number { margin:0; font-size:20px; }
          .rl-level-label { display:none; }
        }
        @media (min-width:760px) and (max-height:740px) {
          .rl-summary-image { height:230px; }

          .rl-table tbody th, .rl-table td { padding-top:8px; padding-bottom:8px; }
        }
        .rl-card { transition: transform 0.20s ease, box-shadow 0.20s ease; will-change: transform; }
        .rl-card:hover { transform: translateY(-3px); }
        .rl-card-5:hover { box-shadow: 0 12px 48px rgba(201,155,84,0.13), 0 0 64px rgba(0,0,0,0.60), inset 0 1px 0 rgba(255,255,255,0.025) !important; }
        .rl-info-btn { transition: background 0.15s ease, border-color 0.15s ease; }
        .rl-info-btn:hover { background: rgba(212,168,67,0.12) !important; border-color: rgba(212,168,67,0.55) !important; }
        @keyframes rl-fadein { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .rl-modal-box { animation: rl-fadein 0.18s ease both; }
      `}</style>

      <div className="rl-overview">
        <header className="rl-summary">
          <div className="rl-summary-copy">
            <div className="rl-eyebrow">{L("LES REWARDS", "LOS REWARDS", "THE REWARDS")}</div>
            <h2 id="rl-heading">{L("5 niveaux de", "5 niveles de", "5 levels of")} <span>{L("récompenses", "recompensas", "rewards")}</span></h2>
            <p>{L("Jusqu’à 5 récompenses avec le même compte. Retrouvez les plafonds par niveau et par taille de compte.", "Hasta 5 recompensas con la misma cuenta. Consulta los límites por nivel y tamaño de cuenta.", "Up to 5 rewards with the same account. Compare caps by level and account size.")}</p>
            <button className="rl-info-btn rl-details" onClick={() => setModalOpen(true)} aria-haspopup="dialog">
              {L("ⓘ Conditions et fonctionnement", "ⓘ Condiciones y funcionamiento", "ⓘ Conditions and how it works")}
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rl-summary-image" src="/IMAGE PARCOURS.png" alt="" />
        </header>
        <table className="rl-table">
          <caption>{L("Plafonds bruts en USD · 90 % versés au trader · sous conditions", "Límites brutos en USD · 90 % para el trader · sujetos a condiciones", "Gross caps in USD · 90% paid to the trader · subject to conditions")}</caption>
          <thead><tr>
            <th scope="col">{L("Niveau", "Nivel", "Level")}</th>
            {SIZES.map(size => <th scope="col" key={size}>{size}</th>)}
          </tr></thead>
          <tbody>
            {LEVELS.map((level, li) => (
              <tr key={level.num} className={level.isTrader ? "rl-final-level" : undefined}>
                <th scope="row"><span className="rl-level-number">{level.num}</span><span className="rl-level-label">{level.label}</span></th>
                {SIZES.map((size, si) => <td key={size}>{fmtUSD(AMOUNTS[si][li])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* ════════════════════════════════════════════════════════
          MODALE — Comment fonctionnent les Récompenses ?
          ════════════════════════════════════════════════════ */}
      {modalOpen && <RewardConditions onClose={() => setModalOpen(false)} />}
    </section>
  );
}
