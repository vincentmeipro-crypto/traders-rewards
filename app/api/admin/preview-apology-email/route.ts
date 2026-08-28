// DEPRECATED — Phase 3B-1b
// Cette route est conservée pour compatibilité avec le bouton admin
// dans app/x8k3pz/page.tsx (section Maintenance).
//
// Elle délègue désormais à sendTestEmail() avec fake data.
// Les credentials MT5 réels ont été retirés définitivement.
//
// Migration prévue en 3B-1b2 : le bouton sera mis à jour pour
// appeler directement POST /api/admin/emails/test.

import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { sendTestEmail } from "@/lib/mailer";

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await sendTestEmail({ templateType: "apology" });

  return NextResponse.json({ ok: true });
}
