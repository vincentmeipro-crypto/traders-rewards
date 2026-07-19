from flask import Flask, request, jsonify
import MT5Manager
import time
import random
import string
import os
import logging
import threading

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)
app = Flask(__name__)

MT5_SERVER     = os.environ.get("MT5_SERVER",     "144.91.107.183:443")
TRADER_SERVER  = os.environ.get("TRADER_SERVER",  "XyloMarkets-Server")
MT5_LOGIN      = int(os.environ.get("MT5_LOGIN",  "5032"))
MT5_PASSWORD   = os.environ.get("MT5_PASSWORD",   "_3UpOkWq")
API_SECRET     = os.environ.get("MT5_API_SECRET", "elysium-mt5-secret-2025")

GROUP_MAP = {
    "2step":         r"HAR\MAN32\demoG1",
    "1step":         r"HAR\MAN32\demoG2",
    "funded_2step":  r"HAR\MAN32\demoG3",
    "funded_1step":  r"HAR\MAN32\demoG4",
    "disabled":      r"HAR\MAN32\demoG5",
}

# Used as template base for UserAdd (MTUser() can't be instantiated directly)
TEMPLATE_LOGIN = int(os.environ.get("TEMPLATE_LOGIN", "9009094831543"))

BALANCE_MAP = {
    "$10,000": 10000.0, "$25,000": 25000.0,
    "$50,000": 50000.0, "$100,000": 100000.0,
    "$200,000": 200000.0,
}

# Global manager instance (required for MTUser to work)
_manager = MT5Manager.ManagerAPI()

# Prevent concurrent MT5 operations (library is not thread-safe)
_mt5_lock = threading.Semaphore(1)

def generate_password():
    upper   = random.choices(string.ascii_uppercase, k=2)
    lower   = random.choices(string.ascii_lowercase, k=4)
    digits  = random.choices(string.digits, k=3)
    special = random.choices("@#!", k=1)
    all_chars = upper + lower + digits + special
    random.shuffle(all_chars)
    return "".join(all_chars)

def connect_mt5():
    ok = _manager.Connect(MT5_SERVER, MT5_LOGIN, MT5_PASSWORD,
                          MT5Manager.ManagerAPI.EnPumpModes.PUMP_MODE_FULL, 30000)
    if not ok:
        log.error("MT5 connection failed: %s", MT5Manager.LastError())
        return None
    return _manager

def auth(req):
    return req.headers.get("x-api-key") == API_SECRET

@app.route("/health", methods=["GET"])
def health():
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired:
        return jsonify({"status": "busy", "mt5": True}), 200
    try:
        mgr = connect_mt5()
        if not mgr:
            return jsonify({"status": "error", "mt5": False}), 500
        mgr.Disconnect()
        return jsonify({"status": "ok", "mt5": True})
    finally:
        _mt5_lock.release()

@app.route("/accounts/create", methods=["POST"])
def create_account():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    first_name   = data.get("first_name", "")
    last_name    = data.get("last_name", "")
    email        = data.get("email", "")
    leverage     = int(data.get("leverage", 100))
    group        = data.get("group", r"HAR\MAN32\demoG1")
    account_size = data.get("account_size", "$10,000")
    balance      = BALANCE_MAP.get(account_size, 10000.0)
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        master_pass   = generate_password()
        investor_pass = generate_password()
        # MTUser() can't be instantiated directly — use existing user as template
        u = mgr.UserGet(TEMPLATE_LOGIN)
        if not u:
            mgr.Disconnect()
            _mt5_lock.release()
            return jsonify({"error": "Cannot get template user"}), 500
        u.Login     = 0
        u.Name      = f"{first_name} {last_name}".strip() or email
        u.FirstName = first_name
        u.LastName  = last_name
        u.EMail     = email
        u.Group     = group
        u.Leverage  = leverage
        u.Comment   = f"Traders Rewards {account_size}"
        u.Phone     = ""
        u.Address   = ""
        u.City      = ""
        u.Country   = ""
        u.State     = ""
        u.ZIPCode   = ""
        ok = mgr.UserAdd(u, master_pass, investor_pass)
        if not ok:
            err = MT5Manager.LastError()
            mgr.Disconnect()
            _mt5_lock.release()
            return jsonify({"error": f"UserAdd failed: {err}"}), 500
        new_login = u.Login
        time.sleep(0.3)
        mgr.DealerBalance(new_login, balance, 2, f"Traders Rewards {account_size}")
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"login": new_login, "password": master_pass, "password_investor": investor_pass, "server": TRADER_SERVER, "group": group, "balance": balance})
    except Exception as e:
        log.exception("create_account error")
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/change-group", methods=["POST"])
def change_group():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    login = int(data.get("login", 0))
    new_group = data.get("new_group", "")
    if not login or not new_group: return jsonify({"error": "Missing params"}), 400
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        u = mgr.UserGet(login)
        if not u:
            mgr.Disconnect()
            _mt5_lock.release()
            return jsonify({"error": f"User {login} not found"}), 404
        u.Group = new_group
        mgr.UserUpdate(u)
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"success": True, "login": login, "new_group": new_group})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/disable", methods=["POST"])
def disable_account():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data  = request.json or {}
    login = int(data.get("login", 0))
    if not login: return jsonify({"error": "Missing login"}), 400
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        u = mgr.UserGet(login)
        if not u:
            mgr.Disconnect()
            _mt5_lock.release()
            return jsonify({"error": f"User {login} not found"}), 404
        u.Group = GROUP_MAP["disabled"]
        mgr.UserUpdate(u)
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"success": True, "login": login})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/add-balance", methods=["POST"])
def add_balance():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    login = int(data.get("login", 0))
    amount = float(data.get("amount", 0))
    comment = data.get("comment", "Deposit")
    if not login or amount <= 0: return jsonify({"error": "Missing params"}), 400
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        mgr.DealerBalance(login, amount, 2, comment)
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"success": True})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/withdraw", methods=["POST"])
def withdraw_balance():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    login = int(data.get("login", 0))
    amount = float(data.get("amount", 0))
    comment = data.get("comment", "Profit Withdrawal")
    if not login or amount <= 0: return jsonify({"error": "Missing params"}), 400
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        mgr.DealerBalance(login, -abs(amount), 2, comment)
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"success": True})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>", methods=["GET"])
def get_account(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        account = mgr.UserAccountGet(login)
        mgr.Disconnect()
        _mt5_lock.release()
        if not account: return jsonify({"error": f"Account {login} not found"}), 404
        return jsonify({"login": account.Login, "balance": account.Balance, "equity": account.Equity, "margin": account.Margin, "profit": account.Profit})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>/update-name", methods=["POST"])
def update_account_name(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    first_name = (data.get("first_name") or "").strip()
    last_name  = (data.get("last_name")  or "").strip()
    label      = (data.get("label")      or "").strip()
    parts = [p for p in [first_name, last_name] if p]
    base = " ".join(parts)
    full_name = (base + " | " + label) if label else base
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        u = mgr.UserGet(login)
        if not u:
            mgr.Disconnect()
            _mt5_lock.release()
            return jsonify({"error": "User not found"}), 404
        u.Name = full_name
        mgr.UserUpdate(u)
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"ok": True, "name": full_name})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>/history", methods=["GET"])
def get_history(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        from_ts = int(time.time()) - 86400 * 30
        to_ts   = int(time.time()) + 86400
        deals = mgr.DealGetByLogin(login, from_ts, to_ts) or []
        mgr.Disconnect()
        _mt5_lock.release()
        result = []
        for d in deals:
            result.append({"ticket": d.Deal, "login": d.Login, "symbol": d.Symbol, "type": d.Action,
                           "volume": d.Volume, "price": d.Price, "profit": d.Profit,
                           "time": d.Time, "entry": d.Entry, "comment": d.Comment})
        return jsonify(result)
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>/close-positions", methods=["POST"])
def close_positions(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        positions = mgr.PositionGetByLogin(login) or []
        closed = 0
        for p in positions:
            mgr.PositionClose(p.Position)
            closed += 1
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"closed": closed})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>/change-password", methods=["POST"])
def change_password(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    acquired = _mt5_lock.acquire(timeout=5)
    if not acquired: return jsonify({"error": "Server busy, retry"}), 503
    mgr = connect_mt5()
    if not mgr:
        _mt5_lock.release()
        return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        new_pass = generate_password()
        u = mgr.UserGet(login)
        if not u:
            mgr.Disconnect()
            _mt5_lock.release()
            return jsonify({"error": "User not found"}), 404
        mgr.UserPasswordChange(login, MT5Manager.MTUser.EnUsersPasswords.USER_PASS_MAIN, new_pass)
        mgr.Disconnect()
        _mt5_lock.release()
        return jsonify({"ok": True, "password": new_pass})
    except Exception as e:
        try: mgr.Disconnect()
        except: pass
        _mt5_lock.release()
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    log.info(f"Starting Traders Rewards MT5 Microservice on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
