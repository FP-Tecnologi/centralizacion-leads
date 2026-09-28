'use client';
/*
 * Sistema de Leads — render de una landing del CMS. Lo usan la ruta pública
 * /l/[slug] (modo "publico") y la vista previa del asistente (modo
 * "vista-previa"): es el mismo componente, así lo que se ve al editar es lo que
 * se publica. Para sumar una plantilla, agrégala a COMPONENTES (y su ficha en
 * src/lib/landings/plantillas.ts).
 */
import type { CSSProperties, ReactNode } from 'react';
import type { CampoFormulario } from '../../../supabase/functions/_shared/lead';
import { colorSeguro, esCorreo } from '../../lib/landings/contenido';
import type { ContenidoLanding } from '../../lib/landings/tipos';
import { FormularioLanding, type ModoLanding } from './FormularioLanding';
import { PlantillaEvento } from './plantillas/PlantillaEvento';
import { PlantillaSimple } from './plantillas/PlantillaSimple';
import './landing.css';

const COMPONENTES: Record<string, (p: { c: ContenidoLanding; formulario: ReactNode }) => ReactNode> = {
  evento: PlantillaEvento,
  simple: PlantillaSimple,
};

export interface LandingRenderProps {
  plantilla: string;
  contenido: ContenidoLanding;
  campos: CampoFormulario[];
  slug: string;
  cerrada: boolean;
  modo: ModoLanding;
  forzarGracias?: boolean;
}

export function LandingRender({ plantilla, contenido: c, campos, slug, cerrada, modo, forzarGracias }: LandingRenderProps) {
  const Componente = COMPONENTES[plantilla] ?? PlantillaEvento;
  const estilo = {
    '--lp-primario': colorSeguro(c.marca.color_primario, '#1c7fa8'),
    '--lp-destacado': colorSeguro(c.marca.color_destacado, '#c93131'),
  } as CSSProperties;
  const tema = ['claro', 'oscuro', 'auto'].includes(c.marca.tema) ? c.marca.tema : 'auto';

  const formulario = (
    <FormularioLanding
      campos={campos}
      textos={c.formulario}
      gracias={c.gracias}
      slug={slug}
      modo={modo}
      cerrada={cerrada}
      correoContacto={esCorreo(c.pie.correo) ? c.pie.correo.trim() : undefined}
      forzarGracias={forzarGracias}
    />
  );

  return (
    <div className={`lp ${modo === 'publico' ? 'lp--pagina' : 'lp--previa'}`} data-plantilla={plantilla} data-tema={tema} style={estilo}>
      <Componente c={c} formulario={formulario} />
    </div>
  );
}

export default LandingRender;
