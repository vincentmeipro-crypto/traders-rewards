async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Elysium Rewards <support@elysium-rewards.com>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend error: ${err}`);
  }
}

export async function sendWelcomeEmail(
  to: string,
  accountSize: string,
  model: string,
  mt5?: { login: number; password: string; server: string }
) {
  const modelLabel = model === "1step" ? "1-Step" : "2-Step";
  const details: { label: string; value: string; color?: string }[] = [
    { label: "Account Size", value: accountSize, color: "#C9A84C" },
    { label: "Model", value: modelLabel },
    { label: "Profit Target", value: "10%" },
    { label: "Daily Drawdown", value: model === "1step" ? "3%" : "5%" },
  ];
  if (mt5) {
    details.push(
      { label: "MT5 Server",   value: mt5.server,            color: "#00C2FF" },
      { label: "MT5 Login",    value: String(mt5.login),     color: "#00C2FF" },
      { label: "MT5 Password", value: mt5.password,          color: "#00C2FF" },
    );
  }
  await sendEmail(to, "🎯 Your Elysium Challenge is Ready!", buildEmail({
    title: "✅ Payment Confirmed — Your MT5 Account is Ready",
    titleColor: "#22c55e",
    body: `Welcome to the elite. Your challenge account has been created. Connect to MT5 with the credentials below and start trading.`,
    details,
    cta: { text: "Access My Dashboard →", href: "https://elysium-rewards.com/dashboard" },
  }));
}

export async function sendPhase2Email(to: string, accountSize: string) {
  await sendEmail(to, "🏆 Phase 1 Passed — Welcome to Phase 2!", buildEmail({
    title: "🏆 Phase 1 Passed!",
    titleColor: "#C9A84C",
    body: `Congratulations! You have successfully completed Phase 1 of your ${accountSize} challenge. Your account has been reset and Phase 2 is now active.`,
    details: [
      { label: "Account Size", value: accountSize, color: "#C9A84C" },
      { label: "New Phase", value: "Phase 2" },
      { label: "New Profit Target", value: "5%" },
      { label: "Balance Reset", value: "✓ Done" },
    ],
    cta: { text: "View My Dashboard →", href: "https://elysium-rewards.com/dashboard" },
  }));
}

export async function sendFailedEmail(to: string, accountSize: string, reason: "daily_drawdown" | "total_drawdown") {
  const reasonLabel = reason === "daily_drawdown" ? "Daily Drawdown Exceeded" : "Total Drawdown Exceeded";
  const reasonDetail = reason === "daily_drawdown"
    ? "Your daily loss limit has been exceeded. This is an automatic rule to protect capital."
    : "Your maximum total loss limit has been exceeded.";
  await sendEmail(to, "❌ Your Elysium Challenge Has Been Stopped", buildEmail({
    title: "❌ Challenge Failed",
    titleColor: "#ef4444",
    body: `We're sorry to inform you that your ${accountSize} challenge has been automatically stopped. ${reasonDetail}`,
    details: [
      { label: "Account Size", value: accountSize, color: "#C9A84C" },
      { label: "Reason", value: reasonLabel, color: "#ef4444" },
      { label: "Status", value: "Challenge Closed" },
    ],
    cta: { text: "Start a New Challenge →", href: "https://elysium-rewards.com/#pricing" },
  }));
}

export async function sendFundedEmail(to: string, accountSize: string) {
  await sendEmail(to, "🎉 You're Certified! Welcome to Elysium", buildEmail({
    title: "🎉 Congratulations — You're Certified!",
    titleColor: "#3b82f6",
    body: `Outstanding performance! You have passed all phases of your ${accountSize} challenge. You are now an official Elysium certified trader with a 90% profit split.`,
    details: [
      { label: "Account Size", value: accountSize, color: "#C9A84C" },
      { label: "Status", value: "Certified Trader ✓", color: "#3b82f6" },
      { label: "Profit Split", value: "90% for you" },
      { label: "Payouts", value: "Available now" },
    ],
    cta: { text: "Request Your First Payout →", href: "https://elysium-rewards.com/dashboard" },
  }));
}

export async function sendDailyUpdateEmail(to: string, accountSize: string, phase: string, balance: number, profitPct: number, tradingDays: number) {
  const phaseLabel = phase === "phase1" ? "Phase 1" : phase === "phase2" ? "Phase 2" : "Funded";
  const profitColor = profitPct >= 0 ? "#22c55e" : "#ef4444";
  const profitSign = profitPct >= 0 ? "+" : "";
  await sendEmail(to, `📊 Daily Update — ${accountSize} Challenge`, buildEmail({
    title: "📊 Your Daily Account Update",
    titleColor: "#C9A84C",
    body: `Here is your daily performance summary for your ${accountSize} challenge.`,
    details: [
      { label: "Current Balance", value: `$${balance.toLocaleString()}`, color: "#fff" },
      { label: "Profit / Loss", value: `${profitSign}${profitPct.toFixed(2)}%`, color: profitColor },
      { label: "Phase", value: phaseLabel, color: "#C9A84C" },
      { label: "Trading Days", value: `${tradingDays}`, color: "#fff" },
    ],
    cta: { text: "View My Dashboard →", href: "https://elysium-rewards.com/dashboard" },
  }));
}

function buildEmail({ title, titleColor, body, details, cta }: {
  title: string; titleColor: string; body: string;
  details: { label: string; value: string; color?: string }[];
  cta: { text: string; href: string };
}) {
  const LOGO = "https://elysium-rewards.com/LOGO%20ELYSIUM%20REWARDS%20TEXTE%20NOIR%20SUR%20BLANC.png";
  return `
    <div style="background:#f2f2f2;font-family:Helvetica,Arial,sans-serif;padding:40px 16px;min-height:100vh;">
      <div style="max-width:580px;margin:0 auto;">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:28px;">
          <img src="${LOGO}" alt="Elysium Rewards" style="height:60px;width:auto;display:inline-block;" />
        </div>

        <!-- Card -->
        <div style="background:#ffffff;border-radius:12px;padding:40px 36px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <h2 style="color:${titleColor};font-size:22px;font-weight:700;margin:0 0 12px 0;">${title}</h2>
          <p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 28px 0;">${body}</p>

          <!-- Details -->
          <div style="border-top:1px solid #e8e8e8;margin-bottom:28px;">
            ${details.map(d => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #e8e8e8;">
                <span style="color:#777;font-size:14px;">${d.label}</span>
                <span style="color:${d.color || "#111"};font-size:14px;font-weight:700;font-family:monospace;">${d.value}</span>
              </div>
            `).join("")}
          </div>

          <!-- CTA -->
          <a href="${cta.href}" style="display:block;background:#C9A84C;color:#ffffff;text-align:center;padding:15px 24px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;letter-spacing:0.5px;">${cta.text}</a>
        </div>

        <!-- Footer -->
        <div style="margin-top:32px;padding:0 8px;">
          <p style="color:#555;font-size:14px;margin:0 0 8px 0;">💬 Besoin d'aide ?</p>
          <p style="color:#777;font-size:13px;line-height:1.6;margin:0 0 20px 0;">
            Contactez-nous à tout moment à <a href="mailto:support@elysium-rewards.com" style="color:#C9A84C;text-decoration:none;">support@elysium-rewards.com</a>
          </p>
          <p style="color:#777;font-size:13px;margin:0;">Cordialement,<br/><strong style="color:#444;">L'équipe Elysium Rewards</strong></p>
        </div>

      </div>
    </div>
  `;
}
