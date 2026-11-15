import { describe, expect, it } from "vitest";
import { authorUrl, cdnAlive, hoverSource, instagramCode, playSources, tiktokId } from "./playback";

const now = Date.parse("2026-11-15T12:00:00Z");
const hex = (ms: number) => Math.floor(ms / 1000).toString(16).toUpperCase();
const fb = (ms: number) => `https://video.xx.fbcdn.net/o1/v/t2/f2/m412/AQ.mp4?_nc_ht=x&oh=00_A&oe=${hex(ms)}`;

describe("playSources", () => {
  it("TikTok sans MP4 : iframe player v1 puis lien", () => {
    const s = playSources({ platform: "tiktok", external_id: "7468245434356534550", url: "https://www.tiktok.com/@a/video/7468245434356534550" }, now);
    expect(s.map((x) => x.kind)).toEqual(["iframe", "link"]);
    expect(s[0]).toMatchObject({ provider: "tiktok", url: expect.stringContaining("/player/v1/7468245434356534550") });
  });
  it("MP4 archivé en premier", () => {
    expect(playSources({ platform: "tiktok", external_id: "7468245434356534550", video_path: "x.mp4" }, now)[0]).toEqual({ kind: "stored", path: "x.mp4" });
  });
  it("Instagram : CDN vivant, puis embed, puis lien", () => {
    const s = playSources({ platform: "instagram", url: "https://www.instagram.com/p/DfFUpxBuZof/", video_src: fb(now + 86_400_000) }, now);
    expect(s.map((x) => x.kind)).toEqual(["mp4", "iframe", "link"]);
    expect(s[1]).toMatchObject({ url: "https://www.instagram.com/p/DfFUpxBuZof/embed/" });
  });
  it("Pub avec lien CDN expiré : seulement le lien Ad Library", () => {
    const s = playSources({ platform: "facebook_ads", external_id: "1006277948561530", url: null, video_src: fb(now - 1000) }, now);
    expect(s).toEqual([{ kind: "link", url: "https://www.facebook.com/ads/library/?id=1006277948561530", label: "Ouvrir dans l'Ad Library" }]);
  });
  it("Pub avec lien CDN vivant : MP4 puis lien", () => {
    expect(playSources({ platform: "facebook_ads", external_id: "1", url: "https://www.facebook.com/ads/library/?id=1", video_src: fb(now + 3_600_000) }, now).map((x) => x.kind)).toEqual(["mp4", "link"]);
  });
});

describe("helpers", () => {
  it("cdnAlive : marge de 5 min, TikTok sans oe = mort", () => {
    expect(cdnAlive(fb(now + 60_000), now)).toBe(false);
    expect(cdnAlive(fb(now + 600_000), now)).toBe(true);
    expect(cdnAlive("https://v16.tiktokcdn.com/x.mp4", now)).toBe(false);
  });
  it("identifiants", () => {
    expect(tiktokId({ platform: "tiktok", external_id: "abc", url: "https://www.tiktok.com/@a/video/7000000000000000099?x=1" })).toBe("7000000000000000099");
    expect(instagramCode("https://www.instagram.com/reel/C9xYz_1-a/?igsh=1")).toBe("C9xYz_1-a");
    expect(instagramCode("https://www.instagram.com/someone/p/ABCDE12/")).toBe("ABCDE12");
  });
  it("survol : MP4 uniquement", () => {
    expect(hoverSource({ platform: "tiktok", external_id: "7468245434356534550" }, now)).toBeNull();
    expect(hoverSource({ platform: "tiktok", video_path: "a.mp4" }, now)?.kind).toBe("stored");
  });
  it("profil créateur", () => {
    expect(authorUrl({ platform: "tiktok", author_handle: "@studyhub" })).toBe("https://www.tiktok.com/@studyhub");
    expect(authorUrl({ platform: "facebook_ads", author_handle: "123" })).toBeNull();
  });
});
