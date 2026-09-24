/*
 * Sistema de Leads — lógica pura de claves para CamposEditor: derivación de
 * clave desde la etiqueta (evitando choques con otras claves y con los
 * núcleo, para que un campo nuevo no se confunda en silencio con
 * nombres/email/...) y detección de claves vacías o duplicadas dentro del
 * propio arreglo. Aparte de React para poder testearla directo.
 */
import { NUCLEO, type CampoFormulario } from '../../../supabase/functions/_shared/lead';
import { normalizarEncabezado } from './mapeo';

/** Deriva una clave única desde una etiqueta: evita las ya usadas y los núcleo. */
export function claveDesdeLabel(label: string, existentes: string[]): string {
  const base = normalizarEncabezado(label) || 'campo';
  const reservadas = new Set([...existentes, ...NUCLEO]);
  let candidata = base;
  let n = 2;
  while (reservadas.has(candidata)) {
    candidata = `${base}_${n}`;
    n += 1;
  }
  return candidata;
}

/**
 * Índices de `campos` con clave vacía o duplicada dentro del propio arreglo.
 * Un campo núcleo (p.ej. "email") es válido en solitario — es la forma normal
 * de sobreescribir su tipo/requerido — pero si aparece más de una vez (dos
 * filas con la misma clave, núcleo o no) ambas quedan marcadas.
 */
export function clavesInvalidas(campos: CampoFormulario[]): Set<number> {
  const conteo = new Map<string, number>();
  for (const c of campos) conteo.set(c.key, (conteo.get(c.key) ?? 0) + 1);
  const out = new Set<number>();
  campos.forEach((c, i) => {
    if (!c.key.trim() || (conteo.get(c.key) ?? 0) > 1) out.add(i);
  });
  return out;
}

export function hayClavesInvalidas(campos: CampoFormulario[]): boolean {
  return clavesInvalidas(campos).size > 0;
}
