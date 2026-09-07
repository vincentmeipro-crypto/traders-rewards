"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Bitcoin, Check, ChevronRight, CreditCard, LockKeyhole, ShieldCheck, Sparkles, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

type ModelKey = "2step" | "1step";
type Challenge = { label: string; model: "Challenge"; price: string; amount: number; pack3Amount: number };
type CheckoutProduct = Challenge & { slug: string; sizeKey: string; modelKey: ModelKey };
type PublicProduct = {
  slug: string;
  model: ModelKey;
  balance_usd: number;
  price_eur_cents: number;
  unit_price_cents?:  number | null;
  pack3_price_cents?: number | null;
};

const CHALLENGES: Record<string, Challenge> = {
  "rewards-25k":  { label: "$25,000",  model: "Challenge", price: "€38", amount: 3800,  pack3Amount: 5700  },
  "rewards-50k":  { label: "$50,000",  model: "Challenge", price: "€58", amount: 5800,  pack3Amount: 8700  },
  "rewards-100k": { label: "$100,000", model: "Challenge", price: "€118", amount: 11800, pack3Amount: 17700 },
};

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
  sizeKey: slug.split("-")[1],
  modelKey: "1step",
}));

const SIZES = ["25k", "50k", "100k"];
const SIZE_LABELS: Record<string, string> = { "25k": "$25K", "50k": "$50K", "100k": "$100K" };

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
  const requestedProduct = params.get("product");
  const { lang } = useLanguage();
  const isFr = lang === "fr";
  const isEs = lang === "es";
  const L = (fr: string, es: string, en: string) => isFr ? fr : isEs ? es : en;

  // Quantité initiale depuis l'URL : ?qty=3 → pack ×3, sinon 1 challenge.
  const initialQty = params.get("qty") === "3" ? 3 : 1;
  const [quantity, setQuantity] = useState<1 | 3>(initialQty as 1 | 3);

  const [selectedProduct, setSelectedProduct] = useState(requestedProduct?.startsWith("rewards-") ? requestedProduct : "rewards-50k");
  const [availableProducts, setAvailableProducts] = useState<CheckoutProduct[]>(FALLBACK_PRODUCTS);
  const challenge = availableProducts.find(product => product.slug === selectedProduct)
    ?? FALLBACK_PRODUCTS.find(product => product.slug === selectedProduct)
    ?? FALLBACK_PRODUCTS.find(product => product.slug === "rewards-50k")!;
  const selectedSize  = challenge.sizeKey;

  // Rules traduits
  const rules = [
    { label: L("Étapes", "Etapas", "Steps"), value: "1" },
    { label: L("Objectif de profit", "Objetivo de beneficio", "Profit target"), value: "+6%" },
    { label: L("Trailing Drawdown EOD", "Trailing Drawdown EOD", "Trailing Drawdown EOD"), value: selectedSize === "100k" ? "3%" : "4%" },
    { label: L("Consistance", "Consistencia", "Consistency"), value: "≤ 50%" },
    { label: L("Jours de trading minimum", "Días mínimos de trading", "Minimum trading days"), value: L("2 jours", "2 días", "2 days") },
    { label: L("Durée maximale", "Duración máxima", "Maximum duration"), value: L("30 jours calendaires", "30 días naturales", "30 calendar days") },
  ];

  const changeSize = (size: string) => {
    const product = availableProducts.find(item => item.sizeKey === size);
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [refCode, setRefCode] = useState("");

  const fullPhone = phone ? `${dialCode} ${phone}` : "";
  const isAdult = birthDate ? (() => { const b = new Date(birthDate); const min = new Date(); min.setFullYear(min.getFullYear() - 18); return b <= min; })() : false;

  // ── Prix selon la quantité sélectionnée ─────────────────────────────────
  // quantity=1 → prix unitaire ; quantity=3 → prix pack ×3
  const baseAmount      = quantity === 3 ? challenge.pack3Amount : challenge.amount;
  const discountedAmount = discount > 0 ? Math.round(baseAmount * (100 - discount) / 100) : baseAmount;
  const totalAmount     = discountedAmount;
  const isFree          = discount === 100;

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
          .filter(product => product.slug?.startsWith("rewards-") && [25000, 50000, 100000].includes(product.balance_usd))
          .map<CheckoutProduct>(product => {
            const unitCents  = product.unit_price_cents  ?? product.price_eur_cents;
            const pack3Cents = product.pack3_price_cents ?? Math.round(unitCents * 3 * 0.5); // fallback rough
            const sizeKey    = `${Math.round(product.balance_usd / 1000)}k`;
            const fb         = FALLBACK_PRODUCTS.find(f => f.sizeKey === sizeKey);
            return {
              slug:        product.slug,
              sizeKey,
              modelKey:    product.model,
              label:       `$${product.balance_usd.toLocaleString("en-US")}`,
              model:       "Challenge",
              price:       formatPrice(unitCents),
              amount:      unitCents,
              pack3Amount: pack3Cents || fb?.pack3Amount || 0,
            };
          });

        if (!products.length) return;
        setAvailableProducts(products);
        setSelectedProduct(current => {
          if (products.some(product => product.slug === current)) return current;
          const fallback = FALLBACK_PRODUCTS.find(product => product.slug === current);
          const matchingProduct = fallback
            ? products.find(product => product.sizeKey === fallback.sizeKey)
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
      setDiscount(data.discount); setAppliedCode(data.code); setPromoStatus("valid");
    } else { setPromoStatus("error"); setPromoError(data.error || L("Code invalide", "Código inválido", "Invalid code")); }
  };

  const removePromo = () => {
    setPromoInput(""); setAppliedCode(""); setPromoStatus("idle"); setPromoError("");
    setDiscount(0);
  };

  const createAccountAndGetUser = async () => {
    const supabase = createClient();
    if (password !== confirmPassword) {
      setPasswordError(L("Les mots de passe ne correspondent pas", "Las contraseñas no coinciden", "Passwords do not match"));
      return null;
    }
    if (password.length < 8) {
      setPasswordError(L("Minimum 8 caractères", "Mínimo 8 caracteres", "Minimum 8 characters"));
      return null;
    }
    setPasswordError("");
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.session) {
      fetch("/api/security/register-ip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: data.user!.id }) }).catch(() => {});
      return { id: data.user!.id, email: data.user!.email!, token: data.session.access_token };
    }
    if (error?.message?.includes("already") || !data.session) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setPayError(L("Email déjà utilisé. Connecte-toi d'abord.", "Email ya en uso. Inicia sesión primero.", "Email already in use. Please log in first."));
        return null;
      }
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
    // `quantity` envoyé pour que le backend sache s'il faut créer 1 ou 3 challenges.
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProduct, userId: u.id, userEmail: u.email, promoCode: appliedCode, refCode, quantity }),
    });
    const data = await res.json();
    if (data.url) { window.location.assign(data.url); return; }
    if (data.code === "USE_FREE_PATH") { setLoadingStripe(false); await handleFree(); return; }
    setPayError(data.error || L("Erreur paiement.", "Error de pago.", "Payment error.")); setLoadingStripe(false);
  };

  const handleCrypto = async () => {
    setPayError(""); let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoadingCrypto(true);
    await saveProfile(u.token);
    // `discount` intentionnellement absent : le serveur recalcule le montant réel.
    const res = await fetch("/api/crypto/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProduct, userId: u.id, promoCode: appliedCode, refCode, quantity }),
    });
    const data = await res.json();
    if (data.url) { window.location.assign(data.url); return; }
    if (data.code === "USE_FREE_PATH") { setLoadingCrypto(false); await handleFree(); return; }
    setPayError(data.error || L("Erreur paiement.", "Error de pago.", "Payment error.")); setLoadingCrypto(false);
  };

  const handleFree = async () => {
    setPayError(""); let u = user;
    if (!u) { u = await createAccountAndGetUser(); if (!u) return; setUser(u); }
    setLoadingFree(true);
    await saveProfile(u.token);
    const res = await fetch("/api/promo/free", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: selectedProduct, userId: u.id, promoCode: appliedCode, refCode }) });
    const data = await res.json();
    if (data.ok) router.push("/dashboard");
    else { setPromoStatus("error"); setPromoError(data.error || L("Erreur", "Error", "Error")); setLoadingFree(false); }
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
            radial-gradient(circle at 76% 9%, rgba(212,168,67,0.07), transparent 26%),
            radial-gradient(circle at 8% 44%, rgba(212,168,67,0.03), transparent 22%),
            linear-gradient(180deg, #020304 0%, #000 42%);
        }
        .co-input { transition: border-color .2s ease, box-shadow .2s ease, background .2s ease; }
        .co-input:focus { border-color: rgba(212,168,67,0.7) !important; box-shadow: 0 0 0 3px rgba(212,168,67,0.08); background: rgba(212,168,67,0.035) !important; }
        .co-input::placeholder { color: rgba(255,255,255,.25); }
        .co-select option { background: #111; color: #fff; }
        .co-border { border-radius: 12px; display: block; }

        /* ── Animation gradient carte ── */
        @keyframes coCartaFlow {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* ── PAYER PAR CARTE — bouton principal doré ── */
        .co-border-btn {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; min-height: 54px; padding: 15px 18px; border-radius: 10px;
          font-size: 13px; font-weight: 700; letter-spacing: 1.1px; text-transform: uppercase;
          position: relative;
          background: linear-gradient(110deg, #8A6424 0%, #C99B45 22%, #F0D58A 45%, #D4AD5A 65%, #9B722B 100%);
          background-size: 220% 100%;
          border: 1px solid rgba(240,213,138,0.45);
          color: #080808; cursor: pointer;
          box-shadow: 0 4px 22px rgba(184,135,70,0.24), 0 2px 8px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.20);
          transition: filter .25s ease, box-shadow .25s ease;
          animation: coCartaFlow 7s ease-in-out infinite;
        }
        .co-border-btn svg { transition: transform .25s ease; }
        .co-border-btn:hover:not(:disabled) {
          filter: brightness(1.12);
          box-shadow: 0 6px 30px rgba(184,135,70,0.34), 0 2px 10px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.28);
        }
        .co-border-btn:hover:not(:disabled) svg:last-child { transform: translateX(3px); }

        /* ── PAYER EN CRYPTO — bouton secondaire sombre / doré ── */
        .co-border-btn.crypto {
          background: #111214; background-size: unset;
          color: #FFFFFF; border: 1px solid rgba(212,173,90,0.40);
          box-shadow: none; animation: none; filter: none;
        }
        .co-border-btn.crypto svg { color: rgba(212,168,67,0.85); }
        .co-border-btn.crypto:hover:not(:disabled) {
          background: #17191c; filter: none;
          border-color: rgba(212,173,90,0.72);
          box-shadow: 0 4px 20px rgba(184,135,70,0.12);
        }

        /* ── État désactivé (CGV non cochées / chargement) ── */
        .co-border-btn:disabled {
          opacity: 0.48; cursor: not-allowed;
          filter: none !important; animation: none !important;
          box-shadow: none !important; background-position: 0% 50% !important;
        }
        .co-border-btn:disabled svg { transform: none !important; }

        /* ── Respect prefers-reduced-motion ── */
        @media (prefers-reduced-motion: reduce) {
          .co-border-btn { animation: none !important; background-position: 0% 50%; }
        }
        .co-summary { position: sticky; top: 24px; }
        .co-step-line { height: 1px; flex: 1; max-width: 72px; background: linear-gradient(90deg, rgba(212,168,67,.45), rgba(255,255,255,.08)); }
        @media (max-width: 767px) {
          .co-summary { position: static; }
          .co-step-line { max-width: 34px; }
        }
      `}</style>

      {/* Header */}
      <div style={{ minHeight: isMobile ? 64 : 76, borderBottom: "1px solid rgba(255,255,255,0.10)", padding: isMobile ? "0 16px" : "0 34px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,.72)", backdropFilter: "blur(18px)" }}>
        <Link href="/#pricing" style={{ textDecoration: "none", color: "rgba(255,255,255,0.62)", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 8, textTransform: "uppercase", letterSpacing: ".08em" }}>
          <ArrowLeft size={15} />
          {isMobile
            ? L("Retour", "Volver", "Back")
            : L("Retour aux challenges", "Volver a los challenges", "Back to challenges")}
        </Link>
        <Link href="/" aria-label="Traders Rewards" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", height: isMobile ? 58 : 70, display: "flex", alignItems: "center" }}>
          <Image src="/Traders_Rewards_logo_E_sans_barre_BLANC_transparent_4K.png" alt="Traders Rewards" width={176} height={112} priority style={{ width: isMobile ? 145 : 176, height: isMobile ? 92 : 112, objectFit: "contain" }} />
        </Link>
        <div style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 7, letterSpacing: ".05em", textTransform: "uppercase" }}>
          <LockKeyhole size={14} color="#D4A843" />
          {!isMobile && L("Paiement sécurisé", "Pago seguro", "Secure payment")}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "30px 18px 18px" : "50px 24px 10px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "#D4A843", fontSize: 10, fontWeight: 800, letterSpacing: ".2em", textTransform: "uppercase", marginBottom: 14 }}>
          <Sparkles size={13} />
          {L("Votre parcours commence ici", "Tu recorrido empieza aquí", "Your journey starts here")}
        </div>
        <h1 style={{ margin: 0, fontSize: isMobile ? 34 : 50, lineHeight: 1.02, letterSpacing: "-.04em", fontWeight: 900 }}>
          {L("Finalisez votre", "Finaliza tu", "Complete your")}{" "}
          <span style={{ color: "#D4A843" }}>Challenge</span>
        </h1>
        <p style={{ margin: "12px auto 20px", maxWidth: 610, color: "rgba(255,255,255,.48)", fontSize: isMobile ? 13 : 15, lineHeight: 1.6 }}>
          {L(
            "Choisissez votre compte, renseignez vos informations et accédez à votre espace trader en quelques minutes.",
            "Elige tu cuenta, rellena tus datos y accede a tu espacio trader en pocos minutos.",
            "Choose your account, fill in your details and access your trader space in just a few minutes."
          )}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: isMobile ? 8 : 12 }}>
          {[
            L("Challenge", "Challenge", "Challenge"),
            L("Informations", "Información", "Details"),
            L("Paiement", "Pago", "Payment"),
          ].map((step, index) => (
            <div key={step} style={{ display: "contents" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, color: index === 0 ? "#fff" : "rgba(255,255,255,.4)", fontSize: 10, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase" }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: index === 0 ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,.06)", border: `1px solid ${index === 0 ? "rgba(212,168,67,0.6)" : "rgba(255,255,255,.12)"}`, color: index === 0 ? "#D4A843" : "rgba(255,255,255,.5)" }}>{index + 1}</span>
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
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "1px" }}>
              {quantity === 3
                ? L("Pack ×3 Challenges", "Pack ×3 Challenges", "Pack ×3 Challenges")
                : L("Challenge Traders Rewards", "Challenge Traders Rewards", "Challenge Traders Rewards")}
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{challenge.label}{quantity === 3 ? " × 3" : ""}</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 22, fontWeight: 900, color: isFree ? "#22c55e" : "#fff" }}>
            {isFree ? L("GRATUIT", "GRATIS", "FREE") : formatPrice(totalAmount)}
          </div>
        </div>
      )}

      {/* Body */}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", maxWidth: 1200, margin: "0 auto", padding: isMobile ? "0" : "28px 24px 64px", gap: isMobile ? 0 : 28, alignItems: "flex-start" }}>

        {/* LEFT — Formulaire */}
        <div style={{ flex: 1, padding: isMobile ? "16px" : "0", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Sélecteur challenge */}
          <div style={{ ...card, borderColor: "rgba(212,168,67,.23)", boxShadow: "0 22px 70px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.03)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>Challenge</div>

            {/* Sélecteur taille — 25K=argent, 50K=or rose, 100K=or champagne */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {SIZES.map(size => {
                const metallic: Record<string, { border: string; color: string; bg: string }> = {
                  "25k":  { border: "rgba(180,185,192,.70)", color: "#D5D8DC", bg: "rgba(180,185,192,.07)" },
                  "50k":  { border: "rgba(185,110,100,.70)", color: "#D79A8F", bg: "rgba(185,110,100,.07)" },
                  "100k": { border: "rgba(212,168,67,.72)",  color: "#D4A843", bg: "rgba(212,168,67,.08)" },
                };
                const m = metallic[size];
                const isActive = selectedSize === size;
                return (
                <button key={size} onClick={() => changeSize(size)} style={{
                  flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 700, borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border: isActive ? `1.5px solid ${m.border}` : "1.5px solid rgba(255,255,255,0.10)",
                  background: isActive ? m.bg : "#111",
                  color: isActive ? m.color : "rgba(255,255,255,0.45)",
                }}>{SIZE_LABELS[size]}</button>
                );
              })}
            </div>

            {/* Sélecteur quantité : 1 Challenge / Pack ×3 */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>

              {/* ── 1 Challenge · -80% ── */}
              <button
                onClick={() => setQuantity(1)}
                style={{
                  flex: 1, padding: "10px 6px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border:     quantity === 1 ? "1.5px solid rgba(255,255,255,0.35)" : "1.5px solid rgba(255,255,255,0.10)",
                  background: quantity === 1 ? "rgba(255,255,255,0.06)" : "#111",
                  fontFamily: "inherit", textAlign: "center" as const,
                }}
              >
                <div style={{ fontSize:11, fontWeight:800, color: quantity === 1 ? "#FFFFFF" : "rgba(255,255,255,0.45)", marginBottom:3 }}>
                  {L("1 Challenge", "1 Challenge", "1 Challenge")}
                </div>
                <div style={{ fontSize:13, fontWeight:900, letterSpacing:"0.3px", color: quantity === 1 ? "#FFFFFF" : "rgba(255,255,255,0.55)" }}>
                  −80%
                </div>
              </button>

              {/* ── Pack ×3 · -90% doré · BEST DEAL ── */}
              <button
                onClick={() => setQuantity(3)}
                style={{
                  flex: 1, padding: "10px 6px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s",
                  border:     quantity === 3 ? "1.5px solid rgba(212,168,67,0.75)" : "1.5px solid rgba(212,168,67,0.22)",
                  background: quantity === 3 ? "rgba(212,168,67,0.08)" : "rgba(212,168,67,0.03)",
                  fontFamily: "inherit", textAlign: "center" as const, position: "relative" as const,
                }}
              >
                {/* Badge "BEST DEAL" */}
                <div style={{
                  position:"absolute", top:-9, left:"50%", transform:"translateX(-50%)",
                  fontSize:7, fontWeight:900, color:"#050505",
                  background:"linear-gradient(110deg, #B88746, #D6AD63 45%, #F2D79A 60%, #C6964D)", borderRadius:4,
                  padding:"2px 7px", letterSpacing:"0.8px", textTransform:"uppercase" as const,
                  whiteSpace:"nowrap",
                }}>
                  BEST DEAL
                </div>
                <div style={{ fontSize:11, fontWeight:800, color: quantity === 3 ? "#D4A843" : "rgba(212,168,67,0.60)", marginBottom:3 }}>
                  {L("Pack ×3", "Pack ×3", "Pack ×3")}
                </div>
                <div style={{ fontSize:13, fontWeight:900, letterSpacing:"0.3px", color: quantity === 3 ? "#D4A843" : "rgba(212,168,67,0.60)" }}>
                  −90%
                </div>
              </button>

            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {quantity === 3
                    ? `Pack ×3 — ${challenge.label}`
                    : `Challenge ${challenge.label}`}
                </div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>
                  {quantity === 3
                    ? L("3 comptes MT5 · 1 étape chacun", "3 cuentas MT5 · 1 etapa c/u", "3 MT5 accounts · 1 step each")
                    : L("1 étape · MetaTrader 5 · Compte simulé", "1 etapa · MetaTrader 5 · Cuenta simulada", "1 step · MetaTrader 5 · Simulated account")}
                </div>
              </div>
              <span style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.13)", whiteSpace: "nowrap" }}>
                {quantity === 3 ? "PACK ×3" : "CHALLENGER"}
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
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 16 }}>
              {L("Informations de facturation", "Información de facturación", "Billing information")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 16px" }}>
              <div>
                <label style={lbl}>{L("Prénom *", "Nombre *", "First name *")}</label>
                <input className="co-input" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={L("Jean", "Juan", "John")} style={inp} />
              </div>
              <div>
                <label style={lbl}>{L("Nom *", "Apellido *", "Last name *")}</label>
                <input className="co-input" value={lastName} onChange={e => setLastName(e.target.value)} placeholder={L("Dupont", "García", "Smith")} style={inp} />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={lbl}>Email *</label>
                <input className="co-input" value={email} onChange={e => setEmail(e.target.value)} placeholder={L("jean.dupont@email.com", "juan.garcia@email.com", "john.smith@email.com")} style={inp} />
              </div>
              <div>
                <label style={lbl}>{L("Téléphone *", "Teléfono *", "Phone *")}</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select className="co-select" value={dialCode} onChange={e => setDialCode(e.target.value)}
                    style={{ ...inp, width: 90, flexShrink: 0, cursor: "pointer", padding: "10px 6px" }}>
                    {DIAL_CODES.map(c => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
                  </select>
                  <input className="co-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 00 00 00 00" style={{ ...inp, flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={lbl}>{L("Date de naissance *", "Fecha de nacimiento *", "Date of birth *")}</label>
                <input type="date" className="co-input" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  style={{ ...inp, colorScheme: "dark" }} />
                {birthDate && !isAdult && (
                  <div style={{ color: "#ef4444", fontSize: 11, marginTop: 4 }}>
                    {L("Vous devez avoir au moins 18 ans.", "Debes tener al menos 18 años.", "You must be at least 18 years old.")}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>{L("Ville *", "Ciudad *", "City *")}</label>
                <input className="co-input" value={city} onChange={e => setCity(e.target.value)} placeholder={L("Paris", "Madrid", "London")} style={inp} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={lbl}>{L("Code postal", "Código postal", "Postal code")}</label>
                  <input className="co-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="75001" style={inp} />
                </div>
                <div>
                  <label style={lbl}>{L("Pays *", "País *", "Country *")}</label>
                  <input className="co-input" value={country} onChange={e => setCountry(e.target.value)} placeholder={L("France", "España", "United Kingdom")} style={inp} />
                </div>
              </div>
            </div>

            {!user && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16, marginTop: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
                  {L("Créer votre compte", "Crear tu cuenta", "Create your account")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px 16px" }}>
                  <div>
                    <label style={lbl}>{L("Mot de passe *", "Contraseña *", "Password *")}</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPassword ? "text" : "password"} className="co-input" value={password} onChange={e => setPassword(e.target.value)} placeholder={L("Min. 8 caractères", "Mín. 8 caracteres", "Min. 8 characters")} style={{ ...inp, paddingRight: 44 }} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 0 }}>
                        {showPassword ? <EyeOff /> : <EyeOpen />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>{L("Confirmer *", "Confirmar *", "Confirm *")}</label>
                    <div style={{ position: "relative" }}>
                      <input type={showConfirmPassword ? "text" : "password"} className="co-input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={L("Répéter", "Repetir", "Repeat")}
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
                <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>
                  {L("Connecté en tant que", "Conectado como", "Logged in as")} {user.email}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Résumé + paiement */}
        <div className="co-summary" style={{ flex: "0 0 368px", width: isMobile ? "100%" : undefined, padding: isMobile ? "16px" : "0", display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Résumé desktop */}
          {!isMobile && (
            <div style={{ ...card, borderColor: "rgba(212,168,67,.24)", boxShadow: "0 24px 80px rgba(0,0,0,.42), 0 0 50px rgba(212,168,67,.045)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 14 }}>
                {L("Résumé", "Resumen", "Summary")}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <Image src="/MT5.png" alt="MT5" width={40} height={40} style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>MetaTrader 5</div>
                  <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>
                    {quantity === 3
                      ? `Pack ×3 — ${challenge.label}`
                      : `${challenge.label} — ${L("1 étape", "1 etapa", "1 step")}`}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, marginTop: 2 }}>
                    {L("Standard MT5 · 1:100 · USD", "Estándar MT5 · 1:100 · USD", "Standard MT5 · 1:100 · USD")}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {[
                  { label: L("Parcours", "Recorrido", "Track"), value: quantity === 3 ? "PACK ×3" : "CHALLENGER" },
                  { label: L("Plateforme", "Plataforma", "Platform"), value: "MetaTrader 5" },
                  { label: L("Capital simulé", "Capital simulado", "Simulated capital"), value: challenge.label },
                  ...(quantity === 3 ? [{ label: L("Comptes créés", "Cuentas creadas", "Accounts created"), value: L("3 comptes", "3 cuentas", "3 accounts") }] : []),
                ].map((row, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{row.label}</span>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{row.value}</span>
                  </div>
                ))}
                {discount > 0 && <>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{L("Prix", "Precio", "Price")}</span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, textDecoration: "line-through" }}>{formatPrice(baseAmount)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>{L("Réduction", "Descuento", "Discount")} −{discount}%</span>
                    <span style={{ color: "#22c55e", fontSize: 13, fontWeight: 700 }}>−{formatPrice(baseAmount - discountedAmount)}</span>
                  </div>
                </>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 14 }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>{L("Total", "Total", "Total")}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: isFree ? "#22c55e" : "#fff" }}>
                    {isFree ? L("GRATUIT", "GRATIS", "FREE") : formatPrice(totalAmount)}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>{L("TVA incluse", "IVA incluido", "VAT included")}</div>
                </div>
              </div>
            </div>
          )}

          {/* Code promo */}
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
              {L("Code promo", "Código promo", "Promo code")}
            </div>
            {promoStatus !== "valid" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <input className="co-input" value={promoInput} onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoStatus("idle"); setPromoError(""); }}
                  onKeyDown={e => e.key === "Enter" && applyPromo()}
                  placeholder={L("ENTRER LE CODE", "INTRODUCIR CÓDIGO", "ENTER CODE")}
                  style={{ ...inp, flex: 1, fontWeight: 700, letterSpacing: "1.5px", fontFamily: "monospace" }} />
                <button onClick={applyPromo} disabled={!promoInput.trim() || promoStatus === "loading"}
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: promoInput.trim() ? "pointer" : "not-allowed", opacity: promoInput.trim() ? 1 : 0.4, whiteSpace: "nowrap" }}>
                  {promoStatus === "loading" ? "..." : L("Appliquer", "Aplicar", "Apply")}
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "10px 12px" }}>
                <div>
                  <span style={{ color: "#22c55e", fontWeight: 800, fontSize: 13, letterSpacing: "1px", fontFamily: "monospace" }}>{appliedCode}</span>
                  <span style={{ color: "#22c55e", fontSize: 12, marginLeft: 10 }}>−{discount}%{isFree ? ` · ${L("GRATUIT", "GRATIS", "FREE")}` : ""}</span>
                </div>
                <button onClick={removePromo} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", padding: 2 }}><X size={14} /></button>
              </div>
            )}
            {promoStatus === "error" && <div style={{ marginTop: 8, color: "#ef4444", fontSize: 12 }}>{promoError}</div>}
          </div>

          {/* CGV */}
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 12 }}>
              {L("Conditions Générales", "Condiciones Generales", "Terms & Conditions")}
            </div>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "12px 14px", maxHeight: 110, overflowY: "auto", marginBottom: 12 }}>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: "rgba(255,255,255,0.6)" }}>
                  {L("Résumé des points clés :", "Resumen de los puntos clave:", "Key points summary:")}
                </strong><br />
                {L(
                  "• Le trading sur notre plateforme est",
                  "• El trading en nuestra plataforma es",
                  "• Trading on our platform is"
                )}{" "}
                <strong style={{ color: "rgba(255,255,255,0.7)" }}>
                  {L("100% simulé", "100% simulado", "100% simulated")}
                </strong>
                {L(
                  " — aucun capital réel, aucun ordre exécuté sur les marchés.",
                  " — sin capital real, ninguna orden ejecutada en los mercados.",
                  " — no real capital, no orders executed on real markets."
                )}<br />
                {L(
                  "• Les Frais de Challenge sont",
                  "• Las Tarifas de Challenge son",
                  "• Challenge Fees are"
                )}{" "}
                <strong style={{ color: "rgba(255,255,255,0.7)" }}>
                  {L("non remboursables", "no reembolsables", "non-refundable")}
                </strong>
                {L(
                  " dès l'ouverture du premier trade (droit de rétractation de 14 jours avant tout trade).",
                  " desde la apertura del primer trade (derecho de desistimiento de 14 días antes de cualquier trade).",
                  " from the opening of the first trade (14-day withdrawal right before any trade)."
                )}<br />
                {L(
                  "• Le Challenge comporte",
                  "• El Challenge tiene",
                  "• The Challenge has"
                )}{" "}
                <strong style={{ color: "rgba(255,255,255,0.7)" }}>
                  {L("une étape", "una etapa", "one step")}
                </strong>
                {L(
                  ", un objectif de +6% et un Trailing Drawdown EOD de 3% ou 4% selon la taille choisie.",
                  ", un objetivo de +6% y un Trailing Drawdown EOD del 3% o 4% según el tamaño elegido.",
                  ", a profit target of +6% and a Trailing Drawdown EOD of 3% or 4% depending on the size chosen."
                )}<br />
                {L(
                  "• Après validation, l'activation du Compte Reward est soumise à des",
                  "• Tras la validación, la activación de la Cuenta Reward está sujeta a",
                  "• After validation, activation of the Reward Account is subject to"
                )}{" "}
                <strong style={{ color: "rgba(255,255,255,0.7)" }}>
                  {L("frais uniques distincts", "tarifas únicas distintas", "separate one-time fees")}
                </strong>
                {L(
                  " indiqués avant activation.",
                  " indicadas antes de la activación.",
                  " shown before activation."
                )}<br />
                {L(
                  "• En cas de violation des règles, nous pouvons résilier votre compte sans indemnité.",
                  "• En caso de violación de las reglas, podemos cancelar tu cuenta sin indemnización.",
                  "• In case of rule violation, we may terminate your account without compensation."
                )}<br />
                {L(
                  "• Droit applicable :",
                  "• Ley aplicable:",
                  "• Applicable law:"
                )}{" "}
                <strong style={{ color: "rgba(255,255,255,0.7)" }}>
                  {L("loi estonienne", "ley estonia", "Estonian law")}
                </strong>.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
              <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)}
                style={{ marginTop: 2, accentColor: "#D4A843", width: 14, height: 14, flexShrink: 0, cursor: "pointer" }} />
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, lineHeight: 1.5 }}>
                {L("J'ai lu et j'accepte les", "He leído y acepto las", "I have read and accept the")}{" "}
                <a href="/legal/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#D4A843", textDecoration: "underline", fontWeight: 700 }}>
                  {L("Conditions Générales de Vente et d'Utilisation", "Condiciones Generales de Venta y Uso", "General Terms of Sale and Use")}
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
            {!profileComplete && (
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>
                {L("Remplissez tous les champs pour continuer.", "Completa todos los campos para continuar.", "Fill in all fields to continue.")}
              </p>
            )}
            {profileComplete && !agreedToTerms && (
              <p style={{ textAlign: "center", color: "rgba(212,168,67,0.85)", fontSize: 12, margin: 0 }}>
                {L("Acceptez les CGV pour continuer.", "Acepta los T&C para continuar.", "Accept the T&C to continue.")}
              </p>
            )}

            {isFree ? (
              <div className="co-border">
                <button onClick={handleFree} disabled={anyLoading || !canPay} className="co-border-btn">
                  {loadingFree
                    ? L("Configuration...", "Configurando...", "Setting up...")
                    : <><span>🎉</span> {L("Accès gratuit", "Acceso gratuito", "Free access")} <ChevronRight size={16} /></>}
                </button>
              </div>
            ) : (<>
              <div className="co-border">
                <button onClick={handleStripe} disabled={anyLoading || !canPay} className="co-border-btn">
                  {loadingStripe
                    ? L("Redirection...", "Redirigiendo...", "Redirecting...")
                    : <><CreditCard size={17} /> {L("Payer par carte", "Pagar con tarjeta", "Pay by card")} <ChevronRight size={16} /></>}
                </button>
              </div>
              <div className="co-border">
                <button onClick={handleCrypto} disabled={anyLoading || !canPay} className="co-border-btn crypto">
                  {loadingCrypto
                    ? L("Redirection...", "Redirigiendo...", "Redirecting...")
                    : <><Bitcoin size={17} /> {L("Payer en crypto", "Pagar en cripto", "Pay in crypto")} <ChevronRight size={16} /></>}
                </button>
              </div>
            </>)}

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 }}>
              <ShieldCheck size={13} color="#D4A843" />
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, fontWeight: 600, letterSpacing: ".03em" }}>
                {L("Sécurisé par Stripe · SSL · Aucun abonnement", "Seguro con Stripe · SSL · Sin suscripción", "Secured by Stripe · SSL · No subscription")}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 7, marginTop: 4 }}>
              {[
                L("Accès rapide", "Acceso rápido", "Quick access"),
                L("Paiement unique", "Pago único", "One-time payment"),
                L("Support humain", "Soporte humano", "Human support"),
              ].map(item => (
                <div key={item} style={{ minHeight: 48, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "7px 4px", border: "1px solid rgba(255,255,255,.07)", borderRadius: 9, background: "rgba(255,255,255,.025)", color: "rgba(255,255,255,.42)", fontSize: 9, fontWeight: 700, textAlign: "center" }}>
                  <Check size={12} color="#D4A843" /> {item}
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
