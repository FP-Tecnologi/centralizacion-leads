'use client';
/*
 * Sistema de Leads — asistente de importación Excel/CSV en 3 pasos:
 * 1) archivo + fuente destino, 2) mapeo de columnas, 3) vista previa y confirmar.
 * Indicador de pasos con ax-tabs__tab (sin puerto del stepper circular de Vireo:
 * ese wizard trae validación de formulario multi-campo que no aplica aquí).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PageHead } from '../components/shell/PageHead';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { guardarFuente, listarFuentes, type Fuente, type Lead } from '../lib/leads/datos';
import { construirFilas, normalizarEncabezado, slugify, sugerirMapeo, type Mapeo } from '../lib/leads/mapeo';
import { exportarLeads, leerArchivo } from '../lib/leads/exportar';
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
  const [paso, setPaso] = useState(0);
  const [maxPaso, setMaxPaso] = useState(0);

  // Paso 1
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [cargandoFuentes, setCargandoFuentes] = useState(true);
  const [fuenteId, setFuenteId] = useState('');
  const [crearNueva, setCrearNueva] = useState(false);
  const [nombreNueva, setNombreNueva] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [encabezados, setEncabezados] = useState<string[]>([]);
  const [filasArchivo, setFilasArchivo] = useState<Record<string, unknown>[]>([]);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
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
    listarFuentes()
      .then((fs) => setFuentes(fs.filter((f) => puedeEditar)))
      .catch(() => setFuentes([]))
      .finally(() => setCargandoFuentes(false));
  }, [puedeEditar]);

  const irA = (i: number) => { setPaso(i); setMaxPaso((m) => Math.max(m, i)); };

  const onArchivo = async (file: File | null) => {
    setArchivo(file);
    setErrorArchivo(null);
    setEncabezados([]);
    setFilasArchivo([]);
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

  // opciones del select de mapeo: — Ignorar —, NUCLEO, campos de la fuente, "Campo nuevo: <encabezado>"
  const opcionesMapeo = (encabezado: string) => {
    const out: { value: string; label: string }[] = [{ value: '', label: '— Ignorar —' }];
    for (const k of NUCLEO) out.push({ value: k, label: LABEL_NUCLEO[k] ?? k });
    for (const c of fuente?.campos ?? []) {
      if ((NUCLEO as readonly string[]).includes(c.key)) continue;
      out.push({ value: c.key, label: c.label });
    }
    const nueva = normalizarEncabezado(encabezado);
    if (nueva && !out.some((o) => o.value === nueva)) out.push({ value: nueva, label: `Campo nuevo: ${nueva}` });
    return out;
  };

  const confirmarMapeo = async () => {
    if (!fuente) return;
    setErrorMapeo(null);
    // campos nuevos: destinos mapeados que no son núcleo ni ya están declarados en la fuente
    const declarados = new Set(fuente.campos.map((c) => c.key));
    const nucleoSet = new Set<string>(NUCLEO);
    const nuevos = [...new Set(Object.values(mapeo).filter((v): v is string => !!v && !nucleoSet.has(v) && !declarados.has(v)))];
    if (nuevos.length) {
      if (!esAdmin) {
        setErrorMapeo('Hay columnas mapeadas a campos nuevos; solo un administrador puede crearlos. Elige "— Ignorar —" o un campo existente.');
        return;
      }
      setGuardandoMapeo(true);
      try {
        const campos = [...fuente.campos, ...nuevos.map((key) => ({ key, label: key, tipo: 'texto' as const, requerido: false }))];
        const actualizada = await guardarFuente({ id: fuente.id, campos });
        setFuentes((fs) => fs.map((f) => (f.id === actualizada.id ? actualizada : f)));
      } catch {
        setErrorMapeo('No se pudieron guardar los campos nuevos. Intenta de nuevo.');
        setGuardandoMapeo(false);
        return;
      }
      setGuardandoMapeo(false);
    }
    const campos = fuentes.find((f) => f.id === fuenteId)?.campos ?? fuente.campos;
    setConstruido(construirFilas(filasArchivo, mapeo, campos));
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
    let nuevas = 0;
    let actualizadas = 0;
    const erroresServidor: { fila: number; motivo: string }[] = [];
    try {
      const validas = construido.validas;
      for (let i = 0; i < validas.length; i += LOTE) {
        const lote = validas.slice(i, i + LOTE);
        const { data, error } = await supabase.rpc('importar_leads', {
          p_fuente: fuenteId,
          p_filas: lote.map((v) => v.lead as unknown as Record<string, unknown>),
          p_archivo: archivo.name,
        });
        if (error) throw error;
        nuevas += data.nuevas;
        actualizadas += data.actualizadas;
        for (const e of data.errores as { fila: number; motivo: string }[]) {
          erroresServidor.push({ fila: lote[e.fila - 1].fila, motivo: e.motivo });
        }
        setProgreso(Math.min(i + LOTE, validas.length));
      }
      setResultado({ nuevas, actualizadas, erroresServidor });
      cargarHistorial(fuenteId);
    } catch (e) {
      setErrorImportar(e instanceof Error ? e.message : 'No se pudo importar. Intenta de nuevo.');
    } finally {
      setImportando(false);
    }
  };

  const descargarErrores = async () => {
    if (!construido) return;
    const filas = construido.errores.map((e) => ({
      ...e.original,
      errores: e.errores.map((er) => `${er.campo}: ${MOTIVO[er.motivo]}`).join('; '),
    })) as unknown as Lead[];
    const columnas = [...encabezados, 'errores'].map((k) => ({ key: k, label: k }));
    await exportarLeads(filas, columnas, 'csv', 'errores-importacion');
  };

  if (!puedeEditar) {
    return (
      <>
        <PageHead title="Importar leads" />
        <p className="ax-card__subtitle">No tienes permiso para importar leads.</p>
      </>
    );
  }

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
                {esAdmin && (
                  <button
                    type="button"
                    className="ax-btn ax-btn--link ax-btn--sm"
                    style={{ marginTop: 'var(--ax-space-2)' }}
                    onClick={async () => {
                      if (!crearNueva) { setCrearNueva(true); return; }
                      if (!nombreNueva.trim()) return;
                      setErrorArchivo(null);
                      try {
                        const nueva = await guardarFuente({
                          nombre: nombreNueva.trim(), slug: slugify(nombreNueva), tipo: 'importacion', campos: [],
                        });
                        setFuentes((fs) => [...fs, nueva]);
                        setFuenteId(nueva.id);
                        setCrearNueva(false);
                        setNombreNueva('');
                      } catch {
                        setErrorArchivo('No se pudo crear la fuente. Verifica que el nombre no esté repetido.');
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
                        <td className="ax-table__td">{String(filasArchivo[0]?.[h] ?? '')}</td>
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
                  {guardandoMapeo ? 'Guardando campos…' : 'Continuar'}
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

                  {errorImportar && <p role="alert" style={{ color: 'var(--ax-danger-500)' }}>{errorImportar}</p>}

                  <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)' }}>
                    <button type="button" className="ax-btn ax-btn--secondary" onClick={() => setPaso(1)} disabled={importando}>Atrás</button>
                    <button type="button" className="ax-btn ax-btn--primary" disabled={!construido.validas.length || importando} onClick={importar}>
                      {importando ? `Importando… ${progreso}/${construido.validas.length}` : `Importar ${construido.validas.length} filas`}
                    </button>
                  </div>
                </>
              )}

              {resultado && (
                <>
                  <p className="ax-num" style={{ fontSize: 'var(--ax-text-lg)' }}>
                    {resultado.nuevas} nuevas, {resultado.actualizadas} actualizadas
                    {resultado.erroresServidor.length > 0 && <>, {resultado.erroresServidor.length} con error</>}
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
