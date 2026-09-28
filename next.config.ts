import path from 'node:path';
import type { NextConfig } from 'next';

/*
 * FPTecnologi-HUB · Dashboard (edición Next.js 15 — App Router + React 19 + Tailwind v4,
 * basada en la plantilla Vireo).
 *
 * The shared --ax-* token core (src/styles/app.css) is imported once in
 * app/layout.tsx. Tailwind v4 compiles via the PostCSS plugin (postcss.config.mjs).
 * Demo avatars/thumbnails use pravatar/picsum/loremflickr; allow them through
 * next/image just in case a page opts into <Image> (pages use plain <img> by
 * default, mirroring the reference, so this is permissive, not required).
 */
const nextConfig: NextConfig = {
  // Despliegue en cPanel "Setup Node.js App": `.next/standalone` trae su propio server.js y
  // solo los node_modules que usa; scripts/empaquetar-cpanel.mjs le suma public/ y
  // .next/static y lo deja listo para subir (ver DEPLOY-CPANEL.md).
  output: 'standalone',
  // la raíz es esta app, no el monorepo ni un package-lock suelto en la carpeta del usuario:
  // si no, standalone anida server.js bajo la ruta completa del disco.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: { root: path.resolve(__dirname) },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'loremflickr.com' },
    ],
  },
};

export default nextConfig;
