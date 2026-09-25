import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { DEMO } from '../data/demo';
import type { DashboardSnapshot } from '../domain/types';
import { useAuth } from './AuthContext';
import { loadDashboard, SessionExpired, SiteAccessRequired } from '../services/api';

const EMPTY: DashboardSnapshot = { version: 1, selectedAccountId: null, accounts: [], trades: [], rewards: [],
  profile: { name: '', email: '', kycStatus: '' }, asOf: '' };
const DashboardContext = createContext({ snapshot: EMPTY, selectedId: '', selectAccount: (_id: string) => {},
  loading: false, ready: false, error: '', siteAccessRequired: false, refresh: async (_reset?: boolean) => {} });
export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { demo, session } = useAuth();
  return <DashboardSession key={demo ? "demo" : session?.user.id ?? "anonymous"}>{children}</DashboardSession>;
}
function DashboardSession({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const { signOut } = auth;
  const owner = auth.demo ? 'demo' : auth.session?.user.id ?? null;
  const [loaded, setLoaded] = useState<{ owner: string; data: DashboardSnapshot } | null>(null);
  const [selection, setSelection] = useState<{ owner: string; id: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState<{ owner: string; message: string; gate: boolean } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const seq = useRef(0);
  const cancelRequests = useCallback(() => { ++seq.current; controller.current?.abort(); }, []);
  const selectedId = selection?.owner === owner ? selection.id : null;
  const snapshot = auth.demo ? DEMO : loaded?.owner === owner ? loaded.data : EMPTY;
  const refresh = useCallback(async (reset = false) => {
    controller.current?.abort();
    const request = ++seq.current;
    if (!owner || owner === 'demo') return;
    const active = new AbortController(); controller.current = active;
    const timeout = setTimeout(() => active.abort(), 30000);
    setLoading(true); setFailure(null);
    try {
      const data = await loadDashboard(reset ? null : selectedId, active.signal);
      if (request === seq.current && !active.signal.aborted) {
        setLoaded({ owner, data });
        if (reset) setSelection(null);
      }
    } catch (error) {
      if (request !== seq.current) return;
      if (error instanceof SessionExpired) {
        setLoaded(null); setSelection(null);
        await signOut().catch(() => {});
      } else setFailure({ owner, gate: error instanceof SiteAccessRequired,
        message: active.signal.aborted ? 'Le chargement a pris trop de temps. Vérifiez votre connexion.'
          : error instanceof Error ? error.message : 'Chargement impossible. Vérifiez votre connexion.' });
    } finally { clearTimeout(timeout); if (request === seq.current) setLoading(false); }
  }, [owner, selectedId, signOut]);
  useEffect(() => {
    // Synchronize the loading indicator with this authenticated network subscription.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    return cancelRequests;
  }, [refresh, cancelRequests]);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => listener.remove();
  }, [refresh]);
  return <DashboardContext.Provider value={{ snapshot, selectedId: selectedId ?? snapshot.selectedAccountId ?? '',
    selectAccount: id => { if (owner && snapshot.accounts.some(a => a.id === id)) setSelection({ owner, id }); },
    loading, ready: auth.demo || loaded?.owner === owner && loaded !== null,
    error: failure?.owner === owner ? failure.message : '',
    siteAccessRequired: failure?.owner === owner && failure.gate || false, refresh }}>{children}</DashboardContext.Provider>;
}
export function useDashboard() {
  const ctx = useContext(DashboardContext);
  return { ...ctx, account: (ctx.snapshot.accounts.find(a => a.id === ctx.selectedId) ?? ctx.snapshot.accounts[0])! };
}
