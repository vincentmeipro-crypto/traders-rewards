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
    html: `
      <div style="background:#070707;color:#fff;font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:32px;">
          <h1 style="color:#C9A84C;font-size:28px;margin:0;">ELYSIUM FUNDED</h1>
          <p style="color:#555;font-size:12px;letter-spacing:2px;margin-top:4px;">THE ELITE PROP FIRM</p>
        </div>

        <div style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:16px;padding:32px;margin-bottom:24px;">
          <h2 style="color:#22c55e;margin-top:0;">✅ Payment Confirmed</h2>
          <p style="color:#888;line-height:1.6;">Welcome to the elite. Your challenge account has been created and is ready to trade.</p>

          <div style="background:#070707;border-radius:10px;padding:20px;margin:24px 0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#555;">Account Size</span>
              <span style="color:#C9A84C;font-weight:700;">${accountSize}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#555;">Model</span>
              <span style="color:#fff;">${modelLabel}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#555;">Profit Target</span>
              <span style="color:#fff;">10%</span>
            </div>
          </div>

          <a href="https://elysiumfunded.eu/dashboard"
             style="display:block;background:#C9A84C;color:#000;text-align:center;padding:14px;border-radius:8px;font-weight:700;text-decoration:none;font-size:15px;">
            Access My Dashboard →
          </a>
        </div>

        <div style="background:#0f0f0f;border:1px solid #1a1a1a;border-radius:12px;padding:20px;margin-bottom:24px;">
          <h3 style="color:#C9A84C;margin-top:0;font-size:14px;letter-spacing:1px;">CHALLENGE RULES</h3>
          <ul style="color:#888;font-size:13px;line-height:2;padding-left:20px;margin:0;">
            <li>Profit Target: <strong style="color:#fff;">10%</strong></li>
            <li>Max Daily Drawdown: <strong style="color:#fff;">5%</strong></li>
            <li>Max Total Drawdown: <strong style="color:#fff;">10%</strong></li>
            <li>Min Trading Days: <strong style="color:#fff;">4</strong></li>
            <li>Time Limit: <strong style="color:#fff;">Unlimited</strong></li>
          </ul>
        </div>

        <p style="color:#333;font-size:12px;text-align:center;">
          Need help? Contact us at <a href="mailto:support@elysiumfunded.eu" style="color:#C9A84C;">support@elysiumfunded.eu</a>
        </p>
      </div>
    `,
  });
}
