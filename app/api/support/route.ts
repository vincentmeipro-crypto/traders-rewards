import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { firstName, lastName, email, message } = await req.json();

  if (!firstName || !lastName || !email || !message) {
    return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#fff;border-radius:12px;overflow:hidden;">
      <div style="background:#111;padding:24px 32px;border-bottom:1px solid #222;">
        <h2 style="margin:0;color:#C9A84C;font-size:20px;letter-spacing:2px;">NOUVEAU MESSAGE SUPPORT</h2>
      </div>
      <div style="padding:32px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#888;font-size:13px;width:130px;">Prénom</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;">${firstName}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px;">Nom</td><td style="padding:8px 0;color:#fff;font-size:14px;font-weight:600;">${lastName}</td></tr>
          <tr><td style="padding:8px 0;color:#888;font-size:13px;">Email</td><td style="padding:8px 0;color:#00C2FF;font-size:14px;font-weight:600;">${email}</td></tr>
        </table>
        <div style="margin-top:24px;background:#1a1a1a;border-radius:10px;padding:20px;border-left:3px solid #C9A84C;">
          <div style="color:#888;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">Message</div>
          <div style="color:#fff;font-size:15px;line-height:1.7;white-space:pre-wrap;">${message}</div>
        </div>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #222;color:#555;font-size:12px;">
          Répondre directement à cet email pour contacter le client.
        </div>
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Traders Rewards Support <support@elysium-rewards.com>",
      to: ["vincentmeipro@gmail.com"],
      reply_to: email,
      subject: `[Support] ${firstName} ${lastName} — nouveau message`,
      html,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("Resend error:", res.status, JSON.stringify(errBody));
    return NextResponse.json({ error: `Resend ${res.status}: ${JSON.stringify(errBody)}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
