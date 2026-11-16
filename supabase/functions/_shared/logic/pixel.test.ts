import { describe, expect, it } from "vitest";
import { capiLeadEvent, employmentTargeting, employmentViolations, fbcFromFbclid, normEmail, normPhone, validEventId, validFbc } from "./pixel";
import { adsetPayload, campaignPayload } from "./meta";

describe("pixel / CAPI", () => {
  it("normalisation email / téléphone", () => {
    expect(normEmail("  Lea@Example.COM ")).toBe("lea@example.com");
    expect(normEmail("pas-un-email")).toBeNull();
    expect(normPhone("+33 6 00 00 00 01")).toBe("33600000001");
    expect(normPhone("0033600000001")).toBe("33600000001");
    expect(normPhone("12")).toBeNull();
  });
  it("fbc depuis fbclid, validations", () => {
    const fbc = fbcFromFbclid("IwAR1abcDEFghiJKL", 1763300000000)!;
    expect(fbc).toBe("fb.1.1763300000000.IwAR1abcDEFghiJKL");
    expect(validFbc(fbc)).toBe(fbc);
    expect(validFbc("x")).toBeNull();
    expect(validEventId("lead-1234abcd")).toBe("lead-1234abcd");
    expect(validEventId("<script>")).toBeNull();
  });
  it("événement Lead : event_id dédupliqué, données hachées seulement", () => {
    const e = capiLeadEvent({ eventId: "lead-1", eventTimeSec: 1, sourceUrl: "https://x/apply/fr", emailHash: "h1", phoneHash: null, countryHash: "h2", fbc: "fb.1.1.a", fbp: null, ip: "1.2.3.4", userAgent: "UA" });
    expect(e).toMatchObject({ event_name: "Lead", event_id: "lead-1", action_source: "website", user_data: { em: ["h1"], country: ["h2"], fbc: "fb.1.1.a", client_ip_address: "1.2.3.4" } });
    expect(JSON.stringify(e)).not.toContain("@");
  });
});

describe("conformité EMPLOYMENT", () => {
  it("le ciblage envoyé est conforme : pays + langue + Advantage+, 18–65, aucun genre / intérêt / code postal", () => {
    const t = employmentTargeting(["fr", "BE"], ["fr"]);
    expect(employmentViolations(t)).toEqual([]);
    expect(t).toMatchObject({ geo_locations: { countries: ["FR", "BE"] }, age_min: 18, age_max: 65, locales: [1003], targeting_automation: { advantage_audience: 1 } });
    const p = adsetPayload({ name: "x", campaignId: "c", country: "FR", dailyBudget: 5, employment: true, langs: ["fr"], pixelId: "123" });
    expect(employmentViolations(p.targeting as any)).toEqual([]);
    expect(JSON.stringify(p)).not.toMatch(/genders|interests|zips|age_max":25|étudiant/);
  });
  it("détecte les violations", () => {
    const v = employmentViolations({ age_min: 18, age_max: 25, genders: [2], interests: [{ id: 1 }], geo_locations: { zips: [{ key: "FR:75001" }], cities: [{ key: "1", radius: 10, distance_unit: "mile" }] } });
    expect(v).toEqual(expect.arrayContaining(["age_max doit valoir 65 (65+)", "ciblage par genre interdit", "ciblage par code postal interdit", "ciblage détaillé interdit : interests"]));
    expect(v.some((x) => x.startsWith("rayon ville"))).toBe(true);
  });
  it("objectif : OUTCOME_LEADS (Lead du pixel) par défaut, TRAFFIC en option", () => {
    expect(campaignPayload("x", ["FR"]).objective).toBe("OUTCOME_LEADS");
    expect(campaignPayload("x", ["FR"], "traffic").objective).toBe("OUTCOME_TRAFFIC");
    const leads = adsetPayload({ name: "x", campaignId: "c", country: "FR", dailyBudget: 5, employment: true, pixelId: "123", objective: "leads" });
    expect(leads).toMatchObject({ optimization_goal: "OFFSITE_CONVERSIONS", promoted_object: { pixel_id: "123", custom_event_type: "LEAD" }, status: "PAUSED" });
    const traffic = adsetPayload({ name: "x", campaignId: "c", country: "FR", dailyBudget: 5, employment: true, objective: "traffic" });
    expect(traffic.optimization_goal).toBe("LANDING_PAGE_VIEWS");
    expect((traffic as any).promoted_object).toBeUndefined();
  });
});

import { blockingItems, launchChecklist } from "./meta";
describe("checklist de lancement", () => {
  const base = { accountStatus: 1, hasFunding: true, pageOk: true, pixelId: "1", pixelLastFired: "2026-11-15T21:39:30Z", pixelShared: true,
    capiTestedAt: "2026-11-16T08:00:00Z", landingOk: true, domainVerified: false, emailsSent: 1, translationsReviewed: false,
    approvedCreatives: 3, creativesValidated: true, globalCap: 100, committedBudget: 40, now: new Date("2026-11-16T09:00:00Z") };
  it("tout critique OK → rien ne bloque (domaine / traductions non critiques)", () => {
    expect(blockingItems(launchChecklist(base))).toEqual([]);
  });
  it("bloque sans test CAPI, sans email délivré, budget au-dessus du plafond", () => {
    const keys = blockingItems(launchChecklist({ ...base, capiTestedAt: null, emailsSent: 0, committedBudget: 120 })).map((x) => x.key);
    expect(keys).toEqual(["capi", "emails", "budget"]);
  });
  it("pixel muet depuis plus de 7 jours → bloquant", () => {
    expect(blockingItems(launchChecklist({ ...base, pixelLastFired: "2026-11-01T00:00:00Z" })).map((x) => x.key)).toEqual(["pixel"]);
  });
});
