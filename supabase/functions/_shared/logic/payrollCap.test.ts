import { describe, expect, it } from "vitest";
import { bonusFor, computePayout } from "./payroll";

// Grille du 16/11 : fixe 10 / 6 / 3 $, RPM 1 / 0,5 / 0,2 $ pour 1 000 vues à J+7, plafond 300 / 150 / 60 $ par vidéo.
const Z = {
  A: { code: "A", price_per_video: 10, rpm: 1, rpm_views: 1000, currency: "USD", bonus_cap: 300 },
  B: { code: "B", price_per_video: 6, rpm: 0.5, rpm_views: 1000, currency: "USD", bonus_cap: 150 },
  C: { code: "C", price_per_video: 3, rpm: 0.2, rpm_views: 1000, currency: "USD", bonus_cap: 60 },
};

describe("bonus plafonné par vidéo", () => {
  it("sous le plafond : vues / 1 000 × RPM", () => {
    expect(bonusFor(48_250, Z.A)).toBe(48.25);
    expect(bonusFor(100_000, Z.B)).toBe(50);
    expect(bonusFor(12_000, Z.C)).toBe(2.4);
  });
  it("au-dessus : plafond de la zone", () => {
    expect(bonusFor(1_000_000, Z.A)).toBe(300);   // 1 000 $ → 300 $
    expect(bonusFor(400_000, Z.B)).toBe(150);     // 200 $ → 150 $
    expect(bonusFor(5_000_000, Z.C)).toBe(60);    // 1 000 $ → 60 $
    expect(bonusFor(300_000, Z.C)).toBe(60);      // pile au plafond
  });
  it("sans plafond configuré : pas de limite", () => {
    expect(bonusFor(1_000_000, { ...Z.A, bonus_cap: null })).toBe(1000);
  });
  it("paie d'une semaine zone C : 2 vidéos validées + 1 bonus plafonné", () => {
    const p = computePayout("2026-11-09", Z.C, [
      { id: "a", status: "validated", posted_at: "2026-11-10T10:00:00Z", views_d7: null },
      { id: "b", status: "validated", posted_at: "2026-11-11T10:00:00Z", views_d7: null },
      { id: "c", status: "validated", posted_at: "2026-11-03T10:00:00Z", views_d7: 2_000_000 },
    ]);
    expect(p.base_amount).toBe(6);
    expect(p.bonus_amount).toBe(60);
    expect(p.total).toBe(66);
  });
});
