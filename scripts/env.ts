import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

function loadEnvFile(file: string) {
  const filePath = resolve(process.cwd(), file);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function loadLocalEnv() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variable manquante : ${name}`);
    process.exit(1);
  }
  return value;
}
