'use client';
/*
 * Sistema de Leads — diálogos de confirmación y de texto con el diseño del sistema,
 * en lugar de window.confirm / window.prompt nativos del navegador.
 *
 *   const { confirmar, pedirTexto } = useDialogo();
 *   if (!(await confirmar({ titulo: '¿Regenerar la clave?', mensaje: '…', tono: 'aviso' }))) return;
 *   const nombre = await pedirTexto({ titulo: 'Guardar filtro', etiqueta: 'Nombre' }); // null = cancelado
 *
 * Un solo diálogo a la vez; Escape o clic fuera = cancelar. Focus trap y foco devuelto al cerrar.
 */
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

type Tono = 'peligro' | 'aviso' | 'info';

interface OpcionesBase {
  titulo: string;
  mensaje?: ReactNode;
  /** texto del botón principal (por defecto "Aceptar" / "Guardar") */
  confirmarTexto?: string;
  cancelarTexto?: string;
  tono?: Tono;
}
export interface OpcionesConfirmar extends OpcionesBase {}
export interface OpcionesTexto extends OpcionesBase {
  etiqueta: string;
  placeholder?: string;
  valorInicial?: string;
}

type Pendiente =
  | { tipo: 'confirmar'; op: OpcionesConfirmar; resolver: (v: boolean) => void }
  | { tipo: 'texto'; op: OpcionesTexto; resolver: (v: string | null) => void };

interface DialogoValue {
  confirmar(op: OpcionesConfirmar): Promise<boolean>;
  pedirTexto(op: OpcionesTexto): Promise<string | null>;
}

const Ctx = createContext<DialogoValue | null>(null);

const ICONOS: Record<Tono, ReactNode> = {
  peligro: <path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12M9 7V4a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />,
  aviso: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.24 3.957l-8.422 14.06a1.989 1.989 0 0 0 1.7 2.983h16.845a1.989 1.989 0 0 0 1.7 -2.983l-8.423 -14.06a1.989 1.989 0 0 0 -3.4 0z" /></>,
  info: <><path d="M3 12a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" /><path d="M12 9h.01" /><path d="M11 12h1v4h1" /></>,
};

export function DialogoProvider({ children }: { children: ReactNode }) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);

  const confirmar = useCallback(
    (op: OpcionesConfirmar) => new Promise<boolean>((resolver) => setPendiente({ tipo: 'confirmar', op, resolver })),
    [],
  );
  const pedirTexto = useCallback(
    (op: OpcionesTexto) => new Promise<string | null>((resolver) => setPendiente({ tipo: 'texto', op, resolver })),
    [],
  );

  const cerrar = (resultado: boolean | string | null) => {
    if (!pendiente) return;
    if (pendiente.tipo === 'confirmar') pendiente.resolver(resultado === true);
    else pendiente.resolver(typeof resultado === 'string' ? resultado : null);
    setPendiente(null);
  };

  return (
    <Ctx.Provider value={{ confirmar, pedirTexto }}>
      {children}
      {pendiente && <DialogoVista pendiente={pendiente} onCerrar={cerrar} />}
    </Ctx.Provider>
  );
}

function DialogoVista({ pendiente, onCerrar }: { pendiente: Pendiente; onCerrar: (r: boolean | string | null) => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const { op } = pendiente;
  const tono: Tono = op.tono ?? (pendiente.tipo === 'texto' ? 'info' : 'aviso');
  const [texto, setTexto] = useState(pendiente.tipo === 'texto' ? pendiente.op.valorInicial ?? '' : '');
  useFocusTrap(ref, true, pendiente.tipo === 'texto' ? 'input' : '.ax-dialogo__confirmar');

  const cancelar = () => onCerrar(pendiente.tipo === 'texto' ? null : false);
  const aceptar = () => {
    if (pendiente.tipo === 'texto') {
      if (texto.trim()) onCerrar(texto.trim());
    } else onCerrar(true);
  };
  const idTitulo = 'ax-dialogo-titulo';

  return (
    <div className="ax-dialogo" onKeyDown={(e) => e.key === 'Escape' && cancelar()}>
      <button type="button" aria-hidden="true" tabIndex={-1} className="ax-dialogo__fondo" onClick={cancelar} />
      <form
        ref={ref}
        className={`ax-dialogo__caja ax-dialogo--${tono}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onSubmit={(e) => { e.preventDefault(); aceptar(); }}
      >
        <div className="ax-dialogo__cuerpo">
          <span className="ax-dialogo__icono" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">{ICONOS[tono]}</svg>
          </span>
          <div className="ax-dialogo__texto">
            <h2 id={idTitulo} className="ax-dialogo__titulo">{op.titulo}</h2>
            {op.mensaje && <div className="ax-dialogo__mensaje">{op.mensaje}</div>}
            {pendiente.tipo === 'texto' && (
              <div className="ax-field" style={{ marginTop: 'var(--ax-space-3)' }}>
                <label className="ax-label" htmlFor="ax-dialogo-input">{pendiente.op.etiqueta}</label>
                <input id="ax-dialogo-input" className="ax-input" value={texto} placeholder={pendiente.op.placeholder}
                  onChange={(e) => setTexto(e.target.value)} autoComplete="off" />
              </div>
            )}
          </div>
        </div>
        <div className="ax-dialogo__acciones">
          <button type="button" className="ax-btn ax-btn--ghost" onClick={cancelar}>{op.cancelarTexto ?? 'Cancelar'}</button>
          <button
            type="submit"
            className={`ax-btn ax-dialogo__confirmar ${tono === 'peligro' ? 'ax-btn--danger' : 'ax-btn--primary'}`}
            disabled={pendiente.tipo === 'texto' && !texto.trim()}
          >
            {op.confirmarTexto ?? (pendiente.tipo === 'texto' ? 'Guardar' : 'Aceptar')}
          </button>
        </div>
      </form>
    </div>
  );
}

export function useDialogo(): DialogoValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDialogo fuera de DialogoProvider');
  return v;
}

export default DialogoProvider;
