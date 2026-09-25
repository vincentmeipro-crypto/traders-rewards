import type { SupabaseClient } from '@supabase/supabase-js';
import { loadMobileDashboard, mapMobileAccount, mapMobileRewards, mapMobileTrades, MobileAccountNotFound } from '../mobile-dashboard';
import { getMT5History } from '../mt5';
import { loadRewardAccounts } from '../reward-eligibility-server';
jest.mock('../mt5', () => ({ getMT5History: jest.fn() }));
jest.mock('../reward-eligibility-server', () => ({ loadRewardAccounts: jest.fn() }));
const base = { id: 'owned-account', start_balance: 100000, balance: 102000, created_at: '2026-09-01T10:00:00Z', phase: 'phase1', model: 'rewards-100k', status: 'active', mt5_login: 123, highest_eod: 101000, trading_days: 3, best_day_profit: 800, open_positions: [{ profit: -20, swap: -2 }], account_size: '100K' };
function database(challenges: Record<string, unknown>[] = [base], payouts: Record<string, unknown>[] = []) {
  const eq = jest.fn(); const select = jest.fn();
  const db = { from: jest.fn((table: string) => {
    const result = { data: table === 'challenges' ? challenges : table === 'payouts' ? payouts : { first_name: 'Test', last_name: 'Client', kyc_status: 'approved' }, error: null };
    const query = { select: (fields: string) => { select(table, fields); return query; }, eq: (field: string, value: string) => { eq(table, field, value); return query; }, order: () => Promise.resolve(result), maybeSingle: () => Promise.resolve(result) };
    return query;
  }) };
  return { db: db as unknown as SupabaseClient, eq, select };
}
beforeEach(() => jest.resetAllMocks());
it('uses the current V1 engine for each size and the paid-reward floor lock', () => {
  expect(mapMobileAccount(base, [])).toMatchObject({ equity: 101978, targetProfit: 9000, drawdownFloor: 98000, minDays: 2, consistency: .4 });
  expect(mapMobileAccount({ ...base, start_balance: 25000, balance: 25000, highest_eod: 25000, model: 'rewards-25k' }, [])).toMatchObject({ drawdownFloor: 24000, drawdownRate: .04 });
  expect(mapMobileAccount({ ...base, phase: 'funded' }, [{ challenge_id: base.id, status: 'paid' }])).toMatchObject({ drawdownFloor: 100000, rewardLevel: 2, qualifiedDays: null });
  expect(mapMobileAccount({ ...base, phase: 'funded' }, []).drawdownFloor).toBe(98000);
  expect(mapMobileAccount({ ...base, phase: 'funded', highest_eod: 105000 }, []).drawdownFloor).toBe(100000);
});
it('does not fabricate equity, legacy floors, or days when data is missing', () => {
  expect(mapMobileAccount({ ...base, model: 'legacy', open_positions: null, trading_days: null }, [])).toMatchObject({ equity: null, drawdownFloor: null, qualifiedDays: null, minDays: null, rewardCaps: [] });
  expect(mapMobileAccount({ ...base, mt5_login: null }, []).status).toBe('preparing');
  expect(mapMobileAccount({ ...base, status: 'failed', breach_equity: 97000 }, []).equity).toBe(97000);
});
it('keeps paid amounts net, pending amounts gross, and counts paid levels separately per account', () => {
  const rewards = mapMobileRewards([
    { id: 'p1', challenge_id: 'a', status: 'paid', amount: 900, created_at: '2026-09-01' },
    { id: 'p2', challenge_id: 'b', status: 'paid', amount: 270, created_at: '2026-09-02' },
    { id: 'p3', challenge_id: 'a', status: 'pending', amount: 1400, created_at: '2026-09-03' },
  ]);
  expect(rewards.find(r => r.id === 'p1')).toMatchObject({ net: 900, gross: null, level: 1 });
  expect(rewards.find(r => r.id === 'p2')?.level).toBe(1);
  expect(rewards.find(r => r.id === 'p3')).toMatchObject({ net: null, gross: 1400, level: null });
});
it('deduplicates closing deals, excludes deposits/open entries, and uses the 22:00 UTC rollover', () => {
  const deal = { ticket: 1, type: 1, entry: 1, time: '2026-09-25T22:30:00Z', profit: 100, commission: -2, swap: -1, fee: -1, symbol: 'EURUSD', volume: .5 };
  const trades = mapMobileTrades([deal, deal, { ...deal, ticket: 2, type: 2 }, { ...deal, ticket: 3, entry: 0 }, { ...deal, ticket: 4, entry: 2 }, { ...deal, ticket: 5, profit: 'invalid' }], base.id);
  expect(trades).toHaveLength(2);
  expect(trades[0]).toMatchObject({ side: 'Achat', netProfit: 96, tradingDate: '2026-09-26', openedAt: null });
  expect(trades.find(t => t.id.endsWith(':4'))?.volume).toBeNull();
});
it('rejects an unowned account before any provider or eligibility request', async () => {
  const { db, eq } = database();
  await expect(loadMobileDashboard(db, { id: 'user-a' }, 'foreign-account')).rejects.toBeInstanceOf(MobileAccountNotFound);
  expect(eq.mock.calls).toEqual([['challenges', 'user_id', 'user-a'], ['payouts', 'user_id', 'user-a'], ['profiles', 'user_id', 'user-a']]);
  expect(getMT5History).not.toHaveBeenCalled();
  expect(loadRewardAccounts).not.toHaveBeenCalled();
});
it('returns only safe fields and preserves provider failure as unavailable', async () => {
  const { db, select } = database([{ ...base, mt5_password: 'never-export', secret: 'never-export' }]);
  jest.mocked(getMT5History).mockRejectedValue(new Error('provider unavailable'));
  const result = await loadMobileDashboard(db, { id: 'user-a', email: 'test@example.test' });
  expect(result.accounts[0].historyState).toBe('unavailable');
  expect(JSON.stringify(result)).not.toContain('never-export');
  expect(select.mock.calls.every(([, fields]) => !fields.includes('*') && !fields.includes('password'))).toBe(true);
});
it('supports empty accounts and maps server reward eligibility instead of recomputing it', async () => {
  expect((await loadMobileDashboard(database([]).db, { id: 'empty' })).selectedAccountId).toBeNull();
  jest.mocked(getMT5History).mockResolvedValue([]);
  jest.mocked(loadRewardAccounts).mockResolvedValue([{ id: base.id, accountSize: '100K', login: 123, eligible: true, maximum: 555, floor: 100000, qualifyingDays: 5, consistency: 24, rewardNumber: 1, reasons: [] }]);
  const result = await loadMobileDashboard(database([{ ...base, phase: 'funded' }]).db, { id: 'user-a' });
  expect(result.accounts[0]).toMatchObject({ consistency: .24, qualifiedDays: 5, eligibility: { eligible: true, maximum: 555 } });
});
