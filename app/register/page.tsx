"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

const DIAL_CODES = [
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+32", flag: "🇧🇪", name: "Belgique" },
  { code: "+41", flag: "🇨🇭", name: "Suisse" },
  { code: "+352", flag: "🇱🇺", name: "Luxembourg" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+49", flag: "🇩🇪", name: "Allemagne" },
  { code: "+34", flag: "🇪🇸", name: "Espagne" },
  { code: "+39", flag: "🇮🇹", name: "Italie" },
  { code: "+31", flag: "🇳🇱", name: "Pays-Bas" },
  { code: "+351", flag: "🇵🇹", name: "Portugal" },
  { code: "+48", flag: "🇵🇱", name: "Pologne" },
  { code: "+46", flag: "🇸🇪", name: "Suède" },
  { code: "+45", flag: "🇩🇰", name: "Danemark" },
  { code: "+47", flag: "🇳🇴", name: "Norvège" },
  { code: "+358", flag: "🇫🇮", name: "Finlande" },
  { code: "+43", flag: "🇦🇹", name: "Autriche" },
  { code: "+420", flag: "🇨🇿", name: "Tchéquie" },
  { code: "+36", flag: "🇭🇺", name: "Hongrie" },
  { code: "+40", flag: "🇷🇴", name: "Roumanie" },
  { code: "+212", flag: "🇲🇦", name: "Maroc" },
  { code: "+213", flag: "🇩🇿", name: "Algérie" },
  { code: "+216", flag: "🇹🇳", name: "Tunisie" },
  { code: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "+971", flag: "🇦🇪", name: "Émirats" },
  { code: "+966", flag: "🇸🇦", name: "Arabie Saoudite" },
  { code: "+1-CA", flag: "🇨🇦", name: "Canada" },
  { code: "+55", flag: "🇧🇷", name: "Brésil" },
  { code: "+52", flag: "🇲🇽", name: "Mexique" },
  { code: "+54", flag: "🇦🇷", name: "Argentine" },
  { code: "+61", flag: "🇦🇺", name: "Australie" },
  { code: "+81", flag: "🇯🇵", name: "Japon" },
  { code: "+86", flag: "🇨🇳", name: "Chine" },
  { code: "+91", flag: "🇮🇳", name: "Inde" },
  { code: "+7", flag: "🇷🇺", name: "Russie" },
  { code: "+90", flag: "🇹🇷", name: "Turquie" },
  { code: "+27", flag: "🇿🇦", name: "Afrique du Sud" },
];

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [dialCode, setDialCode] = useState("+33");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!birthDate) { setError("Date de naissance requise"); return; }
    const birth = new Date(birthDate);
    const today = new Date();
    const age = today.getFullYear() - birth.getFullYear() - (
      today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0
    );
    if (age < 18) { setError("Vous devez avoir au moins 18 ans pour vous inscrire."); return; }
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const fullPhone = phone ? `${dialCode.replace("-CA", "")} ${phone}` : "";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { phone: fullPhone, birth_date: birthDate } },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
  };

  const inputStyle = {
    width: "100%", backgroundColor: "#f8fafc", border: "1.5px solid rgba(21,101,192,0.2)",
    borderRadius: 10, padding: "13px 16px", color: "#0D1B3E", fontSize: 15,
    outline: "none", transition: "border 0.2s", boxSizing: "border-box" as const,
  };

  const labelStyle = {
    color: "#555", fontSize: 13, fontWeight: 600, display: "block",
    marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" as const,
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>

      <div style={{ width: "100%", maxWidth: 440, position: "relative", zIndex: 1 }}>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <a href="/"><Image src="/logo-nom-noir.png" alt="Traders Rewards" width={100} height={100} style={{ objectFit: "contain" }} /></a>
        </div>

        <div style={{ backgroundColor: "#ffffff", border: "1.5px solid #111", borderRadius: 20, padding: "40px 36px", boxShadow: "0 8px 40px rgba(21,101,192,0.08)" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.5px", color: "#0D1B3E" }}>Create Account</h1>
          <p style={{ color: "#7a90b0", fontSize: 14, marginBottom: 32 }}>Join the elite. Start your journey today.</p>

          {success ? (
            <div style={{ backgroundColor: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 12, padding: 20, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
              <p style={{ color: "#16a34a", fontWeight: 600, marginBottom: 8 }}>Check your email!</p>
              <p style={{ color: "#555", fontSize: 14 }}>We sent you a confirmation link. Click it to activate your account.</p>
            </div>
          ) : (
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")} />
              </div>

              {/* Téléphone avec indicatif */}
              <div>
                <label style={labelStyle}>Phone Number</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={dialCode} onChange={e => setDialCode(e.target.value)}
                    style={{
                      backgroundColor: "#f8fafc", border: "1.5px solid rgba(21,101,192,0.2)", borderRadius: 10,
                      padding: "13px 10px", color: "#0D1B3E", fontSize: 14, outline: "none",
                      cursor: "pointer", flexShrink: 0, width: 110,
                    }}>
                    {DIAL_CODES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code.replace("-CA", "")}
                      </option>
                    ))}
                  </select>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="6 12 34 56 78" style={{ ...inputStyle }}
                    onFocus={e => (e.target.style.borderColor = "#C9A84C")}
                    onBlur={e => (e.target.style.borderColor = "#222")} />
                </div>
              </div>

              {/* Date de naissance */}
              <div>
                <label style={labelStyle}>Date de naissance</label>
                <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                  required max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split("T")[0]}
                  style={{ ...inputStyle, colorScheme: "light" }}
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")} />
                <p style={{ color: "#555", fontSize: 12, marginTop: 4 }}>Vous devez avoir 18 ans ou plus.</p>
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}>Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")} />
              </div>

              {/* Confirm Password */}
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat your password" required style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#1565C0")}
                  onBlur={e => (e.target.style.borderColor = "rgba(21,101,192,0.2)")} />
              </div>

              {error && (
                <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "12px 16px", color: "#ef4444", fontSize: 14 }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary"
                style={{ width: "100%", padding: "15px", fontSize: 14, marginTop: 8, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
                {loading ? "Creating account..." : "CREATE ACCOUNT"}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", color: "#7a90b0", fontSize: 14, marginTop: 24 }}>
            Already have an account?{" "}
            <a href="/login" style={{ color: "#1565C0", fontWeight: 600, textDecoration: "none" }}>Log In</a>
          </p>
        </div>

        <p style={{ textAlign: "center", color: "#333", fontSize: 12, marginTop: 24 }}>
          By creating an account you agree to our{" "}
          <a href="/legal/terms" style={{ color: "#555" }}>Terms of Service</a>
        </p>
      </div>
    </div>
  );
}
