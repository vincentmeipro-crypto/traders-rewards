"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type CalEvent = {
  title: string;
  country: string;
  date: string;
  time: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
};

const IMPACT_COLOR: Record<string, string> = {
  High:    "#ef4444",
  Medium:  "#f97316",
  Low:     "#22c55e",
  Holiday: "#555",
};

const CURRENCY_FLAG: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", AUD: "🇦🇺", CAD: "🇨🇦",
  CHF: "🇨🇭", JPY: "🇯🇵", NZD: "🇳🇿", CNY: "🇨🇳", CNH: "🇨🇳",
  HKD: "🇭🇰", SGD: "🇸🇬", KRW: "🇰🇷", BRL: "🇧🇷", MXN: "🇲🇽",
  ZAR: "🇿🇦", TRY: "🇹🇷", SEK: "🇸🇪", NOK: "🇳🇴", DKK: "🇩🇰",
  INR: "🇮🇳", PLN: "🇵🇱",
};

const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function normalizeDate(dateStr: string): string {
  const s = dateStr.trim();
  // If starts with YYYY-MM-DD, grab just the date part directly (most reliable)
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // Fallback: parse and use UTC date
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

function groupByDate(events: CalEvent[]) {
  const map: Record<string, CalEvent[]> = {};
  for (const ev of events) {
    const key = normalizeDate(ev.date);
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  }
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

function formatDate(dateStr: string, isFr: boolean) {
  const d = new Date(dateStr);
  const day = isFr ? DAYS_FR[d.getDay()] : DAYS_EN[d.getDay()];
  return `${day} ${d.getDate()}/${d.getMonth() + 1}`;
}

export default function TraderPage() {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"calendar" | "platform">("calendar");
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "High" | "Medium" | "Low">("All");
  const isFr = lang === "fr";

  useEffect(() => {
    if (tab !== "calendar") return;
    setLoading(true);
    fetch("/api/calendar")
      .then(r => r.json())
      .then(data => { setEvents(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  const filtered = events.filter(e => filter === "All" || e.impact === filter);
  const grouped = groupByDate(filtered);

  const labels = {
    title:    isFr ? "Espace Trader" : "Trader Hub",
    sub:      isFr ? "Vos outils de trading au même endroit." : "Your trading tools in one place.",
    calTab:   isFr ? "Annonces Économiques" : "Economic Announcements",
    platTab:  isFr ? "Plateforme de Trading" : "Trading Platform",
    all:      isFr ? "Tout" : "All",
    high:     isFr ? "Élevé" : "High",
    medium:   isFr ? "Moyen" : "Medium",
    low:      isFr ? "Faible" : "Low",
    time:     isFr ? "Heure" : "Time",
    currency: isFr ? "Devise" : "Currency",
    event:    isFr ? "Événement" : "Event",
    impact:   isFr ? "Impact" : "Impact",
    actual:   isFr ? "Actuel" : "Actual",
    forecast: isFr ? "Prévision" : "Forecast",
    previous: isFr ? "Précédent" : "Previous",
    loading:  isFr ? "Chargement..." : "Loading...",
    noData:   isFr ? "Aucun événement pour cette semaine." : "No events for this week.",
    mt5Desc:  isFr
      ? "Accédez à votre compte certifié depuis MetaTrader 5, la référence des traders professionnels."
      : "Access your certified account from MetaTrader 5, the reference for professional traders.",
    mt5Btn:   isFr ? "Télécharger MT5" : "Download MT5",
  };

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "100vh", paddingTop: 140, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, letterSpacing: "-1px", marginBottom: 8 }}>
            {labels.title}
          </h1>
          <p style={{ color: "#555", fontSize: 15, marginBottom: 40 }}>{labels.sub}</p>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid #2A2A38", marginBottom: 32 }}>
            {(["calendar", "platform"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "12px 28px", background: "none", border: "none",
                borderBottom: tab === t ? "2px solid #00C2FF" : "2px solid transparent",
                color: tab === t ? "#00C2FF" : "#555",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                marginBottom: -1, letterSpacing: "0.3px", transition: "color 0.2s",
              }}>
                {t === "calendar" ? labels.calTab : labels.platTab}
              </button>
            ))}
          </div>

          {/* ── CALENDAR ── */}
          {tab === "calendar" && (
            <div>
              {/* Filters */}
              <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
                {(["All", "High", "Medium", "Low"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={{
                    padding: "6px 18px", borderRadius: 100, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.2s",
                    border: filter === f ? `1px solid ${f === "All" ? "#00C2FF" : IMPACT_COLOR[f]}` : "1px solid #222",
                    backgroundColor: filter === f ? (f === "All" ? "rgba(45,125,210,0.15)" : `${IMPACT_COLOR[f]}22`) : "transparent",
                    color: filter === f ? (f === "All" ? "#00C2FF" : IMPACT_COLOR[f]) : "#555",
                  }}>
                    {f === "All" ? labels.all : f === "High" ? labels.high : f === "Medium" ? labels.medium : labels.low}
                  </button>
                ))}
              </div>

              {loading ? (
                <div style={{ textAlign: "center", color: "#555", padding: 80, fontSize: 14 }}>{labels.loading}</div>
              ) : grouped.length === 0 ? (
                <div style={{ textAlign: "center", color: "#555", padding: 80, fontSize: 14 }}>{labels.noData}</div>
              ) : (
                grouped.map(([date, evs]) => (
                  <div key={date} style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, borderLeft: "3px solid #00C2FF", paddingLeft: 12 }}>
                      <span style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>{formatDate(date, isFr)}</span>
                      <span style={{ color: "#444", fontSize: 12 }}>{evs.length} {isFr ? "annonce(s)" : "event(s)"}</span>
                    </div>
                    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                          <thead>
                            <tr style={{ backgroundColor: "#1a1a24", borderBottom: "1px solid #2A2A38" }}>
                              {[labels.time, labels.currency, labels.event, labels.impact, labels.forecast, labels.previous, labels.actual].map((h, i) => (
                                <th key={i} style={{ padding: "11px 14px", color: "#00C2FF", fontWeight: 700, textAlign: i < 3 ? "left" : "center", fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {evs.map((ev, i) => (
                              <tr key={i} style={{ borderBottom: i < evs.length - 1 ? "1px solid #111" : "none", backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                                <td style={{ padding: "11px 14px", color: "#888", fontWeight: 600, whiteSpace: "nowrap" }}>{ev.time}</td>
                                <td style={{ padding: "11px 14px" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                    <span style={{ fontSize: 16 }}>{CURRENCY_FLAG[ev.country] || "🏳️"}</span>
                                    <span style={{ backgroundColor: "rgba(45,125,210,0.15)", color: "#00C2FF", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 4 }}>{ev.country}</span>
                                  </span>
                                </td>
                                <td style={{ padding: "11px 14px", color: "#ccc", fontWeight: 500, minWidth: 200 }}>{ev.title}</td>
                                <td style={{ padding: "11px 14px", textAlign: "center" }}>
                                  <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", backgroundColor: IMPACT_COLOR[ev.impact] || "#555" }} />
                                </td>
                                <td style={{ padding: "11px 14px", textAlign: "center", color: "#888" }}>{ev.forecast || "—"}</td>
                                <td style={{ padding: "11px 14px", textAlign: "center", color: "#888" }}>{ev.previous || "—"}</td>
                                <td style={{ padding: "11px 14px", textAlign: "center", fontWeight: 700, color: ev.actual ? "#22c55e" : "#333" }}>{ev.actual || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── PLATFORM ── */}
          {tab === "platform" && (
            <div style={{ maxWidth: 400 }}>
              <div className="card" style={{ padding: 40, textAlign: "center" }}>
                <img src="/MT5.png" alt="MetaTrader 5" style={{ height: 80, width: "auto", objectFit: "contain", marginBottom: 24 }} />
                <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>MetaTrader 5</h3>
                <p style={{ color: "#666", fontSize: 14, lineHeight: 1.8, marginBottom: 28 }}>{labels.mt5Desc}</p>
                <a href="https://download.mql5.com/cdn/web/metaquotes.software.corp/mt5/mt5setup.exe" target="_blank" rel="noopener noreferrer"
                  className="btn-primary btn-primary-animated" style={{ display: "inline-block", padding: "13px 32px", fontSize: 13 }}>
                  {labels.mt5Btn}
                </a>
              </div>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </>
  );
}
