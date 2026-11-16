import { describe, expect, it } from "vitest";
import { CREATIVE_LANGS, HOOKS, RTL_LANGS } from "./creativeCopy.ts";

describe("constantes des créas", () => {
  it("couvre les 39 langues des cartes, sans libellé de montant", () => {
    expect(CREATIVE_LANGS.length).toBeGreaterThanOrEqual(39);
    expect(HOOKS.map((h) => h.label).join(" ")).not.toMatch(/gagne|\$|€|par vidéo/i);
    expect(RTL_LANGS.has("ar")).toBe(true);
  });
});
