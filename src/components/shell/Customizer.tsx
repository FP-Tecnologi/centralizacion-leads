'use client';
/*
 * FPTecnologi-HUB · Dashboard — Theme Customizer offcanvas (re-expression of partials/customizer.html).
 *
 * Native React drawer (Alpine axCustomizer re-implementation): color mode,
 * direction, 12 accent presets, custom colors, navigation, shell style, sidebar,
 * header, layout, and the loader toggle. Every control calls a CustomizerContext
 * setter that flips the <html> data-ax-* attribute + persists the ax: key. Same
 * .ax-customizer DOM classes/ARIA as the reference so it renders identically.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useCustomizer } from '../../context/CustomizerContext';
import { PRESETS } from '../../lib/theme';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import type { FontRecord } from '../../data/google-fonts';

const CHECK = (
  <svg className="ax-swatch__check ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M5 12l5 5l10 -10" /></svg>
);

function Segmented({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<[string, string]>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ax-segmented" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          className={`ax-segmented__btn${value === v ? ' is-active' : ''}`}
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
        >
          <span>{text}</span>
        </button>
      ))}
    </div>
  );
}

function SchemeRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const schemes = ['light', 'dark', 'brand', 'gradient', 'transparent'];
  const schemeNames: Record<string, string> = { light: 'Claro', dark: 'Oscuro', brand: 'Marca', gradient: 'Degradado', transparent: 'Transparente' };
  return (
    <div className="ax-scheme-row" role="radiogroup" aria-label={label}>
      {schemes.map((s) => (
        <button
          key={s}
          type="button"
          className={`ax-scheme ax-scheme--${s}${value === s ? ' is-active' : ''}`}
          role="radio"
          aria-checked={value === s}
          aria-label={schemeNames[s]}
          onClick={() => onChange(s)}
        />
      ))}
    </div>
  );
}

/*
 * FONT — the family in use, plus a search across every Google family.
 * There is no shortlist: the default (Inter) keeps the shipped Inter +
 * Space Grotesk pairing, and anything picked from the catalog drives body
 * AND headings. Webfonts are only fetched once selected, and the searchable
 * catalog is a lazy chunk (src/data/google-fonts.ts), so this whole section
 * costs nothing on a page load that never opens the panel.
 *
 * React re-expression of the Alpine axCustomizer font handlers — same storage
 * keys, same attribute, same debounce, same two subtleties: a stale search
 * reply must not overwrite a newer query, and Enter re-runs the search rather
 * than trusting a possibly-debounce-behind result list.
 */
function FontSection() {
  const c = useCustomizer();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FontRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The live query, readable from an async continuation without re-binding it.
  const queryRef = useRef('');

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);

  const clearFontSearch = useCallback(() => {
    clearTimer();
    queryRef.current = '';
    setQuery('');
    setResults([]);
    setSearching(false);
    setSearched(false);
  }, []);

  const runFontSearch = useCallback(() => {
    const q = queryRef.current.trim();
    if (!q) {
      setResults([]);
      setSearching(false);
      setSearched(false);
      return;
    }
    setSearching(true);
    setSearched(false);
    c.searchFonts(q, 24).then((hits) => {
      if (queryRef.current.trim() !== q) return; // a stale reply must not win
      setResults(hits);
      setSearching(false);
      setSearched(true);
    });
  }, [c]);

  const onFontQuery = (value: string) => {
    queryRef.current = value;
    setQuery(value);
    clearTimer();
    timer.current = setTimeout(runFontSearch, 160);
  };

  /** Apply a family by name — a search hit, or whatever was typed. */
  const pickFont = (family: string) => {
    if (!c.pickFont(family)) return;
    clearFontSearch();
  };

  /**
   * Enter applies the best match. It re-runs the search rather than trusting
   * `results`, which may still be a debounce behind what was typed — otherwise
   * a fast typist hitting Enter applies their half-finished query as a literal
   * family name.
   */
  const submitFontSearch = () => {
    const q = queryRef.current.trim();
    if (!q) return;
    clearTimer();
    c.searchFonts(q, 24).then((hits) => pickFont(hits.length ? hits[0].family : q));
  };

  /** Escape clears the search first; only an empty field lets it close the panel. */
  const onFontEscape = (e: KeyboardEvent) => {
    if (!query) return;
    e.stopPropagation();
    clearFontSearch();
  };

  const showResults = Boolean(query.trim()) && (results.length > 0 || searching || searched);

  return (
    <section className="ax-customizer__section">
      <p className="ax-eyebrow">Fuente</p>

      {/* What is applied right now, printed in its own typeface. */}
      <div className={`ax-font-active${c.font === 'custom' ? ' is-custom' : ''}`}>
        <span className="ax-font-active__text">
          <span className="ax-font-active__label">Fuente actual</span>
          <span className="ax-font-active__name" style={{ fontFamily: `"${c.fontFamily}", var(--ax-font-sans)` }}>{c.fontFamily}</span>
        </span>
        {c.font === 'custom' && (
          <button
            type="button"
            className="ax-font-active__clear"
            data-ax-action="font-reset"
            onClick={() => {
              c.resetFont();
              clearFontSearch();
            }}
            aria-label="Volver a la fuente por defecto"
          >
            Restablecer
          </button>
        )}
      </div>

      {/* ANY Google family. The catalog is searched offline against a bundled
          snapshot — no API key, which a static template has nowhere safe to put. */}
      <div className="ax-font-search">
        <svg className="ax-icon ax-font-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M3 10a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" /><path d="M21 21l-6 -6" /></svg>
        <input
          type="search"
          className="ax-font-search__input"
          placeholder="Buscar en Google Fonts…"
          aria-label="Buscar en Google Fonts"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-ax-set="font"
          value={query}
          onChange={(e) => onFontQuery(e.target.value)}
          onFocus={() => c.warmFontCatalog()}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitFontSearch();
            } else if (e.key === 'Escape') {
              onFontEscape(e);
            }
          }}
        />
        {query && (
          <button type="button" className="ax-font-search__clear" onClick={clearFontSearch} aria-label="Limpiar búsqueda">
            <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {showResults && (
        <div className="ax-font-results">
          <div role="listbox" aria-label="Google Fonts results">
            {results.map((f) => (
              <button
                key={f.family}
                type="button"
                className={`ax-font-result${c.fontFamily === f.family ? ' is-active' : ''}`}
                role="option"
                aria-selected={c.fontFamily === f.family}
                style={{ fontFamily: `"${f.family}", var(--ax-font-sans)` }}
                onClick={() => pickFont(f.family)}
              >
                <span className="ax-font-result__name">{f.family}</span>
                <span className="ax-font-result__cat">{f.category}</span>
              </button>
            ))}
          </div>
          {searching && !results.length && <p className="ax-font-results__msg">Buscando…</p>}
          {/* The snapshot ages; a family added to Google Fonts since then is still
              usable by name, so never dead-end on "no results". */}
          {searched && !results.length && (
            <p className="ax-font-results__msg">
              Sin resultados en el catálogo.{' '}
              <button type="button" className="ax-link" onClick={() => pickFont(query)}>
                Usar “<span>{query.trim()}</span>” igual
              </button>
            </p>
          )}
        </div>
      )}

      <p className="ax-note">Busca entre las ~1800 familias de Google Fonts. Aplica a texto y títulos · el código sigue en JetBrains Mono. La familia elegida se carga bajo demanda.</p>
    </section>
  );
}

export function Customizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const c = useCustomizer();
  const ref = useRef<HTMLElement>(null);
  useFocusTrap(ref, open);

  return (
    <aside
      id="ax-customizer"
      className={`ax-customizer${open ? ' ax-customizer--enter' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ax-customizer-title"
      ref={ref}
      style={{ display: open ? undefined : 'none' }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <button type="button" className="ax-customizer__backdrop" onClick={onClose} aria-label="Cerrar personalizador" tabIndex={-1} />

      {/* HEADER */}
      <div className="ax-customizer__head">
        <div className="ax-customizer__head-text">
          <h2 id="ax-customizer-title" className="ax-customizer__title">Personalización</h2>
          <p className="ax-customizer__sub">Opciones para elegir — los cambios se guardan solos según la vista previa en vivo</p>
        </div>
        <button type="button" className="ax-icon-btn ax-customizer__close" onClick={onClose} aria-label="Cerrar personalizador">
          <svg className="ax-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" width={24} height={24} aria-hidden="true"><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
        </button>
      </div>

      {/* BODY */}
      <div className="ax-customizer__body">
        {/* COLOR MODE */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Modo de color</p>
          <Segmented
            label="Modo de color"
            value={c.mode}
            onChange={c.setMode}
            options={[['light', 'Claro'], ['dark', 'Oscuro'], ['system', 'Sistema']]}
          />
        </section>

        {/* DIRECTION */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Dirección</p>
          <Segmented label="Dirección" value={c.dir} onChange={c.setDir} options={[['ltr', 'LTR'], ['rtl', 'RTL']]} />
        </section>

        {/* FONT */}
        <FontSection />

        {/* ACCENT PRESETS */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Acentos</p>
          <div className="ax-swatch-grid" role="radiogroup" aria-label="Color de acento">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                className={`ax-swatch${c.accent === p.value ? ' is-active' : ''}`}
                role="radio"
                aria-checked={c.accent === p.value}
                style={{ ['--sw' as string]: p.base }}
                aria-label={p.label}
                onClick={() => c.setAccent(p.value)}
              >
                {c.accent === p.value && CHECK}
              </button>
            ))}
          </div>
        </section>

        {/* CUSTOM COLORS */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Colores personalizados</p>
          <label className="ax-color-field">
            <span className="ax-color-field__label">Primario</span>
            <span className="ax-color-field__controls">
              <input type="color" className="ax-color-input" value={c.customAccent || '#1E856C'} onChange={(e) => c.setCustomAccent(e.target.value)} aria-label="Color primario personalizado" />
              <input type="text" className="ax-hex" value={c.customAccent} placeholder="#RRGGBB" onChange={(e) => c.setCustomAccent(e.target.value)} aria-label="Primario personalizado en hexadecimal" />
            </span>
          </label>
          <div className="ax-recent-swatches" role="group" aria-label="Colores recientes">
            {c.recentAccents.map((hex) => (
              <button key={hex} type="button" className="ax-recent-swatch" style={{ ['--sw' as string]: hex }} aria-label={hex} onClick={() => c.setCustomAccent(hex)} />
            ))}
          </div>
          <label className="ax-color-field">
            <span className="ax-color-field__label">Fondo</span>
            <span className="ax-color-field__controls">
              <input type="color" className="ax-color-input" onChange={(e) => c.setCustomBg(e.target.value)} aria-label="Color de fondo personalizado" />
            </span>
          </label>
          <div className="ax-tint-row" role="group" aria-label="Fondos predefinidos">
            {[['#FCFBF9', 'Porcelana (por defecto)'], ['#F4F6F8', 'Gris frío'], ['#F7F3EC', 'Arena cálida'], ['#EFF1F4', 'Niebla']].map(([hex, label]) => (
              <button key={hex} type="button" className="ax-tint" style={{ ['--sw' as string]: hex }} aria-label={label} onClick={() => c.setCustomBg(hex)} />
            ))}
          </div>
          {c.bgLowContrast && <p className="ax-note ax-note--warn">Poco contraste — el texto puede costar leer.</p>}
        </section>

        {/* NAVIGATION */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Navegación</p>
          <p className="ax-customizer__label">Orientación</p>
          <Segmented label="Orientación de navegación" value={c.nav} onChange={(v) => c.setReg('nav', v)} options={[['vertical', 'Vertical'], ['horizontal', 'Horizontal'], ['hybrid', 'Híbrida']]} />
          <p className="ax-customizer__label">Interacción del menú</p>
          <Segmented label="Interacción del menú" value={c.menu} onChange={(v) => c.setReg('menu', v)} options={[['click', 'Clic'], ['hover', 'Al pasar']]} />
        </section>

        {/* SHELL STYLE */}
        {c.nav !== 'horizontal' && (
          <section className="ax-customizer__section">
            <p className="ax-eyebrow">Estilo</p>
            <div className="ax-style-list ax-style-list--pair" role="radiogroup" aria-label="Estilo general">
              <button type="button" className={`ax-style${c.shellStyle === 'default' ? ' is-active' : ''}`} role="radio" aria-checked={c.shellStyle === 'default'} onClick={() => c.setReg('shell-style', 'default')}>
                <span className="ax-style__diagram ax-style__diagram--default" aria-hidden="true"></span>
                <span className="ax-style__label">Acoplado</span>
              </button>
              <button type="button" className={`ax-style${c.shellStyle === 'detached' ? ' is-active' : ''}`} role="radio" aria-checked={c.shellStyle === 'detached'} onClick={() => c.setReg('shell-style', 'detached')}>
                <span className="ax-style__diagram ax-style__diagram--detached" aria-hidden="true"></span>
                <span className="ax-style__label">Separado</span>
              </button>
            </div>
          </section>
        )}

        {/* SIDEBAR */}
        {c.nav !== 'horizontal' && (
          <section className="ax-customizer__section">
            <p className="ax-eyebrow">Menú lateral</p>
            <p className="ax-customizer__label">Comportamiento</p>
            <Segmented label="Comportamiento del menú" value={c.sidebarBehavior} onChange={(v) => c.setReg('sidebar-behavior', v)} options={[['collapsible', 'Colapsable'], ['expanded', 'Expandido'], ['compact', 'Compacto']]} />
            <p className="ax-customizer__label">Posición</p>
            <Segmented label="Posición del menú" value={c.sidebarPos} onChange={(v) => c.setReg('sidebar-position', v)} options={[['fixed', 'Fijo'], ['static', 'Estático']]} />
            <p className="ax-customizer__label">Combinación de color</p>
            <SchemeRow label="Combinación de color del menú" value={c.sidebarScheme} onChange={(v) => c.setReg('sidebar-scheme', v)} />
          </section>
        )}

        {/* HEADER */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Encabezado</p>
          <p className="ax-customizer__label">Posición</p>
          <Segmented label="Posición del encabezado" value={c.headerPos} onChange={(v) => c.setReg('header-position', v)} options={[['fixed', 'Fijo'], ['static', 'Estático']]} />
          <p className="ax-customizer__label">Combinación de color</p>
          <SchemeRow label="Combinación de color del encabezado" value={c.headerScheme} onChange={(v) => c.setReg('header-scheme', v)} />
        </section>

        {/* LAYOUT */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Diseño</p>
          <p className="ax-customizer__label">Estilo de página</p>
          <Segmented label="Estilo de página" value={c.page} onChange={(v) => c.setReg('page', v)} options={[['regular', 'Normal'], ['classic', 'Clásica'], ['compact', 'Compacta']]} />
          <p className="ax-customizer__label">Ancho</p>
          <Segmented label="Ancho del diseño" value={c.width} onChange={(v) => c.setReg('width', v)} options={[['fluid', 'Fluido'], ['full', 'Completo']]} />
        </section>

        {/* MISC / LOADER */}
        <section className="ax-customizer__section">
          <p className="ax-eyebrow">Varios</p>
          <label className="ax-toggle">
            <span className="ax-toggle__label">Cargador de página</span>
            <input type="checkbox" className="ax-toggle__input" checked={c.loader === 'on'} onChange={(e) => c.setReg('loader', e.target.checked ? 'on' : 'off')} />
            <span className="ax-toggle__track" aria-hidden="true"><span className="ax-toggle__thumb"></span></span>
          </label>
        </section>
      </div>

      {/* FOOTER */}
      <div className="ax-customizer__foot">
        <button type="button" className="ax-btn ax-btn--ghost-danger" onClick={c.reset}>Restablecer</button>
        <button type="button" className="ax-btn ax-btn--ghost" onClick={c.copyConfig}>Copiar config</button>
      </div>
    </aside>
  );
}

export default Customizer;
