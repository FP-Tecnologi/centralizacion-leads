/*
 * Sistema de Leads — cliente de la Edge Function admin-usuarios.
 * Las reglas de quién gestiona a quién viven en la función (y en el trigger
 * _proteger_perfiles); aquí solo se replican para ocultar acciones en la UI.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Rol } from '../context/AuthContext';

export interface Usuario {
  user_id: string;
  email: string;
  nombre: string;
  rol: Rol | null;
  fuentes: string[];
  ultimo_ingreso: string | null;
  invitacion_pendiente: boolean;
  mfa: boolean;
  desactivado: boolean;
  creado_en: string;
  gestionable: boolean;
}

export const ROLES: { valor: Rol; nombre: string; descripcion: string }[] = [
  { valor: 'superadmin', nombre: 'Superadmin', descripcion: 'Todo, y es el único que crea, cambia o quita administradores.' },
  { valor: 'admin', nombre: 'Admin', descripcion: 'Ve y configura todas las fuentes; gestiona editores y lectores.' },
  { valor: 'editor', nombre: 'Editor', descripcion: 'Importa y edita leads de las fuentes asignadas.' },
  { valor: 'lector', nombre: 'Lector', descripcion: 'Solo ve y exporta los leads de las fuentes asignadas.' },
];

export const nombreRol = (r: Rol | null) => ROLES.find((x) => x.valor === r)?.nombre ?? 'Sin rol';
export const rolesAsignables = (quien: Rol | null) =>
  ROLES.filter((r) => quien === 'superadmin' || (quien === 'admin' && (r.valor === 'editor' || r.valor === 'lector')));
/** superadmin y admin ven todas las fuentes: no llevan asignación. */
export const rolConFuentes = (r: Rol | null) => r === 'editor' || r === 'lector';

const MENSAJES: Record<string, string> = {
  sin_permiso: 'No tienes permiso para esta acción.',
  usuario_existente: 'Ya existe una cuenta con ese correo.',
  invitacion_fallida: 'No se pudo enviar la invitación.',
  datos_invalidos: 'Revisa los datos ingresados.',
  no_puedes_contigo: 'No puedes hacer esto con tu propia cuenta.',
  no_autenticado: 'Tu sesión expiró. Vuelve a ingresar.',
};

async function llamar<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', { body });
  if (error) {
    let codigo = '';
    let detalle = '';
    if (error instanceof FunctionsHttpError) {
      const r = await error.context.json().catch(() => ({}));
      codigo = r.error ?? '';
      detalle = r.detalle ?? '';
    }
    const msg = MENSAJES[codigo] ?? 'No se pudo completar la acción. Intenta de nuevo.';
    throw new Error(detalle && codigo === 'invitacion_fallida' ? `${msg} (${detalle})` : msg);
  }
  return data as T;
}

export const listarUsuarios = () => llamar<{ yo: { user_id: string; rol: Rol }; usuarios: Usuario[] }>({ accion: 'listar' });
export const invitarUsuario = (d: { email: string; nombre: string; rol: Rol; fuentes: string[] }) => llamar({ accion: 'invitar', ...d });
export const actualizarUsuario = (d: { user_id: string; nombre: string; rol: Rol; fuentes: string[] }) => llamar({ accion: 'actualizar', ...d });
export const accionUsuario = (accion: 'desactivar' | 'reactivar' | 'reenviar' | 'eliminar', user_id: string) =>
  llamar({ accion, user_id });
