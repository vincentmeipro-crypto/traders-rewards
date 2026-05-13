"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";
import { Shield, Clock, RefreshCw, ChevronRight } from "lucide-react";

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

function CheckoutContent() {
  const params = useSearchParams();
  const router = useRouter();
  const productId = params.get("product") || "50k-2step";
  const challenge = CHALLENGES[productId as keyof typeof CHALLENGES] || CHALLENGES["50k-2step"];
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ id: data.user.id, email: data.user.email! });
    });
  }, []);

  const handleStripe = async () => {
    if (!user) { router.push("/login"); return; }
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, userId: user.id, userEmail: user.email }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  };

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
              <div style={{ color: "#555", fontSize: 13, marginTop: 4 }}>{challenge.model} Model · Elysium Funded</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: "#C9A84C" }}>{challenge.price}</div>
          </div>

          <div style={{ padding: "16px 0", borderBottom: "1px solid #1a1a1a" }}>
            {[
              { icon: <RefreshCw size={14} />, text: "Fee refunded at first payout" },
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
            <span style={{ fontSize: 28, fontWeight: 900 }}>{challenge.price}</span>
          </div>
        </div>

        {/* Payment buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button onClick={handleStripe} disabled={loading} className="btn-primary"
            style={{ width: "100%", padding: "16px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
            {loading ? "Redirecting..." : (
              <><span>💳</span> Pay with Card <ChevronRight size={16} /></>
            )}
          </button>

          <button className="btn-secondary"
            style={{ width: "100%", padding: "16px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, opacity: 0.5, cursor: "not-allowed" }}>
            <span>₿</span> Pay with Crypto (coming soon)
          </button>
        </div>

        <p style={{ textAlign: "center", color: "#333", fontSize: 12, marginTop: 20 }}>
          Secured by Stripe · SSL encrypted · No subscription
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
