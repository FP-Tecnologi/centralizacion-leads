import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { parsearBuffer, sanitizarCsv } from './exportar';

function xlsxBuffer(aoa: unknown[][]): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(wb, ws, 'H');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function utf8Buffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

describe('parsearBuffer — fechas', () => {
  it('convierte una celda de fecha real (formato 14) a texto ISO', async () => {
    const buf = xlsxBuffer([['Nombre', 'Fecha de nacimiento'], ['Ana', new Date(2023, 2, 15)]]);
    const { filas } = await parsearBuffer(buf, 'prueba.xlsx');
    expect(filas[0].datos['Fecha de nacimiento']).toBe('2023-03-15');
  });
});

describe('parsearBuffer — encabezados duplicados', () => {
  it('deja ambas columnas "Email" accesibles (encabezados y filas usan las mismas claves)', async () => {
    const buf = xlsxBuffer([['Email', 'Email', 'Nombre'], ['a@x.com', 'b@x.com', 'Ana']]);
    const { encabezados, filas } = await parsearBuffer(buf, 'prueba.xlsx');
    const colsEmail = encabezados.filter((h) => h.startsWith('Email'));
    expect(colsEmail).toHaveLength(2);
    expect(colsEmail.map((h) => filas[0].datos[h]).sort()).toEqual(['a@x.com', 'b@x.com']);
  });
});

describe('parsearBuffer — filas en blanco', () => {
  it('reporta el número de fila real de Excel, saltando la fila vacía', async () => {
    const buf = xlsxBuffer([['Nombre', 'Email'], ['Ana', 'ana@x.com'], [], ['Luis', 'luis@x.com']]);
    const { filas } = await parsearBuffer(buf, 'prueba.xlsx');
    expect(filas.map((f) => f.fila)).toEqual([2, 4]);
  });
});

describe('parsearBuffer — encabezado en blanco', () => {
  it('asigna columna_<letra> por posición en vez de perder la columna', async () => {
    const buf = xlsxBuffer([['Nombre', '', 'Email'], ['Ana', 'nota', 'ana@x.com']]);
    const { encabezados, filas } = await parsearBuffer(buf, 'prueba.xlsx');
    expect(encabezados).toEqual(['Nombre', 'columna_B', 'Email']);
    expect(filas[0].datos.columna_B).toBe('nota');
  });
});

describe('parsearBuffer — CSV UTF-8 sin BOM', () => {
  it('decodifica acentos correctamente (no como José→JosÃ©)', async () => {
    const buf = utf8Buffer('Nombre,Ciudad\nJosé,Lima\n');
    const { filas } = await parsearBuffer(buf, 'prueba.csv');
    expect(filas[0].datos.Nombre).toBe('José');
  });
});

describe('sanitizarCsv', () => {
  it('antepone comilla simple a valores que Excel/Sheets podrían tratar como fórmula', () => {
    expect(sanitizarCsv('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(sanitizarCsv('+1234')).toBe("'+1234");
    expect(sanitizarCsv('-1234')).toBe("'-1234");
    expect(sanitizarCsv('@cmd')).toBe("'@cmd");
    expect(sanitizarCsv('\tmalicioso')).toBe("'\tmalicioso");
  });

  it('no toca texto normal', () => {
    expect(sanitizarCsv('Ana Ruiz')).toBe('Ana Ruiz');
    expect(sanitizarCsv('ana@imp.com')).toBe('ana@imp.com');
  });
});
