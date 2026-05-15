"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Challenge = {
  id: string;
  user_email: string;
  account_size: string;
  model: string;
  phase: string;
  status: string;
  balance: number;
  start_balance: number;
  amount_paid: number;
  client_first_name: string;
  client_last_name: string;
  client_phone: string;
  created_at: string;
  trading_days: number;
  ctrader_account_id: string;
  ctrader_login: string;
  ctrader_password: string;
  server: string;
};

type PromoCode = {
  id: string;
  code: string;
  discount_percent: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  failed: "#ef4444",
  passed: "#C9A84C",
  funded: "#3b82f6",
};

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"challenges" | "promos">("challenges");
  const [token, setToken] = useState<string | null>(null);

  // Challenges state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Challenge>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  // Promo codes state
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [promosLoading, setPromosLoading] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", discount_percent: "", max_uses: "", expires_at: "" });
  const [promoMsg, setPromoMsg] = useState("");
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      const t = session.access_token;
      setToken(t);
      fetch("/api/admin/challenges", { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setChallenges(data);
          else setError(JSON.stringify(data));
          setLoading(false);
        });
    });
  }, [router]);

  const loadPromos = async (t: string) => {
    setPromosLoading(true);
    const res = await fetch("/api/admin/promo-codes", { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (Array.isArray(data)) setPromos(data);
    setPromosLoading(false);
  };

  useEffect(() => {
    if (tab === "promos" && token && promos.length === 0) {
      loadPromos(token);
    }
  }, [tab, token]);

  const saveChallenge = async (id: string) => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/challenges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify({ id, ...editData }),
    });
    const updated = await res.json();
    if (!res.ok || updated.error) {
      alert(`Erreur sauvegarde : ${updated.error || "Vérifiez la console"}`);
      return;
    }
    setChallenges(cs => cs.map(c => c.id === id ? { ...c, ...updated } : c));
    setEditing(null);
    setEditData({});
  };

  const createPromo = async () => {
    if (!token || !newCode.code || !newCode.discount_percent) return;
    setPromoError("");
    const res = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        code: newCode.code,
        discount_percent: Number(newCode.discount_percent),
        max_uses: newCode.max_uses ? Number(newCode.max_uses) : null,
        expires_at: newCode.expires_at || null,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setPromos(p => [data, ...p]);
      setNewCode({ code: "", discount_percent: "", max_uses: "", expires_at: "" });
      setPromoMsg("Code created!");
      setTimeout(() => setPromoMsg(""), 3000);
    } else {
      setPromoError(data.error || "Error");
    }
  };

  const togglePromo = async (promo: PromoCode) => {
    if (!token) return;
    const res = await fetch("/api/admin/promo-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: promo.id, active: !promo.active }),
    });
    const data = await res.json();
    if (res.ok) setPromos(p => p.map(x => x.id === promo.id ? data : x));
  };

  const deletePromo = async (id: string) => {
    if (!token || !confirm("Delete this promo code?")) return;
    await fetch("/api/admin/promo-codes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    });
    setPromos(p => p.filter(x => x.id !== id));
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const filtered = challenges.filter(c => {
    const matchSearch = c.user_email?.toLowerCase().includes(search.toLowerCase())
      || c.client_first_name?.toLowerCase().includes(search.toLowerCase())
      || c.client_last_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = challenges.reduce((s, c) => s + (c.amount_paid || 0), 0);
  const active = challenges.filter(c => c.status === "active").length;
  const funded = challenges.filter(c => c.status === "funded").length;
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [syncDetail, setSyncDetail] = useState("");

  const runSync = async () => {
    setSyncing(true);
    setSyncMsg("");
    setSyncDetail("");
    try {
      const res = await fetch("/api/metaapi/sync", {
        headers: { Authorization: `Bearer admin-vincentmeipro@gmail.com` },
      });
      const data = await res.json();
      setSyncMsg(`✓ ${data.synced ?? 0}/${data.total ?? 0} synchronisé(s)`);
      setSyncDetail(JSON.stringify(data.results ?? data, null, 2));
      if (token) {
        const r = await fetch("/api/admin/challenges", { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        if (Array.isArray(d)) setChallenges(d);
      }
    } catch (e) {
      setSyncMsg("Erreur de synchronisation");
      setSyncDetail(String(e));
    }
    setSyncing(false);
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#C9A84C", fontSize: 18 }}>Loading...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #ef4444", borderRadius: 12, padding: 32, maxWidth: 500 }}>
        <div style={{ color: "#ef4444", fontWeight: 700, marginBottom: 12 }}>Erreur admin</div>
        <div style={{ color: "#888", fontSize: 13, fontFamily: "monospace" }}>{error}</div>
        <a href="/dashboard" style={{ display: "block", marginTop: 20, color: "#C9A84C", fontSize: 13 }}>← Dashboard</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ backgroundColor: "#0a0a0a", borderBottom: "1px solid #1a1a1a", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>ELYSIUM <span style={{ color: "#C9A84C" }}>ADMIN</span></span>
          <div style={{ display: "flex", gap: 4 }}>
            {(["challenges", "promos"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ backgroundColor: tab === t ? "#C9A84C" : "transparent", color: tab === t ? "#000" : "#555", border: `1px solid ${tab === t ? "#C9A84C" : "#222"}`, borderRadius: 8, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", textTransform: "capitalize" }}>
                {t === "challenges" ? "Challenges" : "Promo Codes"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {syncMsg && <span style={{ color: syncMsg.startsWith("✓") ? "#22c55e" : "#ef4444", fontSize: 13, fontWeight: 600 }}>{syncMsg}</span>}
          <button onClick={runSync} disabled={syncing}
            style={{ backgroundColor: syncing ? "#1a1a1a" : "#1e3a5f", border: "1px solid #38bdf8", borderRadius: 8, color: "#38bdf8", padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: syncing ? "not-allowed" : "pointer", opacity: syncing ? 0.6 : 1 }}>
            {syncing ? "Sync en cours..." : "⟳ Sync MT5"}
          </button>
          <a href="/dashboard" style={{ color: "#555", fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</a>
        </div>
      </div>

      {syncDetail && (
        <div style={{ margin: "0 32px", backgroundColor: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: 16, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ color: "#555", fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>Résultat sync</span>
            <button onClick={() => setSyncDetail("")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16 }}>✕</button>
          </div>
          <pre style={{ color: "#38bdf8", fontSize: 12, margin: 0, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{syncDetail}</pre>
        </div>
      )}

      <div style={{ padding: "32px" }}>
        {tab === "challenges" && (
          <>
            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              {[
                { label: "Total Revenue", value: `€${totalRevenue.toLocaleString()}`, color: "#C9A84C" },
                { label: "Total Challenges", value: challenges.length, color: "#fff" },
                { label: "Active", value: active, color: "#22c55e" },
                { label: "Funded", value: funded, color: "#3b82f6" },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "20px 24px" }}>
                  <div style={{ color: "#555", fontSize: 12, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8 }}>{s.label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <input placeholder="Search by email..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ backgroundColor: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none", minWidth: 220 }} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                style={{ backgroundColor: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none" }}>
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="passed">Passed</option>
                <option value="funded">Funded</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Table */}
            <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                      {["User", "Account", "Model", "Phase", "Status", "Balance", "Paid", "Days", "Account ID", "Password", "MT5 Server", "Created", "Actions"].map(h => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "#555", fontWeight: 600, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => (<>
                      {/* IC Markets setup row */}
                      {(c.client_first_name || c.client_last_name) && (
                        <tr key={`${c.id}-icm`} style={{ backgroundColor: "rgba(201,168,76,0.03)" }}>
                          <td colSpan={14} style={{ padding: "10px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span style={{ color: "#C9A84C", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginRight: 4 }}>IC Markets →</span>
                              {[
                                { label: "Prénom", value: c.client_first_name },
                                { label: "Nom", value: c.client_last_name },
                                { label: "Email", value: c.user_email },
                                { label: "Mobile", value: c.client_phone || "+33" },
                                { label: "Balance", value: c.account_size.replace("$", "").replace(",", "") },
                              ].map((f, i) => (
                                <button key={i} onClick={() => copyToClipboard(f.value)}
                                  style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 10px", color: "#888", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                                  <span style={{ color: "#555", fontSize: 10 }}>{f.label}:</span>
                                  <span style={{ color: "#fff", fontWeight: 600 }}>{f.value}</span>
                                  <span style={{ color: "#444", fontSize: 10 }}>⎘</span>
                                </button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                      <tr key={c.id} style={{ borderBottom: "1px solid #111" }}>
                        <td style={{ padding: "14px 16px", color: "#aaa", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</td>
                        <td style={{ padding: "14px 16px", fontWeight: 700, color: "#C9A84C" }}>{c.account_size}</td>
                        <td style={{ padding: "14px 16px", color: "#888" }}>{c.model}</td>
                        <td style={{ padding: "14px 16px" }}>
                          {editing === c.id ? (
                            <select value={editData.phase || c.phase} onChange={e => setEditData(d => ({ ...d, phase: e.target.value }))}
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12 }}>
                              <option value="phase1">phase1</option>
                              <option value="phase2">phase2</option>
                              <option value="funded">funded</option>
                            </select>
                          ) : (
                            <span style={{ color: c.phase === "funded" ? "#3b82f6" : c.phase === "phase2" ? "#C9A84C" : "#888", fontWeight: 600, fontSize: 12 }}>{c.phase}</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {editing === c.id ? (
                            <select value={editData.status || c.status} onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12 }}>
                              <option value="active">active</option>
                              <option value="passed">passed</option>
                              <option value="funded">funded</option>
                              <option value="failed">failed</option>
                            </select>
                          ) : (
                            <span style={{ backgroundColor: `${STATUS_COLORS[c.status]}20`, color: STATUS_COLORS[c.status] || "#888", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                              {c.status}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", fontWeight: 700 }}>
                          {editing === c.id ? (
                            <input type="number" value={editData.balance ?? c.balance} onChange={e => setEditData(d => ({ ...d, balance: Number(e.target.value) }))}
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 90 }} />
                          ) : `$${c.balance?.toLocaleString()}`}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#22c55e" }}>€{c.amount_paid}</td>
                        <td style={{ padding: "14px 16px" }}>
                          {editing === c.id ? (
                            <input type="number" value={editData.trading_days ?? c.trading_days} onChange={e => setEditData(d => ({ ...d, trading_days: Number(e.target.value) }))}
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 60 }} />
                          ) : (
                            <span style={{ color: c.trading_days >= 4 ? "#22c55e" : "#888" }}>{c.trading_days}</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {editing === c.id ? (
                            <input type="text" placeholder="Account ID" value={editData.ctrader_account_id ?? c.ctrader_account_id ?? ""}
                              onChange={e => setEditData(d => ({ ...d, ctrader_account_id: e.target.value }))}
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 100 }} />
                          ) : (
                            <span style={{ color: c.ctrader_account_id ? "#38bdf8" : "#333", fontSize: 12, fontWeight: 700, textShadow: c.ctrader_account_id ? "0 0 8px rgba(56,189,248,0.6)" : "none" }}>{c.ctrader_account_id || "—"}</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {editing === c.id ? (
                            <input type="text" placeholder="Password" value={editData.ctrader_password ?? c.ctrader_password ?? ""}
                              onChange={e => setEditData(d => ({ ...d, ctrader_password: e.target.value }))}
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #C9A84C55", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 100 }} />
                          ) : (
                            <span style={{ color: c.ctrader_password ? "#38bdf8" : "#333", fontSize: 12, fontWeight: 700, textShadow: c.ctrader_password ? "0 0 8px rgba(56,189,248,0.6)" : "none" }}>{c.ctrader_password || "—"}</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px" }}>
                          {editing === c.id ? (
                            <input type="text" placeholder="ex: ICMarkets-Demo01" value={editData.server ?? c.server ?? ""}
                              onChange={e => setEditData(d => ({ ...d, server: e.target.value }))}
                              style={{ backgroundColor: "#1a1a1a", border: "1px solid #C9A84C55", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 140 }} />
                          ) : (
                            <span style={{ color: c.server ? "#38bdf8" : "#333", fontSize: 12, fontWeight: 700, textShadow: c.server ? "0 0 8px rgba(56,189,248,0.6)" : "none" }}>{c.server || "—"}</span>
                          )}
                        </td>
                        <td style={{ padding: "14px 16px", color: "#555" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: "14px 16px" }}>
                          {editing !== c.id && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => { setEditing(c.id); setEditData({}); }} style={{ backgroundColor: "#1a1a1a", color: "#C9A84C", border: "1px solid #C9A84C33", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                              <button onClick={async () => {
                                if (!confirm("Supprimer ce challenge ?")) return;
                                await fetch("/api/admin/challenges", {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                  body: JSON.stringify({ id: c.id }),
                                });
                                setChallenges(cs => cs.filter(x => x.id !== c.id));
                              }} style={{ backgroundColor: "#1a1a1a", color: "#ef4444", border: "1px solid #ef444433", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>✕</button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Barre Save visible sous la ligne en cours d'édition */}
                      {editing === c.id && (
                        <tr key={`${c.id}-save`}>
                          <td colSpan={13} style={{ padding: "10px 16px", backgroundColor: "rgba(201,168,76,0.08)", borderBottom: "2px solid #C9A84C33" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 700 }}>✏️ En cours d&apos;édition</span>
                              <button onClick={() => saveChallenge(c.id)}
                                style={{ backgroundColor: "#C9A84C", color: "#000", border: "none", borderRadius: 8, padding: "8px 24px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
                                ✓ Sauvegarder
                              </button>
                              <button onClick={() => { setEditing(null); setEditData({}); }}
                                style={{ backgroundColor: "transparent", color: "#555", border: "1px solid #333", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>
                                Annuler
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={13} style={{ padding: 40, textAlign: "center", color: "#333" }}>No challenges found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === "promos" && (
          <>
            {/* Create new promo code */}
            <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 16, padding: "24px", marginBottom: 24 }}>
              <div style={{ color: "#555", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 20 }}>Create New Promo Code</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ color: "#555", fontSize: 11, marginBottom: 6 }}>CODE *</div>
                  <input value={newCode.code} onChange={e => setNewCode(n => ({ ...n, code: e.target.value.toUpperCase() }))} placeholder="SUMMER25"
                    style={{ width: "100%", backgroundColor: "#1a1a1a", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", fontWeight: 700, letterSpacing: "1px", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ color: "#555", fontSize: 11, marginBottom: 6 }}>DISCOUNT % *</div>
                  <input type="number" min="1" max="100" value={newCode.discount_percent} onChange={e => setNewCode(n => ({ ...n, discount_percent: e.target.value }))} placeholder="50"
                    style={{ width: "100%", backgroundColor: "#1a1a1a", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ color: "#555", fontSize: 11, marginBottom: 6 }}>MAX USES (optional)</div>
                  <input type="number" min="1" value={newCode.max_uses} onChange={e => setNewCode(n => ({ ...n, max_uses: e.target.value }))} placeholder="Unlimited"
                    style={{ width: "100%", backgroundColor: "#1a1a1a", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ color: "#555", fontSize: 11, marginBottom: 6 }}>EXPIRES AT (optional)</div>
                  <input type="datetime-local" value={newCode.expires_at} onChange={e => setNewCode(n => ({ ...n, expires_at: e.target.value }))}
                    style={{ width: "100%", backgroundColor: "#1a1a1a", border: "1px solid #222", borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", colorScheme: "dark" }} />
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button onClick={createPromo} disabled={!newCode.code || !newCode.discount_percent}
                  style={{ backgroundColor: "#C9A84C", color: "#000", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (!newCode.code || !newCode.discount_percent) ? 0.5 : 1 }}>
                  Create Code
                </button>
                {promoMsg && <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{promoMsg}</span>}
                {promoError && <span style={{ color: "#ef4444", fontSize: 13 }}>{promoError}</span>}
              </div>
            </div>

            {/* Promo codes table */}
            <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 16, overflow: "hidden" }}>
              {promosLoading ? (
                <div style={{ padding: 40, textAlign: "center", color: "#555" }}>Loading...</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #1a1a1a" }}>
                        {["Code", "Discount", "Used", "Max Uses", "Expires", "Status", "Created", "Actions"].map(h => (
                          <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "#555", fontWeight: 600, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {promos.map(p => {
                        const isExpired = p.expires_at && new Date(p.expires_at) < new Date();
                        const isExhausted = p.max_uses !== null && p.used_count >= p.max_uses;
                        return (
                          <tr key={p.id} style={{ borderBottom: "1px solid #111", opacity: (!p.active || isExpired || isExhausted) ? 0.5 : 1 }}>
                            <td style={{ padding: "14px 16px", fontWeight: 800, fontFamily: "monospace", letterSpacing: "1px", color: "#C9A84C" }}>{p.code}</td>
                            <td style={{ padding: "14px 16px", fontWeight: 700, color: p.discount_percent === 100 ? "#22c55e" : "#fff" }}>
                              {p.discount_percent === 100 ? "100% (FREE)" : `${p.discount_percent}%`}
                            </td>
                            <td style={{ padding: "14px 16px", color: "#888" }}>{p.used_count}</td>
                            <td style={{ padding: "14px 16px", color: "#555" }}>{p.max_uses ?? "∞"}</td>
                            <td style={{ padding: "14px 16px", color: isExpired ? "#ef4444" : "#555", fontSize: 12 }}>
                              {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : "Never"}
                            </td>
                            <td style={{ padding: "14px 16px" }}>
                              {isExpired ? (
                                <span style={{ backgroundColor: "#ef444420", color: "#ef4444", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>expired</span>
                              ) : isExhausted ? (
                                <span style={{ backgroundColor: "#f59e0b20", color: "#f59e0b", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>exhausted</span>
                              ) : p.active ? (
                                <span style={{ backgroundColor: "#22c55e20", color: "#22c55e", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>active</span>
                              ) : (
                                <span style={{ backgroundColor: "#55555520", color: "#555", padding: "3px 10px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>revoked</span>
                              )}
                            </td>
                            <td style={{ padding: "14px 16px", color: "#555" }}>{new Date(p.created_at).toLocaleDateString()}</td>
                            <td style={{ padding: "14px 16px" }}>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button onClick={() => togglePromo(p)}
                                  style={{ backgroundColor: "#1a1a1a", color: p.active ? "#ef4444" : "#22c55e", border: `1px solid ${p.active ? "#ef444433" : "#22c55e33"}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                                  {p.active ? "Revoke" : "Restore"}
                                </button>
                                <button onClick={() => deletePromo(p.id)}
                                  style={{ backgroundColor: "#1a1a1a", color: "#555", border: "1px solid #222", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {promos.length === 0 && (
                        <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "#333" }}>No promo codes yet</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
