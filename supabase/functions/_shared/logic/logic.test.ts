import { describe, expect, it } from "vitest";
import tt from "../../../../src/test/fixtures/apify_tt.json";
import ig from "../../../../src/test/fixtures/apify_ig.json";
import fb from "../../../../src/test/fixtures/apify_fb.json";
import {
  adRunDays, adScore, activationAllowed, addDays, bonusFor, buildActorInput, canSign, capResults, computePayout,
  dispatchBriefs, fillTemplate, heuristicClassify, landingUrl, maxChargeUsd, mondayOf, normalizeFacebookAd,
  normalizeInstagram, normalizeTikTok, organicScore, payoutsCsv, renderContract, routeEmail, ruulStep,
  sha256Hex, signatureNameMatches, signatureStep, viewsCheckpoint, zoneOfCountry, ageOn, detectLanguage,
  campaignPayload, adsetPayload, adPayload, assertPaused, missingVariables, performanceScore, renderEmail,
} from "./index.ts";
import { attributeVideo, derivedMetrics } from "./attribution.ts";
import { mentionsOf } from "./normalize.ts";

const zoneA = { code: "A", price_per_video: 5, rpm: 1, rpm_views: 1000, currency: "USD" };

describe("dates", () => {
  it("lundi de la semaine", () => {
    expect(mondayOf("2026-11-14")).toBe("2026-11-09"); // samedi
    expect(mondayOf("2026-11-09")).toBe("2026-11-09");
    expect(mondayOf("2026-11-15")).toBe("2026-11-09"); // dimanche
    expect(addDays("2026-11-09", 7)).toBe("2026-11-16");
  });
});

describe("paie", () => {
  const week = "2026-11-02";
  const a = (id: string, posted: string, status: any = "validated", views: number | null = null) =>
    ({ id, brief_title: id, status, posted_url: `https://t/${id}`, posted_at: posted, views_d7: views });

  it("base = vidéos validées de la semaine × tarif", () => {
    const p = computePayout(week, zoneA, [a("1", "2026-11-02T10:00:00Z"), a("2", "2026-11-03T10:00:00Z"), a("3", "2026-11-04T10:00:00Z", "posted")]);
    expect(p.videos_count).toBe(2);
    expect(p.base_amount).toBe(10);
  });

  it("bonus J+7 payé la semaine où tombe J+7, pas avant", () => {
    // publiée le 28/10 → J+7 le 04/11 (semaine du 02/11)
    const p = computePayout(week, zoneA, [a("old", "2026-10-28T10:00:00Z", "validated", 25_000)]);
    expect(p.videos_count).toBe(0);
    expect(p.bonus_amount).toBe(25);
    // publiée le 06/11 → base cette semaine, bonus la semaine suivante
    const q = computePayout(week, zoneA, [a("new", "2026-11-06T10:00:00Z", "validated", 99_999)]);
    expect(q.bonus_amount).toBe(0);
    expect(q.base_amount).toBe(5);
    const r = computePayout("2026-11-09", zoneA, [a("new", "2026-11-06T10:00:00Z", "validated", 99_999)]);
    expect(r.bonus_amount).toBe(100);
    expect(r.base_amount).toBe(0);
  });

  it("vues J+7 non mesurées : ligne à 0 avec note", () => {
    const p = computePayout(week, zoneA, [a("x", "2026-10-29T10:00:00Z", "validated", null)]);
    expect(p.lines[0].amount).toBe(0);
    expect(p.lines[0].note).toMatch(/not measured/);
  });

  it("refusées et non publiées ignorées ; arrondi au centime", () => {
    const p = computePayout(week, { ...zoneA, price_per_video: 3.333 }, [a("1", "2026-11-02T10:00:00Z"), a("2", "2026-11-02T11:00:00Z", "rejected"), { id: "3", status: "todo" as const }]);
    expect(p.total).toBe(3.33);
    expect(bonusFor(1234, zoneA)).toBe(1.23);
    expect(bonusFor(500, zoneA, 1000)).toBe(0);
  });

  it("export CSV", () => {
    const p = computePayout(week, zoneA, [a("1", "2026-11-02T10:00:00Z")]);
    const csv = payoutsCsv([{ name: "Ana, B", email: "a@x.com", ruul_email: null, country: "ES", payout: p }]);
    expect(csv.split("\n")[1]).toBe('2026-11-02,"Ana, B",a@x.com,,ES,A,1,5.00,0.00,5.00,USD');
  });
});

describe("zones", () => {
  const zones = [{ code: "A", price_per_video: 5, rpm: 1, rpm_views: 1000, currency: "USD", videos_per_day: 2 }];
  const countries = [{ code: "FR", name: "France", zone_code: "A", language: "fr", open: true }, { code: "XX", name: "?", zone_code: null, language: "en", open: true }];
  it("zone du pays", () => {
    expect(zoneOfCountry("fr", countries, zones)?.code).toBe("A");
    expect(zoneOfCountry("XX", countries, zones)).toBeNull();
    expect(zoneOfCountry(null, countries, zones)).toBeNull();
  });
  it("majorité", () => {
    expect(ageOn("2008-11-15", new Date("2026-11-14T12:00:00Z"))).toBe(17);
    expect(ageOn("2008-11-14", new Date("2026-11-14T12:00:00Z"))).toBe(18);
  });
});

describe("répartition des briefs", () => {
  const P = (id: string, extra: any = {}) => ({ id, country: "FR", language: "fr", daily_quota: 2, assigned_today: 0, total_assigned: 0, ...extra });
  const B = (id: string, extra: any = {}) => ({ id, created_at: `2026-11-14T0${id.length}:00:00Z`, member_ids: [], target_countries: [], language: null, remaining: 1, already_assigned: [], ...extra });

  it("respecte le quota de 2 par jour", () => {
    const out = dispatchBriefs([P("p1")], [B("b1"), B("b2"), B("b3")], "2026-11-14");
    expect(out.map((o) => o.brief_id)).toEqual(["b1", "b2"]);
  });
  it("équilibre la charge et filtre pays / langue / pool / déjà reçu", () => {
    const posters = [P("p1", { total_assigned: 10 }), P("p2"), P("p3", { country: "ES", language: "es" }), P("p4", { assigned_today: 2 })];
    const out = dispatchBriefs(posters, [B("b1", { remaining: 2, target_countries: ["FR"], language: "fr", already_assigned: [] })], "d");
    expect(out.map((o) => o.poster_id)).toEqual(["p2", "p1"]);
    const out2 = dispatchBriefs(posters, [B("b1", { remaining: 5, member_ids: ["p3"] })], "d");
    expect(out2.map((o) => o.poster_id)).toEqual(["p3"]);
    const out3 = dispatchBriefs(posters, [B("b1", { remaining: 5, already_assigned: ["p1", "p2", "p3"] })], "d");
    expect(out3).toEqual([]);
  });
  it("es-419 compatible avec es", () => {
    const out = dispatchBriefs([P("p", { language: "es-419", country: "MX" })], [B("b", { language: "es" })], "d");
    expect(out).toHaveLength(1);
  });
});

describe("relances", () => {
  const sent = "2026-11-01T10:00:00Z";
  const at = (d: number) => new Date(new Date(sent).getTime() + d * 86_400_000);
  it("signature J+1, J+3, J+6 puis expiration J+7", () => {
    expect(signatureStep(sent, 0, at(0.5))).toBeNull();
    expect(signatureStep(sent, 0, at(1.1))).toBe(1);
    expect(signatureStep(sent, 1, at(2))).toBeNull();
    expect(signatureStep(sent, 1, at(3.2))).toBe(3);
    expect(signatureStep(sent, 2, at(6.1))).toBe(6);
    expect(signatureStep(sent, 3, at(7.01))).toBe("expire");
    expect(signatureStep(sent, 0, at(8))).toBe("expire");
  });
  it("Ruul : invitation, J+1, J+3, problème J+5", () => {
    const s = (r: number) => ({ status: "added", added_at: sent, reminders: r });
    expect(ruulStep(s(0), at(0))).toBe("invite");
    expect(ruulStep(s(1), at(0.5))).toBeNull();
    expect(ruulStep(s(1), at(1))).toBe("reminder1");
    expect(ruulStep(s(2), at(3))).toBe("reminder3");
    expect(ruulStep(s(3), at(5))).toBe("problem");
    expect(ruulStep({ status: "done", added_at: sent, reminders: 0 }, at(9))).toBeNull();
  });
  it("mesures de vues J+2 / J+7", () => {
    const a = { posted_at: sent, views_d2_at: null, views_d7_at: null };
    expect(viewsCheckpoint(a, at(1))).toBeNull();
    expect(viewsCheckpoint(a, at(2.5))).toBe("d2");
    expect(viewsCheckpoint({ ...a, views_d2_at: "x" }, at(3))).toBeNull();
    expect(viewsCheckpoint(a, at(8))).toBe("d7");
  });
});

describe("score", () => {
  const now = new Date("2026-11-14T00:00:00Z");
  it("une petite chaîne qui perce bat une grosse chaîne moyenne", () => {
    const small = organicScore({ views: 500_000, followers: 2_000, likes: 40_000, publishedAt: "2026-11-10T00:00:00Z" }, now);
    const big = organicScore({ views: 1_000_000, followers: 5_000_000, likes: 20_000, publishedAt: "2026-11-10T00:00:00Z" }, now);
    expect(small).toBeGreaterThan(big);
    expect(small).toBeLessThanOrEqual(100);
  });
  it("vélocité : récent > ancien à vues égales", () => {
    const fresh = organicScore({ views: 100_000, followers: 10_000, publishedAt: "2026-11-13T00:00:00Z" }, now);
    const old = organicScore({ views: 100_000, followers: 10_000, publishedAt: "2025-11-13T00:00:00Z" }, now);
    expect(fresh).toBeGreaterThan(old);
    expect(organicScore({ views: 0 }, now)).toBe(0);
  });
  it("pubs : longévité", () => {
    expect(adScore(7, false)).toBe(25);
    expect(adScore(21, false)).toBe(50);
    expect(adScore(60, true)).toBeGreaterThan(adScore(60, false));
    expect(adScore(10_000, true)).toBe(100);
    expect(performanceScore({ isAd: true, adDays: 7 })).toBe(25);
    expect(adRunDays("2026-11-01T00:00:00Z", "2026-11-10T00:00:00Z", false)).toBe(10);
  });
});

describe("normalisation Apify (vrais items)", () => {
  it("TikTok", () => {
    const v = normalizeTikTok((tt as any[])[0])!;
    expect(v.platform).toBe("tiktok");
    expect(v.author_handle).toBe("knowunity.fr");
    expect(v.language).toBe("fr");
    expect(v.views).toBeGreaterThan(0);
    expect(v.hashtags).toContain("histoire");
    expect(v.hashtags).toContain("greenscreen");
    expect(v.url).toMatch(/tiktok\.com\/@knowunity\.fr\/video\//);
  });
  it("Instagram", () => {
    const v = normalizeInstagram((ig as any[])[0])!;
    expect(v.platform).toBe("instagram");
    expect(v.author_handle).toBe("knowunity.fr");
    expect(v.views).toBe(658);
    expect(v.duration_s).toBeCloseTo(52.5, 0);
  });
  it("Facebook Ad Library : vidéos seulement, durée de diffusion", () => {
    const rows = (fb as any[]).map((x) => normalizeFacebookAd(x, new Date("2026-11-14T00:00:00Z"))).filter(Boolean);
    expect(rows.length).toBeGreaterThan(0);
    const r = rows[0]!;
    expect(r.is_ad).toBe(true);
    expect(r.ad_page_name).toBe("Knowunity");
    expect(r.ad_days).toBeGreaterThan(1);
    expect(r.caption ?? "").not.toContain("{{");
  });
});

describe("catégorisation heuristique", () => {
  const cats = [
    { id: "tuto", slug: "tutorial", keywords: ["tutorial", "how to", "tips", "astuce"] },
    { id: "pov", slug: "pov", keywords: ["pov"] },
    { id: "slide", slug: "slideshow", keywords: ["slideshow"] },
    { id: "gs", slug: "greenscreen", keywords: ["greenscreen", "green screen"] },
  ];
  it("légende et hashtags", () => {
    expect(heuristicClassify({ caption: "POV: tu réviseras jamais pareil", hashtags: [] }, cats).category_id).toBe("pov");
    expect(heuristicClassify({ caption: "3 astuces", hashtags: ["studytips", "tutorial"] }, cats).category_id).toBe("tuto");
    expect(heuristicClassify({ caption: "", hashtags: ["greenscreen"] }, cats).category_id).toBe("gs");
    expect(heuristicClassify({ caption: "rien", hashtags: [], raw_type: "slideshow" }, cats).category_id).toBe("slide");
    expect(heuristicClassify({ caption: "nothing here", hashtags: [] }, cats).category_id).toBeNull();
  });
  it("pas de faux positif sur un mot partiel", () => {
    expect(heuristicClassify({ caption: "spoon", hashtags: [] }, cats).category_id).toBeNull();
  });
});

describe("langue", () => {
  it("détecte fr / es / en", () => {
    expect(detectLanguage("Comment réviser pour le bac avec une app")).toBe("fr");
    expect(detectLanguage("La mejor app para estudiar con IA")).toBe("es");
    expect(detectLanguage("This is the best app for your exams")).toBe("en");
    expect(detectLanguage("ok")).toBeNull();
  });
});

describe("garde-fou email", () => {
  const base = { test_mode: true, test_recipient: "", sender_email: "hello@vik.studio" };
  it("mode test sans destinataire : rien ne part", () => {
    expect(routeEmail("a@b.com", base)).toEqual({ send: false, reason: "test_mode_no_recipient" });
  });
  it("mode test : redirigé vers l'admin", () => {
    const r = routeEmail("a@b.com", { ...base, test_recipient: "max@vik.studio" });
    expect(r).toMatchObject({ send: true, to: "max@vik.studio", redirected: true });
  });
  it("sans expéditeur : rien ne part, même en réel", () => {
    expect(routeEmail("a@b.com", { ...base, test_mode: false, sender_email: "" }).send).toBe(false);
  });
  it("mode réel", () => {
    expect(routeEmail("a@b.com", { ...base, test_mode: false })).toMatchObject({ send: true, to: "a@b.com", redirected: false });
  });
  it("en-tête : logo PNG si fourni, sinon texte", () => {
    expect(renderEmail({ subject: "s", body: "b", logoUrl: "https://x.app/brand/vik-studios-logo.png" }).html).toContain('<img src="https://x.app/brand/vik-studios-logo.png"');
    expect(renderEmail({ subject: "s", body: "b" }).html).toContain(">Vik Studios</span>");
  });
  it("variables", () => {
    expect(fillTemplate("Hi {name}, {x}", { name: "Ana" })).toBe("Hi Ana, {x}");
  });
});

describe("Apify : plafonds", () => {
  it("jamais au-dessus du plafond dur", () => {
    expect(capResults(5000, 200)).toBe(200);
    expect(capResults(0, 200)).toBe(1);
    const i = buildActorInput({ platform: "tiktok", kind: "account", value: "@knowunity.fr", max_results: 999 }, 50) as any;
    expect(i.resultsPerPage).toBe(50);
    expect(i.profiles).toEqual(["knowunity.fr"]);
    expect(maxChargeUsd("tiktok", 30)).toBe(0.5);
  });
  it("FB Ad Library par page id ou mot-clé", () => {
    const k = buildActorInput({ platform: "facebook_ads", kind: "page", value: "Astra AI", max_results: 10 }, 200) as any;
    expect(k.startUrls[0].url).toContain("q=Astra%20AI");
    expect(k.startUrls[0].url).toContain("media_type=video");
    const p = buildActorInput({ platform: "facebook_ads", kind: "page", value: "102545774445089", max_results: 10 }, 200) as any;
    expect(p.startUrls[0].url).toContain("view_all_page_id=102545774445089");
  });
});

describe("contrats", () => {
  it("rendu, variables manquantes, hash", async () => {
    const r = renderContract("Hello {{ full_name }}, {{price}} per video. {{unknown}}", { full_name: "Ana", price: "$5" });
    expect(r).toBe("Hello Ana, $5 per video. {{unknown}}");
    expect(missingVariables(r)).toEqual(["unknown"]);
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
  it("signature : nom, case, hash, expiration", () => {
    const c = { status: "sent", expires_at: "2026-11-20T00:00:00Z", doc_hash: "h" };
    const cand = { first_name: "Zoé", last_name: "Martín" };
    const now = new Date("2026-11-14T00:00:00Z");
    expect(signatureNameMatches("zoe martin", "Zoé", "Martín")).toBe(true);
    expect(canSign(c, { typed_name: "Zoe Martin", accepted: true, doc_hash: "h" }, cand, now)).toEqual({ ok: true });
    expect(canSign(c, { typed_name: "Zoe Martin", accepted: false, doc_hash: "h" }, cand, now).error).toBe("not_accepted");
    expect(canSign(c, { typed_name: "Bob", accepted: true, doc_hash: "h" }, cand, now).error).toBe("name_mismatch");
    expect(canSign(c, { typed_name: "Zoe Martin", accepted: true, doc_hash: "x" }, cand, now).error).toBe("hash_mismatch");
    expect(canSign(c, { typed_name: "Zoe Martin", accepted: true, doc_hash: "h" }, cand, new Date("2026-12-01")).error).toBe("expired");
    expect(canSign({ ...c, status: "signed" }, { typed_name: "Zoe Martin", accepted: true, doc_hash: "h" }, cand, now).error).toBe("already_signed");
  });
});

describe("Meta : tout en PAUSED", () => {
  it("payloads", () => {
    expect(campaignPayload("x", ["fr"]).status).toBe("PAUSED");
    expect(campaignPayload("x", ["fr"]).special_ad_category_country).toEqual(["FR"]);
    expect(adsetPayload({ name: "a", campaignId: "1", country: "fr", dailyBudget: 5, employment: true }).dsa_beneficiary).toBe("Vik Studios");
    expect(adsetPayload({ name: "a", campaignId: "1", country: "fr", dailyBudget: 5.5, employment: true }).daily_budget).toBe(550);
    expect(adPayload({ name: "a", adsetId: "1", creativeId: "2" }).status).toBe("PAUSED");
    expect(() => assertPaused({ status: "ACTIVE" })).toThrow();
  });
  it("activation : admin + plafond", () => {
    expect(activationAllowed({ isAdmin: false, dailyBudget: 5, cap: 50 }).ok).toBe(false);
    expect(activationAllowed({ isAdmin: true, dailyBudget: 60, cap: 50 }).reason).toBe("over_cap");
    expect(activationAllowed({ isAdmin: true, dailyBudget: 50, cap: 50 }).ok).toBe(true);
  });
  it("landing avec UTM", () => {
    const u = landingUrl("https://vik.example", { country: "FR", lang: "fr", campaign: "rec-fr", adset: "fr-a" });
    expect(u).toBe("https://vik.example/join/fr?lang=fr&utm_source=meta&utm_medium=paid_social&utm_campaign=rec-fr&utm_content=fr-a");
  });
});

describe("attribution concurrents", () => {
  const comps = [
    { id: "ku", name: "Knowunity", brand_terms: ["knowunity"], official_handles: ["knowunity.fr", "knowunity"] },
    { id: "as", name: "Astra AI", brand_terms: ["astra ai", "astraai"], official_handles: ["astra_ai_es"] },
    { id: "di", name: "Diane", brand_terms: ["diane app", "dianeapp"], official_handles: ["diane.app.officiel"] },
  ];
  const v = (x: any) => ({ author_handle: "someone", caption: "", hashtags: [], mentions: [], is_ad: false, ...x });
  it("compte officiel", () => expect(attributeVideo(v({ author_handle: "knowunity.fr" }), comps)).toMatchObject({ competitor_id: "ku", origin: "official" }));
  it("UGC par mention, hashtag, légende", () => {
    expect(attributeVideo(v({ mentions: ["knowunity.de"] }), comps)).toMatchObject({ competitor_id: "ku", origin: "ugc" });
    expect(attributeVideo(v({ hashtags: ["astraai"] }), comps)).toMatchObject({ competitor_id: "as", origin: "ugc" });
    expect(attributeVideo(v({ caption: "I tried Astra AI for my exams" }), comps)).toMatchObject({ competitor_id: "as", origin: "ugc" });
  });
  it("pas de faux positif sur un prénom", () => {
    expect(attributeVideo(v({ caption: "Diane m'a aidée à réviser" }), comps).competitor_id).toBeNull();
  });
  it("pub : page de la marque ; sinon indice de la source", () => {
    expect(attributeVideo(v({ is_ad: true, ad_page_name: "Knowunity" }), comps)).toMatchObject({ competitor_id: "ku", origin: "ad" });
    expect(attributeVideo(v({ caption: "random" }), comps, "di")).toMatchObject({ competitor_id: "di", origin: "ugc" });
    expect(attributeVideo(v({ is_ad: true, ad_page_name: "Other" }), comps).origin).toBe("ad");
    expect(attributeVideo(v({ is_ad: true, ad_page_name: "Adobe Premiere" }), comps, "di")).toMatchObject({ competitor_id: null, origin: "ad" });
  });
  it("mentions et métriques dérivées", () => {
    expect(mentionsOf([{ userUniqueId: "Knowunity.FR" }], null, "merci @astra_ai_es !")).toEqual(["knowunity.fr", "astra_ai_es"]);
    const m = derivedMetrics({ views: 10000, likes: 500, comments: 50, shares: 100, author_followers: 1000, published_at: "2026-11-05T00:00:00Z" }, new Date("2026-11-15T00:00:00Z"));
    expect(m).toEqual({ engagement: 0.09, outlier: 10, velocity: 1000 });
  });
});
