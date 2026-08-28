import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { isValidEmailType, buildPreviewFor } from "@/lib/email-templates";
import { getCatalogEntry } from "@/lib/email-catalog";

// POST /api/admin/emails/preview
//
// Body accepté : { type: string, model?: string }
// Tout autre champ est ignoré.
//
// Sécurité :
//   - checkAdmin obligatoire
//   - Le client ne choisit que `type`
//   - Le serveur choisit builder + fake data + subject + html
//   - Aucun appel Resend
//   - Aucune insertion email_logs
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

  const type         = (body as Record<string, unknown>)?.type;
  const previewModel = (body as Record<string, unknown>)?.model;
  if (typeof type !== "string" || !isValidEmailType(type)) {
    return NextResponse.json({ error: "Type inconnu." }, { status: 400 });
  }

  const { subject, html } = buildPreviewFor(type, typeof previewModel === "string" ? previewModel : undefined);
  const entry = getCatalogEntry(type);

  return NextResponse.json({
    type,
    subject,
    html,
    sensitive: entry?.sensitive ?? false,
    variables: entry?.variables ?? [],
    label:     entry?.label     ?? type,
    trigger:   entry?.trigger   ?? "",
  });
}
