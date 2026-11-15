// track — suivi des emails sans dépendre de Brevo (marche aussi en mode test).
//   GET ?o=<email_id>            pixel d'ouverture : open_count++, opened_at, événement « email_opened » (une fois)
//   GET ?c=<email_id>&u=<url>    clic : click_count++, clicked_at, événement « link_clicked » (une fois), puis 302 vers u
//   POST (webhook Brevo)         { event: "opened"|"unique_opened"|"click", "message-id": … } → mêmes mises à jour
// Redirection limitée aux URL https de APP_URL ou du projet Supabase (pas de redirection ouverte).
import { admin, cors } from "../_shared/http.ts";

const GIF = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function allowedRedirect(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    const hosts = [Deno.env.get("APP_URL"), Deno.env.get("SUPABASE_URL")].filter(Boolean).map((h) => new URL(h!).host);
    return hosts.includes(url.host);
  } catch {
    return false;
  }
}

async function record(id: string, kind: "open" | "click") {
  const db = admin();
  const { data: m } = await db.from("email_outbox").select("id, application_id, related_type, related_id, template_key, open_count, click_count, opened_at, clicked_at").eq("id", id).maybeSingle();
  if (!m) return;
  const now = new Date().toISOString();
  const first = kind === "open" ? !m.opened_at : !m.clicked_at;
  await db.from("email_outbox").update(kind === "open"
    ? { open_count: m.open_count + 1, opened_at: m.opened_at ?? now }
    // un clic prouve aussi l'ouverture (images bloquées)
    : { click_count: m.click_count + 1, clicked_at: m.clicked_at ?? now, opened_at: m.opened_at ?? now }).eq("id", id);
  if (!first || !m.application_id) return;
  const { data: app } = await db.from("applications").select("poster_id").eq("id", m.application_id).maybeSingle();
  const steps = kind === "open" ? ["email_opened"] : m.opened_at ? ["link_clicked"] : ["email_opened", "link_clicked"];
  await db.from("onboarding_events").insert(steps.map((step) => ({
    application_id: m.application_id, poster_id: app?.poster_id ?? null, step, meta: { email_id: id, template: m.template_key },
  })));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  try {
    if (req.method === "POST") {
      // Webhook Brevo (transactionnel) : on retrouve l'email par son message-id.
      const ev = await req.json().catch(() => ({}));
      const msgId = ev["message-id"] ?? ev.messageId;
      const kind = /click/.test(String(ev.event)) ? "click" : /open/.test(String(ev.event)) ? "open" : null;
      if (msgId && kind) {
        const { data: m } = await admin().from("email_outbox").select("id").eq("brevo_message_id", msgId).maybeSingle();
        if (m) await record(m.id, kind);
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    const o = url.searchParams.get("o");
    if (o) {
      if (UUID.test(o)) await record(o, "open").catch(() => {});
      return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
    }
    const c = url.searchParams.get("c");
    const u = url.searchParams.get("u") ?? "";
    if (!allowedRedirect(u)) return new Response("Lien invalide", { status: 400 });
    if (c && UUID.test(c)) await record(c, "click").catch(() => {});
    return new Response(null, { status: 302, headers: { Location: u, "Cache-Control": "no-store" } });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
