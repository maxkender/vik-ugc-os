// assistant — l'assistant posteurs de l'espace créateur (bulle de chat).
//   send { message }                         posteur (JWT) : répond avec le contexte du posteur appelant uniquement
//   history                                  posteur (JWT) : messages de sa dernière conversation
//   admin_reply { conversation_id, content, status? }   admin / recruteur : réponse « équipe » visible du posteur
//   set_status { conversation_id, status }   admin / recruteur : open | escalated | closed
//
// Modèle : API Anthropic Messages, appelée UNIQUEMENT ici, clé lue dans le secret ANTHROPIC_API_KEY.
// Sans clé, la fonction répond un message clair « assistant pas encore configuré » (jamais d'erreur).
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { audit, caller, getSetting, HttpError, requireRecruiter, serve, type Caller } from "../_shared/http.ts";
import {
  ASSISTANT_OUTPUT_SCHEMA, assistantLang, assistantText, buildAssistantContext, checkDailyCap, contextBlock,
  finalizeOutput, parseAssistantOutput, resolveSettings, startOfUtcDay, staticSystemPrompt, toApiMessages,
  type AssistantLang, type AssistantSettings, type StoredMessage,
} from "../_shared/logic/assistant.ts";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2026-10-21";
const MAX_MESSAGE_CHARS = 2000;
const STATIC_SYSTEM = staticSystemPrompt();

function requireUser(c: Caller): Extract<Caller, { kind: "user" }> {
  if (c.kind !== "user") throw new HttpError(401, "login_required");
  return c;
}

async function settings(db: SupabaseClient): Promise<AssistantSettings> {
  return resolveSettings(await getSetting(db, "assistant"));
}

async function posterLang(db: SupabaseClient, id: string): Promise<AssistantLang> {
  const [{ data: po }, { data: pr }] = await Promise.all([
    db.from("posters").select("language").eq("id", id).maybeSingle(),
    db.from("profiles").select("locale").eq("id", id).maybeSingle(),
  ]);
  return assistantLang(po?.language, pr?.locale);
}

/** Dernière conversation non close du posteur, créée au besoin. */
async function currentConversation(db: SupabaseClient, posterId: string, create: boolean) {
  const { data } = await db.from("assistant_conversations").select("id, status, escalated_at, escalation_reason, updated_at")
    .eq("poster_id", posterId).neq("status", "closed").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (data || !create) return data;
  const { data: created, error } = await db.from("assistant_conversations").insert({ poster_id: posterId }).select("id, status, escalated_at, escalation_reason, updated_at").single();
  if (error) throw new HttpError(500, error.message);
  return created;
}

async function usedToday(db: SupabaseClient, posterId: string): Promise<number> {
  const { data: convs } = await db.from("assistant_conversations").select("id").eq("poster_id", posterId);
  const ids = (convs ?? []).map((c) => c.id);
  if (!ids.length) return 0;
  const { count } = await db.from("assistant_messages").select("id", { count: "exact", head: true })
    .in("conversation_id", ids).eq("role", "user").gte("created_at", startOfUtcDay());
  return count ?? 0;
}

async function addMessage(db: SupabaseClient, row: { conversation_id: string; role: string; content: string; tokens_in?: number | null; tokens_out?: number | null; author_id?: string | null }) {
  const { data, error } = await db.from("assistant_messages").insert(row).select("id, role, content, created_at").single();
  if (error) throw new HttpError(500, error.message);
  await db.from("assistant_conversations").update({ updated_at: new Date().toISOString() }).eq("id", row.conversation_id);
  return data;
}

/** Contexte du posteur appelant : chaque requête est filtrée par son id (et buildAssistantContext refiltre). */
async function loadContext(db: SupabaseClient, posterId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: profile }, { data: poster }, { data: assignments }, { data: todays }, { data: payouts }, { data: onboarding }] = await Promise.all([
    db.from("profiles").select("id, full_name, locale").eq("id", posterId).maybeSingle(),
    db.from("posters").select("id, display_name, country, language, zone_code, status, handles_status, ruul_status, daily_quota, tiktok_handle, instagram_handle").eq("id", posterId).maybeSingle(),
    db.from("brief_assignments").select("id, poster_id, due_date, status, posted_at, validated_at, views_d2, views_d7, rejection_reason, briefs(title, hook, instructions)")
      .eq("poster_id", posterId).order("due_date", { ascending: false }).limit(30),
    db.from("brief_assignments").select("id, poster_id, due_date, status, posted_at, validated_at, views_d2, views_d7, rejection_reason, briefs(title, hook, instructions)")
      .eq("poster_id", posterId).eq("due_date", today),
    db.from("payouts").select("poster_id, week_start, total, currency, status, videos_count").eq("poster_id", posterId).order("week_start", { ascending: false }).limit(4),
    db.from("onboarding_events").select("poster_id, step, at").eq("poster_id", posterId).order("at", { ascending: false }).limit(5),
  ]);
  const zone = poster?.zone_code
    ? (await db.from("zones").select("code, price_per_video, rpm, rpm_views, currency, videos_per_day").eq("code", poster.zone_code).maybeSingle()).data
    : null;
  const byId = new Map<string, any>();
  for (const a of [...(assignments ?? []), ...(todays ?? [])]) byId.set(a.id, a);
  return buildAssistantContext({
    posterId, today, profile, poster, zone,
    assignments: [...byId.values()], payouts: payouts ?? [], onboarding: onboarding ?? [],
  });
}

interface ModelResult { text: string; tokensIn: number; tokensOut: number; refused: boolean }

async function callModel(key: string, model: string, system: string, messages: { role: string; content: string }[], withFallback = true): Promise<ModelResult> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": key,
    "anthropic-version": ANTHROPIC_VERSION,
  };
  const body: Record<string, unknown> = {
    model,
    max_tokens: 2000,
    // Bloc statique (règles + connaissances) mis en cache ; le contexte du posteur vient après le point de cache.
    system: [
      { type: "text", text: STATIC_SYSTEM, cache_control: { type: "ephemeral" } },
      { type: "text", text: system },
    ],
    messages,
    output_config: { effort: "low", format: { type: "json_schema", schema: ASSISTANT_OUTPUT_SCHEMA } },
  };
  if (withFallback) {
    headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
    body.fallbacks = "default";
  }
  const res = await fetch(ANTHROPIC_URL, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(60_000) });
  if (res.status === 400 && withFallback) return callModel(key, model, system, messages, false);
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    // Jamais la clé dans les logs : seulement le statut et le type d'erreur.
    throw new Error(`anthropic ${res.status} ${err?.error?.type ?? ""}`.trim());
  }
  const j = await res.json();
  const u = j.usage ?? {};
  const text = (j.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  return {
    text,
    tokensIn: (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0),
    tokensOut: u.output_tokens ?? 0,
    refused: j.stop_reason === "refusal",
  };
}

async function send(db: SupabaseClient, c: Extract<Caller, { kind: "user" }>, body: any) {
  const message = String(body.message ?? "").trim().slice(0, MAX_MESSAGE_CHARS);
  if (!message) throw new HttpError(400, "message_required");
  const cfg = await settings(db);
  const lang = await posterLang(db, c.id);
  if (!cfg.enabled) return { ok: true, configured: true, enabled: false, reply: assistantText("disabled", lang) };

  const cap = checkDailyCap(await usedToday(db, c.id), cfg.daily_cap);
  if (!cap.allowed) return { ok: true, configured: true, capped: true, remaining: 0, reply: assistantText("cap_reached", lang) };

  const conv = await currentConversation(db, c.id, true);
  const userMsg = await addMessage(db, { conversation_id: conv!.id, role: "user", content: message });

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) {
    const reply = assistantText("not_configured", lang);
    const sys = await addMessage(db, { conversation_id: conv!.id, role: "system", content: reply });
    return { ok: true, configured: false, conversation_id: conv!.id, status: conv!.status, remaining: cap.remaining - 1, reply, messages: [userMsg, sys] };
  }

  const { data: hist } = await db.from("assistant_messages").select("role, content").eq("conversation_id", conv!.id)
    .order("created_at", { ascending: false }).limit(20);
  const history = ((hist ?? []) as StoredMessage[]).reverse();
  const ctx = await loadContext(db, c.id);

  let out;
  let tokensIn = 0, tokensOut = 0;
  try {
    const r = await callModel(key, cfg.model, contextBlock(ctx), toApiMessages(history));
    tokensIn = r.tokensIn;
    tokensOut = r.tokensOut;
    out = r.refused ? { reply: "", escalate: true, reason: "model refusal" } : parseAssistantOutput(r.text);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    const reply = assistantText("error", ctx.language);
    const sys = await addMessage(db, { conversation_id: conv!.id, role: "system", content: reply });
    return { ok: true, configured: true, conversation_id: conv!.id, status: conv!.status, remaining: cap.remaining - 1, reply, messages: [userMsg, sys] };
  }
  out = finalizeOutput(out, ctx.language);

  const asst = await addMessage(db, { conversation_id: conv!.id, role: "assistant", content: out.reply, tokens_in: tokensIn, tokens_out: tokensOut });
  let status = conv!.status;
  if (out.escalate && status !== "escalated") {
    status = "escalated";
    await db.from("assistant_conversations").update({ status, escalated_at: new Date().toISOString(), escalation_reason: out.reason.slice(0, 500) }).eq("id", conv!.id);
    await audit(db, c.id, "assistant.escalated", "assistant_conversation", conv!.id, { reason: out.reason.slice(0, 500) });
  }
  return { ok: true, configured: true, conversation_id: conv!.id, status, escalated: out.escalate, remaining: cap.remaining - 1, reply: out.reply, messages: [userMsg, asst] };
}

async function history(db: SupabaseClient, c: Extract<Caller, { kind: "user" }>) {
  const cfg = await settings(db);
  const conv = await currentConversation(db, c.id, false);
  const cap = checkDailyCap(await usedToday(db, c.id), cfg.daily_cap);
  const base = { ok: true, configured: !!Deno.env.get("ANTHROPIC_API_KEY"), enabled: cfg.enabled, remaining: cap.remaining, cap: cap.cap };
  if (!conv) return { ...base, conversation: null, messages: [] };
  const { data } = await db.from("assistant_messages").select("id, role, content, created_at").eq("conversation_id", conv.id)
    .order("created_at", { ascending: false }).limit(50);
  return { ...base, conversation: conv, messages: (data ?? []).reverse() };
}

async function adminReply(db: SupabaseClient, c: Caller, body: any) {
  requireRecruiter(c);
  const conversationId = String(body.conversation_id ?? "");
  const content = String(body.content ?? "").trim().slice(0, 4000);
  if (!conversationId || !content) throw new HttpError(400, "conversation_id_and_content_required");
  const { data: conv } = await db.from("assistant_conversations").select("id, poster_id, status").eq("id", conversationId).maybeSingle();
  if (!conv) throw new HttpError(404, "conversation_not_found");
  const actor = c.kind === "user" ? c.id : null;
  const msg = await addMessage(db, { conversation_id: conv.id, role: "admin", content, author_id: actor });
  const status = ["open", "escalated", "closed"].includes(body.status) ? body.status : conv.status;
  if (status !== conv.status) await db.from("assistant_conversations").update({ status }).eq("id", conv.id);
  await audit(db, actor, "assistant.admin_reply", "assistant_conversation", conv.id, { status });
  return { ok: true, message: msg, status };
}

async function setStatus(db: SupabaseClient, c: Caller, body: any) {
  requireRecruiter(c);
  const status = String(body.status ?? "");
  if (!["open", "escalated", "closed"].includes(status)) throw new HttpError(400, "status");
  const { error } = await db.from("assistant_conversations").update({ status, updated_at: new Date().toISOString() }).eq("id", String(body.conversation_id ?? ""));
  if (error) throw new HttpError(500, error.message);
  await audit(db, c.kind === "user" ? c.id : null, "assistant.status", "assistant_conversation", String(body.conversation_id), { status });
  return { ok: true, status };
}

serve(async (req, body, db) => {
  const c = await caller(req, db);
  switch (body.action) {
    case "send": return send(db, requireUser(c), body);
    case "history": return history(db, requireUser(c));
    case "admin_reply": return adminReply(db, c, body);
    case "set_status": return setStatus(db, c, body);
    default: throw new HttpError(400, "unknown_action");
  }
});
