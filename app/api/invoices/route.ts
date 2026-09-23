/**
 * ============================================================
 * GET /api/invoices — Liste factures de l'utilisateur authentifié
 * ============================================================
 * Accessible aux utilisateurs authentifiés (leur propres factures).
 * Service role peut lister toutes les factures.
 *
 * Params:
 * - limit: nombre de factures par page (défaut 20, max 100)
 * - offset: offset pagination (défaut 0)
 * ============================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

interface InvoiceListItem {
  id: string;
  invoice_number: string;
  challenge_id: string | null;
  issued_at: string;
  currency: string;
  amount_paid_cents: number;
  product_name: string;
  account_size: string;
  language: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);

    // Créer un client autentifié pour vérifier l'utilisateur
    const adminClient = createAdminClient();

    // Récupérer l'utilisateur actuel depuis le header Authorization
    // (dans un endpoint réel, utiliser getUser() de la session)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized — missing token" },
        { status: 401 }
      );
    }

    // Récupérer les données utilisateur
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

    // Récupérer les factures de l'utilisateur
    const { data: invoices, error, count } = await adminClient
      .from("invoices")
      .select(
        "id, invoice_number, challenge_id, issued_at, currency, amount_paid_cents, product_name, account_size, language",
        { count: "exact" }
      )
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("[invoices/route] query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: invoices as InvoiceListItem[],
      pagination: {
        limit,
        offset,
        total: count ?? 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[invoices/route]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
