/*
 * FPTecnologi-HUB · Dashboard — Tailwind v4 vía el plugin oficial de PostCSS.
 * This is how Next 15 compiles the shared app.css token chain (Next owns
 * PostCSS; there is no @tailwindcss/vite here).
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
