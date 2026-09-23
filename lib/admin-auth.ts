/**
 * Auth admin — session Supabase uniquement.
 * Bearer (Authorization) ou cookie de session. L'email doit être ADMIN_EMAIL.
 */

import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "vincentmeipro@gmail.com")
  .trim()
  .replace(/^["']|["']$/g, "");

const ADMIN_EMAILS = new Set(
  [ADMIN_EMAIL, "vincentmeipro@gmail.com"].map((email) => email.toLowerCase()),
);

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

export async function checkAdmin(
  req: NextRequest
): Promise<{ ok: boolean; userId: string | null; email: string | null; reason?: string }> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (token) {
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (!error && user?.email) {
      if (!isAdminEmail(user.email)) {
        return { ok: false, userId: null, email: user.email, reason: "email mismatch" };
      }
      return { ok: true, userId: user.id, email: user.email };
    }
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!error && user?.email) {
      if (!isAdminEmail(user.email)) {
        return { ok: false, userId: null, email: user.email, reason: "email mismatch" };
      }
      return { ok: true, userId: user.id, email: user.email };
    }
  } catch {
    // pas de session cookie
  }

  return { ok: false, userId: null, email: null, reason: "no session" };
}
