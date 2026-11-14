// creatives — fonds IA des créas de recrutement. Le texte est posé ensuite par template
// (rendu canvas dans l'admin, toujours lisible et juste dans chaque langue) : l'IA ne fait que le fond.
//   background { creative_id, prompt? }   admin : lance la génération (ElevenLabs /v1/flows/image)
//   poll { creative_id }                  admin : récupère l'image une fois prête et la range dans Storage
// Fournisseur : réglage creatives.provider = "elevenlabs" | "none" (fond dégradé côté admin).
import { caller, getSetting, HttpError, requireAdmin, serve } from "../_shared/http.ts";

const ASPECT: Record<string, string> = { "1:1": "1:1", "4:5": "4:5", "9:16": "9:16" };

function defaultPrompt(country: string, format: string) {
  return `Candid ${format === "9:16" ? "vertical" : "square"} photo of a smiling university student (around 20 years old) in ${country}, filming a short video with a smartphone at a desk with notebooks and a laptop, soft natural window light, authentic social-media look, shallow depth of field. Leave calm empty space in the upper third for a headline. No text, no letters, no logos.`;
}

serve(async (req, body, db) => {
  requireAdmin(await caller(req, db), false);
  const cfg = await getSetting(db, "creatives");
  const { data: cr } = await db.from("recruitment_creatives").select("*, countries(name)").eq("id", body.creative_id).single();
  if (!cr) throw new HttpError(404, "creative not found");
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (body.action === "background") {
    if ((cfg.provider ?? "elevenlabs") !== "elevenlabs") throw new HttpError(409, "provider_none");
    if (!key) throw new HttpError(500, "ELEVENLABS_API_KEY missing");
    const res = await fetch("https://api.elevenlabs.io/v1/flows/image", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: cfg.model ?? "gemini-3.1-flash-image", prompt: body.prompt ?? defaultPrompt(cr.countries?.name ?? cr.country, cr.format), aspect_ratio: ASPECT[cr.format] ?? "1:1", resolution: "1K" }),
    });
    const data = await res.json();
    if (!res.ok) throw new HttpError(res.status === 402 ? 402 : 502, `ElevenLabs: ${data?.detail?.message ?? res.status}`);
    await db.from("recruitment_creatives").update({ background_provider: `elevenlabs:${data.id}` }).eq("id", cr.id);
    return { ok: true, generation_id: data.id, status: data.status };
  }
  if (body.action === "poll") {
    const gen = String(cr.background_provider ?? "").replace(/^elevenlabs:/, "");
    if (!gen) throw new HttpError(409, "no generation");
    const res = await fetch(`https://api.elevenlabs.io/v1/flows/image/${gen}`, { headers: { "xi-api-key": key ?? "" } });
    const data = await res.json();
    if (data.status !== "completed") return { ok: true, status: data.status };
    const img = await fetch(data.content_url);
    const type = data.content_mime_type ?? "image/png";
    const path = `backgrounds/${cr.id}.${type.includes("jpeg") ? "jpg" : "png"}`;
    await db.storage.from("creatives").upload(path, await img.arrayBuffer(), { contentType: type, upsert: true });
    await db.from("recruitment_creatives").update({ background_path: path }).eq("id", cr.id);
    return { ok: true, status: "completed", background_path: path };
  }
  throw new HttpError(400, "unknown action");
});
