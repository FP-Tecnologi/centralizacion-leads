'use client';
/*
 * Sistema de Leads — asistente del CMS de landings (/landings/nueva y
 * /landings/[slug]/editar). Cinco pasos:
 *   1 Diseño (plantilla; nombre y dirección si es nueva)
 *   2 Contenido y colores
 *   3 Formulario
 *   4 Agradecimiento (mensaje en página + correo)
 *   5 Revisar y publicar
 * con vista previa en vivo al costado (debajo, con selector, en pantallas chicas).
 *
 * Todo se edita en memoria y se guarda junto con "Guardar" (RPC guardar_landing):
 * una landing nueva se crea en el primer guardado (insert en `fuentes`, solo
 * admin por RLS) y la URL pasa a /landings/<slug>/editar conservando el paso.
 * Permisos: crear = admin/superadmin; editar = puede_editar_fuente (admin o
 * editor asignado); publicar = admin/superadmin (lo impone también la base).
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { fuentePorSlug, guardarFuente, type Fuente } from '../../../lib/leads/datos';
import { hayClavesInvalidas } from '../../../lib/leads/camposUtil';
import { slugify } from '../../../lib/leads/mapeo';
import { refrescarFuentes } from '../../../hooks/useFuentesMenu';
import type { CampoFormulario } from '../../../../supabase/functions/_shared/lead';
import {
  contenidoDe, correoHtml, escribirRuta, limpiarCampos, revisarLanding, slugValido,
} from '../../../lib/landings/contenido';
import { PLANTILLA_POR_DEFECTO, plantillaPorId } from '../../../lib/landings/plantillas';
import { guardarLanding, paginaDeFuente, publicarLanding, puedeEditarFuente, urlPublica } from '../../../lib/landings/datos';
import type { ContenidoLanding, CorreoGracias } from '../../../lib/landings/tipos';
import { PageHead } from '../../shell/PageHead';
import { IconoCheck } from '../iconos';
import { PasoContenido } from './PasoContenido';
import { PasoFormulario } from './PasoFormulario';
import { PasoGracias } from './PasoGracias';
import { PasoPlantilla } from './PasoPlantilla';
import { PasoRevisar } from './PasoRevisar';
import { VistaPrevia } from './VistaPrevia';
import './wizard.css';

const PASOS = ['Diseño', 'Contenido', 'Formulario', 'Agradecimiento', 'Publicar'] as const;
const DESCRIPCION = [
  'Elige cómo se verá tu landing.',
  'Textos, logos y colores de la página.',
  'Qué datos le pedirás a cada persona.',
  'Qué ve y qué recibe al registrarse.',
  'Revisa que todo esté listo y publícala.',
];

function correoInicial(): CorreoGracias {
  return { activo: false, asunto: '', texto: 'Hola {{nombre}},\n\nGracias por registrarte. Pronto nos pondremos en contacto contigo.' };
}

export function LandingWizard({ slug, pasoInicial = 0 }: { slug?: string; pasoInicial?: number }) {
  const { esAdmin, perfil } = useAuth();
  // `superadmin` llega con el módulo Usuarios (20260929000000); se compara como string
  // para no depender de que el tipo Perfil ya lo incluya.
  const esAdministrador = esAdmin || String(perfil?.rol) === 'superadmin';
  const router = useRouter();
  const nueva = !slug;

  const [fuente, setFuente] = useState<Fuente | null | undefined>(nueva ? null : undefined);
  const [puedeEditar, setPuedeEditar] = useState(nueva);
  const [nombre, setNombre] = useState('');
  const [slugNuevo, setSlugNuevo] = useState('');
  const [slugTocado, setSlugTocado] = useState(false);

  const [plantilla, setPlantilla] = useState(PLANTILLA_POR_DEFECTO);
  const [contenido, setContenido] = useState<ContenidoLanding>(() => plantillaPorId(PLANTILLA_POR_DEFECTO).contenido);
  const [campos, setCampos] = useState<CampoFormulario[]>(() => plantillaPorId(PLANTILLA_POR_DEFECTO).campos);
  const [correo, setCorreo] = useState<CorreoGracias>(correoInicial);
  const [publicada, setPublicada] = useState(false);
  const [clavesGuardadas, setClavesGuardadas] = useState<Set<string>>(new Set());

  const [paso, setPaso] = useState(Math.min(Math.max(pasoInicial, 0), PASOS.length - 1));
  const [vista, setVista] = useState<'editar' | 'previa'>('editar');
  const [sucio, setSucio] = useState(false);
  const [tocado, setTocado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Carga de una landing existente.
  useEffect(() => {
    if (!slug) return;
    let vivo = true;
    (async () => {
      try {
        const f = await fuentePorSlug(slug);
        if (!vivo) return;
        if (!f || f.tipo !== 'landing') { setFuente(null); return; }
        const [pagina, puede] = await Promise.all([paginaDeFuente(f.id), puedeEditarFuente(f.id)]);
        if (!vivo) return;
        const id = pagina?.plantilla ?? PLANTILLA_POR_DEFECTO;
        setPlantilla(id);
        setContenido(contenidoDe(id, pagina?.contenido ?? {}));
        // Una fuente sin campos (creada antes del CMS) arranca con los de la plantilla.
        setCampos(f.campos?.length ? f.campos : plantillaPorId(id).campos);
        setClavesGuardadas(new Set((f.campos ?? []).map((c) => c.key)));
        // Sin HTML propio ni texto del CMS: se ofrece el mensaje simple por defecto
        // (si no, send-thank-you caería a su HTML genérico de EXPOMINA).
        const cg = f.correo_gracias as CorreoGracias | null;
        setCorreo(cg ? (cg.plantilla || cg.texto !== undefined ? { ...cg } : { ...cg, texto: correoInicial().texto }) : correoInicial());
        setPublicada(!!pagina?.publicada);
        setTocado(!!pagina);
        setPuedeEditar(puede);
        setFuente(f);
      } catch {
        if (vivo) setFuente(null);
      }
    })();
    return () => { vivo = false; };
  }, [slug]);

  // Aviso al salir con cambios sin guardar.
  useEffect(() => {
    if (!sucio) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [sucio]);

  const camposLimpios = useMemo(() => limpiarCampos(campos), [campos]);
  const revision = useMemo(
    () => revisarLanding(contenido, camposLimpios, fuente?.estado ?? 'activa'),
    [contenido, camposLimpios, fuente],
  );

  if (nueva && !esAdministrador) {
    return <SinPermiso texto="Solo un administrador puede crear landings." />;
  }
  if (fuente === undefined) return null;
  if (fuente === null && !nueva) return <SinPermiso texto="Landing no encontrada o sin acceso." />;
  if (!puedeEditar) return <SinPermiso texto="No tienes permiso para editar esta landing. Pide a un administrador que te asigne como editor." />;

  const slugFinal = fuente?.slug ?? slugNuevo;
  const datosBasicosOk = !nueva || (!!nombre.trim() && slugValido(slugNuevo));
  const camposOk = !hayClavesInvalidas(camposLimpios) && camposLimpios.every((c) => c.label);

  const marcar = () => { setSucio(true); setMensaje(null); };
  const cambiarContenido = (ruta: string, valor: unknown) => {
    setContenido((prev) => escribirRuta(prev, ruta, valor));
    setTocado(true);
    marcar();
  };
  const cambiarPlantilla = (id: string) => {
    setPlantilla(id);
    // Nueva y sin tocar: arranca con el contenido y formulario de la plantilla.
    // Si ya se escribió algo, se conserva (el contenido es común a todas).
    if (!tocado && !fuente) {
      setContenido(plantillaPorId(id).contenido);
      setCampos(plantillaPorId(id).campos);
    }
    marcar();
  };

  const irA = (n: number) => {
    if (n > 0 && !datosBasicosOk) { setPaso(0); setMensaje({ tipo: 'error', texto: 'Completa el nombre y la dirección para continuar.' }); return; }
    setPaso(n);
    setVista('editar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const guardar = async (publicar?: boolean): Promise<void> => {
    setMensaje(null);
    if (!datosBasicosOk) { setPaso(0); setMensaje({ tipo: 'error', texto: 'Completa el nombre y la dirección.' }); return; }
    if (!camposOk) { setPaso(2); setMensaje({ tipo: 'error', texto: 'Revisa los campos del formulario: todos necesitan nombre y no pueden repetirse.' }); return; }
    setOcupado(true);
    try {
      let f = fuente;
      if (!f) {
        f = await guardarFuente({ nombre: nombre.trim(), slug: slugNuevo, tipo: 'landing', campos: [] });
        refrescarFuentes('landing');
      }
      const correoFinal: CorreoGracias = correo.texto !== undefined
        ? { ...correo, plantilla: correoHtml(contenido, correo.asunto || contenido.gracias.titulo, correo.texto, window.location.origin) }
        : correo;
      await guardarLanding({ fuenteId: f.id, plantilla, contenido, campos: camposLimpios, correo: correoFinal });
      if (publicar !== undefined) {
        await publicarLanding(f.id, publicar);
        setPublicada(publicar);
      }
      setCampos(camposLimpios);
      setClavesGuardadas(new Set(camposLimpios.map((c) => c.key)));
      setSucio(false);
      setMensaje({ tipo: 'ok', texto: publicar === true ? '¡Listo! La landing está publicada.' : publicar === false ? 'La landing ya no es visible.' : 'Cambios guardados.' });
      if (!fuente) {
        setFuente(f);
        router.replace(`/landings/${f.slug}/editar?paso=${paso}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? '');
      setMensaje({
        tipo: 'error',
        texto: /duplicate|unique/i.test(msg) ? 'Esa dirección ya está en uso. Elige otra.'
          : /sin_permiso/i.test(msg) ? 'No tienes permiso para esta acción.'
          : 'No se pudo guardar. Revisa tu conexión e intenta de nuevo.',
      });
    } finally {
      setOcupado(false);
    }
  };

  const plantillaActual = plantillaPorId(plantilla);

  return (
    <>
      <PageHead
        title={nueva ? 'Nueva landing' : `Editar · ${fuente?.nombre ?? ''}`}
        subtitle={DESCRIPCION[paso]}
        actions={
          <div className="ax-cluster" style={{ gap: 'var(--ax-space-2)', flexWrap: 'wrap' }}>
            {!nueva && <Link className="ax-btn ax-btn--ghost" href={`/landings/${slugFinal}`}>Datos y clave</Link>}
            <button type="button" className="ax-btn ax-btn--primary" disabled={ocupado || (!sucio && !nueva)} onClick={() => guardar()}>
              {ocupado ? 'Guardando…' : nueva ? 'Crear borrador' : sucio ? 'Guardar cambios' : 'Guardado'}
            </button>
          </div>
        }
      />

      <ol className="lw-pasos" aria-label="Pasos">
        {PASOS.map((p, i) => (
          <li key={p} className={`lw-paso${i === paso ? ' is-activo' : ''}${i < paso ? ' is-hecho' : ''}`}>
            <button type="button" className="lw-paso__btn" aria-current={i === paso ? 'step' : undefined} disabled={i > 0 && !datosBasicosOk} onClick={() => irA(i)}>
              <span className="lw-paso__num">{i < paso ? <IconoCheck /> : i + 1}</span>
              <span className="lw-paso__txt">{p}</span>
            </button>
          </li>
        ))}
      </ol>

      {mensaje && (
        <div className={`ax-alert ${mensaje.tipo === 'ok' ? 'ax-alert--success' : 'ax-alert--danger'}`} role={mensaje.tipo === 'ok' ? 'status' : 'alert'} style={{ marginBottom: 'var(--ax-space-4)' }}>
          <div className="ax-alert__content"><p className="ax-alert__title">{mensaje.texto}</p></div>
        </div>
      )}

      <div className="lw-vista-toggle">
        <div className="ax-segment" role="group" aria-label="Qué mostrar">
          <button type="button" className="ax-segment__option" aria-pressed={vista === 'editar'} onClick={() => setVista('editar')}>Editar</button>
          <button type="button" className="ax-segment__option" aria-pressed={vista === 'previa'} onClick={() => setVista('previa')}>Vista previa</button>
        </div>
      </div>

      <div className="lw-grid" data-vista={vista}>
        <section className="ax-card lw-editor" aria-labelledby="lw-titulo-paso">
          <div className="ax-card__header">
            <div className="ax-card__titles">
              <p className="ax-card__eyebrow">Paso {paso + 1} de {PASOS.length}</p>
              <h2 className="ax-card__title" id="lw-titulo-paso">{PASOS[paso]}</h2>
            </div>
          </div>
          <div className="ax-card__body">
            {paso === 0 && (
              <PasoPlantilla
                plantilla={plantilla}
                onPlantilla={cambiarPlantilla}
                nueva={nueva && !fuente}
                nombre={nombre}
                onNombre={(v) => { setNombre(v); if (!slugTocado) setSlugNuevo(slugify(v)); marcar(); }}
                slug={slugNuevo}
                onSlug={(v) => { setSlugTocado(true); setSlugNuevo(v); marcar(); }}
              />
            )}
            {paso === 1 && <PasoContenido grupos={plantillaActual.grupos} contenido={contenido} onCambio={cambiarContenido} />}
            {paso === 2 && (
              <PasoFormulario
                campos={campos}
                onCampos={(v) => { setCampos(v); setTocado(true); marcar(); }}
                textos={contenido.formulario}
                onTexto={(k, v) => cambiarContenido(`formulario.${k}`, v)}
                clavesGuardadas={clavesGuardadas}
              />
            )}
            {paso === 3 && (
              <PasoGracias
                gracias={contenido.gracias}
                onGracias={(k, v) => cambiarContenido(`gracias.${k}`, v)}
                correo={correo}
                onCorreo={(c) => { setCorreo(c); marcar(); }}
                contenido={contenido}
              />
            )}
            {paso === 4 && (
              <PasoRevisar
                revision={revision}
                url={urlPublica(slugFinal || 'tu-direccion')}
                publicada={publicada}
                puedePublicar={esAdministrador}
                ocupado={ocupado}
                onPublicar={(p) => guardar(p)}
                nueva={!fuente}
              />
            )}
          </div>
          <div className="ax-card__footer lw-editor__pie">
            <button type="button" className="ax-btn ax-btn--ghost" disabled={paso === 0} onClick={() => irA(paso - 1)}>Atrás</button>
            {paso < PASOS.length - 1 && (
              <button type="button" className="ax-btn ax-btn--secondary" disabled={(paso === 0 && !datosBasicosOk) || (paso === 2 && !camposOk)} onClick={() => irA(paso + 1)}>
                Siguiente: {PASOS[paso + 1]}
              </button>
            )}
          </div>
        </section>

        <VistaPrevia
          plantilla={plantilla}
          contenido={contenido}
          campos={campos}
          slug={slugFinal}
          cerrada={fuente?.estado === 'cerrada'}
          forzarGracias={paso === 3}
        />
      </div>
    </>
  );
}

function SinPermiso({ texto }: { texto: string }) {
  return (
    <>
      <PageHead title="Landings" />
      <div className="ax-card"><div className="ax-card__body">
        <p style={{ marginBottom: 'var(--ax-space-3)' }}>{texto}</p>
        <Link className="ax-btn ax-btn--secondary" href="/landings">Volver a landings</Link>
      </div></div>
    </>
  );
}

export default LandingWizard;
