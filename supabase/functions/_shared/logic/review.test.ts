import { describe, expect, it } from "vitest";
import { feedbackEmailVars, parseTimestamp, reviewStats, verdictLabel } from "./review";

describe("retours aux créateurs", () => {
  it("email dans la langue du posteur, points et timestamps listés, consigne de correction", () => {
    const v = feedbackEmailVars({ firstName: "Lea", briefTitle: "POV révisions", verdict: "changes_requested", comment: "Hook trop lent.", checks: ["hook", "sound"], timestamps: [{ t: "0:04", note: "coupe ici" }], language: "es-MX" });
    expect(v.verdict).toBe("por corregir ✏️");
    expect(v.points).toBe("Puntos a mejorar :\n• Hook\n• Sonido\n• 0:04 : coupe ici");
    expect(v.fix_hint).toContain("Ya lo corregí");
    expect(feedbackEmailVars({ firstName: "A", briefTitle: "B", verdict: "validated", language: "de" }).fix_hint).toBe("");
    expect(verdictLabel("rejected", "fr")).toBe("refusée");
  });
  it("timestamps", () => {
    expect(parseTimestamp("0:04")).toBe(4);
    expect(parseTimestamp("1:20")).toBe(80);
    expect(parseTimestamp("12")).toBe(12);
    expect(parseTimestamp("1:75")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
  });
  it("statistiques : taux de validation et points fréquents", () => {
    const s = reviewStats([
      { poster_id: "a", verdict: "validated", checks: [] },
      { poster_id: "a", verdict: "changes_requested", checks: ["hook", "sound"] },
      { poster_id: "a", verdict: "validated", checks: [] },
      { poster_id: "b", verdict: "rejected", checks: ["hook"] },
    ]);
    expect(s.posters[0]).toMatchObject({ poster_id: "a", total: 3, validated: 2, changes: 1, validation_rate: 67 });
    expect(s.top_issues[0]).toEqual({ check: "hook", n: 2 });
    expect(s.posters[1]).toMatchObject({ poster_id: "b", validation_rate: 0, rejected: 1 });
  });
});
