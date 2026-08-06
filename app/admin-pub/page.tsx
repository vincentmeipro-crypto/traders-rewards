/**
 * Page admin publique — sans connexion Supabase
 * Accessible via : /admin-pub?key=tr2026-monitor-k9x
 * Lecture seule — aucune donnée personnelle sensible exposée
 */

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

const ACCESS_KEY = process.env.MONITOR_KEY || "tr2026-monitor-k9x";

interface Props {
  searchParams: Promise<{ key?: string }>;
}

export default async function AdminPubPage({ searchParams }: Props) {
  const { key } = await searchParams;
  if (key !== ACCESS_KEY) {
    redirect("/");
  }

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  // Challenges
  const { data: challenges } = await admin
    .from("challenges")
    .select("id, status, phase, model, balance, start_balance, mt5_login, created_at, profit_target, daily_drawdown_limit, total_drawdown_limit")
    .order("created_at", { ascending: false });

  // Payouts
  const { data: payouts } = await admin
    .from("payouts")
    .select("id, status, amount, created_at, challenge_id")
    .order("created_at", { ascending: false });

  // Profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, first_name, last_name, country, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  // Settings
  const { data: settingsRows } = await admin
    .from("settings")
    .select("key, value, category, updated_at")
    .order("category");

  // Stats
  const byStatus: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  let todayCount = 0;
  let weekCount = 0;
  let totalCapital = 0;

  for (const c of challenges ?? []) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    byModel[c.model ?? "?"] = (byModel[c.model ?? "?"] ?? 0) + 1;
    if (new Date(c.created_at) >= todayStart) todayCount++;
    if (new Date(c.created_at) >= weekStart) weekCount++;
    totalCapital += Number(c.start_balance ?? 0);
  }

  const active = (byStatus["active"] ?? 0) + (byStatus["phase2"] ?? 0);
  const funded = byStatus["funded"] ?? 0;
  const passed = byStatus["passed"] ?? 0;
  const failed = byStatus["failed"] ?? 0;
  const breached = byStatus["breached"] ?? 0;

  const totalPayouts = payouts?.length ?? 0;
  const pendingPayouts = payouts?.filter(p => p.status === "pending").length ?? 0;
  const approvedPayouts = payouts?.filter(p => p.status === "approved" || p.status === "paid").length ?? 0;

  const fmtDate = (d: string) => new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const fmtMoney = (n: number) => n.toLocaleString("fr-FR") + " $";

  const statusColor: Record<string, string> = {
    active: "#3B82F6",
    phase2: "#8B5CF6",
    funded: "#10B981",
    passed: "#F59E0B",
    failed: "#EF4444",
    breached: "#DC2626",
    pending: "#6B7280",
  };

  const statusLabel: Record<string, string> = {
    active: "Actif",
    phase2: "Phase 2",
    funded: "Funded",
    passed: "Passé",
    failed: "Échoué",
    breached: "Breach",
    pending: "En attente",
  };

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", fontFamily: "system-ui, sans-serif", padding: "24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, borderBottom: "1px solid #222", paddingBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: "#666", letterSpacing: 2, textTransform: "uppercase", marginBottom: 4 }}>Traders Rewards — Vue Admin</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>📊 Dashboard Monitor</h1>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#666" }}>Actualisé le</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>{now.toLocaleString("fr-FR")}</div>
          <a href={`/admin-pub?key=${key}`} style={{ display: "inline-block", marginTop: 8, fontSize: 11, color: "#3B82F6", textDecoration: "none", background: "#1a2744", padding: "4px 12px", borderRadius: 4 }}>↻ Rafraîchir</a>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 32 }}>
        {[
          { label: "Total challenges", value: challenges?.length ?? 0, color: "#3B82F6" },
          { label: "Actifs", value: active, color: "#3B82F6" },
          { label: "Funded", value: funded, color: "#10B981" },
          { label: "Breach / Échoués", value: (breached + failed), color: "#EF4444" },
          { label: "Passés", value: passed, color: "#F59E0B" },
          { label: "Aujourd'hui", value: todayCount, color: "#8B5CF6" },
          { label: "Cette semaine", value: weekCount, color: "#6366F1" },
          { label: "Capital total", value: fmtMoney(totalCapital), color: "#10B981", small: true },
          { label: "Payouts en attente", value: pendingPayouts, color: pendingPayouts > 0 ? "#F59E0B" : "#666" },
          { label: "Payouts approuvés", value: approvedPayouts, color: "#10B981" },
        ].map(({ label, value, color, small }) => (
          <div key={label} style={{ background: "#111", borderRadius: 10, padding: "16px 20px", border: "1px solid #1e1e1e" }}>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
            <div style={{ fontSize: small ? 18 : 28, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Challenges table */}
      <Section title="🎯 Challenges" count={challenges?.length}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #222" }}>
              {["ID", "Modèle", "Phase", "Statut", "Balance", "Capital", "MT5 Login", "Créé le"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(challenges ?? []).map((c, i) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #161616", background: i % 2 === 0 ? "transparent" : "#0d0d0d" }}>
                <td style={{ padding: "10px 12px", color: "#666", fontFamily: "monospace", fontSize: 11 }}>{c.id.slice(0, 8)}…</td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{c.model?.toUpperCase()}</td>
                <td style={{ padding: "10px 12px", color: "#aaa" }}>{c.phase}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span style={{ background: `${statusColor[c.status] ?? "#666"}22`, color: statusColor[c.status] ?? "#aaa", padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{Number(c.balance).toLocaleString("fr-FR")} $</td>
                <td style={{ padding: "10px 12px", color: "#aaa" }}>{Number(c.start_balance).toLocaleString("fr-FR")} $</td>
                <td style={{ padding: "10px 12px", color: "#aaa", fontFamily: "monospace" }}>{c.mt5_login ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: "#666" }}>{fmtDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Payouts table */}
      <Section title="💰 Payouts" count={totalPayouts}>
        {totalPayouts === 0 ? (
          <div style={{ color: "#666", padding: "24px", textAlign: "center" }}>Aucun payout</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                {["ID", "Statut", "Montant", "Créé le"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(payouts ?? []).map((p, i) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #161616", background: i % 2 === 0 ? "transparent" : "#0d0d0d" }}>
                  <td style={{ padding: "10px 12px", color: "#666", fontFamily: "monospace", fontSize: 11 }}>{p.id.slice(0, 8)}…</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: `${statusColor[p.status] ?? "#666"}22`, color: statusColor[p.status] ?? "#aaa", padding: "2px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>{Number(p.amount).toLocaleString("fr-FR")} $</td>
                  <td style={{ padding: "10px 12px", color: "#666" }}>{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Traders récents */}
      <Section title="👤 Traders récents" count={profiles?.length}>
        {(profiles?.length ?? 0) === 0 ? (
          <div style={{ color: "#666", padding: "24px", textAlign: "center" }}>Aucun profil</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #222" }}>
                {["Prénom", "Nom", "Pays", "Inscrit le"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "#666", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).map((p, i) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #161616", background: i % 2 === 0 ? "transparent" : "#0d0d0d" }}>
                  <td style={{ padding: "10px 12px" }}>{p.first_name ?? "—"}</td>
                  <td style={{ padding: "10px 12px" }}>{p.last_name ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#aaa" }}>{p.country ?? "—"}</td>
                  <td style={{ padding: "10px 12px", color: "#666" }}>{fmtDate(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Settings */}
      <Section title="⚙️ Settings" count={settingsRows?.length}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
          {(settingsRows ?? []).map(s => (
            <div key={s.key} style={{ background: "#0d0d0d", borderRadius: 6, padding: "10px 14px", border: "1px solid #1e1e1e" }}>
              <div style={{ fontSize: 11, color: "#3B82F6", fontFamily: "monospace", marginBottom: 4 }}>{s.key}</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{JSON.stringify(s.value)}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>{s.updated_at ? fmtDate(s.updated_at) : ""}</div>
            </div>
          ))}
        </div>
      </Section>

      <div style={{ marginTop: 32, textAlign: "center", color: "#333", fontSize: 11 }}>
        Traders Rewards — Admin Monitor — Lecture seule — {now.toISOString()}
      </div>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32, background: "#111", borderRadius: 12, border: "1px solid #1e1e1e", overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid #1e1e1e", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{title}</span>
        {count !== undefined && (
          <span style={{ fontSize: 12, background: "#1e1e1e", color: "#aaa", padding: "2px 8px", borderRadius: 12 }}>{count}</span>
        )}
      </div>
      <div style={{ overflowX: "auto" }}>{children}</div>
    </div>
  );
}
