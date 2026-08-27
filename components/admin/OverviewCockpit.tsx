"use client";
// ── OverviewCockpit ───────────────────────────────────────────────────────────
// Cockpit global du CRM Traders Rewards.
// Chargé uniquement quand tab === "overview" sur /x8k3pz.
// Fetch une seule fois vers /api/admin/overview (aggregation Promise.all côté API).
// Navigation : Link href — pas de setTab(), URL proprement mise à jour.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────

type RiskItem = {
  id:            string;
  user_email:    string;
  account_size:  string;
  phase:         string;
  model:         string;
  totalDD:       number;
  totalLimit:    number;
  totalConsumed: number;
  dailyDD:       number;
  dailyLimit:    number;
  dailyConsumed: number;
  hasDailyData:  boolean;
};

type Event = {
  at:    string;
  type:  string;
  label: string;
  sub:   string;
  color: string;
};

type OverviewData = {
  kpis: {
    activeTotal:           number;
    breakdown:             { phase1: number; oneStep: number; phase2: number };
    certified:             number;
    failed:                number;
    passed:                number;
    traders:               number;
    pendingPayoutsCount:   number;
    pendingPayoutsAmt:     number;
    caMonth:               number;
    kycPending:            number;
    supportNew:            number;
    supportOpen:           number;
    emailFailed24h:        number;
    emailSent24h:          number;
    promoActive:           number;
  };
  riskWatch:     RiskItem[];
  recentEvents:  Event[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtEuro(n: number) {
  return "€" + n.toLocaleString("fr-FR");
}

function fmtRelative(iso: string) {
  const diffH = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (diffH < 1) return `${Math.round(diffH * 60)}min`;
  if (diffH < 24) return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  if (diffH < 48) return "Hier";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const riskBadge = (pct: number): { label: string; color: string } => {
  if (pct >= 90) return { label: "Critique", color: "#ef4444" };
  if (pct >= 75) return { label: "Élevé",    color: "#f97316" };
  return               { label: "Modéré",    color: "#f59e0b" };
};

// ── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <style>{`@keyframes sk-pulse { 0%,100%{opacity:.18} 50%{opacity:.06} }`}</style>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 12 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 22px" }}>
            <div style={{ width: "55%", height: 9, borderRadius: 4, background: "rgba(255,255,255,0.12)", marginBottom: 12, animation: "sk-pulse 1.6s ease-in-out infinite" }} />
            <div style={{ width: "38%", height: 26, borderRadius: 6, background: "rgba(255,255,255,0.17)", animation: "sk-pulse 1.6s ease-in-out infinite" }} />
          </div>
        ))}
      </div>
      {/* Content row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 16 }}>
        {[1, 2].map(i => (
          <div key={i} style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "20px 22px", height: 180, animation: "sk-pulse 1.6s ease-in-out infinite" }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OverviewCockpit() {
  const [data, setData]     = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => fetch("/api/admin/overview", { headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} }))
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) { setError(d.error); return; }
        setData(d as OverviewData);
      })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Skeleton />;

  if (error || !data) return (
    <div style={{ padding: "20px 0", color: "#ef4444", fontSize: 13 }}>
      Erreur : {error ?? "Réponse invalide"}
    </div>
  );

  const { kpis, riskWatch, recentEvents } = data;

  // ── Section header helper ────────────────────────────────────────────────
  const sectionHeader = (title: string) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: 1.5, padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      {title}
    </div>
  );

  // ── À TRAITER items ──────────────────────────────────────────────────────
  const treatItems: { label: string; sub: string; count: number; href: string; color: string }[] = [];

  if (kpis.kycPending > 0)      treatItems.push({ label: "KYC en attente",        sub: `${kpis.kycPending} dossier${kpis.kycPending > 1 ? "s" : ""} à traiter`, count: kpis.kycPending, href: "/x8k3pz?t=kyc",    color: "#f59e0b" });
  if (kpis.pendingPayoutsCount > 0) treatItems.push({ label: "Rewards en attente", sub: `${fmtEuro(kpis.pendingPayoutsAmt)} à valider`,                           count: kpis.pendingPayoutsCount, href: "/x8k3pz?t=payouts", color: "#3b82f6" });
  if (kpis.supportNew > 0)      treatItems.push({ label: "Tickets support nouveaux", sub: `${kpis.supportNew} ticket${kpis.supportNew > 1 ? "s" : ""} non traité${kpis.supportNew > 1 ? "s" : ""}`, count: kpis.supportNew, href: "/x8k3pz/support", color: "#8b5cf6" });
  if (kpis.emailFailed24h > 0)  treatItems.push({ label: "Emails échoués (24h)",  sub: `${kpis.emailFailed24h} échec${kpis.emailFailed24h > 1 ? "s" : ""} depuis 24h`,                 count: kpis.emailFailed24h,  href: "/x8k3pz/emails",  color: "#ef4444" });
  if (riskWatch.length > 0)     treatItems.push({ label: "Comptes à risque",       sub: "DD proche de la limite",                                                  count: riskWatch.length,         href: "/x8k3pz?t=pipeline", color: "#ef4444" });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── A — KPI CARDS ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 12 }}>

        {/* Challenges actifs */}
        <Link href="/x8k3pz?t=pipeline" style={{ textDecoration: "none" }}>
          <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px", cursor: "pointer", height: "100%", boxSizing: "border-box" as const }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 10 }}>Challenges actifs</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 6, fontVariantNumeric: "tabular-nums" as const }}>{kpis.activeTotal}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{kpis.breakdown.phase1} Ph1 · {kpis.breakdown.oneStep} 1-Step · {kpis.breakdown.phase2} Ph2</div>
          </div>
        </Link>

        {/* Traders */}
        <Link href="/x8k3pz?t=crm" style={{ textDecoration: "none" }}>
          <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px", cursor: "pointer", height: "100%", boxSizing: "border-box" as const }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 10 }}>Traders</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#fff", marginBottom: 6, fontVariantNumeric: "tabular-nums" as const }}>{kpis.traders}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{kpis.certified} certifié{kpis.certified !== 1 ? "s" : ""} · {kpis.passed} en attente</div>
          </div>
        </Link>

        {/* Rewards à traiter */}
        <Link href="/x8k3pz?t=payouts" style={{ textDecoration: "none" }}>
          <div style={{ background: "#0c0c0c", border: `1px solid ${kpis.pendingPayoutsCount > 0 ? "rgba(245,158,11,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "20px 22px", cursor: "pointer", height: "100%", boxSizing: "border-box" as const }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 10 }}>Rewards à traiter</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: kpis.pendingPayoutsCount > 0 ? "#f59e0b" : "#fff", marginBottom: 6, fontVariantNumeric: "tabular-nums" as const }}>{kpis.pendingPayoutsCount}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {kpis.pendingPayoutsCount > 0 ? `${fmtEuro(kpis.pendingPayoutsAmt)} en attente` : "Aucun reward en attente"}
            </div>
          </div>
        </Link>

        {/* CA du mois */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "20px 22px", height: "100%", boxSizing: "border-box" as const }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 10 }}>CA du mois</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#22c55e", marginBottom: 6, fontVariantNumeric: "tabular-nums" as const }}>{fmtEuro(kpis.caMonth)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>KYC en attente : {kpis.kycPending}</div>
        </div>

      </div>

      {/* ── B + C — À TRAITER / CHALLENGES À SURVEILLER ───────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(280px,1.6fr)", gap: 16, alignItems: "start" }}>

        {/* B — À TRAITER */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          {sectionHeader("À traiter")}
          {treatItems.length === 0 ? (
            <div style={{ padding: "24px 20px", color: "#22c55e", fontSize: 13, fontWeight: 600, textAlign: "center" as const }}>
              Rien à traiter pour le moment.
            </div>
          ) : treatItems.map((item, i) => (
            <Link key={i} href={item.href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: i < treatItems.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{item.sub}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ background: `${item.color}20`, color: item.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 100 }}>{item.count}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 12 }}>→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* C — CHALLENGES À SURVEILLER */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: 1.5 }}>Challenges à surveiller</span>
            {riskWatch.length > 0 && <Link href="/x8k3pz?t=pipeline" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>Voir Pipeline →</Link>}
          </div>
          {riskWatch.length === 0 ? (
            <div style={{ padding: "24px 20px", color: "rgba(255,255,255,0.2)", fontSize: 13, textAlign: "center" as const }}>Aucun compte en zone de risque</div>
          ) : riskWatch.map(r => {
            const rb = riskBadge(Math.max(r.totalConsumed, r.dailyConsumed));
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const, marginBottom: 2 }}>{r.user_email}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    {r.account_size} · {r.phase === "phase2" ? "Étape 2" : r.phase === "phase1" ? "Étape 1" : r.model?.toUpperCase() ?? "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" as const, flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontVariantNumeric: "tabular-nums" as const }}>
                    Max <span style={{ color: "#fff", fontWeight: 700 }}>{r.totalDD}%</span> / {r.totalLimit}%
                  </div>
                  {r.hasDailyData && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontVariantNumeric: "tabular-nums" as const }}>
                      Daily {r.dailyDD}% / {r.dailyLimit}%
                    </div>
                  )}
                </div>
                <span style={{ background: `${rb.color}18`, color: rb.color, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, flexShrink: 0 }}>{rb.label}</span>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── D — SUPPORT + EMAIL (mini résumés côte à côte) ────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>

        {/* Support */}
        <div style={{ background: "#0c0c0c", border: `1px solid ${kpis.supportNew > 0 ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8 }}>Support</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" as const }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: kpis.supportNew > 0 ? "#a78bfa" : "#fff", fontVariantNumeric: "tabular-nums" as const }}>{kpis.supportNew}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Nouveaux</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", fontVariantNumeric: "tabular-nums" as const }}>{kpis.supportOpen}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>En cours</div>
              </div>
            </div>
          </div>
          <Link href="/x8k3pz/support" style={{ padding: "7px 14px", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", borderRadius: 7, color: "#a78bfa", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            Voir Support →
          </Link>
        </div>

        {/* Emails */}
        <div style={{ background: "#0c0c0c", border: `1px solid ${kpis.emailFailed24h > 0 ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8 }}>Emails (24h)</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" as const }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e", fontVariantNumeric: "tabular-nums" as const }}>{kpis.emailSent24h}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Envoyés</div>
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 900, color: kpis.emailFailed24h > 0 ? "#ef4444" : "rgba(255,255,255,0.4)", fontVariantNumeric: "tabular-nums" as const }}>{kpis.emailFailed24h}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Échoués</div>
              </div>
            </div>
          </div>
          <Link href="/x8k3pz/emails" style={{ padding: "7px 14px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 7, color: "#60a5fa", fontSize: 11, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" as const, flexShrink: 0 }}>
            Voir Emails →
          </Link>
        </div>

        {/* Marketing mini */}
        <Link href="/x8k3pz?t=affilies" style={{ textDecoration: "none" }}>
          <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, height: "100%", boxSizing: "border-box" as const }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.35)", textTransform: "uppercase" as const, letterSpacing: 1.5, marginBottom: 8 }}>Marketing</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                {kpis.promoActive} promo{kpis.promoActive !== 1 ? "s" : ""} active{kpis.promoActive !== 1 ? "s" : ""}
              </div>
            </div>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13 }}>→</span>
          </div>
        </Link>

      </div>

      {/* ── E + F — ACTIVITÉ RÉCENTE + ACTIONS RAPIDES ─────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,1.6fr) minmax(200px,1fr)", gap: 16, alignItems: "start" }}>

        {/* E — ACTIVITÉ RÉCENTE */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          {sectionHeader("Activité récente")}
          {recentEvents.length === 0 ? (
            <div style={{ padding: "24px 20px", color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center" as const }}>Aucune activité récente</div>
          ) : recentEvents.map((ev, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 20px", borderBottom: i < recentEvents.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
              <div style={{ width: 3, height: 30, borderRadius: 2, background: ev.color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 1 }}>{ev.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{ev.sub}</div>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", flexShrink: 0, fontVariantNumeric: "tabular-nums" as const }}>{fmtRelative(ev.at)}</div>
            </div>
          ))}
        </div>

        {/* F — ACTIONS RAPIDES */}
        <div style={{ background: "#0c0c0c", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          {sectionHeader("Actions rapides")}
          <div>
            {([
              { label: "+ Nouveau challenge",    href: "/x8k3pz?t=create",   accent: true  },
              { label: "Voir Pipeline",           href: "/x8k3pz?t=pipeline", accent: false },
              { label: "Traiter les Rewards",     href: "/x8k3pz?t=payouts",  accent: false },
              { label: "Voir les KYC",            href: "/x8k3pz?t=kyc",      accent: false },
              { label: "Voir Support Center",     href: "/x8k3pz/support",    accent: false },
              { label: "Voir Email Center",       href: "/x8k3pz/emails",     accent: false },
            ] as { label: string; href: string; accent: boolean }[]).map((a, i, arr) => (
              <Link key={i} href={a.href} style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", background: a.accent ? "rgba(59,130,246,0.07)" : "transparent", borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none", cursor: "pointer" }}>
                  <span style={{ fontSize: 13, fontWeight: a.accent ? 700 : 500, color: a.accent ? "#60a5fa" : "rgba(255,255,255,0.7)" }}>{a.label}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}




