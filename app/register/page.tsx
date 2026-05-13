"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>

      {/* Background glow */}
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Image src="/logo.jpg" alt="Elysium Funded" width={100} height={100} style={{ objectFit: "contain", mixBlendMode: "screen" }} />
        </div>

        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "40px 36px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px" }}>Create Account</h1>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Join the elite. Start your journey today.</p>

          {success ? (
            <div style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <p style={{ color: "#22c55e", fontWeight: 600, marginBottom: 8 }}>Check your email!</p>
              <p style={{ color: "#666", fontSize: 14 }}>We sent you a confirmation link. Click it to activate your account.</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "your@email.com" },
                { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "Minimum 8 characters" },
                { label: "Confirm Password", value: confirm, setter: setConfirm, type: "password", placeholder: "Repeat your password" },
              ].map(field => (
                <div key={field.label}>
                  <label style={{ color: "#888", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>{field.label}</label>
                  <input
                    type={field.type}
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    required
                    style={{
                      width: "100%", backgroundColor: "#141414", border: "1px solid #222",
                      borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15,
                      outline: "none", transition: "border 0.2s", boxSizing: "border-box",
                    }}
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                    onBlur={e => (e.target.style.borderColor = "#222")}
                  />
                </div>
              ))}

              {error && (
                <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "15px", fontSize: 14, marginTop: 8, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Creating account..." : "CREATE ACCOUNT"}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", color: "#555", fontSize: 14, marginTop: 24 }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "#C9A84C", fontWeight: 600, textDecoration: "none" }}>Log In</a>
          </p>
        </div>

        <p style={{ textAlign: "center", color: "#333", fontSize: 12, marginTop: 24 }}>
          By creating an account you agree to our{" "}
          <a href="#" style={{ color: "#555" }}>Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
