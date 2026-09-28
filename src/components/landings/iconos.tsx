/* Íconos inline (trazo Tabler) usados por las landings públicas y el asistente. */
import type { ReactNode } from 'react';

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconoCalendario = () => <Svg><path d="M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M16 3v4M8 3v4M4 11h16" /></Svg>;
export const IconoLugar = () => <Svg><path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0-6 0" /><path d="M17.66 16.66L13.41 20.9a2 2 0 0 1-2.83 0l-4.24-4.24a8 8 0 1 1 11.32 0z" /></Svg>;
export const IconoCheck = () => <Svg><path d="M5 12l5 5l10-10" /></Svg>;
export const IconoFlechas = () => <Svg><path d="M7 7l5 5l-5 5" /><path d="M13 7l5 5l-5 5" /></Svg>;
export const IconoWeb = () => <Svg><path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0-18 0" /><path d="M3.6 9h16.8M3.6 15h16.8" /><path d="M11.5 3a17 17 0 0 0 0 18M12.5 3a17 17 0 0 1 0 18" /></Svg>;
export const IconoCorreo = () => <Svg><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M3 7l9 6l9-6" /></Svg>;

/** Íconos que rotan en las tarjetas de "Sobre nosotros". */
export const ICONOS_VALOR = [
  () => <Svg><path d="M8 9h8M8 13h6" /><path d="M18 4a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-5l-5 3v-3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z" /></Svg>,
  () => <Svg><path d="M12 3a12 12 0 0 0 8.5 3a12 12 0 0 1-8.5 15a12 12 0 0 1-8.5-15a12 12 0 0 0 8.5-3" /><path d="M9 12l2 2l4-4" /></Svg>,
  () => <Svg><path d="M20 11A8.1 8.1 0 0 0 4.5 9M4 5v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></Svg>,
];
