import { describe, expect, it } from "vitest";
import { CREATIVE_COPY, CREATIVE_LANGS, creativeCopy } from "./creativeCopy.ts";

const COUNTRY_LANGS = "en fr es de it pt nl pl ro cs sk hu el bg hr sl sr uk tr ar he ja ko sv no da fi et lv lt".split(" ");

describe("textes des créas", () => {
  it("toutes les langues des pays couverts, tous les champs, prix présent", () => {
    for (const l of COUNTRY_LANGS) {
      expect(CREATIVE_LANGS).toContain(l);
      for (const hook of ["student", "earn"] as const) {
        const c = CREATIVE_COPY[l][hook];
        expect(c.headline.length, `${l}/${hook}`).toBeGreaterThan(5);
        expect(c.subline.length).toBeGreaterThan(5);
        expect(c.cta.length).toBeGreaterThan(1);
        expect(c.headline + c.subline, `${l}/${hook} sans {{price}}`).toContain("{{price}}");
      }
    }
  });
  it("prix inséré, replis langue et hook", () => {
    expect(creativeCopy("fr", "student", "5 $").headline).toBe("Étudiant·e ? Gagne 5 $ par vidéo");
    expect(creativeCopy("de", "nofollow", "5 $").headline).toContain("5 $");
    expect(creativeCopy("xx", "earn", "2 $").lang).toBe("en");
    expect(creativeCopy("es-419", "earn", "2 $").lang).toBe("es");
  });
  it("bonus aux vues et espagnol d'Amérique latine", () => {
    const mx = creativeCopy("es", "student", "2,50 US$", { bonus: "0,50 US$", country: "MX" });
    expect(mx.headline).toBe("¿Estudiante? Gana 2,50 US$ por video");
    expect(mx.subline).not.toContain("vídeo");
    expect(mx.bonus).toBe("+0,50 US$ de bono por cada 1.000 vistas");
    expect(creativeCopy("es", "student", "3 €", { country: "ES" }).headline).toContain("vídeo");
    expect(creativeCopy("fr", "earn", "5 $").bonus).toBeNull();
  });
  it("estimation mensuelle : « hasta » + note « no garantizados », jamais une promesse", () => {
    const c = creativeCopy("es", "nofollow", "2,50 US$", { monthly: "150 US$", perDay: 2, country: "CO" });
    expect(c.monthly).toBe("Hasta ~150 US$/mes* + bono según tus vistas");
    expect(c.disclaimer).toBe("*Estimación con 2 videos al día durante 30 días. Ingresos no garantizados.");
    expect(c.headline).toBe("Sin necesidad de seguidores. 2,50 US$ por video.");
    expect(creativeCopy("ja", "earn", "2 $", { monthly: "120 $" }).monthly).toBeNull();
  });
});
