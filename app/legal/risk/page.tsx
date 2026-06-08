export default function RiskPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px" }}>
        <a href="/" style={{ color: "#C9A84C", fontSize: 13, textDecoration: "none", display: "block", marginBottom: 40 }}>← Back to Home</a>

        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>Risk Disclaimer</h1>
        <p style={{ color: "#555", fontSize: 14, marginBottom: 48 }}>Last updated: May 13, 2026</p>

        <div style={{ backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "20px 24px", marginBottom: 48 }}>
          <p style={{ color: "#ef4444", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>⚠️ Important Notice</p>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7 }}>
            Trading foreign exchange, commodities, indices, and other financial instruments carries a high level of risk. Please read this disclaimer carefully before participating in any Traders Rewards challenge.
          </p>
        </div>

        {[
          {
            title: "1. Simulated Trading Environment",
            content: `All trading on the Traders Rewards platform takes place in a 100% simulated environment. No real funds are deposited or traded. The simulated accounts are designed to replicate real market conditions, but results in simulation do not guarantee performance in live trading with real capital.`
          },
          {
            title: "2. Not Financial Advice",
            content: `Nothing on the Traders Rewards platform constitutes financial advice, investment advice, trading advice, or any other advice. All content is for informational and evaluation purposes only. You should not make any financial decision based solely on information from this platform.`
          },
          {
            title: "3. Past Performance",
            content: `Past performance of any trading strategy, method, or system is not necessarily indicative of future results. The profitability of any trading approach may vary significantly depending on market conditions, execution, and other factors.`
          },
          {
            title: "4. Challenge Fee Risk",
            content: `The challenge fee you pay to participate is the only real financial risk involved in using our platform. There is a risk that you will not pass the challenge and the fee will not be refunded (except where explicitly stated in our fee refund policy). Only participate with money you can afford to lose.`
          },
          {
            title: "5. No Guarantee of Funded Account",
            content: `Purchasing a challenge does not guarantee that you will receive a certified account. A certified account is only granted upon successful completion of all challenge objectives and compliance with all trading rules.`
          },
          {
            title: "6. Market Risk",
            content: `Financial markets are volatile and unpredictable. Even experienced traders with proven track records can and do lose money. Factors including but not limited to economic events, geopolitical developments, and market liquidity can all affect trading outcomes.`
          },
          {
            title: "7. Technology Risk",
            content: `Trading platforms and internet connections can experience technical issues. Traders Rewards is not responsible for losses or missed opportunities arising from technical failures, connectivity issues, or platform downtime.`
          },
          {
            title: "8. Regulatory Notice",
            content: `Traders Rewards operates as a talent evaluation and profit-sharing program using simulated accounts. We are not a regulated financial institution, broker, or investment firm. We do not offer financial products or services regulated by financial authorities. Participation in our challenges does not constitute investment in financial markets.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#C9A84C", marginBottom: 12 }}>{section.title}</h2>
            <p style={{ color: "#888", lineHeight: 1.8, fontSize: 15 }}>{section.content}</p>
          </div>
        ))}

        <div style={{ backgroundColor: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 12, padding: "20px 24px", marginTop: 20 }}>
          <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7 }}>
            By participating in any Traders Rewards challenge, you acknowledge that you have read, understood, and accepted this Risk Disclaimer in its entirety.
          </p>
        </div>
      </div>
    </div>
  );
}
