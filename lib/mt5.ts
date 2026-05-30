const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;

const MT5_HEADERS = {
  "Content-Type": "application/json",
  "x-api-key": MT5_SECRET,
  "bypass-tunnel-reminder": "true",
};

// Mapping accountSize + model → groupe MT5 (Starwave gray label)
// grp1=10K  grp2=25K  grp3=50K  grp4=100K  grp5=200K
// À mettre à jour avec les groupes Phase 2 quand Allan confirme
const GROUP_MAP: Record<string, Record<string, string>> = {
  "2step": {
    "$10,000":  "Starwave\\demo\\FX1\\grp1",
    "$25,000":  "Starwave\\demo\\FX1\\grp2",
    "$50,000":  "Starwave\\demo\\FX1\\grp3",
    "$100,000": "Starwave\\demo\\FX1\\grp4",
  },
  "1step": {
    "$10,000":  "Starwave\\demo\\FX1\\grp1",
    "$25,000":  "Starwave\\demo\\FX1\\grp2",
    "$50,000":  "Starwave\\demo\\FX1\\grp3",
    "$100,000": "Starwave\\demo\\FX1\\grp4",
  },
};

export function getMT5Group(model: string, accountSize: string): string {
  return GROUP_MAP[model]?.[accountSize] ?? "demo\\challenge_10k_p1";
}

export async function createMT5Account(params: {
  firstName: string;
  lastName: string;
  email: string;
  leverage: number;
  group: string;
  account_size?: string;
}): Promise<{ login: number; password: string; password_investor: string; server: string }> {
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
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MT5 create failed: ${err}`);
  }

  return res.json();
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
