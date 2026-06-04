const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;

const MT5_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": MT5_SECRET,
  "bypass-tunnel-reminder": "true",
};

// grp1 = Challenge 2-Step  (DD daily 5%, DD max 10%)
// grp2 = Challenge 1-Step  (DD daily 3%, DD max 10%)
// grp3 = Certified 2-Step  (règles funded)
// grp4 = Certified 1-Step  (règles funded)
// grp5 = Comptes désactivés / breach
const GROUP_MAP: Record<string, string> = {
  "2step":         "Starwave\\demo\\FX1\\grp1",
  "1step":         "Starwave\\demo\\FX1\\grp2",
  "funded_2step":  "Starwave\\demo\\FX1\\grp3",
  "funded_1step":  "Starwave\\demo\\FX1\\grp4",
  "disabled":      "Starwave\\demo\\FX1\\grp5",
};

export function getMT5Group(model: string, phase = "challenge"): string {
  if (phase === "funded") return GROUP_MAP[`funded_${model}`] ?? GROUP_MAP["2step"];
  return GROUP_MAP[model] ?? GROUP_MAP["2step"];
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
}): Promise<{ login: number; password: string; password_investor: string; server: string }> {
  const balance = params.account_size ? (SIZE_MAP[params.account_size] ?? 10000) : 10000;
  const res = await fetch(`${MT5_URL}/accounts/create`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({
      first_name:   params.firstName,
      last_name:    params.lastName,
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

  // Top-up automatique si le microservice crée toujours avec une balance par défaut
  if (balance > 10000 && account.login) {
    try {
      const info = await getMT5Account(account.login);
      const currentBalance = info.balance ?? 10000;
      const diff = balance - currentBalance;
      if (diff > 0) {
        await addMT5Balance(account.login, diff, "Initial balance top-up");
      }
    } catch (e) {
      console.error("MT5 top-up error:", e);
    }
  }

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

export async function addMT5Balance(login: number, amount: number, comment = "Deposit"): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/add-balance`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({ login, amount, comment }),
  });
  if (!res.ok) throw new Error(`MT5 add-balance failed: ${await res.text()}`);
}

export async function withdrawMT5Balance(login: number, amount: number, comment = "Withdrawal"): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/withdraw-balance`, {
    method: "POST",
    headers: MT5_HEADERS,
    body: JSON.stringify({ login, amount, comment }),
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
