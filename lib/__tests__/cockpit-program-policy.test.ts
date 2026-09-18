import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import TraderCockpit, { type CockpitChallenge } from '../../app/dashboard/TraderCockpit';

jest.mock('../../app/dashboard/TraderCockpit.module.css', () => ({}));
jest.mock('../../app/dashboard/CockpitTools', () => ({ __esModule: true, default: () => null }));

const base: CockpitChallenge = {
  id: 'policy-test', account_size: '100K', model: '1step', phase: 'phase1', status: 'active',
  start_balance: 100000, balance: 100000, profit_target: 6,
  daily_drawdown_limit: 0, total_drawdown_limit: 3, trading_days: 0,
  rules_snapshot: { rules: { dd_model: 'trailing_eod_lock' } },
};

function render(challenge: CockpitChallenge, paidRewardsCount = 0, isMobile = false) {
  return renderToStaticMarkup(createElement(TraderCockpit, {
    challenge, activeChallenges: [challenge], tradeHistory: [], tradeHistoryLoading: false,
    isFr: true, isMobile, kycStatus: 'approved', paidRewardsCount,
    onSelectChallenge: () => {}, onNavigate: () => {},
  }));
}

describe('Client cockpit renders current policy', () => {
  test.each([false, true])('9%% and correct remaining target, mobile=%s', (mobile) => {
    for (const [start, target] of [[25000,'$2,250'],[50000,'$4,500'],[100000,'$9,000']] as const) {
      const html = render({...base,start_balance:start,balance:start,account_size:`${start/1000}K`},0,mobile);
      expect(html).toContain('OBJECTIF +9%');
      expect(html).toContain(target);
      expect(html).not.toContain('OBJECTIF +6%');
    }
  });
  test('keeps a higher consistency-adjusted target', () => {
    expect(render({...base,profit_target:12})).toContain('OBJECTIF +12%');
  });
  test.each([1000,1400,1800,2000,3000].map((cap,index)=>[index,cap]))('100K with %i paid rewards shows cap %i', (paid,cap) => {
    const html = render({...base,phase:'funded',status:'funded',balance:110000},paid);
    expect(html).toContain(`$${cap.toLocaleString('en-US')}`);
  });
});
