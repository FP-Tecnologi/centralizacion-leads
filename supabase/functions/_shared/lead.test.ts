import { describe, expect, it } from 'vitest';
import { separarLead, validarLead, type CampoFormulario } from './lead';

const campos: CampoFormulario[] = [
  { key: 'nombres', label: 'Nombres', tipo: 'texto', requerido: true },
  { key: 'email', label: 'Correo', tipo: 'email', requerido: true },
  { key: 'telefono', label: 'Teléfono', tipo: 'telefono', requerido: false },
  { key: 'ruc', label: 'RUC/DNI', tipo: 'documento', requerido: false },
  { key: 'fecha_nacimiento', label: 'Nacimiento', tipo: 'fecha', requerido: false },
  { key: 'talla', label: 'Talla', tipo: 'opcion', requerido: true, opciones: ['S', 'M', 'L'] },
];

describe('separarLead', () => {
  it('separa núcleo de extra, recorta y baja email a minúsculas', () => {
    const l = separarLead({ nombres: '  Ana ', email: ' ANA@X.COM ', talla: 'M', vacio: '  ' });
    expect(l.nombres).toBe('Ana');
    expect(l.email).toBe('ana@x.com');
    expect(l.extra).toEqual({ talla: 'M' });
  });

  it('normaliza teléfono quitando espacios y guiones', () => {
    expect(separarLead({ telefono: '987 654-321' }).telefono).toBe('987654321');
  });

  it('convierte fecha DD/MM/YYYY a ISO', () => {
    expect(separarLead({ fecha_nacimiento: '05/03/1990' }).fecha_nacimiento).toBe('1990-03-05');
  });

  it('pasa números a string en extra', () => {
    expect(separarLead({ edad: 30 }).extra).toEqual({ edad: '30' });
  });
});

describe('validarLead', () => {
  it('válido cuando cumple todo', () => {
    const l = separarLead({ nombres: 'Ana', email: 'a@x.com', talla: 'M' });
    expect(validarLead(l, campos)).toEqual([]);
  });

  it('reporta requeridos (núcleo y extra)', () => {
    const l = separarLead({ email: 'a@x.com' });
    expect(validarLead(l, campos)).toEqual([
      { campo: 'nombres', motivo: 'requerido' },
      { campo: 'talla', motivo: 'requerido' },
    ]);
  });

  it('reporta formatos inválidos', () => {
    const l = separarLead({ nombres: 'A', email: 'malo', talla: 'XL', ruc: '123', telefono: 'abc', fecha_nacimiento: '1990-13-40' });
    expect(validarLead(l, campos).map((e) => e.campo).sort()).toEqual(['email', 'fecha_nacimiento', 'ruc', 'talla', 'telefono']);
  });

  it('sin campos definidos exige al menos email o teléfono', () => {
    expect(validarLead(separarLead({ nombres: 'Ana' }), [])).toEqual([{ campo: 'email', motivo: 'contacto' }]);
    expect(validarLead(separarLead({ telefono: '987654321' }), [])).toEqual([]);
  });
});
