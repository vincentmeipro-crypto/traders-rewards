"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";

// ── Navigation structure ──────────────────────────────────────
type NavItem = { id: string; label: string; sub?: boolean; href: string };
type NavGroup =
  | { items: NavItem[]; section?: string }
  | { separator: true };

const NAV: NavGroup[] = [
  { items: [{ id: "overview", label: "Overview", href: "/x8k3pz" }] },
  { section: "CHALLENGES", items: [
    { id: "pipeline", label: "Challenges",  href: "/x8k3pz?t=pipeline" },
    { id: "products", label: "Produits", sub: true, href: "/x8k3pz/products" },
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
    { id: "affilies", label: "Affiliés",    href: "/x8k3pz?t=affilies" },
    { id: "promos",   label: "Codes promo", sub: true, href: "/x8k3pz?t=promos" },
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
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const activeTab    = searchParams.get("t") ?? "overview";
  const isProducts   = pathname.startsWith("/x8k3pz/products");

  const isActive = (id: string) => {
    if (isProducts) return id === "products";
    return id === activeTab;
  };

  return (
    <aside style={{
      width: 220, flexShrink: 0,
      backgroundColor: "#0c0c0c",
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
                    background: active ? "rgba(59,130,246,0.12)" : "transparent",
                    borderLeft: `3px solid ${active ? "#3B82F6" : "transparent"}`,
                    borderRadius: "0 6px 6px 0",
                    color: active ? "#fff" : item.sub ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.6)",
                    fontWeight: active ? 700 : item.sub ? 400 : 500,
                    fontSize: item.sub ? 12 : 13,
                    textDecoration: "none", marginBottom: 1,
                  }}>
                    {item.label}
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
          background: "rgba(59,130,246,0.1)",
          border: "1px solid rgba(59,130,246,0.25)",
          borderRadius: 8, color: "#60a5fa",
          fontWeight: 700, fontSize: 12, letterSpacing: 0.3,
          textDecoration: "none",
        }}>
          + Nouveau Challenge
        </Link>
      </div>
    </aside>
  );
}

// ── Shell layout ──────────────────────────────────────────────
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: "#fff", background: "#050505",
    }}>
      <style>{`
        .admin-sidebar { display: flex; flex-direction: column; }
        @media (max-width: 767px) { .admin-sidebar { display: none !important; } }
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
