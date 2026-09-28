# Carga en Supabase (proyecto de leads) los secretos de correo de las Edge Functions,
# reutilizando la clave de Resend del ERP (apps/api/.env). La clave no se muestra.
# Uso (desde apps/leads, después de `npx supabase login`):
#   powershell -ExecutionPolicy Bypass -File scripts/configurar-correo.ps1
param(
  [string]$ProjectRef = 'qpjxwtvmuqramhqoxkxj',
  [string]$SiteUrl = 'http://localhost:3003'
)

$envApi = Join-Path $PSScriptRoot '..\..\api\.env'
if (-not (Test-Path $envApi)) { throw "No encuentro $envApi" }

$vars = @{}
Get-Content $envApi | ForEach-Object {
  if ($_ -match '^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$') { $vars[$matches[1]] = $matches[2] }
}
if (-not $vars.RESEND_API_KEY) { throw 'apps/api/.env no tiene RESEND_API_KEY' }
$from = if ($vars.RESEND_FROM_EMAIL) { $vars.RESEND_FROM_EMAIL } else { 'no-reply@fptecnologi.com' }

npx supabase secrets set --project-ref $ProjectRef `
  "RESEND_API_KEY=$($vars.RESEND_API_KEY)" `
  "EMAIL_FROM=FP Tecnologi & System <$from>" `
  "LEADS_SITE_URL=$SiteUrl"

if ($LASTEXITCODE -eq 0) {
  Write-Host "`nListo: RESEND_API_KEY, EMAIL_FROM ($from) y LEADS_SITE_URL ($SiteUrl) cargados en $ProjectRef."
  Write-Host 'Cuando la app esté en cPanel, vuelve a correrlo con -SiteUrl https://leads.fptecnologi.com'
}
