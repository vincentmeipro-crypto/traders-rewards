const stats = [
  { value: "$24,800+", label: "Total Rewards" },
  { value: "37+", label: "Funded Traders" },
  { value: "98%", label: "Satisfaction Rate" },
  { value: "<24h", label: "Support Response" },
];

export default function Stats() {
  return (
    <section style={{ padding: "0 24px 80px" }}>
      <div className="divider-gold" style={{ maxWidth: 1200, margin: "0 auto 60px" }} />
      <div style={{
        maxWidth: 1200, margin: "0 auto",
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2,
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            textAlign: "center", padding: "32px 24px",
            borderRight: i < stats.length - 1 ? "1px solid #2A2A38" : "none",
          }}>
            <div style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 900, color: "#2D7DD2", letterSpacing: "-1px" }}>
              {stat.value}
            </div>
            <div style={{ color: "#555", fontSize: 13, marginTop: 8, textTransform: "uppercase", letterSpacing: "1px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>
      <div className="divider-gold" style={{ maxWidth: 1200, margin: "60px auto 0" }} />
    </section>
  );
}
