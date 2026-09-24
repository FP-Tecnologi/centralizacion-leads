// Entrada pública de leads desde landings. Deploy:
//   supabase functions deploy ingresar-lead --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
import { separarLead, validarLead, type CampoFormulario } from '../_shared/lead.ts';
import { CORS, json, limitar, sha256 } from '../_shared/http.ts';

// Disponible en el runtime de Supabase Edge Functions; no está en los tipos de Deno estándar.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'desconocida';
  if (limitar(ip)) return json({ error: 'limite_excedido' }, 429);

  let body: { slug?: string; clave?: string; datos?: Record<string, unknown>; website?: string };
  try { body = await req.json(); } catch { return json({ error: 'json_invalido' }, 400); }

  // Honeypot: bots llenan el campo oculto; respondemos ok sin guardar.
  if (body.website) return json({ ok: true, resultado: 'nueva' });

  const { data: fuente } = await db.from('fuentes')
    .select('id, estado, campos, clave_hash, correo_gracias')
    .eq('slug', body.slug ?? '').maybeSingle();
  if (!fuente || !fuente.clave_hash || fuente.clave_hash !== await sha256(body.clave ?? '')) {
    return json({ error: 'clave_invalida' }, 401);
  }
  if (fuente.estado !== 'activa') return json({ error: 'fuente_cerrada' }, 409);

  const lead = separarLead(body.datos ?? {});
  const errores = validarLead(lead, fuente.campos as CampoFormulario[]);
  if (errores.length) return json({ error: 'campo_invalido', errores }, 400);

  const { data: resultado, error } = await db.rpc('upsert_lead', {
    p_fuente: fuente.id,
    p: { ...lead, origen: body.slug, user_agent: req.headers.get('user-agent') },
  });
  if (error) { console.error(error); return json({ error: 'error_interno' }, 500); }

  const correo = fuente.correo_gracias as { activo?: boolean; asunto?: string; plantilla?: string } | null;
  if (resultado === 'nueva' && correo?.activo && lead.email) {
    // No bloquea la respuesta al visitante si el correo falla. La plantilla y
    // el asunto los resuelve send-thank-you leyendo `fuentes` por id: nunca
    // se le manda HTML/asunto arbitrario desde aquí.
    const envio = fetch(`${SUPABASE_URL}/functions/v1/send-thank-you`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ fuente_id: fuente.id, nombres: lead.nombres, email: lead.email }),
    }).then((r) => { if (!r.ok) console.error('send-thank-you', r.status); })
      .catch((e) => console.error('send-thank-you', e));
    if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(envio);
  }
  return json({ ok: true, resultado });
});
