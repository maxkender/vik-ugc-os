import { describe, expect, it } from "vitest";
import { yapEmbedUrl, yapFileCheck, yapLinkProvider } from "./yapVideo.ts";

describe("vidéo yap", () => {
  it("accepte un .MOV iPhone de 120 Mo au type MIME vide", () => {
    expect(yapFileCheck("IMG_1234.MOV", "", 120 * 1024 * 1024)).toEqual({ ok: true, ext: "mov", contentType: "video/quicktime" });
  });
  it("accepte quicktime / hevc / m4v / mp4, refuse le non-vidéo et > 200 Mo", () => {
    expect(yapFileCheck("clip.hevc", "video/hevc", 1e6)).toMatchObject({ ok: true, ext: "mov" });
    expect(yapFileCheck("clip", "video/quicktime", 1e6)).toMatchObject({ ok: true, ext: "mov" });
    expect(yapFileCheck("clip.m4v", "", 1e6)).toMatchObject({ ok: true, ext: "m4v" });
    expect(yapFileCheck("clip.mp4", "video/mp4", 1e6)).toMatchObject({ ok: true, ext: "mp4" });
    expect(yapFileCheck("photo.jpg", "image/jpeg", 1e6)).toEqual({ ok: false, reason: "type" });
    expect(yapFileCheck("big.mov", "", 201 * 1024 * 1024)).toEqual({ ok: false, reason: "size" });
  });
  it("lien de secours : hébergeurs acceptés et lecture intégrée", () => {
    expect(yapLinkProvider("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    expect(yapEmbedUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(yapEmbedUrl("https://youtube.com/shorts/abcDEF12345")).toBe("https://www.youtube.com/embed/abcDEF12345");
    expect(yapEmbedUrl("https://www.instagram.com/reel/C1abcDEF/")).toBe("https://www.instagram.com/reel/C1abcDEF/embed");
    expect(yapEmbedUrl("https://www.tiktok.com/@a/video/7300000000000000000")).toBe("https://www.tiktok.com/player/v1/7300000000000000000");
    expect(yapEmbedUrl("https://drive.google.com/file/d/1AbC_dEf/view?usp=sharing")).toBe("https://drive.google.com/file/d/1AbC_dEf/preview");
    expect(yapLinkProvider("https://www.dropbox.com/s/x/v.mov")).toBe("dropbox");
    expect(yapLinkProvider("https://we.tl/t-abc")).toBe("wetransfer");
    expect(yapLinkProvider("https://www.icloud.com/iclouddrive/0abc")).toBe("icloud");
    expect(yapEmbedUrl("https://www.icloud.com/iclouddrive/0abc")).toBeNull();
    expect(yapLinkProvider("http://youtube.com/watch?v=x")).toBeNull();
    expect(yapLinkProvider("https://evil.example.com/v.mp4")).toBeNull();
  });
});
