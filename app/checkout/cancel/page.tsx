import Image from "next/image";
import { XCircle } from "lucide-react";

export default function CancelPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <Image src="/nouveau-logo.png" alt="Elysium" width={80} height={80} style={{ objectFit: "contain", mixBlendMode: "screen", marginBottom: 32 }} />

        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "48px 40px" }}>
          <XCircle size={56} color="#ef4444" style={{ marginBottom: 24 }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Payment Cancelled</h1>
          <p style={{ color: "#666", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
            No worries — your payment was not processed. You can try again whenever you&apos;re ready.
          </p>
          <a href="/#pricing" className="btn-primary" style={{ display: "block", textAlign: "center", padding: "14px", fontSize: 14 }}>
            Back to Challenges
          </a>
          <a href="/dashboard" style={{ display: "block", textAlign: "center", color: "#555", fontSize: 13, marginTop: 16, textDecoration: "none" }}>
            Go to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
