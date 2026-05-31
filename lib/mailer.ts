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
  return `
    <div style="background:#070707;color:#fff;font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#C9A84C;font-size:28px;margin:0;">ELYSIUM REWARDS</h1>
        <p style="color:#555;font-size:12px;letter-spacing:2px;margin-top:4px;">THE ELITE PROP FIRM</p>
      </div>
      <div style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:16px;padding:32px;margin-bottom:24px;">
        <h2 style="color:${titleColor};margin-top:0;">${title}</h2>
        <p style="color:#888;line-height:1.6;">${body}</p>
        <div style="background:#070707;border-radius:10px;padding:20px;margin:24px 0;">
          ${details.map(d => `
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#555;">${d.label}</span>
              <span style="color:${d.color || "#fff"};font-weight:700;">${d.value}</span>
            </div>
          `).join("")}
        </div>
        <a href="${cta.href}" style="display:block;background:#C9A84C;color:#000;text-align:center;padding:14px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">${cta.text}</a>
      </div>
      <p style="color:#333;font-size:12px;text-align:center;">
        Questions? <a href="mailto:support@elysium-rewards.com" style="color:#C9A84C;">support@elysium-rewards.com</a>
      </p>
    </div>
  `;
}
