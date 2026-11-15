import { describe, expect, it } from "vitest";
import { d7Status } from "./payroll";
import { viewsCheckpoint } from "./reminders";

describe("d7Status", () => {
  const now = new Date("2026-11-15T13:00:00Z");
  it("vidéo du 3 nov. avec vues relevées : J+7 le 10 nov., bonus semaine du 9 nov.", () => {
    expect(d7Status("2026-11-03T10:00:00Z", 48250, now)).toEqual({ kind: "measured", d7Day: "2026-11-10", bonusWeek: "2026-11-09", views: 48250 });
  });
  it("vidéo du 3 nov. sans vues au 15 nov. : relevé manquant, pas « semaine prochaine »", () => {
    expect(d7Status("2026-11-03T10:00:00Z", null, now).kind).toBe("missing");
  });
  it("J+7 pas encore passé : à venir", () => {
    expect(d7Status("2026-11-12T22:30:00Z", null, now)).toMatchObject({ kind: "upcoming", d7Day: "2026-11-19", bonusWeek: "2026-11-16" });
  });
  it("le jour même du J+7 compte comme passé (UTC)", () => {
    expect(d7Status("2026-11-08T23:59:00Z", null, now).kind).toBe("missing");
  });
  it("0 vue relevée reste « relevé »", () => {
    expect(d7Status("2026-11-01T00:00:00Z", 0, now).kind).toBe("measured");
  });
});

describe("relevé J+7 automatique (cron 06:40 UTC)", () => {
  const a = { posted_at: "2026-11-03T10:00:00Z", views_d2_at: "2026-11-05T06:40:00Z", views_d7_at: null };
  it("se déclenche le matin du J+7 (10 nov. 06:40), pas le 11", () => {
    expect(viewsCheckpoint(a, new Date("2026-11-10T06:40:00Z"))).toBe("d7");
    expect(viewsCheckpoint(a, new Date("2026-11-09T23:00:00Z"))).toBeNull();
  });
  it("rattrape un J+7 manqué les jours suivants", () => {
    expect(viewsCheckpoint(a, new Date("2026-11-15T06:40:00Z"))).toBe("d7");
  });
});
