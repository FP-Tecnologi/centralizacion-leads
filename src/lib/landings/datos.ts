/*
 * Sistema de Leads — CMS de landings: acceso a datos desde el dashboard
 * (sesión del usuario, RLS aplica). Escrituras:
 *   - guardar_landing (RPC security definer, exige puede_editar_fuente): guarda
 *     plantilla + contenido en landing_paginas y campos + correo en fuentes, en
 *     una sola transacción. Así un editor asignado a la fuente puede editar sin
 *     abrirle `fuentes` entero (fuentes_adm sigue siendo solo-admin).
 *   - publicar: UPDATE directo a landing_paginas.publicada; RLS + el trigger
 *     _landing_paginas_antes solo lo permiten a admin/superadmin.
 */
import { supabase } from '../supabase';
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';
import type { ContenidoLanding, CorreoGracias } from './tipos';

export interface PaginaGuardada {
  fuente_id: string;
  plantilla: string;
  contenido: unknown;
  publicada: boolean;
  publicada_en: string | null;
  actualizado_en: string;
}

export async function paginaDeFuente(fuenteId: string): Promise<PaginaGuardada | null> {
  const { data, error } = await supabase.from('landing_paginas').select('*').eq('fuente_id', fuenteId).maybeSingle();
  if (error) throw error;
  return data as PaginaGuardada | null;
}

export async function puedeEditarFuente(fuenteId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('puede_editar_fuente', { f: fuenteId });
  if (error) return false;
  return data === true;
}

export async function guardarLanding(p: {
  fuenteId: string;
  plantilla: string;
  contenido: ContenidoLanding;
  campos: CampoFormulario[];
  correo: CorreoGracias;
}): Promise<void> {
  const { error } = await supabase.rpc('guardar_landing', {
    p_fuente: p.fuenteId,
    p_plantilla: p.plantilla,
    p_contenido: p.contenido,
    p_campos: p.campos,
    p_correo: p.correo,
  });
  if (error) throw error;
}

export async function publicarLanding(fuenteId: string, publicada: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('landing_paginas')
    .update({ publicada })
    .eq('fuente_id', fuenteId)
    .select('fuente_id');
  if (error) throw error;
  if (!data?.length) throw new Error('sin_permiso');
}

/** URL pública de la landing servida por esta misma app. */
export function urlPublica(slug: string): string {
  const origen = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origen}/l/${slug}`;
}
