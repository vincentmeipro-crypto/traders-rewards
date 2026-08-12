"""Traders Rewards MT5 drawdown watchdog.

Runs next to the existing ElysiumMT5 bridge. It polls live balance + floating P&L
once per second and latches a breach immediately through the signed website API.
"""
from __future__ import annotations

import json
import logging
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

SITE_URL = os.environ.get("TRADERS_REWARDS_URL", "https://www.traders-rewards.eu").rstrip("/")
WATCHDOG_SECRET = os.environ["MT5_WATCHDOG_SECRET"]
MT5_API_SECRET = os.environ["MT5_API_SECRET"]
MT5_LOCAL_URL = os.environ.get("MT5_LOCAL_URL", "http://127.0.0.1:5000").rstrip("/")
POLL_SECONDS = max(0.25, float(os.environ.get("MT5_WATCHDOG_POLL_SECONDS", "1")))
RULE_REFRESH_SECONDS = max(2.0, float(os.environ.get("MT5_WATCHDOG_RULE_REFRESH_SECONDS", "5")))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def request_json(url: str, secret: str, method: str = "GET", payload: dict | None = None, timeout: float = 5.0):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Authorization": f"Bearer {secret}",
        "x-api-key": secret,
        "Content-Type": "application/json",
    })
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode())


def load_rules() -> list[dict]:
    result = request_json(f"{SITE_URL}/api/internal/mt5-breach", WATCHDOG_SECRET)
    return result.get("accounts", [])


def calculate_equity(account: dict, positions: list[dict]) -> float:
    balance = float(account.get("balance") or 0)
    # The current bridge omits account.profit. Open-position P&L is therefore
    # the authoritative source while a trade is live.
    if positions:
        return balance + sum(float(position.get("profit") or 0) for position in positions)
    profit = account.get("profit")
    if profit is not None:
        return balance + float(profit)
    return float(account.get("equity") or balance)


def live_equity(login: int) -> float:
    account = request_json(f"{MT5_LOCAL_URL}/accounts/{login}", MT5_API_SECRET, timeout=2.0)
    position_payload = request_json(f"{MT5_LOCAL_URL}/accounts/{login}/positions", MT5_API_SECRET, timeout=2.0)
    positions = position_payload.get("positions", []) if isinstance(position_payload, dict) else position_payload
    return calculate_equity(account, positions or [])


def breach_reason(rule: dict, equity: float) -> str | None:
    start_balance = float(rule["start_balance"])
    daily_floor = start_balance * (1 - float(rule.get("daily_drawdown_limit") or 5) / 100)
    total_floor = start_balance * (1 - float(rule.get("total_drawdown_limit") or 10) / 100)
    if equity <= total_floor:
        return "total_drawdown"
    if equity <= daily_floor:
        return "daily_drawdown"
    return None


def report_breach(login: int, equity: float) -> bool:
    result = request_json(
        f"{SITE_URL}/api/internal/mt5-breach",
        WATCHDOG_SECRET,
        method="POST",
        payload={"login": login, "equity": equity, "observed_at": datetime.now(timezone.utc).isoformat()},
        timeout=15.0,
    )
    return bool(result.get("breach"))


def main() -> None:
    rules: list[dict] = []
    next_refresh = 0.0
    latched: set[int] = set()
    while True:
        started = time.monotonic()
        if started >= next_refresh:
            try:
                rules = load_rules()
                active = {int(rule["mt5_login"]) for rule in rules}
                latched.intersection_update(active)
                next_refresh = started + RULE_REFRESH_SECONDS
                logging.info("Monitoring %d active MT5 accounts", len(rules))
            except Exception:
                logging.exception("Unable to refresh account rules")
                next_refresh = started + 5.0

        for rule in rules:
            login = int(rule["mt5_login"])
            if login in latched:
                continue
            try:
                equity = live_equity(login)
                reason = breach_reason(rule, equity) if equity > 0 else None
                if reason:
                    logging.critical("BREACH login=%s equity=%.2f reason=%s", login, equity, reason)
                    if report_breach(login, equity):
                        latched.add(login)
                        next_refresh = 0.0
            except (urllib.error.URLError, TimeoutError):
                logging.warning("MT5/API unavailable for login %s", login)
            except Exception:
                logging.exception("Watchdog check failed for login %s", login)

        elapsed = time.monotonic() - started
        time.sleep(max(0.0, POLL_SECONDS - elapsed))


if __name__ == "__main__":
    main()