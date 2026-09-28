# Sistema de Centralización de Leads — FPTecnologi

Dashboard para centralizar los leads de todas las landings, importaciones (Excel/CSV) y
apps offline de FPTecnologi en una sola base de datos, con roles, filtros, exportación,
API para otras aplicaciones y un CMS de landings con plantillas.

> **Origen:** este repo nació de `apps/leads` del monorepo
> [`FP-Tecnologi/FPTecnologi-HUB`](https://github.com/FP-Tecnologi/FPTecnologi-HUB)
> (historial incluido, sin el resto del monorepo). **Desde el 2026-09-28 el sistema de
> leads se desarrolla aquí.** Ver [Vinculación con FPTecnologi-HUB](#vinculación-con-fptecnologi-hub).

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19 + Tailwind v4 · plantilla Vireo (tokens `--ax-*`).
  Ojo: Next 16 tiene cambios incompatibles; ver `AGENTS.md` y `node_modules/next/dist/docs/`.
- **Supabase** proyecto `qpjxwtvmuqramhqoxkxj` (base de leads, ex EXPOMINA): Postgres + RLS,
  Auth con 2FA (TOTP), Edge Functions en `supabase/functions/`.
- Correo: Resend (misma cuenta que el ERP).

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completar con las claves de qpjx… (Project Settings → API Keys)
npm run dev                  # http://localhost:3003
```

Tests: `npx vitest run --configLoader runner` (el `npm test` plano tiene un problema
conocido al cargar `vitest.config.ts`). El lint está roto con TypeScript 7 (pendiente).

## Roles

| Rol | Puede |
|---|---|
| superadmin | Todo; único que crea/cambia/quita admins |
| admin | Todas las fuentes; gestiona editores y lectores |
| editor | Importa y edita leads de sus fuentes |
| lector | Ve y exporta sus fuentes |

## Base de datos y funciones

- Migraciones en `supabase/migrations/` (orden por fecha). Aplicadas en producción hasta
  `20261001000000_compat_register_lead.sql` (se corrieron en el SQL Editor).
- Edge Functions: `ingresar-lead` (entrada pública de leads), `api-v1` (lectura para apps
  conectadas), `admin-usuarios` (gestión de usuarios), `send-thank-you` (correo).
  Despliegue:
  ```bash
  npx supabase login
  npx supabase functions deploy admin-usuarios ingresar-lead api-v1 send-thank-you --project-ref qpjxwtvmuqramhqoxkxj
  powershell -ExecutionPolicy Bypass -File scripts/configurar-correo.ps1   # secretos de correo
  ```

## Despliegue

cPanel → Setup Node.js App, desde este repo (rama `main`) o subiendo un .zip.
Ver [`DEPLOY-CPANEL.md`](DEPLOY-CPANEL.md).

## Vinculación con FPTecnologi-HUB

Los dos repos son **independientes**, pero quedan preparados para conectarse de dos formas:

### 1. En ejecución (recomendado): por API, sin compartir código

| Qué | Cómo |
|---|---|
| El HUB/ERP (`apps/api`, base `vzfdjpqvqxrooesxozjx`) lee leads | Crear una **Aplicación conectada** en *Exportación y conexiones* → clave → `GET {SUPABASE_URL}/functions/v1/api-v1/leads?fuente=&actualizado_desde=&cursor=` con header `x-api-key` |
| Webs del HUB (p. ej. formulario de contacto de `apps/web-fptecnologi`) envían leads | `POST {SUPABASE_URL}/functions/v1/ingresar-lead` con `{ slug, clave, datos }` (clave en *Landings → Configuración → Conexión*) |
| Fase 2 (pendiente) | Escritura por API y webhooks hacia el HUB |

El contrato compartido (campos núcleo, validación) vive en `supabase/functions/_shared/lead.ts`.

### 2. En código: traer este repo dentro del HUB (si algún día se vuelve a unir)

Desde la raíz de `FPTecnologi-HUB` (el remoto `leads` apunta a este repo):

```bash
git remote add leads https://github.com/FP-Tecnologi/centralizacion-leads.git   # si no existe
git fetch leads
git subtree pull --prefix=apps/leads leads main   # actualiza apps/leads con lo último de aquí
```

Y al revés, para traer a este repo algo hecho en `apps/leads` del HUB:

```bash
# en FPTecnologi-HUB
git push leads "$(git subtree split --prefix=apps/leads HEAD)":refs/heads/desde-hub
# luego, aquí: git fetch && git merge origin/desde-hub
```

Los historiales son compatibles porque este repo es el `subtree split` de `apps/leads`.
