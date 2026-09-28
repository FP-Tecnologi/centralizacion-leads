import { describe, expect, it } from 'vitest';
import {
  colorSeguro, completarContenido, contenidoDe, correoHtml, dividirEnPasos, escribirRuta, leerRuta,
  limpiarCampos, mensajeError, parrafos, revisarLanding, slugValido, urlSegura,
} from './contenido';
import { PLANTILLAS, plantillaPorId } from './plantillas';
import { clavesInvalidas } from '../leads/camposUtil';

const base = plantillaPorId('evento').contenido;

describe('completarContenido', () => {
  it('rellena lo que falta con la plantilla', () => {
    const c = completarContenido(base, { hero: { titulo: 'Hola' } });
    expect(c.hero.titulo).toBe('Hola');
    expect(c.hero.descripcion).toBe(base.hero.descripcion);
    expect(c.marca.color_primario).toBe(base.marca.color_primario);
  });

  it('descarta claves desconocidas y tipos equivocados', () => {
    const c = completarContenido(base, { hero: { titulo: 42, raro: 'x' }, extra: 1 }) as unknown as Record<string, unknown>;
    expect((c.hero as Record<string, unknown>).titulo).toBe(base.hero.titulo);
    expect((c.hero as Record<string, unknown>).raro).toBeUndefined();
    expect(c.extra).toBeUndefined();
  });

  it('los arreglos guardados reemplazan a los de la plantilla y se completan por ítem', () => {
    const c = completarContenido(base, { logos: { items: [{ url: 'https://x.com/a.png' }] } });
    expect(c.logos.items).toEqual([{ url: 'https://x.com/a.png', url_oscuro: '', alt: '', enlace: '' }]);
  });

  it('un arreglo guardado vacío queda vacío (el usuario quitó todos)', () => {
    expect(completarContenido(base, { nosotros: { valores: [] } }).nosotros.valores).toEqual([]);
  });

  it('respeta un booleano guardado', () => {
    expect(completarContenido(base, { formulario: { en_pasos: false } }).formulario.en_pasos).toBe(false);
  });

  it('contenidoDe con basura devuelve la plantilla', () => {
    expect(contenidoDe('simple', null)).toEqual(plantillaPorId('simple').contenido);
  });
});

describe('rutas', () => {
  it('lee y escribe sin mutar', () => {
    const c = escribirRuta(base, 'hero.titulo', 'Nuevo');
    expect(leerRuta(c, 'hero.titulo')).toBe('Nuevo');
    expect(base.hero.titulo).not.toBe('Nuevo');
    expect(c.marca).toBe(base.marca);
  });
});

describe('saneo', () => {
  it('colorSeguro solo acepta #rrggbb', () => {
    expect(colorSeguro('#ABCDEF', '#000000')).toBe('#abcdef');
    expect(colorSeguro('red; background:url(x)', '#000000')).toBe('#000000');
    expect(colorSeguro('#abc', '#000000')).toBe('#000000');
  });

  it('urlSegura bloquea javascript:, data: y dominios relativos al protocolo', () => {
    expect(urlSegura('javascript:alert(1)')).toBe('');
    expect(urlSegura('data:text/html,hi')).toBe('');
    expect(urlSegura('//evil.com/x.png')).toBe('');
    expect(urlSegura('https://fptecnologi.com')).toBe('https://fptecnologi.com');
    expect(urlSegura('/plantillas/evento/logo.svg')).toBe('/plantillas/evento/logo.svg');
    expect(urlSegura('mailto:a@b.com')).toBe('');
    expect(urlSegura('mailto:a@b.com', { correo: true })).toBe('mailto:a@b.com');
  });

  it('slugValido', () => {
    expect(slugValido('expomina-2027')).toBe(true);
    expect(slugValido('-mal')).toBe(false);
    expect(slugValido('Mal')).toBe(false);
  });
});

describe('texto', () => {
  it('parrafos separa por línea en blanco', () => {
    expect(parrafos('uno\n\n dos \n\n\n')).toEqual(['uno', 'dos']);
  });

  it('dividirEnPasos', () => {
    expect(dividirEnPasos([1, 2, 3, 4])).toEqual([[1, 2, 3], [4]]);
    expect(dividirEnPasos([])).toEqual([[]]);
  });

  it('mensajeError por tipo', () => {
    expect(mensajeError({ campo: 'ruc', motivo: 'formato' }, { key: 'ruc', label: 'RUC', tipo: 'documento', requerido: true })).toMatch(/RUC/);
    expect(mensajeError({ campo: 'email', motivo: 'contacto' })).toMatch(/correo o un teléfono/);
  });
});

describe('limpiarCampos', () => {
  it('recorta, deduplica opciones y quita lo que no aplica', () => {
    const out = limpiarCampos([
      { key: 'talla', label: ' Talla ', tipo: 'opcion', requerido: false, opciones: [' S', '', 'M', 'S'], placeholder: '  ' },
      { key: 'nac', label: 'Nac', tipo: 'fecha', requerido: true, placeholder: 'x', opciones: ['a'] },
    ]);
    expect(out[0]).toEqual({ key: 'talla', label: 'Talla', tipo: 'opcion', requerido: false, opciones: ['S', 'M'] });
    expect(out[1]).toEqual({ key: 'nac', label: 'Nac', tipo: 'fecha', requerido: true });
  });
});

describe('revisarLanding', () => {
  const ok = (items: ReturnType<typeof revisarLanding>, id: string) => items.find((i) => i.id === id)!.ok;

  it('exige un dato de contacto', () => {
    const r = revisarLanding(base, [{ key: 'nombres', label: 'Nombres', tipo: 'texto', requerido: true }], 'activa');
    expect(ok(r, 'contacto')).toBe(false);
    expect(r.find((i) => i.id === 'contacto')!.bloquea).toBe(true);
  });

  it('las plantillas de fábrica pasan todos los chequeos bloqueantes', () => {
    for (const p of PLANTILLAS) {
      const r = revisarLanding(p.contenido, limpiarCampos(p.campos), 'activa');
      expect(r.filter((i) => i.bloquea && !i.ok)).toEqual([]);
    }
  });
});

describe('plantillas', () => {
  it('ids válidos para el check de la tabla y claves de campos válidas', () => {
    for (const p of PLANTILLAS) {
      expect(p.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(clavesInvalidas(p.campos).size).toBe(0);
    }
  });

  it('cada campo del editor apunta a una ruta existente del contenido', () => {
    for (const p of PLANTILLAS) {
      for (const g of p.grupos) for (const c of g.campos) expect(leerRuta(p.contenido, c.ruta)).not.toBeUndefined();
    }
  });

  it('id desconocido cae a la plantilla por defecto', () => {
    expect(plantillaPorId('no-existe').id).toBe('evento');
  });
});

describe('correoHtml', () => {
  it('escapa el texto, conserva {{nombre}} y vuelve absolutas las rutas locales', () => {
    const html = correoHtml(base, 'Gracias <b>', 'Hola {{nombre}},\n\n<script>x</script>', 'https://leads.fp.com');
    expect(html).toContain('{{nombre}}');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('Gracias &lt;b&gt;');
    expect(html).toContain('https://leads.fp.com/plantillas/evento/logo-fp-color.svg');
  });
});
