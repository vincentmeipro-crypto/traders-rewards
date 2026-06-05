"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleForgotPassword = async () => {
    if (!email) { setError("Entre ton email d'abord"); return; }
    setError("");
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "https://www.elysium-rewards.com/reset-password",
    });
    setResetSent(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setLoading(false);
    if (error) { setError("Email ou mot de passe invalide"); return; }
    if (data.user?.email === "vincentmeipro@gmail.com") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", backgroundColor: "#141414", border: "1px solid #222",
    borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15,
    outline: "none", transition: "border 0.2s", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <a href="/"><Image src="/nouveau-logo.png" alt="Elysium" width={100} height={100} style={{ objectFit: "contain", mixBlendMode: "screen" }} /></a>
        </div>

        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "40px 36px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px" }}>Welcome Back</h1>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Log in to your Elysium account.</p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email */}
            <div>
              <label style={{ color: "#888", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                onBlur={e => (e.target.style.borderColor = "#222")}
              />
            </div>

            {/* Password with eye toggle */}
            <div>
              <label style={{ color: "#888", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>PASSWORD</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Votre mot de passe"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{ ...inputStyle, paddingRight: 48 }}
                  onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={e => (e.target.style.borderColor = "#222")}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555", padding: 0, display: "flex", alignItems: "center" }}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ textAlign: "right", marginTop: -8 }}>
              <button type="button" onClick={handleForgotPassword}
                style={{ background: "none", border: "none", color: "#555", fontSize: 13, cursor: "pointer", padding: 0 }}
                onMouseOver={e => (e.currentTarget.style.color = "#C9A84C")}
                onMouseOut={e => (e.currentTarget.style.color = "#555")}>
                Mot de passe oublié ?
              </button>
            </div>

            {resetSent && (
              <div style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 16px", color: "#22c55e", fontSize: 14 }}>
                Email envoyé sur {email}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "15px", fontSize: 14, marginTop: 8, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Connexion..." : "LOG IN"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#555", fontSize: 14, marginTop: 24 }}>
            Pas encore de compte ?{" "}
            <a href="/#pricing" style={{ color: "#C9A84C", fontWeight: 600, textDecoration: "none" }}>Acheter un challenge</a>
          </p>
        </div>

        <a href="/" style={{ display: "block", textAlign: "center", color: "#333", fontSize: 13, marginTop: 24, textDecoration: "none" }}
          onMouseOver={e => (e.currentTarget.style.color = "#C9A84C")}
          onMouseOut={e => (e.currentTarget.style.color = "#333")}>
          ← Retour au site
        </a>
      </div>
    </div>
  );
}
