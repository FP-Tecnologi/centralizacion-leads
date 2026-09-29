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
  // Solo para el paquete .zip (npm run empaquetar pone BUILD_STANDALONE=1): `.next/standalone`
  // trae su propio server.js y una copia de los node_modules que usa. En el despliegue desde
  // Git (cPanel AI App Hosting, `npm start`) no hace falta y duplicaría el espacio en disco.
  output: process.env.BUILD_STANDALONE ? 'standalone' : undefined,
  // la raíz es esta app, no el monorepo ni un package-lock suelto en la carpeta del usuario:
  // si no, standalone anida server.js bajo la ruta completa del disco.
  outputFileTracingRoot: path.resolve(__dirname),
  turbopack: { root: path.resolve(__dirname) },
  // El hosting (cPanel AI App Hosting) mata el build si pasa su tope de RAM ("Killed"):
  // un solo worker, sin hilos extra y con las optimizaciones de memoria de webpack.
  experimental: {
    cpus: 1,
    workerThreads: false,
    webpackMemoryOptimizations: true,
    webpackBuildWorker: false,
  },
  webpack: (config, { dev }) => {
    // sin caché en disco/memoria en el build de producción: menos RAM pico
    if (!dev) config.cache = false;
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'loremflickr.com' },
    ],
  },
};

export default nextConfig;
