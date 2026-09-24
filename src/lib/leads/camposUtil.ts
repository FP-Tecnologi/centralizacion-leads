/*
 * Sistema de Leads — lógica pura de claves para CamposEditor: derivación de
 * clave desde la etiqueta (evitando choques con otras claves) y detección de
 * claves vacías, con formato inválido o duplicadas dentro del propio arreglo.
 * Aparte de React para poder testearla directo.
 *
 * Las claves núcleo (email, telefono, ...) SÍ están permitidas como fila de
 * `campos` — es la forma normal de sobreescribir su tipo/requerido, y el
 * propio formulario de Expomina las usa así — por eso no se excluyen aquí ni
 * al derivar automáticamente desde la etiqueta.
 *
 * El formato (`^[a-z0-9_]+$`) importa porque `columna()` en filtros.ts arma
 * `extra->>${campo}` con la clave tal cual: una clave con espacios, acentos o
 * mayúsculas pasaría el filtro de este archivo pero rompería ese armado (o el
 * de un futuro filtro/orden por esa columna) más adelante.
 */
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';
import { normalizarEncabezado } from './mapeo';

const FORMATO_VALIDO = /^[a-z0-9_]+$/;

/** Deriva una clave única desde una etiqueta, evitando las ya usadas en `existentes`. */
export function claveDesdeLabel(label: string, existentes: string[]): string {
  const base = normalizarEncabezado(label) || 'campo';
  const reservadas = new Set(existentes);
  let candidata = base;
  let n = 2;
  while (reservadas.has(candidata)) {
    candidata = `${base}_${n}`;
    n += 1;
  }
  return candidata;
}

export type RazonClaveInvalida = 'vacia' | 'formato' | 'duplicada';

/**
 * Índice → motivo, para cada fila de `campos` cuya clave está vacía, no
 * cumple `^[a-z0-9_]+$` (columna() la rechazaría al filtrar/ordenar), o
 * duplica la de otra fila (una clave núcleo repetida cuenta igual que
 * cualquier otra: una sola fila con esa clave es una sobreescritura válida).
 */
export function clavesInvalidas(campos: CampoFormulario[]): Map<number, RazonClaveInvalida> {
  const conteo = new Map<string, number>();
  for (const c of campos) conteo.set(c.key, (conteo.get(c.key) ?? 0) + 1);
  const out = new Map<number, RazonClaveInvalida>();
  campos.forEach((c, i) => {
    if (!c.key.trim()) out.set(i, 'vacia');
    else if (!FORMATO_VALIDO.test(c.key)) out.set(i, 'formato');
    else if ((conteo.get(c.key) ?? 0) > 1) out.set(i, 'duplicada');
  });
  return out;
}

export function hayClavesInvalidas(campos: CampoFormulario[]): boolean {
  return clavesInvalidas(campos).size > 0;
}
