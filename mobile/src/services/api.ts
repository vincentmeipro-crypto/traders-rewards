import type { DashboardSnapshot } from "../domain/types";
import { config } from "./config";
import { supabase } from "./supabase";

export class SessionExpired extends Error {}
export class SiteAccessRequired extends Error {}
export async function authorizedGet(path: string, signal: AbortSignal): Promise<unknown> {
  if (!supabase) throw new Error("La connexion n’est pas encore configurée.");
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data: { session }, error } = attempt === 0 ? await supabase.auth.getSession() : await supabase.auth.refreshSession();
    if (error || !session) throw new SessionExpired("Votre session a expiré. Reconnectez-vous.");
    const response = await fetch(`${config.apiOrigin}${path}`, {
      headers: { Authorization: `Bearer ${session.access_token}`, Accept: "application/json" },
      credentials: "include", signal,
    });
    if (response.status === 401) { if (attempt === 0) continue; throw new SessionExpired("Votre session a expiré."); }
    if (!response.headers.get("content-type")?.includes("application/json")) {
      if (response.url.includes("/gate")) throw new SiteAccessRequired("L’accès privé du site est encore activé.");
      throw new Error("Le service mobile n’est pas disponible pour le moment.");
    }
    if (!response.ok) throw new Error(response.status === 404 ? "Ce compte n’est plus disponible. Actualisez votre liste de comptes." : "Impossible de charger vos données. Réessayez dans un instant.");
    return response.json();
  }
  throw new SessionExpired("Votre session a expiré.");
}

export async function loadDashboard(accountId: string | null, signal: AbortSignal): Promise<DashboardSnapshot> {
  const query = accountId ? `?account=${encodeURIComponent(accountId)}` : '';
  const data = await authorizedGet(`/api/mobile/dashboard${query}`, signal) as DashboardSnapshot;
  if (data.version !== 1 || !Array.isArray(data.accounts) || !Array.isArray(data.trades)
    || !Array.isArray(data.rewards) || !data.profile || typeof data.asOf !== 'string')
    throw new Error('Le service mobile doit être mis à jour.');
  return data;
}

/** Existing gate flow, with its existing HttpOnly cookie. Never embed the site's password. */
export async function unlockSite(password: string) {
  const response = await fetch(`${config.apiOrigin}/api/site-access`, {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw new Error("Accès privé refusé. Vérifiez le code d’accès.");
}
