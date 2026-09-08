import { evaluateReward, validRewardAmount } from "../reward-eligibility";
const base = { start: 50000, balance: 52500, equity: 52500, phase: "funded", status: "funded", paidCount: 0, terminated: false, pending: false, kyc: true, dailyProfits: [500, 500, 500, 500, 500] };
describe("Reward request limits", () => {
  test("50K protects 52000 and permits a partial payout", () => {
    const r = evaluateReward(base);
    expect(r.eligible).toBe(true); expect(r.floor).toBe(52000); expect(r.maximum).toBe(500);
    expect(validRewardAmount(0.01, r.maximum)).toBe(true); expect(validRewardAmount(250, r.maximum)).toBe(true);
  });
  test("only profit above the floor, without the former 52600 threshold", () => {
    const r = evaluateReward({ ...base, balance: 52100, equity: 52100 });
    expect(r.eligible).toBe(true); expect(r.maximum).toBe(100);
  });
  test("exact floor has nothing withdrawable", () => expect(evaluateReward({ ...base, balance: 52000 }).eligible).toBe(false));
  test("floating losses reduce available amount", () => expect(evaluateReward({ ...base, equity: 52050 }).maximum).toBe(50));
  test("second reward retains existing cap", () => expect(evaluateReward({ ...base, paidCount: 1, balance: 54000, equity: 54000 }).maximum).toBe(650));
  test.each([25000, 50000, 100000])("floor remains +4 percent for %s", start => expect(evaluateReward({ ...base, start }).floor).toBe(start * 1.04));
  test.each([0, -1, NaN, Infinity, 500.01, 0.001, "100", null])("reject invalid amount %s", amount => expect(validRewardAmount(amount, 500)).toBe(false));
  test.each([{ kyc: false }, { pending: true }, { terminated: true }, { status: "failed" }, { phase: "phase1" }, { paidCount: 5 }, { equity: NaN }, { dailyProfits: [250, 250] }, { dailyProfits: [2000, 250, 250, 250, 250] }])("blocks unmet conditions %j", patch => expect(evaluateReward({ ...base, ...patch }).eligible).toBe(false));
});
