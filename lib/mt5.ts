const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;

const MT5_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": MT5_SECRET,
  "bypass-tunnel-reminder": "true",
};

// demoG1 = Challenge 2-Step
// demoG2 = Challenge 1-Step
// demoG3 = Funded 2-Step
// demoG4 = Funded 1-Step
// demoG5 = Comptes désactivés / breach
//
// Note V2 Phase 1 : les groupes sont configurables via la table settings.
// getMT5Group() reste SYNCHRONE (rétrocompatibilité avec tous les appelants).
// Pour une version dynamique (Settings DB), passer overrideMap :
//   const map = await getMT5GroupMap();   // lib/config.ts
//   const group = getMT5Group(model, phase, map);
const GROUP_MAP: Record<string, string> = {
  "2step":         "HAR/MAN32/demoG1",
  "1step":         "HAR/MAN32/demoG2",
  "funded_2step":  "HAR/MAN32/demoG3",
  "funded_1step":  "HAR/MAN32/demoG4",

  "disabled":      "HAR/MAN32/demoG5",
};

/**
 * Retourne le groupe MT5 pour un modèle et une phase donnés.
 *
 * @param model       - "2step" | "1step" | "vip" | ...
 * @param phase       - "challenge" (défaut) | "funded"
 * @param overrideMap - (optionnel) map issu de getMT5GroupMap() pour config dynamique.
 *                      Si absent, utilise GROUP_MAP hardcodé (rétrocompatible).
 *
 * IMPORTANT: NE PAS passer d'overrideMap dans mt5-snapshot/route.ts (ABSOLUTE RULE).
 */
export function getMT5Group(
  model: string,
  phase = "challenge",
  overrideMap?: Record<string, string>
): string {
  const map = overrideMap ?? GROUP_MAP;
  if (phase === "funded") return map[`funded_${model}`] ?? map["2step"] ?? GROUP_MAP["2step"];
  return map[model] ?? map["2step"] ?? GROUP_MAP["2step"];
}

const SIZE_MAP: Record<string, number> = {
  "$10,000": 10000, "$25,000": 25000, "$50,000": 50000,
  "$100,000": 100000, "$200,000": 200000,
};

export async function createMT5Account(params: {
  firstName: string;
  lastName: string;
  email: string;
  leverage: number;
  group: string;
  account_size?: string;
  label?: string;
}): Promise<{ login: number; password: string; password_investor: string; server: string }> {
  const balance = params.account_size ? (SIZE_MAP[params.account_size] ?? 10000) : 10000;
  const res = await fetch(`${MT5_URL}/accounts/create`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({
      first_name:   params.firstName,
      last_name:    params.label ? `${params.lastName} | ${params.label}` : params.lastName,
      email:        params.email,
      leverage:     params.leverage,
      group:        params.group,
      account_size: params.account_size,
      balance,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MT5 create failed: ${err}`);
  }

  const account = await res.json();
  return account;
}

export async function changeMT5Group(login: number, newGroup: string): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/change-group`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({ login, new_group: newGroup }),
  });
  if (!res.ok) throw new Error(`MT5 change-group failed: ${await res.text()}`);
}

export async function disableMT5Account(login: number): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/disable`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({ login }),
  });
  if (!res.ok) throw new Error(`MT5 disable failed: ${await res.text()}`);
}

export async function enableMT5Account(login: number): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/enable`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({ login }),
  });
  if (!res.ok) throw new Error(`MT5 enable failed: ${await res.text()}`);
}

export async function addMT5Balance(login: number, amount: number, comment = "Deposit"): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/add-balance`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({ login, amount, comment }),
  });
  if (!res.ok) throw new Error(`MT5 add-balance failed: ${await res.text()}`);
}

export async function withdrawMT5Balance(login: number, amount: number, comment = "Profit Withdrawal"): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/withdraw`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({
      login,
      amount: Math.abs(amount),
      comment,
    }),
  });
  if (!res.ok) throw new Error(`MT5 withdraw-balance failed: ${await res.text()}`);
}

export async function getMT5Account(login: number) {
  const res = await fetch(`${MT5_URL}/accounts/${login}`, {
    headers: MT5_HEADERS,
  });
  if (!res.ok) throw new Error(`MT5 get failed: ${await res.text()}`);
  return res.json();
}

export async function getMT5History(login: number): Promise<unknown[]> {
  const res = await fetch(`${MT5_URL}/accounts/${login}/history`, {
    headers: MT5_HEADERS,
  });
  if (!res.ok) throw new Error(`MT5 history failed: ${await res.text()}`);
  return res.json();
}

export async function changeMT5Password(login: number): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/${login}/change-password`, {
    method: "POST",
    headers: MT5_HEADERS,
  });
  if (!res.ok) throw new Error(`MT5 change-password failed: ${await res.text()}`);
}

export async function updateMT5AccountName(login: number, firstName: string, lastName: string, label: string): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/${login}/update-name`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({ first_name: firstName, last_name: lastName, label }),
  });
  if (!res.ok) throw new Error(`MT5 update-name failed: ${await res.text()}`);
}

// Retry version — await this right after createMT5Account (account may not be ready immediately)
export async function updateMT5AccountNameWithRetry(
  login: number, firstName: string, lastName: string, label: string,
  maxAttempts = 4, delayMs = 2000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, delayMs));
    try {
      await updateMT5AccountName(login, firstName, lastName, label);
      return;
    } catch (e) {
      if (i === maxAttempts - 1) console.error(`MT5 update-name failed after ${maxAttempts} attempts:`, e);
    }
  }
}

export async function getMT5Positions(login: number): Promise<{
  ticket: number; symbol: string; type: number; volume: number;
  open_price: number; current_price: number; profit: number; swap: number; open_time: number;
}[]> {
  const res = await fetch(`${MT5_URL}/accounts/${login}/positions`, { headers: MT5_HEADERS });
  if (!res.ok) throw new Error(`MT5 positions failed: ${await res.text()}`);
  const data = await res.json();
  return data.positions ?? [];
}

export async function closeAllPositions(login: number): Promise<{ closed: number; positions: { symbol: string; type: number; volume: number; open_price: number; profit: number; ticket: number }[] }> {
  const res = await fetch(`${MT5_URL}/accounts/${login}/close-positions`, {
    method: "POST",
    headers: MT5_HEADERS,
  });
  if (!res.ok) throw new Error(`MT5 close-positions failed: ${await res.text()}`);
  const data = await res.json();
  return { closed: data.closed ?? 0, positions: data.positions ?? [] };
}
