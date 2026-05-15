"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("Invalid email or password"); return; }
    if (data.user?.email === "fundedelysium@gmail.com") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>

      <div style={{ position: "fixed", top: "30%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,168,76,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Image src="/logo.jpg" alt="Elysium Funded" width={100} height={100} style={{ objectFit: "contain", mixBlendMode: "screen" }} />
        </div>

        <div style={{ backgroundColor: "#0f0f0f", border: "1px solid #1e1e1e", borderRadius: 20, padding: "40px 36px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px" }}>Welcome Back</h1>
          <p style={{ color: "#555", fontSize: 14, marginBottom: 32 }}>Log in to your Elysium Funded account.</p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { label: "Email", value: email, setter: setEmail, type: "email", placeholder: "your@email.com" },
              { label: "Password", value: password, setter: setPassword, type: "password", placeholder: "Your password" },
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

            <div style={{ textAlign: "right", marginTop: -8 }}>
              <a href="#" style={{ color: "#555", fontSize: 13, textDecoration: "none" }}
                onMouseOver={e => (e.currentTarget.style.color = "#C9A84C")}
                onMouseOut={e => (e.currentTarget.style.color = "#555")}>
                Forgot password?
              </a>
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "15px", fontSize: 14, marginTop: 8, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Logging in..." : "LOG IN"}
            </button>
          </form>

          <p style={{ textAlign: "center", color: "#555", fontSize: 14, marginTop: 24 }}>
            No account yet?{" "}
            <a href="/register" style={{ color: "#C9A84C", fontWeight: 600, textDecoration: "none" }}>Create one</a>
          </p>
        </div>

        <a href="/" style={{ display: "block", textAlign: "center", color: "#333", fontSize: 13, marginTop: 24, textDecoration: "none" }}
          onMouseOver={e => (e.currentTarget.style.color = "#C9A84C")}
          onMouseOut={e => (e.currentTarget.style.color = "#333")}>
          ← Back to home
        </a>
      </div>
    </div>
  );
}
