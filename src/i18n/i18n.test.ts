import { describe, it, expect } from "vitest";
import en from "./en";
import es from "./es";
import fr from "./fr";
import { LOCALES } from "./locales";
import { LANGS, uiLangForCountry } from "./index";

const ALL: Record<string, any> = { es, fr, ...LOCALES };

/** Compare la structure (clés, longueurs de tableaux) et les {{placeholders}}. */
function diff(ref: unknown, tr: unknown, path: string, out: string[]) {
  if (typeof ref === "string") {
    if (typeof tr !== "string") return void out.push(`${path}: expected string`);
    for (const ph of ref.match(/\{\{\s*\w+\s*\}\}/g) ?? []) {
      if (!tr.includes(ph)) out.push(`${path}: missing ${ph}`);
    }
    return;
  }
  if (Array.isArray(ref)) {
    if (!Array.isArray(tr)) return void out.push(`${path}: expected array`);
    if (tr.length !== ref.length) out.push(`${path}: length ${tr.length} ≠ ${ref.length}`);
    ref.forEach((v, i) => diff(v, tr[i], `${path}[${i}]`, out));
    return;
  }
  if (ref && typeof ref === "object") {
    if (!tr || typeof tr !== "object") return void out.push(`${path}: expected object`);
    for (const k of Object.keys(ref)) diff((ref as any)[k], (tr as any)[k], `${path}.${k}`, out);
  }
}

describe("i18n public namespaces", () => {
  for (const [code, dict] of Object.entries(ALL)) {
    for (const ns of ["landing", "apply", "common", "sign"] as const) {
      it(`${code}.${ns} matches en`, () => {
        const out: string[] = [];
        diff((en as any)[ns], dict[ns], ns, out);
        expect(out).toEqual([]);
      });
    }
  }

  it("every translation is listed in LANGS", () => {
    const codes = LANGS.map((l) => l.code);
    expect(codes.slice(0, 3)).toEqual(["en", "es", "fr"]);
    for (const code of Object.keys(ALL)) expect(codes).toContain(code);
  });

  it("uiLangForCountry", () => {
    expect(uiLangForCountry("de")).toBe("de");
    expect(uiLangForCountry("no")).toBe("no");
    expect(uiLangForCountry("pt-BR")).toBe("pt");
    expect(uiLangForCountry("xx")).toBe("en");
    expect(uiLangForCountry(null)).toBe("en");
  });
});
