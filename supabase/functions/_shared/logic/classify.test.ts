import { describe, expect, it } from "vitest";
import { thresholdForShare, classifySystemPrompt, classifyUserPrompt, estimateClassifyCost, mergeAppScores, parseClassifyOutput } from "./classify";

const apps = [{ id: "app-1", slug: "micabo", name: "Micabo", description: "Study with AI", audience: "étudiants" }];

describe("classify", () => {
  it("prompt : catégories, apps, consigne JSON", () => {
    const s = classifySystemPrompt([{ slug: "pov", name: "POV" }], apps);
    expect(s).toContain("- pov: POV");
    expect(s).toContain("micabo (Micabo)");
    expect(s).toContain('"results"');
    expect(JSON.parse(classifyUserPrompt([{ id: "v1", platform: "tiktok", caption: "a  b", hashtags: ["x"] }]))[0]).toMatchObject({ id: "v1", caption: "a b" });
  });
  it("parse : JSON entre ```, ids inconnus et doublons ignorés, scores bornés, seuil par défaut", () => {
    const text = "```json\n" + JSON.stringify({ results: [
      { id: "v1", category: "pov", apps: { micabo: { score: 140, reason: "Parfait", compatible: true } } },
      { id: "v1", category: "tutorial", apps: {} },
      { id: "zzz", category: "pov", apps: {} },
      { id: "v2", category: "inconnue", apps: { micabo: { score: 42 }, other: { score: 90 } } },
    ] }) + "\n```";
    const r = parseClassifyOutput(text, ["v1", "v2"], ["pov", "tutorial"], ["micabo"]);
    expect(r).toEqual([
      { id: "v1", category: "pov", apps: { micabo: { score: 100, compatible: true, reason: "Parfait" } } },
      { id: "v2", category: null, apps: { micabo: { score: 42, compatible: false, reason: "" } } },
    ]);
    expect(parseClassifyOutput("pas du json", ["v1"], [], [])).toEqual([]);
  });
  it("merge : la correction manuelle n'est jamais écrasée", () => {
    const prev = { "app-1": { score: 90, reason: "x", ai_compatible: true, manual: false, compatible: false } };
    const m = mergeAppScores(prev, { id: "v", category: null, apps: { micabo: { score: 95, compatible: true, reason: "Top" } } }, apps, "g", "t");
    expect(m["app-1"]).toMatchObject({ score: 95, ai_compatible: true, manual: false, compatible: false, reason: "Top" });
    const fresh = mergeAppScores({}, { id: "v", category: null, apps: { micabo: { score: 30, compatible: false, reason: "Non" } } }, apps, "g", "t");
    expect(fresh["app-1"]).toMatchObject({ compatible: false, manual: null });
  });
  it("compatible exige un score >= 60, même si le modèle dit true", () => {
    const r = parseClassifyOutput(JSON.stringify({ results: [{ id: "v", category: null, apps: { micabo: { score: 45, compatible: true, reason: "" } } }] }), ["v"], [], ["micabo"]);
    expect(r[0].apps.micabo.compatible).toBe(false);
  });
  it("seuil calé sur la distribution (jamais sous 60)", () => {
    const scores = [95, 90, 82, 80, 78, 75, 70, 65, 40, 20];
    expect(thresholdForShare(scores, 0.3)).toBe(82);
    expect(thresholdForShare([50, 40], 0.5)).toBe(60);
    expect(parseClassifyOutput(JSON.stringify({ results: [{ id: "v", apps: { micabo: { score: 78, compatible: true } } }] }), ["v"], [], ["micabo"], 82)[0].apps.micabo.compatible).toBe(false);
  });
  it("estimation de coût", () => { expect(estimateClassifyCost(1500)).toBe(0.9); });
});
