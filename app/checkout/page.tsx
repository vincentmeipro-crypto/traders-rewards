"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { ChevronRight, Tag, X, User } from "lucide-react";

const CANDLES: [boolean, number, number, number, number][] = [
  [true,  314, 452, 268, 498],
  [false, 300, 382, 254, 422],
  [true,  268, 392, 236, 438],
  [false, 254, 338, 210, 374],
  [true,  210, 346, 178, 392],
  [false, 200, 282, 164, 314],
  [true,  164, 292, 132, 328],
  [false, 154, 236, 118, 268],
  [true,  108, 246,  72, 282],
  [false, 100, 178,  62, 210],
];

function CandleChart({ side }: { side: "left" | "right" }) {
  const W = 520, H = 900, candleW = 26, spacing = 44;
  const isRight = side === "right";
  return (
    <div style={{ position: "fixed", top: "50%", transform: isRight ? "translateY(-50%) scaleX(-1)" : "translateY(-50%)", left: isRight ? undefined : 0, right: isRight ? 0 : undefined, width: W, height: H, pointerEvents: "none", zIndex: 0 }}>
      <svg width={W} height={H}>
        <defs>
          <linearGradient id={`cg-${side}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`cm-${side}`}>
            <rect width={W} height={H} fill={`url(#cg-${side})`} />
          </mask>
        </defs>
        <g mask={`url(#cm-${side})`}>
          {CANDLES.map(([bull, bodyY1, bodyY2, wickY1, wickY2], i) => {
            const cx = i * spacing + (spacing - candleW) / 2 + 4;
            const color = bull ? "#2D7DD2" : "#FFFFFF";
            return (
              <g key={i}>
                <line x1={cx + candleW / 2} y1={wickY1} x2={cx + candleW / 2} y2={wickY2} stroke={color} strokeWidth={1.5} strokeOpacity={0.75} />
                <rect x={cx} y={bodyY1} width={candleW} height={bodyY2 - bodyY1} fill={color} fillOpacity={0.8} rx={2} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

const CHALLENGES = {
  "10k-2step":  { label: "$10,000", model: "2-Step", price: "€129", amount: 12900 },
  "25k-2step":  { label: "$25,000", model: "2-Step", price: "€219", amount: 21900 },
  "50k-2step":  { label: "$50,000", model: "2-Step", price: "€299", amount: 29900 },
  "100k-2step": { label: "$100,000",model: "2-Step", price: "€449", amount: 44900 },
  "200k-2step": { label: "$200,000",model: "2-Step", price: "€899", amount: 89900 },
  "10k-1step":  { label: "$10,000", model: "1-Step", price: "€69",  amount: 6900  },
  "25k-1step":  { label: "$25,000", model: "1-Step", price: "€149", amount: 14900 },
  "50k-1step":  { label: "$50,000", model: "1-Step", price: "€249", amount: 24900 },
  "100k-1step": { label: "$100,000",model: "1-Step", price: "€399", amount: 39900 },
  "200k-1step": { label: "$200,000",model: "1-Step", price: "€849", amount: 84900 },
};

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("product") || "50k-2step";
  const challenge = CHALLENGES[productId as keyof typeof CHALLENGES] || CHALLENGES["50k-2step"];

  const [loadingStripe, setLoadingStripe] = useState(false);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingFree, setLoadingFree] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; token: string } | null>(null);

  // Personal info
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dialCode, setDialCode] = useState("+33");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const DIAL_CODES = [
    { code: "+33", flag: "🇫🇷" }, { code: "+32", flag: "🇧🇪" }, { code: "+41", flag: "🇨🇭" },
    { code: "+352", flag: "🇱🇺" }, { code: "+1", flag: "🇺🇸" }, { code: "+44", flag: "🇬🇧" },
    { code: "+49", flag: "🇩🇪" }, { code: "+34", flag: "🇪🇸" }, { code: "+39", flag: "🇮🇹" },
    { code: "+31", flag: "🇳🇱" }, { code: "+351", flag: "🇵🇹" }, { code: "+48", flag: "🇵🇱" },
    { code: "+46", flag: "🇸🇪" }, { code: "+45", flag: "🇩🇰" }, { code: "+47", flag: "🇳🇴" },
    { code: "+212", flag: "🇲🇦" }, { code: "+213", flag: "🇩🇿" }, { code: "+216", flag: "🇹🇳" },
    { code: "+221", flag: "🇸🇳" }, { code: "+225", flag: "🇨🇮" }, { code: "+237", flag: "🇨🇲" },
    { code: "+971", flag: "🇦🇪" }, { code: "+966", flag: "🇸🇦" }, { code: "+55", flag: "🇧🇷" },
    { code: "+52", flag: "🇲🇽" }, { code: "+61", flag: "🇦🇺" }, { code: "+91", flag: "🇮🇳" },
    { code: "+7", flag: "🇷🇺" }, { code: "+90", flag: "🇹🇷" }, { code: "+27", flag: "🇿🇦" },
  ];

  // Promo
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "loading" | "valid" | "error">("idle");
  const [promoError, setPromoError] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const discountedAmount = discount > 0 ? Math.round(challenge.amount * (100 - discount) / 100) : challenge.amount;
  const isFree = discount === 100;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email!, token: session.access_token });
        setEmail(session.user.email!);
      }
    });
  }, []);

  const saveProfile = async (token: string) => {
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ first_name: firstName, last_name: lastName, phone: fullPhone, email, address, city, postal_code: postalCode, country }),
    });
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoStatus("loading");
    setPromoError("");
    const res = await fetch("/api/promo/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput }),
    });
    const data = await res.json();
    if (res.ok && data.discount) {
      setDiscount(data.discount);
      setAppliedCode(data.code);
      setPromoStatus("valid");
    } else {
      setPromoStatus("error");
      setPromoError(data.error || "Invalid code");
    }
  };

  const removePromo = () => {
    setPromoInput("");
    setAppliedCode("");
    setDiscount(0);
    setPromoStatus("idle");
    setPromoError("");
  };

  const fullPhone = phone ? `${dialCode} ${phone}` : "";
  const profileComplete = firstName.trim() && lastName.trim() && phone.trim() && email.trim() && address.trim() && city.trim() && country.trim() && (user || (password.length >= 8 && password === confirmPassword));

  const [payError, setPayError] = useState("");

  const createAccountAndGetUser = async () => {
    const supabase = createClient();
    if (password !== confirmPassword) { setPasswordError("Les mots de passe ne correspondent pas"); return null; }
    if (password.length < 8) { setPasswordError("Minimum 8 caractères"); return null; }
    setPasswordError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setPayError(error.message); return null; }
    if (!data.session) { setPayError("Vérifie ton email pour confirmer ton compte avant de payer."); return null; }
    return { id: data.user!.id, email: data.user!.email!, token: data.session.access_token };
  };

  const handleStripe = async () => {
    setPayError("");
    let currentUser = user;
    if (!currentUser) { currentUser = await createAccountAndGetUser(); if (!currentUser) return; setUser(currentUser); }
    if (!profileComplete) return;
    setLoadingStripe(true);
    await saveProfile(currentUser.token);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: currentUser.id, userEmail: currentUser.email, promoCode: appliedCode, discount }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setPayError(data.error || "Payment error. Please try again."); setLoadingStripe(false); }
  };

  const handleCrypto = async () => {
    setPayError("");
    let currentUser = user;
    if (!currentUser) { currentUser = await createAccountAndGetUser(); if (!currentUser) return; setUser(currentUser); }
    if (!profileComplete) return;
    setLoadingCrypto(true);
    await saveProfile(currentUser.token);
    const res = await fetch("/api/crypto/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: currentUser.id, promoCode: appliedCode, discount }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setPayError(data.error || "Payment error. Please try again."); setLoadingCrypto(false); }
  };

  const handleFree = async () => {
    if (!user) { router.push("/login"); return; }
    if (!profileComplete) return;
    setLoadingFree(true);
    await saveProfile(user.token);
    const res = await fetch("/api/promo/free", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: user.id, promoCode: appliedCode }),
    });
    const data = await res.json();
    if (data.ok) router.push("/dashboard");
    else {
      setPromoStatus("error");
      setPromoError(data.error || "Error");
      setLoadingFree(false);
    }
  };

  const anyLoading = loadingStripe || loadingCrypto || loadingFree;

  const cardStyle = { borderRadius: 20, marginBottom: 16, overflow: "hidden" as const };
  const inputStyle = { width: "100%", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const };
  const labelStyle = { color: "#bbb", fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", marginBottom: 6, display: "block" as const };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0a0a0f 0%, #0d0a14 50%, #080c0a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", overflow: "hidden", position: "relative" }}>
      <CandleChart side="left" />
      <CandleChart side="right" />
      <div style={{ position: "fixed", top: "20%", left: "30%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "60%", left: "60%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(45,125,210,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Image src="/logo-white.jpg" alt="Elysium Funded" width={80} height={80} style={{ objectFit: "contain", mixBlendMode: "screen" }} />
        </div>

        {/* Order Summary */}
        <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)", border: "1px solid rgba(201,168,76,0.4)", padding: "28px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 4, height: 18, backgroundColor: "#C9A84C", borderRadius: 2 }} />
            <span style={{ color: "#C9A84C", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Order Summary</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>Challenge {challenge.label}</div>
              <div style={{ color: "#888", fontSize: 13, marginTop: 4 }}>{challenge.model} Model · Elysium Funded</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {discount > 0 && <div style={{ fontSize: 13, color: "#666", textDecoration: "line-through", marginBottom: 2 }}>{challenge.price}</div>}
              <div style={{ fontSize: 26, fontWeight: 900, color: isFree ? "#22c55e" : "#C9A84C" }}>
                {isFree ? "FREE" : discount > 0 ? formatPrice(discountedAmount) : challenge.price}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
            <span style={{ color: "#aaa", fontWeight: 600, fontSize: 15 }}>Total</span>
            <span style={{ fontSize: 30, fontWeight: 900, color: isFree ? "#22c55e" : "#fff" }}>
              {isFree ? "FREE" : discount > 0 ? formatPrice(discountedAmount) : challenge.price}
            </span>
          </div>
        </div>

        {/* Personal Info */}
        <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(45,125,210,0.1) 0%, rgba(45,125,210,0.03) 100%)", border: "1px solid rgba(45,125,210,0.3)", padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <div style={{ width: 4, height: 18, backgroundColor: "#2D7DD2", borderRadius: 2 }} />
            <span style={{ color: "#2D7DD2", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Vos informations</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>PRÉNOM *</label><input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" style={inputStyle} /></div>
            <div><label style={labelStyle}>NOM *</label><input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" style={inputStyle} /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>EMAIL *</label>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@email.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>TÉLÉPHONE *</label>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={dialCode} onChange={e => setDialCode(e.target.value)}
                style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "11px 8px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer", flexShrink: 0, width: 90 }}>
                {DIAL_CODES.map(c => (<option key={c.code} value={c.code}>{c.flag} {c.code}</option>))}
              </select>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 00 00 00 00" style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>ADRESSE *</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Rue de la Paix" style={inputStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div><label style={labelStyle}>VILLE *</label><input value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" style={inputStyle} /></div>
            <div><label style={labelStyle}>CODE POSTAL</label><input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" style={inputStyle} /></div>
            <div><label style={labelStyle}>PAYS *</label><input value={country} onChange={e => setCountry(e.target.value)} placeholder="France" style={inputStyle} /></div>
          </div>
          {!user && (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 12, marginTop: 4 }}>
              <div style={{ color: "#2D7DD2", fontSize: 11, fontWeight: 700, letterSpacing: "1px", marginBottom: 10 }}>CRÉER VOTRE COMPTE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>MOT DE PASSE *</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 8 caractères" style={inputStyle} /></div>
                <div><label style={labelStyle}>CONFIRMER *</label>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répéter"
                    style={{ ...inputStyle, border: `1px solid ${confirmPassword && confirmPassword === password ? "rgba(34,197,94,0.5)" : confirmPassword ? "rgba(239,68,68,0.5)" : "rgba(255,255,255,0.1)"}` }} />
                </div>
                {passwordError && <div style={{ gridColumn: "1/-1", color: "#ef4444", fontSize: 12 }}>{passwordError}</div>}
              </div>
            </div>
          )}
        </div>

        {/* Promo Code */}
        <div style={{ ...cardStyle, background: promoStatus === "valid" ? "linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(34,197,94,0.04) 100%)" : "rgba(255,255,255,0.03)", border: `1px solid ${promoStatus === "valid" ? "rgba(34,197,94,0.4)" : "rgba(255,255,255,0.08)"}`, padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ width: 4, height: 18, backgroundColor: promoStatus === "valid" ? "#22c55e" : "#888", borderRadius: 2 }} />
            <span style={{ color: promoStatus === "valid" ? "#22c55e" : "#aaa", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>Code Promo</span>
          </div>

          {promoStatus !== "valid" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus("idle"); setPromoError(""); }}
                onKeyDown={e => e.key === "Enter" && applyPromo()} placeholder="ENTRER LE CODE"
                style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", fontWeight: 700, letterSpacing: "2px", fontFamily: "monospace" }} />
              <button onClick={applyPromo} disabled={!promoInput.trim() || promoStatus === "loading"}
                style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.1))", border: "1px solid rgba(201,168,76,0.4)", borderRadius: 10, padding: "12px 20px", color: "#C9A84C", fontSize: 14, fontWeight: 700, cursor: promoInput.trim() ? "pointer" : "not-allowed", opacity: promoInput.trim() ? 1 : 0.5, whiteSpace: "nowrap" }}>
                {promoStatus === "loading" ? "..." : "Appliquer"}
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", backgroundColor: "#22c55e11", border: "1px solid #22c55e33", borderRadius: 10, padding: "12px 16px" }}>
              <div>
                <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 14, letterSpacing: "2px", fontFamily: "monospace" }}>{appliedCode}</span>
                <span style={{ color: "#22c55e", fontSize: 13, marginLeft: 12 }}>−{discount}% {isFree ? "· FREE ACCESS" : ""}</span>
              </div>
              <button onClick={removePromo} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", padding: 4 }}><X size={16} /></button>
            </div>
          )}
          {promoStatus === "error" && <div style={{ marginTop: 8, color: "#ef4444", fontSize: 13 }}>{promoError}</div>}
        </div>

        {/* Payment buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isFree ? (
            <button onClick={handleFree} disabled={anyLoading || !profileComplete} className="btn-primary"
              style={{ width: "100%", padding: "16px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: (anyLoading || !profileComplete) ? 0.7 : 1, cursor: (anyLoading || !profileComplete) ? "not-allowed" : "pointer", backgroundColor: "#22c55e", borderColor: "#22c55e" }}>
              {loadingFree ? "Setting up your account..." : <><span>🎉</span> Claim Free Access <ChevronRight size={16} /></>}
            </button>
          ) : (
            <>
              <button onClick={handleStripe} disabled={anyLoading || !profileComplete} className="btn-primary"
                style={{ width: "100%", padding: "16px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: (anyLoading || !profileComplete) ? 0.7 : 1, cursor: (anyLoading || !profileComplete) ? "not-allowed" : "pointer" }}>
                {loadingStripe ? "Redirecting..." : <><span>💳</span> Pay with Card <ChevronRight size={16} /></>}
              </button>
              <button onClick={handleCrypto} disabled={anyLoading || !profileComplete} className="btn-secondary"
                style={{ width: "100%", padding: "16px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: (anyLoading || !profileComplete) ? 0.7 : 1, cursor: (anyLoading || !profileComplete) ? "not-allowed" : "pointer" }}>
                {loadingCrypto ? "Redirecting..." : <><span>₿</span> Pay with Crypto <ChevronRight size={16} /></>}
              </button>
            </>
          )}
        </div>

        {!profileComplete && (
          <p style={{ textAlign: "center", color: "#555", fontSize: 12, marginTop: 12 }}>
            Please fill in all fields to continue.
          </p>
        )}


        {payError && (
          <p style={{ textAlign: "center", color: "#ef4444", fontSize: 13, marginTop: 12, padding: "10px", backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 8 }}>
            {payError}
          </p>
        )}

        <p style={{ textAlign: "center", color: "#333", fontSize: 12, marginTop: 16 }}>
          Secured by Stripe & Crypto · SSL encrypted · No subscription
        </p>

        <a href="/#pricing" style={{ display: "block", textAlign: "center", color: "#333", fontSize: 13, marginTop: 16, textDecoration: "none" }}
          onMouseOver={e => (e.currentTarget.style.color = "#C9A84C")}
          onMouseOut={e => (e.currentTarget.style.color = "#333")}>
          ← Change challenge
        </a>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense><CheckoutContent /></Suspense>;
}
