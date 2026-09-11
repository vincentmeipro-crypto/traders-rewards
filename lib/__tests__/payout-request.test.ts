import { NextRequest } from "next/server";
import { POST } from "../../app/api/payouts/route";
import { createClient } from "../supabase/server";
import { loadRewardAccounts } from "../reward-eligibility-server";
jest.mock("../supabase/server", () => ({ createClient: jest.fn() }));
jest.mock("../reward-eligibility-server", () => ({ loadRewardAccounts: jest.fn() }));
const load = jest.mocked(loadRewardAccounts);
const insert = jest.fn();
const db = { auth: { getUser: jest.fn() }, from: jest.fn(() => ({ insert })) };
const request = (amount: unknown = 100) => new NextRequest("http://localhost/api/payouts", { method: "POST", body: JSON.stringify({ challenge_id: "owned-account", amount, wallet_address: "test-only", payment_method: "bank" }) });
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createClient).mockResolvedValue(db as never);
  db.auth.getUser.mockResolvedValue({ data: { user: { id: "test-user" } } });
  load.mockResolvedValue([{ id: "owned-account", eligible: true, maximum: 100, reasons: [] }] as never);
  insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "request-id", status: "pending" }, error: null }) }) });
});
test("unauthenticated request cannot insert", async () => {
  db.auth.getUser.mockResolvedValue({ data: { user: null } });
  expect((await POST(request())).status).toBe(401); expect(insert).not.toHaveBeenCalled();
});
test("validation is scoped to authenticated user and requested account", async () => {
  expect((await POST(request())).status).toBe(200);
  expect(load).toHaveBeenCalledWith(db, "test-user", "owned-account");
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "test-user", amount: 100, status: "pending" }));
});
test("missing or foreign account cannot insert", async () => {
  load.mockResolvedValue([]); expect((await POST(request())).status).toBe(404); expect(insert).not.toHaveBeenCalled();
});
test("conditions are checked again at submission", async () => {
  load.mockResolvedValue([{ eligible: false, reasons: ["pending"] }] as never);
  expect((await POST(request())).status).toBe(409); expect(insert).not.toHaveBeenCalled();
});
test("an amount exceeding current maximum cannot insert", async () => {
  expect((await POST(request(101))).status).toBe(400); expect(insert).not.toHaveBeenCalled();
});
test("unavailable source fails closed", async () => {
  load.mockRejectedValue(new Error("offline")); expect((await POST(request())).status).toBe(503); expect(insert).not.toHaveBeenCalled();
});
