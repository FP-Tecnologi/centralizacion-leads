// Gestión de usuarios del sistema de leads (auth.admin necesita service_role). Deploy:
//   supabase functions deploy admin-usuarios   (con verificación de JWT)
//
// Reglas (espejo de _proteger_perfiles en 20260929000000_superadmin_usuarios.sql):
//   - quien llama: sesión con 2FA (aal2) y rol superadmin o admin;
//   - superadmin gestiona a todos y asigna cualquier rol;
//   - admin gestiona solo editores, lectores y cuentas sin perfil, y solo asigna esos roles;
//   - nadie se cambia el rol, se desactiva ni se elimina a sí mismo.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS, json } from '../_shared/http.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = Deno.env.get('LEADS_SITE_URL') ?? 'http://localhost:3003';
const ROLES = ['superadmin', 'admin', 'editor', 'lector'] as const;
type Rol = (typeof ROLES)[number];
const ROLES_ALTOS: (Rol | null)[] = ['superadmin', 'admin'];
// ~100 años: Supabase Auth no tiene "desactivado", se usa un ban.
const BAN = '876000h';

const HEADERS_OPTIONS = { ...CORS, 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' };

function claimsDe(jwt: string): Record<string, unknown> {
  const b64 = jwt.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
  try {
    return JSON.parse(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')));
  } catch {
    return {};
  }
}

const puedeAsignar = (quien: Rol, rol: Rol) => quien === 'superadmin' || !ROLES_ALTOS.includes(rol);
const puedeGestionar = (quien: Rol, objetivo: Rol | null) => quien === 'superadmin' || !ROLES_ALTOS.includes(objetivo);

async function rolDe(uid: string): Promise<Rol | null> {
  const { data } = await admin.from('perfiles').select('rol').eq('user_id', uid).maybeSingle();
  return (data?.rol as Rol) ?? null;
}

async function asignarFuentes(uid: string, rol: Rol, fuentes: string[]) {
  await admin.from('perfil_fuentes').delete().eq('user_id', uid);
  // superadmin/admin ven todas las fuentes: no se guardan asignaciones.
  if (!ROLES_ALTOS.includes(rol) && fuentes.length) {
    const { error } = await admin.from('perfil_fuentes').insert(fuentes.map((f) => ({ user_id: uid, fuente_id: f })));
    if (error) throw error;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: HEADERS_OPTIONS });
  if (req.method !== 'POST') return json({ error: 'metodo_no_permitido' }, 405);

  const jwt = req.headers.get('authorization')?.replace(/^Bearer /i, '') ?? '';
  const { data: { user } } = await admin.auth.getUser(jwt);
  if (!user) return json({ error: 'no_autenticado' }, 401);
  const quien = await rolDe(user.id);
  if (claimsDe(jwt).aal !== 'aal2' || !quien || !ROLES_ALTOS.includes(quien)) return json({ error: 'sin_permiso' }, 403);

  const body = await req.json().catch(() => ({}));
  const fuentes: string[] = Array.isArray(body.fuentes) ? body.fuentes.filter((f: unknown) => typeof f === 'string') : [];

  // Acciones sobre otra cuenta: validar que exista una y que quien llama pueda tocarla.
  const objetivo = async (): Promise<Response | Rol | null> => {
    if (typeof body.user_id !== 'string' || !body.user_id) return json({ error: 'datos_invalidos' }, 400);
    if (body.user_id === user.id) return json({ error: 'no_puedes_contigo' }, 400);
    const rol = await rolDe(body.user_id);
    if (!puedeGestionar(quien, rol)) return json({ error: 'sin_permiso' }, 403);
    return rol;
  };

  try {
    switch (body.accion) {
      case 'listar': {
        const { data: lista, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
        if (error) throw error;
        const [{ data: perfiles }, { data: pf }] = await Promise.all([
          admin.from('perfiles').select('user_id, nombre, rol'),
          admin.from('perfil_fuentes').select('user_id, fuente_id'),
        ]);
        const ahora = Date.now();
        return json({
          yo: { user_id: user.id, rol: quien },
          usuarios: lista.users.map((u) => {
            const p = perfiles?.find((x) => x.user_id === u.id);
            const rol = (p?.rol as Rol) ?? null;
            return {
              user_id: u.id,
              email: u.email ?? '',
              nombre: p?.nombre ?? '',
              rol,
              fuentes: (pf ?? []).filter((x) => x.user_id === u.id).map((x) => x.fuente_id),
              ultimo_ingreso: u.last_sign_in_at ?? null,
              invitacion_pendiente: !u.last_sign_in_at && !u.email_confirmed_at,
              mfa: (u.factors ?? []).some((f) => f.status === 'verified'),
              desactivado: Boolean(u.banned_until && Date.parse(u.banned_until) > ahora),
              creado_en: u.created_at,
              gestionable: u.id !== user.id && puedeGestionar(quien, rol),
            };
          }),
        });
      }

      case 'invitar': {
        const email = String(body.email ?? '').trim().toLowerCase();
        const rol = body.rol as Rol;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ROLES.includes(rol)) return json({ error: 'datos_invalidos' }, 400);
        if (!puedeAsignar(quien, rol)) return json({ error: 'sin_permiso' }, 403);
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${SITE}/auth/crear-clave`,
          data: { nombre: body.nombre ?? '' },
        });
        if (error) {
          const existe = /already|registered|exists/i.test(error.message);
          return json({ error: existe ? 'usuario_existente' : 'invitacion_fallida', detalle: error.message }, existe ? 409 : 400);
        }
        const { error: e } = await admin.from('perfiles').upsert({ user_id: data.user.id, nombre: String(body.nombre ?? '').trim(), rol });
        if (e) throw e;
        await asignarFuentes(data.user.id, rol, fuentes);
        return json({ ok: true, user_id: data.user.id });
      }

      case 'actualizar': {
        const r = await objetivo();
        if (r instanceof Response) return r;
        const rol = body.rol as Rol;
        if (!ROLES.includes(rol) || !puedeAsignar(quien, rol)) return json({ error: 'sin_permiso' }, 403);
        const cambios: Record<string, unknown> = { user_id: body.user_id, rol };
        if (typeof body.nombre === 'string') cambios.nombre = body.nombre.trim();
        const { error } = await admin.from('perfiles').upsert(cambios);
        if (error) throw error;
        await asignarFuentes(body.user_id, rol, fuentes);
        return json({ ok: true });
      }

      case 'desactivar':
      case 'reactivar': {
        const r = await objetivo();
        if (r instanceof Response) return r;
        const { error } = await admin.auth.admin.updateUserById(body.user_id, {
          ban_duration: body.accion === 'desactivar' ? BAN : 'none',
        });
        if (error) throw error;
        return json({ ok: true });
      }

      case 'reenviar': {
        const r = await objetivo();
        if (r instanceof Response) return r;
        const { data: u, error } = await admin.auth.admin.getUserById(body.user_id);
        if (error || !u.user?.email) return json({ error: 'datos_invalidos' }, 400);
        const { error: e } = await admin.auth.admin.inviteUserByEmail(u.user.email, { redirectTo: `${SITE}/auth/crear-clave` });
        if (e) return json({ error: 'invitacion_fallida', detalle: e.message }, 400);
        return json({ ok: true });
      }

      case 'eliminar': {
        const r = await objetivo();
        if (r instanceof Response) return r;
        // perfiles, perfil_fuentes y filtros_guardados caen en cascada; importaciones queda sin autor.
        const { error } = await admin.auth.admin.deleteUser(body.user_id);
        if (error) throw error;
        return json({ ok: true });
      }
    }
    return json({ error: 'accion_desconocida' }, 400);
  } catch (e) {
    return json({ error: 'error_interno', detalle: e instanceof Error ? e.message : String(e) }, 500);
  }
});
