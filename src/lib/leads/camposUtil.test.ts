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

  it('permite derivar una clave núcleo — el formulario de Expomina las usa así', () => {
    // "Teléfono" normaliza a "telefono": es una sobreescritura válida del
    // núcleo (tipo/requerido), no se evita ni se sufija.
    expect(claveDesdeLabel('Teléfono', [])).toBe('telefono');
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

  it('no marca nada cuando todas las claves son únicas, no vacías y con formato válido', () => {
    expect(clavesInvalidas([campo('talla'), campo('color')])).toEqual(new Map());
  });

  it('marca ambas filas cuando dos comparten clave', () => {
    expect(clavesInvalidas([campo('talla'), campo('talla')])).toEqual(new Map([[0, 'duplicada'], [1, 'duplicada']]));
  });

  it('marca una clave vacía', () => {
    expect(clavesInvalidas([campo('talla'), campo('')])).toEqual(new Map([[1, 'vacia']]));
  });

  it('acepta una fila núcleo en solitario (sobreescritura legítima de tipo/requerido)', () => {
    expect(clavesInvalidas([campo('email')])).toEqual(new Map());
  });

  it('marca una clave núcleo duplicada igual que cualquier otra', () => {
    expect(clavesInvalidas([campo('email'), campo('email')])).toEqual(new Map([[0, 'duplicada'], [1, 'duplicada']]));
  });

  it('marca una clave con espacios/mayúsculas/acentos como formato inválido', () => {
    expect(clavesInvalidas([campo('Talla De Camiseta')])).toEqual(new Map([[0, 'formato']]));
    expect(clavesInvalidas([campo('teléfono')])).toEqual(new Map([[0, 'formato']]));
    expect(clavesInvalidas([campo('Talla')])).toEqual(new Map([[0, 'formato']]));
  });

  it('permite guion bajo, números y minúsculas', () => {
    expect(clavesInvalidas([campo('talla_2'), campo('color_1')])).toEqual(new Map());
  });

  it('vacía tiene prioridad sobre formato, que a su vez tiene prioridad sobre duplicada', () => {
    expect(clavesInvalidas([campo(''), campo('Mal Formato'), campo('ok'), campo('ok')])).toEqual(
      new Map([[0, 'vacia'], [1, 'formato'], [2, 'duplicada'], [3, 'duplicada']]),
    );
  });
});

describe('hayClavesInvalidas', () => {
  const campo = (key: string): CampoFormulario => ({ key, label: key, tipo: 'texto', requerido: false });
  it('true si hay alguna clave inválida', () => {
    expect(hayClavesInvalidas([campo('talla'), campo('talla')])).toBe(true);
  });
  it('true si hay una clave con formato inválido', () => {
    expect(hayClavesInvalidas([campo('Talla')])).toBe(true);
  });
  it('false si todas son válidas', () => {
    expect(hayClavesInvalidas([campo('talla')])).toBe(false);
  });
});
