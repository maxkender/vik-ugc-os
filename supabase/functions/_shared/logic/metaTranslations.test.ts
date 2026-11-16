import { describe, expect, it } from "vitest";
import { launchChecklist } from "./meta.ts";

const base = { accountStatus: 1, hasFunding: true, pageOk: true, pixelId: "1", pixelLastFired: null, pixelShared: false, capiTestedAt: null, landingOk: true,
  domainVerified: false, emailsSent: 1, translationsReviewed: false, approvedCreatives: 0, creativesValidated: false, globalCap: 100, committedBudget: 65 };

describe("checklist : traductions par pays de test", () => {
  it("liste les pays restant à relire avec le relecteur", () => {
    const items = launchChecklist({ ...base, translations: [
      { country: "FR", lang: "fr", reviewer: "Max", done: true },
      { country: "RS", lang: "sr", reviewer: "natif (latin)", done: false },
    ] });
    const t = items.find((i) => i.key === "translations")!;
    expect(t.ok).toBe(false);
    expect(t.critical).toBe(false);
    expect(t.detail).toBe("à relire : RS SR (natif (latin))");
  });
  it("OK quand tous les pays sont relus ; sans liste, retombe sur la case globale", () => {
    expect(launchChecklist({ ...base, translations: [{ country: "FR", lang: "fr", reviewer: "Max", done: true }] }).find((i) => i.key === "translations")!.ok).toBe(true);
    expect(launchChecklist({ ...base, translationsReviewed: true }).find((i) => i.key === "translations")!.ok).toBe(true);
  });
  it("budget engagé 65 € sous le plafond global de 100 €", () => {
    expect(launchChecklist(base).find((i) => i.key === "budget")!.ok).toBe(true);
  });
});
