"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronRight, ShieldCheck, X } from "lucide-react";

const VIP_PRODUCTS: Record<string, { label: string; price: string; amount: number }> = {
  "25k-vip":  { label: "$25,000",  price: "1 250€", amount: 125000 },
  "50k-vip":  { label: "$50,000",  price: "2 500€", amount: 250000 },
  "100k-vip": { label: "$100,000", price: "5 000€", amount: 500000 },
};

const VIP_RULES = [
  { label: "Phase 1 — Objectif",    value: "+10%" },
  { label: "Phase 2 — Objectif",    value: "+5%" },
  { label: "Perte journalière max", value: "5%" },
  { label: "Perte totale max",      value: "10%" },
  { label: "Limite de temps",       value: "Illimitée" },
  { label: "Validation",            value: "Automatique ✓" },
  { label: "Partage des profits",   value: "60%" },
  { label: "Récompenses",           value: "Tous les 30 jours" },
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

  const handleCrypto = async () => {
    setPayError("");
    let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoading(true);
    await saveProfile(u.token);
    const res = await fetch("/api/crypto/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: u.id, promoCode: "", discount: 0, refCode }),
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
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @property --vip-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes vipSpin { to { --vip-angle: 360deg; } }
        .vip-border-co {
          padding: 1.5px; border-radius: 12px; display: block;
          background: conic-gradient(from var(--vip-angle), #1d4ed8 0%, #3B82F6 25%, #ffffff 45%, #EF4444 65%, #1d4ed8 100%);
          animation: vipSpin 3s linear infinite;
        }
        .vip-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; padding: 16px; border-radius: 10px;
          font-size: 14px; font-weight: 800; letter-spacing: 0.5px;
          background: #000; color: #fff; border: none; cursor: pointer;
          transition: opacity 0.2s;
        }
        .vip-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .vip-input:focus { border-color: rgba(59,130,246,0.5) !important; }
        .vip-select option { background: #111; color: #fff; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: isMobile ? "12px 16px" : "12px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <a href="/vip" style={{ textDecoration: "none", color: "rgba(255,255,255,0.5)", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
          ← <span>Challenge VIP</span>
        </a>
        <span style={{ color: "rgba(255,255,255,0.2)" }}>/</span>
        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Accès {product.label}</span>
        <div style={{ marginLeft: "auto", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 100, padding: "4px 14px", fontSize: 11, fontWeight: 700, color: "#3B82F6", letterSpacing: "1px" }}>
          ⚡ VIP
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", maxWidth: 1100, margin: "0 auto", padding: isMobile ? "0" : "40px 24px", gap: isMobile ? 0 : 32 }}>

        {/* LEFT — Résumé + règles */}
        <div style={{ flex: "0 0 340px", padding: isMobile ? "24px 16px" : "0" }}>
          <div style={{ background: "#0a0a0a", border: "1.5px solid rgba(59,130,246,0.3)", borderRadius: 20, padding: "28px 24px", position: "sticky", top: 24 }}>
            <div style={{ fontSize: 10, color: "#3B82F6", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Challenge VIP</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "#fff", marginBottom: 2 }}>{product.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#3B82F6", marginBottom: 24 }}>{product.price}</div>

            <div style={{ display: "flex", flexDirection: "column", gap: 0, marginBottom: 20 }}>
              {VIP_RULES.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < VIP_RULES.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{r.label}</span>
                  <span style={{ color: r.value.includes("✓") ? "#22c55e" : "#fff", fontSize: 12, fontWeight: 700 }}>{r.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 10, padding: "12px 16px", fontSize: 11, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
              Accès unique — aucun abonnement. Paiement en crypto uniquement.
            </div>
          </div>
        </div>

        {/* RIGHT — Formulaire + paiement */}
        <div style={{ flex: 1, padding: isMobile ? "16px" : "0", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Infos personnelles */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Informations</div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 16px" }}>
              <div>
                <label style={lbl}>Prénom *</label>
                <input className="vip-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" style={inp} />
              </div>
              <div>
                <label style={lbl}>Nom *</label>
                <input className="vip-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Email *</label>
                <input className="vip-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@email.com" style={inp} />
              </div>
              <div>
                <label style={lbl}>Téléphone *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="vip-select" value={dialCode} onChange={e => setDialCode(e.target.value)}
                    style={{ ...inp, width: 90, flexShrink: 0, cursor: "pointer", padding: "10px 6px" }}>
                    {DIAL_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input className="vip-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 00 00 00 00" style={{ ...inp, flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={lbl}>Date de naissance *</label>
                <input type="date" className="vip-input" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  style={{ ...inp, colorScheme: "dark" }} />
                {birthDate && !isAdult && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>Vous devez avoir au moins 18 ans.</div>}
              </div>
              <div>
                <label style={lbl}>Ville *</label>
                <input className="vip-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lbl}>Code postal</label>
                  <input className="vip-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Pays *</label>
                  <input className="vip-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="France" style={inp} />
                </div>
              </div>
            </div>

            {!user && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#3B82F6", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Créer votre compte</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 16px" }}>
                  <div>
                    <label style={lbl}>Mot de passe *</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPassword ? "text" : "password"} className="vip-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 caractères" style={{ ...inp, paddingRight: 44 }} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                        {showPassword ? <EyeOff /> : <EyeOpen />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Confirmer *</label>
                    <div style={{ position: "relative" }}>
                      <input type={showConfirmPassword ? "text" : "password"} className="vip-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répéter"
                        style={{ ...inp, paddingRight: 44, borderColor: confirmPassword ? (confirmPassword === password ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)") : "rgba(255,255,255,0.12)" }} />
                      <button type="button" onClick={() => setShowConfirmPassword(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                        {showConfirmPassword ? <EyeOff /> : <EyeOpen />}
                      </button>
                    </div>
                  </div>
                  {passwordError && <div style={{ gridColumn: "1/-1", color: "#ef4444", fontSize: 12 }}>{passwordError}</div>}
                </div>
              </div>
            )}

            {user && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>Connecté en tant que {user.email}</span>
              </div>
            )}
          </div>

          {/* CGV */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Conditions Générales</div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 16px", maxHeight: 100, overflowY: "auto", marginBottom: 12 }}>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                • Le trading sur notre plateforme est <strong style={{ color: "rgba(255,255,255,0.7)" }}>100% simulé</strong> — aucun capital réel.<br />
                • Les frais d&apos;accès sont <strong style={{ color: "rgba(255,255,255,0.7)" }}>non remboursables</strong> dès l&apos;activation du compte.<br />
                • La récompense est de <strong style={{ color: "rgba(255,255,255,0.7)" }}>60%</strong> des profits simulés, versés tous les 30 jours.<br />
                • En cas de violation des règles, le compte peut être résilié sans indemnité.<br />
                • Droit applicable : <strong style={{ color: "rgba(255,255,255,0.7)" }}>loi estonienne</strong>.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#3B82F6", width: 14, height: 14, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, lineHeight: 1.5 }}>
                J&apos;ai lu et j&apos;accepte les{" "}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#3B82F6", textDecoration: "underline", fontWeight: 700 }}>
                  Conditions Générales
                </a>
              </span>
            </label>
          </div>

          {/* Paiement */}
          <div style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
            {payError && (
              <div style={{ color: "#ef4444", fontSize: 12, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8, marginBottom: 12 }}>
                {payError}
              </div>
            )}
            {!profileComplete && (
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, margin: "0 0 12px" }}>Remplissez tous les champs pour continuer.</p>
            )}
            {profileComplete && !agreedToTerms && (
              <p style={{ textAlign: "center", color: "#f59e0b", fontSize: 12, margin: "0 0 12px" }}>Acceptez les CGV pour continuer.</p>
            )}

            <div className="vip-border-co">
              <button className="vip-btn" onClick={handleCrypto} disabled={loading || !canPay}>
                {loading ? "Redirection..." : <><span style={{ fontSize: 18 }}>₿</span> Payer {product.price} en crypto <ChevronRight size={16} /></>}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
              <ShieldCheck size={13} color="rgba(255,255,255,0.25)" />
              <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>Paiement sécurisé via NOWPayments · SSL · Aucun abonnement</span>
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
