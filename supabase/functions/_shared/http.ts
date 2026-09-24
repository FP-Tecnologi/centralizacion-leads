export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

export async function sha256(v: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ponytail: rate limit en memoria por instancia (se reinicia con cada cold
// start y no se comparte entre instancias). Tabla en DB si hay abuso real.
const hits = new Map<string, number[]>();
export function limitar(key: string, max = 10, ventanaMs = 60_000): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < ventanaMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
