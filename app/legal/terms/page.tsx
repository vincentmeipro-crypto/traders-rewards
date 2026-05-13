export default function TermsPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px" }}>
        <a href="/" style={{ color: "#C9A84C", fontSize: 13, textDecoration: "none", display: "block", marginBottom: 40 }}>← Back to Home</a>

        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: "#555", fontSize: 14, marginBottom: 48 }}>Last updated: May 13, 2026</p>

        {[
          {
            title: "1. Acceptance of Terms",
            content: `By accessing and using Elysium Funded ("the Platform"), you accept and agree to be bound by these Terms of Service. Elysium Funded is operated by a company registered in Estonia (OÜ). If you do not agree to these terms, please do not use the Platform.`
          },
          {
            title: "2. Nature of the Service",
            content: `Elysium Funded provides evaluation programs ("Challenges") using simulated trading accounts. All accounts on our platform are 100% simulated — no real funds are traded. The challenges are designed to evaluate a trader's skills and discipline based on predefined rules and objectives.`
          },
          {
            title: "3. Eligibility",
            content: `You must be at least 18 years old to use our services. By registering, you confirm that you are of legal age in your country of residence and that you are not located in a jurisdiction where participation is prohibited by law.`
          },
          {
            title: "4. Challenge Rules",
            content: `Each challenge has specific rules including profit targets, maximum daily drawdown limits, and maximum total drawdown limits. Violating any of these rules will result in immediate termination of the challenge account. All rules are clearly stated on the platform and it is your responsibility to understand and comply with them.`
          },
          {
            title: "5. Fees and Payments",
            content: `Challenge fees are non-refundable except where explicitly stated (e.g., fee refund on first payout). All payments are processed securely through Stripe. Prices are displayed in EUR and may vary based on the selected account size and model.`
          },
          {
            title: "6. Payouts",
            content: `Traders who successfully complete a challenge and meet all requirements may request a profit split payout. Elysium Funded reserves the right to verify trading activity before processing any payout. Payouts are processed within 1-5 business days. Elysium Funded reserves the right to refuse payouts in cases of suspected fraud, manipulation, or violation of trading rules.`
          },
          {
            title: "7. Prohibited Activities",
            content: `The following activities are strictly prohibited: high-frequency trading exploiting platform latency, use of automated trading bots without prior approval, copying trades between accounts, exploiting pricing errors or technical issues, any form of market manipulation or fraudulent behavior.`
          },
          {
            title: "8. Intellectual Property",
            content: `All content on the Elysium Funded platform, including but not limited to logos, text, graphics, and software, is the exclusive property of Elysium Funded and is protected by applicable intellectual property laws.`
          },
          {
            title: "9. Limitation of Liability",
            content: `Elysium Funded shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform. Our total liability shall not exceed the amount paid by you for the challenge in question.`
          },
          {
            title: "10. Modifications",
            content: `Elysium Funded reserves the right to modify these Terms at any time. Changes will be effective upon posting to the platform. Continued use of the platform after changes constitutes acceptance of the new terms.`
          },
          {
            title: "11. Governing Law",
            content: `These Terms shall be governed by and construed in accordance with the laws of the Republic of Estonia. Any disputes shall be subject to the exclusive jurisdiction of the courts of Estonia.`
          },
          {
            title: "12. Contact",
            content: `For any questions regarding these Terms, please contact us at: support@elysiumfunded.eu`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#C9A84C", marginBottom: 12 }}>{section.title}</h2>
            <p style={{ color: "#888", lineHeight: 1.8, fontSize: 15 }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
