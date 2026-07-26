"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, ShieldCheck, X } from "lucide-react";

const VIP_PRODUCTS: Record<string, { label: string; price: string; amount: number }> = {
  "25k-vip":  { label: "$25,000",  price: "1 250€",  amount: 125000  },
  "50k-vip":  { label: "$50,000",  price: "2 500€",  amount: 250000  },
  "100k-vip": { label: "$100,000", price: "5 000€",  amount: 500000  },
  "200k-vip": { label: "$200,000", price: "10 000€", amount: 1000000 },
};

const VIP_RULES = [
  { label: "Phase 1 — Objectif",    value: "+10%" },
  { label: "Phase 2 — Objectif",    value: "+5%" },
  { label: "Perte journalière max", value: "5%" },
  { label: "Perte totale max",      value: "10%" },
  { label: "Limite de temps",       value: "Illimitée" },
  { label: "Validation",            value: "Automatique ✓" },
  { label: "Partage des profits",   value: "100%" },
  { label: "Récompenses",           value: "Tous les 30 jours" },
];

// Tunnel SVG — calculé une fois
const TUNNEL_D = (() => {
  const W = 1440, H = 900, IX1 = 480, IY1 = 300, IX2 = 960, IY2 = 600;
  const lp = (a: number, b: number, t: number) => Math.round((a + (b - a) * t) * 10) / 10;
  const d: string[] = [];
  for (let i = 0; i <= 12; i++) { const t = i/12; d.push(`M${lp(0,W,t)} 0L${lp(IX1,IX2,t)} ${IY1}`); }
  for (let j = 1; j <= 6; j++) { const t = j/7; const y = lp(0,IY1,t); d.push(`M${lp(0,IX1,t)} ${y}L${lp(W,IX2,t)} ${y}`); }
  for (let i = 0; i <= 12; i++) { const t = i/12; d.push(`M${lp(0,W,t)} ${H}L${lp(IX1,IX2,t)} ${IY2}`); }
  for (let j = 1; j <= 6; j++) { const t = j/7; const y = lp(H,IY2,t); d.push(`M${lp(0,IX1,t)} ${y}L${lp(W,IX2,t)} ${y}`); }
  for (let i = 0; i <= 8; i++) { const t = i/8; d.push(`M0 ${lp(0,H,t)}L${IX1} ${lp(IY1,IY2,t)}`); }
  for (let j = 1; j <= 5; j++) { const t = j/6; d.push(`M${lp(0,IX1,t)} ${lp(0,IY1,t)}L${lp(0,IX1,t)} ${lp(H,IY2,t)}`); }
  for (let i = 0; i <= 8; i++) { const t = i/8; d.push(`M${W} ${lp(0,H,t)}L${IX2} ${lp(IY1,IY2,t)}`); }
  for (let j = 1; j <= 5; j++) { const t = j/6; d.push(`M${lp(W,IX2,t)} ${lp(0,IY1,t)}L${lp(W,IX2,t)} ${lp(H,IY2,t)}`); }
  d.push(`M${IX1} ${IY1}L${IX2} ${IY1}L${IX2} ${IY2}L${IX1} ${IY2}Z`);
  for (let i = 1; i <= 5; i++) { const x = lp(IX1,IX2,i/6); d.push(`M${x} ${IY1}L${x} ${IY2}`); }
  for (let j = 1; j <= 3; j++) { const y = lp(IY1,IY2,j/4); d.push(`M${IX1} ${y}L${IX2} ${y}`); }
  return d.join(" ");
})();

const DIAL_CODES = [
  { code: "+33", flag: "🇫🇷" }, { code: "+32", flag: "🇧🇪" }, { code: "+41", flag: "🇨🇭" },
  { code: "+352", flag: "🇱🇺" }, { code: "+1", flag: "🇺🇸" }, { code: "+44", flag: "🇬🇧" },
  { code: "+49", flag: "🇩🇪" }, { code: "+34", flag: "🇪🇸" }, { code: "+39", flag: "🇮🇹" },
  { code: "+31", flag: "🇳🇱" }, { code: "+351", flag: "🇵🇹" }, { code: "+48", flag: "🇵🇱" },
  { code: "+212", flag: "🇲🇦" }, { code: "+213", flag: "🇩🇿" }, { code: "+216", flag: "🇹🇳" },
  { code: "+221", flag: "🇸🇳" }, { code: "+225", flag: "🇨🇮" }, { code: "+971", flag: "🇦🇪" },
  { code: "+55", flag: "🇧🇷" }, { code: "+91", flag: "🇮🇳" }, { code: "+61", flag: "🇦🇺" },
];

function VipCheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("product") || "50k-vip";
  const product = VIP_PRODUCTS[productId] || VIP_PRODUCTS["50k-vip"];

  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; token: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dialCode, setDialCode] = useState("+33");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [payError, setPayError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [refCode, setRefCode] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");

  const fullPhone = phone ? `${dialCode} ${phone}` : "";
  const isAdult = birthDate ? (() => { const b = new Date(birthDate); const min = new Date(); min.setFullYear(min.getFullYear() - 18); return b <= min; })() : false;
  const profileComplete = firstName.trim() && lastName.trim() && phone.trim() && email.trim() && city.trim() && country.trim() && isAdult && (user || (password.length >= 8 && password === confirmPassword));
  const canPay = !!profileComplete && agreedToTerms;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    setRefCode(localStorage.getItem("elysium_ref") || "");
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email!, token: session.access_token });
        setEmail(session.user.email!);
        const res = await fetch("/api/profile", { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (res.ok) {
          const p = await res.json();
          if (p.first_name) setFirstName(p.first_name);
          if (p.last_name) setLastName(p.last_name);
          if (p.city) setCity(p.city);
          if (p.postal_code) setPostalCode(p.postal_code);
          if (p.country) setCountry(p.country);
          if (p.birth_date) setBirthDate(p.birth_date);
          if (p.phone) {
            const match = p.phone.match(/^(\+\d+)\s(.+)$/);
            if (match) { setDialCode(match[1]); setPhone(match[2]); }
          }
        }
      }
    });
  }, []);

  const saveProfile = async (token: string) => {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, phone: fullPhone, email, city, postal_code: postalCode, country, birth_date: birthDate }),
    });
  };

  const createAccountAndGetUser = async () => {
    const supabase = createClient();
    if (password !== confirmPassword) { setPasswordError("Les mots de passe ne correspondent pas"); return null; }
    if (password.length < 8) { setPasswordError("Minimum 8 caractères"); return null; }
    setPasswordError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.session) {
      return { id: data.user!.id, email: data.user!.email!, token: data.session.access_token };
    }
    if (error?.message?.includes("already") || !data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setPayError("Email déjà utilisé. Connecte-toi d'abord."); return null; }
      if (signInData.session) return { id: signInData.user.id, email: signInData.user.email!, token: signInData.session.access_token };
    }
    if (error) { setPayError(error.message); return null; }
    return null;
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError("");
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.discount !== undefined) {
      setPromoCode(data.code);
      setPromoDiscount(data.discount);
    } else {
      setPromoError(data.error || "Code invalide");
      setPromoDiscount(0);
      setPromoCode("");
    }
    setPromoLoading(false);
  };

  const handleFree = async () => {
    setPayError("");
    let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoading(true);
    await saveProfile(u.token);
    const res = await fetch("/api/promo/free", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${u.token}` },
      body: JSON.stringify({ productId, userId: u.id, promoCode }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) router.push("/dashboard?algo=activated");
    else setPayError(data.error || "Erreur activation.");
  };

  const handleCrypto = async () => {
    setPayError("");
    let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoading(true);
    await saveProfile(u.token);
    const res = await fetch("/api/crypto/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: u.id, promoCode, discount: promoDiscount, refCode }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setPayError(data.error || "Erreur paiement."); setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "#111", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8,
    padding: "10px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: "1px",
    marginBottom: 6, display: "block", textTransform: "uppercase",
  };

  const EyeOpen = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  const EyeOff = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", overflow: "hidden" }}>
      {/* SVG Tunnel Background */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <path d={TUNNEL_D} stroke="rgba(255,255,255,0.45)" strokeWidth="1" fill="none" />
      </svg>
      {/* Vignette légère — assombrit juste les coins, préserve le centre */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.55) 100%)" }} />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100vh" }}>
        <style>{`
          @property --vip-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
          @keyframes vipSpin { to { --vip-angle: 360deg; } }
          .vip-border-co {
            padding: 1.5px; border-radius: 10px; display: block;
            background: conic-gradient(from var(--vip-angle), #1d4ed8 0%, #3B82F6 25%, #ffffff 45%, #EF4444 65%, #1d4ed8 100%);
            animation: vipSpin 3s linear infinite;
          }
          .vip-btn {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            width: 100%; padding: 13px; border-radius: 9px;
            font-size: 14px; font-weight: 800; letter-spacing: 0.5px;
            background: #000; color: #fff; border: none; cursor: pointer;
            transition: opacity 0.2s;
          }
          .vip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
          .vip-input:focus { border-color: rgba(59,130,246,0.5) !important; outline: none !important; }
          .vip-select option { background: #111; color: #fff; }
        `}</style>

        {/* Header */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 10, backdropFilter: "blur(10px)", background: "rgba(0,0,0,0.4)", flexShrink: 0 }}>
          <a href="/vip" style={{ textDecoration: "none", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
            ← Challenge Algo
          </a>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>/</span>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Accès {product.label}</span>
          <div style={{ marginLeft: "auto", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 100, padding: "3px 12px", fontSize: 10, fontWeight: 700, color: "#3B82F6", letterSpacing: "1px" }}>
            ⚡ ALGO
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", gap: 18, padding: "18px 24px", overflow: "hidden", maxWidth: 1080, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>

          {/* LEFT — Résumé */}
          <div style={{ width: 256, flexShrink: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ background: "rgba(6,6,10,0.78)", backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.22)", borderRadius: 16, padding: "18px 16px", height: "100%", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 9, color: "#3B82F6", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 4 }}>Challenge Algo</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{product.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: "#3B82F6", marginBottom: 14 }}>{product.price}</div>

              <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                {VIP_RULES.map((r, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: i < VIP_RULES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10.5 }}>{r.label}</span>
                    <span style={{ color: r.value.includes("✓") ? "#22c55e" : "#fff", fontSize: 10.5, fontWeight: 700 }}>{r.value}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 8, padding: "7px 10px", fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.6 }}>
                Accès unique — aucun abonnement.<br />Paiement en crypto uniquement.
              </div>
            </div>
          </div>

          {/* RIGHT — Formulaire */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Infos personnelles */}
            <div style={{ background: "rgba(6,6,10,0.78)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", flexShrink: 0 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
                <input className="vip-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom *" style={inp} />
                <input className="vip-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom *" style={inp} />
                <div style={{ gridColumn: "1 / -1" }}>
                  <input className="vip-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email *" style={inp} />
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <select className="vip-select" value={dialCode} onChange={e => setDialCode(e.target.value)}
                    style={{ ...inp, width: 82, flexShrink: 0, cursor: "pointer", padding: "10px 4px" }}>
                    {DIAL_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input className="vip-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Téléphone *" style={{ ...inp, flex: 1, width: "auto" }} />
                </div>
                <div>
                  <input type="date" className="vip-input" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                    max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                    style={{ ...inp, colorScheme: "dark" }} />
                  {birthDate && !isAdult && <div style={{ color: "#ef4444", fontSize: 10, marginTop: 2 }}>18 ans minimum.</div>}
                </div>
                <input className="vip-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Ville *" style={inp} />
                <div style={{ display: "flex", gap: 6 }}>
                  <input className="vip-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="Code postal" style={{ ...inp, width: "90px", flexShrink: 0 }} />
                  <input className="vip-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="Pays *" style={{ ...inp, flex: 1, width: "auto" }} />
                </div>
              </div>
            </div>

            {/* Compte — si non connecté */}
            {!user && (
              <div style={{ background: "rgba(6,6,10,0.78)", backdropFilter: "blur(20px)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 14, padding: "12px 16px", flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: "#3B82F6", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>Créer votre compte</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
                  <div style={{ position: "relative" }}>
                    <input type={showPassword ? "text" : "password"} className="vip-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mot de passe *" style={{ ...inp, paddingRight: 40 }} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                      {showPassword ? <EyeOff /> : <EyeOpen />}
                    </button>
                  </div>
                  <div style={{ position: "relative" }}>
                    <input type={showConfirmPassword ? "text" : "password"} className="vip-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirmer *"
                      style={{ ...inp, paddingRight: 40, borderColor: confirmPassword ? (confirmPassword === password ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)") : "rgba(255,255,255,0.12)" }} />
                    <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                      {showConfirmPassword ? <EyeOff /> : <EyeOpen />}
                    </button>
                  </div>
                  {passwordError && <div style={{ gridColumn: "1/-1", color: "#ef4444", fontSize: 11 }}>{passwordError}</div>}
                </div>
              </div>
            )}

            {user && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", background: "rgba(6,6,10,0.6)", backdropFilter: "blur(10px)", borderRadius: 10, border: "1px solid rgba(34,197,94,0.2)", flexShrink: 0 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Connecté — {user.email}</span>
              </div>
            )}

            {/* Spacer — tunnel visible ici */}
            <div style={{ flex: 1 }} />

            {/* CGV + Paiement */}
            <div style={{ background: "rgba(6,6,10,0.78)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 16px", flexShrink: 0 }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 9, cursor: "pointer", marginBottom: 12 }}>
                <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                  style={{ marginTop: 2, accentColor: "#3B82F6", width: 13, height: 13, flexShrink: 0, cursor: "pointer" }} />
                <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, lineHeight: 1.5 }}>
                  J&apos;accepte les{" "}
                  <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "underline" }}>Conditions Générales</a>
                  {" "}— trading 100% simulé, frais non remboursables, récompenses 100% des profits.
                </span>
              </label>

              {payError && (
                <div style={{ color: "#ef4444", fontSize: 12, padding: "7px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, marginBottom: 10 }}>
                  {payError}
                </div>
              )}
              {!profileComplete && (
                <p style={{ textAlign: "center", color: "rgba(255,255,255,0.22)", fontSize: 11, margin: "0 0 10px" }}>Remplissez tous les champs pour continuer.</p>
              )}
              {profileComplete && !agreedToTerms && (
                <p style={{ textAlign: "center", color: "#f59e0b", fontSize: 11, margin: "0 0 10px" }}>Acceptez les CGV pour continuer.</p>
              )}

              {promoDiscount === 100 ? (
                <div className="vip-border-co">
                  <button className="vip-btn" onClick={handleFree} disabled={loading || !canPay}>
                    {loading ? "Activation..." : <>✓ Activer gratuitement <ChevronRight size={15} /></>}
                  </button>
                </div>
              ) : (
                <div className="vip-border-co">
                  <button className="vip-btn" onClick={handleCrypto} disabled={loading || !canPay}>
                    {loading ? "Redirection..." : <><span style={{ fontSize: 16 }}>₿</span> Payer {product.price} en crypto <ChevronRight size={15} /></>}
                  </button>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10 }}>
                <ShieldCheck size={12} color="rgba(255,255,255,0.2)" />
                <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 10 }}>Paiement sécurisé · NOWPayments · SSL</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default function VipCheckoutPage() {
  return <Suspense><VipCheckoutContent /></Suspense>;
}
