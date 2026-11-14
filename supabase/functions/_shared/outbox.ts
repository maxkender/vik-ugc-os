// Emails : tout passe par la table email_outbox. L'envoi réel (Brevo) n'a lieu que dans
// la fonction `emails`, derrière le garde-fou routeEmail (mode test par défaut).
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { fillTemplate, renderEmail } from "./logic/template.ts";
import { routeEmail, type EmailSettings } from "./logic/emailGuard.ts";

export interface QueueEmail {
  template: string;
  to: string;
  language?: string | null;
  vars: Record<string, string | number | null | undefined>;
  buttonUrl?: string | null;
  sendAfter?: string;
  relatedType?: string;
  relatedId?: string;
}

/** Logo PNG servi par le front (public/brand) ; seulement si APP_URL est une vraie URL publique. */
function logoUrl(): string | null {
  const base = Deno.env.get("APP_URL");
  return base && /^https:\/\//.test(base) ? `${base.replace(/\/$/, "")}/brand/vik-studios-logo.png` : null;
}

export async function queueEmail(db: SupabaseClient, e: QueueEmail): Promise<string | null> {
  const lang = (e.language ?? "en").split("-")[0];
  const { data: rows } = await db.from("email_templates").select("*").eq("key", e.template).in("language", [lang, "en"]);
  const tpl = rows?.find((r) => r.language === lang) ?? rows?.find((r) => r.language === "en");
  if (!tpl) throw new Error(`email template missing: ${e.template}`);
  const { data: company } = await db.from("settings").select("value").eq("key", "company").maybeSingle();
  const brand = company?.value?.brand ?? "Vik Studios";
  const vars = { brand, ...e.vars };
  const subject = fillTemplate(tpl.subject, vars);
  const { html, text } = renderEmail({
    subject,
    body: fillTemplate(tpl.body, vars),
    button: tpl.button_label && e.buttonUrl ? { label: fillTemplate(tpl.button_label, vars), url: e.buttonUrl } : null,
    brand,
    logoUrl: logoUrl(),
  });
  const { data, error } = await db.from("email_outbox").insert({
    template_key: e.template, to_email: e.to, subject, html, text,
    send_after: e.sendAfter ?? new Date().toISOString(),
    related_type: e.relatedType ?? null, related_id: e.relatedId ?? null,
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

/** Envoie les emails en file. Rien ne part sans expéditeur ; en mode test, tout va à l'admin de test. */
export async function processOutbox(db: SupabaseClient, limit = 50, fetchFn: typeof fetch = fetch) {
  const { data: s } = await db.from("settings").select("value").eq("key", "email").maybeSingle();
  const settings = (s?.value ?? { test_mode: true, test_recipient: "", sender_email: "" }) as EmailSettings & { reply_to?: string };
  const { data: queue } = await db.from("email_outbox").select("*").eq("status", "queued").lte("send_after", new Date().toISOString())
    .order("created_at").limit(limit);
  const result = { sent: 0, held: 0, failed: 0 };
  for (const m of queue ?? []) {
    const route = routeEmail(m.to_email, settings);
    if (!route.send) {
      // On laisse en file (« held ») avec la raison ; repassera en queued quand les réglages changent.
      await db.from("email_outbox").update({ status: "held", hold_reason: route.reason }).eq("id", m.id);
      result.held++;
      continue;
    }
    const key = Deno.env.get("BREVO_API_KEY");
    if (!key) {
      await db.from("email_outbox").update({ status: "held", hold_reason: "BREVO_API_KEY missing" }).eq("id", m.id);
      result.held++;
      continue;
    }
    const res = await fetchFn("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { email: settings.sender_email, name: settings.sender_name ?? "Vik Studios" },
        to: [{ email: route.to }],
        ...(settings.reply_to ? { replyTo: { email: settings.reply_to } } : {}),
        subject: `${route.subjectPrefix}${m.subject}`,
        htmlContent: m.html,
        textContent: m.text ?? undefined,
        tags: [m.template_key ?? "misc"],
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      await db.from("email_outbox").update({ status: "sent", delivered_to: route.to, sent_at: new Date().toISOString(), brevo_message_id: body.messageId ?? null, attempts: m.attempts + 1, hold_reason: null }).eq("id", m.id);
      result.sent++;
    } else {
      const attempts = m.attempts + 1;
      await db.from("email_outbox").update({ status: attempts >= 5 ? "failed" : "queued", attempts, error: `${res.status} ${body.message ?? ""}`.slice(0, 500), send_after: new Date(Date.now() + attempts * 600_000).toISOString() }).eq("id", m.id);
      result.failed++;
    }
  }
  return result;
}
