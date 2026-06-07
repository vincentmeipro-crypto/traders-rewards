"use client";

const TRADERS = [
  { name: "Karim B.",       flag: "fr", payout: 3187.54,  size: "$100K", initials: "KB" },
  { name: "Marco V.",       flag: "it", payout: 3094.51,  size: "$100K", initials: "MV" },
  { name: "Thomas D.",      flag: "fr", payout: 1847.32,  size: "$50K",  initials: "TD" },
  { name: "Antoine M.",     flag: "be", payout: 4213.78,  size: "$100K", initials: "AM" },
  { name: "Mathieu R.",     flag: "fr", payout: 3731.18,  size: "$100K", initials: "MR" },
  { name: "Alexandre P.",   flag: "fr", payout: 3847.64,  size: "$100K", initials: "AP" },
  { name: "Sarah L.",       flag: "gb", payout: 2196.83,  size: "$50K",  initials: "SL" },
  { name: "Carlos G.",      flag: "es", payout: 1438.29,  size: "$50K",  initials: "CG" },
  { name: "Camille F.",     flag: "fr", payout: 2941.67,  size: "$100K", initials: "CF" },
  { name: "Nicolas B.",     flag: "fr", payout: 4638.92,  size: "$100K", initials: "NB" },
  { name: "Jean-Pierre D.", flag: "fr", payout: 4612.89,  size: "$100K", initials: "JP" },
  { name: "Lukas W.",       flag: "ch", payout: 3574.36,  size: "$100K", initials: "LW" },
  { name: "Julien M.",      flag: "fr", payout: 2578.43,  size: "$100K", initials: "JM" },
  { name: "Lena H.",        flag: "de", payout: 1163.47,  size: "$25K",  initials: "LH" },
  { name: "Lucas M.",       flag: "fr", payout:  418.63,  size: "$10K",  initials: "LM" },
  { name: "Emma R.",        flag: "fr", payout:  356.21,  size: "$10K",  initials: "ER" },
  { name: "Yann T.",        flag: "fr", payout:  471.84,  size: "$10K",  initials: "YT" },
];

function fmt(n: number) {
  return "€" + Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const doubled = [...TRADERS, ...TRADERS];

export default function TraderMarquee() {
  return (
    <div style={{ overflow: "hidden", borderTop: "1px solid rgba(13,27,62,0.2)", borderBottom: "1px solid rgba(13,27,62,0.2)", padding: "20px 0", background: "rgba(255,255,255,0.7)" }}>
      <div className="marquee-track">
        {doubled.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 28, flexShrink: 0, padding: "5px 16px 5px 5px", background: "rgba(255,255,255,0.8)", borderRadius: 100, border: "1px solid rgba(13,27,62,0.25)" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(13,27,62,0.09)", border: "1.5px solid rgba(13,27,62,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#0D1B3E" }}>{t.initials}</div>
              <img src={`https://flagcdn.com/24x18/${t.flag}.png`} alt="" style={{ position: "absolute", bottom: -2, right: -6, width: 16, height: 12, borderRadius: 2, objectFit: "cover", border: "1px solid rgba(255,255,255,0.8)" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#0D1B3E" }}>{t.name}</div>
              <div style={{ fontSize: 11, color: "#0D1B3E", fontWeight: 600 }}>{fmt(t.payout)} · {t.size}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
