import { describe, expect, it } from "vitest";
import {
  assistantLang, assistantText, buildAssistantContext, checkDailyCap, contextBlock, finalizeOutput,
  parseAssistantOutput, resolveSettings, staticSystemPrompt, toApiMessages, weekStartOf,
} from "./assistant.ts";

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

describe("assistant : plafond quotidien", () => {
  it("autorise sous le plafond, bloque au plafond", () => {
    expect(checkDailyCap(0, 30)).toEqual({ allowed: true, used: 0, remaining: 30, cap: 30 });
    expect(checkDailyCap(29, 30).allowed).toBe(true);
    expect(checkDailyCap(30, 30)).toEqual({ allowed: false, used: 30, remaining: 0, cap: 30 });
    expect(checkDailyCap(45, 30).remaining).toBe(0);
  });
  it("réglages : défauts et valeurs invalides", () => {
    expect(resolveSettings(null)).toEqual({ enabled: true, daily_cap: 30, model: "claude-sonnet-5-5" });
    expect(resolveSettings({ daily_cap: -2, enabled: false })).toMatchObject({ daily_cap: 30, enabled: false });
    expect(resolveSettings({ daily_cap: 5 }).daily_cap).toBe(5);
  });
});

describe("assistant : contexte", () => {
  const base = {
    posterId: ME,
    today: "2026-11-18",
    profile: { id: ME, full_name: "Zoé Martin", locale: "fr" },
    poster: { id: ME, display_name: "Zoé M", country: "FR", language: "fr", zone_code: "A", status: "active", handles_status: "ok", ruul_status: "added", tiktok_handle: "micabo.zoe" },
    zone: { code: "A", price_per_video: "5.00", rpm: "1.0000", rpm_views: 1000, currency: "USD", videos_per_day: 2 },
    assignments: [
      { id: "a1", poster_id: ME, due_date: "2026-11-18", status: "todo", briefs: { title: "Révisions express", hook: "J'ai trouvé l'app", instructions: "Filme en vertical" } },
      { id: "a2", poster_id: ME, due_date: "2026-11-16", status: "validated", posted_at: "2026-11-16T10:00:00Z", views_d2: 1200, briefs: { title: "Bac blanc" } },
      { id: "a3", poster_id: ME, due_date: "2026-11-17", status: "validated", posted_at: "2026-11-17T10:00:00Z", briefs: { title: "Flashcards" } },
      { id: "a4", poster_id: ME, due_date: "2026-11-12", status: "validated", posted_at: "2026-11-12T10:00:00Z", views_d7: 50000, briefs: { title: "Semaine passée" } },
      { id: "x1", poster_id: OTHER, due_date: "2026-11-18", status: "validated", posted_at: "2026-11-18T09:00:00Z", views_d7: 999999, briefs: { title: "SECRET-OTHER-BRIEF" } },
    ],
    payouts: [
      { poster_id: ME, week_start: "2026-11-09", total: "12.5", currency: "USD", status: "paid", videos_count: 2 },
      { poster_id: OTHER, week_start: "2026-11-09", total: "9999", currency: "USD", status: "paid", videos_count: 40 },
    ],
    onboarding: [
      { poster_id: ME, step: "signed", at: "2026-11-01T10:00:00Z" },
      { poster_id: ME, step: "first_post", at: "2026-11-05T10:00:00Z" },
      { poster_id: OTHER, step: "applied", at: "2026-11-20T10:00:00Z" },
    ],
  };

  it("exclut les données des autres posteurs", () => {
    const ctx = buildAssistantContext(base);
    const text = contextBlock(ctx);
    expect(text).not.toContain("SECRET-OTHER-BRIEF");
    expect(text).not.toContain("9999");
    expect(text).not.toContain("999999");
    expect(ctx.recent_assignments).toHaveLength(4);
    expect(ctx.payouts).toEqual([{ week_start: "2026-11-09", total: 12.5, currency: "USD", status: "paid", videos: 2 }]);
    expect(ctx.onboarding_step).toBe("first_post");
  });

  it("ignore un profil / posteur qui n'est pas l'appelant", () => {
    const ctx = buildAssistantContext({ ...base, profile: { id: OTHER, full_name: "Autre Personne" }, poster: { ...base.poster, id: OTHER } });
    expect(ctx.first_name).toBeNull();
    expect(ctx.poster).toBeNull();
    expect(ctx.rate).toBeNull();
  });

  it("briefs du jour, tarif, estimation de la semaine", () => {
    const ctx = buildAssistantContext(base);
    expect(ctx.first_name).toBe("Zoé");
    expect(ctx.language).toBe("fr");
    expect(ctx.today_briefs).toEqual([{ title: "Révisions express", hook: "J'ai trouvé l'app", instructions: "Filme en vertical", status: "todo" }]);
    expect(ctx.rate).toMatchObject({ price_per_video: 5, rpm: 1, rpm_views: 1000, currency: "USD" });
    expect(weekStartOf("2026-11-18")).toBe("2026-11-16");
    // a2 (16/11) + a3 (17/11) validées cette semaine ; a4 (12/11) est de la semaine passée.
    expect(ctx.next_payout_estimate).toEqual({ week_start: "2026-11-16", validated_videos: 2, base_estimate: 10, currency: "USD" });
    expect(ctx.poster?.handles).toEqual(["micabo.zoe"]);
  });

  it("10 dernières assignations maximum", () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: `m${i}`, poster_id: ME, due_date: `2026-10-${String(i + 10).padStart(2, "0")}`, status: "validated" }));
    expect(buildAssistantContext({ ...base, assignments: many }).recent_assignments).toHaveLength(10);
  });

  it("prompt statique sans données posteur (cache stable)", () => {
    const s = staticSystemPrompt();
    expect(s).toContain("NEVER disclose");
    expect(s).toContain("Ruul");
    expect(s).not.toContain("Zoé");
  });
});

describe("assistant : sortie et escalade", () => {
  it("JSON pur", () => {
    expect(parseAssistantOutput('{"reply":"Tu es payé lundi.","escalate":false,"reason":""}')).toEqual({ reply: "Tu es payé lundi.", escalate: false, reason: "" });
  });
  it("JSON entouré de texte ou de ```", () => {
    expect(parseAssistantOutput('Voici :\n```json\n{"reply":"Je transmets à l\'équipe.","escalate":true,"reason":"contract change"}\n```')).toEqual({
      reply: "Je transmets à l'équipe.", escalate: true, reason: "contract change",
    });
    expect(parseAssistantOutput('ok {"reply":"x","escalate":"true"} fin').escalate).toBe(true);
  });
  it("texte libre : réponse telle quelle, pas d'escalade", () => {
    expect(parseAssistantOutput("Bonjour !")).toEqual({ reply: "Bonjour !", escalate: false, reason: "" });
    expect(parseAssistantOutput("")).toEqual({ reply: "", escalate: false, reason: "" });
    expect(parseAssistantOutput("{cassé")).toEqual({ reply: "{cassé", escalate: false, reason: "" });
  });
  it("une escalade annonce toujours la transmission à l'équipe", () => {
    const out = finalizeOutput({ reply: "Je ne peux pas modifier ton contrat.", escalate: true, reason: "" }, "fr");
    expect(out.reply).toContain(assistantText("forwarded", "fr"));
    expect(out.reason).not.toBe("");
    expect(finalizeOutput({ reply: "", escalate: true, reason: "x" }, "es").reply).toBe(assistantText("forwarded", "es"));
  });
});

describe("assistant : divers", () => {
  it("langue", () => {
    expect(assistantLang(null, "fr-FR")).toBe("fr");
    expect(assistantLang("es")).toBe("es");
    expect(assistantLang("ja", undefined)).toBe("en");
  });
  it("historique → messages API", () => {
    const m = toApiMessages([
      { role: "admin", content: "Bonjour" },
      { role: "user", content: "Quand suis-je payé ?" },
      { role: "assistant", content: "Lundi." },
      { role: "system", content: "ignoré" },
      { role: "admin", content: "Paiement envoyé." },
      { role: "user", content: "Merci" },
    ]);
    expect(m[0]).toEqual({ role: "user", content: "Quand suis-je payé ?" });
    expect(m).toHaveLength(4);
    expect(m[2].content).toContain("[Reply from the Vik team]");
  });
  it("messages localisés", () => {
    expect(assistantText("not_configured", "fr")).toMatch(/pas encore configuré/);
    expect(assistantText("not_configured", "en")).toMatch(/not configured/);
  });
});
