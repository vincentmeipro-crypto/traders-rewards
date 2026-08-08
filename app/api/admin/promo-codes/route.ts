import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  normalizeCode,
  validateCode,
  validateName,
  validateDiscount,
  validateMaxUses,
  parseDate,
  validateDates,
  validateTargetingMode,
  computeStatus,
} from "@/lib/promo-admin";

// ── Helpers internes ───────────────────────────────────────────────────────────

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PromoRow {
  id:                  string;
  name:                string | null;
  code:                string;
  discount_percent:    number;
  max_uses:            number | null;
  used_count:          number;
  starts_at:           string | null;
  expires_at:          string | null;
  active:              boolean;
  created_at:          string;
  affiliate_user_id:   string | null;
  single_use_per_user: boolean;
  targeting_mode:      string;
}

// ── GET /api/admin/promo-codes ─────────────────────────────────────────────────
//
// Retourne toutes les promos avec :
//   - product_ids[]    depuis promo_code_products
//   - usage_records_count / unique_users_count / last_used_at  depuis promo_code_usages
//   - status calculé (jamais stocké en DB)
//
// Stratégie : 3 requêtes parallèles, agrégation en mémoire.
// used_count = compteur historique total (jamais remplacé par usages.count).
// usage_records_count = historique détaillé post-3A-1 uniquement.
//
// Backward compat Marketing Hub : tous les champs existants conservés.
// Les nouveaux champs sont additifs.

export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const [promoRes, productsRes, usagesRes] = await Promise.all([
    admin
      .from("promo_codes")
      .select(
        "id,name,code,discount_percent,max_uses,used_count,starts_at,expires_at," +
        "active,created_at,affiliate_user_id,single_use_per_user,targeting_mode"
      )
      .order("created_at", { ascending: false }),
    admin.from("promo_code_products").select("promo_code_id,product_id"),
    admin.from("promo_code_usages").select("promo_code_id,user_id,used_at"),
  ]);

  if (promoRes.error)
    return NextResponse.json({ error: promoRes.error.message }, { status: 500 });

  const promos = (promoRes.data ?? []) as unknown as PromoRow[];

  // Grouper product_ids par promo (1 requête globale, pas N)
  const productsByPromo: Record<string, string[]> = {};
  for (const row of productsRes.data ?? []) {
    if (!productsByPromo[row.promo_code_id]) productsByPromo[row.promo_code_id] = [];
    productsByPromo[row.promo_code_id].push(row.product_id as string);
  }

  // Agréger stats usage par promo (1 requête globale, pas N)
  const usageAgg: Record<string, {
    count:    number;
    users:    Set<string>;
    lastUsed: string | null;
  }> = {};
  for (const row of usagesRes.data ?? []) {
    const pid = row.promo_code_id as string;
    if (!usageAgg[pid]) usageAgg[pid] = { count: 0, users: new Set(), lastUsed: null };
    const agg = usageAgg[pid];
    agg.count++;
    if (row.user_id) agg.users.add(row.user_id as string);
    const usedAt = row.used_at as string | null;
    if (usedAt && (!agg.lastUsed || usedAt > agg.lastUsed)) agg.lastUsed = usedAt;
  }

  const result = promos.map((p) => {
    const agg = usageAgg[p.id] ?? { count: 0, users: new Set<string>(), lastUsed: null };
    return {
      ...p,
      product_ids:         productsByPromo[p.id] ?? [],
      usage_records_count: agg.count,
      unique_users_count:  agg.users.size,
      last_used_at:        agg.lastUsed,
      status:              computeStatus(p),
    };
  });

  return NextResponse.json(result);
}

// ── POST /api/admin/promo-codes ────────────────────────────────────────────────
//
// Création promo avec validation complète.
//
// Backward compat : les champs envoyés par l'ancien Marketing Hub
// (code, discount_percent, max_uses, expires_at) continuent à fonctionner.
// Les nouveaux champs ont tous des valeurs par défaut sûres :
//   targeting_mode absent → 'all'
//   product_ids absent    → []
//   active absent         → true
//   single_use_per_user   → false
//
// Sécurité targeting :
//   Si targeting_mode='specific' et l'INSERT promo_code_products échoue,
//   la promo est désactivée immédiatement (fail-closed).

export async function POST(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body  = await req.json();
  const admin = createAdminClient();
  const errors: string[] = [];

  // ── Validation code ──────────────────────────────────────────────────
  const codeRaw = normalizeCode(body.code);
  if (!codeRaw) {
    errors.push("code requis");
  } else {
    const codeErr = validateCode(codeRaw);
    if (codeErr) errors.push(codeErr);
  }

  // ── Validation name ──────────────────────────────────────────────────
  const nameRes = validateName(body.name);
  if (nameRes.error) errors.push(nameRes.error);

  // ── Validation discount_percent ──────────────────────────────────────
  const discountRes = validateDiscount(body.discount_percent);
  if (discountRes.error) errors.push(discountRes.error);

  // ── Validation max_uses ──────────────────────────────────────────────
  const maxUsesRes = validateMaxUses(body.max_uses);
  if (maxUsesRes.error) errors.push(maxUsesRes.error);

  // ── Validation dates ─────────────────────────────────────────────────
  const startsRes  = parseDate(body.starts_at);
  const expiresRes = parseDate(body.expires_at);
  if (startsRes.error)  errors.push(`starts_at: ${startsRes.error}`);
  if (expiresRes.error) errors.push(`expires_at: ${expiresRes.error}`);
  if (!startsRes.error && !expiresRes.error) {
    const dateErr = validateDates(startsRes.value, expiresRes.value);
    if (dateErr) errors.push(dateErr);
  }

  // ── Validation targeting_mode ────────────────────────────────────────
  const targetingRes = validateTargetingMode(body.targeting_mode ?? "all");
  if (targetingRes.error) errors.push(targetingRes.error);

  // ── Validation product_ids (avant DB check) ──────────────────────────
  const rawProductIds: unknown[] = Array.isArray(body.product_ids) ? body.product_ids : [];
  const uniqueProductIds: string[] = [...new Set(rawProductIds)] as string[];

  if (!targetingRes.error && targetingRes.value === "specific") {
    if (uniqueProductIds.length === 0) {
      errors.push("product_ids requis et non vide pour targeting_mode='specific'");
    } else {
      for (const pid of uniqueProductIds) {
        if (typeof pid !== "string" || !UUID_PATTERN.test(pid)) {
          errors.push(`product_id invalide: ${String(pid)}`);
        }
      }
    }
  }

  if (errors.length > 0)
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });

  // ── Vérifications DB asynchrones ─────────────────────────────────────

  // Existence des products ciblés
  if (targetingRes.value === "specific" && uniqueProductIds.length > 0) {
    const { data: existing } = await admin
      .from("challenge_products")
      .select("id")
      .in("id", uniqueProductIds);
    const foundIds = new Set((existing ?? []).map((p: { id: string }) => p.id));
    const missing  = uniqueProductIds.filter((pid) => !foundIds.has(pid));
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Produit(s) introuvable(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }
  }

  // Existence de l'affilié (si fourni)
  const affiliateUserId: string | null = body.affiliate_user_id || null;
  if (affiliateUserId) {
    const { data: affiliate } = await admin
      .from("affiliates")
      .select("user_id")
      .eq("user_id", affiliateUserId)
      .maybeSingle();
    if (!affiliate) {
      return NextResponse.json(
        { error: `Affilié introuvable: ${affiliateUserId}` },
        { status: 400 }
      );
    }
  }

  // ── INSERT promo_codes ───────────────────────────────────────────────
  const active           = body.active            !== undefined ? Boolean(body.active)            : true;
  const singleUsePerUser = body.single_use_per_user !== undefined ? Boolean(body.single_use_per_user) : false;

  const { data: promo, error: insertError } = await admin
    .from("promo_codes")
    .insert({
      code:                codeRaw!,
      name:                nameRes.value,
      discount_percent:    discountRes.value,
      max_uses:            maxUsesRes.value,
      starts_at:           startsRes.value,
      expires_at:          expiresRes.value,
      active,
      single_use_per_user: singleUsePerUser,
      targeting_mode:      targetingRes.value,
      affiliate_user_id:   affiliateUserId,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505")
      return NextResponse.json({ error: "Code déjà existant" }, { status: 409 });
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ── INSERT promo_code_products si specific ───────────────────────────
  if (targetingRes.value === "specific" && uniqueProductIds.length > 0) {
    const { error: targetsError } = await admin
      .from("promo_code_products")
      .insert(uniqueProductIds.map((pid) => ({ promo_code_id: promo.id, product_id: pid })));

    if (targetsError) {
      // Fail-closed : désactiver la promo avant de retourner l'erreur.
      // Une promo specific sans targets est non-fonctionnelle par design
      // (fail-closed dans la RPC), mais on la désactive explicitement
      // pour éviter toute confusion côté admin.
      await admin.from("promo_codes").update({ active: false }).eq("id", promo.id);
      return NextResponse.json(
        {
          error:   "Échec insertion product targets — promo désactivée par sécurité",
          details: targetsError.message,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ...promo, product_ids: uniqueProductIds }, { status: 201 });
}

// ── PATCH /api/admin/promo-codes ───────────────────────────────────────────────
//
// Mise à jour partielle avec whitelist explicite des champs autorisés.
// Validation contextuelle : compare les nouvelles valeurs à l'état DB actuel.
//
// Immutabilité :
//   - code : immutable si used_count > 0
//   - used_count, id, created_at : JAMAIS modifiables
//
// Targeting :
//   - product_ids remplace entièrement la liste existante (pas de merge)
//   - specific → all : targeting_mode mis à 'all' en DB, PUIS rows supprimés
//   - all/specific → specific : targeting_mode mis à jour, DELETE anciens, INSERT nouveaux
//   - Si INSERT targets échoue : promo désactivée (fail-closed)
//
// single_use_per_user → true :
//   Les anciens usages (single_use_enforced=false) ne sont PAS rétroactivement
//   bloqués. La nouvelle règle s'applique aux NOUVELLES consommations uniquement.

export async function PATCH(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createAdminClient();

  // Charger l'état actuel pour validations contextuelles
  const { data: current, error: fetchErr } = await admin
    .from("promo_codes")
    .select("id,code,used_count,starts_at,expires_at,targeting_mode")
    .eq("id", id)
    .single();

  if (fetchErr || !current)
    return NextResponse.json({ error: "Promo introuvable" }, { status: 404 });

  const currentUsedCount     = (current.used_count as number) ?? 0;
  const currentStartsAt      = (current.starts_at  as string | null);
  const currentExpiresAt     = (current.expires_at as string | null);
  const currentTargetingMode = (current.targeting_mode as "all" | "specific");

  const updates: Record<string, unknown> = {};
  const errors: string[] = [];

  // ── code (immutable si used_count > 0) ──────────────────────────────
  if (body.code !== undefined) {
    if (currentUsedCount > 0) {
      errors.push(`code immutable — used_count=${currentUsedCount} > 0`);
    } else {
      const codeRaw = normalizeCode(body.code);
      if (!codeRaw) {
        errors.push("code ne peut pas être vide");
      } else {
        const codeErr = validateCode(codeRaw);
        if (codeErr) errors.push(codeErr);
        else updates.code = codeRaw;
      }
    }
  }

  // ── name ─────────────────────────────────────────────────────────────
  if (body.name !== undefined) {
    const nameRes = validateName(body.name);
    if (nameRes.error) errors.push(nameRes.error);
    else updates.name = nameRes.value;
  }

  // ── discount_percent ─────────────────────────────────────────────────
  if (body.discount_percent !== undefined) {
    const discountRes = validateDiscount(body.discount_percent);
    if (discountRes.error) errors.push(discountRes.error);
    else updates.discount_percent = discountRes.value;
  }

  // ── max_uses ─────────────────────────────────────────────────────────
  if (body.max_uses !== undefined) {
    const maxUsesRes = validateMaxUses(body.max_uses);
    if (maxUsesRes.error) {
      errors.push(maxUsesRes.error);
    } else if (maxUsesRes.value !== null && maxUsesRes.value < currentUsedCount) {
      errors.push(
        `max_uses (${maxUsesRes.value}) < used_count (${currentUsedCount}) — non autorisé`
      );
    } else {
      updates.max_uses = maxUsesRes.value;
    }
  }

  // ── starts_at / expires_at — validation couple FINAL ────────────────
  let finalStartsAt  = currentStartsAt;
  let finalExpiresAt = currentExpiresAt;

  if (body.starts_at !== undefined) {
    const startsRes = parseDate(body.starts_at);
    if (startsRes.error) errors.push(`starts_at: ${startsRes.error}`);
    else { updates.starts_at = startsRes.value; finalStartsAt = startsRes.value; }
  }

  if (body.expires_at !== undefined) {
    const expiresRes = parseDate(body.expires_at);
    if (expiresRes.error) errors.push(`expires_at: ${expiresRes.error}`);
    else { updates.expires_at = expiresRes.value; finalExpiresAt = expiresRes.value; }
  }

  const dateErr = validateDates(finalStartsAt, finalExpiresAt);
  if (dateErr) errors.push(dateErr);

  // ── active ────────────────────────────────────────────────────────────
  if (body.active !== undefined) updates.active = Boolean(body.active);

  // ── single_use_per_user ──────────────────────────────────────────────
  if (body.single_use_per_user !== undefined)
    updates.single_use_per_user = Boolean(body.single_use_per_user);

  // ── affiliate_user_id (stocké temporairement pour check async) ───────
  let pendingAffiliateUid: string | null = null;
  if (body.affiliate_user_id !== undefined) {
    const afUid: string | null = body.affiliate_user_id || null;
    if (afUid) {
      pendingAffiliateUid = afUid;
    } else {
      updates.affiliate_user_id = null;
    }
  }

  // Bail sur erreurs synchrones
  if (errors.length > 0)
    return NextResponse.json({ error: errors.join("; ") }, { status: 400 });

  // ── Vérification asynchrone affilié ─────────────────────────────────
  if (pendingAffiliateUid) {
    const { data: affiliate } = await admin
      .from("affiliates")
      .select("user_id")
      .eq("user_id", pendingAffiliateUid)
      .maybeSingle();
    if (!affiliate)
      return NextResponse.json(
        { error: `Affilié introuvable: ${pendingAffiliateUid}` },
        { status: 400 }
      );
    updates.affiliate_user_id = pendingAffiliateUid;
  }

  // ── targeting_mode + product_ids ─────────────────────────────────────
  const hasTargetingChange =
    body.targeting_mode !== undefined || body.product_ids !== undefined;
  const rawProductIds: unknown[] = Array.isArray(body.product_ids) ? body.product_ids : [];

  let finalTargetingMode: "all" | "specific" = currentTargetingMode;

  if (body.targeting_mode !== undefined) {
    const targetingRes = validateTargetingMode(body.targeting_mode);
    if (targetingRes.error)
      return NextResponse.json({ error: targetingRes.error }, { status: 400 });
    updates.targeting_mode = targetingRes.value;
    finalTargetingMode     = targetingRes.value;
  }

  let uniqueProductIds: string[] = [];
  if (hasTargetingChange && finalTargetingMode === "specific") {
    if (rawProductIds.length === 0) {
      return NextResponse.json(
        { error: "product_ids requis et non vide pour targeting_mode='specific'" },
        { status: 400 }
      );
    }
    for (const pid of rawProductIds) {
      if (typeof pid !== "string" || !UUID_PATTERN.test(pid))
        return NextResponse.json({ error: `product_id invalide: ${String(pid)}` }, { status: 400 });
    }
    uniqueProductIds = [...new Set(rawProductIds)] as string[];
    const { data: existing } = await admin
      .from("challenge_products")
      .select("id")
      .in("id", uniqueProductIds);
    const foundIds = new Set((existing ?? []).map((p: { id: string }) => p.id));
    const missing  = uniqueProductIds.filter((pid) => !foundIds.has(pid));
    if (missing.length > 0)
      return NextResponse.json(
        { error: `Produit(s) introuvable(s): ${missing.join(", ")}` },
        { status: 400 }
      );
  }

  // ── UPDATE promo_codes ───────────────────────────────────────────────
  if (Object.keys(updates).length > 0) {
    const { error: updateErr } = await admin
      .from("promo_codes")
      .update(updates)
      .eq("id", id);
    if (updateErr) {
      if (updateErr.code === "23505")
        return NextResponse.json({ error: "Code déjà existant" }, { status: 409 });
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  // ── Mise à jour targeting ─────────────────────────────────────────────
  // Ordre sécurisé :
  //   → 'all' : targeting_mode='all' déjà en DB (ci-dessus), PUIS suppression rows.
  //             (rows résiduels sur une promo 'all' sont inopérants mais on nettoie)
  //   → 'specific' : targeting_mode='specific' déjà en DB, DELETE anciens,
  //             INSERT nouveaux. Fenêtre zéro-row = fail-closed par design RPC.
  //             Si INSERT échoue → promo désactivée.

  let finalProductIds: string[] = [];

  if (hasTargetingChange) {
    if (finalTargetingMode === "all") {
      // targeting_mode est déjà 'all' en DB. Supprimer les rows (désormais inopérants).
      await admin.from("promo_code_products").delete().eq("promo_code_id", id);
      finalProductIds = [];
    } else {
      // specific → DELETE anciens (zéro rows = fail-closed), INSERT nouveaux
      await admin.from("promo_code_products").delete().eq("promo_code_id", id);

      if (uniqueProductIds.length > 0) {
        const { error: targetsError } = await admin
          .from("promo_code_products")
          .insert(uniqueProductIds.map((pid) => ({ promo_code_id: id, product_id: pid })));

        if (targetsError) {
          // Fail-closed : désactiver la promo
          await admin.from("promo_codes").update({ active: false }).eq("id", id);
          return NextResponse.json(
            { error: "Échec mise à jour product targets — promo désactivée par sécurité" },
            { status: 500 }
          );
        }
      }
      finalProductIds = uniqueProductIds;
    }
  } else {
    // Aucun changement targeting : retourner les targets actuels
    const { data: existingTargets } = await admin
      .from("promo_code_products")
      .select("product_id")
      .eq("promo_code_id", id);
    finalProductIds = (existingTargets ?? []).map((t: { product_id: string }) => t.product_id);
  }

  // ── Réponse : état frais depuis DB ──────────────────────────────────
  const { data: fresh } = await admin
    .from("promo_codes")
    .select("*")
    .eq("id", id)
    .single();

  if (!fresh)
    return NextResponse.json({ error: "Promo introuvable après mise à jour" }, { status: 404 });

  return NextResponse.json({ ...fresh, product_ids: finalProductIds });
}

// ── DELETE /api/admin/promo-codes ──────────────────────────────────────────────
//
// Suppression physique uniquement si :
//   used_count = 0   (historique pré-3A-1)
//   ET
//   usage_records_count = 0 (historique post-3A-1)
//
// Retourne 409 dans tous les autres cas pour protéger l'audit trail.

export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin(req)).ok)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const admin = createAdminClient();

  const { data: promo, error: fetchErr } = await admin
    .from("promo_codes")
    .select("id,code,used_count")
    .eq("id", id)
    .single();

  if (fetchErr || !promo)
    return NextResponse.json({ error: "Promo introuvable" }, { status: 404 });

  // A. Usages détaillés (post-3A-1)
  const { count: usageCount } = await admin
    .from("promo_code_usages")
    .select("id", { count: "exact", head: true })
    .eq("promo_code_id", id);

  if ((usageCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Suppression impossible — ${usageCount} usage(s) détaillé(s) enregistré(s)` },
      { status: 409 }
    );
  }

  // B. Compteur historique pré-3A-1
  if ((promo.used_count ?? 0) > 0) {
    return NextResponse.json(
      { error: `Suppression impossible — used_count=${promo.used_count} (historique pré-3A-1)` },
      { status: 409 }
    );
  }

  const { error: deleteErr } = await admin
    .from("promo_codes")
    .delete()
    .eq("id", id);

  if (deleteErr)
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
