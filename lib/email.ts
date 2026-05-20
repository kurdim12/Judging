import "server-only";
import { getEnv } from "@/lib/db";

interface MagicLinkEmail {
  to: string;
  locale: "en" | "ar";
  url: string;
}

export async function sendMagicLinkEmail({ to, locale, url }: MagicLinkEmail) {
  const env = await getEnv();
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM ?? "IEEE UoP Hackathon <onboarding@resend.dev>";

  const subject =
    locale === "ar" ? "رابط الدخول إلى منصة الهاكاثون" : "Your IEEE UoP Hackathon sign-in link";
  const cta = locale === "ar" ? "افتح المنصة" : "Open the platform";
  const body =
    locale === "ar"
      ? `أهلاً بك،\n\nاستخدم الرابط أدناه لتسجيل الدخول. ينتهي الرابط خلال 15 دقيقة.\n\n${url}\n\n— فرع طلاب IEEE جامعة البتراء`
      : `Hi there,\n\nUse the link below to sign in. It expires in 15 minutes.\n\n${url}\n\n— IEEE UoP Student Branch`;

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#2C2C2A">
      <div style="background:linear-gradient(135deg,#035B98,#023A62);color:white;padding:24px;border-radius:12px;margin-bottom:24px">
        <p style="margin:0;font-size:12px;opacity:0.8;text-transform:uppercase;letter-spacing:1px">${locale === "ar" ? "هاكاثون IEEE جامعة البتراء" : "IEEE UoP Hackathon"}</p>
        <h1 style="margin:6px 0 0 0;font-size:22px">${subject}</h1>
      </div>
      <p>${locale === "ar" ? "اضغط الزر أدناه لتسجيل الدخول:" : "Click the button below to sign in:"}</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${url}" style="display:inline-block;background:#035B98;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">${cta}</a>
      </p>
      <p style="font-size:12px;color:#5C5C58">${locale === "ar" ? "إذا لم تطلب هذا البريد، تجاهله." : "If you didn't request this email, you can ignore it."}</p>
      <p style="font-size:11px;color:#7C7C77;margin-top:24px;border-top:1px solid #E3E3E1;padding-top:12px">— ${locale === "ar" ? "فرع طلاب IEEE جامعة البتراء" : "IEEE UoP Student Branch"}</p>
    </div>
  `;

  if (!apiKey) {
    // Dev fallback: log the link so the developer can copy-paste it.
    console.warn("[email] RESEND_API_KEY missing — magic link:", url);
    return { ok: true, dev: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text: body,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Resend error ${res.status}: ${text}`);
  }
  return { ok: true };
}
