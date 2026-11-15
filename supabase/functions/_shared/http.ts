// Helpers HTTP communs aux edge functions (CORS, JSON, auth admin / cron).
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function admin(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Caller =
  | { kind: "cron" }
  | { kind: "user"; id: string; email: string; role: "admin" | "recruiter" | "controller" | "poster"; countries: string[] }
  | { kind: "anon" };

/** Identifie l'appelant : secret cron, JWT utilisateur (rôle lu dans profiles), ou anonyme. */
export async function caller(req: Request, db: SupabaseClient): Promise<Caller> {
  const cron = req.headers.get("x-cron-secret");
  const expected = Deno.env.get("CRON_SECRET");
  if (cron && expected && cron.length === expected.length && timingSafeEqual(cron, expected)) return { kind: "cron" };
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return { kind: "anon" };
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return { kind: "anon" };
  const { data: p } = await db.from("profiles").select("role, recruiter_countries, email").eq("id", data.user.id).maybeSingle();
  if (!p) return { kind: "anon" };
  return { kind: "user", id: data.user.id, email: p.email, role: p.role, countries: p.recruiter_countries ?? [] };
}

function timingSafeEqual(a: string, b: string): boolean {
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export function requireAdmin(c: Caller, allowCron = true): void {
  if (c.kind === "cron" && allowCron) return;
  if (c.kind === "user" && c.role === "admin") return;
  throw new HttpError(403, "admin_only");
}

export function requireStaff(c: Caller): void {
  if (c.kind === "cron") return;
  if (c.kind === "user" && (c.role === "admin" || c.role === "recruiter" || c.role === "controller")) return;
  throw new HttpError(403, "staff_only");
}

/** Recrutement (candidatures, contrats) : admin ou recruteur, jamais le contrôleur. */
export function requireRecruiter(c: Caller): void {
  if (c.kind === "cron") return;
  if (c.kind === "user" && (c.role === "admin" || c.role === "recruiter")) return;
  throw new HttpError(403, "recruiter_only");
}

export function userId(c: Caller): string | null {
  return c.kind === "user" ? c.id : null;
}

/** Enveloppe standard : CORS, JSON, erreurs propres (jamais de secret dans la réponse). */
export function serve(handler: (req: Request, body: any, db: SupabaseClient) => Promise<unknown>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
    const db = admin();
    try {
      const body = req.method === "POST" ? await req.json().catch(() => ({})) : Object.fromEntries(new URL(req.url).searchParams);
      const out = await handler(req, body, db);
      return out instanceof Response ? out : json(out ?? { ok: true });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      const message = e instanceof Error ? e.message : String(e);
      if (status >= 500) console.error(message);
      return json({ ok: false, error: message }, status);
    }
  });
}

export async function getSetting<T = Record<string, any>>(db: SupabaseClient, key: string): Promise<T> {
  const { data } = await db.from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value ?? {}) as T;
}

export async function audit(db: SupabaseClient, actor: string | null, action: string, entity: string, entityId: string | null, details: unknown = null) {
  await db.from("audit_log").insert({ actor, action, entity, entity_id: entityId, details });
}

export function appUrl(path = ""): string {
  const base = (Deno.env.get("APP_URL") ?? "http://localhost:5173").replace(/\/$/, "");
  return `${base}${path}`;
}
