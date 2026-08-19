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

import { useMemo, useState } from "react";
import { AlertTriangle, Info, ShieldCheck, Target } from "lucide-react";
import type { CockpitChallenge } from "./TraderCockpit";
import {
  INSTRUMENT_SPECS,
  getSpec,
  calcTradeRisk,
  hasMonetaryCalc,
} from "@/lib/instrument-specs";
import styles from "./CockpitTools.module.css";

type ToolTab = "rr" | "lot" | "simulator";

type Props = {
  challenge: CockpitChallenge;
  isFr:      boolean;
  isMobile:  boolean;
};

const BLUE  = "#69C5FD";
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
  isMobile,
}: {
  challenge: CockpitChallenge;
  isFr:      boolean;
  isMobile:  boolean;
}) {
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

    // ── Formules DD — STRICTEMENT identiques à TraderCockpit.tsx ──────────────
    const effectiveBalance =
      challenge.status === "failed" && challenge.breach_equity != null
        ? challenge.breach_equity
        : challenge.balance;
    const equity = effectiveBalance; // pas de floating P&L dans la simulation

    const isOneStep = challenge.model.toLowerCase().replace(/[\s-]/g, "").includes("1step");

    const dailyRef      = challenge.daily_start_balance ?? challenge.start_balance;
    const dailyLimitUsd = dailyRef * challenge.daily_drawdown_limit / 100;
    const dailyFloor    = dailyRef - dailyLimitUsd;
    const dailyBuffer   = Math.max(0, equity - dailyFloor);

    const trailingRef   = isOneStep
      ? Math.max(challenge.highest_balance ?? challenge.start_balance, challenge.start_balance)
      : challenge.start_balance;
    const totalLimitUsd = challenge.start_balance * challenge.total_drawdown_limit / 100;
    const totalFloor    = trailingRef - totalLimitUsd;
    const totalBuffer   = Math.max(0, equity - totalFloor);

    // ── Impact après SL ────────────────────────────────────────────────────────
    let dailyBufferAfterSL: number | null = null;
    let totalBufferAfterSL: number | null = null;
    let dailyImpactPct:     number | null = null;
    let totalImpactPct:     number | null = null;
    let dailyViolation  = false;
    let totalViolation  = false;

    if (lossUsd != null) {
      const equityAfterSL = equity - lossUsd;
      dailyBufferAfterSL  = Math.max(0, equityAfterSL - dailyFloor);
      totalBufferAfterSL  = Math.max(0, equityAfterSL - totalFloor);
      // Impact = part de la marge RESTANTE consommée par ce trade
      dailyImpactPct      = dailyBuffer > 0 ? lossUsd / dailyBuffer * 100 : 0;
      totalImpactPct      = totalBuffer > 0 ? lossUsd / totalBuffer * 100 : 0;
      dailyViolation      = equityAfterSL < dailyFloor;
      totalViolation      = equityAfterSL < totalFloor;
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
      slOnWrongSide, tpOnWrongSide,
    };
  }, [symbol, direction, entry, sl, tp, lots, challenge]);

  const hasValidInputs = calc != null && !calc.slOnWrongSide;
  const pipLabel = spec?.pipLabel ?? "points";
  const isApprox = spec != null && !spec.isExact && hasMonetaryCalc(spec);

  return (
    <div className={styles.toolSection}>

      {/* ── Actif ─────────────────────────────────────────────────── */}
      <Field label={isFr ? "Actif" : "Asset"}>
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
            {isFr
              ? `Valeurs ${spec.approxNote}. Résultats indicatifs.`
              : `Values ${spec.approxNote}. Indicative results.`}
          </span>
        </div>
      )}

      {/* ── Direction ─────────────────────────────────────────────── */}
      <div className={styles.dirRow}>
        <span className={styles.fieldLabel}>
          {isFr ? "Direction" : "Direction"}
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
        <Field label={isFr ? "Prix d'entrée" : "Entry price"}>
          <PriceInput value={entry} onChange={setEntry} placeholder="1.08500" />
        </Field>

        <Field
          label="Stop Loss"
          hint={
            calc?.slOnWrongSide
              ? undefined
              : direction === "BUY"
                ? (isFr ? "↓ En dessous de l'entrée" : "↓ Below entry")
                : (isFr ? "↑ Au-dessus de l'entrée" : "↑ Above entry")
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
                  ? (isFr ? "SL doit être en dessous de l'entrée (BUY)." : "SL must be below entry for a BUY.")
                  : (isFr ? "SL doit être au-dessus de l'entrée (SELL)." : "SL must be above entry for a SELL.")}
              </div>
            )}
          </div>
        </Field>

        <Field
          label={`Take Profit ${isFr ? "(optionnel)" : "(optional)"}`}
          hint={
            calc?.tpOnWrongSide
              ? undefined
              : direction === "BUY"
                ? (isFr ? "↑ Au-dessus de l'entrée" : "↑ Above entry")
                : (isFr ? "↓ En dessous de l'entrée" : "↓ Below entry")
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
                  ? (isFr ? "TP doit être au-dessus de l'entrée (BUY)." : "TP must be above entry for a BUY.")
                  : (isFr ? "TP doit être en dessous de l'entrée (SELL)." : "TP must be below entry for a SELL.")}
              </div>
            )}
          </div>
        </Field>
      </div>

      {/* ── Taille de position ────────────────────────────────────── */}
      <Field
        label={isFr ? "Taille de position (lots)" : "Position size (lots)"}
        hint={isFr
          ? "1 lot standard = 100 000 unités. Mini-lot = 0.10. Micro-lot = 0.01."
          : "1 standard lot = 100,000 units. Mini = 0.10. Micro = 0.01."}
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
              {isFr ? "Ratio Risque / Rendement" : "Risk / Reward Ratio"}
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
                    ? (isFr ? "✓ Excellent" : "✓ Excellent")
                    : calc.rrRatio >= 1.5
                      ? (isFr ? "✓ Acceptable" : "✓ Acceptable")
                      : (isFr ? "⚠ Ratio faible" : "⚠ Low ratio")}
                </div>
              </>
            ) : (
              <div className={styles.rrNoTp}>
                {isFr ? "Entrez un Take Profit pour calculer le ratio." : "Enter a Take Profit to calculate the ratio."}
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
                    {isFr ? `${isApprox ? "≈ " : ""}Valeur / ${pipLabel.replace("s", "")}` : `${isApprox ? "≈ " : ""}Per ${pipLabel.replace("s", "")}`}
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
                  {isFr ? "Risque au Stop Loss" : "Risk at Stop Loss"}
                </div>
                <div className={styles.monetaryValue} style={{ color: RED }}>
                  {isApprox ? "≈ " : ""}-{money(calc.lossUsd!)}
                </div>
                {calc.riskPct != null && (
                  <div className={styles.monetarySub}>
                    {isApprox ? "≈ " : ""}{pct(calc.riskPct, 2)} {isFr ? "du capital actuel" : "of current capital"}
                  </div>
                )}
              </div>

              {/* Gain */}
              <div className={`${styles.monetaryCard} ${calc.gainUsd != null ? styles.monetaryCardGain : styles.monetaryCardNeutral}`}>
                <div className={styles.monetaryLabel}>
                  {isFr ? "Gain au Take Profit" : "Gain at Take Profit"}
                </div>
                {calc.gainUsd != null ? (
                  <>
                    <div className={styles.monetaryValue} style={{ color: GREEN }}>
                      {isApprox ? "≈ " : ""}+{money(calc.gainUsd)}
                    </div>
                    {calc.gainPct != null && (
                      <div className={styles.monetarySub}>
                        {isApprox ? "≈ " : ""}{pct(calc.gainPct, 2)} {isFr ? "du compte" : "of account"}
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.monetaryNoTp}>
                    {isFr ? "Entrez un TP" : "Enter a TP"}
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
                  {isFr
                    ? "Spécifications non disponibles pour cet actif."
                    : "Specifications not available for this asset."}
                </strong>
                <div className={styles.specsUnavailableSub}>
                  {isFr
                    ? "Le ratio R:R est calculé. Pour les montants $, sélectionnez un actif supporté."
                    : "The R:R ratio is calculated. For $ amounts, select a supported asset."}
                </div>
              </div>
            </div>
          )}

          {/* ── Impact sur le challenge ───────────────────────────── */}
          {calc.canCalcMoney && calc.lossUsd != null && (
            <div className={styles.impactArea}>
              <div className={styles.impactAreaTitle}>
                {isFr ? "Impact sur ton challenge" : "Impact on your challenge"}
                {calc.isOneStep && (
                  <span className={styles.impactModelBadge}>1-Step · Trailing DD</span>
                )}
              </div>

              {/* Daily DD */}
              <DDBlock
                label={isFr ? "Marge journalière" : "Daily margin"}
                sub=""
                bufferBefore={calc.dailyBuffer}
                bufferAfter={calc.dailyBufferAfterSL}
                impactPct={calc.dailyImpactPct}
                limitUsd={calc.dailyLimitUsd}
                violation={calc.dailyViolation}
                amberThreshold={60}
                isFr={isFr}
              />

              {/* Total DD */}
              <DDBlock
                label={isFr ? "Marge totale" : "Total margin"}
                sub={
                  calc.isOneStep
                    ? (isFr ? "trailing — basé sur highest balance" : "trailing — based on highest balance")
                    : (isFr ? "plancher fixe" : "fixed floor")
                }
                bufferBefore={calc.totalBuffer}
                bufferAfter={calc.totalBufferAfterSL}
                impactPct={calc.totalImpactPct}
                limitUsd={calc.totalLimitUsd}
                violation={calc.totalViolation}
                amberThreshold={30}
                isFr={isFr}
              />

              <div className={styles.impactDisclaimer}>
                {isFr
                  ? "Simulation basée sur le solde actuel. Les positions ouvertes peuvent modifier ces chiffres."
                  : "Simulation based on current balance. Open positions may affect these figures."}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {calc == null && (
        <div className={styles.emptyState}>
          <div className={styles.emptyStateText}>
            {isFr
              ? "Renseigne un actif, une direction, un prix d'entrée, un Stop Loss et un volume pour voir les résultats."
              : "Enter an asset, direction, entry price, Stop Loss, and volume to see results."}
          </div>
        </div>
      )}

    </div>
  );
}

// ── Composant DD block (daily + total) ────────────────────────────────────────

function DDBlock({
  label, sub,
  bufferBefore, bufferAfter,
  impactPct, limitUsd,
  violation, amberThreshold,
  isFr,
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
}) {
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
          <div className={styles.marginSideLabel}>{isFr ? "Actuellement" : "Current"}</div>
          <div className={styles.marginSideValue}>{money(bufferBefore)}</div>
        </div>
        <div className={styles.marginArrow}>→</div>
        <div className={styles.marginSide}>
          <div className={styles.marginSideLabel}>
            {isFr ? "Si SL touché" : "If SL hit"}
          </div>
          <div className={styles.marginSideValue} style={{ color: afterColor }}>
            {violation
              ? (isFr ? "< Plancher" : "< Floor")
              : money(bufferAfter ?? 0)}
          </div>
        </div>
      </div>

      <MiniMeter value={impactPct ?? 0} color={afterColor} />

      <div className={styles.impactStatRow}>
        <span className={styles.impactStatLabel}>{isFr ? "Impact" : "Impact"}</span>
        <span className={styles.impactStatValue} style={{ color: afterColor }}>
          {pct(impactPct ?? 0)} {isFr ? "de la marge restante" : "of remaining margin"}
        </span>
      </div>

      {violation && (
        <div className={styles.ddViolation}>
          <AlertTriangle size={14} />
          {isFr
            ? "Ce Stop Loss dépasserait la limite. Simulation uniquement."
            : "This Stop Loss would exceed the limit. Simulation only."}
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
        {isFr ? "Bientôt disponible" : "Coming soon"}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export default function CockpitTools({ challenge, isFr, isMobile }: Props) {
  const [activeTool, setActiveTool] = useState<ToolTab>("rr");

  const tabs: { id: ToolTab; label: string; live: boolean }[] = [
    { id: "rr",        label: isFr ? "Risque / Rendement" : "Risk / Reward",  live: true  },
    { id: "lot",       label: isFr ? "Calculateur de lot"  : "Lot Calculator", live: false },
    { id: "simulator", label: isFr ? "Simulateur de risque" : "Risk Simulator", live: false },
  ];

  return (
    <div className={styles.root}>

      <div className={styles.toolNav}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.toolNavBtn} ${activeTool === tab.id ? styles.toolNavBtnActive : ""}`}
            onClick={() => setActiveTool(tab.id)}
          >
            {tab.label}
            {!tab.live && (
              <span className={styles.toolNavSoon}>
                {isFr ? "bientôt" : "soon"}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.toolCard}>

        {activeTool === "rr" && (
          <>
            <div className={styles.toolHeader}>
              <div className={styles.toolEyebrow}>
                {isFr ? "Calcul avant d'entrer" : "Pre-trade calculation"}
              </div>
              <h2 className={styles.toolTitle}>
                {isFr ? "Risque / Rendement" : "Risk / Reward"}
              </h2>
              <p className={styles.toolSub}>
                {isFr
                  ? "Saisis ton trade tel que tu l'envisages — le risque, le gain et l'impact propfirm sont calculés automatiquement."
                  : "Enter your trade as you envision it — risk, gain, and propfirm impact are calculated automatically."}
              </p>
            </div>
            <div className={styles.toolDivider} />
            <RRCalculator challenge={challenge} isFr={isFr} isMobile={isMobile} />
          </>
        )}

        {activeTool === "lot" && (
          <ComingSoonStub
            icon={<Target size={36} color={BLUE} />}
            title={isFr ? "Calculateur de lot" : "Lot Calculator"}
            desc={isFr
              ? "Entre ton Entry, ton SL et le risque souhaité en $ ou % — le nombre de lots optimal est calculé automatiquement."
              : "Enter your entry, SL, and desired risk in $ or % — the optimal lot size is calculated automatically."}
            isFr={isFr}
          />
        )}

        {activeTool === "simulator" && (
          <ComingSoonStub
            icon={<ShieldCheck size={36} color={BLUE} />}
            title={isFr ? "Simulateur de risque" : "Risk Simulator"}
            desc={isFr
              ? "Simule l'impact d'un stop-loss sur ton drawdown journalier et total avant de passer le trade."
              : "Simulate a stop-loss impact on your daily and total drawdown before placing the trade."}
            isFr={isFr}
          />
        )}

      </div>
    </div>
  );
}
