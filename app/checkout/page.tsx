"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Shield, Clock, RefreshCw, ChevronRight, Tag, X, User } from "lucide-react";

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
  const profileComplete = firstName.trim() && lastName.trim() && phone.trim() && email.trim() && address.trim() && city.trim() && country.trim();

  const [payError, setPayError] = useState("");

  const handleStripe = async () => {
    setPayError("");
    if (!user) { router.push(`/login?redirect=/checkout?product=${productId}`); return; }
    if (!profileComplete) return;
    setLoadingStripe(true);
    await saveProfile(user.token);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: user.id, userEmail: user.email, promoCode: appliedCode, discount }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setPayError(data.error || "Payment error. Please try again."); setLoadingStripe(false); }
  };

  const handleCrypto = async () => {
    setPayError("");
    if (!user) { router.push(`/login?redirect=/checkout?product=${productId}`); return; }
    if (!profileComplete) return;
    setLoadingCrypto(true);
    await saveProfile(user.token);
    const res = await fetch("/api/crypto/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: user.id, promoCode: appliedCode, discount }),
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

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 520, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Image src="/logo.jpg" alt="Elysium Funded" width={80} height={80} style={{ objectFit: "contain", mixBlendMode: "screen" }} />
        </div>

        {/* Order Summary */}
        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "32px", marginBottom: 16 }}>
          <div style={{ color: "#555", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 20 }}>Order Summary</div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "1px solid #1a1a1a" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Challenge {challenge.label}</div>
              <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>{challenge.model} Model · Elysium</div>
            </div>
            <div style={{ textAlign: "right" }}>
              {discount > 0 && <div style={{ fontSize: 13, color: "#555", textDecoration: "line-through", marginBottom: 2 }}>{challenge.price}</div>}
              <div style={{ fontSize: 24, fontWeight: 900, color: isFree ? "#22c55e" : "#C9A84C" }}>
                {isFree ? "FREE" : discount > 0 ? formatPrice(discountedAmount) : challenge.price}
              </div>
            </div>
          </div>

          <div style={{ padding: "16px 0", borderBottom: "1px solid #1a1a1a" }}>
            {[
              { icon: <RefreshCw size={14} />, text: "Fee refunded at first reward" },
              { icon: <Clock size={14} />, text: "No time limit — trade at your pace" },
              { icon: <Shield size={14} />, text: "Simulated account — no personal risk" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, color: "#666", fontSize: 13 }}>
                <span style={{ color: "#C9A84C" }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16 }}>
            <span style={{ color: "#888", fontWeight: 600 }}>Total</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: isFree ? "#22c55e" : "#fff" }}>
              {isFree ? "FREE" : discount > 0 ? formatPrice(discountedAmount) : challenge.price}
            </span>
          </div>
        </div>

        {/* Personal Info */}
        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ color: "#555", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <User size={12} /> Your Information
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 10 }}>
            <div>
              <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>FIRST NAME *</div>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean"
                style={{ width: "100%", backgroundColor: "#1a1a1a", border: `1px solid ${firstName ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>LAST NAME *</div>
              <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont"
                style={{ width: "100%", backgroundColor: "#1a1a1a", border: `1px solid ${lastName ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>EMAIL *</div>
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@email.com"
              style={{ width: "100%", backgroundColor: "#1a1a1a", border: `1px solid ${email ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>PHONE *</div>
            <div style={{ display: "flex", gap: 8 }}>
              <select value={dialCode} onChange={e => setDialCode(e.target.value)}
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #222", borderRadius: 8, padding: "10px 8px", color: "#fff", fontSize: 13, outline: "none", cursor: "pointer", flexShrink: 0, width: 90 }}>
                {DIAL_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                ))}
              </select>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 00 00 00 00"
                style={{ flex: 1, backgroundColor: "#1a1a1a", border: `1px solid ${phone ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>ADDRESS *</div>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Rue de la Paix"
              style={{ width: "100%", backgroundColor: "#1a1a1a", border: `1px solid ${address ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
            <div>
              <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>CITY *</div>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Paris"
                style={{ width: "100%", backgroundColor: "#1a1a1a", border: `1px solid ${city ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>POSTAL CODE</div>
              <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001"
                style={{ width: "100%", backgroundColor: "#1a1a1a", border: `1px solid ${postalCode ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
            <div>
              <div style={{ color: "#555", fontSize: 11, marginBottom: 5 }}>COUNTRY *</div>
              <input value={country} onChange={e => setCountry(e.target.value)} placeholder="France"
                style={{ width: "100%", backgroundColor: "#1a1a1a", border: `1px solid ${country ? "#333" : "#222"}`, borderRadius: 8, padding: "10px 12px", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" as const }} />
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div style={{ backgroundColor: "#0f0f0f", border: `1px solid ${promoStatus === "valid" ? "#22c55e33" : "#1e1e1e"}`, borderRadius: 20, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ color: "#555", fontSize: 12, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Tag size={12} /> Promo Code
          </div>

          {promoStatus !== "valid" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus("idle"); setPromoError(""); }}
                onKeyDown={e => e.key === "Enter" && applyPromo()} placeholder="ENTER CODE"
                style={{ flex: 1, backgroundColor: "#1a1a1a", border: "1px solid #222", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 14, outline: "none", fontWeight: 700, letterSpacing: "2px", fontFamily: "monospace" }} />
              <button onClick={applyPromo} disabled={!promoInput.trim() || promoStatus === "loading"}
                style={{ backgroundColor: "#1a1a1a", border: "1px solid #333", borderRadius: 10, padding: "12px 20px", color: "#C9A84C", fontSize: 14, fontWeight: 700, cursor: promoInput.trim() ? "pointer" : "not-allowed", opacity: promoInput.trim() ? 1 : 0.5, whiteSpace: "nowrap" }}>
                {promoStatus === "loading" ? "..." : "Apply"}
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

        {!user && profileComplete && (
          <div style={{ textAlign: "center", marginTop: 12, padding: "12px 16px", backgroundColor: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10 }}>
            <span style={{ color: "#C9A84C", fontSize: 13 }}>You need to </span>
            <a href={`/login?redirect=/checkout?product=${productId}`} style={{ color: "#C9A84C", fontWeight: 700, fontSize: 13 }}>log in</a>
            <span style={{ color: "#C9A84C", fontSize: 13 }}> to complete your purchase.</span>
          </div>
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
