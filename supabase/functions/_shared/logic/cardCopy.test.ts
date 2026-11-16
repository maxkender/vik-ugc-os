import { describe, expect, it } from "vitest";
import { CARD_COPY, cardCopy, flagEmoji } from "./cardCopy";
import { copyViolations, JOB_COPY } from "./jobCopy";

describe("carte offre d'emploi", () => {
  it("espagnol Mexique : titre avec pays et drapeau, aucun montant", () => {
    const c = cardCopy("es", "nofollow", "MX");
    expect(c.title).toBe("buscamos personas para publicar en TikTok en México 🇲🇽");
    expect(c.lines).toEqual(["grabas tus propios videos UGC de calidad para promocionar una app en TikTok e Instagram, 2 al día desde tu celular.", "no necesitas seguidores. pago cada semana. 18+."]);
    expect(c.footer).toBe("Empleo · México");
    expect(c.primary.split("\n")[0]).toBe("Buscamos creadores/as de contenido en México 📱");
    expect(JSON.stringify(c)).not.toMatch(/\d+[,.]?\d*\s*(US\$|\$|€)/);
  });
  it("préposition correcte selon la langue et le pays", () => {
    expect(cardCopy("fr", "student", "MX").title).toContain("au Mexique");
    expect(cardCopy("fr", "student", "US").title).toContain("aux États-Unis");
    expect(cardCopy("pt", "student", "BR").title).toContain("no Brasil");
    expect(cardCopy("sr", "student", "RS").title).toContain("у Србији");
    expect(flagEmoji("rs")).toBe("🇷🇸");
  });
  it("toutes les langues : textes conformes (pas de revenus, montants, questions)", () => {
    for (const l of Object.keys(CARD_COPY)) for (const h of ["student", "earn", "nofollow"] as const) {
      const c = cardCopy(l, h, "MX");
      expect(copyViolations([c.label, c.title, ...c.lines, c.cta, c.footer, c.primary].join(" · "), l), `${l}/${h}`).toEqual([]);
    }
    expect(Object.keys(JOB_COPY).length).toBeGreaterThanOrEqual(39);
  });
});
