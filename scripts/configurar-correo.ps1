# Carga en Supabase (proyecto de leads) los secretos de correo de las Edge Functions,
# reutilizando la clave de Resend del ERP (apps/api/.env del monorepo FPTecnologi-HUB).
# La clave no se muestra.
# Uso (desde la raíz de este repo, después de `npx supabase login`):
#   powershell -ExecutionPolicy Bypass -File scripts/configurar-correo.ps1
#   (si el HUB está en otra carpeta: -EnvApi C:\ruta\FPTecnologi-HUB\apps\api\.env)
param(
  [string]$ProjectRef = 'qpjxwtvmuqramhqoxkxj',
  [string]$SiteUrl = 'https://leads.fptecnologi.com',
  # por defecto: FPTecnologi-HUB clonado al lado de este repo
  [string]$EnvApi = (Join-Path $PSScriptRoot '..\..\FPTecnologi-HUB\apps\api\.env')
)

$envApi = $EnvApi
if (-not (Test-Path $envApi)) { throw "No encuentro $envApi (usa -EnvApi con la ruta al .env del ERP)" }

$vars = @{}
Get-Content $envApi | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$') { $vars[$matches[1]] = $matches[2] }
}
if (-not $vars.RESEND_API_KEY) { throw "$envApi no tiene RESEND_API_KEY" }
$from = if ($vars.RESEND_FROM_EMAIL) { $vars.RESEND_FROM_EMAIL } else { 'no-reply@fptecnologi.com' }

npx supabase secrets set --project-ref $ProjectRef `
  "RESEND_API_KEY=$($vars.RESEND_API_KEY)" `
  "EMAIL_FROM=FP Tecnologi & System <$from>" `
  "LEADS_SITE_URL=$SiteUrl"

if ($LASTEXITCODE -eq 0) {
  Write-Host "`nListo: RESEND_API_KEY, EMAIL_FROM ($from) y LEADS_SITE_URL ($SiteUrl) cargados en $ProjectRef."
  Write-Host 'Para probar invitaciones en tu PC: vuelve a correrlo con -SiteUrl http://localhost:3003'
}
