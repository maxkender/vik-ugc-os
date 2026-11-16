// creatives — fonds IA des créas de recrutement. Le texte est posé ensuite par template
// (rendu canvas dans l'admin, toujours lisible et juste dans chaque langue) : l'IA ne fait que le fond.
//   background { creative_id, prompt? }   admin : lance la génération (ElevenLabs /v1/flows/image)
//   poll { creative_id }                  admin : récupère l'image une fois prête et la range dans Storage
// Fournisseur : réglage creatives.provider = "fal" (Flux, synchrone, défaut) | "elevenlabs" | "none" (fond dégradé côté admin).
// Visuels réalistes façon UGC, sans logo de marque tierce ni personne réelle identifiable (prompt + vérification fal).
import { caller, getSetting, HttpError, requireAdmin, serve } from "../_shared/http.ts";

const ASPECT: Record<string, string> = { "1:1": "1:1", "4:5": "4:5", "9:16": "9:16" };

function defaultPrompt(country: string, format: string) {
  return `Candid ${format === "9:16" ? "vertical" : "square"} photo of a smiling university student (around 20 years old) in ${country}, filming a short video with a smartphone at a desk with notebooks and a laptop, soft natural window light, authentic social-media look, shallow depth of field. Leave calm empty space in the upper third for a headline. No text, no letters, no logos.`;
}

/** Scène par accroche : un·e étudiant·e (personne fictive) avec son téléphone, cadre de vie du pays. */
function ugcPrompt(countryName: string, hook: string | null, format: string) {
  const scene = hook === "earn"
    ? "filming herself with a smartphone on a small tripod with a ring light, talking to the camera, in a cozy bedroom"
    : hook === "nofollow"
      ? "holding a smartphone at arm's length to record a selfie video, casual and confident, at home on a sofa"
      : "studying at a desk with notebooks, highlighters and a laptop, holding a smartphone to film a short study video";
  return `Candid ${format === "9:16" ? "vertical" : "square"} smartphone photo, authentic UGC social-media look: a friendly university student (around 20, fictional person) who lives in ${countryName}, with a look typical of the local population, in an everyday setting typical of ${countryName}, ${scene}. Warm natural light, realistic skin texture, slightly imperfect framing, shallow depth of field. ${format === "9:16" ? "Subject in the middle third of the frame." : "Subject on the right half of the frame."} No text, no letters, no watermark, no brand logos, no famous people.`;
}
const FAL_SIZE: Record<string, { width: number; height: number }> = { "1:1": { width: 1088, height: 1088 }, "4:5": { width: 1088, height: 1360 }, "9:16": { width: 1080, height: 1920 } };

serve(async (req, body, db) => {
  requireAdmin(await caller(req, db), false);
  const cfg = await getSetting(db, "creatives");
  const { data: cr } = await db.from("recruitment_creatives").select("*, countries(name)").eq("id", body.creative_id).single();
  if (!cr) throw new HttpError(404, "creative not found");
  const key = Deno.env.get("ELEVENLABS_API_KEY");
  if (body.action === "background" && (cfg.provider ?? "fal") === "fal") {
    const falKey = Deno.env.get("FAL_KEY");
    if (!falKey) throw new HttpError(500, "FAL_KEY missing");
    const model = cfg.fal_model ?? "fal-ai/flux/dev";
    const size = FAL_SIZE[cr.format] ?? FAL_SIZE["1:1"];
    const res = await fetch(`https://fal.run/${model}`, {
      method: "POST",
      headers: { authorization: `Key ${falKey}`, "content-type": "application/json" },
      body: JSON.stringify({ prompt: body.prompt ?? ugcPrompt(cr.countries?.name ?? cr.country, cr.hook ?? null, cr.format), image_size: size, num_images: 1, enable_safety_checker: true }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    if (!res.ok) throw new HttpError(502, `fal: ${String(data?.detail?.[0]?.msg ?? data?.detail ?? res.status).slice(0, 200)}`);
    if (data.has_nsfw_concepts?.[0]) throw new HttpError(422, "image refusée par le filtre de sécurité, relancer");
    const img = await fetch(data.images[0].url);
    const type = img.headers.get("content-type") ?? "image/jpeg";
    const path = `backgrounds/${cr.id}-${Date.now()}.${type.includes("png") ? "png" : "jpg"}`;
    await db.storage.from("creatives").upload(path, await img.arrayBuffer(), { contentType: type, upsert: true });
    await db.from("recruitment_creatives").update({ background_path: path, background_provider: `fal:${model}:${data.seed}` }).eq("id", cr.id);
    // Coût : Flux dev ≈ 0,025 $ par mégapixel.
    await db.from("ai_usage").insert({ kind: "image", model, items: 1, cost_usd: Math.round(((size.width * size.height) / 1e6) * 0.025 * 10000) / 10000 });
    return { ok: true, status: "completed", background_path: path };
  }
  if (body.action === "background") {
    if ((cfg.provider ?? "fal") !== "elevenlabs") throw new HttpError(409, "provider_none");
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
