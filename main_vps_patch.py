from flask import Flask, request, jsonify
import MT5Manager
import time
import random
import string
import os
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)
app = Flask(__name__)

MT5_SERVER     = os.environ.get("MT5_SERVER",     "144.91.107.183:443")
TRADER_SERVER  = os.environ.get("TRADER_SERVER",  "TODO_ASK_ALLAN")
MT5_LOGIN      = int(os.environ.get("MT5_LOGIN",  "5032"))
MT5_PASSWORD   = os.environ.get("MT5_PASSWORD",   "_3UpOkWq")
API_SECRET     = os.environ.get("MT5_API_SECRET", "elysium-mt5-secret-2025")
TEMPLATE_LOGIN = 0  # TODO: ask Allan for template login on new server

GROUP_MAP = {
    "2step":         r"HAR\MAN32\demoG1",
    "1step":         r"HAR\MAN32\demoG2",
    "funded_2step":  r"HAR\MAN32\demoG3",
    "funded_1step":  r"HAR\MAN32\demoG4",
    "disabled":      r"HAR\MAN32\demoG5",
}

BALANCE_MAP = {
    "$10,000": 10000.0, "$25,000": 25000.0,
    "$50,000": 50000.0, "$100,000": 100000.0,
    "$200,000": 200000.0,
}

def generate_password():
    upper   = random.choices(string.ascii_uppercase, k=2)
    lower   = random.choices(string.ascii_lowercase, k=4)
    digits  = random.choices(string.digits, k=3)
    special = random.choices("@#!", k=1)
    all_chars = upper + lower + digits + special
    random.shuffle(all_chars)
    return "".join(all_chars)

def connect_mt5():
    mgr = MT5Manager.ManagerAPI()
    ok = mgr.Connect(MT5_SERVER, MT5_LOGIN, MT5_PASSWORD)
    if not ok:
        log.error("MT5 connection failed")
        return None
    mgr.UserSubscribe()
    time.sleep(0.5)
    return mgr

def auth(req):
    return req.headers.get("x-api-key") == API_SECRET

@app.route("/health", methods=["GET"])
def health():
    mgr = connect_mt5()
    if not mgr:
        return jsonify({"status": "error", "mt5": False}), 500
    mgr.Disconnect()
    return jsonify({"status": "ok", "mt5": True})

@app.route("/accounts/create", methods=["POST"])
def create_account():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    first_name   = data.get("first_name", "")
    last_name    = data.get("last_name", "")
    email        = data.get("email", "")
    leverage     = int(data.get("leverage", 100))
    group        = data.get("group", r"Starwave\demo\FX1\grp1")
    account_size = data.get("account_size", "$10,000")
    balance      = BALANCE_MAP.get(account_size, 10000.0)
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        users = mgr.UserGetByLogins([TEMPLATE_LOGIN])
        if not users: return jsonify({"error": "Template user not found"}), 500
        u = users[0]
        master_pass   = generate_password()
        investor_pass = generate_password()
        u.Login = 0
        u.Name  = f"{first_name} {last_name}".strip() or email
        u.FirstName = first_name
        u.LastName  = last_name
        u.EMail  = email
        u.Group  = group
        u.Leverage = leverage
        u.Comment  = f"Elysium {account_size}"
        ok = mgr.UserAdd(u, master_pass, investor_pass)
        if not ok:
            err = MT5Manager.LastError()
            return jsonify({"error": f"UserAdd failed: {err}"}), 500
        new_login = u.Login
        time.sleep(0.3)
        mgr.DealerBalance(new_login, balance, 2, f"Elysium {account_size} Initial Balance")
        mgr.Disconnect()
        return jsonify({"login": new_login, "password": master_pass, "password_investor": investor_pass, "server": TRADER_SERVER, "group": group, "balance": balance})
    except Exception as e:
        log.exception("create_account error")
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/change-group", methods=["POST"])
def change_group():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    login = int(data.get("login", 0))
    new_group = data.get("new_group", "")
    if not login or not new_group: return jsonify({"error": "Missing params"}), 400
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        users = mgr.UserGetByLogins([login])
        if not users: return jsonify({"error": f"User {login} not found"}), 404
        u = users[0]
        u.Group = new_group
        ok = mgr.UserUpdate(u)
        mgr.Disconnect()
        if not ok: return jsonify({"error": "UserUpdate failed"}), 500
        return jsonify({"success": True, "login": login, "new_group": new_group})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/disable", methods=["POST"])
def disable_account():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data  = request.json or {}
    login = int(data.get("login", 0))
    if not login: return jsonify({"error": "Missing login"}), 400
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        users = mgr.UserGetByLogins([login])
        if not users: return jsonify({"error": f"User {login} not found"}), 404
        u = users[0]
        u.Group   = GROUP_MAP["disabled"]
        u.Comment = "DISABLED - Breach"
        ok = mgr.UserUpdate(u)
        mgr.Disconnect()
        if not ok: return jsonify({"error": "UserUpdate failed"}), 500
        return jsonify({"success": True, "login": login})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/add-balance", methods=["POST"])
def add_balance():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    login = int(data.get("login", 0))
    amount = float(data.get("amount", 0))
    comment = data.get("comment", "Deposit")
    if not login or amount <= 0: return jsonify({"error": "Missing params"}), 400
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        deal = mgr.DealerBalance(login, amount, 2, comment)
        mgr.Disconnect()
        if not deal: return jsonify({"error": "DealerBalance failed"}), 500
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/withdraw", methods=["POST"])
def withdraw_balance():
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    data = request.json or {}
    login = int(data.get("login", 0))
    amount = float(data.get("amount", 0))
    comment = data.get("comment", "Profit Withdrawal")
    if not login or amount <= 0: return jsonify({"error": "Missing params"}), 400
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        deal = mgr.DealerBalance(login, -abs(amount), 2, comment)
        mgr.Disconnect()
        if not deal: return jsonify({"error": "DealerBalance failed"}), 500
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>", methods=["GET"])
def get_account(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        mgr.UserAccountSubscribe()
        time.sleep(0.5)
        accounts = mgr.UserAccountGetByLogins([login])
        mgr.Disconnect()
        if not accounts: return jsonify({"error": f"Account {login} not found"}), 404
        a = accounts[0]
        return jsonify({"login": a.Login, "balance": a.Balance, "equity": a.Equity, "margin": a.Margin, "profit": a.Profit})
    except Exception as e:
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
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        users = mgr.UserGetByLogins([login])
        if not users:
            mgr.Disconnect()
            return jsonify({"error": "User not found"}), 404
        u = users[0]
        u.Name = full_name
        mgr.UserUpdate(u)
        mgr.Disconnect()
        return jsonify({"ok": True, "name": full_name})
    except Exception as e:
        import traceback; traceback.print_exc()
        try: mgr.Disconnect()
        except: pass
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>/history", methods=["GET"])
def get_history(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        from_ts = int(time.time()) - 86400 * 30
        to_ts   = int(time.time()) + 86400
        deals = mgr.DealGetByLogin(login, from_ts, to_ts) or []
        mgr.Disconnect()
        result = []
        for d in deals:
            result.append({"ticket": d.Deal, "login": d.Login, "symbol": d.Symbol, "type": d.Action,
                           "volume": d.Volume, "price": d.Price, "profit": d.Profit,
                           "time": d.Time, "entry": d.Entry, "comment": d.Comment})
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>/close-positions", methods=["POST"])
def close_positions(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        positions = mgr.PositionGetByLogin(login) or []
        closed = 0
        for p in positions:
            mgr.PositionClose(p.Position)
            closed += 1
        mgr.Disconnect()
        return jsonify({"closed": closed})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/accounts/<int:login>/change-password", methods=["POST"])
def change_password(login):
    if not auth(request): return jsonify({"error": "Unauthorized"}), 401
    mgr = connect_mt5()
    if not mgr: return jsonify({"error": "Cannot connect to MT5"}), 500
    try:
        new_pass = generate_password()
        users = mgr.UserGetByLogins([login])
        if not users:
            mgr.Disconnect()
            return jsonify({"error": "User not found"}), 404
        mgr.UserPasswordChange(login, new_pass, 0)
        mgr.Disconnect()
        return jsonify({"ok": True, "password": new_pass})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    log.info(f"Starting Elysium MT5 Microservice on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False)
