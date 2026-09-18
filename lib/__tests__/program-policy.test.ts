import { CHALLENGE_PROFIT_TARGET_PCT, challengeProfitTargetUsd, getChallengeProfitTargetPct } from '../program-rules';
import { REWARD_AMOUNTS } from '../rewardsData';
import { checkV1ChallengeTransition, getV1DdUsdByBalance, getV1RewardCap } from '../v1-engine';
import { isV1ProfitTargetMet } from '../v1-lifecycle';
import { V1_CHALLENGE_PROFIT_PCT, getV1RewardCapDisplay } from '../v1-display';
import { evaluateReward } from '../reward-eligibility';
import { buildChallengerValidatedEmail, buildWelcomeEmail } from '../email-templates';

describe('Current Challenge and Reward policy', () => {
  test.each([25000,50000,100000])('manual and fallback provisioning target for %i', (balance) => {
    expect(getChallengeProfitTargetPct('1step',balance,10)).toBe(9);
    expect(getChallengeProfitTargetPct(`rewards-${balance/1000}k`,balance,6)).toBe(9);
    expect(getChallengeProfitTargetPct('2step',balance,10)).toBe(10);
    expect(getChallengeProfitTargetPct('vip',balance,6)).toBe(6);
  });
  test.each([[25000,2250],[50000,4500],[100000,9000]])('9%% target on %i', (start,target) => {
    expect(CHALLENGE_PROFIT_TARGET_PCT).toBe(9);
    expect(V1_CHALLENGE_PROFIT_PCT).toBe(9);
    expect(challengeProfitTargetUsd(start)).toBe(target);
    expect(isV1ProfitTargetMet(start*1.06,start)).toBe(false);
    expect(isV1ProfitTargetMet(start+target-0.01,start)).toBe(false);
    expect(isV1ProfitTargetMet(start+target,start)).toBe(true);
    const transition=(profit:number,days=2,best=target/2)=>checkV1ChallengeTransition(start,start+profit,start,start+profit,days,best,getV1DdUsdByBalance(start));
    expect(transition(start*.06).canTransition).toBe(false);
    expect(transition(target).canTransition).toBe(true);
    expect(transition(target,1).canTransition).toBe(false);
    expect(transition(target,2,target*.7).canTransition).toBe(false);
  });

  test.each([1000,1400,1800,2000,3000].map((cap,index)=>[index+1,cap]))('100K Reward %i caps requests at %i gross', (level,cap) => {
    expect(getV1RewardCap(100000,level)).toBe(cap);
    expect(REWARD_AMOUNTS[2][level-1]).toBe(cap);
    expect(getV1RewardCapDisplay(100000,level).replace(/\s/g,'')).toBe(`${cap}$`);
    const input={start:100000,balance:110000,equity:110000,phase:'funded',status:'funded',paidCount:level-1,terminated:false,pending:false,kyc:true,dailyProfits:[600,600,600,600,600]};
    const full=evaluateReward(input);
    expect(full.eligible).toBe(true);
    expect(full.maximum).toBe(cap);
    expect(evaluateReward({...input,balance:100200,equity:100200}).maximum).toBe(200);
    expect(evaluateReward({...input,pending:true}).eligible).toBe(false);
    expect(evaluateReward({...input,paidCount:5}).eligible).toBe(false);
  });

  test('25K and 50K caps are unchanged',()=>{
    expect(REWARD_AMOUNTS[0]).toEqual([300,400,500,600,750]);
    expect(REWARD_AMOUNTS[1]).toEqual([500,650,800,1000,1250]);
  });

  test.each([['$25,000','2 250'],['$50,000','4 500'],['$100,000','9 000']])('client emails disclose the new target for %s', (accountSize,amount)=>{
    const p={accountSize,siteUrl:'https://example.test',logoUrl:'https://example.test/logo.png'};
    const validated=buildChallengerValidatedEmail(p).html.replace(/[\u00a0\u202f]/g,' ');
    expect(validated).toContain('+9 %');
    expect(validated).toContain(amount);
    const welcome=buildWelcomeEmail({...p,model:'1step'}).html.replace(/[\u00a0\u202f]/g,' ');
    expect(welcome).toContain('+9 %');
    expect(welcome).toContain(amount);
  });
});
