export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#070707", color: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px" }}>
        <a href="/" style={{ color: "#C9A84C", fontSize: 13, textDecoration: "none", display: "block", marginBottom: 40 }}>← Back to Home</a>

        <h1 style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: "#555", fontSize: 14, marginBottom: 48 }}>Last updated: May 13, 2026</p>

        {[
          {
            title: "1. Data Controller",
            content: `Elysium (OÜ, Estonia) is the data controller responsible for your personal data. Contact: support@elysiumfunded.eu`
          },
          {
            title: "2. Data We Collect",
            content: `We collect the following personal data: Email address and password (for account creation), Payment information (processed and stored by Stripe — we do not store card details), Trading activity within the platform (simulated), IP address and device information for security purposes, Communication data if you contact our support team.`
          },
          {
            title: "3. How We Use Your Data",
            content: `Your personal data is used to: Provide and manage your challenge account, Process payments and payouts, Send transactional emails (confirmations, notifications), Improve our platform and services, Comply with legal obligations, Prevent fraud and ensure platform security.`
          },
          {
            title: "4. Legal Basis for Processing",
            content: `We process your data based on: Contract performance (to provide our services), Legal obligation (compliance with applicable laws), Legitimate interests (platform security, fraud prevention), Consent (marketing communications, where applicable).`
          },
          {
            title: "5. Data Sharing",
            content: `We do not sell your personal data. We may share data with: Stripe (payment processing), Supabase (secure database hosting), Vercel (platform hosting), Legal authorities when required by law.`
          },
          {
            title: "6. Data Retention",
            content: `We retain your personal data for as long as your account is active or as needed to provide services. After account closure, we retain data for up to 5 years for legal and accounting purposes.`
          },
          {
            title: "7. Your Rights (GDPR)",
            content: `Under GDPR, you have the right to: Access your personal data, Correct inaccurate data, Request deletion of your data ("right to be forgotten"), Restrict processing of your data, Data portability, Object to processing. To exercise these rights, contact us at support@elysiumfunded.eu.`
          },
          {
            title: "8. Cookies",
            content: `We use essential cookies for authentication and session management. We do not use tracking or advertising cookies. You can manage cookie preferences through your browser settings.`
          },
          {
            title: "9. Security",
            content: `We implement industry-standard security measures including SSL/TLS encryption, secure password hashing, and regular security audits. However, no internet transmission is completely secure and we cannot guarantee absolute security.`
          },
          {
            title: "10. Changes to This Policy",
            content: `We may update this Privacy Policy from time to time. We will notify you of significant changes via email or platform notification.`
          },
        ].map((section, i) => (
          <div key={i} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#C9A84C", marginBottom: 12 }}>{section.title}</h2>
            <p style={{ color: "#888", lineHeight: 1.8, fontSize: 15, whiteSpace: "pre-line" }}>{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
