"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { ChevronRight, X, MessageCircle, ShieldCheck } from "lucide-react";

const CHALLENGES: Record<string, { label: string; model: "2-Step" | "1-Step"; price: string; amount: number }> = {
  "10k-2step":  { label: "$10,000",  model: "2-Step", price: "€129", amount: 12900 },
  "25k-2step":  { label: "$25,000",  model: "2-Step", price: "€219", amount: 21900 },
  "50k-2step":  { label: "$50,000",  model: "2-Step", price: "€299", amount: 29900 },
  "100k-2step": { label: "$100,000", model: "2-Step", price: "€449", amount: 44900 },
  "10k-1step":  { label: "$10,000",  model: "1-Step", price: "€69",  amount: 6900  },
  "25k-1step":  { label: "$25,000",  model: "1-Step", price: "€149", amount: 14900 },
  "50k-1step":  { label: "$50,000",  model: "1-Step", price: "€249", amount: 24900 },
  "100k-1step": { label: "$100,000", model: "1-Step", price: "€399", amount: 39900 },
};

const RULES_2STEP = [
  { label: "Objectif Phase 1", value: "10%" },
  { label: "Objectif Phase 2", value: "5%" },
  { label: "Perte journalière max", value: "5%" },
  { label: "Perte totale max", value: "10%" },
  { label: "Jours de trading min", value: "4 jours" },
  { label: "Limite de temps", value: "Illimitée" },
  { label: "Remboursement frais", value: "✓ 1ère récompense" },
  { label: "Partage des profits", value: "Jusqu'à 80%" },
];

const RULES_1STEP = [
  { label: "Objectif de profit", value: "10%" },
  { label: "Perte journalière max", value: "3%" },
  { label: "Perte totale (trailing)", value: "10%" },
  { label: "Règle meilleur jour", value: "≤ 50%" },
  { label: "Jours de trading min", value: "4 jours" },
  { label: "Limite de temps", value: "Illimitée" },
  { label: "Partage des profits", value: "Jusqu'à 90%" },
  { label: "Cumul comptes max", value: "$200K" },
];

const DIAL_CODES = [
  { code: "+33", flag: "🇫🇷" }, { code: "+32", flag: "🇧🇪" }, { code: "+41", flag: "🇨🇭" },
  { code: "+352", flag: "🇱🇺" }, { code: "+1", flag: "🇺🇸" }, { code: "+44", flag: "🇬🇧" },
  { code: "+49", flag: "🇩🇪" }, { code: "+34", flag: "🇪🇸" }, { code: "+39", flag: "🇮🇹" },
  { code: "+31", flag: "🇳🇱" }, { code: "+351", flag: "🇵🇹" }, { code: "+48", flag: "🇵🇱" },
  { code: "+212", flag: "🇲🇦" }, { code: "+213", flag: "🇩🇿" }, { code: "+216", flag: "🇹🇳" },
  { code: "+221", flag: "🇸🇳" }, { code: "+225", flag: "🇨🇮" }, { code: "+971", flag: "🇦🇪" },
  { code: "+55", flag: "🇧🇷" }, { code: "+91", flag: "🇮🇳" }, { code: "+61", flag: "🇦🇺" },
];

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("product") || "50k-2step";
  const challenge = CHALLENGES[productId] || CHALLENGES["50k-2step"];
  const rules = challenge.model === "2-Step" ? RULES_2STEP : RULES_1STEP;

  const [loadingStripe, setLoadingStripe] = useState(false);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingFree, setLoadingFree] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; token: string } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dialCode, setDialCode] = useState("+33");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [payError, setPayError] = useState("");

  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle" | "loading" | "valid" | "error">("idle");
  const [promoError, setPromoError] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const discountedAmount = discount > 0 ? Math.round(challenge.amount * (100 - discount) / 100) : challenge.amount;
  const isFree = discount === 100;
  const fullPhone = phone ? `${dialCode} ${phone}` : "";
  const profileComplete = firstName.trim() && lastName.trim() && phone.trim() && email.trim() && address.trim() && city.trim() && country.trim() && (user || (password.length >= 8 && password === confirmPassword));
  const anyLoading = loadingStripe || loadingCrypto || loadingFree;
  const canPay = profileComplete && agreedToTerms;

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
          if (p.address) setAddress(p.address);
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
      body: JSON.stringify({ first_name: firstName, last_name: lastName, phone: fullPhone, email, address, city, postal_code: postalCode, country, birth_date: birthDate }),
    });
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoStatus("loading");
    setPromoError("");
    const res = await fetch("/api/promo/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoInput }) });
    const data = await res.json();
    if (res.ok && data.discount) { setDiscount(data.discount); setAppliedCode(data.code); setPromoStatus("valid"); }
    else { setPromoStatus("error"); setPromoError(data.error || "Code invalide"); }
  };

  const removePromo = () => { setPromoInput(""); setAppliedCode(""); setDiscount(0); setPromoStatus("idle"); setPromoError(""); };

  const createAccountAndGetUser = async () => {
    const supabase = createClient();
    if (password !== confirmPassword) { setPasswordError("Les mots de passe ne correspondent pas"); return null; }
    if (password.length < 8) { setPasswordError("Minimum 8 caractères"); return null; }
    setPasswordError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.session) return { id: data.user!.id, email: data.user!.email!, token: data.session.access_token };
    if (error?.message?.includes("already") || !data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) { setPayError("Email déjà utilisé. Connecte-toi d'abord."); return null; }
      if (signInData.session) return { id: signInData.user.id, email: signInData.user.email!, token: signInData.session.access_token };
    }
    if (error) { setPayError(error.message); return null; }
    return null;
  };

  const handleStripe = async () => {
    setPayError("");
    let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    if (!profileComplete) return;
    setLoadingStripe(true);
    await saveProfile(u.token);
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, userId: u.id, userEmail: u.email, promoCode: appliedCode, discount }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setPayError(data.error || "Erreur paiement."); setLoadingStripe(false); }
  };

  const handleCrypto = async () => {
    setPayError("");
    let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    if (!profileComplete) return;
    setLoadingCrypto(true);
    await saveProfile(u.token);
    const res = await fetch("/api/crypto/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, userId: u.id, promoCode: appliedCode, discount }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else { setPayError(data.error || "Erreur paiement."); setLoadingCrypto(false); }
  };

  const handleFree = async () => {
    if (!user) { router.push("/login"); return; }
    if (!profileComplete) return;
    setLoadingFree(true);
    await saveProfile(user.token);
    const res = await fetch("/api/promo/free", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId, userId: user.id, promoCode: appliedCode }) });
    const data = await res.json();
    if (data.ok) router.push("/dashboard");
    else { setPromoStatus("error"); setPromoError(data.error || "Erreur"); setLoadingFree(false); }
  };

  const inp: React.CSSProperties = {
    width: "100%", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8,
    padding: "8px 12px", color: "#111", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = { color: "#6b7280", fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", marginBottom: 4, display: "block", textTransform: "uppercase" };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 12, border: "1px solid #e5e7eb", padding: "16px 20px" };

  return (
    <div style={{ height: "100vh", background: "#f3f4f6", display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "system-ui, -apple-system, sans-serif", color: "#111" }}>

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 28px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <Image src="/logo-black.jpg" alt="Elysium" width={28} height={28} style={{ objectFit: "contain", borderRadius: 4 }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: "#111" }}>Elysium</span>
        <span style={{ color: "#d1d5db", margin: "0 6px" }}>/</span>
        <span style={{ color: "#6b7280", fontSize: 13 }}>Commencer le challenge</span>
        <a href="/#pricing" style={{ marginLeft: "auto", color: "#6b7280", fontSize: 12, textDecoration: "none" }}>← Changer de compte</a>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* LEFT COLUMN */}
        <div style={{ flex: "0 0 58%", overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Challenge + Rules */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: "#111" }}>Challenge {challenge.label}</div>
                <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>{challenge.model} — Elysium · MetaTrader 5</div>
              </div>
              <span style={{ background: "#eff6ff", color: "#2563eb", fontSize: 11, fontWeight: 800, padding: "4px 10px", borderRadius: 6, border: "1px solid #bfdbfe" }}>
                {challenge.model}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              {rules.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <span style={{ color: "#6b7280", fontSize: 12 }}>{r.label}</span>
                  <span style={{ color: r.value.startsWith("✓") ? "#16a34a" : "#111", fontSize: 12, fontWeight: 700 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Personal Info */}
          <div style={card}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Informations de facturation</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
              <div>
                <label style={lbl}>Prénom *</label>
                <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" style={inp} />
              </div>
              <div>
                <label style={lbl}>Nom *</label>
                <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Email *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@email.com" style={inp} />
              </div>
              <div>
                <label style={lbl}>Téléphone *</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <select value={dialCode} onChange={e => setDialCode(e.target.value)}
                    style={{ ...inp, width: 80, flexShrink: 0, cursor: "pointer", padding: "8px 6px" }}>
                    {DIAL_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 00 00 00 00" style={{ ...inp, flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={lbl}>Date de naissance *</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  style={{ ...inp, colorScheme: "light" }} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Adresse *</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder="12 Rue de la Paix" style={inp} />
              </div>
              <div>
                <label style={lbl}>Ville *</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lbl}>Code postal</label>
                  <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Pays *</label>
                  <input value={country} onChange={e => setCountry(e.target.value)} placeholder="France" style={inp} />
                </div>
              </div>
            </div>

            {!user && (
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10, marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", letterSpacing: "0.5px", textTransform: "uppercase", marginBottom: 8 }}>Créer votre compte</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px" }}>
                  <div>
                    <label style={lbl}>Mot de passe *</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 caractères" style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Confirmer *</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répéter"
                      style={{ ...inp, borderColor: confirmPassword ? (confirmPassword === password ? "#86efac" : "#fca5a5") : "#e5e7eb" }} />
                  </div>
                  {passwordError && <div style={{ gridColumn: "1/-1", color: "#ef4444", fontSize: 12 }}>{passwordError}</div>}
                </div>
              </div>
            )}
            {user && (
              <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 10, marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a" }} />
                <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>Connecté en tant que {user.email}</span>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div style={{ flex: "0 0 42%", borderLeft: "1px solid #e5e7eb", background: "#fff", overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Résumé */}
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: "#111", marginBottom: 14 }}>Résumé de la commande</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ width: 40, height: 40, background: "#f3f4f6", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏆</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Elysium Challenge</div>
                <div style={{ color: "#6b7280", fontSize: 12 }}>{challenge.label} — {challenge.model}</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
              {[
                { label: "Challenge", value: challenge.model },
                { label: "Plateforme", value: "MetaTrader 5" },
                { label: "Capital simulé", value: challenge.label },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>{row.label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{row.value}</span>
                </div>
              ))}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#6b7280", fontSize: 13 }}>Prix</span>
                  <span style={{ color: "#9ca3af", fontSize: 13, textDecoration: "line-through" }}>{challenge.price}</span>
                </div>
              )}
              {discount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 700 }}>Réduction −{discount}%</span>
                  <span style={{ color: "#16a34a", fontSize: 13, fontWeight: 700 }}>−{formatPrice(challenge.amount - discountedAmount)}</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: isFree ? "#16a34a" : "#111" }}>
                  {isFree ? "GRATUIT" : discount > 0 ? formatPrice(discountedAmount) : challenge.price}
                </div>
                <div style={{ color: "#9ca3af", fontSize: 11 }}>TVA incluse</div>
              </div>
            </div>
          </div>

          {/* Promo */}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Code promo</div>
            {promoStatus !== "valid" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus("idle"); setPromoError(""); }}
                  onKeyDown={e => e.key === "Enter" && applyPromo()} placeholder="ENTRER LE CODE"
                  style={{ ...inp, flex: 1, fontWeight: 700, letterSpacing: "1.5px", fontFamily: "monospace" }} />
                <button onClick={applyPromo} disabled={!promoInput.trim() || promoStatus === "loading"}
                  style={{ background: "#111", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: promoInput.trim() ? "pointer" : "not-allowed", opacity: promoInput.trim() ? 1 : 0.4, whiteSpace: "nowrap" }}>
                  {promoStatus === "loading" ? "..." : "Appliquer"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "8px 12px" }}>
                <div>
                  <span style={{ color: "#16a34a", fontWeight: 800, fontSize: 13, letterSpacing: "1px", fontFamily: "monospace" }}>{appliedCode}</span>
                  <span style={{ color: "#16a34a", fontSize: 12, marginLeft: 10 }}>−{discount}%{isFree ? " · GRATUIT" : ""}</span>
                </div>
                <button onClick={removePromo} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", padding: 2 }}><X size={14} /></button>
              </div>
            )}
            {promoStatus === "error" && <div style={{ marginTop: 6, color: "#ef4444", fontSize: 12 }}>{promoError}</div>}
          </div>

          {/* CGV Box */}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Conditions Générales
            </div>
            <div style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 12px", maxHeight: 110, overflowY: "auto", marginBottom: 10 }}>
              <p style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: "#374151" }}>Résumé des points clés :</strong><br />
                • Le trading sur notre plateforme est <strong style={{ color: "#374151" }}>100% simulé</strong> — aucun capital réel, aucun ordre exécuté sur les marchés.<br />
                • Les Frais de Challenge sont <strong style={{ color: "#374151" }}>non remboursables</strong> dès l&apos;ouverture du premier trade (droit de rétractation de 14 jours avant tout trade).<br />
                • La récompense est de <strong style={{ color: "#374151" }}>80% (2 Étapes)</strong> ou <strong style={{ color: "#374151" }}>90% (1 Étape)</strong> des profits simulés.<br />
                • Le capital simulé total est limité à <strong style={{ color: "#374151" }}>100 000 USD</strong> par client.<br />
                • En cas de violation des règles, nous pouvons résilier votre compte sans indemnité.<br />
                • Droit applicable : <strong style={{ color: "#374151" }}>loi estonienne</strong>.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#2563eb", width: 14, height: 14, flexShrink: 0, cursor: "pointer" }}
              />
              <span style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}>
                J&apos;ai lu et j&apos;accepte les{" "}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer"
                  style={{ color: "#2563eb", textDecoration: "underline", fontWeight: 700 }}>
                  Conditions Générales de Vente et d&apos;Utilisation
                </a>
              </span>
            </label>
          </div>

          {/* Pay buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
            {payError && (
              <div style={{ color: "#ef4444", fontSize: 12, padding: "10px 14px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8 }}>
                {payError}
              </div>
            )}
            {!profileComplete && (
              <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, margin: 0 }}>Remplissez tous les champs pour continuer.</p>
            )}
            {profileComplete && !agreedToTerms && (
              <p style={{ textAlign: "center", color: "#f59e0b", fontSize: 12, margin: 0 }}>Acceptez les CGV pour continuer.</p>
            )}

            {isFree ? (
              <button onClick={handleFree} disabled={anyLoading || !canPay}
                style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 800, background: "#16a34a", color: "#fff", border: "none", borderRadius: 10, cursor: canPay ? "pointer" : "not-allowed", opacity: (anyLoading || !canPay) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {loadingFree ? "Configuration..." : <><span>🎉</span> Accès gratuit <ChevronRight size={16} /></>}
              </button>
            ) : (
              <>
                <button onClick={handleStripe} disabled={anyLoading || !canPay}
                  style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 800, background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, cursor: canPay ? "pointer" : "not-allowed", opacity: (anyLoading || !canPay) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loadingStripe ? "Redirection..." : <><span>💳</span> Payer par carte <ChevronRight size={16} /></>}
                </button>
                <button onClick={handleCrypto} disabled={anyLoading || !canPay}
                  style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 800, background: "#fff", color: "#111", border: "1.5px solid #e5e7eb", borderRadius: 10, cursor: canPay ? "pointer" : "not-allowed", opacity: (anyLoading || !canPay) ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {loadingCrypto ? "Redirection..." : <><span>₿</span> Payer en crypto <ChevronRight size={16} /></>}
                </button>
              </>
            )}
          </div>

          {/* Trust */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <ShieldCheck size={14} color="#9ca3af" />
            <span style={{ color: "#9ca3af", fontSize: 11 }}>Sécurisé par Stripe · SSL · Aucun abonnement</span>
          </div>

          {/* Support + Chat */}
          <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 12, color: "#374151", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Besoin d&apos;aide ?</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => { if (typeof window !== "undefined" && (window as any).Tawk_API) (window as any).Tawk_API.toggle(); }}
                style={{ width: "100%", padding: "11px 16px", background: "#eff6ff", border: "1.5px solid #bfdbfe", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, color: "#1e3a8a", fontWeight: 700, fontSize: 13 }}>
                <MessageCircle size={16} color="#2563eb" />
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e3a8a" }}>Chat en direct</div>
                  <div style={{ fontWeight: 400, fontSize: 11, color: "#3b82f6" }}>Réponse immédiate — disponible maintenant</div>
                </div>
                <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return <Suspense><CheckoutContent /></Suspense>;
}
