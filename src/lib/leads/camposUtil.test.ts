import { describe, expect, it } from 'vitest';
import { claveDesdeLabel, clavesInvalidas, hayClavesInvalidas } from './camposUtil';
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';

describe('claveDesdeLabel', () => {
  it('normaliza la etiqueta a una clave', () => {
    expect(claveDesdeLabel('Talla de camiseta', [])).toBe('talla_de_camiseta');
  });

  it('evita chocar con una clave ya usada', () => {
    expect(claveDesdeLabel('Talla', ['talla'])).toBe('talla_2');
  });

  it('evita chocar con una clave núcleo aunque no esté en `existentes`', () => {
    // "Teléfono" normaliza a "telefono", que es núcleo: no debe generarse en
    // silencio, o un lead nuevo pisaría el teléfono real en vez de ir a `extra`.
    expect(claveDesdeLabel('Teléfono', [])).toBe('telefono_2');
  });

  it('etiqueta vacía cae a "campo"', () => {
    expect(claveDesdeLabel('', [])).toBe('campo');
  });

  it('sigue sumando sufijo hasta encontrar una clave libre', () => {
    expect(claveDesdeLabel('Talla', ['talla', 'talla_2', 'talla_3'])).toBe('talla_4');
  });
});

describe('clavesInvalidas', () => {
  const campo = (key: string): CampoFormulario => ({ key, label: key, tipo: 'texto', requerido: false });

  it('no marca nada cuando todas las claves son únicas y no vacías', () => {
    expect(clavesInvalidas([campo('talla'), campo('color')])).toEqual(new Set());
  });

  it('marca ambas filas cuando dos comparten clave', () => {
    expect(clavesInvalidas([campo('talla'), campo('talla')])).toEqual(new Set([0, 1]));
  });

  it('marca una clave vacía', () => {
    expect(clavesInvalidas([campo('talla'), campo('')])).toEqual(new Set([1]));
  });

  it('acepta una fila núcleo en solitario (sobreescritura legítima de tipo/requerido)', () => {
    expect(clavesInvalidas([campo('email')])).toEqual(new Set());
  });

  it('marca una clave núcleo duplicada igual que cualquier otra', () => {
    expect(clavesInvalidas([campo('email'), campo('email')])).toEqual(new Set([0, 1]));
  });
});

describe('hayClavesInvalidas', () => {
  const campo = (key: string): CampoFormulario => ({ key, label: key, tipo: 'texto', requerido: false });
  it('true si hay alguna clave inválida', () => {
    expect(hayClavesInvalidas([campo('talla'), campo('talla')])).toBe(true);
  });
  it('false si todas son válidas', () => {
    expect(hayClavesInvalidas([campo('talla')])).toBe(false);
  });
});
