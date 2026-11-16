import { describe, expect, it } from "vitest";
import { copyViolations, JOB_COPY, jobCopy } from "./jobCopy";
import { CREATIVE_LANGS } from "./creativeCopy";

describe("créas format offre d'emploi", () => {
  it("couvre les 30 langues des créas", () => {
    for (const l of CREATIVE_LANGS) expect(JOB_COPY[l], l).toBeTruthy();
  });
  it("aucun texte généré n'enfreint les règles (toutes langues, toutes accroches)", () => {
    for (const l of Object.keys(JOB_COPY)) for (const h of ["student", "earn", "nofollow"] as const) {
      const c = jobCopy(l, h, "2,50 US$", "MX");
      const text = [c.headline, c.tag, c.pay, c.cta].filter(Boolean).join(" · ");
      expect(copyViolations(text, l), `${l}/${h}: ${text}`).toEqual([]);
    }
  });
  it("espagnol : offre d'emploi, tarif comme rémunération, pas de question sur l'attribut", () => {
    expect(jobCopy("es", "student", "2,50 US$", "MX")).toEqual({ lang: "es", headline: "Trabajo: creador/a de contenido UGC", tag: "Ideal para estudiantes", pay: "Pago: 2,50 US$ por video + bono por vistas", cta: "Postúlate" });
    expect(jobCopy("es", "earn", "3 €", "ES").pay).toBe("Pago: 3 € por vídeo + bono por vistas");
    expect(jobCopy("es", "nofollow", "2 $", "CO").tag).toBe("Sin necesidad de seguidores");
  });
  it("détecte les formulations interdites", () => {
    expect(copyViolations("¿Estudiante? Gana dinero desde casa, hasta 150 US$ al mes 💸", "es").length).toBeGreaterThanOrEqual(5);
    expect(copyViolations("Make money from home, up to $500/month", "en").length).toBeGreaterThanOrEqual(3);
    expect(copyViolations("Étudiant·e ? Gagne de l'argent, jusqu'à 150 € par mois", "fr").length).toBeGreaterThanOrEqual(3);
  });
});
