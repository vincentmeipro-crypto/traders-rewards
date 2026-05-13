"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { CheckCircle } from "lucide-react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); window.location.href = "/dashboard"; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ textAlign: "center", maxWidth: 480, position: "relative", zIndex: 1 }}>
        <Image src="/logo.jpg" alt="Elysium Funded" width={80} height={80} style={{ objectFit: "contain", mixBlendMode: "screen", marginBottom: 32 }} />

        <div style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "48px 40px" }}>
          <CheckCircle size={56} color="#22c55e" style={{ marginBottom: 24 }} />

          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, letterSpacing: "-0.5px" }}>
            Payment Successful!
          </h1>
          <p style={{ color: "#888", fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
            Welcome to the elite. Your challenge account is being set up and will be ready shortly.
          </p>

          <div style={{ backgroundColor: "#0a0a0a", borderRadius: 12, padding: "16px 20px", marginBottom: 32, fontSize: 13, color: "#555" }}>
            Session ID: <span style={{ color: "#444", fontFamily: "monospace" }}>{sessionId?.slice(0, 20)}...</span>
          </div>

          <a href="/dashboard" className="btn-primary" style={{ display: "block", textAlign: "center", padding: "16px", fontSize: 15 }}>
            Go to Dashboard →
          </a>

          <p style={{ color: "#333", fontSize: 13, marginTop: 20 }}>
            Redirecting automatically in {countdown}s...
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return <Suspense><SuccessContent /></Suspense>;
}
