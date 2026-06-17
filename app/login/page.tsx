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
      redirectTo: "https://www.traders-rewards.eu/reset-password",
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
    width: "100%",
    backgroundColor: "#fff",
    border: "1.5px solid rgba(21,101,192,0.2)",
    borderRadius: 10,
    padding: "13px 16px",
    color: "#0D1B3E",
    fontSize: 15,
    outline: "none",
    transition: "border 0.2s",
    boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <a href="/"><Image src="/nouveau-logo.png" alt="Traders Rewards" width={110} height={110} style={{ objectFit: "contain" }} /></a>
        </div>

        <div style={{ backgroundColor: "#fff", border: "1.5px solid #0D1B3E", borderRadius: 20, padding: "40px 36px", boxShadow: "0 8px 40px rgba(21,101,192,0.12)" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, color: "#0D1B3E", letterSpacing: "-0.5px" }}>Welcome Back</h1>
          <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 28 }}>Log in to your Traders Rewards account.</p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ color: "#1565C0", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>EMAIL</label>
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
                onFocus={e => (e.target.style.borderColor = "#1565C0")}
                onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")}
              />
            </div>

            <div>
              <label style={{ color: "#1565C0", fontSize: 12, fontWeight: 700, display: "block", marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>PASSWORD</label>
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
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#7a90b0", padding: 0, display: "flex", alignItems: "center" }}>
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                {error}
              </div>
            )}

            <div style={{ textAlign: "right", marginTop: -8 }}>
              <button type="button" onClick={handleForgotPassword}
                style={{ background: "none", border: "none", color: "#7a90b0", fontSize: 13, cursor: "pointer", padding: 0 }}>
                Mot de passe oublié ?
              </button>
            </div>

            {resetSent && (
              <div style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 10, padding: "12px 16px", color: "#16a34a", fontSize: 14 }}>
                Email envoyé sur {email}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: "100%", padding: "15px", fontSize: 14, fontWeight: 800, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 8, background: "#0D1B3E", color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.2s" }}>
              {loading ? "Connexion..." : "LOG IN"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#7a90b0", fontSize: 14, marginTop: 24 }}>
            Pas encore de compte ?{" "}
            <a href="/#pricing" style={{ color: "#1565C0", fontWeight: 700, textDecoration: "none" }}>Acheter un challenge</a>
          </p>
        </div>

        <a href="/" style={{ display: "block", textAlign: "center", color: "#7a90b0", fontSize: 13, marginTop: 20, textDecoration: "none" }}>
          ← Retour au site
        </a>
      </div>
    </div>
  );
}
