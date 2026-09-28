'use client';
/*
 * Renderiza sus hijos directo en <body>. Para modales y paneles: dentro del shell,
 * cualquier ancestro con backdrop-filter/transform vuelve "position: fixed" relativo
 * a ese ancestro, y el encabezado fijo (z-index de header) los tapaba o recortaba.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function EnBody({ children }: { children: ReactNode }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  return montado ? createPortal(children, document.body) : null;
}

export default EnBody;
