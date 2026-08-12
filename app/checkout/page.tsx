"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Bitcoin, Check, ChevronRight, CreditCard, LockKeyhole, ShieldCheck, Sparkles, X } from "lucide-react";

type ModelKey = "2step" | "1step";
type Challenge = { label: string; model: "2-Step" | "1-Step"; price: string; amount: number };
type CheckoutProduct = Challenge & { slug: string; sizeKey: string; modelKey: ModelKey };
type PublicProduct = {
  slug: string;
  model: ModelKey;
  balance_usd: number;
  price_eur_cents: number;
};

const CHALLENGES: Record<string, Challenge> = {
  "10k-2step":  { label: "$10,000",  model: "2-Step", price: "€89",  amount: 8900   },
  "25k-2step":  { label: "$25,000",  model: "2-Step", price: "€199", amount: 19900  },
  "50k-2step":  { label: "$50,000",  model: "2-Step", price: "€299", amount: 29900  },
  "100k-2step": { label: "$100,000", model: "2-Step", price: "€439", amount: 43900  },
  "200k-2step": { label: "$200,000", model: "2-Step", price: "€799", amount: 79900  },
  "10k-1step":  { label: "$10,000",  model: "1-Step", price: "€79",  amount: 7900   },
  "25k-1step":  { label: "$25,000",  model: "1-Step", price: "€169", amount: 16900  },
  "50k-1step":  { label: "$50,000",  model: "1-Step", price: "€249", amount: 24900  },
  "100k-1step": { label: "$100,000", model: "1-Step", price: "€429", amount: 42900  },
  "200k-1step": { label: "$200,000", model: "1-Step", price: "€749", amount: 74900  },
};

const RULES_2STEP = [
  { label: "Objectif Phase 1",       value: "10%" },
  { label: "Objectif Phase 2",       value: "5%"  },
  { label: "Perte journalière max",  value: "5%"  },
  { label: "Perte totale max",       value: "10%" },
  { label: "Jours de trading min",   value: "5 jours" },
  { label: "Limite de temps",        value: "Illimitée" },
  { label: "Partage des profits",    value: "Jusqu'à 80%" },
];

const RULES_1STEP = [
  { label: "Objectif de profit",          value: "10%" },
  { label: "Perte journalière max",        value: "3%" },
  { label: "Perte totale max",            value: "10%" },
  { label: "Règle meilleur jour",         value: "≤ 50%" },
  { label: "Jours de trading min",        value: "5 jours" },
  { label: "Limite de temps",             value: "Illimitée" },
  { label: "Partage des profits",         value: "Jusqu'à 90%" },
  { label: "Cumul comptes max",           value: "$200K" },
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

const FALLBACK_PRODUCTS: CheckoutProduct[] = Object.entries(CHALLENGES).map(([slug, challenge]) => ({
  ...challenge,
  slug,
  sizeKey: slug.split("-")[0],
  modelKey: slug.endsWith("2step") ? "2step" : "1step",
}));

const SIZES = ["10k", "25k", "50k", "100k", "200k"];
const SIZE_LABELS: Record<string, string> = { "10k": "$10K", "25k": "$25K", "50k": "$50K", "100k": "$100K", "200k": "$200K" };
const LOYALTY_PCT = 20;

function EyeOpen() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}

function EyeOff() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
}

function formatPrice(cents: number) {
  return `€${(cents / 100).toFixed(2).replace(".00", "")}`;
}

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState(params.get("product") || "50k-2step");
  const [availableProducts, setAvailableProducts] = useState<CheckoutProduct[]>(FALLBACK_PRODUCTS);
  const challenge = availableProducts.find(product => product.slug === selectedProduct)
    ?? FALLBACK_PRODUCTS.find(product => product.slug === selectedProduct)
    ?? FALLBACK_PRODUCTS.find(product => product.slug === "50k-2step")!;
  const selectedModel = challenge.modelKey;
  const selectedSize  = challenge.sizeKey;
  const rules = challenge.model === "2-Step" ? RULES_2STEP : RULES_1STEP;

  const changeModel = (model: ModelKey) => {
    const product = availableProducts.find(item => item.sizeKey === selectedSize && item.modelKey === model);
    if (product) setSelectedProduct(product.slug);
  };
  const changeSize = (size: string) => {
    const product = availableProducts.find(item => item.sizeKey === size && item.modelKey === selectedModel);
    if (product) setSelectedProduct(product.slug);
  };

  const [isMobile, setIsMobile] = useState(false);
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [payError, setPayError] = useState("");
  const [loadingStripe, setLoadingStripe] = useState(false);
  const [loadingCrypto, setLoadingCrypto] = useState(false);
  const [loadingFree, setLoadingFree] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState<"idle"|"loading"|"valid"|"error">("idle");
  const [promoError, setPromoError] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [loyaltyActive, setLoyaltyActive] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [refCode, setRefCode] = useState("");

  const fullPhone = phone ? `${dialCode} ${phone}` : "";
  const isAdult = birthDate ? (() => { const b = new Date(birthDate); const min = new Date(); min.setFullYear(min.getFullYear() - 18); return b <= min; })() : false;
  const discountedAmount = discount > 0 ? Math.round(challenge.amount * (100 - discount) / 100) : challenge.amount;
  const isFree = discount === 100;
  const profileComplete = firstName.trim() && lastName.trim() && phone.trim() && email.trim() && city.trim() && country.trim() && isAdult && (user || (password.length >= 8 && password === confirmPassword));
  const canPay = !!profileComplete && agreedToTerms;
  const anyLoading = loadingStripe || loadingCrypto || loadingFree;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    queueMicrotask(() => setRefCode(localStorage.getItem("elysium_ref") || ""));
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch("/api/products")
      .then(response => response.json())
      .then((data: PublicProduct[]) => {
        if (!Array.isArray(data)) return;
        const products = data
          .filter(product => product.slug && product.balance_usd && product.price_eur_cents)
          .map<CheckoutProduct>(product => ({
            slug: product.slug,
            sizeKey: `${Math.round(product.balance_usd / 1000)}k`,
            modelKey: product.model,
            label: `$${product.balance_usd.toLocaleString("en-US")}`,
            model: product.model === "2step" ? "2-Step" : "1-Step",
            price: formatPrice(product.price_eur_cents),
            amount: product.price_eur_cents,
          }));

        if (!products.length) return;
        setAvailableProducts(products);
        setSelectedProduct(current => {
          if (products.some(product => product.slug === current)) return current;
          const fallback = FALLBACK_PRODUCTS.find(product => product.slug === current);
          const matchingProduct = fallback
            ? products.find(product => product.sizeKey === fallback.sizeKey && product.modelKey === fallback.modelKey)
            : undefined;
          return matchingProduct?.slug ?? current;
        });
      })
      .catch(() => {});
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
        const { count } = await supabase.from("challenges").select("id", { count: "exact", head: true }).eq("user_id", session.user.id);
        if (count && count >= 1) { setLoyaltyActive(true); setDiscount(LOYALTY_PCT); }
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
    setPromoStatus("loading"); setPromoError("");
    const res = await fetch("/api/promo/validate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: promoInput }) });
    const data = await res.json();
    if (res.ok && data.discount) {
      const best = loyaltyActive ? Math.max(data.discount, LOYALTY_PCT) : data.discount;
      setDiscount(best); setAppliedCode(data.code); setPromoStatus("valid");
    } else { setPromoStatus("error"); setPromoError(data.error || "Code invalide"); }
  };

  const removePromo = () => {
    setPromoInput(""); setAppliedCode(""); setPromoStatus("idle"); setPromoError("");
    setDiscount(loyaltyActive ? LOYALTY_PCT : 0);
  };

  const createAccountAndGetUser = async () => {
    const supabase = createClient();
    if (password !== confirmPassword) { setPasswordError("Les mots de passe ne correspondent pas"); return null; }
    if (password.length < 8) { setPasswordError("Minimum 8 caractères"); return null; }
    setPasswordError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.session) {
      fetch("/api/security/register-ip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: data.user!.id }) }).catch(() => {});
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

  const handleStripe = async () => {
    setPayError(""); let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoadingStripe(true);
    await saveProfile(u.token);
    // `discount` intentionnellement absent : le serveur recalcule le montant réel.
    const res = await fetch("/api/stripe/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selectedProduct, userId: u.id, userEmail: u.email, promoCode: appliedCode, refCode }) });
    const data = await res.json();
    if (data.url) { window.location.assign(data.url); return; }
    if (data.code === "USE_FREE_PATH") { setLoadingStripe(false); await handleFree(); return; }
    setPayError(data.error || "Erreur paiement."); setLoadingStripe(false);
  };

  const handleCrypto = async () => {
    setPayError(""); let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoadingCrypto(true);
    await saveProfile(u.token);
    // `discount` intentionnellement absent : le serveur recalcule le montant réel.
    const res = await fetch("/api/crypto/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selectedProduct, userId: u.id, promoCode: appliedCode, refCode }) });
    const data = await res.json();
    if (data.url) { window.location.assign(data.url); return; }
    if (data.code === "USE_FREE_PATH") { setLoadingCrypto(false); await handleFree(); return; }
    setPayError(data.error || "Erreur paiement."); setLoadingCrypto(false);
  };

  const handleFree = async () => {
    setPayError(""); let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoadingFree(true);
    await saveProfile(u.token);
    const res = await fetch("/api/promo/free", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selectedProduct, userId: u.id, promoCode: appliedCode, refCode }) });
    const data = await res.json();
    if (data.ok) router.push("/dashboard");
    else { setPromoStatus("error"); setPromoError(data.error || "Erreur"); setLoadingFree(false); }
  };

  const inp: React.CSSProperties = {
    width: "100%", minHeight: 46, background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.11)", borderRadius: 10,
    padding: "11px 14px", color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const lbl: React.CSSProperties = {
    color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: "1px",
    marginBottom: 6, display: "block", textTransform: "uppercase",
  };
  const card: React.CSSProperties = {
    background: "linear-gradient(145deg, rgba(18,21,24,0.96), rgba(8,10,12,0.98))",
    border: "1px solid rgba(255,255,255,0.10)", borderRadius: 18,
    padding: isMobile ? "20px 18px" : "24px 26px",
    boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
  };

  return (
    <div className="co-page" style={{ minHeight: "100vh", background: "#000", color: "#fff" }}>
      <style>{`
        .co-page { position: relative; isolation: isolate; overflow: hidden; }
        .co-page::before {
          content: ""; position: fixed; z-index: -1; inset: 0; pointer-events: none;
          background:
            radial-gradient(circle at 76% 9%, rgba(105,197,253,0.13), transparent 26%),
            radial-gradient(circle at 8% 44%, rgba(105,197,253,0.055), transparent 22%),
            linear-gradient(180deg, #020304 0%, #000 42%);
        }
        .co-input { transition: border-color .2s ease, box-shadow .2s ease, background .2s ease; }
        .co-input:focus { border-color: rgba(105,197,253,0.7) !important; box-shadow: 0 0 0 3px rgba(105,197,253,0.08); background: rgba(105,197,253,0.035) !important; }
        .co-input::placeholder { color: rgba(255,255,255,.25); }
        .co-select option { background: #111; color: #fff; }
        .co-border { border-radius: 12px; display: block; }
        .co-border-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; min-height: 54px; padding: 15px 18px; border-radius: 10px;
          font-size: 13px; font-weight: 900; letter-spacing: 1.1px; text-transform: uppercase;
          background: #69C5FD; color: #020304; border: 1px solid #69C5FD; cursor: pointer;
          box-shadow: 0 14px 34px rgba(105,197,253,.18);
          transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
        }
        .co-border-btn:hover:not(:disabled) { transform: translateY(-1px); background: #8dd4ff; box-shadow: 0 18px 40px rgba(105,197,253,.25); }
        .co-border-btn.crypto { background: rgba(105,197,253,.055); color: #fff; border-color: rgba(105,197,253,.36); box-shadow: none; }
        .co-border-btn.crypto:hover:not(:disabled) { background: rgba(105,197,253,.11); border-color: #69C5FD; box-shadow: 0 14px 34px rgba(105,197,253,.10); }
        .co-border-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .co-summary { position: sticky; top: 24px; }
        .co-step-line { height: 1px; flex: 1; max-width: 72px; background: linear-gradient(90deg, rgba(105,197,253,.55), rgba(255,255,255,.12)); }
        @media (max-width: 767px) {
          .co-summary { position: static; }
          .co-step-line { max-width: 34px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ minHeight: isMobile ? 64 : 76, borderBottom: "1px solid rgba(255,255,255,0.10)", padding: isMobile ? "0 16px" : "0 34px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,.72)", backdropFilter: "blur(18px)" }}>
        <Link href="/#pricing" style={{ textDecoration: "none", color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
          <ArrowLeft size={15} /> {isMobile ? "Retour" : "Retour aux challenges"}
        </Link>
        <Link href="/" aria-label="Traders Rewards" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", height: isMobile ? 58 : 70, display: "flex", alignItems: "center" }}>
          <Image src="/logo-blanc-transparent.png" alt="Traders Rewards" width={176} height={112} priority style={{ width: isMobile ? 145 : 176, height: isMobile ? 92 : 112, objectFit: "contain" }} />
        </Link>
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, letterSpacing: ".05em", textTransform: "uppercase" }}>
          <LockKeyhole size={14} color="#69C5FD" /> {!isMobile && "Paiement sécurisé"}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "30px 18px 18px" : "50px 24px 10px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#69C5FD", fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 14 }}>
          <Sparkles size={13} /> Votre parcours commence ici
        </div>
        <h1 style={{ margin: 0, fontSize: isMobile ? 34 : 50, lineHeight: 1.02, letterSpacing: "-.04em", fontWeight: 900 }}>
          Finalisez votre <span style={{ color: "#69C5FD" }}>Challenge</span>
        </h1>
        <p style={{ margin: "12px auto 20px", maxWidth: 610, color: "rgba(255,255,255,.48)", fontSize: isMobile ? 13 : 15, lineHeight: 1.6 }}>
          Choisissez votre compte, renseignez vos informations et accédez à votre espace trader en quelques minutes.
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 12 }}>
          {["Challenge", "Informations", "Paiement"].map((step, index) => (
            <div key={step} style={{ display: "contents" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: index === 0 ? "#fff" : "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: index === 0 ? "#69C5FD" : "rgba(255,255,255,.06)", border: `1px solid ${index === 0 ? "#69C5FD" : "rgba(255,255,255,.12)"}`, color: index === 0 ? "#000" : "rgba(255,255,255,.5)" }}>{index + 1}</span>
                {!isMobile && step}
              </div>
              {index < 2 && <div className="co-step-line" />}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile résumé */}
      {isMobile && (
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Image src="/MT5.png" alt="MT5" width={36} height={36} style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "1px" }}>Challenge {challenge.model}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{challenge.label}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 22, fontWeight: 900, color: isFree ? "#22c55e" : "#fff" }}>
            {isFree ? "GRATUIT" : discount > 0 ? formatPrice(discountedAmount) : challenge.price}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", maxWidth: 1200, margin: "0 auto", padding: isMobile ? "0" : "28px 24px 64px", gap: isMobile ? 0 : 28, alignItems: "flex-start" }}>

        {/* LEFT — Formulaire */}
        <div style={{ flex: 1, padding: isMobile ? "16px" : "0", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Sélecteur challenge */}
          <div style={{ ...card, borderColor: "rgba(105,197,253,.23)", boxShadow: "0 22px 70px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.03)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>Challenge</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {([{ key: "2step", label: "2-Step" }, { key: "1step", label: "1-Step" }] as const).map(m => (
                <button key={m.key} onClick={() => changeModel(m.key)} style={{
                  flex: 1, padding: "9px 6px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border: selectedModel === m.key ? "1.5px solid #69C5FD" : "1.5px solid rgba(255,255,255,0.1)",
                  background: selectedModel === m.key ? "rgba(105,197,253,0.1)" : "#111",
                  color: selectedModel === m.key ? "#69C5FD" : "rgba(255,255,255,0.5)",
                }}>{m.label}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {SIZES.map(size => (
                <button key={size} onClick={() => changeSize(size)} style={{
                  flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border: selectedSize === size ? "1.5px solid #69C5FD" : "1.5px solid rgba(255,255,255,0.1)",
                  background: selectedSize === size ? "#69C5FD" : "#111",
                  color: selectedSize === size ? "#000" : "rgba(255,255,255,0.5)",
                }}>{SIZE_LABELS[size]}</button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Challenge {challenge.label}</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>{challenge.model} — Traders Rewards · MetaTrader 5</div>
              </div>
              <span style={{ background: "rgba(105,197,253,0.1)", color: "#69C5FD", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(105,197,253,0.3)" }}>
                {challenge.model}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 0 : "0 24px" }}>
              {rules.map((r, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>{r.label}</span>
                  <span style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Infos personnelles */}
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>Informations de facturation</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 16px" }}>
              <div>
                <label style={lbl}>Prénom *</label>
                <input className="co-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jean" style={inp} />
              </div>
              <div>
                <label style={lbl}>Nom *</label>
                <input className="co-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Dupont" style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Email *</label>
                <input className="co-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="jean.dupont@email.com" style={inp} />
              </div>
              <div>
                <label style={lbl}>Téléphone *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="co-select" value={dialCode} onChange={e => setDialCode(e.target.value)}
                    style={{ ...inp, width: 90, flexShrink: 0, cursor: "pointer", padding: "10px 6px" }}>
                    {DIAL_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input className="co-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 00 00 00 00" style={{ ...inp, flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={lbl}>Date de naissance *</label>
                <input type="date" className="co-input" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  style={{ ...inp, colorScheme: "dark" }} />
                {birthDate && !isAdult && <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>Vous devez avoir au moins 18 ans.</div>}
              </div>
              <div>
                <label style={lbl}>Ville *</label>
                <input className="co-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Paris" style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lbl}>Code postal</label>
                  <input className="co-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" style={inp} />
                </div>
                <div>
                  <label style={lbl}>Pays *</label>
                  <input className="co-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="France" style={inp} />
                </div>
              </div>
            </div>

            {!user && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#69C5FD", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Créer votre compte</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 16px" }}>
                  <div>
                    <label style={lbl}>Mot de passe *</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPassword ? "text" : "password"} className="co-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 caractères" style={{ ...inp, paddingRight: 44 }} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                        {showPassword ? <EyeOff /> : <EyeOpen />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Confirmer *</label>
                    <div style={{ position: "relative" }}>
                      <input type={showConfirmPassword ? "text" : "password"} className="co-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Répéter"
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
        </div>

        {/* RIGHT — Résumé + paiement */}
        <div className="co-summary" style={{ flex: "0 0 368px", width: isMobile ? "100%" : undefined, padding: isMobile ? "16px" : "0", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Résumé desktop */}
          {!isMobile && (
            <div style={{ ...card, borderColor: "rgba(105,197,253,.24)", boxShadow: "0 24px 80px rgba(0,0,0,.42), 0 0 50px rgba(105,197,253,.045)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>Résumé</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Image src="/MT5.png" alt="MT5" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Traders Rewards Challenge</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{challenge.label} — {challenge.model}</div>
                  <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 2 }}>Standard MT5 · 1:100 · USD</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[{ label: "Challenge", value: challenge.model }, { label: "Plateforme", value: "MetaTrader 5" }, { label: "Capital simulé", value: challenge.label }].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{row.value}</span>
                  </div>
                ))}
                {discount > 0 && <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Prix</span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "line-through" }}>{challenge.price}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>Réduction −{discount}%</span>
                    <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>−{formatPrice(challenge.amount - discountedAmount)}</span>
                  </div>
                </>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>Total</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: isFree ? "#22c55e" : "#fff" }}>
                    {isFree ? "GRATUIT" : discount > 0 ? formatPrice(discountedAmount) : challenge.price}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>TVA incluse</div>
                </div>
              </div>
            </div>
          )}

          {/* Loyalty */}
          {loyaltyActive && promoStatus !== "valid" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 10, padding: "12px 14px" }}>
              <span style={{ fontSize: 16 }}>🎖️</span>
              <div>
                <div style={{ color: "#22c55e", fontWeight: 800, fontSize: 13 }}>Remise fidélité −20% appliquée</div>
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>Client existant — remise automatique à vie</div>
              </div>
            </div>
          )}

          {/* Code promo */}
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Code promo</div>
            {promoStatus !== "valid" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input className="co-input" value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus("idle"); setPromoError(""); }}
                  onKeyDown={e => e.key === "Enter" && applyPromo()} placeholder="ENTRER LE CODE"
                  style={{ ...inp, flex: 1, fontWeight: 700, letterSpacing: "1.5px", fontFamily: "monospace" }} />
                <button onClick={applyPromo} disabled={!promoInput.trim() || promoStatus === "loading"}
                  style={{ background: "#fff", color: "#000", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 12, fontWeight: 800, cursor: promoInput.trim() ? "pointer" : "not-allowed", opacity: promoInput.trim() ? 1 : 0.4, whiteSpace: "nowrap" }}>
                  {promoStatus === "loading" ? "..." : "Appliquer"}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "10px 12px" }}>
                <div>
                  <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 13, letterSpacing: "1px", fontFamily: "monospace" }}>{appliedCode}</span>
                  <span style={{ color: "#22c55e", fontSize: 12, marginLeft: 10 }}>−{discount}%{isFree ? " · GRATUIT" : ""}</span>
                </div>
                <button onClick={removePromo} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 2 }}><X size={14} /></button>
              </div>
            )}
            {promoStatus === "error" && <div style={{ marginTop: 8, color: "#ef4444", fontSize: 12 }}>{promoError}</div>}
          </div>

          {/* CGV */}
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>Conditions Générales</div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 14px", maxHeight: 110, overflowY: "auto", marginBottom: 12 }}>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: "rgba(255,255,255,0.6)" }}>Résumé des points clés :</strong><br />
                • Le trading sur notre plateforme est <strong style={{ color: "rgba(255,255,255,0.7)" }}>100% simulé</strong> — aucun capital réel, aucun ordre exécuté sur les marchés.<br />
                • Les Frais de Challenge sont <strong style={{ color: "rgba(255,255,255,0.7)" }}>non remboursables</strong> dès l&apos;ouverture du premier trade (droit de rétractation de 14 jours avant tout trade).<br />
                • La récompense est de <strong style={{ color: "rgba(255,255,255,0.7)" }}>80% (2 Étapes)</strong> ou <strong style={{ color: "rgba(255,255,255,0.7)" }}>90% (1 Étape)</strong> des profits simulés.<br />
                • Le capital simulé total est limité à <strong style={{ color: "rgba(255,255,255,0.7)" }}>200 000 USD</strong> par client.<br />
                • En cas de violation des règles, nous pouvons résilier votre compte sans indemnité.<br />
                • Droit applicable : <strong style={{ color: "rgba(255,255,255,0.7)" }}>loi estonienne</strong>.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#69C5FD", width: 14, height: 14, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, lineHeight: 1.5 }}>
                J&apos;ai lu et j&apos;accepte les{" "}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#69C5FD", textDecoration: "underline", fontWeight: 700 }}>
                  Conditions Générales de Vente et d&apos;Utilisation
                </a>
              </span>
            </label>
          </div>

          {/* Boutons paiement */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {payError && (
              <div style={{ color: "#ef4444", fontSize: 12, padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 8 }}>
                {payError}
              </div>
            )}
            {!profileComplete && <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>Remplissez tous les champs pour continuer.</p>}
            {profileComplete && !agreedToTerms && <p style={{ textAlign: "center", color: "#f59e0b", fontSize: 12, margin: 0 }}>Acceptez les CGV pour continuer.</p>}

            {isFree ? (
              <div className="co-border" style={{ opacity: (anyLoading || !canPay) ? 0.5 : 1 }}>
                <button onClick={handleFree} disabled={anyLoading || !canPay} className="co-border-btn">
                  {loadingFree ? "Configuration..." : <><span>🎉</span> Accès gratuit <ChevronRight size={16} /></>}
                </button>
              </div>
            ) : (<>
              <div className="co-border" style={{ opacity: (anyLoading || !canPay) ? 0.5 : 1 }}>
                <button onClick={handleStripe} disabled={anyLoading || !canPay} className="co-border-btn">
                  {loadingStripe ? "Redirection..." : <><CreditCard size={17} /> Payer par carte <ChevronRight size={16} /></>}
                </button>
              </div>
              <div className="co-border" style={{ opacity: (anyLoading || !canPay) ? 0.5 : 1 }}>
                <button onClick={handleCrypto} disabled={anyLoading || !canPay} className="co-border-btn crypto">
                  {loadingCrypto ? "Redirection..." : <><Bitcoin size={17} /> Payer en crypto <ChevronRight size={16} /></>}
                </button>
              </div>
            </>)}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
              <ShieldCheck size={13} color="#69C5FD" />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 600, letterSpacing: ".03em" }}>Sécurisé par Stripe · SSL · Aucun abonnement</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginTop: 4 }}>
              {["Accès rapide", "Paiement unique", "Support humain"].map(item => (
                <div key={item} style={{ minHeight: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", border: "1px solid rgba(255,255,255,.07)", borderRadius: 9, background: "rgba(255,255,255,.025)", color: "rgba(255,255,255,.42)", fontSize: 9, fontWeight: 700, textAlign: "center" }}>
                  <Check size={12} color="#69C5FD" /> {item}
                </div>
              ))}
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
