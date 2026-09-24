// API de lectura para apps conectadas (HUB, apps futuras). Deploy:
//   supabase functions deploy api-v1 --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS, json, limitar, sha256 } from '../_shared/http.ts';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

function leerCursor(c: string | null): { t: string; id: string } | null {
  if (!c) return null;
  try { const [t, id] = atob(c).split('|'); return t && id ? { t, id } : null; } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'GET') return json({ error: 'metodo_no_permitido' }, 405);

  const clave = req.headers.get('x-api-key') ?? '';
  const { data: app } = await db.from('aplicaciones')
    .select('id, permisos, fuentes, activa').eq('clave_hash', await sha256(clave)).maybeSingle();
  if (!app || !app.activa || !app.permisos.includes('leer')) return json({ error: 'clave_invalida' }, 401);
  if (limitar(app.id, 120)) return json({ error: 'limite_excedido' }, 429);
  db.from('aplicaciones').update({ ultimo_uso: new Date().toISOString() }).eq('id', app.id).then();

  const url = new URL(req.url);
  const ruta = url.pathname.split('/api-v1')[1] ?? '';

  // Slugs permitidos para esta app (null = todas).
  let slugsPermitidos: string[] | null = null;
  if (app.fuentes) {
    const { data } = await db.from('fuentes').select('slug').in('id', app.fuentes);
    slugsPermitidos = (data ?? []).map((f) => f.slug);
  }

  if (ruta === '/fuentes') {
    let q = db.from('fuentes').select('slug, nombre, tipo, estado').order('nombre');
    if (slugsPermitidos) q = q.in('slug', slugsPermitidos);
    const { data, error } = await q;
    return error ? json({ error: 'error_interno' }, 500) : json({ datos: data });
  }

  if (ruta === '/leads') {
    const limite = Math.min(Math.max(Number(url.searchParams.get('limite') ?? 100), 1), 500);
    const fuente = url.searchParams.get('fuente');
    if (fuente && slugsPermitidos && !slugsPermitidos.includes(fuente)) return json({ error: 'fuera_de_alcance' }, 403);

    let q = db.from('api_leads').select('*')
      .order('actualizado_en', { ascending: true }).order('id', { ascending: true }).limit(limite);
    if (fuente) q = q.eq('fuente', fuente);
    else if (slugsPermitidos) q = q.in('fuente', slugsPermitidos);
    const desde = url.searchParams.get('actualizado_desde');
    if (desde) q = q.gte('actualizado_en', desde);
    const cur = leerCursor(url.searchParams.get('cursor'));
    if (cur) q = q.or(`actualizado_en.gt.${cur.t},and(actualizado_en.eq.${cur.t},id.gt.${cur.id})`);

    const { data, error } = await q;
    if (error) { console.error(error); return json({ error: 'error_interno' }, 500); }
    const ult = data.length === limite ? data[data.length - 1] : null;
    return json({ datos: data, siguiente: ult ? btoa(`${ult.actualizado_en}|${ult.id}`) : null });
  }

  return json({ error: 'no_encontrado' }, 404);
});
