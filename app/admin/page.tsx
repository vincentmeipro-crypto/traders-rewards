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
  created_at: string;
  trading_days: number;
};

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  failed: "#ef4444",
  passed: "#C9A84C",
  funded: "#3b82f6",
};

export default function AdminPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Challenge>>({});
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      fetch("/api/admin/challenges")
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) setChallenges(data);
          else setError(JSON.stringify(data));
          setLoading(false);
        });
    });
  }, [router]);

  const save = async (id: string) => {
    const res = await fetch("/api/admin/challenges", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...editData }),
    });
    const updated = await res.json();
    setChallenges(cs => cs.map(c => c.id === id ? { ...c, ...updated } : c));
    setEditing(null);
    setEditData({});
  };

  const filtered = challenges.filter(c => {
    const matchSearch = c.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = challenges.reduce((s, c) => s + (c.amount_paid || 0), 0);
  const active = challenges.filter(c => c.status === "active").length;
  const funded = challenges.filter(c => c.status === "funded").length;

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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.5px" }}>ELYSIUM <span style={{ color: "#C9A84C" }}>ADMIN</span></span>
        </div>
        <a href="/dashboard" style={{ color: "#555", fontSize: 13, textDecoration: "none" }}>← Back to Dashboard</a>
      </div>

      <div style={{ padding: "32px" }}>
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
          <input
            placeholder="Search by email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ backgroundColor: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none", minWidth: 220 }}
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            style={{ backgroundColor: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: "10px 16px", color: "#fff", fontSize: 14, outline: "none" }}
          >
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
                  {["User", "Account", "Model", "Phase", "Status", "Balance", "Paid", "Days", "Created", "Actions"].map(h => (
                    <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "#555", fontWeight: 600, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #111" }}>
                    <td style={{ padding: "14px 16px", color: "#aaa", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.user_email}</td>
                    <td style={{ padding: "14px 16px", fontWeight: 700, color: "#C9A84C" }}>{c.account_size}</td>
                    <td style={{ padding: "14px 16px", color: "#888" }}>{c.model}</td>
                    <td style={{ padding: "14px 16px", color: "#888" }}>{c.phase}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {editing === c.id ? (
                        <select
                          value={editData.status || c.status}
                          onChange={e => setEditData(d => ({ ...d, status: e.target.value }))}
                          style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12 }}
                        >
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
                        <input
                          type="number"
                          value={editData.balance ?? c.balance}
                          onChange={e => setEditData(d => ({ ...d, balance: Number(e.target.value) }))}
                          style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "4px 8px", color: "#fff", fontSize: 12, width: 90 }}
                        />
                      ) : (
                        `$${c.balance?.toLocaleString()}`
                      )}
                    </td>
                    <td style={{ padding: "14px 16px", color: "#22c55e" }}>€{c.amount_paid}</td>
                    <td style={{ padding: "14px 16px", color: "#888" }}>{c.trading_days}</td>
                    <td style={{ padding: "14px 16px", color: "#555" }}>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: "14px 16px" }}>
                      {editing === c.id ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => save(c.id)} style={{ backgroundColor: "#C9A84C", color: "#000", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                          <button onClick={() => { setEditing(null); setEditData({}); }} style={{ backgroundColor: "#1a1a1a", color: "#888", border: "1px solid #333", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditing(c.id); setEditData({}); }} style={{ backgroundColor: "#1a1a1a", color: "#C9A84C", border: "1px solid #C9A84C33", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer" }}>Edit</button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: "#333" }}>No challenges found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
