"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function GateForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const from         = searchParams.get("from") ?? "/";

  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/site-access", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ password }),
      });

      if (res.ok) {
        router.replace(from.startsWith("/") ? from : "/");
      } else {
        setError("Mot de passe incorrect.");
        setPassword("");
      }
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{
      minHeight:       "100svh",
      background:      "#000",
      display:         "flex",
      alignItems:      "center",
      justifyContent:  "center",
      padding:         "24px",
      fontFamily:      "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{
        width:        "100%",
        maxWidth:     380,
        background:   "linear-gradient(145deg, #151719, #0a0a0a 70%)",
        border:       "1px solid rgba(183,110,121,0.28)",
        borderRadius: 20,
        padding:      "40px 32px",
        boxShadow:    "0 32px 80px rgba(0,0,0,0.75), inset 0 1px rgba(255,255,255,0.07)",
      }}>
        {/* Logo / titre */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize:      11,
            fontWeight:    800,
            letterSpacing: "3px",
            color:         "#D8A39D",
            textTransform: "uppercase",
            marginBottom:  10,
          }}>
            ACCÈS PRIVÉ
          </div>
          <div style={{
            fontSize:   22,
            fontWeight: 900,
            color:      "#fff",
            lineHeight: 1.2,
          }}>
            Traders Rewards
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              autoFocus
              required
              disabled={loading}
              style={{
                width:           "100%",
                boxSizing:       "border-box",
                padding:         "13px 16px",
                background:      "rgba(255,255,255,0.06)",
                border:          `1px solid ${error ? "rgba(255,80,80,0.5)" : "rgba(255,255,255,0.14)"}`,
                borderRadius:    10,
                color:           "#fff",
                fontSize:        15,
                outline:         "none",
                transition:      "border-color 200ms",
              }}
            />
          </div>

          {error && (
            <div style={{
              marginBottom: 14,
              fontSize:     13,
              color:        "rgba(255,100,100,0.9)",
              textAlign:    "center",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width:        "100%",
              padding:      "13px",
              background:   loading || !password
                ? "rgba(183,110,121,0.35)"
                : "linear-gradient(135deg, #B76E79, #D8A39D)",
              border:       "none",
              borderRadius: 10,
              color:        "#fff",
              fontSize:     15,
              fontWeight:   800,
              cursor:       loading || !password ? "not-allowed" : "pointer",
              transition:   "opacity 200ms",
              letterSpacing: "0.5px",
            }}
          >
            {loading ? "Vérification…" : "Accéder au site"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function GatePage() {
  return (
    <Suspense>
      <GateForm />
    </Suspense>
  );
}
