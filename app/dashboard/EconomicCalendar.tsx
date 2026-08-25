"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock } from "lucide-react";
import styles from "./EconomicCalendar.module.css";

type EconomicEvent = {
  title?: string;
  country?: string;
  date?: string;
  impact?: string;
  forecast?: string;
  previous?: string;
  actual?: string;
};

type CurrencyFilter = "both" | "USD" | "EUR";

const IMPACT_COLORS: Record<string, string> = {
  High: "#ef4444",
  Medium: "#f59e0b",
  Low: "#9CCFEA",
  Holiday: "#64748b",
};

function eventDate(event: EconomicEvent): Date | null {
  if (!event.date) return null;
  const parsed = new Date(event.date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function impactLabel(impact: string | undefined, isFr: boolean): string {
  if (impact === "High") return isFr ? "Fort ***" : "High ***";
  if (impact === "Medium") return isFr ? "Moyen **" : "Medium **";
  if (impact === "Low") return isFr ? "Faible *" : "Low *";
  return impact ?? "—";
}

function CountryFlag({ country }: { country: "USD" | "EUR" }) {
  if (country === "USD") {
    return (
      <svg className={styles.flag} viewBox="0 0 28 18" role="img" aria-label="États-Unis">
        <rect width="28" height="18" rx="2" fill="#fff" />
        {[0, 4, 8, 12, 16].map(y => <rect key={y} y={y} width="28" height="2" fill="#d64b4b" />)}
        <rect width="12" height="10" rx="1" fill="#3155a6" />
        <path d="M2 2h8M2 5h8M2 8h8" stroke="#fff" strokeWidth="1" strokeDasharray="1 1" />
      </svg>
    );
  }

  return (
    <svg className={styles.flag} viewBox="0 0 28 18" role="img" aria-label="Union européenne">
      <rect width="28" height="18" rx="2" fill="#174ea6" />
      {[[19, 9], [18.33, 11.5], [16.5, 13.33], [14, 14], [11.5, 13.33], [9.67, 11.5], [9, 9], [9.67, 6.5], [11.5, 4.67], [14, 4], [16.5, 4.67], [18.33, 6.5]].map(([cx, cy], index) => (
        <circle key={index} cx={cx} cy={cy} r=".75" fill="#ffd84d" />
      ))}
    </svg>
  );
}
export default function EconomicCalendar({ isFr }: { isFr: boolean }) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [currency, setCurrency] = useState<CurrencyFilter>("both");
  const [upcomingCutoff, setUpcomingCutoff] = useState(0);

  useEffect(() => {
    let active = true;
    const loadEvents = async () => {
      try {
        const response = await fetch("/api/calendar", { cache: "no-store" });
        const data: unknown = response.ok ? await response.json() : [];
        if (active) {
          setEvents(Array.isArray(data) ? data : []);
          setUpcomingCutoff(Date.now() - 2 * 60 * 60 * 1000);
        }
      } catch {
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadEvents();
    return () => { active = false; };
  }, []);

  const visibleEvents = useMemo(() => {
    const filtered = events
      .filter(event => event.impact === "High")                               // fort impact uniquement
      .filter(event => event.country === "USD" || event.country === "EUR")
      .filter(event => currency === "both" || event.country === currency)
      .map(event => ({ event, date: eventDate(event) }))
      .filter((item): item is { event: EconomicEvent; date: Date } => item.date !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const upcoming = filtered.filter(item => item.date.getTime() >= upcomingCutoff);
    return (upcoming.length ? upcoming : filtered.slice(-8)).slice(0, 8);
  }, [currency, events, upcomingCutoff]);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <div className={styles.heading}>
          <div className={styles.icon}><CalendarClock size={18} /></div>
          <div>
            <h2>{isFr ? "Calendrier économique" : "Economic calendar"}</h2>
            <p>
              {isFr ? "Annonces à fort impact · heure de Paris" : "High-impact events · Paris time"}
              <span className={styles.impactBadge}>★★★</span>
            </p>
          </div>
        </div>
        <div className={styles.filters}>
          {(["both", "USD", "EUR"] as CurrencyFilter[]).map(filter => (
            <button className={currency === filter ? styles.filterActive : styles.filter} key={filter} onClick={() => setCurrency(filter)}>
              {filter === "both" ? "USD + EUR" : <><CountryFlag country={filter} />{filter}</>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className={styles.state}>{isFr ? "Chargement des annonces…" : "Loading events…"}</div>
      ) : failed ? (
        <div className={styles.state}>{isFr ? "Données indisponibles." : "Data unavailable."}</div>
      ) : visibleEvents.length === 0 ? (
        <div className={styles.state}>{isFr ? "Aucune annonce à fort impact prévue pour le moment." : "No high-impact event scheduled right now."}</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <span>{isFr ? "Date" : "Date"}</span><span>{isFr ? "Devise" : "Currency"}</span><span>{isFr ? "Annonce" : "Event"}</span><span>{isFr ? "Prévision" : "Forecast"}</span><span>{isFr ? "Précédent" : "Previous"}</span>
          </div>
          {visibleEvents.map(({ event, date }, index) => {
            const impactColor = IMPACT_COLORS[event.impact ?? ""] ?? "#64748b";
            return (
              <div className={styles.row} key={`${event.country}-${event.title}-${event.date}-${index}`}>
                <div className={styles.date}><strong>{date.toLocaleTimeString(isFr ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}</strong><span>{date.toLocaleDateString(isFr ? "fr-FR" : "en-GB", { weekday: "short", day: "2-digit", month: "short", timeZone: "Europe/Paris" })}</span></div>
                <div className={styles.currency}><CountryFlag country={event.country === "USD" ? "USD" : "EUR"} /><b>{event.country}</b></div>
                <div className={styles.event}><strong>{event.title ?? "—"}</strong><span><i style={{ background: impactColor }} />{impactLabel(event.impact, isFr)}</span></div>
                <div className={styles.value}><small>{isFr ? "Prévision" : "Forecast"}</small>{event.forecast || "—"}</div>
                <div className={styles.value}><small>{isFr ? "Précédent" : "Previous"}</small>{event.previous || "—"}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.footer}>
        <span>{isFr ? "Données actualisées toutes les 15 minutes" : "Data refreshed every 15 minutes"}</span>
        <Link href="/trader">{isFr ? "Voir le calendrier complet" : "Open full calendar"}<ArrowRight size={13} /></Link>
      </div>
    </section>
  );
}
