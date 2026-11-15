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
  /** Candidature liée (suivi d'onboarding) ; déduite de relatedType/relatedId si absente. */
  applicationId?: string | null;
  /** Étape d'onboarding à journaliser quand l'email est mis en file (ex. contract_email_sent, access_sent, reminder). */
  onboardingStep?: string | null;
  onboardingMeta?: Record<string, unknown> | null;
}

/** URL publique d'une edge function (suivi des ouvertures / clics). */
function fnUrl(name: string): string {
  return `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "")}/functions/v1/${name}`;
}

export function trackedLink(outboxId: string, url: string): string {
  return `${fnUrl("track")}?c=${outboxId}&u=${encodeURIComponent(url)}`;
}
export function openPixel(outboxId: string): string {
  return `<img src="${fnUrl("track")}?o=${outboxId}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`;
}

/** Candidature et posteur liés à un email, pour le suivi d'onboarding. */
async function resolveLinks(db: SupabaseClient, e: QueueEmail): Promise<{ application_id: string | null; poster_id: string | null }> {
  if (e.applicationId) {
    const { data } = await db.from("applications").select("poster_id").eq("id", e.applicationId).maybeSingle();
    return { application_id: e.applicationId, poster_id: data?.poster_id ?? null };
  }
  if (!e.relatedId) return { application_id: null, poster_id: null };
  if (e.relatedType === "application") {
    const { data } = await db.from("applications").select("poster_id").eq("id", e.relatedId).maybeSingle();
    return { application_id: e.relatedId, poster_id: data?.poster_id ?? null };
  }
  if (e.relatedType === "contract") {
    const { data } = await db.from("contracts").select("application_id, applications(poster_id)").eq("id", e.relatedId).maybeSingle();
    return { application_id: data?.application_id ?? null, poster_id: (data as any)?.applications?.poster_id ?? null };
  }
  if (e.relatedType === "poster") {
    const { data } = await db.from("posters").select("application_id").eq("id", e.relatedId).maybeSingle();
    return { application_id: data?.application_id ?? null, poster_id: e.relatedId };
  }
  if (e.relatedType === "payout") {
    const { data } = await db.from("payouts").select("poster_id, posters(application_id)").eq("id", e.relatedId).maybeSingle();
    return { application_id: (data as any)?.posters?.application_id ?? null, poster_id: data?.poster_id ?? null };
  }
  return { application_id: null, poster_id: null };
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
  // Identifiant connu d'avance : le bouton passe par /track (clic) et un pixel suit l'ouverture.
  const id = crypto.randomUUID();
  const button = tpl.button_label && e.buttonUrl ? { label: fillTemplate(tpl.button_label, vars), url: trackedLink(id, e.buttonUrl) } : null;
  const rendered = renderEmail({ subject, body: fillTemplate(tpl.body, vars), button, brand, logoUrl: logoUrl() });
  const html = rendered.html.replace("</body>", `${openPixel(id)}</body>`);
  // Le texte brut garde le lien direct (pas de suivi dans la version texte).
  const text = e.buttonUrl && button ? rendered.text.replace(button.url, e.buttonUrl) : rendered.text;
  const links = await resolveLinks(db, e);
  const { error } = await db.from("email_outbox").insert({
    id, template_key: e.template, to_email: e.to, subject, html, text,
    send_after: e.sendAfter ?? new Date().toISOString(),
    related_type: e.relatedType ?? null, related_id: e.relatedId ?? null, application_id: links.application_id,
  });
  if (error) throw error;
  if (e.onboardingStep && (links.application_id || links.poster_id)) {
    await db.from("onboarding_events").insert({
      application_id: links.application_id, poster_id: links.poster_id, step: e.onboardingStep,
      meta: { email_id: id, template: e.template, ...(e.onboardingMeta ?? {}) },
    });
  }
  return id;
}

/** Envoie les emails en file. Rien ne part sans expéditeur ; en mode test, tout va à l'admin de test. */
export async function processOutbox(db: SupabaseClient, limit = 50, fetchFn: typeof fetch = fetch) {
  const { data: s } = await db.from("settings").select("value").eq("key", "email").maybeSingle();
  const settings = (s?.value ?? { test_mode: true, test_recipient: "", sender_email: "" }) as EmailSettings & { reply_to?: string };
  const { data: queue } = await db.from("email_outbox").select("*").eq("status", "queued").lte("send_after", new Date().toISOString())
    .order("created_at").limit(limit);
  const result = { sent: 0, held: 0, failed: 0 };
  for (const m of queue ?? []) {
    // Comptes de test (QA) : jamais d'envoi réel.
    if (/@vik-qa\.test$/i.test(m.to_email)) {
      await db.from("email_outbox").update({ status: "cancelled", hold_reason: "test_account" }).eq("id", m.id);
      result.held++;
      continue;
    }
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
