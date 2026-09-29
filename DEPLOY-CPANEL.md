# Despliegue del Sistema de Leads en cPanel

**Producción:** `https://leads.fptecnologi.com` · app de cPanel **`leads`** (AI App Hosting).

Hay dos formas. **A (recomendada): desde Git** con *AI App Hosting*. **B: subiendo un .zip**.

## Variables de entorno: no hace falta ninguna

La app solo necesita dos valores y **ya vienen en el repo** en `.env.production`:

| Variable | Qué es | ¿Secreta? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Dirección del proyecto Supabase de leads (`qpjxwtvmuqramhqoxkxj`) | No |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon) | No: llega al navegador de todos; la seguridad la dan RLS + 2FA |

Por eso en cPanel la sección **Variables de entorno se deja vacía**. Next.js incrusta esos
valores al compilar, y cPanel solo entrega sus variables al *ejecutar*, así que ponerlas ahí
no cambia nada.

**Nunca** en cPanel ni en el repo: `SUPABASE_SERVICE_ROLE_KEY` (clave maestra: la usan solo
las Edge Functions, que la reciben de Supabase) ni `DATABASE_URL`. Si el navegador autocompleta
una fila con tu usuario/contraseña de cPanel (p. ej. `fptecnol`), **bórrala**.

`.env` está en `.gitignore` (cPanel lo exige para permitir variables); `.env.local` es solo
para tu PC.

## A. Desde Git (AI App Hosting) — paso a paso

1. **Una sola app.** Si hay intentos anteriores (`lead`, `sistemaleads`, `sistemasleads`…),
   elimínalos en *Sitios web y aplicaciones*: comparten la RAM de la cuenta y el servidor
   mata el build o la app (`Killed`, 503).
2. *Sitios web y aplicaciones* → **Crear sitio web** → subdominio **`leads`** (`.fptecnologi.com`).
3. *¿Cómo desea construir su sitio web?* → **AI App Hosting** → Continuar → **Lanzar mi sitio web**.
4. **Origen → Repositorio Git**, URL (el repo es público, sin claves):
   ```
   https://github.com/FP-Tecnologi/centralizacion-leads.git
   ```
   Rama **`main`**.
5. **Implementación**:
   - Modo de ejecución: **Producción**
   - Avanzado → Node.js **24** (22 también sirve) · Gestor de paquetes **npm**
   - Variables de entorno: **vacío**
   - **Implementar**
6. El log correcto: `added ~115 packages` → `next build --webpack` → `✓ Compiled successfully`
   → `Generating static pages (15/15)` → lista de rutas. Tarda 2–5 min.
7. Abre `https://leads.fptecnologi.com` → debe aparecer **Iniciar sesión**. Activa SSL si no
   lo está (AutoSSL).

**Actualizar:** `git push` a `main` y en la app → **Volver a implementar** (no "Reintentar":
repite el mismo commit).

## Configurar Supabase (una sola vez, proyecto `qpjxwtvmuqramhqoxkxj`)

- **Authentication → URL Configuration**
  - Site URL: `https://leads.fptecnologi.com`
  - Redirect URLs: `https://leads.fptecnologi.com/auth/crear-clave` (invitaciones y
    recuperar contraseña) y `http://localhost:3003/auth/crear-clave` (desarrollo).
- **Edge Functions → Secrets**: `LEADS_SITE_URL = https://leads.fptecnologi.com`
  (links de invitación). Lo carga `scripts/configurar-correo.ps1`.

## Por qué el build está así (no revertir sin probar en el servidor)

- `typescript`, `tailwindcss`, `@tailwindcss/postcss` y `@types/*` están en `dependencies`:
  cPanel instala sin devDependencies y no respeta `.npmrc`.
- `npm run build` = `next build --webpack` con heap de 460 MB, 1 worker y sin caché de
  webpack: Turbopack daba `Bus error` y el build moría por RAM (`Killed`). Probado en
  node:24 Linux con 768 MB.
- `output: 'standalone'` solo lo activa `npm run empaquetar` (opción B).

## B. Subiendo un .zip (Setup Node.js App clásico)

1. En tu PC: `npm run empaquetar` → `dist/leads-cpanel.zip` (compila en modo standalone).
2. cPanel → **Setup Node.js App** → Create Application: Node 22+, Production, Application
   root `leads-app` (fuera de `public_html`), URL `leads.fptecnologi.com`, startup file `server.js`.
3. File Manager → `leads-app/` → sube y extrae el zip (deben quedar `server.js`, `.next/`,
   `node_modules/`, `public/`, `package.json` en la raíz). No uses "Run NPM Install".
4. **Restart**. Para actualizar: borra `.next/`, `node_modules/` y `server.js`, sube el zip
   nuevo y **Restart**.

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| `Killed` en el log | Falta RAM: deja una sola app en la cuenta |
| `Bus error` | Build con Turbopack: `npm run build` debe decir `--webpack` |
| `Cannot find module '@tailwindcss/postcss'` | Commit viejo: redeploy del último `main` |
| 503 Service Unavailable | La app no está corriendo (sin RAM o se detuvo): revisa el log de ejecución y reinicia |
| Carga pero no inicia sesión | URLs de Supabase Auth (sección de arriba) |
