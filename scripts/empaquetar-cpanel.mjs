// Arma el paquete para cPanel "Setup Node.js App" a partir de `next build` (output: 'standalone').
// Uso: npm run empaquetar   → dist/leads-cpanel/ y dist/leads-cpanel.zip
//
// - copia public/ y .next/static dentro del standalone (server.js los sirve desde ahí);
// - borra cualquier .env* que Next haya copiado: las variables NEXT_PUBLIC_* ya quedaron
//   incrustadas en el build y la service_role no la usa la app, así que no viajan al servidor.
import { cpSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const raiz = process.cwd();
const standalone = path.join(raiz, '.next', 'standalone');
const destino = path.join(raiz, 'dist', 'leads-cpanel');
const zip = path.join(raiz, 'dist', 'leads-cpanel.zip');

if (!existsSync(path.join(standalone, 'server.js'))) {
  console.error('No existe .next/standalone/server.js. Corre primero `npm run build`.');
  process.exit(1);
}

rmSync(path.join(raiz, 'dist'), { recursive: true, force: true });
cpSync(standalone, destino, { recursive: true });
cpSync(path.join(raiz, 'public'), path.join(destino, 'public'), { recursive: true });
cpSync(path.join(raiz, '.next', 'static'), path.join(destino, '.next', 'static'), { recursive: true });

for (const f of readdirSync(destino)) {
  if (f.startsWith('.env')) rmSync(path.join(destino, f), { force: true });
}

writeFileSync(
  path.join(destino, 'LEEME.txt'),
  [
    'Sistema de Centralización de Leads — paquete para cPanel (Setup Node.js App).',
    'Archivo de inicio (Application startup file): server.js',
    'No hace falta "Run NPM Install": node_modules ya viene incluido.',
    'Guía completa: apps/leads/DEPLOY-CPANEL.md en el repositorio.',
    '',
  ].join('\n'),
);

// zip con el bsdtar de Windows 10+ (el `tar` de Git Bash es GNU: no hace zip y lee "C:" como
// host remoto) o con `zip` en Linux/Mac. Rutas relativas para no pasar nunca "C:".
const tarWindows = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe');
try {
  if (process.platform === 'win32' && existsSync(tarWindows)) {
    execFileSync(tarWindows, ['-a', '-c', '-f', '../leads-cpanel.zip', '.'], { cwd: destino, stdio: 'inherit' });
  } else {
    execFileSync('zip', ['-qr', '../leads-cpanel.zip', '.'], { cwd: destino, stdio: 'inherit' });
  }
  console.log(`\nListo: ${path.relative(raiz, zip)} (sube este .zip a la carpeta de la app en cPanel)`);
} catch {
  console.log(`\nNo se pudo crear el .zip; comprime a mano la carpeta ${path.relative(raiz, destino)}`);
}
