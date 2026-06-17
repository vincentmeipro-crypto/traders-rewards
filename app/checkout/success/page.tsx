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
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 480, position: "relative", zIndex: 1 }}>
        <Image src="/nouveau-logo.png" alt="Traders Rewards" width={80} height={80} style={{ objectFit: "contain", marginBottom: 32 }} />

        <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #111", borderRadius: 20, padding: "48px 40px", boxShadow: "0 8px 40px rgba(21,101,192,0.08)" }}>
          <CheckCircle size={56} color="#22c55e" style={{ marginBottom: 24 }} />

          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, letterSpacing: "-0.5px", color: "#0D1B3E" }}>
            Payment Successful!
          </h1>
          <p style={{ color: "#7a90b0", fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
            Welcome to the elite. Your challenge account is being set up and will be ready shortly.
          </p>

          <div style={{ backgroundColor: "#f8fafc", borderRadius: 12, padding: "16px 20px", marginBottom: 32, fontSize: 13, color: "#7a90b0", border: "1px solid #e5e7eb" }}>
            Session ID: <span style={{ color: "#555", fontFamily: "monospace" }}>{sessionId?.slice(0, 20)}...</span>
          </div>

          <a href="/dashboard" className="btn-primary" style={{ display: "block", textAlign: "center", padding: "16px", fontSize: 15 }}>
            Go to Dashboard →
          </a>

          <p style={{ color: "#7a90b0", fontSize: 13, marginTop: 20 }}>
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
