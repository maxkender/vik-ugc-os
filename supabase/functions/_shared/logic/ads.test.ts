import { describe, expect, it } from "vitest";
import fb from "../../../../src/test/fixtures/apify_fb.json";
import { adVariants, countriesOf, normalizeFacebookAd } from "./normalize.ts";

describe("pubs : variantes, pays, plateformes", () => {
  it("variantes = max(collationCount, cartes, 1)", () => {
    expect(adVariants({ collationCount: 7 }, [])).toBe(7);
    expect(adVariants({}, [{}, {}, {}])).toBe(3);
    expect(adVariants({ collationCount: 0 }, [])).toBe(1);
    expect(adVariants({ collationCount: "4" }, [{}])).toBe(4);
  });
  it("pays : codes ISO dédoublonnés, liste vide = inconnu", () => {
    expect(countriesOf({ targetedOrReachedCountries: ["fr", "DE", "FR", "xx1"] })).toEqual(["FR", "DE"]);
    expect(countriesOf({ targetedOrReachedCountries: [] })).toBeNull();
    expect(countriesOf({ reachedCountries: ["es"] })).toEqual(["ES"]);
  });
  it("item réel : plateformes en minuscules, variantes et regroupement renseignés", () => {
    const rows = (fb as any[]).map((x) => normalizeFacebookAd(x, new Date("2026-11-14T00:00:00Z"))).filter(Boolean);
    const r = rows[0]!;
    expect(r.ad_variants).toBeGreaterThanOrEqual(1);
    expect(r.ad_platforms?.every((p) => p === p.toLowerCase())).toBe(true);
    expect(r.ad_collation_id).toBeTruthy();
  });
});
