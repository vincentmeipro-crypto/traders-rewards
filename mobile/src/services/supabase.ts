import "react-native-url-polyfill/auto";
import { createClient, processLock } from "@supabase/supabase-js";
import { config, configurationReady } from "./config";
import { secureStorage } from "./secureStorage";

export const AUTH_STORAGE_KEY = "traders-rewards-auth";
export const supabase = configurationReady ? createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { storage: secureStorage, storageKey: AUTH_STORAGE_KEY, persistSession: true,
    autoRefreshToken: true, detectSessionInUrl: false, lock: processLock },
}) : null;
