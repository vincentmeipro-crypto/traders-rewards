"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Navigation structure ──────────────────────────────────────
type NavItem = { id: string; label: string; sub?: boolean; href: string };
type NavGroup =
  | { items: NavItem[]; section?: string }
  | { separator: true };

const NAV: NavGroup[] = [
  { items: [{ id: "overview", label: "Cockpit", href: "/x8k3pz" }] },
  { section: "CHALLENGES", items: [
    { id: "pipeline", label: "Comptes", href: "/x8k3pz?t=pipeline" },
    { id: "products", label: "Offres & règles", sub: true, href: "/x8k3pz/products" },
  ]},
  { section: "TRADERS", items: [
    { id: "crm", label: "Clients", href: "/x8k3pz?t=crm" },
    { id: "kyc", label: "KYC",     sub: true, href: "/x8k3pz?t=kyc" },
  ]},
  { section: "FINANCE", items: [
    { id: "payouts",   label: "Rewards",       href: "/x8k3pz?t=payouts"   },
    { id: "financier", label: "Transactions",  sub: true, href: "/x8k3pz?t=financier" },
    { id: "compta",    label: "Comptabilité",  sub: true, href: "/x8k3pz?t=compta"    },
  ]},
  { section: "MARKETING", items: [
    { id: "affilies",   label: "Affiliés",    href: "/x8k3pz?t=affilies"  },
    { id: "promotions", label: "Promotions",  sub: true, href: "/x8k3pz/promotions"   },
    { id: "emails",     label: "Emails",      sub: true, href: "/x8k3pz/emails"        },
  ]},
  { section: "SUPPORT", items: [
    { id: "support", label: "Tickets", href: "/x8k3pz/support" },
  ]},
  { separator: true },
  { items: [
    { id: "stats",    label: "Analytics", href: "/x8k3pz?t=stats"    },
    { id: "securite", label: "Sécurité",  href: "/x8k3pz?t=securite" },
  ]},
  { separator: true },
  { section: "SETTINGS", items: [
    { id: "settings",    label: "Plateforme",  href: "/x8k3pz?t=settings"    },
    { id: "maintenance", label: "Maintenance", sub: true, href: "/x8k3pz?t=maintenance" },
  ]},
];

// ── Sidebar inner (client — needs usePathname + useSearchParams) ──
function SidebarInner() {
  const supabase      = useMemo(() => createClient(), []);
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const activeTab    = searchParams.get("t") ?? "overview";
  const isProducts    = pathname.startsWith("/x8k3pz/products");
  const isPromotions  = pathname.startsWith("/x8k3pz/promotions");
  const isEmails      = pathname.startsWith("/x8k3pz/emails");
  const isTraders     = pathname.startsWith("/x8k3pz/traders");
  const isSupport     = pathname.startsWith("/x8k3pz/support");
  const [supportCounts, setSupportCounts] = useState({ tickets: 0, chat: 0 });

  useEffect(() => {
    let cancelled = false;
    const refreshSupportCounts = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || cancelled) return;
      const headers = { Authorization: `Bearer ${session.access_token}` };
      try {
        const [ticketsResponse, chatResponse] = await Promise.all([
          fetch("/api/admin/support?status=new&page=1&limit=1", { headers, cache: "no-store" }),
          fetch("/api/admin/chat?status=waiting_support&page=1", { headers, cache: "no-store" }),
        ]);
        if (cancelled) return;
        const ticketsData = ticketsResponse.ok ? await ticketsResponse.json() as { totalNew?: number } : {};
        const chatData = chatResponse.ok ? await chatResponse.json() as { totalWaiting?: number } : {};
        setSupportCounts({ tickets: ticketsData.totalNew ?? 0, chat: chatData.totalWaiting ?? 0 });
      } catch { /* prochaine tentative automatique */ }
    };
    void refreshSupportCounts();
    const interval = window.setInterval(refreshSupportCounts, 8_000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [supabase]);

  const isActive = (id: string) => {
    if (isProducts)   return id === "products";
    if (isPromotions) return id === "promotions";
    if (isEmails)     return id === "emails";
    if (isTraders)    return id === "crm";
    if (isSupport)    return id === "support";
    return id === activeTab;
  };

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: "linear-gradient(180deg,#0b0f12 0%,#07090b 55%,#050607 100%)",
      borderRight: "1px solid rgba(255,255,255,0.08)",
      display: "flex", flexDirection: "column",
      position: "sticky", top: 0, height: "100vh", overflowY: "auto",
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/logo-nom-noir.png" style={{ width: 34, height: 34, objectFit: "contain" }} alt="" />
        <div>
          <div style={{ color: "#fff", fontWeight: 900, fontSize: 13, letterSpacing: 0.5 }}>Traders Rewards</div>
          <div style={{ color: "rgba(255,255,255,0.25)", fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>Admin</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "10px 8px", flex: 1 }}>
        {NAV.map((group, gi) => {
          if ("separator" in group) return (
            <div key={gi} style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", margin: "8px 8px" }} />
          );

          const g = group as { items: NavItem[]; section?: string };
          return (
            <div key={gi} style={{ marginBottom: 4 }}>
              {g.section && (
                <div style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                  color: "rgba(255,255,255,0.25)", textTransform: "uppercase",
                  padding: "10px 14px 4px",
                }}>
                  {g.section}
                </div>
              )}
              {g.items.map(item => {
                const active = isActive(item.id);
                return (
                  <Link key={item.id} href={item.href} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: item.sub ? "7px 14px 7px 22px" : "9px 14px",
                    background: active ? "linear-gradient(110deg,rgba(156,207,234,.22),rgba(199,208,215,.07))" : "transparent",
                    borderLeft: `3px solid ${active ? "#9CCFEA" : "transparent"}`,
                    borderRadius: "0 6px 6px 0",
                    color: active ? "#fff" : item.sub ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.6)",
                    fontWeight: active ? 700 : item.sub ? 400 : 500,
                    fontSize: item.sub ? 12 : 13,
                    textDecoration: "none", marginBottom: 1,
                  }}>
                    {item.label}
                    {item.id === "support" && (supportCounts.tickets > 0 || supportCounts.chat > 0) && (
                      <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {supportCounts.tickets > 0 && <span title={`${supportCounts.tickets} nouveau(x) ticket(s)`} style={{ minWidth: 22, height: 19, padding: "0 6px", display: "inline-grid", placeItems: "center", borderRadius: 100, background: "#9CCFEA", color: "#061018", fontSize: 9, fontWeight: 900 }}>✉ {supportCounts.tickets > 99 ? "99+" : supportCounts.tickets}</span>}
                        {supportCounts.chat > 0 && <span title={`${supportCounts.chat} chat(s) à traiter`} style={{ minWidth: 22, height: 19, padding: "0 6px", display: "inline-grid", placeItems: "center", borderRadius: 100, background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 900 }}>● {supportCounts.chat > 99 ? "99+" : supportCounts.chat}</span>}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer CTA */}
      <div style={{ padding: "12px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/x8k3pz?t=create" style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "9px 14px",
          background: "linear-gradient(110deg,#f3f7f9,#9ccfea 40%,#e9eef2 72%,#788b98)",
          border: "1px solid rgba(255,255,255,.65)",
          borderRadius: 8, color: "#071018",
          fontWeight: 700, fontSize: 12, letterSpacing: 0.3,
          textDecoration: "none",
        }}>
          + NOUVEAU CHALLENGE
        </Link>
      </div>
    </aside>
  );
}

// ── Shell layout ──────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell" style={{
      display: "flex", minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#fff", background: "#050505",
    }}>
      <style>{`
        .admin-sidebar { display: flex; flex-direction: column; }
        @media (max-width: 639px) { .admin-sidebar { display: none !important; } }
      `}</style>

      {/* Sidebar — desktop only */}
      <div className="admin-sidebar">
        <Suspense fallback={null}>
          <SidebarInner />
        </Suspense>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {children}
      </div>
    </div>
  );
}
