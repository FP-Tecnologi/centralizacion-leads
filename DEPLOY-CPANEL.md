# Despliegue del Sistema de Leads en cPanel (Setup Node.js App)

La app corre con Node.js (necesario para `/l/<slug>`, las rutas dinámicas y la protección
de rutas). El build usa `output: 'standalone'`: el paquete trae su propio `server.js` y solo
los `node_modules` que necesita, así que **no hay que correr `npm install` en el servidor**.

## 1. Generar el paquete (en tu PC)

`apps/leads/.env.local` debe tener las claves de **producción** (`qpjxwtvmuqramhqoxkxj`):
las `NEXT_PUBLIC_*` se incrustan en el build. La `service_role` no se usa ni se sube.

```bash
cd apps/leads
npm run empaquetar
```

Resultado: `apps/leads/dist/leads-cpanel.zip` (~10 MB).

## 2. Crear el subdominio

cPanel → **Domains** (o *Subdomains*) → crear p. ej. `leads.fptecnologi.com`.
Anota la carpeta raíz que propone (p. ej. `/home/USUARIO/leads.fptecnologi.com`).

## 3. Crear la app Node.js

cPanel → **Setup Node.js App** → **Create Application**:

| Campo | Valor |
|---|---|
| Node.js version | **22.x** (mínimo 20.9) |
| Application mode | Production |
| Application root | `leads-app` (carpeta fuera de `public_html`) |
| Application URL | `leads.fptecnologi.com` |
| Application startup file | `server.js` |

Guardar (**Create**). No uses "Run NPM Install".

## 4. Subir el paquete

cPanel → **File Manager** → entra a `leads-app/` → borra lo que haya creado cPanel
(p. ej. un `app.js` de ejemplo) → **Upload** `leads-cpanel.zip` → clic derecho → **Extract**.
Deben quedar `server.js`, `.next/`, `node_modules/`, `public/` y `package.json` directo en
`leads-app/` (activa "Show Hidden Files" para ver `.next`). Luego borra el `.zip`.

## 5. Arrancar

Setup Node.js App → la app → **Restart**. Abre `https://leads.fptecnologi.com`: debe
aparecer "Iniciar sesión". Activa SSL (AutoSSL / Let's Encrypt) para el subdominio si no
lo está.

## 6. Configurar Supabase (una sola vez)

Proyecto `qpjxwtvmuqramhqoxkxj`:

- **Authentication → URL Configuration**
  - Site URL: `https://leads.fptecnologi.com`
  - Redirect URLs: `https://leads.fptecnologi.com/auth/crear-clave` (invitaciones y
    recuperar contraseña; deja también `http://localhost:3003/auth/crear-clave` para desarrollo).
- **Edge Functions → Secrets**: `LEADS_SITE_URL = https://leads.fptecnologi.com`
  (lo usan las invitaciones de usuarios).

## Actualizar a una versión nueva

1. `git pull` y `npm run empaquetar`.
2. File Manager → `leads-app/` → borra `.next/`, `node_modules/` y `server.js`.
3. Sube y extrae el nuevo `leads-cpanel.zip`.
4. Setup Node.js App → **Restart**.

## Si algo falla

- **Error 503 / "Incomplete response"**: revisa que el startup file sea `server.js` y que
  `server.js` esté en la raíz de `leads-app/` (no dentro de otra carpeta del zip).
- **Página sin estilos**: falta `.next/static` → vuelve a extraer el zip completo.
- **Logs**: `leads-app/stderr.log` (lo crea Passenger) o el botón de logs de la app.
- **No inicia sesión en producción**: revisa el paso 6 (Site URL y Redirect URLs).
