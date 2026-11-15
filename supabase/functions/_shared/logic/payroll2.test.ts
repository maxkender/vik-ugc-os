import { describe, expect, it } from "vitest";
import { canValidate, checkAdjustment, missingD7, payoutTotal, ruulCsv, weekReference } from "./payroll.ts";

describe("paie du lundi : ajustements", () => {
  it("total = base + bonus + ajustement, jamais négatif", () => {
    expect(payoutTotal(10, 4.5, 2.25)).toBe(16.75);
    expect(payoutTotal(10, 0, -3)).toBe(7);
    expect(payoutTotal(5, 0, -20)).toBe(0);
    expect(payoutTotal(0.1, 0.2, 0)).toBe(0.3);
  });
  it("motif obligatoire, montants bornés", () => {
    expect(checkAdjustment(5, "", 10, 0)).toEqual({ ok: false, error: "reason_required" });
    expect(checkAdjustment(5, "  ", 10, 0)).toEqual({ ok: false, error: "reason_required" });
    expect(checkAdjustment(0, "", 10, 0)).toEqual({ ok: true });
    expect(checkAdjustment(-15, "vidéo supprimée", 10, 2)).toEqual({ ok: false, error: "negative_total" });
    expect(checkAdjustment(20000, "x", 10, 0)).toEqual({ ok: false, error: "too_large" });
    expect(checkAdjustment(Number.NaN, "x", 10, 0)).toEqual({ ok: false, error: "invalid_amount" });
    expect(checkAdjustment(-2, "retard", 10, 0)).toEqual({ ok: true });
  });
});

describe("paie du lundi : validation", () => {
  const lines = [{ kind: "video" as const, views_d7: null }, { kind: "bonus" as const, views_d7: 1200 }];
  it("valide un paiement complet", () => {
    expect(canValidate({ status: "pending", review_status: "to_review", lines })).toEqual({ ok: true });
  });
  it("bloque si des vues J+7 manquent, sauf validation forcée", () => {
    const missing = [...lines, { kind: "bonus" as const, views_d7: null }];
    expect(missingD7(missing)).toBe(1);
    expect(canValidate({ status: "pending", review_status: "to_review", lines: missing })).toEqual({ ok: false, reason: "missing_d7" });
    expect(canValidate({ status: "pending", review_status: "to_review", lines: missing }, true)).toEqual({ ok: true });
  });
  it("payé, annulé ou déjà validé : rien à faire", () => {
    expect(canValidate({ status: "paid", review_status: "validated", lines })).toEqual({ ok: false, reason: "already_paid" });
    expect(canValidate({ status: "void", review_status: "to_review", lines })).toEqual({ ok: false, reason: "void" });
    expect(canValidate({ status: "pending", review_status: "validated", lines })).toEqual({ ok: false, reason: "already_validated" });
  });
});

describe("paie du lundi : CSV Ruul", () => {
  it("référence de semaine", () => expect(weekReference("2026-11-09")).toBe("Vik UGC week of 9 Nov 2026"));
  it("une ligne par créateur payé, montants à 2 décimales, échappement", () => {
    const csv = ruulCsv([
      { name: "Ana, B", ruul_email: "ana@ruul.io", total: 12.5, currency: "USD", week_start: "2026-11-09" },
      { name: "Zéro", ruul_email: null, total: 0, currency: "USD", week_start: "2026-11-09" },
    ]);
    expect(csv.split("\n")).toEqual([
      "name,ruul_email,amount,currency,reference",
      '"Ana, B",ana@ruul.io,12.50,USD,Vik UGC week of 9 Nov 2026',
    ]);
  });
});
