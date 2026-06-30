import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Récupérer tous les login_events
  const { data: events } = await admin
    .from("login_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!events) return NextResponse.json({ shared_ips: [], shared_fingerprints: [], events: [] });

  // IPs partagées entre plusieurs comptes
  const ipMap = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.ip || e.ip === "unknown" || e.ip === "::1") continue;
    if (!ipMap.has(e.ip)) ipMap.set(e.ip, new Set());
    ipMap.get(e.ip)!.add(e.user_email);
  }
  const shared_ips = Array.from(ipMap.entries())
    .filter(([, emails]) => emails.size > 1)
    .map(([ip, emails]) => ({
      ip,
      emails: Array.from(emails),
      count: emails.size,
      events: events.filter(e => e.ip === ip),
    }))
    .sort((a, b) => b.count - a.count);

  // Fingerprints partagés entre plusieurs comptes
  const fpMap = new Map<string, Set<string>>();
  for (const e of events) {
    if (!e.fingerprint) continue;
    if (!fpMap.has(e.fingerprint)) fpMap.set(e.fingerprint, new Set());
    fpMap.get(e.fingerprint)!.add(e.user_email);
  }
  const shared_fingerprints = Array.from(fpMap.entries())
    .filter(([, emails]) => emails.size > 1)
    .map(([fingerprint, emails]) => ({
      fingerprint,
      emails: Array.from(emails),
      count: emails.size,
      events: events.filter(e => e.fingerprint === fingerprint),
    }))
    .sort((a, b) => b.count - a.count);

  // VPN users
  const vpn_users = events.filter(e => e.is_vpn);

  return NextResponse.json({ shared_ips, shared_fingerprints, vpn_users, events });
}
