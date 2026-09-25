import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GET } from '../../app/api/mobile/dashboard/route';
import { loadMobileDashboard, MobileAccountNotFound } from '../mobile-dashboard';
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('../mobile-dashboard', () => ({ loadMobileDashboard: jest.fn(), MobileAccountNotFound: class extends Error {} }));
const getUser = jest.fn();
const originalEnv = { ...process.env };
beforeEach(() => {
  jest.resetAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key';
  jest.mocked(createClient).mockReturnValue({ auth: { getUser } } as unknown as ReturnType<typeof createClient>);
});
afterAll(() => { process.env = originalEnv; });
const request = (token?: string, query = '') => new NextRequest(`https://example.test/api/mobile/dashboard${query}`, { headers: token ? { authorization: token } : {} });
it.each([undefined, 'Basic token', 'Bearer two tokens'])('rejects missing or malformed authorization: %s', async token => {
  expect((await GET(request(token))).status).toBe(401);
  expect(createClient).not.toHaveBeenCalled();
});
it('rejects an invalid session before loading data', async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
  expect((await GET(request('Bearer invalid'))).status).toBe(401);
  expect(loadMobileDashboard).not.toHaveBeenCalled();
});
it('uses a verified user and a user-scoped client, with private no-store responses', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null });
  jest.mocked(loadMobileDashboard).mockResolvedValue({ version: 1 } as Awaited<ReturnType<typeof loadMobileDashboard>>);
  const response = await GET(request('Bearer valid', '?account=owned&user_id=attacker'));
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(createClient).toHaveBeenCalledWith('https://example.supabase.co', 'public-test-key', expect.objectContaining({ global: { headers: { Authorization: 'Bearer valid' } } }));
  expect(loadMobileDashboard).toHaveBeenCalledWith(expect.anything(), { id: 'verified-user' }, 'owned');
});
it('hides unowned-account details and server errors', async () => {
  getUser.mockResolvedValue({ data: { user: { id: 'verified-user' } }, error: null });
  jest.mocked(loadMobileDashboard).mockRejectedValueOnce(new MobileAccountNotFound()).mockRejectedValueOnce(new Error('private-database-detail'));
  expect((await GET(request('Bearer valid', '?account=foreign'))).status).toBe(404);
  const response = await GET(request('Bearer valid'));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain('private-database-detail');
});
