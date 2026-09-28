'use client';
/*
 * Sistema de Leads — asistente de importación Excel/CSV en 3 pasos:
 * 1) archivo + fuente destino, 2) mapeo de columnas, 3) vista previa y confirmar.
 * Indicador de pasos con ax-tabs__tab (sin puerto del stepper circular de Vireo:
 * ese wizard trae validación de formulario multi-campo que no aplica aquí).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHead } from '../components/shell/PageHead';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { guardarFuente, listarColumnasExtra, listarFuentes, registrarColumnas, type ColumnaExtra, type Fuente } from '../lib/leads/datos';
import {
  CAMPOS_IMPORTACION, CLAVES_UI, LABEL_DESTINO, claveDestinoSegura, construirFilas, describirErrorServidor, esDestinoDirecto,
  inferirTipo, labelParaClaveSobrante, normalizarEncabezado, slugify, sugerirMapeo, type FilaEntrada, type Mapeo, type MarcaInvalido,
} from '../lib/leads/mapeo';
import { CeldaMarcada } from '../components/leads/CeldaMarcada';
import { exportarRegistroFallas, leerArchivo, type FallaImportacion } from '../lib/leads/exportar';
import { NUCLEO } from '../../supabase/functions/_shared/lead';

// orden fijo de columnas en la vista previa: núcleo + estado/evento/fecha de registro.
const COLS_DIRECTAS = [...NUCLEO, ...CAMPOS_IMPORTACION] as string[];
const LOTE = 500;

interface ResultadoImport { nuevas: number; actualizadas: number; erroresServidor: { fila: number; motivo: string }[] }
type Destino = 'directo' | 'existente' | 'nueva' | 'ignorar';

const PASOS = [
  { titulo: 'Archivo y fuente', ayuda: 'Sube el Excel o CSV' },
  { titulo: 'Mapear columnas', ayuda: 'Dónde va cada columna' },
  { titulo: 'Revisar e importar', ayuda: 'Vista previa y confirmar' },
];

const tamano = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const ICONO = {
  subir: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M12 11v6" /><path d="M9.5 13.5l2.5 -2.5l2.5 2.5" /></svg>,
  excel: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" /><path d="M10 12l4 5" /><path d="M10 17l4 -5" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>,
  alerta: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.24 3.957l-8.422 14.06a1.989 1.989 0 0 0 1.7 2.983h16.845a1.989 1.989 0 0 0 1.7 -2.983l-8.423 -14.06a1.989 1.989 0 0 0 -3.4 0z" /></svg>,
  descargar: <svg className="ax-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" /><path d="M7 11l5 5l5 -5" /><path d="M12 4l0 12" /></svg>,
};

export function Importar() {
  const { esAdmin, puedeEditar } = useAuth();
  const fuentePreseleccionada = useSearchParams().get('fuente');
  const [paso, setPaso] = useState(0);
  const [maxPaso, setMaxPaso] = useState(0);

  // Paso 1
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [columnasExtra, setColumnasExtra] = useState<ColumnaExtra[]>([]);
  const [cargandoFuentes, setCargandoFuentes] = useState(true);
  const [fuenteId, setFuenteId] = useState('');
  const [crearNueva, setCrearNueva] = useState(false);
  const [nombreNueva, setNombreNueva] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [filasArchivo, setFilasArchivo] = useState<FilaEntrada[]>([]);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [errorFuente, setErrorFuente] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [creandoFuente, setCreandoFuente] = useState(false);
  const inputArchivo = useRef<HTMLInputElement>(null);

  // Paso 2
  const [mapeo, setMapeo] = useState<Mapeo>({});
  const [guardandoMapeo, setGuardandoMapeo] = useState(false);
  const [errorMapeo, setErrorMapeo] = useState<string | null>(null);

  // Paso 3
  const [construido, setConstruido] = useState<ReturnType<typeof construirFilas> | null>(null);
  const [importando, setImportando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [errorImportar, setErrorImportar] = useState<string | null>(null);

  const fuente = useMemo(() => fuentes.find((f) => f.id === fuenteId), [fuentes, fuenteId]);

  useEffect(() => {
    // RLS de `fuentes` ya limita a lo que el usuario puede ver; si no puede editar nada,
    // no hay fuente destino válida y ni vale la pena listar.
    if (!puedeEditar) { setFuentes([]); setCargandoFuentes(false); return; }
    listarFuentes().then(setFuentes).catch(() => setFuentes([])).finally(() => setCargandoFuentes(false));
  }, [puedeEditar]);

  useEffect(() => {
    if (!puedeEditar) { setColumnasExtra([]); return; }
    listarColumnasExtra().then(setColumnasExtra).catch(() => setColumnasExtra([]));
  }, [puedeEditar]);

  // preselecciona la fuente cuando se llega desde "Importar" de una página de Registros.
  useEffect(() => {
    if (fuentePreseleccionada && fuentes.some((f) => f.id === fuentePreseleccionada)) {
      setFuenteId(fuentePreseleccionada);
    }
  }, [fuentePreseleccionada, fuentes]);

  const irA = (i: number) => { setPaso(i); setMaxPaso((m) => Math.max(m, i)); };

  const onArchivo = async (file: File | null) => {
    setArchivo(file);
    setErrorArchivo(null);
    setEncabezados([]);
    setFilasArchivo([]);
    // un archivo nuevo invalida cualquier mapeo/preview/resultado de uno anterior.
    setMapeo({});
    setConstruido(null);
    setResultado(null);
    setErrorImportar(null);
    setErrorMapeo(null);
    setMaxPaso(0);
    setPaso(0);
    if (!file) return;
    setLeyendo(true);
    try {
      const { encabezados: h, filas: f } = await leerArchivo(file);
      setEncabezados(h);
      setFilasArchivo(f);
    } catch {
      setErrorArchivo('No se pudo leer el archivo. Verifica que sea .xlsx, .xls o .csv.');
    } finally {
      setLeyendo(false);
    }
  };

  const quitarArchivo = () => {
    if (inputArchivo.current) inputArchivo.current.value = '';
    onArchivo(null);
  };

  const crearFuenteNueva = async () => {
    if (!nombreNueva.trim()) return;
    setErrorFuente(null);
    setCreandoFuente(true);
    try {
      const nueva = await guardarFuente({ nombre: nombreNueva.trim(), slug: slugify(nombreNueva), tipo: 'importacion', campos: [] });
      setFuentes((fs) => [...fs, nueva]);
      setFuenteId(nueva.id);
      setCrearNueva(false);
      setNombreNueva('');
    } catch {
      setErrorFuente('No se pudo crear la fuente. Verifica que el nombre no esté repetido.');
    } finally {
      setCreandoFuente(false);
    }
  };

  const avanzarAMapeo = () => {
    if (!fuente || !encabezados.length) return;
    setMapeo(sugerirMapeo(encabezados, fuente.campos, columnasExtra));
    irA(1);
  };

  // opciones del select de mapeo: — Ignorar —, NUCLEO, campos de la fuente, columnas extra
  // globales ya registradas (por label, para que "Ciudad" de un archivo nuevo caiga sobre la
  // misma columna `ciudad` de siempre), y "Campo nuevo: <encabezado>" si nada de eso calza.
  const opcionesMapeo = (encabezado: string) => {
    const out: { value: string; label: string }[] = [{ value: '', label: '— Ignorar —' }];
    const vistos = new Set<string>();
    for (const k of COLS_DIRECTAS) { out.push({ value: k, label: LABEL_DESTINO[k] ?? k }); vistos.add(k); }
    for (const c of fuente?.campos ?? []) {
      if (vistos.has(c.key)) continue;
      vistos.add(c.key);
      out.push({ value: c.key, label: c.label });
    }
    for (const c of columnasExtra) {
      if (vistos.has(c.key)) continue;
      vistos.add(c.key);
      out.push({ value: c.key, label: c.label });
    }
    // el valor de la opción "Campo nuevo" es la clave que de verdad se va a registrar: no
    // el `normalizarEncabezado` crudo (puede pasar de 63 caracteres, chocar con otra clave
    // ya en `vistos`, o normalizar justo a un nombre reservado como "status"/"fuente_slug")
    // sino la que sale de claveDestinoSegura, que trunca/sufija para que registrar_columnas
    // nunca la rechace (23514).
    // si la sugerencia automática ya eligió una clave nueva (p.ej. "Fuente" → fuente_origen),
    // esa es la opción de columna nueva — si no, el select no la tendría entre sus opciones.
    const actual = mapeo[encabezado];
    const base = normalizarEncabezado(encabezado);
    const nueva = actual && !vistos.has(actual) ? actual : base ? claveDestinoSegura(base, [...vistos, ...CLAVES_UI]) : null;
    if (nueva) out.push({ value: nueva, label: `Columna nueva: ${encabezado}` });
    return out;
  };

  // qué pasa con cada columna del archivo según su destino (se muestra en el paso 2).
  const tipoDestino = (destino: string | null | undefined): Destino => {
    if (!destino) return 'ignorar';
    if (esDestinoDirecto(destino) || fuente?.campos.some((c) => c.key === destino)) return 'directo';
    if (columnasExtra.some((c) => c.key === destino)) return 'existente';
    return 'nueva';
  };

  const confirmarMapeo = async () => {
    if (!fuente) return;
    setErrorMapeo(null);
    // Todo destino no-núcleo mapeado (sea "campo nuevo" o una columna extra global ya
    // registrada) se manda a registrarColumnas — no solo los brand-new: el RPC ya protege
    // un label/tipo puesto a mano, así que reenviar uno existente es inofensivo, y así
    // "Ciudad" de un archivo nuevo también refresca/confirma la columna `ciudad` de
    // siempre. label = encabezado original del archivo, tipo = inferido de sus valores.
    // Ya no requiere admin (antes bloqueaba a editores): es una columna global, no toca
    // la definición de formulario de la fuente, que sigue siendo solo-admin vía RLS.
    const primerEncabezadoPorDestino = new Map<string, string>();
    for (const [h, destino] of Object.entries(mapeo)) {
      if (destino && !esDestinoDirecto(destino) && !primerEncabezadoPorDestino.has(destino)) {
        primerEncabezadoPorDestino.set(destino, h);
      }
    }
    const colsPrimarias: ColumnaExtra[] = [...primerEncabezadoPorDestino.entries()].map(([key, encabezado]) => ({
      key,
      label: encabezado,
      tipo: inferirTipo(filasArchivo.map((f) => String(f.datos[encabezado] ?? '')), encabezado),
    }));

    // construirFilas puede generar sus propias claves "sobrantes" (claveExtraLibre) cuando
    // dos columnas del archivo mapean al mismo destino — solo se conocen corriendo
    // construirFilas una primera vez. También se registran (el auto-registro de
    // upsert_lead ahora solo mira claves que la fuente ya declara, así que si no se
    // registran acá jamás se vuelven columna real).
    const tiposPrimarios = Object.fromEntries(colsPrimarias.map((c) => [c.key, c.tipo]));
    const primeraPasada = construirFilas(filasArchivo, mapeo, fuente.campos, tiposPrimarios);
    const clavesPrimarias = new Set(colsPrimarias.map((c) => c.key));
    const clavesSobrantes = new Set<string>();
    for (const { lead } of primeraPasada.filas) {
      for (const k of Object.keys(lead.extra)) {
        if (!clavesPrimarias.has(k)) clavesSobrantes.add(k);
      }
    }
    const colsSobrantes: ColumnaExtra[] = [...clavesSobrantes].map((key) => ({
      key,
      label: labelParaClaveSobrante(key, mapeo),
      tipo: inferirTipo(
        primeraPasada.filas.map(({ lead }) => lead.extra[key]).filter((v): v is string => typeof v === 'string'),
      ),
    }));

    const cols = [...colsPrimarias, ...colsSobrantes];
    if (cols.length) {
      setGuardandoMapeo(true);
      // una por una (no un solo lote): así, si una falla (p.ej. tope de 200 columnas
      // alcanzado), se sabe exactamente cuál y por qué, y las demás igual quedan
      // registradas — en vez de un error genérico que frena todo el mapeo.
      const fallidas: string[] = [];
      for (const col of cols) {
        try {
          await registrarColumnas([col]);
        } catch (e) {
          fallidas.push(`"${col.label}" (${col.key}): ${e instanceof Error ? e.message : 'error desconocido'}`);
        }
      }
      setColumnasExtra((prev) => {
        const previas = new Set(prev.map((c) => c.key));
        return [...prev, ...cols.filter((c) => !previas.has(c.key))].sort((a, b) => a.label.localeCompare(b.label));
      });
      setGuardandoMapeo(false);
      // no frena la importación: el dato igual se guarda en el lead (extra), solo que esa
      // columna no aparece como columna propia en tabla/filtros hasta registrarla.
      setErrorMapeo(fallidas.length
        ? `Estas columnas no se pudieron crear como columna propia (sus datos se guardan igual dentro del lead): ${fallidas.join('; ')}`
        : null);
    }
    // fechas extra en DD/MM/YYYY -> ISO antes de enviar: leads_completo (SQL) solo castea
    // ISO, y un DD/MM/YYYY guardado tal cual saldría null ahí para siempre. Se corre
    // construirFilas de nuevo (ahora con los tipos de las claves sobrantes también) en vez
    // de reusar `primeraPasada`, que no las normalizó.
    const tiposExtra = Object.fromEntries(cols.map((c) => [c.key, c.tipo]));
    setConstruido(construirFilas(filasArchivo, mapeo, fuente.campos, tiposExtra));
    setResultado(null);
    setErrorImportar(null);
    irA(2);
  };

  const importar = async () => {
    if (!construido || !archivo || !fuenteId) return;
    setImportando(true);
    setErrorImportar(null);
    setProgreso(0);
    // todas las filas se envían (las que tienen datos a revisar van con su marca en `invalidos`).
    const validas = construido.filas;
    const totalLotes = Math.max(1, Math.ceil(validas.length / LOTE));
    let nuevas = 0;
    let actualizadas = 0;
    const erroresServidor: { fila: number; motivo: string }[] = [];
    let loteActual = 0;
    try {
      for (let i = 0; i < validas.length; i += LOTE) {
        loteActual += 1;
        const lote = validas.slice(i, i + LOTE);
        // controller: p_archivo lleva "(lote k/n)" cuando hay más de un lote, para que el
        // historial de importaciones sea honesto sobre que fue un envío partido.
        const nombreArchivo = totalLotes > 1 ? `${archivo.name} (lote ${loteActual}/${totalLotes})` : archivo.name;
        try {
          const { data, error } = await supabase.rpc('importar_leads', {
            p_fuente: fuenteId,
            p_filas: lote.map((v) => v.lead as unknown as Record<string, unknown>),
            p_archivo: nombreArchivo,
          });
          if (error) throw error;
          nuevas += data.nuevas;
          actualizadas += data.actualizadas;
          for (const e of data.errores as { fila: number; motivo: string }[]) {
            erroresServidor.push({ fila: lote[e.fila - 1].fila, motivo: describirErrorServidor(e.motivo) });
          }
          setProgreso(Math.min(i + LOTE, validas.length));
        } catch (e) {
          // un lote falla (red, permiso, etc.): lo ya guardado en lotes anteriores queda
          // en la base — se muestra como resultado parcial en vez de perderlo en un error genérico.
          const msg = e instanceof Error ? e.message : 'error desconocido';
          const desde = lote[0].fila;
          const hasta = lote[lote.length - 1].fila;
          setErrorImportar(
            `Se guardaron ${nuevas + actualizadas} filas (${nuevas} nuevas, ${actualizadas} actualizadas) antes del error; `
            + `falló el lote ${loteActual} (filas ${desde}–${hasta}): ${msg}`,
          );
          setResultado({ nuevas, actualizadas, erroresServidor });
          return;
        }
      }
      setResultado({ nuevas, actualizadas, erroresServidor });
    } finally {
      setImportando(false);
    }
  };

  // Registro de fallas en Excel: las filas que no pasaron la revisión previa + las que el
  // servidor rechazó al guardar (si ya se importó), con la causa de cada una y los datos
  // originales del archivo para corregirlas ahí mismo y volver a importar solo esas.
  const fallas = useMemo<FallaImportacion[]>(() => {
    if (!construido) return [];
    const originalPorFila = new Map(filasArchivo.map((f, i) => [f.fila ?? i + 2, f.datos]));
    return [
      ...construido.observadas.map((e) => ({ fila: e.fila, causas: e.causas, etapa: 'validacion' as const, original: e.original })),
      ...(resultado?.erroresServidor ?? []).map((e) => ({
        fila: e.fila, causas: [e.motivo], etapa: 'servidor' as const, original: originalPorFila.get(e.fila) ?? {},
      })),
    ];
  }, [construido, resultado, filasArchivo]);

  const descargarFallas = async () => {
    const base = (archivo?.name ?? 'importacion').replace(/\.[^.]+$/, '');
    await exportarRegistroFallas(fallas, encabezados, `fallas-${base}`);
  };

  // columnas de la vista previa: las directas que aparezcan en alguna fila + "Columnas adicionales".
  const colsPreview = useMemo(() => {
    if (!construido) return [];
    const presentes = new Set<string>();
    for (const { lead } of construido.filas) for (const k of Object.keys(lead)) presentes.add(k);
    return COLS_DIRECTAS.filter((k) => presentes.has(k));
  }, [construido]);

  if (!puedeEditar) {
    return (
      <>
        <PageHead title="Importar leads" />
        <div className="ax-card"><div className="ax-card__body"><p className="imp-muted">No tienes permiso para importar leads.</p></div></div>
      </>
    );
  }

  const totalObservadas = construido?.observadas.length ?? 0;
  const ignoradas = encabezados.filter((h) => !mapeo[h]).length;
  const parcial = !!errorImportar || (resultado?.erroresServidor.length ?? 0) > 0;

  return (
    <>
      <PageHead title="Importar leads" subtitle="Sube un Excel o CSV en 3 pasos." />

      <div className="ax-card ax-col--12">
        <ol className="imp-steps" aria-label="Pasos de importación">
          {PASOS.map((p, i) => (
            <li key={p.titulo} className={`${paso === i ? 'is-active' : ''}${i < paso ? ' is-done' : ''}`}>
              <button
                type="button"
                className="imp-step"
                aria-current={paso === i ? 'step' : undefined}
                disabled={i > maxPaso || importando || !!resultado}
                onClick={() => i <= maxPaso && setPaso(i)}
              >
                <span className="imp-step__num">{i < paso ? ICONO.check : i + 1}</span>
                <span className="imp-step__text">
                  <span className="imp-step__title">{p.titulo}</span>
                  <span className="imp-step__hint">{p.ayuda}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {paso === 0 && (
          <div className="imp-body">
            <div className="imp-grid">
              <div className="imp-stack">
                <span className="ax-label">Archivo</span>
                {!archivo ? (
                  <label
                    className={`imp-drop${arrastrando ? ' is-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={(e) => { e.preventDefault(); setArrastrando(false); onArchivo(e.dataTransfer.files?.[0] ?? null); }}
                  >
                    <input
                      ref={inputArchivo}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      aria-label="Elegir archivo para importar"
                      onChange={(e) => onArchivo(e.target.files?.[0] ?? null)}
                    />
                    <span className="imp-drop__icon">{ICONO.subir}</span>
                    <p className="imp-drop__title">Arrastra tu archivo aquí</p>
                    <span className="ax-btn ax-btn--secondary ax-btn--sm" aria-hidden="true">Seleccionar archivo</span>
                    <p className="imp-muted">Excel (.xlsx, .xls) o CSV</p>
                  </label>
                ) : (
                  <div className={`imp-file${errorArchivo ? ' is-error' : ''}`}>
                    <span className="imp-file__icon">{ICONO.excel}</span>
                    <div className="imp-file__info">
                      <p className="imp-file__name" title={archivo.name}>{archivo.name}</p>
                      <p className="imp-file__meta">
                        {leyendo ? 'Leyendo archivo…' : errorArchivo ? 'No se pudo leer' : `${filasArchivo.length} filas · ${tamano(archivo.size)}`}
                      </p>
                    </div>
                    <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={quitarArchivo}>Cambiar</button>
                  </div>
                )}
                {errorArchivo && <p role="alert" className="imp-msg imp-msg--danger">{errorArchivo}</p>}
              </div>

              <div className="imp-stack">
                {!crearNueva ? (
                  <div className="ax-field">
                    <label className="ax-label" htmlFor="imp-fuente">Fuente destino</label>
                    <select id="imp-fuente" className="ax-select" value={fuenteId} onChange={(e) => setFuenteId(e.target.value)} disabled={cargandoFuentes}>
                      <option value="">{cargandoFuentes ? 'Cargando…' : 'Selecciona una fuente'}</option>
                      {fuentes.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                    </select>
                    <p className="imp-muted" style={{ marginTop: 'var(--ax-space-1)' }}>
                      Landing o evento al que pertenecen los leads.
                      {esAdmin && (
                        <>
                          {' '}
                          <button type="button" className="imp-link" onClick={() => { setCrearNueva(true); setErrorFuente(null); }}>Crear nueva</button>
                        </>
                      )}
                    </p>
                  </div>
                ) : (
                  <form className="ax-field" onSubmit={(e) => { e.preventDefault(); crearFuenteNueva(); }}>
                    <label className="ax-label" htmlFor="imp-nueva">Nombre de la nueva fuente</label>
                    <input id="imp-nueva" className="ax-input" placeholder="Ej.: Feria Minera 2026" value={nombreNueva}
                      onChange={(e) => setNombreNueva(e.target.value)} autoFocus />
                    <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', marginTop: 'var(--ax-space-2)' }}>
                      <button type="submit" className="ax-btn ax-btn--primary ax-btn--sm" disabled={!nombreNueva.trim() || creandoFuente}>
                        {creandoFuente ? 'Creando…' : 'Crear'}
                      </button>
                      <button type="button" className="ax-btn ax-btn--ghost ax-btn--sm" onClick={() => { setCrearNueva(false); setNombreNueva(''); setErrorFuente(null); }}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
                {errorFuente && <p role="alert" className="imp-msg imp-msg--danger">{errorFuente}</p>}
              </div>
            </div>

            <div className="imp-actions">
              <div className="imp-actions__end">
                <button type="button" className="ax-btn ax-btn--primary" disabled={!fuente || !filasArchivo.length || !!errorArchivo || leyendo} onClick={avanzarAMapeo}>
                  Continuar
                </button>
              </div>
            </div>
          </div>
        )}

        {paso === 1 && fuente && (
          <div className="imp-body">
            <p className="imp-muted">
              Revisa dónde se guarda cada columna. Ya lo sugerimos por ti; cambia solo lo que no esté bien.
              {ignoradas > 0 && <> <b>{ignoradas}</b> columna{ignoradas === 1 ? '' : 's'} no se guardará{ignoradas === 1 ? '' : 'n'}.</>}
            </p>

            <div className="imp-map" role="table" aria-label="Columnas del archivo">
              <div className="imp-map__row imp-map__head" role="row">
                <span role="columnheader">Columna del archivo</span>
                <span role="columnheader">Ejemplo</span>
                <span role="columnheader">Se guarda en</span>
              </div>
              {encabezados.map((h) => {
                // ejemplo: primer valor no vacío de la columna (la primera fila suele venir incompleta).
                const ejemplo = filasArchivo.find((f) => String(f.datos[h] ?? '').trim() !== '')?.datos[h];
                const tipo = tipoDestino(mapeo[h]);
                return (
                  <div key={h} className={`imp-map__row${tipo === 'ignorar' ? ' is-ignored' : ''}`} role="row">
                    <span className="imp-map__col" role="cell">
                      {h}
                      {tipo === 'nueva' && <span className="ax-badge ax-badge--soft ax-badge--pill ax-badge--sm ax-badge--accent imp-map__new">nueva</span>}
                    </span>
                    <span className="imp-map__sample" role="cell" title={String(ejemplo ?? '')}>
                      {ejemplo !== undefined && String(ejemplo) !== '' ? String(ejemplo) : <i>vacía</i>}
                    </span>
                    <span className="imp-map__field" role="cell">
                      <select
                        className="ax-select ax-select--sm"
                        value={mapeo[h] ?? ''}
                        onChange={(e) => setMapeo((m) => ({ ...m, [h]: e.target.value || null }))}
                        aria-label={`Guardar "${h}" en`}
                      >
                        {opcionesMapeo(h).map((o) => <option key={o.value} value={o.value}>{o.value ? o.label : 'No guardar'}</option>)}
                      </select>
                    </span>
                  </div>
                );
              })}
            </div>

            {errorMapeo && <p role="alert" className="imp-msg imp-msg--warning">{errorMapeo}</p>}

            <div className="imp-actions">
              <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setPaso(0)}>Atrás</button>
              <div className="imp-actions__end">
                <button type="button" className="ax-btn ax-btn--primary" disabled={guardandoMapeo || ignoradas === encabezados.length} onClick={confirmarMapeo}>
                  {guardandoMapeo ? 'Preparando…' : 'Continuar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {paso === 2 && construido && (
          <div className="imp-body">
            {!resultado && (
              <>
                <div className="imp-stats">
                  <div className="imp-stat imp-stat--accent">
                    <span className="imp-stat__value">{construido.filas.length}</span>
                    <span className="imp-stat__label">leads a importar</span>
                  </div>
                  <div className={`imp-stat ${totalObservadas ? 'imp-stat--warning' : 'imp-stat--success'}`}>
                    <span className="imp-stat__value">{totalObservadas}</span>
                    <span className="imp-stat__label">con datos a revisar</span>
                  </div>
                </div>

                {totalObservadas > 0 && (
                  <div className="imp-msg imp-msg--warning imp-msg--row">
                    <span>Se importan igual y quedan marcados en la tabla para que los corrijas.</span>
                    <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={descargarFallas}>
                      {ICONO.descargar}<span>Ver detalle (Excel)</span>
                    </button>
                  </div>
                )}

                {!!construido.filas.length && (
                  <div className="imp-stack">
                    <span className="ax-label">Vista previa{construido.filas.length > 10 ? ' (primeras 10 filas)' : ''}</span>
                    <div className="imp-preview">
                      <table className="ax-table">
                        <thead className="ax-table__head">
                          <tr>
                            <th className="ax-table__th" scope="col">Fila</th>
                            {colsPreview.map((k) => <th key={k} className="ax-table__th" scope="col">{LABEL_DESTINO[k] ?? k}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {construido.filas.slice(0, 10).map(({ fila, lead }) => {
                            const marcas = (lead.invalidos ?? {}) as Record<string, MarcaInvalido>;
                            return (
                              <tr key={fila} className="ax-table__row">
                                <td className="ax-table__td ax-num">{fila}</td>
                                {colsPreview.map((k) => (
                                  <td key={k} className="ax-table__td">
                                    <CeldaMarcada valor={String((lead as unknown as Record<string, unknown>)[k] ?? '')} marca={marcas[k]} />
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importando && (
                  <div className="ax-progress ax-progress--md" role="progressbar" aria-valuemin={0} aria-valuemax={construido.filas.length} aria-valuenow={progreso} aria-label="Progreso de importación">
                    <div className="ax-progress__track">
                      <div className="ax-progress__fill" style={{ width: `${construido.filas.length ? (progreso / construido.filas.length) * 100 : 0}%` }} />
                    </div>
                    <span className="ax-progress__value">{progreso}/{construido.filas.length}</span>
                  </div>
                )}

                <div className="imp-actions">
                  <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setPaso(1)} disabled={importando}>Atrás</button>
                  <div className="imp-actions__end">
                    <button type="button" className="ax-btn ax-btn--primary" disabled={!construido.filas.length || importando} onClick={importar}>
                      {importando ? 'Importando…' : `Importar ${construido.filas.length} lead${construido.filas.length === 1 ? '' : 's'}`}
                    </button>
                  </div>
                </div>
              </>
            )}

            {errorImportar && <p role="alert" className="imp-msg imp-msg--danger">{errorImportar}</p>}

            {resultado && (
              <>
                <div className={`imp-result${parcial ? ' imp-result--partial' : ''}`} role="status">
                  <span className="imp-result__icon">{parcial ? ICONO.alerta : ICONO.check}</span>
                  <div>
                    <h3>{parcial ? 'Importación terminada con observaciones' : '¡Importación completada!'}</h3>
                    <p className="imp-muted">
                      {resultado.nuevas} nuevo{resultado.nuevas === 1 ? '' : 's'} · {resultado.actualizadas} actualizado{resultado.actualizadas === 1 ? '' : 's'}
                      {totalObservadas > 0 && <> · {totalObservadas} a revisar</>}
                      {resultado.erroresServidor.length > 0 && <> · {resultado.erroresServidor.length} sin guardar</>}
                    </p>
                  </div>
                </div>

                <div className="imp-actions">
                  <button type="button" className="ax-btn ax-btn--ghost" onClick={quitarArchivo}>Importar otro archivo</button>
                  <div className="imp-actions__end">
                    {fallas.length > 0 && (
                      <button type="button" className="ax-btn ax-btn--secondary" onClick={descargarFallas}>
                        {ICONO.descargar}<span>Descargar observaciones</span>
                      </button>
                    )}
                    <Link href={`/leads?fuente=${fuenteId}`} className="ax-btn ax-btn--primary">Ver leads</Link>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default Importar;
