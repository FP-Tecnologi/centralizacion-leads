import { describe, expect, it } from 'vitest';
import { aFechaISO, serialExcelAISO } from './fechas';

describe('serialExcelAISO', () => {
  it('convierte el serial de Excel a ISO (46281 = 2026-09-16)', () => {
    expect(serialExcelAISO(46281)).toBe('2026-09-16');
    expect(serialExcelAISO(23564)).toBe('1964-07-06');
  });
  it('ignora la hora (parte decimal)', () => {
    expect(serialExcelAISO(46281.75)).toBe('2026-09-16');
  });
  it('fuera de rango → null', () => {
    expect(serialExcelAISO(0)).toBeNull();
    expect(serialExcelAISO(3_000_000)).toBeNull();
  });
});

describe('aFechaISO', () => {
  it('ISO, con y sin hora', () => {
    expect(aFechaISO('2026-09-16')).toBe('2026-09-16');
    expect(aFechaISO('2026-09-16 10:30')).toBe('2026-09-16');
    expect(aFechaISO('2026-09-16T10:30:00Z')).toBe('2026-09-16');
  });
  it('DD/MM/AAAA (día primero)', () => {
    expect(aFechaISO('03/04/2023')).toBe('2023-04-03');
    expect(aFechaISO('16.09.2026')).toBe('2026-09-16');
  });
  it('mes abreviado en español o inglés', () => {
    expect(aFechaISO('16-Sep-2026')).toBe('2026-09-16');
    expect(aFechaISO('16 set 2026')).toBe('2026-09-16');
    expect(aFechaISO('1 dic. 2025')).toBe('2025-12-01');
  });
  it('serial solo si se permite', () => {
    expect(aFechaISO('46281')).toBeNull();
    expect(aFechaISO('46281', true)).toBe('2026-09-16');
  });
  it('fechas imposibles → null', () => {
    expect(aFechaISO('31/02/2026')).toBeNull();
    expect(aFechaISO('hola')).toBeNull();
  });
});
