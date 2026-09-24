'use client';
/*
 * Sistema de Leads — asistente de importación Excel/CSV en 3 pasos:
 * 1) archivo + fuente destino, 2) mapeo de columnas, 3) vista previa y confirmar.
 * Indicador de pasos con ax-tabs__tab (sin puerto del stepper circular de Vireo:
 * ese wizard trae validación de formulario multi-campo que no aplica aquí).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { PageHead } from '../components/shell/PageHead';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { guardarFuente, listarColumnasExtra, listarFuentes, registrarColumnas, type ColumnaExtra, type Fuente } from '../lib/leads/datos';
import { claveDestinoSegura, construirFilas, inferirTipo, labelParaClaveSobrante, normalizarEncabezado, slugify, sugerirMapeo, type FilaEntrada, type Mapeo } from '../lib/leads/mapeo';
import { exportarObjetos, leerArchivo } from '../lib/leads/exportar';
import { NUCLEO, type ErrorCampo } from '../../supabase/functions/_shared/lead';

const LABEL_NUCLEO: Record<string, string> = {
  nombres: 'Nombres', apellido: 'Apellido', email: 'Correo', telefono: 'Teléfono',
  empresa: 'Empresa', ruc: 'RUC/DNI', cargo: 'Cargo', rubro: 'Rubro', fecha_nacimiento: 'Fecha de nacimiento',
};
const MOTIVO: Record<ErrorCampo['motivo'], string> = {
  requerido: 'Requerido', formato: 'Formato inválido', contacto: 'Indica correo o teléfono',
};
const MAX_FILAS = 50_000;
const LOTE = 500;

interface ImportacionHist { id: string; archivo: string; nuevas: number; actualizadas: number; errores: number; creado_en: string }
interface ResultadoImport { nuevas: number; actualizadas: number; erroresServidor: { fila: number; motivo: string }[] }

const PASOS = ['Archivo y fuente', 'Mapear columnas', 'Vista previa y confirmar'];

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
  const [historial, setHistorial] = useState<ImportacionHist[]>([]);

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
      if (f.length > MAX_FILAS) {
        setErrorArchivo(`El archivo tiene ${f.length} filas; el máximo permitido es ${MAX_FILAS.toLocaleString('es-PE')}.`);
        return;
      }
      setEncabezados(h);
      setFilasArchivo(f);
    } catch {
      setErrorArchivo('No se pudo leer el archivo. Verifica que sea .xlsx, .xls o .csv.');
    } finally {
      setLeyendo(false);
    }
  };

  const avanzarAMapeo = () => {
    if (!fuente || !encabezados.length) return;
    setMapeo(sugerirMapeo(encabezados, fuente.campos));
    irA(1);
  };

  // opciones del select de mapeo: — Ignorar —, NUCLEO, campos de la fuente, columnas extra
  // globales ya registradas (por label, para que "Ciudad" de un archivo nuevo caiga sobre la
  // misma columna `ciudad` de siempre), y "Campo nuevo: <encabezado>" si nada de eso calza.
  const opcionesMapeo = (encabezado: string) => {
    const out: { value: string; label: string }[] = [{ value: '', label: '— Ignorar —' }];
    const vistos = new Set<string>();
    for (const k of NUCLEO) { out.push({ value: k, label: LABEL_NUCLEO[k] ?? k }); vistos.add(k); }
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
    const base = normalizarEncabezado(encabezado);
    if (base) {
      const nueva = claveDestinoSegura(base, vistos);
      out.push({ value: nueva, label: `Campo nuevo: ${encabezado}` });
    }
    return out;
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
      if (destino && !(NUCLEO as readonly string[]).includes(destino) && !primerEncabezadoPorDestino.has(destino)) {
        primerEncabezadoPorDestino.set(destino, h);
      }
    }
    const colsPrimarias: ColumnaExtra[] = [...primerEncabezadoPorDestino.entries()].map(([key, encabezado]) => ({
      key,
      label: encabezado,
      tipo: inferirTipo(filasArchivo.map((f) => String(f.datos[encabezado] ?? ''))),
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
    for (const { lead } of primeraPasada.validas) {
      for (const k of Object.keys(lead.extra)) {
        if (!clavesPrimarias.has(k)) clavesSobrantes.add(k);
      }
    }
    const colsSobrantes: ColumnaExtra[] = [...clavesSobrantes].map((key) => ({
      key,
      label: labelParaClaveSobrante(key, mapeo),
      tipo: inferirTipo(
        primeraPasada.validas.map(({ lead }) => lead.extra[key]).filter((v): v is string => typeof v === 'string'),
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
      if (fallidas.length) {
        setErrorMapeo(`No se pudieron registrar estas columnas: ${fallidas.join('; ')}`);
        return;
      }
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

  const cargarHistorial = async (fid: string) => {
    const { data } = await supabase
      .from('importaciones')
      .select('id, archivo, nuevas, actualizadas, errores, creado_en')
      .eq('fuente_id', fid)
      .order('creado_en', { ascending: false })
      .limit(10);
    setHistorial((data ?? []) as ImportacionHist[]);
  };

  const importar = async () => {
    if (!construido || !archivo || !fuenteId) return;
    setImportando(true);
    setErrorImportar(null);
    setProgreso(0);
    const validas = construido.validas;
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
            erroresServidor.push({ fila: lote[e.fila - 1].fila, motivo: e.motivo });
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
          cargarHistorial(fuenteId);
          return;
        }
      }
      setResultado({ nuevas, actualizadas, erroresServidor });
      cargarHistorial(fuenteId);
    } finally {
      setImportando(false);
    }
  };

  const descargarErrores = async () => {
    if (!construido) return;
    const filas = construido.errores.map((e) => ({
      ...e.original,
      errores: e.errores.map((er) => `${er.campo}: ${MOTIVO[er.motivo]}`).join('; '),
    }));
    // directo con exportarObjetos (no exportarLeads/valorColumna): las filas del archivo
    // pueden traer columnas literalmente llamadas "nombre" o "fuente", que valorColumna
    // trata como casos especiales de Lead y las perdería.
    await exportarObjetos(filas, [...encabezados, 'errores'], 'csv', 'errores-importacion');
  };

  if (!puedeEditar) {
    return (
      <>
        <PageHead title="Importar leads" />
        <p className="ax-card__subtitle">No tienes permiso para importar leads.</p>
      </>
    );
  }

  const totalConError = (construido?.errores.length ?? 0) + (resultado?.erroresServidor.length ?? 0);

  return (
    <>
      <PageHead title="Importar leads" subtitle="Excel (.xlsx, .xls) o CSV. Máximo 50 000 filas por archivo." />

      <div className="ax-card ax-col--12">
        <div className="ax-tabs ax-tabs--pill" style={{ padding: 'var(--ax-space-4) var(--ax-space-5) 0' }}>
          <div className="ax-tabs__list" role="tablist" aria-label="Pasos de importación">
            {PASOS.map((p, i) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={paso === i}
                className={`ax-tabs__tab${paso === i ? ' is-active' : ''}`}
                disabled={i > maxPaso}
                onClick={() => i <= maxPaso && setPaso(i)}
              >
                {i + 1}. {p}
              </button>
            ))}
          </div>
        </div>

        <div className="ax-card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
          {paso === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)', maxWidth: 560 }}>
              <div className="ax-field">
                <label className="ax-label" htmlFor="imp-archivo">Archivo</label>
                <input
                  id="imp-archivo"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="ax-input"
                  onChange={(e) => onArchivo(e.target.files?.[0] ?? null)}
                />
                {leyendo && <p className="ax-card__subtitle">Leyendo archivo…</p>}
                {errorArchivo && <p role="alert" style={{ color: 'var(--ax-danger-500)' }}>{errorArchivo}</p>}
                {!errorArchivo && !!filasArchivo.length && (
                  <p className="ax-card__subtitle ax-num">{filasArchivo.length} filas detectadas, {encabezados.length} columnas.</p>
                )}
              </div>

              <div className="ax-field">
                <label className="ax-label" htmlFor="imp-fuente">Fuente destino</label>
                {!crearNueva ? (
                  <select
                    id="imp-fuente"
                    className="ax-select"
                    value={fuenteId}
                    onChange={(e) => setFuenteId(e.target.value)}
                    disabled={cargandoFuentes}
                  >
                    <option value="">Selecciona una fuente…</option>
                    {fuentes.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select>
                ) : (
                  <input
                    className="ax-input"
                    placeholder="Nombre de la nueva fuente"
                    value={nombreNueva}
                    onChange={(e) => setNombreNueva(e.target.value)}
                  />
                )}
                {errorFuente && <p role="alert" style={{ color: 'var(--ax-danger-500)' }}>{errorFuente}</p>}
                {esAdmin && (
                  <button
                    type="button"
                    className="ax-btn ax-btn--link ax-btn--sm"
                    style={{ marginTop: 'var(--ax-space-2)' }}
                    onClick={async () => {
                      if (!crearNueva) { setCrearNueva(true); setErrorFuente(null); return; }
                      if (!nombreNueva.trim()) return;
                      setErrorFuente(null);
                      try {
                        const nueva = await guardarFuente({
                          nombre: nombreNueva.trim(), slug: slugify(nombreNueva), tipo: 'importacion', campos: [],
                        });
                        setFuentes((fs) => [...fs, nueva]);
                        setFuenteId(nueva.id);
                        setCrearNueva(false);
                        setNombreNueva('');
                      } catch {
                        setErrorFuente('No se pudo crear la fuente. Verifica que el nombre no esté repetido.');
                      }
                    }}
                  >
                    {crearNueva ? 'Guardar fuente nueva' : 'Crear fuente de importación nueva'}
                  </button>
                )}
              </div>

              <div>
                <button
                  type="button"
                  className="ax-btn ax-btn--primary"
                  disabled={!fuente || !filasArchivo.length || !!errorArchivo}
                  onClick={avanzarAMapeo}
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {paso === 1 && fuente && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
              <div className="ax-table-wrap">
                <table className="ax-table">
                  <thead className="ax-table__head">
                    <tr>
                      <th className="ax-table__th" scope="col">Columna del archivo</th>
                      <th className="ax-table__th" scope="col">Ejemplo (primera fila)</th>
                      <th className="ax-table__th" scope="col">Guardar como</th>
                    </tr>
                  </thead>
                  <tbody>
                    {encabezados.map((h) => (
                      <tr key={h} className="ax-table__row">
                        <td className="ax-table__td">{h}</td>
                        <td className="ax-table__td">{String(filasArchivo[0]?.datos[h] ?? '')}</td>
                        <td className="ax-table__td">
                          <select
                            className="ax-select ax-select--sm"
                            value={mapeo[h] ?? ''}
                            onChange={(e) => setMapeo((m) => ({ ...m, [h]: e.target.value || null }))}
                            aria-label={`Guardar "${h}" como`}
                          >
                            {opcionesMapeo(h).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {errorMapeo && <p role="alert" style={{ color: 'var(--ax-danger-500)' }}>{errorMapeo}</p>}
              <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setPaso(0)}>Atrás</button>
                <button type="button" className="ax-btn ax-btn--primary" disabled={guardandoMapeo} onClick={confirmarMapeo}>
                  {guardandoMapeo ? 'Registrando columnas…' : 'Continuar'}
                </button>
              </div>
            </div>
          )}

          {paso === 2 && construido && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ax-space-4)' }}>
              {!resultado && (
                <>
                  <p className="ax-num">
                    <b style={{ color: 'var(--ax-success-500)' }}>{construido.validas.length} filas válidas</b>
                    {construido.errores.length > 0 && <>, <b style={{ color: 'var(--ax-danger-500)' }}>{construido.errores.length} con errores</b></>}
                  </p>

                  {!!construido.validas.length && (
                    <div className="ax-table-wrap">
                      <table className="ax-table">
                        <thead className="ax-table__head">
                          <tr>{Object.keys(construido.validas[0].lead).filter((k) => k !== 'extra').map((k) => <th key={k} className="ax-table__th" scope="col">{LABEL_NUCLEO[k] ?? k}</th>)}<th className="ax-table__th" scope="col">Extra</th></tr>
                        </thead>
                        <tbody>
                          {construido.validas.slice(0, 20).map(({ fila, lead }) => (
                            <tr key={fila} className="ax-table__row">
                              {Object.keys(construido.validas[0].lead).filter((k) => k !== 'extra').map((k) => (
                                <td key={k} className="ax-table__td">{String((lead as unknown as Record<string, unknown>)[k] ?? '')}</td>
                              ))}
                              <td className="ax-table__td">{Object.entries(lead.extra).map(([k, v]) => `${k}: ${v}`).join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!!construido.errores.length && (
                    <div>
                      <div className="ax-cluster" style={{ justifyContent: 'space-between' }}>
                        <h3 className="ax-card__title" style={{ fontSize: 'var(--ax-text-md)' }}>Filas con errores</h3>
                        <button type="button" className="ax-btn ax-btn--secondary ax-btn--sm" onClick={descargarErrores}>Descargar errores (CSV)</button>
                      </div>
                      <ul style={{ margin: 0, paddingInlineStart: 'var(--ax-space-5)', fontSize: 'var(--ax-text-sm)' }}>
                        {construido.errores.slice(0, 50).map((e) => (
                          <li key={e.fila}>
                            Fila {e.fila}: {e.errores.map((er) => `${er.campo} (${MOTIVO[er.motivo]})`).join(', ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                    <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setPaso(1)} disabled={importando}>Atrás</button>
                    <button type="button" className="ax-btn ax-btn--primary" disabled={!construido.validas.length || importando} onClick={importar}>
                      {importando ? `Importando… ${progreso}/${construido.validas.length}` : `Importar ${construido.validas.length} filas`}
                    </button>
                  </div>
                </>
              )}

              {errorImportar && <p role="alert" style={{ color: 'var(--ax-danger-500)' }}>{errorImportar}</p>}

              {resultado && (
                <>
                  <p className="ax-num" style={{ fontSize: 'var(--ax-text-lg)' }}>
                    {resultado.nuevas} nuevas, {resultado.actualizadas} actualizadas
                    {totalConError > 0 && <>, {totalConError} con error</>}
                  </p>
                  {!!resultado.erroresServidor.length && (
                    <ul style={{ margin: 0, paddingInlineStart: 'var(--ax-space-5)', fontSize: 'var(--ax-text-sm)' }}>
                      {resultado.erroresServidor.map((e, i) => <li key={i}>Fila {e.fila}: {e.motivo}</li>)}
                    </ul>
                  )}
                  <div>
                    <Link href={`/leads?fuente=${fuenteId}`} className="ax-btn ax-btn--primary">Ver en la tabla</Link>
                  </div>

                  {!!historial.length && (
                    <div>
                      <h3 className="ax-card__title" style={{ fontSize: 'var(--ax-text-md)' }}>Últimas importaciones de esta fuente</h3>
                      <div className="ax-table-wrap">
                        <table className="ax-table">
                          <thead className="ax-table__head">
                            <tr>
                              <th className="ax-table__th" scope="col">Archivo</th>
                              <th className="ax-table__th" scope="col">Nuevas</th>
                              <th className="ax-table__th" scope="col">Actualizadas</th>
                              <th className="ax-table__th" scope="col">Errores</th>
                              <th className="ax-table__th" scope="col">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historial.map((h) => (
                              <tr key={h.id} className="ax-table__row">
                                <td className="ax-table__td">{h.archivo}</td>
                                <td className="ax-table__td">{h.nuevas}</td>
                                <td className="ax-table__td">{h.actualizadas}</td>
                                <td className="ax-table__td">{h.errores}</td>
                                <td className="ax-table__td">{new Date(h.creado_en).toLocaleString('es-PE')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Importar;
