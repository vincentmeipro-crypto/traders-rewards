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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Supabase embeds the token in the URL hash — exchange it for a session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setReady(true);
      } else {
        // Try to pick up the recovery token from the URL fragment
        supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY") setReady(true);
        });
      }
    });
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
    width: "100%", backgroundColor: "#141414", border: "1px solid #222",
    borderRadius: 10, padding: "13px 16px", color: "#fff", fontSize: 15,
    outline: "none", transition: "border 0.2s", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <a href="/"><Image src="/logo-elysium-rewards.png" alt="Elysium" width={100} height={100} style={{ objectFit: "contain", mixBlendMode: "screen" }} /></a>
        </div>

        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "40px 36px" }}>
          {success ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
              <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Mot de passe mis à jour</h1>
              <p style={{ color: "#555", fontSize: 14 }}>Redirection vers votre dashboard...</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px" }}>Nouveau mot de passe</h1>
              <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Choisissez un nouveau mot de passe pour votre compte Elysium.</p>

              {!ready && (
                <div style={{ color: "#888", fontSize: 14, textAlign: "center", padding: "20px 0" }}>
                  Vérification du lien en cours...
                </div>
              )}

              {ready && (
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ color: "#888", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>Nouveau mot de passe</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 caractères"
                      required
                      style={inp}
                      onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                      onBlur={e => (e.target.style.borderColor = "#222")}
                    />
                  </div>
                  <div>
                    <label style={{ color: "#888", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>Confirmer</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Répéter le mot de passe"
                      required
                      style={{ ...inp, borderColor: confirm ? (confirm === password ? "#22c55e" : "#ef4444") : "#222" }}
                      onFocus={e => (e.target.style.borderColor = confirm === password ? "#22c55e" : "#ef4444")}
                      onBlur={e => (e.target.style.borderColor = confirm ? (confirm === password ? "#22c55e" : "#ef4444") : "#222")}
                    />
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

        <a href="/login" style={{ display: "block", textAlign: "center", color: "#333", fontSize: 13, marginTop: 24, textDecoration: "none" }}
          onMouseOver={e => (e.currentTarget.style.color = "#C9A84C")}
          onMouseOut={e => (e.currentTarget.style.color = "#333")}>
          ← Retour à la connexion
        </a>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordContent /></Suspense>;
}
