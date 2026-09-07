"use client";

/**
 * TRADERS REWARDS — Outils Trader
 *
 * Phase 2 — R:R Calculator v3
 *
 * Architecture :
 *   - Specs instruments : lib/instrument-specs.ts (source unique de vérité)
 *   - Aucune saisie manuelle de pip value — tout calculé automatiquement
 *   - Aucune connexion MT5. Aucun SQL. Purement client-side.
 *   - Formules DD identiques à TraderCockpit.tsx.
 */

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AlertTriangle, Check, Info } from "lucide-react";
import EconomicCalendar from "./EconomicCalendar";
import type { CockpitChallenge } from "./TraderCockpit";
import {
  INSTRUMENT_SPECS,
  getSpec,
  calcTradeRisk,
  hasMonetaryCalc,
  calcChallengeMargins,
  calcLotSize,
  type LotSizeResult,
} from "@/lib/instrument-specs";
import styles from "./CockpitTools.module.css";

export type TradingSection = "prepare" | "rr" | "lot" | "calendar";

/** Statuts de risque — partagés entre RRCalculator et RISK_STATUS_CONFIG. */
type RiskStatus = "CONFORTABLE" | "MODÉRÉ" | "ATTENTION" | "CRITIQUE" | "LIMITE DÉPASSÉE";

type Props = {
  challenge:      CockpitChallenge;
  isFr:           boolean;
  isEs?:          boolean;
  isMobile:       boolean;
  section:        TradingSection;
  onSection:      (s: TradingSection) => void;
  planChecks:     boolean[];
  setPlanChecks:  Dispatch<SetStateAction<boolean[]>>;
  journalNote:    string;
  setJournalNote: Dispatch<SetStateAction<string>>;
};

const BLUE  = "rgba(255,255,255,0.65)";
const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED   = "#ef4444";

// ── Helpers ───────────────────────────────────────────────────────────────────

function money(v: number, d = 0) {
  return `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })}`;
}

function pct(v: number, d = 1) {
  return `${v.toFixed(d)}%`;
}

function clamp01(v: number) {
  return Math.min(100, Math.max(0, v));
}

/** Formate un nombre de pips/points avec le bon nombre de décimales. */
function fmtPips(n: number): string {
  if (n >= 10000) return Math.round(n).toLocaleString("en-US");
  if (n >= 100)   return Math.round(n).toString();
  if (n >= 10)    return n.toFixed(1);
  return n.toFixed(2);
}

/** Formate la valeur pip pour les lots donnés. */
function fmtPipValue(v: number): string {
  if (v >= 100)  return money(v, 0);
  if (v >= 10)   return money(v, 2);
  if (v >= 1)    return money(v, 2);
  if (v >= 0.1)  return `$${v.toFixed(3)}`;
  return `$${v.toFixed(4)}`;
}

// ── UI atoms ──────────────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
      {hint && <div className={styles.fieldHint}>{hint}</div>}
    </div>
  );
}

function PriceInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className={styles.fieldWrap}>
      <input
        type="number"
        step="any"
        inputMode="decimal"
        className={styles.fieldInput}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "0.00000"}
      />
    </div>
  );
}

function MiniMeter({ value, color = BLUE }: { value: number; color?: string }) {
  return (
    <div className={styles.miniMeter}>
      <div
        className={styles.miniMeterFill}
        style={{ width: `${clamp01(value)}%`, background: color }}
      />
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  R:R CALCULATOR v3
//  Entrées : Actif + Direction + Entrée + SL + TP + Lots
//  Calcul automatique : risque $, gain $, impact challenge
//  Source des specs : lib/instrument-specs.ts
// ═════════════════════════════════════════════════════════════════════════════

function RRCalculator({
  challenge,
  isFr,
  isEs = false,
  isMobile,
}: {
  challenge: CockpitChallenge;
  isFr:      boolean;
  isEs?:     boolean;
  isMobile:  boolean;
}) {
  const R = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const [symbol,    setSymbol]    = useState("EURUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [entry,     setEntry]     = useState("");
  const [sl,        setSl]        = useState("");
  const [tp,        setTp]        = useState("");
  const [lots,      setLots]      = useState("0.10");

  const spec = getSpec(symbol);

  // ── Calcul ─────────────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const e = parseFloat(entry);
    const s = parseFloat(sl);
    const t = tp !== "" ? parseFloat(tp) : null;
    const l = parseFloat(lots);

    if (isNaN(e) || isNaN(s) || !e || !s) return null;
    if (isNaN(l) || l <= 0)               return null;

    const slDist = Math.abs(e - s);
    if (slDist < 1e-10) return null;

    // ── Validations direction ──────────────────────────────────────────────────
    const slOnWrongSide = direction === "BUY" ? s >= e : s <= e;
    const tpOnWrongSide = t != null && !isNaN(t)
      ? (direction === "BUY" ? t <= e : t >= e)
      : false;

    // TP distance (null si mauvais côté)
    const tpDist  = t != null && !isNaN(t) && !tpOnWrongSide ? Math.abs(t - e) : null;
    const rrRatio = tpDist != null && tpDist > 0 ? tpDist / slDist : null;

    // ── Calcul monetaire via specs ─────────────────────────────────────────────
    const currentSpec  = getSpec(symbol);
    const canCalcMoney = currentSpec != null && hasMonetaryCalc(currentSpec);

    let slPips:          number | null = null;
    let tpPips:          number | null = null;
    let lossUsd:         number | null = null;
    let gainUsd:         number | null = null;
    let pipValueForLots: number | null = null;

    if (canCalcMoney && currentSpec) {
      const slCalc = calcTradeRisk(currentSpec, l, slDist);
      slPips          = slCalc.pips;
      lossUsd         = slCalc.amountUsd;
      pipValueForLots = slCalc.pipValueForLots;

      if (tpDist != null) {
        const tpCalc = calcTradeRisk(currentSpec, l, tpDist);
        tpPips  = tpCalc.pips;
        gainUsd = tpCalc.amountUsd;
      }
    }

    // ── Formules DD — via calcChallengeMargins() (source de vérité partagée) ──
    const {
      equity, isOneStep,
      dailyBuffer, dailyFloor, dailyLimitUsd,
      totalBuffer, totalFloor, totalLimitUsd,
    } = calcChallengeMargins(challenge);

    // ── Impact après SL ────────────────────────────────────────────────────────
    let dailyBufferAfterSL: number | null = null;
    let totalBufferAfterSL: number | null = null;
    let dailyImpactPct:     number | null = null;
    let totalImpactPct:     number | null = null;
    let dailyViolation    = false;
    let totalViolation    = false;
    // ── Statut de risque (formule simulateur : % de la limite DD consommée) ──
    let equityAfterSL:    number | null = null;
    let dailyUsedAfterSL: number | null = null;
    let totalUsedAfterSL: number | null = null;
    let worstUsedPct:     number | null = null;
    let riskStatus:       RiskStatus | null = null;

    if (lossUsd != null) {
      equityAfterSL      = equity - lossUsd;
      dailyBufferAfterSL = Math.max(0, equityAfterSL - dailyFloor);
      totalBufferAfterSL = Math.max(0, equityAfterSL - totalFloor);
      // Impact = part de la marge RESTANTE consommée par ce trade
      dailyImpactPct     = dailyBuffer > 0 ? lossUsd / dailyBuffer * 100 : 0;
      totalImpactPct     = totalBuffer > 0 ? lossUsd / totalBuffer * 100 : 0;
      dailyViolation     = equityAfterSL < dailyFloor;
      totalViolation     = equityAfterSL < totalFloor;
      // % de la limite DD totale consommée après SL
      dailyUsedAfterSL   = dailyLimitUsd > 0
        ? (1 - dailyBufferAfterSL / dailyLimitUsd) * 100 : 0;
      totalUsedAfterSL   = totalLimitUsd > 0
        ? (1 - totalBufferAfterSL / totalLimitUsd) * 100 : 0;
      worstUsedPct       = Math.max(dailyUsedAfterSL, totalUsedAfterSL);
      riskStatus         =
        worstUsedPct >= 100 ? "LIMITE DÉPASSÉE"
        : worstUsedPct >= 90  ? "CRITIQUE"
        : worstUsedPct >= 75  ? "ATTENTION"
        : worstUsedPct >= 50  ? "MODÉRÉ"
        : "CONFORTABLE";
    }

    return {
      e, s, t, l,
      slDist, tpDist, rrRatio,
      slPips, tpPips,
      lossUsd, gainUsd,
      pipValueForLots,
      canCalcMoney,
      riskPct: lossUsd != null && equity > 0 ? lossUsd / equity * 100 : null,
      gainPct: gainUsd != null && equity > 0 ? gainUsd / equity * 100 : null,
      equity,
      isOneStep,
      dailyBuffer, dailyFloor, dailyLimitUsd,
      totalBuffer, totalFloor, totalLimitUsd,
      dailyBufferAfterSL, totalBufferAfterSL,
      dailyImpactPct, totalImpactPct,
      dailyViolation, totalViolation,
      equityAfterSL, dailyUsedAfterSL, totalUsedAfterSL,
      worstUsedPct, riskStatus,
      slOnWrongSide, tpOnWrongSide,
    };
  }, [symbol, direction, entry, sl, tp, lots, challenge]);

  const hasValidInputs = calc != null && !calc.slOnWrongSide;
  const pipLabel = spec?.pipLabel ?? "points";
  const isApprox = spec != null && !spec.isExact && hasMonetaryCalc(spec);

  return (
    <div className={styles.toolSection}>

      {/* ── Actif ─────────────────────────────────────────────────── */}
      <Field label={R("Actif", "Activo", "Asset")}>
        <select
          className={styles.symbolSelect}
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
        >
          {INSTRUMENT_SPECS.map(s => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — {s.label}
            </option>
          ))}
        </select>
      </Field>

      {/* ── Note approximation ────────────────────────────────────── */}
      {isApprox && spec?.approxNote && (
        <div className={styles.approxNote}>
          <Info size={12} color={BLUE} />
          <span>
            {R(
              `Valeurs ${spec.approxNote}. Résultats indicatifs.`,
              `Valores ${spec.approxNote}. Resultados indicativos.`,
              `Values ${spec.approxNote}. Indicative results.`,
            )}
          </span>
        </div>
      )}

      {/* ── Direction ─────────────────────────────────────────────── */}
      <div className={styles.dirRow}>
        <span className={styles.fieldLabel}>
          Direction
        </span>
        <div className={styles.dirToggle}>
          <button
            className={`${styles.dirBtn} ${direction === "BUY"  ? styles.dirBtnBuy  : ""}`}
            onClick={() => setDirection("BUY")}
          >▲ BUY</button>
          <button
            className={`${styles.dirBtn} ${direction === "SELL" ? styles.dirBtnSell : ""}`}
            onClick={() => setDirection("SELL")}
          >▼ SELL</button>
        </div>
      </div>

      {/* ── Prix (grille 3 colonnes → 1 col mobile) ───────────────── */}
      <div
        className={styles.priceGrid}
        style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr" }}
      >
        <Field label={R("Prix d'entrée", "Precio de entrada", "Entry price")}>
          <PriceInput value={entry} onChange={setEntry} placeholder="1.08500" />
        </Field>

        <Field
          label="Stop Loss"
          hint={
            calc?.slOnWrongSide
              ? undefined
              : direction === "BUY"
                ? R("↓ En dessous de l'entrée", "↓ Por debajo de la entrada", "↓ Below entry")
                : R("↑ Au-dessus de l'entrée", "↑ Por encima de la entrada", "↑ Above entry")
          }
        >
          <div>
            <PriceInput
              value={sl}
              onChange={setSl}
              placeholder={direction === "BUY" ? "1.08200" : "1.08800"}
            />
            {calc?.slOnWrongSide && (
              <div className={styles.fieldError}>
                <AlertTriangle size={12} />
                {direction === "BUY"
                  ? R("SL doit être en dessous de l'entrée (BUY).", "El SL debe estar por debajo de la entrada (BUY).", "SL must be below entry for a BUY.")
                  : R("SL doit être au-dessus de l'entrée (SELL).", "El SL debe estar por encima de la entrada (SELL).", "SL must be above entry for a SELL.")}
              </div>
            )}
          </div>
        </Field>

        <Field
          label={`Take Profit ${R("(optionnel)", "(opcional)", "(optional)")}`}
          hint={
            calc?.tpOnWrongSide
              ? undefined
              : direction === "BUY"
                ? R("↑ Au-dessus de l'entrée", "↑ Por encima de la entrada", "↑ Above entry")
                : R("↓ En dessous de l'entrée", "↓ Por debajo de la entrada", "↓ Below entry")
          }
        >
          <div>
            <PriceInput
              value={tp}
              onChange={setTp}
              placeholder={direction === "BUY" ? "1.09100" : "1.07900"}
            />
            {calc?.tpOnWrongSide && !calc.slOnWrongSide && (
              <div className={styles.fieldError}>
                <AlertTriangle size={12} />
                {direction === "BUY"
                  ? R("TP doit être au-dessus de l'entrée (BUY).", "El TP debe estar por encima de la entrada (BUY).", "TP must be above entry for a BUY.")
                  : R("TP doit être en dessous de l'entrée (SELL).", "El TP debe estar por debajo de la entrada (SELL).", "TP must be below entry for a SELL.")}
              </div>
            )}
          </div>
        </Field>
      </div>

      {/* ── Taille de position ────────────────────────────────────── */}
      <Field
        label={R("Taille de position (lots)", "Tamaño de posición (lotes)", "Position size (lots)")}
        hint={R(
          "1 lot standard = 100 000 unités. Mini-lot = 0.10. Micro-lot = 0.01.",
          "1 lote estándar = 100 000 unidades. Mini-lote = 0.10. Micro-lote = 0.01.",
          "1 standard lot = 100,000 units. Mini = 0.10. Micro = 0.01.",
        )}
      >
        <div className={styles.fieldWrap}>
          <input
            type="number"
            step="0.01"
            min="0.01"
            inputMode="decimal"
            className={styles.fieldInput}
            value={lots}
            onChange={e => setLots(e.target.value)}
            placeholder="0.10"
          />
          <span className={styles.fieldSuffix}>lots</span>
        </div>
      </Field>

      {/* ══════════════════════════════════════════════════════════════
          RÉSULTATS
      ══════════════════════════════════════════════════════════════ */}
      {hasValidInputs && calc != null && (
        <div className={styles.resultsArea}>

          {/* ── R:R Ratio ────────────────────────────────────────── */}
          <div className={styles.rrBlock}>
            <div className={styles.rrEyebrow}>
              {R("Ratio Risque / Rendement", "Ratio Riesgo / Rendimiento", "Risk / Reward Ratio")}
            </div>

            {calc.rrRatio != null ? (
              <>
                <div
                  className={styles.rrBigRatio}
                  style={{
                    color: calc.rrRatio >= 2 ? GREEN
                         : calc.rrRatio >= 1.5 ? BLUE
                         : AMBER,
                  }}
                >
                  1 : {calc.rrRatio.toFixed(2)}
                </div>
                <div
                  className={styles.rrQuality}
                  style={{
                    color: calc.rrRatio >= 2 ? GREEN
                         : calc.rrRatio >= 1.5 ? BLUE
                         : AMBER,
                  }}
                >
                  {calc.rrRatio >= 2
                    ? "✓ Excellent"
                    : calc.rrRatio >= 1.5
                      ? "✓ Acceptable"
                      : R("⚠ Ratio faible", "⚠ Ratio bajo", "⚠ Low ratio")}
                </div>
              </>
            ) : (
              <div className={styles.rrNoTp}>
                {R("Entrez un Take Profit pour calculer le ratio.", "Introduce un Take Profit para calcular el ratio.", "Enter a Take Profit to calculate the ratio.")}
              </div>
            )}
          </div>

          {/* ── Chips de résumé ──────────────────────────────────── */}
          <div className={styles.distRow}>

            {/* SL */}
            <div className={styles.distChip}>
              <div className={styles.distChipTop}>
                <span className={styles.distLabel}>SL</span>
                <span className={styles.distUnit}>{pipLabel}</span>
              </div>
              <span className={styles.distValue}>
                {calc.slPips != null ? fmtPips(calc.slPips) : calc.slDist.toFixed(5)}
              </span>
            </div>

            {/* TP */}
            {calc.tpDist != null && (
              <div className={styles.distChip}>
                <div className={styles.distChipTop}>
                  <span className={styles.distLabel}>TP</span>
                  <span className={styles.distUnit}>{pipLabel}</span>
                </div>
                <span className={styles.distValue}>
                  {calc.tpPips != null ? fmtPips(calc.tpPips) : calc.tpDist.toFixed(5)}
                </span>
              </div>
            )}

            {/* Lots */}
            <div className={styles.distChip}>
              <div className={styles.distChipTop}>
                <span className={styles.distLabel}>Volume</span>
              </div>
              <span className={styles.distValue}>{calc.l.toFixed(2)} lot</span>
            </div>

            {/* Valeur pip */}
            {calc.pipValueForLots != null && (
              <div className={styles.distChip}>
                <div className={styles.distChipTop}>
                  <span className={styles.distLabel}>
                    {isApprox ? "≈ " : ""}{R(`Valeur / ${pipLabel.replace("s", "")}`, `Valor / ${pipLabel.replace("s", "")}`, `Per ${pipLabel.replace("s", "")}`)}
                  </span>
                </div>
                <span className={styles.distValue} style={{ color: isApprox ? AMBER : GREEN }}>
                  {isApprox ? "≈ " : ""}{fmtPipValue(calc.pipValueForLots)}
                </span>
              </div>
            )}

          </div>

          {/* ── Résultats monétaires ──────────────────────────────── */}
          {calc.canCalcMoney ? (
            <div
              className={styles.monetaryGrid}
              style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}
            >
              {/* Risque */}
              <div className={`${styles.monetaryCard} ${styles.monetaryCardLoss}`}>
                <div className={styles.monetaryLabel}>
                  {R("Risque au Stop Loss", "Riesgo en Stop Loss", "Risk at Stop Loss")}
                </div>
                <div className={styles.monetaryValue} style={{ color: RED }}>
                  {isApprox ? "≈ " : ""}-{money(calc.lossUsd!)}
                </div>
                {calc.riskPct != null && (
                  <div className={styles.monetarySub}>
                    {isApprox ? "≈ " : ""}{pct(calc.riskPct, 2)} {R("du capital actuel", "del capital actual", "of current capital")}
                  </div>
                )}
              </div>

              {/* Gain */}
              <div className={`${styles.monetaryCard} ${calc.gainUsd != null ? styles.monetaryCardGain : styles.monetaryCardNeutral}`}>
                <div className={styles.monetaryLabel}>
                  {R("Gain au Take Profit", "Ganancia en Take Profit", "Gain at Take Profit")}
                </div>
                {calc.gainUsd != null ? (
                  <>
                    <div className={styles.monetaryValue} style={{ color: GREEN }}>
                      {isApprox ? "≈ " : ""}+{money(calc.gainUsd)}
                    </div>
                    {calc.gainPct != null && (
                      <div className={styles.monetarySub}>
                        {isApprox ? "≈ " : ""}{pct(calc.gainPct, 2)} {R("du compte", "de la cuenta", "of account")}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.monetaryNoTp}>
                    {R("Entrez un TP", "Introduce un TP", "Enter a TP")}
                  </div>
                )}
              </div>
            </div>

          ) : (
            /* AUTRE — specs indisponibles */
            <div className={styles.specsUnavailable}>
              <AlertTriangle size={16} color={AMBER} />
              <div>
                <strong>
                  {R(
                    "Spécifications non disponibles pour cet actif.",
                    "Especificaciones no disponibles para este activo.",
                    "Specifications not available for this asset.",
                  )}
                </strong>
                <div className={styles.specsUnavailableSub}>
                  {R(
                    "Le ratio R:R est calculé. Pour les montants $, sélectionnez un actif supporté.",
                    "El ratio R:R se calcula. Para importes en $, selecciona un activo compatible.",
                    "The R:R ratio is calculated. For $ amounts, select a supported asset.",
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Impact sur le challenge ───────────────────────────── */}
          {calc.canCalcMoney && calc.lossUsd != null && (
            <div className={styles.impactArea}>
              <div className={styles.impactAreaTitle}>
                {R("Impact sur ton challenge", "Impacto en tu challenge", "Impact on your challenge")}
                <span className={styles.impactAreaSub}>
                  {R("· Si le Stop Loss est touché", "· Si el Stop Loss se alcanza", "· If the Stop Loss is hit")}
                </span>
                {calc.isOneStep && (
                  <span className={styles.impactModelBadge}>CHALLENGE · TRAILING DD EOD</span>
                )}
              </div>

              {/* ── Statut synthétique ─────────────────────────────── */}
              {calc.riskStatus != null && (
                <div
                  className={styles.simStatusBadge}
                  style={{
                    color:       RISK_STATUS_CONFIG[calc.riskStatus].color,
                    background:  RISK_STATUS_CONFIG[calc.riskStatus].bg,
                    borderColor: RISK_STATUS_CONFIG[calc.riskStatus].border,
                  }}
                >
                  <div className={styles.simStatusLabel}>
                    {isFr
                      ? RISK_STATUS_CONFIG[calc.riskStatus].label
                      : isEs
                        ? RISK_STATUS_CONFIG[calc.riskStatus].labelEs
                        : RISK_STATUS_CONFIG[calc.riskStatus].labelEn}
                  </div>
                  <div className={styles.simStatusSub}>
                    {calc.riskStatus === "LIMITE DÉPASSÉE"
                      ? R(
                          "Ce scénario atteindrait ou dépasserait une limite de drawdown de ton challenge.",
                          "Este escenario alcanzaría o superaría un límite de drawdown de tu challenge.",
                          "This scenario would reach or exceed a drawdown limit of your challenge.",
                        )
                      : R(
                          `Utilisation max des marges DD après SL : ${pct(Math.max(0, calc.worstUsedPct ?? 0), 1)}`,
                          `Uso máx. de márgenes DD tras SL: ${pct(Math.max(0, calc.worstUsedPct ?? 0), 1)}`,
                          `Max DD margin usage after SL: ${pct(Math.max(0, calc.worstUsedPct ?? 0), 1)}`,
                        )}
                  </div>
                </div>
              )}

              {/* Daily DD */}
              <DDBlock
                label={R("Marge journalière", "Margen diario", "Daily margin")}
                sub=""
                bufferBefore={calc.dailyBuffer}
                bufferAfter={calc.dailyBufferAfterSL}
                impactPct={calc.dailyImpactPct}
                limitUsd={calc.dailyLimitUsd}
                violation={calc.dailyViolation}
                amberThreshold={60}
                isFr={isFr}
                isEs={isEs}
              />

              {/* Total DD */}
              <DDBlock
                label={R("Marge totale", "Margen total", "Total margin")}
                sub={
                  calc.isOneStep
                    ? R("trailing — basé sur highest balance", "trailing — basado en highest balance", "trailing — based on highest balance")
                    : R("plancher fixe", "suelo fijo", "fixed floor")
                }
                bufferBefore={calc.totalBuffer}
                bufferAfter={calc.totalBufferAfterSL}
                impactPct={calc.totalImpactPct}
                limitUsd={calc.totalLimitUsd}
                violation={calc.totalViolation}
                amberThreshold={30}
                isFr={isFr}
                isEs={isEs}
              />

              {/* ── Valeur après SL ──────────────────────────────────── */}
              {calc.equityAfterSL != null && (
                <div className={styles.simEquitySummary}>
                  <div className={styles.simEquityItem}>
                    <div className={styles.simEquityLabel}>{R("Valeur actuelle", "Valor actual", "Current equity")}</div>
                    <div className={styles.simEquityValue}>{money(calc.equity)}</div>
                  </div>
                  <div className={styles.simEquityArrow}>→</div>
                  <div className={styles.simEquityItem}>
                    <div className={styles.simEquityLabel}>{R("Perte au SL", "Pérdida en SL", "SL loss")}</div>
                    <div className={styles.simEquityValue} style={{ color: RED }}>
                      {isApprox ? "≈ " : ""}-{money(calc.lossUsd)}
                    </div>
                  </div>
                  <div className={styles.simEquityArrow}>→</div>
                  <div className={styles.simEquityItem}>
                    <div className={styles.simEquityLabel}>{R("Valeur après SL", "Valor tras SL", "Equity after SL")}</div>
                    <div
                      className={styles.simEquityValue}
                      style={{
                        color: (calc.riskStatus === "LIMITE DÉPASSÉE" || calc.riskStatus === "CRITIQUE") ? RED : undefined,
                      }}
                    >
                      {money(calc.equityAfterSL)}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.impactDisclaimer}>
                {R(
                  "Simulation basée sur le solde actuel. Les positions ouvertes et la variation du highest balance peuvent modifier ces chiffres.",
                  "Simulación basada en el saldo actual. Las posiciones abiertas y la variación del highest balance pueden modificar estas cifras.",
                  "Simulation based on current balance. Open positions and highest balance changes may affect these figures.",
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {calc == null && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateText}>
            {R(
              "Renseigne un actif, une direction, un prix d'entrée, un Stop Loss et un volume pour voir les résultats.",
              "Introduce un activo, dirección, precio de entrada, Stop Loss y volumen para ver los resultados.",
              "Enter an asset, direction, entry price, Stop Loss, and volume to see results.",
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  LOT CALCULATOR v1
//  Inputs : Actif + Direction + Entrée + SL + Risque ($ ou %)
//  Calcul : lotRaw = riskUsd / (pips × pipValuePerLot) — arrondi BAS
//  Source specs : lib/instrument-specs.ts — aucune duplication
// ═════════════════════════════════════════════════════════════════════════════

function LotCalculator({
  challenge,
  isFr,
  isEs = false,
  isMobile,
}: {
  challenge: CockpitChallenge;
  isFr:      boolean;
  isEs?:     boolean;
  isMobile:  boolean;
}) {
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const [symbol,    setSymbol]    = useState("EURUSD");
  const [direction, setDirection] = useState<"BUY" | "SELL">("BUY");
  const [entry,     setEntry]     = useState("");
  const [sl,        setSl]        = useState("");
  const [riskInput, setRiskInput] = useState("1");
  const [riskMode,  setRiskMode]  = useState<"pct" | "usd">("pct");

  const spec     = getSpec(symbol);
  const isApprox = spec != null && !spec.isExact && hasMonetaryCalc(spec);
  const pipLabel = spec?.pipLabel ?? "points";

  // ── Calcul ─────────────────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const e = parseFloat(entry);
    const s = parseFloat(sl);
    const r = parseFloat(riskInput);

    if (isNaN(e) || isNaN(s) || !e || !s) return null;
    if (isNaN(r) || r <= 0)               return null;

    const slDist = Math.abs(e - s);
    if (slDist < 1e-10) return null;

    // Validation direction (BUY : SL en dessous, SELL : SL au-dessus)
    const slOnWrongSide = direction === "BUY" ? s >= e : s <= e;

    // Marges DD — STRICTEMENT identiques à TraderCockpit.tsx
    const {
      equity, isOneStep,
      dailyBuffer, dailyFloor, dailyLimitUsd,
      totalBuffer, totalFloor, totalLimitUsd,
    } = calcChallengeMargins(challenge);

    // Risque en USD
    const riskUsd = riskMode === "pct" ? equity * r / 100 : r;
    const riskPct = equity > 0 ? riskUsd / equity * 100 : 0;

    // Specs de l'actif
    const currentSpec  = getSpec(symbol);
    const canCalcMoney = currentSpec != null && hasMonetaryCalc(currentSpec);

    // Distance SL en pips (pour affichage)
    const slPips = currentSpec ? slDist / currentSpec.pipSize : slDist;

    // Calcul de lot (skip si SL invalide ou specs manquantes)
    let lotResult: LotSizeResult | null = null;
    if (canCalcMoney && currentSpec && !slOnWrongSide) {
      lotResult = calcLotSize(currentSpec, slDist, riskUsd);
    }

    // Impact sur le challenge (avec risque réel après arrondi)
    let dailyBufferAfter: number | null = null;
    let totalBufferAfter: number | null = null;
    let dailyImpactPct:   number | null = null;
    let totalImpactPct:   number | null = null;
    let dailyViolation  = false;
    let totalViolation  = false;

    if (lotResult && !lotResult.tooSmall) {
      const actualRisk    = lotResult.actualRiskUsd;
      const equityAfterSL = equity - actualRisk;
      dailyBufferAfter = Math.max(0, equityAfterSL - dailyFloor);
      totalBufferAfter = Math.max(0, equityAfterSL - totalFloor);
      // Impact = part de la marge RESTANTE consommée — identique au R:R Calculator
      dailyImpactPct   = dailyBuffer > 0 ? actualRisk / dailyBuffer * 100 : 0;
      totalImpactPct   = totalBuffer > 0 ? actualRisk / totalBuffer * 100 : 0;
      dailyViolation   = equityAfterSL < dailyFloor;
      totalViolation   = equityAfterSL < totalFloor;
    }

    return {
      slDist, slPips, slOnWrongSide,
      riskUsd, riskPct,
      equity, isOneStep,
      canCalcMoney,
      dailyBuffer, dailyFloor, dailyLimitUsd,
      totalBuffer, totalFloor, totalLimitUsd,
      dailyBufferAfter, totalBufferAfter,
      dailyImpactPct, totalImpactPct,
      dailyViolation, totalViolation,
      lotResult,
    };
  }, [symbol, direction, entry, sl, riskInput, riskMode, challenge]);

  const hasValidLot =
    calc != null &&
    !calc.slOnWrongSide &&
    calc.canCalcMoney &&
    calc.lotResult != null;

  // Couleur du big number basée sur l'impact journalier
  const lotColor =
    calc?.dailyImpactPct != null && calc.dailyImpactPct > 60 ? RED
    : calc?.dailyImpactPct != null && calc.dailyImpactPct > 30 ? AMBER
    : GREEN;

  return (
    <div className={styles.toolSection}>

      {/* ── Actif ─────────────────────────────────────────────────── */}
      <Field label={L("Actif", "Activo", "Asset")}>
        <select
          className={styles.symbolSelect}
          value={symbol}
          onChange={e => setSymbol(e.target.value)}
        >
          {INSTRUMENT_SPECS.map(s => (
            <option key={s.symbol} value={s.symbol}>
              {s.symbol} — {s.label}
            </option>
          ))}
        </select>
      </Field>

      {/* ── Note approximation ────────────────────────────────────── */}
      {isApprox && spec?.approxNote && (
        <div className={styles.approxNote}>
          <Info size={12} color={BLUE} />
          <span>
            {L(
              `Valeurs ${spec.approxNote}. Résultats indicatifs.`,
              `Valores ${spec.approxNote}. Resultados indicativos.`,
              `Values ${spec.approxNote}. Indicative results.`,
            )}
          </span>
        </div>
      )}

      {/* ── Direction ─────────────────────────────────────────────── */}
      <div className={styles.dirRow}>
        <span className={styles.fieldLabel}>
          Direction
        </span>
        <div className={styles.dirToggle}>
          <button
            className={`${styles.dirBtn} ${direction === "BUY"  ? styles.dirBtnBuy  : ""}`}
            onClick={() => setDirection("BUY")}
          >▲ BUY</button>
          <button
            className={`${styles.dirBtn} ${direction === "SELL" ? styles.dirBtnSell : ""}`}
            onClick={() => setDirection("SELL")}
          >▼ SELL</button>
        </div>
      </div>

      {/* ── Entrée + Stop Loss ────────────────────────────────────── */}
      <div
        className={styles.priceGrid}
        style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr" }}
      >
        <Field label={L("Prix d'entrée", "Precio de entrada", "Entry price")}>
          <PriceInput value={entry} onChange={setEntry} placeholder="1.08500" />
        </Field>

        <Field
          label="Stop Loss"
          hint={
            calc?.slOnWrongSide
              ? undefined
              : direction === "BUY"
                ? L("↓ En dessous de l'entrée", "↓ Por debajo de la entrada", "↓ Below entry")
                : L("↑ Au-dessus de l'entrée", "↑ Por encima de la entrada", "↑ Above entry")
          }
        >
          <div>
            <PriceInput
              value={sl}
              onChange={setSl}
              placeholder={direction === "BUY" ? "1.08200" : "1.08800"}
            />
            {calc?.slOnWrongSide && (
              <div className={styles.fieldError}>
                <AlertTriangle size={12} />
                {direction === "BUY"
                  ? L("SL doit être en dessous de l'entrée (BUY).", "El SL debe estar por debajo de la entrada (BUY).", "SL must be below entry for a BUY.")
                  : L("SL doit être au-dessus de l'entrée (SELL).", "El SL debe estar por encima de la entrada (SELL).", "SL must be above entry for a SELL.")}
              </div>
            )}
          </div>
        </Field>
      </div>

      {/* ── Risque souhaité + toggle $/% ──────────────────────────── */}
      <Field label={L("Risque souhaité", "Riesgo deseado", "Desired risk")}>
        <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
          <div className={styles.fieldWrap} style={{ flex: 1 }}>
            <input
              type="number"
              step="any"
              min="0"
              inputMode="decimal"
              className={styles.fieldInput}
              value={riskInput}
              onChange={e => setRiskInput(e.target.value)}
              placeholder={riskMode === "pct" ? "1.00" : "100"}
            />
            <span className={styles.fieldSuffix}>
              {riskMode === "pct" ? "%" : "$"}
            </span>
          </div>
          <div className={styles.riskToggle}>
            <button
              className={`${styles.riskToggleBtn} ${riskMode === "pct" ? styles.riskToggleBtnActive : ""}`}
              onClick={() => setRiskMode("pct")}
            >%</button>
            <button
              className={`${styles.riskToggleBtn} ${riskMode === "usd" ? styles.riskToggleBtnActive : ""}`}
              onClick={() => setRiskMode("usd")}
            >$</button>
          </div>
        </div>
        {/* Capital de référence */}
        {calc && calc.equity > 0 && (
          <div className={styles.capitalRef}>
            {L("Capital simulé", "Capital simulado", "Simulated capital")} : {money(calc.equity)}
            {riskMode === "pct" && calc.riskUsd > 0 && (
              <> = {money(calc.riskUsd, 2)} {L("de risque", "de riesgo", "of risk")}</>
            )}
          </div>
        )}
      </Field>

      {/* ══ RÉSULTATS ══════════════════════════════════════════════════════ */}

      {/* AUTRE / specs indisponibles */}
      {calc != null && !calc.slOnWrongSide && !calc.canCalcMoney && (
        <div className={styles.specsUnavailable}>
          <AlertTriangle size={16} color={AMBER} />
          <div>
            <strong>
              {L(
                "Spécifications non disponibles pour cet actif.",
                "Especificaciones no disponibles para este activo.",
                "Specifications not available for this asset.",
              )}
            </strong>
            <div className={styles.specsUnavailableSub}>
              {L(
                "Sélectionnez un actif supporté pour calculer le lot optimal.",
                "Selecciona un activo compatible para calcular el lote óptimo.",
                "Select a supported asset to calculate the optimal lot size.",
              )}
            </div>
          </div>
        </div>
      )}

      {/* Résultats valides */}
      {hasValidLot && calc != null && calc.lotResult != null && (
        <div className={styles.resultsArea}>

          {/* ── Big lot number ─────────────────────────────────────── */}
          <div className={styles.lotResultBlock}>
            <div className={styles.lotResultEyebrow}>
              {L("LOT RECOMMANDÉ", "LOTE RECOMENDADO", "RECOMMENDED LOT")}
            </div>

            {calc.lotResult.tooSmall ? (
              <div className={styles.lotTooSmall}>
                <AlertTriangle size={16} color={AMBER} />
                <span>
                  {calc.lotResult.hasConfirmedMin
                    ? L(
                        "Risque insuffisant — volume calculé inférieur au minimum autorisé pour cet actif.",
                        "Riesgo insuficiente — volumen calculado inferior al mínimo permitido para este activo.",
                        "Insufficient risk — calculated lot below the confirmed minimum for this asset.",
                      )
                    : L(
                        "Volume calculé inférieur à 0,01 lot. Le volume minimum réel dépend des spécifications de l'actif sur ta plateforme.",
                        "Volumen calculado inferior a 0,01 lote. El volumen mínimo real depende de las especificaciones del activo en tu plataforma.",
                        "Calculated lot below 0.01. The actual minimum lot depends on your platform's asset specifications.",
                      )}
                </span>
              </div>
            ) : (
              <>
                <div className={styles.lotBigNumber} style={{ color: lotColor }}>
                  {isApprox ? "≈ " : ""}
                  {calc.lotResult.lotFinal.toFixed(2)}
                </div>
                <div className={styles.lotUnit}>lot</div>
                <div className={styles.lotRiskMeta}>
                  {isApprox ? "≈ " : ""}
                  {L("Risque réel", "Riesgo real", "Actual risk")}{" "}
                  <strong>{money(calc.lotResult.actualRiskUsd, 2)}</strong>
                  {" · "}<strong>{pct(calc.riskPct, 2)}</strong>
                  {" "}{L("du capital", "del capital", "of capital")}
                </div>
              </>
            )}
          </div>

          {/* ── Chips résumé ───────────────────────────────────────── */}
          {!calc.lotResult.tooSmall && (
            <div className={styles.distRow}>

              {/* Distance SL */}
              <div className={styles.distChip}>
                <div className={styles.distChipTop}>
                  <span className={styles.distLabel}>SL</span>
                  <span className={styles.distUnit}>{pipLabel}</span>
                </div>
                <span className={styles.distValue}>{fmtPips(calc.slPips)}</span>
              </div>

              {/* Risque demandé */}
              <div className={styles.distChip}>
                <div className={styles.distChipTop}>
                  <span className={styles.distLabel}>
                    {L("Risque demandé", "Riesgo solicitado", "Requested risk")}
                  </span>
                </div>
                <span className={styles.distValue}>{money(calc.riskUsd, 2)}</span>
              </div>

              {/* Risque réel */}
              <div className={styles.distChip}>
                <div className={styles.distChipTop}>
                  <span className={styles.distLabel}>
                    {L("Risque réel", "Riesgo real", "Actual risk")}
                  </span>
                </div>
                <span className={styles.distValue} style={{ color: GREEN }}>
                  {money(calc.lotResult.actualRiskUsd, 2)}
                </span>
              </div>

              {/* Risque par lot */}
              <div className={styles.distChip}>
                <div className={styles.distChipTop}>
                  <span className={styles.distLabel}>
                    {isApprox ? "≈ " : ""}
                    {L("Risque / lot", "Riesgo / lote", "Risk / lot")}
                  </span>
                </div>
                <span
                  className={styles.distValue}
                  style={{ color: isApprox ? AMBER : undefined }}
                >
                  {isApprox ? "≈ " : ""}{fmtPipValue(calc.lotResult.riskPerLot)}
                </span>
              </div>

            </div>
          )}

          {/* ── Avertissement pas de lot non confirmé ──────────────── */}
          {!calc.lotResult.hasConfirmedStep && !calc.lotResult.tooSmall && (
            <div className={styles.approxNote} style={{ borderColor: "rgba(245,158,11,.2)", background: "rgba(245,158,11,.06)" }}>
              <Info size={12} color={AMBER} />
              <span style={{ color: "rgba(245,158,11,.85)" }}>
                {L(
                  `Pas de volume non confirmé pour cet actif — calcul effectué avec un pas de ${calc.lotResult.stepUsed.toFixed(2)} lot (hypothèse MT5 standard). Vérifie le volume autorisé sur ta plateforme avant de placer le trade.`,
                  `Paso de lote no confirmado para este activo — cálculo realizado con un paso de ${calc.lotResult.stepUsed.toFixed(2)} lote (hipótesis MT5 estándar). Verifica el volumen permitido en tu plataforma antes de operar.`,
                  `Lot step not confirmed for this asset — calculation based on ${calc.lotResult.stepUsed.toFixed(2)} lot step (MT5 standard assumption). Verify the allowed lot size on your platform before placing the trade.`,
                )}
              </span>
            </div>
          )}

          {/* ── Impact sur le challenge ─────────────────────────────── */}
          {!calc.lotResult.tooSmall && calc.lotResult.actualRiskUsd > 0 && (
            <div className={styles.impactArea}>
              <div className={styles.impactAreaTitle}>
                {L("Impact sur ton challenge", "Impacto en tu challenge", "Impact on your challenge")}
                {calc.isOneStep && (
                  <span className={styles.impactModelBadge}>CHALLENGE · TRAILING DD EOD</span>
                )}
              </div>

              <DDBlock
                label={L("Marge journalière", "Margen diario", "Daily margin")}
                sub=""
                bufferBefore={calc.dailyBuffer}
                bufferAfter={calc.dailyBufferAfter}
                impactPct={calc.dailyImpactPct}
                limitUsd={calc.dailyLimitUsd}
                violation={calc.dailyViolation}
                amberThreshold={60}
                isFr={isFr}
                isEs={isEs}
              />

              <DDBlock
                label={L("Marge totale", "Margen total", "Total margin")}
                sub={
                  calc.isOneStep
                    ? L("trailing — basé sur highest balance", "trailing — basado en highest balance", "trailing — based on highest balance")
                    : L("plancher fixe", "suelo fijo", "fixed floor")
                }
                bufferBefore={calc.totalBuffer}
                bufferAfter={calc.totalBufferAfter}
                impactPct={calc.totalImpactPct}
                limitUsd={calc.totalLimitUsd}
                violation={calc.totalViolation}
                amberThreshold={30}
                isFr={isFr}
                isEs={isEs}
              />

              <div className={styles.impactDisclaimer}>
                {L(
                  "Simulation basée sur le solde actuel. Les positions ouvertes peuvent modifier ces chiffres.",
                  "Simulación basada en el saldo actual. Las posiciones abiertas pueden modificar estas cifras.",
                  "Simulation based on current balance. Open positions may affect these figures.",
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* Empty state */}
      {calc == null && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateText}>
            {L(
              "Renseigne un actif, une direction, un prix d'entrée, un Stop Loss et un risque pour calculer le lot optimal.",
              "Introduce un activo, dirección, precio de entrada, Stop Loss y riesgo para calcular el lote óptimo.",
              "Enter an asset, direction, entry price, Stop Loss, and risk to calculate the optimal lot size.",
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Configuration statut de risque (partagée par RRCalculator) ──────────────

const RISK_STATUS_CONFIG: Record<
  RiskStatus,
  { color: string; bg: string; border: string; label: string; labelEs: string; labelEn: string }
> = {
  "CONFORTABLE":     { color: GREEN,  bg: "rgba(34,197,94,.09)",   border: "rgba(34,197,94,.22)",   label: "✓ Confortable",     labelEs: "✓ Cómodo",            labelEn: "✓ Comfortable"    },
  "MODÉRÉ":         { color: BLUE,   bg: "rgba(255,255,255,.06)", border: "rgba(255,255,255,.15)", label: "◆ Modéré",          labelEs: "◆ Moderado",          labelEn: "◆ Moderate"       },
  "ATTENTION":      { color: AMBER,  bg: "rgba(245,158,11,.09)",  border: "rgba(245,158,11,.22)",  label: "⚠ Attention",       labelEs: "⚠ Atención",          labelEn: "⚠ Caution"        },
  "CRITIQUE":       { color: RED,    bg: "rgba(239,68,68,.09)",   border: "rgba(239,68,68,.22)",   label: "✖ Critique",        labelEs: "✖ Crítico",           labelEn: "✖ Critical"       },
  "LIMITE DÉPASSÉE":{ color: "#fff", bg: "rgba(239,68,68,.22)",   border: "rgba(239,68,68,.55)",   label: "⛔ Limite dépassée", labelEs: "⛔ Límite superado",  labelEn: "⛔ Limit exceeded"},
};


// ── Composant DD block (daily + total) ────────────────────────────────────────

function DDBlock({
  label, sub,
  bufferBefore, bufferAfter,
  impactPct, limitUsd,
  violation, amberThreshold,
  isFr, isEs = false,
}: {
  label:          string;
  sub:            string;
  bufferBefore:   number;
  bufferAfter:    number | null;
  impactPct:      number | null;
  limitUsd:       number;
  violation:      boolean;
  amberThreshold: number;
  isFr:           boolean;
  isEs?:          boolean;
}) {
  const D = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const afterColor = violation
    ? RED
    : (impactPct ?? 0) >= amberThreshold ? AMBER : "#22c55e";

  return (
    <div className={styles.impactDDBlock}>
      <div className={styles.impactDDTitle}>
        {label}
        {sub && <span className={styles.impactDDSub}> ({sub})</span>}
      </div>

      <div className={styles.marginFlow}>
        <div className={styles.marginSide}>
          <div className={styles.marginSideLabel}>{D("Actuellement", "Actualmente", "Current")}</div>
          <div className={styles.marginSideValue}>{money(bufferBefore)}</div>
        </div>
        <div className={styles.marginArrow}>→</div>
        <div className={styles.marginSide}>
          <div className={styles.marginSideLabel}>
            {D("Si SL touché", "Si SL alcanzado", "If SL hit")}
          </div>
          <div className={styles.marginSideValue} style={{ color: afterColor }}>
            {violation
              ? D("< Plancher", "< Suelo", "< Floor")
              : money(bufferAfter ?? 0)}
          </div>
        </div>
      </div>

      <MiniMeter value={impactPct ?? 0} color={afterColor} />

      <div className={styles.impactStatRow}>
        <span className={styles.impactStatLabel}>Impact</span>
        <span className={styles.impactStatValue} style={{ color: afterColor }}>
          {pct(impactPct ?? 0)} {D("de la marge restante", "del margen restante", "of remaining margin")}
        </span>
      </div>

      {violation && (
        <div className={styles.ddViolation}>
          <AlertTriangle size={14} />
          {D(
            "Ce Stop Loss dépasserait la limite. Simulation uniquement.",
            "Este Stop Loss superaría el límite. Solo simulación.",
            "This Stop Loss would exceed the limit. Simulation only.",
          )}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  COMING SOON stubs
// ═════════════════════════════════════════════════════════════════════════════

function ComingSoonStub({
  icon, title, desc, isFr,
}: {
  icon:  React.ReactNode;
  title: string;
  desc:  string;
  isFr:  boolean;
}) {
  return (
    <div className={styles.comingSoon}>
      <div className={styles.comingSoonIcon}>{icon}</div>
      <div className={styles.comingSoonTitle}>{title}</div>
      <div className={styles.comingSoonDesc}>{desc}</div>
      <div className={styles.comingSoonBadge}>
        Coming soon
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PRÉPARER MA SESSION
// ═════════════════════════════════════════════════════════════════════════════

const PLAN_ITEMS_FR = [
  "J'ai vérifié les annonces économiques",
  "Mon setup et mon invalidation sont clairs",
  "Mon Stop Loss est défini",
  "Mon Take Profit est défini",
  "J'ai vérifié mon ratio Risque / Rendement",
  "J'ai calculé mon lot",
  "J'ai vérifié ma marge Daily DD disponible",
  "J'ai vérifié ma marge Total DD disponible",
  "Mon risque maximum par trade est défini",
] as const;

const PLAN_ITEMS_EN = [
  "I checked economic announcements",
  "My setup and invalidation are clear",
  "My Stop Loss is defined",
  "My Take Profit is defined",
  "I checked my Risk / Reward ratio",
  "I calculated my lot size",
  "I checked my Daily DD margin",
  "I checked my Total DD margin",
  "My maximum risk per trade is defined",
] as const;

const PLAN_ITEMS_ES = [
  "Revisé los anuncios económicos",
  "Mi setup y mi invalidación están claros",
  "Mi Stop Loss está definido",
  "Mi Take Profit está definido",
  "Revisé mi ratio Riesgo / Rendimiento",
  "Calculé mi tamaño de lote",
  "Revisé mi margen Daily DD disponible",
  "Revisé mi margen Total DD disponible",
  "Mi riesgo máximo por operación está definido",
] as const;

// Index → shortcut link (labelFr, labelEs, labelEn, destination section)
const ITEM_LINKS: Record<number, { labelFr: string; labelEs: string; labelEn: string; section: TradingSection }> = {
  0: { labelFr: "Consulter →", labelEs: "Consultar →", labelEn: "View →",        section: "calendar"  },
  4: { labelFr: "Vérifier →",  labelEs: "Verificar →", labelEn: "Check →",       section: "rr"        },
  5: { labelFr: "Calculer →",  labelEs: "Calcular →",  labelEn: "Calculate →",   section: "lot"       },
  6: { labelFr: "Vérifier →",  labelEs: "Verificar →", labelEn: "Check →",       section: "rr"        },
  7: { labelFr: "Vérifier →",  labelEs: "Verificar →", labelEn: "Check →",       section: "rr"        },
};

function PrepareSession({
  planChecks, setPlanChecks,
  journalNote, setJournalNote,
  onSection, isFr, isEs = false,
}: {
  planChecks:     boolean[];
  setPlanChecks:  Dispatch<SetStateAction<boolean[]>>;
  journalNote:    string;
  setJournalNote: Dispatch<SetStateAction<string>>;
  onSection:      (s: TradingSection) => void;
  isFr:           boolean;
  isEs?:          boolean;
  isMobile:       boolean;
}) {
  const PS = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;
  const items     = isFr ? PLAN_ITEMS_FR : isEs ? PLAN_ITEMS_ES : PLAN_ITEMS_EN;
  const checked   = planChecks.filter(Boolean).length;
  const total     = 9;
  const pct9      = (checked / total) * 100;
  const allDone   = checked === total;
  const almost    = checked >= 7;

  const statusColor = allDone ? GREEN : almost ? BLUE : AMBER;
  const statusText  = allDone
    ? PS("✓ Session prête", "✓ Sesión lista", "✓ Session ready")
    : almost
      ? PS("Session presque prête", "Sesión casi lista", "Session almost ready")
      : PS("Complète ta préparation", "Completa tu preparación", "Complete your preparation");

  const toggle = (i: number) =>
    setPlanChecks(prev => prev.map((v, idx) => idx === i ? !v : v));

  return (
    <div className={styles.toolSection}>

      {/* ── Barre de progression ─────────────────────────────────────── */}
      <div className={styles.prepProgress}>
        <div className={styles.prepProgressTop}>
          <div>
            <div className={styles.prepProgressEyebrow}>
              {PS("PRÉPARATION DE SESSION", "PREPARACIÓN DE SESIÓN", "SESSION PREPARATION")}
            </div>
            <div className={styles.prepProgressCount}>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>
                {checked}
              </span>
              <span className={styles.prepProgressSlash}> / {total}</span>
              <span className={styles.prepProgressUnit}>
                {PS(" vérifications", " verificaciones", " checks")}
              </span>
            </div>
          </div>
          <div className={styles.prepProgressStatus} style={{ color: statusColor }}>
            {statusText}
          </div>
        </div>
        <MiniMeter value={pct9} color={statusColor} />
      </div>

      {/* ── Checklist ────────────────────────────────────────────────── */}
      <div className={styles.prepChecklist}>
        {items.map((item, idx) => {
          const link = ITEM_LINKS[idx];
          return (
            <div key={idx} className={styles.prepItem}>
              <div className={styles.prepItemMain} onClick={() => toggle(idx)}>
                <span
                  className={`${styles.prepCheck} ${planChecks[idx] ? styles.prepCheckOn : ""}`}
                >
                  {planChecks[idx] && <Check size={11} />}
                </span>
                <span
                  className={styles.prepItemText}
                  style={planChecks[idx]
                    ? { textDecoration: "line-through", color: "rgba(255,255,255,.32)" }
                    : undefined}
                >
                  {item}
                </span>
              </div>
              {link && (
                <button
                  className={styles.prepItemLink}
                  onClick={() => onSection(link.section)}
                >
                  {isFr ? link.labelFr : isEs ? link.labelEs : link.labelEn}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Note de session ──────────────────────────────────────────── */}
      <div className={styles.prepNoteSection}>
        <div className={styles.prepNoteLabel}>
          {PS("Plan de session / Notes", "Plan de sesión / Notas", "Session plan / Notes")}
        </div>
        <textarea
          className={styles.prepNote}
          value={journalNote}
          onChange={e => setJournalNote(e.target.value)}
          placeholder={PS(
            "Mon setup, mon état d'esprit et la règle que je veux respecter aujourd'hui…",
            "Mi setup, mi estado mental y la regla que quiero respetar hoy…",
            "My setup, mindset and the rule I want to respect today…",
          )}
          rows={4}
        />
      </div>

    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function CockpitTools({
  challenge, isFr, isEs = false, isMobile,
  section, onSection,
  planChecks, setPlanChecks, journalNote, setJournalNote,
}: Props) {
  const CT = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  const tabs: { id: TradingSection; labelFr: string; labelEs: string; labelEn: string; live: boolean }[] = [
    { id: "prepare",  labelFr: isMobile ? "Préparer"  : "Préparer ma session", labelEs: isMobile ? "Preparar"  : "Preparar mi sesión",    labelEn: isMobile ? "Prepare"  : "Prepare session",  live: true },
    { id: "rr",       labelFr: isMobile ? "R:R"       : "Risque / Rendement",  labelEs: isMobile ? "R:R"       : "Riesgo / Rendimiento",   labelEn: isMobile ? "R:R"      : "Risk / Reward",    live: true },
    { id: "lot",      labelFr: isMobile ? "Lot"       : "Calculateur de lot",  labelEs: isMobile ? "Lote"      : "Calculadora de lote",    labelEn: isMobile ? "Lot"      : "Lot Calculator",   live: true },
    { id: "calendar", labelFr: isMobile ? "Annonces"  : "Calendrier éco",      labelEs: isMobile ? "Anuncios"  : "Calendario eco",          labelEn: isMobile ? "Calendar" : "Eco Calendar",     live: true },
  ];

  return (
    <div className={styles.root}>

      <div className={styles.toolNav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.toolNavBtn} ${section === tab.id ? styles.toolNavBtnActive : ""}`}
            onClick={() => onSection(tab.id)}
          >
            {isFr ? tab.labelFr : isEs ? tab.labelEs : tab.labelEn}
            {!tab.live && (
              <span className={styles.toolNavSoon}>
                {CT("bientôt", "próximamente", "soon")}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.toolCard}>

        {section === "prepare" && (
          <>
            <div className={styles.toolHeader}>
              <div className={styles.toolEyebrow}>
                {CT("Trading · Session du jour", "Trading · Sesión de hoy", "Trading · Today's session")}
              </div>
              <h2 className={styles.toolTitle}>
                {CT("Préparer ma session", "Preparar mi sesión", "Prepare my session")}
              </h2>
              <p className={styles.toolSub}>
                {CT(
                  "Valide chaque point avant d'entrer en position. Les raccourcis te renvoient directement aux outils concernés.",
                  "Valida cada punto antes de entrar en posición. Los atajos te llevan directamente a las herramientas correspondientes.",
                  "Check each point before entering a position. Shortcuts take you directly to the relevant tools.",
                )}
              </p>
            </div>
            <div className={styles.toolDivider} />
            <PrepareSession
              planChecks={planChecks}
              setPlanChecks={setPlanChecks}
              journalNote={journalNote}
              setJournalNote={setJournalNote}
              onSection={onSection}
              isFr={isFr}
              isEs={isEs}
              isMobile={isMobile}
            />
          </>
        )}

        {section === "rr" && (
          <>
            <div className={styles.toolHeader}>
              <div className={styles.toolEyebrow}>
                {CT("Calcul avant d'entrer", "Cálculo antes de entrar", "Pre-trade calculation")}
              </div>
              <h2 className={styles.toolTitle}>
                {CT("Risque / Rendement", "Riesgo / Rendimiento", "Risk / Reward")}
              </h2>
              <p className={styles.toolSub}>
                {CT(
                  "Saisis ton trade tel que tu l'envisages — risque, gain, impact drawdown et analyse challenge sont calculés automatiquement.",
                  "Introduce tu operación tal como la planeas — riesgo, ganancia, impacto en drawdown y análisis del challenge se calculan automáticamente.",
                  "Enter your trade as you envision it — risk, gain, drawdown impact, and challenge analysis are calculated automatically.",
                )}
              </p>
            </div>
            <div className={styles.toolDivider} />
            <RRCalculator challenge={challenge} isFr={isFr} isEs={isEs} isMobile={isMobile} />
          </>
        )}

        {section === "lot" && (
          <>
            <div className={styles.toolHeader}>
              <div className={styles.toolEyebrow}>
                {CT("Calcul avant d'entrer", "Cálculo antes de entrar", "Pre-trade calculation")}
              </div>
              <h2 className={styles.toolTitle}>
                {CT("Calculateur de lot", "Calculadora de lote", "Lot Calculator")}
              </h2>
              <p className={styles.toolSub}>
                {CT(
                  "Indique ton Entry, ton Stop Loss et le risque souhaité — le lot optimal est calculé automatiquement sans dépasser ton risque.",
                  "Indica tu entrada, Stop Loss y riesgo deseado — el lote óptimo se calcula automáticamente sin superar tu riesgo.",
                  "Enter your Entry, Stop Loss and desired risk — the optimal lot size is calculated automatically without exceeding your risk.",
                )}
              </p>
            </div>
            <div className={styles.toolDivider} />
            <LotCalculator challenge={challenge} isFr={isFr} isEs={isEs} isMobile={isMobile} />
          </>
        )}

        {section === "calendar" && (
          <>
            <div className={styles.toolHeader}>
              <div className={styles.toolEyebrow}>
                {CT("Anticipation · Avant la session", "Anticipación · Antes de la sesión", "Anticipation · Before the session")}
              </div>
              <h2 className={styles.toolTitle}>
                {CT("Calendrier économique", "Calendario económico", "Economic Calendar")}
              </h2>
              <p className={styles.toolSub}>
                {CT(
                  "Identifie les annonces à fort impact avant d'entrer en position.",
                  "Identifica los anuncios de alto impacto antes de entrar en posición.",
                  "Identify high-impact announcements before entering a position.",
                )}
              </p>
            </div>
            <div className={styles.toolDivider} />
            <EconomicCalendar isFr={isFr} isEs={isEs} />
          </>
        )}

      </div>
    </div>
  );
}
