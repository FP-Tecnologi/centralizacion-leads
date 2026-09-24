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
  it('encabezado explícitamente vacío: columna_<letra> por posición en vez de perder la columna', async () => {
    const buf = xlsxBuffer([['Nombre', '', 'Email'], ['Ana', 'nota', 'ana@x.com']]);
    const { encabezados, filas } = await parsearBuffer(buf, 'prueba.xlsx');
    expect(encabezados).toEqual(['Nombre', 'columna_B', 'Email']);
    expect(filas[0].datos.columna_B).toBe('nota');
  });

  it('sin celda en B1 (no solo vacía: inexistente): también columna_B', async () => {
    const wb = XLSX.utils.book_new();
    // aoa_to_sheet con `undefined` en B1 no crea la celda (a diferencia de ''), que es lo
    // que SheetJS nombra "__EMPTY" en modo-objeto — acá no dependemos de esa convención.
    const ws = XLSX.utils.aoa_to_sheet([['Nombre', undefined, 'Email'], ['Ana', 'nota', 'ana@x.com']]);
    XLSX.utils.book_append_sheet(wb, ws, 'H');
    const raw = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    const buf = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer;
    const { encabezados, filas } = await parsearBuffer(buf, 'prueba.xlsx');
    expect(encabezados).toEqual(['Nombre', 'columna_B', 'Email']);
    expect(filas[0].datos.columna_B).toBe('nota');
  });
});

describe('parsearBuffer — orden de encabezados', () => {
  it('un encabezado numérico ("2024") no se adelanta al principio', async () => {
    const buf = xlsxBuffer([['Nombre', '', '2024'], ['Ana', 'nota', 'x']]);
    const { encabezados, filas } = await parsearBuffer(buf, 'prueba.xlsx');
    expect(encabezados).toEqual(['Nombre', 'columna_B', '2024']);
    expect(filas[0].datos['2024']).toBe('x');
  });
});

describe('parsearBuffer — CSV UTF-8 sin BOM', () => {
  it('decodifica acentos correctamente (no como José→JosÃ©)', async () => {
    const buf = utf8Buffer('Nombre,Ciudad\nJosé,Lima\n');
    const { filas } = await parsearBuffer(buf, 'prueba.csv');
    expect(filas[0].datos.Nombre).toBe('José');
  });
});

describe('parsearBuffer — CSV no reinterpreta fechas dd/mm como m/d', () => {
  it('mantiene "03/04/2023" tal cual (no lo vuelve "2023-03-04")', async () => {
    const buf = utf8Buffer('Nombre,Fecha\nAna,03/04/2023\n');
    const { filas } = await parsearBuffer(buf, 'prueba.csv');
    expect(filas[0].datos.Fecha).toBe('03/04/2023');
  });

  it('mantiene "15/03/2023" y ceros a la izquierda', async () => {
    const buf = utf8Buffer('Fecha,Codigo\n15/03/2023,0123\n');
    const { filas } = await parsearBuffer(buf, 'prueba.csv');
    expect(filas[0].datos.Fecha).toBe('15/03/2023');
    expect(filas[0].datos.Codigo).toBe('0123');
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
