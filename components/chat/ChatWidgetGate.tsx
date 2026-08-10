"use client";

/**
 * TRADERS REWARDS — Live Chat Gate
 * Phase 3B-3c3
 *
 * Wrapper "use client" qui lit usePathname() et décide si le widget doit
 * s'afficher. Importé dans app/layout.tsx (Server Component).
 *
 * Widget MASQUÉ sur :
 *   /x8k3pz/**   → CRM admin
 *   /checkout*   → flux paiement
 *   /admin-pub   → page admin publique
 *
 * Widget VISIBLE partout ailleurs.
 *
 * Lazy-loaded (ssr: false) car le widget utilise des APIs browser
 * (cookies, Supabase Realtime, window).
 */

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

const LiveChatWidget = dynamic(() => import("./LiveChatWidget"), {
  ssr: false,
  loading: () => null,
});

const HIDE_PREFIXES = [
  "/x8k3pz",
  "/checkout",
  "/checkout-vip",
  "/admin-pub",
];

export default function ChatWidgetGate() {
  const pathname = usePathname();
  const hidden = HIDE_PREFIXES.some((p) => pathname.startsWith(p));
  if (hidden) return null;
  return <LiveChatWidget />;
}
