import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, ADMIN_EMAIL } from "@/lib/admin-auth";
import { isValidEmailType } from "@/lib/email-templates";
import { sendTestEmail } from "@/lib/mailer";

// POST /api/admin/emails/test
//
// Body accepté : { type: string }
// Champs ignorés : to, html, subject, password, variables, ou tout autre.
//
// Sécurité :
//   - checkAdmin obligatoire
//   - Le destinataire est ADMIN_EMAIL (résolu côté serveur)
//   - Aucun destinataire arbitraire accepté
//   - Subject préfixé [TEST] côté serveur (dans sendTestEmail)
//   - Journalisé avec type = "test:{templateType}"
//   - Aucun événement métier déclenché

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 });
  }

  const type = (body as Record<string, unknown>)?.type;
  if (typeof type !== "string" || !isValidEmailType(type)) {
    return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
  }

  const result = await sendTestEmail({ templateType: type });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error || "Échec de l'envoi du test." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok:      true,
    type:    `test:${type}`,
    to:      ADMIN_EMAIL,
    resendId: result.resendId,
  });
}
