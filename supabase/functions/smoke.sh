#!/usr/bin/env bash
# Prueba end-to-end local: requiere `supabase start` y `supabase functions serve` corriendo.
set -euo pipefail
URL=http://127.0.0.1:54321

psql() { docker exec -i supabase_db_leads psql -U postgres "$@"; }

psql -qc "insert into fuentes (nombre, slug, tipo, campos, clave_hash) values
  ('Smoke','smoke','landing','[{\"key\":\"email\",\"label\":\"Correo\",\"tipo\":\"email\",\"requerido\":true}]', hash_clave('pub_test'))
  on conflict (slug) do update set clave_hash = excluded.clave_hash;
  insert into aplicaciones (nombre, clave_hash) values ('Smoke', hash_clave('app_test')) on conflict do nothing;"

post() { curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/functions/v1/ingresar-lead" -H 'content-type: application/json' -d "$1"; }
[ "$(post '{"slug":"smoke","clave":"pub_test","datos":{"email":"s@x.com"}}')" = 200 ] && echo "ok ingresar"
[ "$(post '{"slug":"smoke","clave":"mala","datos":{"email":"s@x.com"}}')" = 401 ] && echo "ok clave invalida"
[ "$(post '{"slug":"smoke","clave":"pub_test","datos":{"email":"malo"}}')" = 400 ] && echo "ok campo invalido"

curl -s "$URL/functions/v1/api-v1/leads?fuente=smoke" -H 'x-api-key: app_test' | grep -q 's@x.com' && echo "ok api-v1 leads"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$URL/functions/v1/api-v1/leads" -H 'x-api-key: nada')" = 401 ] && echo "ok api-v1 401"
