import { describe, expect, it } from "vitest";
import { bioFor, bioMentionsApp, cleanHandle, displayNameFor, fillHandlePattern, generateHandles, parseTikTokProfileHtml, pickSuggestions } from "./handles.ts";

describe("handles", () => {
  const c = { app: "Micabo", first: "Zoé", last: "Martín-García" };
  it("modèles et nettoyage", () => {
    expect(fillHandlePattern("{app}.{first}", c)).toBe("micabo.zoe");
    expect(fillHandlePattern("{first}.{last1}.{app}", c)).toBe("zoe.m.micabo");
    expect(cleanHandle("..Zoé..Micabo!!.")).toBe("zoe.micabo");
    expect(cleanHandle("a")).toBeNull();
    expect(cleanHandle("x".repeat(40))!.length).toBe(24);
  });
  it("génère ~10 candidats uniques", () => {
    const h = generateHandles(["{app}.{first}", "{first}.studies", "{first}{app}"], c, 10);
    expect(h.length).toBe(10);
    expect(new Set(h).size).toBe(10);
    expect(h.slice(0, 3)).toEqual(["micabo.zoe", "zoe.studies", "zoemicabo"]);
    expect(h.every((x) => /^[a-z0-9._]{2,24}$/.test(x) && !x.startsWith(".") && !x.endsWith(".") && !x.includes(".."))).toBe(true);
  });
  it("bio et nom affiché", () => {
    expect(bioFor({ en: "{App} ambassador", fr: "Ambassadrice {App}" }, "fr-FR", c)).toBe("Ambassadrice Micabo");
    expect(bioFor({ en: "{App} ambassador" }, "ja", c)).toBe("Micabo ambassador");
    expect(displayNameFor("{First} | {App}", { app: "Micabo", first: "zoé" })).toBe("Zoé | Micabo");
    expect(bioMentionsApp("Ambassadrice MICABO 📚", "Micabo")).toBe(true);
    expect(bioMentionsApp("study girl", "Micabo")).toBe(false);
  });
  it("choix des suggestions", () => {
    const s = pickSuggestions([
      { handle: "a", tiktok: "taken", instagram: "available" },
      { handle: "b", tiktok: "unknown", instagram: "available" },
      { handle: "c", tiktok: "available", instagram: "available" },
      { handle: "d", tiktok: "available", instagram: "available" },
      { handle: "e", tiktok: "available", instagram: "available" },
    ]);
    expect(s.map((x) => x.handle)).toEqual(["c", "d", "e"]);
  });
  it("lecture d'un profil TikTok", () => {
    expect(parseTikTokProfileHtml('{"uniqueId":"knowunity.fr","signature":"Apprends plus\\nstresse moins"}', "knowunity.fr")).toEqual({ exists: true, bio: "Apprends plus\nstresse moins" });
    expect(parseTikTokProfileHtml('{"statusCode":10221}', "x").exists).toBe(false);
    expect(parseTikTokProfileHtml("<html>captcha</html>", "x").exists).toBeNull();
  });
});
