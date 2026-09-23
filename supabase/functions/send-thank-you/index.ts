// Supabase Edge Function: envía el correo de agradecimiento por registrarse,
// vía la API de Resend.
//
// Nota: se usó SMTP propio de FP Tecnologi (dev@fptecnologi.com) primero,
// pero el hosting (cPanel/Exim) bloquea auth SMTP desde IPs de datacenter —
// confirmado que la credencial es correcta (funciona con curl desde una IP
// normal) pero falla siempre desde Supabase, con cualquier cliente SMTP.
// Resend evita ese problema por completo (solo necesita el dominio
// verificado vía SPF/DKIM, no login a una cuenta de correo).
//
// Deploy:
//   supabase functions deploy send-thank-you --no-verify-jwt
//   supabase secrets set RESEND_API_KEY=... EMAIL_FROM="FP Tecnologi & System <dev@fptecnologi.com>"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "FP Tecnologi & System <dev@fptecnologi.com>";
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://www.fptecnologi.com";
// Logos del evento (EXPOMINA, CIP) se sirven desde el sitio de registro, no
// desde el sitio corporativo (SITE_URL).
const ASSET_BASE = "https://registro.fptecnologi.com";

interface LeadRecord {
  nombres?: string;
  email?: string;
}

interface DbWebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: LeadRecord;
}

function buildEmailHtml(nombre: string) {
  const firstName = (nombre || "").trim().split(/\s+/)[0] || "";
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Gracias por registrarte | Semana de Ingeniería Geológica</title>
</head>
<body style="margin:0;padding:0;background-color:#dcedf3;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#dcedf3" style="background-color:#dcedf3;background-image:radial-gradient(circle, rgba(14,36,55,0.12) 1.4px, transparent 1.4px);background-size:24px 24px;">
<tr><td align="center" style="padding:40px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr>
<td align="center" bgcolor="#155382" style="padding:18px 22px;background-color:#155382;">
<img src="https://i.ibb.co/ymdCxLWw/fplogoblanco.png" alt="FP Tecnologi & System" width="120" style="width:120px;height:auto;margin:0 auto;display:block;">
</td>
</tr>
<tr>
<td align="center" style="padding:26px 40px 22px 40px;border-bottom:1px solid #eef3f7;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding:0 16px;"><img src="${ASSET_BASE}/logo-expomina-light.png" alt="EXPOMINA Perú" height="32" style="height:32px;width:auto;display:block;"></td>
<td style="padding:0 16px;border-left:1px solid #e2ebf1;"><img src="${ASSET_BASE}/logo-cip.png" alt="Colegio de Ingenieros del Perú" height="38" style="height:38px;width:auto;display:block;"></td>
</tr></table>
</td>
</tr>
<tr>
<td style="padding:32px 40px 8px 40px;">
<span style="display:inline-block;padding:7px 16px;border-radius:16px;background:rgba(28,127,168,0.12);color:#155382;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">Registro confirmado</span>
<h1 style="margin:20px 0 14px 0;font-size:26px;line-height:33px;color:#0f2942;font-weight:800;">
¡Gracias por registrarte${firstName ? ", " + firstName : ""}!
</h1>
<p style="margin:0 0 16px 0;font-size:15px;line-height:25px;color:#3f5568;">
Gracias por registrar tu asistencia a la <strong style="color:#0f2942;">Semana de Ingeniería
Geológica</strong>, EXPOMINA Perú 2026. Fue un gusto conectar contigo sobre las soluciones de FP
Tecnologi &amp; System.
</p>
<p style="margin:0 0 28px 0;font-size:15px;line-height:25px;color:#3f5568;">
Si quieres conocer más sobre nuestras soluciones de infraestructura tecnológica, redes, servidores y
data center para el sector minero, visita nuestra web — estamos para ayudarte.
</p>
</td>
</tr>
<tr>
<td align="center" style="padding:0 40px 40px 40px;">
<a href="${SITE_URL}" target="_blank"
   style="display:inline-block;padding:16px 34px;border-radius:14px;font-weight:bold;font-size:13px;letter-spacing:1px;line-height:18px;text-transform:uppercase;background-color:#2181af;background-image:linear-gradient(135deg,#2ea8d6,#2181af 55%,#155382);color:#ffffff;text-decoration:none;">
Conocer más de FP Tecnologi &amp; System
</a>
</td>
</tr>
<tr>
<td align="center" bgcolor="#155382" style="padding:22px 30px;background:#155382;">
<div style="font-size:13px;font-weight:bold;color:#ffffff;">FP Tecnologi &amp; System S.A.C.</div>
<div style="font-size:11px;line-height:18px;color:#bcdcea;margin-top:6px;">
<a href="mailto:marketing@fptecnologi.com" style="color:#7fe0f0;">marketing@fptecnologi.com</a>
&nbsp;|&nbsp;
<a href="${SITE_URL}" style="color:#7fe0f0;">www.fptecnologi.com</a>
</div>
</td>
</tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function sendMail(opts: { to: string; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${body}`);
  }
}

Deno.serve(async (req: Request) => {
  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY no configurado" }), { status: 500 });
    }

    const payload = (await req.json()) as DbWebhookPayload;
    const record = payload.record;

    if (payload.type !== "INSERT" || !record?.email) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    await sendMail({
      to: record.email,
      subject: "Gracias por registrarte — Semana de Ingeniería Geológica · FP Tecnologi & System",
      html: buildEmailHtml(record.nombres ?? ""),
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
