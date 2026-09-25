import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { AppState, Platform } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { supabase, AUTH_STORAGE_KEY } from "../services/supabase";
import { secureStorage } from "../services/secureStorage";
import { config } from "../services/config";

const AuthContext = createContext<{
  session: Session | null; demo: boolean; initializing: boolean;
  enterDemo: () => void; signOut: () => Promise<void>;
}>({ session: null, demo: false, initializing: true, enterDemo: () => {}, signOut: async () => {} });
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [demo, setDemo] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(supabase));
  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (mounted) { setSession(next); setInitializing(false); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) { setSession(error ? null : data.session); setInitializing(false); }
    }).catch(() => { if (mounted) setInitializing(false); });
    const change = AppState.addEventListener("change", state => {
      if (Platform.OS !== "web") {
        if (state === "active") supabase?.auth.startAutoRefresh(); else supabase?.auth.stopAutoRefresh();
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); change.remove(); supabase?.auth.stopAutoRefresh(); };
  }, []);
  const signOut = useCallback(async () => {
    setDemo(false); setSession(null);
    try { await supabase?.auth.signOut({ scope: "local" }); }
    finally { await secureStorage.removeItem(AUTH_STORAGE_KEY); }
  }, []);
  return <AuthContext.Provider value={{ session, demo, initializing, signOut,
    enterDemo: () => { if (config.allowDemo && !session) setDemo(true); } }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
