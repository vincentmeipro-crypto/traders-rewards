"use client";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    const token_hash = params.get("token_hash");
    const type = params.get("type");

    if (token_hash && type === "recovery") {
      // PKCE flow : Supabase redirige avec token_hash dans l'URL
      supabase.auth.verifyOtp({ token_hash, type: "recovery" }).then(({ error }) => {
        if (error) setError("Lien invalide ou expiré. Demandez un nouveau lien depuis votre email.");
        else setReady(true);
      });
      return;
    }

    // Fallback : flow implicite (hash dans l'URL)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Le mot de passe doit faire au moins 8 caractères."); return; }
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2500);
  };

  const inp: React.CSSProperties = {
    width: "100%", backgroundColor: "#f8fafc", border: "1.5px solid rgba(21,101,192,0.2)",
    borderRadius: 10, padding: "13px 16px", color: "#0D1B3E", fontSize: 15,
    outline: "none", transition: "border 0.2s", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <a href="/"><Image src="/nouveau-logo.png" alt="Traders Rewards" width={100} height={100} style={{ objectFit: "contain" }} /></a>
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "1.5px solid rgba(21,101,192,0.15)", borderRadius: 20, padding: "40px 36px", boxShadow: "0 8px 40px rgba(21,101,192,0.08)" }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "#0D1B3E" }}>Mot de passe mis à jour</h1>
              <p style={{ color: "#7a90b0", fontSize: 14 }}>Redirection vers votre dashboard...</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px", color: "#0D1B3E" }}>Nouveau mot de passe</h1>
              <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>Choisissez un nouveau mot de passe pour votre compte Traders Rewards.</p>

              {!ready && (
                <div style={{ color: "#7a90b0", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
                  Vérification du lien en cours...
                </div>
              )}

              {ready && (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ color: "#555", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>Nouveau mot de passe</label>
                    <div style={{ position: "relative" }}>
                      <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 caractères" required style={{ ...inp, paddingRight: 48 }} onFocus={e => (e.target.style.borderColor = "#1565C0")} onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")} />
                      <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555", padding: 0 }}>
                        {showPassword ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "#555", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>Confirmer</label>
                    <div style={{ position: "relative" }}>
                      <input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Répéter le mot de passe" required style={{ ...inp, paddingRight: 48, borderColor: confirm ? (confirm === password ? "#22c55e" : "#ef4444") : "rgba(21,101,192,0.2)" }} />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#555", padding: 0 }}>
                        {showConfirm ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "15px", fontSize: 14, marginTop: 8, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                    {loading ? "Mise à jour..." : "CONFIRMER"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>

        <a href="/login" style={{ display: "block", textAlign: "center", color: "#7a90b0", fontSize: 13, marginTop: 24, textDecoration: "none" }}
          onMouseOver={e => (e.currentTarget.style.color = "#1565C0")}
          onMouseOut={e => (e.currentTarget.style.color = "#7a90b0")}>
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordContent /></Suspense>;
}
