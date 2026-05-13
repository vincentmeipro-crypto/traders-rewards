import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendWelcomeEmail(to: string, accountSize: string, model: string) {
  const modelLabel = model === "1step" ? "1-Step" : "2-Step";
  await transporter.sendMail({
    from: '"Elysium Funded" <support@elysiumfunded.eu>',
    to,
    subject: "🎯 Your Elysium Challenge is Ready!",
    html: buildEmail({
      title: "✅ Payment Confirmed",
      titleColor: "#22c55e",
      body: `Welcome to the elite. Your challenge account has been created and is ready to trade.`,
      details: [
        { label: "Account Size", value: accountSize, color: "#C9A84C" },
        { label: "Model", value: modelLabel },
        { label: "Profit Target", value: "10%" },
        { label: "Daily Drawdown", value: model === "1step" ? "3%" : "5%" },
      ],
      cta: { text: "Access My Dashboard →", href: "https://elysiumfunded.eu/dashboard" },
    }),
  });
}

export async function sendPhase2Email(to: string, accountSize: string) {
  await transporter.sendMail({
    from: '"Elysium Funded" <support@elysiumfunded.eu>',
    to,
    subject: "🏆 Phase 1 Passed — Welcome to Phase 2!",
    html: buildEmail({
      title: "🏆 Phase 1 Passed!",
      titleColor: "#C9A84C",
      body: `Congratulations! You have successfully completed Phase 1 of your ${accountSize} challenge. Your account has been reset and Phase 2 is now active.`,
      details: [
        { label: "Account Size", value: accountSize, color: "#C9A84C" },
        { label: "New Phase", value: "Phase 2" },
        { label: "New Profit Target", value: "5%" },
        { label: "Balance Reset", value: "✓ Done" },
      ],
      cta: { text: "View My Dashboard →", href: "https://elysiumfunded.eu/dashboard" },
    }),
  });
}

export async function sendFundedEmail(to: string, accountSize: string) {
  await transporter.sendMail({
    from: '"Elysium Funded" <support@elysiumfunded.eu>',
    to,
    subject: "🎉 You're Funded! Welcome to Elysium Funded",
    html: buildEmail({
      title: "🎉 Congratulations — You're Funded!",
      titleColor: "#3b82f6",
      body: `Outstanding performance! You have passed all phases of your ${accountSize} challenge. You are now an official Elysium Funded trader with a 90% profit split.`,
      details: [
        { label: "Account Size", value: accountSize, color: "#C9A84C" },
        { label: "Status", value: "Funded Trader ✓", color: "#3b82f6" },
        { label: "Profit Split", value: "90% for you" },
        { label: "Payouts", value: "Available now" },
      ],
      cta: { text: "Request Your First Payout →", href: "https://elysiumfunded.eu/dashboard" },
    }),
  });
}

function buildEmail({ title, titleColor, body, details, cta }: {
  title: string; titleColor: string; body: string;
  details: { label: string; value: string; color?: string }[];
  cta: { text: string; href: string };
}) {
  return `
    <div style="background:#070707;color:#fff;font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:32px;">
        <h1 style="color:#C9A84C;font-size:28px;margin:0;">ELYSIUM FUNDED</h1>
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
        Questions? <a href="mailto:support@elysiumfunded.eu" style="color:#C9A84C;">support@elysiumfunded.eu</a>
      </p>
    </div>
  `;
}
