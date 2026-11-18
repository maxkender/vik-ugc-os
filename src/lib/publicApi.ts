/**
 * Accès public léger (18/11, performance de /join et /apply) : simples fetch vers PostgREST, Storage et les edge
 * functions avec la clé anonyme, sans charger le client Supabase complet (auth, realtime, storage : ~880 KB de source).
 * Les pages publiques n'ont pas de session ; l'admin et l'espace créateur gardent @/lib/supabase.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
export const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const headers = (extra: Record<string, string> = {}) => ({ apikey: ANON_KEY, authorization: `Bearer ${ANON_KEY}`, ...extra });

/** GET PostgREST : `rest("countries", { select: "code,name", open: "eq.true" })`. */
export async function rest<T = unknown>(table: string, query: Record<string, string>): Promise<T[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${new URLSearchParams(query)}`, { headers: headers() });
  if (!r.ok) throw new Error(`rest ${table} ${r.status}`);
  return r.json();
}

/** Appel d'une fonction SQL exposée (RPC). */
export async function rpc<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: "POST", headers: headers({ "content-type": "application/json" }), body: JSON.stringify(args) });
  if (!r.ok) throw new Error(`rpc ${name} ${r.status}`);
  const text = await r.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Edge function publique ; lève une erreur avec le code renvoyé (`{ error }`), comme callFn. */
export async function callPublicFn<T = any>(name: string, body: Record<string, unknown>): Promise<T> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, { method: "POST", headers: headers({ "content-type": "application/json" }), body: JSON.stringify(body) });
  let data: any = null;
  try { data = await r.json(); } catch { /* corps vide */ }
  if (!r.ok) throw new Error(data?.error ?? `Edge Function returned a non-2xx status code`);
  if (data && data.ok === false) throw new Error(data.error ?? "Erreur");
  return data as T;
}

/** URL publique d'un fichier Storage (bucket public). */
export function publicStorageUrl(bucket: string, path: string | null | undefined): string | null {
  if (!path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
