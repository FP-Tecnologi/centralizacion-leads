import { supabase } from '../supabase';
import { aplicarFiltro, columna, type FiltroLeads } from './filtros';
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';

export const ESTADOS = ['nuevo', 'contactado', 'asistio', 'descartado'] as const;

export interface Fuente {
  id: string; nombre: string; slug: string; tipo: 'landing' | 'offline' | 'importacion';
  dominio: string | null; estado: 'activa' | 'cerrada'; campos: CampoFormulario[];
  correo_gracias: { activo: boolean; asunto?: string; plantilla?: string } | null;
  clave_hash: string | null; actualizado_en: string;
}
export interface Lead {
  id: string; fuente_id: string; nombres: string | null; apellido: string | null; email: string | null;
  telefono: string | null; empresa: string | null; ruc: string | null; cargo: string | null; rubro: string | null;
  fecha_nacimiento: string | null; status: string; extra: Record<string, string>; created_at: string;
  actualizado_en: string; fuentes?: { nombre: string; slug: string };
}
export interface Orden { campo: string; asc: boolean }

const SELECT = '*, fuentes(nombre, slug)';

function base(f: FiltroLeads, orden: Orden) {
  const q = supabase.from('leads').select(SELECT, { count: 'exact' }).is('duplicado_de', null);
  return aplicarFiltro(q, f).order(columna(orden.campo), { ascending: orden.asc }).order('id');
}

export async function listarLeads(f: FiltroLeads, orden: Orden, pagina: number, porPagina: number) {
  const desde = (pagina - 1) * porPagina;
  const { data, count, error } = await base(f, orden).range(desde, desde + porPagina - 1);
  if (error) throw error;
  return { filas: (data ?? []) as Lead[], total: count ?? 0 };
}

export async function todosLosLeads(f: FiltroLeads, orden: Orden): Promise<Lead[]> {
  const out: Lead[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await base(f, orden).range(desde, desde + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Lead[]));
    if (!data || data.length < 1000) return out;
  }
}

export async function actualizarLead(id: string, cambios: Partial<Lead>) {
  const { fuentes: _omit, ...resto } = cambios;
  const { error } = await supabase.from('leads').update(resto).eq('id', id);
  if (error) throw error;
}

export async function cambiarEstado(ids: string[], estado: string) {
  const { error } = await supabase.from('leads').update({ status: estado }).in('id', ids);
  if (error) throw error;
}

export async function eliminarLeads(ids: string[]): Promise<void> {
  const { data, error } = await supabase.from('leads').delete().in('id', ids).select('id');
  if (error) throw error;
  // RLS deja pasar el DELETE sin error para no-admin, pero filtra las filas
  // (0 borradas): hay que distinguirlo de un borrado real.
  if (!data?.length) throw new Error('sin_permiso');
}

export async function listarFuentes(tipo?: Fuente['tipo']): Promise<Fuente[]> {
  let q = supabase.from('fuentes').select('*').order('nombre');
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data as Fuente[];
}

export async function fuentePorSlug(slug: string): Promise<Fuente | null> {
  const { data, error } = await supabase.from('fuentes').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return data as Fuente | null;
}

export async function guardarFuente(f: Partial<Fuente> & { id?: string }): Promise<Fuente> {
  const { clave_hash: _no, actualizado_en: _no2, ...datos } = f;
  const q = f.id ? supabase.from('fuentes').update(datos).eq('id', f.id) : supabase.from('fuentes').insert(datos);
  const { data, error } = await q.select('*').single();
  if (error) throw error;
  return data as Fuente;
}
