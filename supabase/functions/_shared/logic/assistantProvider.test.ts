import { describe, expect, it } from "vitest";
import { pickProvider, resolveSettings } from "./assistant";

describe("fournisseur de l'assistant", () => {
  it("auto : fal par défaut si FAL_KEY est posé", () => {
    expect(pickProvider(resolveSettings({}), { fal: true, anthropic: true })).toBe("fal");
    expect(pickProvider(resolveSettings({}), { fal: false, anthropic: true })).toBe("anthropic");
    expect(pickProvider(resolveSettings({}), { fal: false, anthropic: false })).toBeNull();
  });
  it("choix explicite respecté, sans bascule silencieuse", () => {
    expect(pickProvider(resolveSettings({ provider: "anthropic" }), { fal: true, anthropic: true })).toBe("anthropic");
    expect(pickProvider(resolveSettings({ provider: "fal" }), { fal: false, anthropic: true })).toBeNull();
  });
  it("réglages par défaut et valeurs invalides", () => {
    const s = resolveSettings({ provider: "openai" as any, fal_model: " " });
    expect(s.provider).toBe("auto");
    expect(s.fal_model).toBe("anthropic/claude-sonnet-5.5");
    expect(s.fal_fallback_model).toBe("google/gemini-2.5-flash");
  });
});
