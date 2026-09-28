'use client';
/*
 * Sistema de Leads — formulario público de una landing del CMS. Se arma desde
 * `fuentes.campos` (el mismo arreglo que valida ingresar-lead) y valida en el
 * navegador con la misma lógica compartida (separarLead/validarLead de
 * supabase/functions/_shared/lead.ts), así los mensajes coinciden con lo que
 * rechazaría el servidor.
 *
 * Modos:
 *   publico       envía a la Edge Function ingresar-lead ({ slug, datos }).
 *                 OJO: hoy ingresar-lead exige además `clave`; cómo la obtiene
 *                 una landing del CMS es una decisión pendiente (ver PR).
 *   vista-previa  no envía nada: "Siguiente"/"Enviar" solo avanzan, para revisar
 *                 el diseño en el asistente sin llenar datos reales.
 */
import { useId, useState, type FormEvent } from 'react';
import {
  separarLead, validarLead, type CampoFormulario, type ErrorCampo,
} from '../../../supabase/functions/_shared/lead';
import { dividirEnPasos, mensajeError, parrafos } from '../../lib/landings/contenido';
import type { ContenidoLanding } from '../../lib/landings/tipos';
import { IconoCheck, IconoFlechas } from './iconos';

export type ModoLanding = 'publico' | 'vista-previa';

interface Props {
  campos: CampoFormulario[];
  textos: ContenidoLanding['formulario'];
  gracias: ContenidoLanding['gracias'];
  slug: string;
  modo: ModoLanding;
  cerrada: boolean;
  correoContacto?: string;
  /** Solo vista previa: mostrar directamente el mensaje de agradecimiento. */
  forzarGracias?: boolean;
}

function atributos(c: CampoFormulario): Record<string, string | number> {
  switch (c.tipo) {
    case 'email': return { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 120 };
    case 'telefono': return { type: 'tel', inputMode: 'tel', autoComplete: 'tel', maxLength: 20 };
    case 'documento': return { type: 'text', inputMode: 'numeric', maxLength: 11 };
    case 'numero': return { type: 'text', inputMode: 'decimal', maxLength: 30 };
    case 'fecha': return { type: 'date' };
    default: {
      const auto: Record<string, string> = { nombres: 'given-name', apellido: 'family-name', empresa: 'organization' };
      return { type: 'text', autoComplete: auto[c.key] ?? 'on', maxLength: 200 };
    }
  }
}

export function FormularioLanding({
  campos, textos, gracias, slug, modo, cerrada, correoContacto, forzarGracias,
}: Props) {
  const id = useId();
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [paso, setPaso] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState('');
  const [trampa, setTrampa] = useState('');

  const pasos = textos.en_pasos ? dividirEnPasos(campos, 3) : [campos];
  const actual = Math.min(paso, pasos.length - 1);
  const esUltimo = actual === pasos.length - 1;
  const previa = modo === 'vista-previa';

  if (forzarGracias || enviado) {
    return (
      <div className="lp-gracias" role="status">
        <div className="lp-gracias__icono"><IconoCheck /></div>
        <h3 className="lp-gracias__titulo">{gracias.titulo || '¡Gracias!'}</h3>
        <div className="lp-gracias__msg">{parrafos(gracias.mensaje).map((p, i) => <p key={i}>{p}</p>)}</div>
        {previa && enviado && !forzarGracias && (
          <button type="button" className="lp-link" onClick={() => { setEnviado(false); setPaso(0); }}>Ver el formulario otra vez</button>
        )}
      </div>
    );
  }

  if (cerrada) {
    return (
      <div className="lp-cerrado">
        <p className="lp-cerrado__titulo">El registro está cerrado</p>
        <p className="lp-aviso">Gracias por tu interés. Esta convocatoria ya no recibe registros.</p>
      </div>
    );
  }

  const validar = (keys: string[], final: boolean): Record<string, string> => {
    const lead = separarLead(valores);
    const out: Record<string, string> = {};
    const porKey = new Map(campos.map((c) => [c.key, c]));
    for (const e of validarLead(lead, campos)) {
      if (e.motivo === 'contacto') {
        if (!final) continue;
        const destino = porKey.has('email') ? 'email' : porKey.has('telefono') ? 'telefono' : '';
        if (destino) out[destino] = mensajeError(e);
        else out.__general = mensajeError(e);
        continue;
      }
      if (keys.includes(e.campo) && !out[e.campo]) out[e.campo] = mensajeError(e, porKey.get(e.campo));
    }
    return out;
  };

  const cambiar = (key: string, v: string) => {
    setValores((prev) => ({ ...prev, [key]: v }));
    if (errores[key]) setErrores(({ [key]: _omit, ...resto }) => resto);
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');
    if (previa) {
      if (esUltimo) setEnviado(true);
      else setPaso(actual + 1);
      return;
    }
    const keys = (esUltimo ? campos : pasos[actual]).map((c) => c.key);
    const encontrados = validar(keys, esUltimo);
    if (Object.keys(encontrados).length) {
      const { __general, ...porCampo } = encontrados;
      setErrores(porCampo);
      if (__general) setErrorGeneral(__general);
      const primero = campos.find((c) => porCampo[c.key]);
      if (primero) {
        const idx = pasos.findIndex((p) => p.some((c) => c.key === primero.key));
        if (idx >= 0 && idx !== actual) setPaso(idx);
      }
      return;
    }
    if (!esUltimo) { setPaso(actual + 1); return; }

    const datos: Record<string, string> = {};
    for (const c of campos) {
      const v = (valores[c.key] ?? '').trim();
      if (v) datos[c.key] = v;
    }
    setEnviando(true);
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const res = await fetch(`${url}/functions/v1/ingresar-lead`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, datos, website: trampa }),
      });
      if (res.ok) { setEnviado(true); return; }
      const cuerpo = (await res.json().catch(() => ({}))) as { error?: string; errores?: ErrorCampo[] };
      if (cuerpo.error === 'campo_invalido' && cuerpo.errores?.length) {
        const porKey = new Map(campos.map((c) => [c.key, c]));
        const out: Record<string, string> = {};
        for (const er of cuerpo.errores) out[er.campo] = mensajeError(er, porKey.get(er.campo));
        setErrores(out);
        const idx = pasos.findIndex((p) => p.some((c) => out[c.key]));
        if (idx >= 0) setPaso(idx);
        return;
      }
      if (cuerpo.error === 'fuente_cerrada') setErrorGeneral('El registro está cerrado.');
      else if (res.status === 429) setErrorGeneral('Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.');
      else setErrorGeneral(`No pudimos enviar tu registro. Intenta de nuevo${correoContacto ? ` o escríbenos a ${correoContacto}` : ''}.`);
    } catch {
      setErrorGeneral('No pudimos conectarnos. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  const visibles = pasos[actual] ?? [];

  return (
    <form className="lp-form" onSubmit={enviar} noValidate>
      {pasos.length > 1 && (
        <div className="lp-pasos" aria-label={`Paso ${actual + 1} de ${pasos.length}`}>
          {pasos.map((_, i) => (
            <div key={i} className={`lp-pasos__item${i <= actual ? ' is-hecho' : ''}${i === actual ? ' is-activo' : ''}`}>
              <div className="lp-pasos__barra" />
              <span className="lp-pasos__txt">Paso {i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {previa && <p className="lp-nota">Vista previa: el formulario no envía datos.</p>}
      {!campos.length && <p className="lp-nota">Todavía no hay campos. Agrégalos en el paso “Formulario”.</p>}

      {visibles.map((c) => {
        const cid = `${id}-${c.key}`;
        const err = errores[c.key];
        const comunes = {
          id: cid,
          name: c.key,
          className: 'lp-input',
          value: valores[c.key] ?? '',
          'aria-invalid': err ? true : undefined,
          'aria-describedby': err ? `${cid}-err` : undefined,
          required: c.requerido,
        };
        return (
          <div className="lp-campo" key={c.key}>
            <label className="lp-label" htmlFor={cid}>
              {c.label || c.key}{c.requerido && <span className="lp-label__req" aria-hidden="true">*</span>}
            </label>
            {c.tipo === 'opcion' ? (
              <select {...comunes} onChange={(e) => cambiar(c.key, e.target.value)}>
                <option value="">{c.placeholder || 'Selecciona una opción'}</option>
                {(c.opciones ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input {...comunes} {...atributos(c)} placeholder={c.placeholder ?? ''} onChange={(e) => cambiar(c.key, e.target.value)} />
            )}
            {err && <p className="lp-error" id={`${cid}-err`}>{err}</p>}
          </div>
        );
      })}

      <div className="lp-trampa" aria-hidden="true">
        <label>No llenar <input tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} /></label>
      </div>

      <div className="lp-acciones">
        <button type="submit" className="lp-btn lp-btn--block" disabled={enviando}>
          <IconoFlechas />
          {enviando ? 'Enviando…' : esUltimo ? (textos.boton || 'Enviar') : 'Siguiente'}
        </button>
        {actual > 0 && (
          <button type="button" className="lp-btn lp-btn--sec lp-btn--block" onClick={() => setPaso(actual - 1)}>Atrás</button>
        )}
      </div>

      {errorGeneral && <p className="lp-alerta" role="alert">{errorGeneral}</p>}
      {textos.aviso && <p className="lp-aviso">{textos.aviso}</p>}
    </form>
  );
}
