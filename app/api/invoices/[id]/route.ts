/**
 * ============================================================
 * GET /api/invoices/[id] — Facture HTML ou données JSON
 * ============================================================
 * Récupère une facture spécifique et la rend en HTML.
 * Seul le propriétaire (user_id) peut y accéder.
 *
 * Query params:
 * - format: "html" (défaut) ou "json"
 *
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildInvoiceHTML, type InvoiceData } from "@/lib/invoice-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoiceId = id;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "html";

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID required" },
        { status: 400 }
      );
    }

    // Authentification
    const adminClient = createAdminClient();
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized — missing token" },
        { status: 401 }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized — invalid token" },
        { status: 401 }
      );
    }

    // Récupérer la facture
    const { data: invoice, error } = await adminClient
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();

    if (error) {
      console.error("[invoices/[id]] query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoice" },
        { status: 500 }
      );
    }

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Vérifier l'accès (seul propriétaire ou admin)
    if (invoice.user_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden — not your invoice" },
        { status: 403 }
      );
    }

    // Retourner selon le format demandé
    if (format === "json") {
      return NextResponse.json({
        success: true,
        data: invoice as InvoiceData,
      });
    }

    // Format HTML (par défaut)
    const html = buildInvoiceHTML(invoice as InvoiceData);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, max-age=3600",
        "Content-Disposition": `inline; filename="${invoice.invoice_number}.html"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[invoices/[id]]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
