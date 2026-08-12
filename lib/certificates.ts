import { createAdminClient } from "@/lib/supabase/admin";

export type CertificateKind = "phase1" | "phase2" | "reward";

export type PublicCertificateRecord = {
  id: string;
  certificate_type: CertificateKind;
  trader_display_name: string;
  account_size: string | null;
  amount: string | null;
  issued_at: string;
  revoked_at: string | null;
};

type AdminClient = ReturnType<typeof createAdminClient>;

function isMissingCertificateType(error: { code?: string; message?: string } | null): boolean {
  return error?.code === "42703" || /certificate_type/i.test(error?.message || "");
}

export async function ensureCertificateRecord(params: {
  type: CertificateKind;
  challengeId?: string;
  payoutId?: string;
  traderDisplayName: string;
  accountSize?: string | null;
  amount?: string | null;
  issuedAt?: string;
}): Promise<string | null> {
  const admin = createAdminClient();
  const sourceKey = params.payoutId
    ? `payout:${params.payoutId}`
    : params.challengeId
      ? `${params.type}:${params.challengeId}`
      : null;

  if (!sourceKey) return null;

  const basePayload = {
    source_key: sourceKey,
    challenge_id: params.challengeId ?? null,
    payout_id: params.payoutId ?? null,
    trader_display_name: params.traderDisplayName.trim() || "Trader",
    account_size: params.accountSize ?? null,
    amount: params.amount ?? null,
    issued_at: params.issuedAt ?? new Date().toISOString().slice(0, 10),
  };

  let { error } = await admin
    .from("reward_certificates")
    .upsert({ ...basePayload, certificate_type: params.type }, {
      onConflict: "source_key",
      ignoreDuplicates: true,
    });

  // Compatibilité pendant le déploiement : l'ancien registre Reward reste utilisable
  // avant l'application de la migration multi-certificats.
  if (error && params.type === "reward" && isMissingCertificateType(error)) {
    ({ error } = await admin
      .from("reward_certificates")
      .upsert(basePayload, { onConflict: "source_key", ignoreDuplicates: true }));
  }

  if (error) {
    console.error(`[certificates] unable to register ${params.type}:`, error.message.slice(0, 200));
    return null;
  }

  const { data, error: selectError } = await admin
    .from("reward_certificates")
    .select("public_token")
    .eq("source_key", sourceKey)
    .maybeSingle();

  if (selectError) {
    console.error(`[certificates] unable to read ${params.type} token:`, selectError.message.slice(0, 200));
    return null;
  }

  const publicToken = data?.public_token;
  return /^[0-9a-f]{32}$/.test(publicToken || "") ? publicToken : null;
}

export async function findCertificateByToken(
  admin: AdminClient,
  token: string,
): Promise<PublicCertificateRecord | null> {
  const fields = "id, certificate_type, trader_display_name, account_size, amount, issued_at, revoked_at";
  const { data, error } = await admin
    .from("reward_certificates")
    .select(fields)
    .eq("public_token", token)
    .maybeSingle();

  if (error && isMissingCertificateType(error)) {
    const fallback = await admin
      .from("reward_certificates")
      .select("id, trader_display_name, account_size, amount, issued_at, revoked_at")
      .eq("public_token", token)
      .maybeSingle();
    if (fallback.error || !fallback.data) return null;
    return { ...fallback.data, certificate_type: "reward" } as PublicCertificateRecord;
  }

  if (error || !data) return null;
  return data as unknown as PublicCertificateRecord;
}

export function certificateTypeLabel(type: CertificateKind): string {
  if (type === "phase1") return "Validation Phase 1";
  if (type === "phase2") return "Validation Phase 2";
  return "Versement Reward";
}
