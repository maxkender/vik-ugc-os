import { describe, expect, it } from "vitest";
import { videoDaysLeft, videoDueAt, videoStep } from "./videoLater.ts";

const t0 = new Date("2026-11-17T10:00:00Z");
const at = (h: number) => new Date(t0.getTime() + h * 3_600_000);

describe("candidature sans vidéo", () => {
  it("rien avant 24 h, relance J+1, relance J+2, expiration J+3", () => {
    expect(videoStep(t0, 0, at(23))).toBeNull();
    expect(videoStep(t0, 0, at(25))).toBe("remind_1");
    expect(videoStep(t0, 1, at(30))).toBeNull();
    expect(videoStep(t0, 1, at(49))).toBe("remind_2");
    expect(videoStep(t0, 0, at(49))).toBe("remind_2"); // cron en retard : on n'envoie que la plus récente
    expect(videoStep(t0, 2, at(60))).toBeNull();
    expect(videoStep(t0, 2, at(72))).toBe("expire");
  });
  it("échéance à J+3 et jours restants", () => {
    expect(videoDueAt(t0).toISOString()).toBe("2026-11-20T10:00:00.000Z");
    expect(videoDaysLeft(videoDueAt(t0), at(1))).toBe(3);
    expect(videoDaysLeft(videoDueAt(t0), at(49))).toBe(1);
    expect(videoDaysLeft(videoDueAt(t0), at(80))).toBe(0);
  });
});
