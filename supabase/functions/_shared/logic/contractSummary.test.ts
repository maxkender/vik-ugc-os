import { describe, expect, it } from "vitest";
import { composeContract, contractSummary, summaryLanguage } from "./contractSummary.ts";

const i = { price: "$5", rpm: "$1", rpmViews: "1,000", videosPerDay: 1, zone: "A", companyName: "Vik Studios SAS" };

describe("résumé du contrat", () => {
  it("langues : en, fr, es, de, it, pt ; repli en", () => {
    expect(summaryLanguage("fr")).toBe("fr");
    expect(summaryLanguage("es-419")).toBe("es");
    expect(summaryLanguage("pt-BR")).toBe("pt");
    expect(summaryLanguage("ja")).toBe("en");
    expect(summaryLanguage(null)).toBe("en");
  });
  it("contient rémunération, 1 vidéo/jour, RPM J+7, Ruul, durée, résiliation, statut", () => {
    const s = contractSummary("fr", i);
    expect(s).toContain("**$5 par vidéo validée** (zone A)");
    expect(s).toContain("**1 vidéo par jour**");
    expect(s).toContain("$1 pour 1,000 vues");
    expect(s).toContain("J+7");
    expect(s).toContain("Ruul");
    expect(s).toContain("Pas de durée fixe");
    expect(s).toContain("arrêter à tout moment");
    expect(s).toContain("indépendant");
  });
  it("document : résumé local + résumé anglais + contrat complet", () => {
    const fr = composeContract("fr", i, "# Independent Creator Agreement\n\nText");
    expect(fr.language).toBe("fr");
    expect(fr.body.indexOf("## En clair")).toBe(0);
    expect(fr.body).toContain("## In plain words");
    expect(fr.body.trim().endsWith("Text")).toBe(true);
    const en = composeContract("en", i, "# Agreement");
    expect(en.body.match(/## In plain words/g)).toHaveLength(1);
  });
});
