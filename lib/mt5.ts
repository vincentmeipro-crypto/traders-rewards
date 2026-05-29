const MT5_URL    = process.env.MT5_API_URL!;
const MT5_SECRET = process.env.MT5_API_SECRET!;

// Mapping accountSize + model → groupe MT5
const GROUP_MAP: Record<string, Record<string, string>> = {
  "2step": {
    "$10,000":  "demo\\challenge_10k_p1",
    "$25,000":  "demo\\challenge_25k_p1",
    "$50,000":  "demo\\challenge_50k_p1",
    "$100,000": "demo\\challenge_100k_p1",
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
}): Promise<{ login: number; password: string; password_investor: string; server: string }> {
  const res = await fetch(`${MT5_URL}/accounts/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MT5_SECRET },
    body: JSON.stringify({
      first_name: params.firstName,
      last_name:  params.lastName,
      email:      params.email,
      leverage:   params.leverage,
      group:      params.group,
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
    headers: { "Content-Type": "application/json", "x-api-key": MT5_SECRET },
    body: JSON.stringify({ login, new_group: newGroup }),
  });
  if (!res.ok) throw new Error(`MT5 change-group failed: ${await res.text()}`);
}

export async function disableMT5Account(login: number): Promise<void> {
  const res = await fetch(`${MT5_URL}/accounts/disable`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": MT5_SECRET },
    body: JSON.stringify({ login }),
  });
  if (!res.ok) throw new Error(`MT5 disable failed: ${await res.text()}`);
}

export async function getMT5Account(login: number) {
  const res = await fetch(`${MT5_URL}/accounts/${login}`, {
    headers: { "x-api-key": MT5_SECRET },
  });
  if (!res.ok) throw new Error(`MT5 get failed: ${await res.text()}`);
  return res.json();
}
