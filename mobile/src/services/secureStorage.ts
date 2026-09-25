import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// Preview credentials are kept in memory only. Native sessions use the OS keychain.
const memory = new Map<string, string>();
type Manifest = { generation: string; count: number };
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
async function manifest(key: string): Promise<Manifest | null> {
  const raw = await SecureStore.getItemAsync(`${key}.manifest`, options);
  if (!raw) return null;
  try {
    const m = JSON.parse(raw) as Manifest;
    return typeof m.generation === "string" && /^[a-z0-9-]+$/.test(m.generation)
      && Number.isInteger(m.count) && m.count > 0 && m.count <= 128 ? m : null;
  } catch { return null; }
}
async function removeChunks(key: string, m: Manifest | null) {
  if (m) await Promise.all(Array.from({ length: m.count }, (_, i) =>
    SecureStore.deleteItemAsync(`${key}.${m.generation}.${i}`, options)));
}
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") return memory.get(key) ?? null;
    const m = await manifest(key);
    if (!m) return null;
    const parts = await Promise.all(Array.from({ length: m.count }, (_, i) =>
      SecureStore.getItemAsync(`${key}.${m.generation}.${i}`, options)));
    return parts.some(p => p == null) ? null : parts.join("");
  },
  async setItem(key: string, value: string) {
    if (Platform.OS === "web") { memory.set(key, value); return; }
    // Supabase sessions may exceed the historical 2KB per-value keychain limit.
    const characters = Array.from(value);
    const chunks = Array.from({ length: Math.max(1, Math.ceil(characters.length / 400)) }, (_, i) => characters.slice(i * 400, (i + 1) * 400).join(""));
    if (chunks.length > 128) throw new Error("Session too large");
    const previous = await manifest(key);
    const m = { generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, count: chunks.length };
    try {
      for (let i = 0; i < chunks.length; i++) await SecureStore.setItemAsync(`${key}.${m.generation}.${i}`, chunks[i], options);
      await SecureStore.setItemAsync(`${key}.manifest`, JSON.stringify(m), options);
    } catch (error) { await removeChunks(key, m).catch(() => {}); throw error; }
    await removeChunks(key, previous).catch(() => {});
  },
  async removeItem(key: string) {
    if (Platform.OS === "web") { memory.delete(key); return; }
    const m = await manifest(key);
    await SecureStore.deleteItemAsync(`${key}.manifest`, options);
    await removeChunks(key, m);
  },
};
