/**
 * Handles TikTok / Instagram proposés au créateur (on ne crée jamais de compte :
 * interdit par les CGU de TikTok et d'Instagram). Pur, testé.
 *
 * Modèles (apps.handle_patterns) : {app} {first} {last} {last1} (minuscules) et
 * {App} {First} (capitalisés, pour le nom affiché). Contraintes communes aux deux
 * plateformes : [a-z0-9._], 2–24 caractères, pas de point au début/à la fin, pas de « .. ».
 */
export interface HandleContext {
  app: string;
  first: string;
  last?: string | null;
}

export function asciiFold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ß/g, "ss").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/ł/g, "l");
}

const slug = (s: string | null | undefined) => asciiFold(String(s ?? "")).toLowerCase().replace(/[^a-z0-9]/g, "");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function cleanHandle(h: string): string | null {
  let x = asciiFold(h).toLowerCase().replace(/[^a-z0-9._]/g, "").replace(/\.{2,}/g, ".").replace(/_{3,}/g, "__");
  x = x.replace(/^[._]+/, "").replace(/[.]+$/, "");
  if (x.length > 24) x = x.slice(0, 24).replace(/[.]+$/, "");
  return x.length >= 2 ? x : null;
}

export function fillHandlePattern(pattern: string, c: HandleContext): string {
  const first = slug(c.first), last = slug(c.last), app = slug(c.app);
  return pattern
    .replace(/\{app\}/g, app).replace(/\{App\}/g, cap(app))
    .replace(/\{first\}/g, first).replace(/\{First\}/g, cap(first))
    .replace(/\{last\}/g, last).replace(/\{last1\}/g, last.slice(0, 1));
}

/** Candidats dédoublonnés : d'abord les modèles, puis des variantes numérotées. */
export function generateHandles(patterns: string[], c: HandleContext, max = 10, seed = 0): string[] {
  const base: string[] = [];
  for (const p of patterns) {
    const h = cleanHandle(fillHandlePattern(p, c));
    if (h && !base.includes(h)) base.push(h);
  }
  const out = [...base];
  let n = 0;
  const nums = [7, 24, 99, 3, 11, 42, 8, 21];
  while (out.length < max && base.length > 0 && n < 40) {
    const b = base[n % base.length];
    const num = nums[(n + seed) % nums.length] + Math.floor(n / nums.length) * 100;
    const h = cleanHandle(`${b}${num}`);
    if (h && !out.includes(h)) out.push(h);
    n++;
  }
  return out.slice(0, max);
}

/** Texte de bio dans la langue du créateur (sinon anglais), {app}/{App}/{first} remplacés. */
export function bioFor(templates: Record<string, string> | null | undefined, lang: string | null | undefined, c: HandleContext): string {
  const t = templates ?? {};
  const l = (lang ?? "en").split("-")[0];
  const raw = t[l] ?? t.en ?? Object.values(t)[0] ?? "";
  return raw.replace(/\{App\}/g, c.app).replace(/\{app\}/g, c.app).replace(/\{First\}/g, cap(c.first)).replace(/\{first\}/g, c.first);
}

export function displayNameFor(pattern: string | null | undefined, c: HandleContext): string {
  return (pattern || "{First} | {App}")
    .replace(/\{First\}/g, cap(c.first.trim())).replace(/\{first\}/g, c.first.trim())
    .replace(/\{App\}/g, c.app).replace(/\{app\}/g, c.app.toLowerCase())
    .replace(/\{last1\}/g, (c.last ?? "").trim().slice(0, 1).toUpperCase()).replace(/\{last\}/g, (c.last ?? "").trim());
}

/** La bio contient-elle le nom de l'app (sans casse ni accents) ? */
export function bioMentionsApp(bio: string | null | undefined, app: string): boolean {
  if (!bio) return false;
  return slug(bio).includes(slug(app));
}

export type Availability = "available" | "taken" | "unknown";

/** Ordre de préférence : disponible sur les deux > inconnu sur l'un > rien de pris. */
export function pickSuggestions(checks: Array<{ handle: string; tiktok: Availability; instagram: Availability }>, n = 3) {
  const rank = (x: { tiktok: Availability; instagram: Availability }) =>
    x.tiktok === "taken" || x.instagram === "taken" ? 99 : (x.tiktok === "unknown" ? 1 : 0) + (x.instagram === "unknown" ? 1 : 0);
  return checks.map((c, i) => ({ c, i })).filter(({ c }) => rank(c) < 99)
    .sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).slice(0, n).map(({ c }) => c);
}

/** Lecture du HTML d'un profil TikTok : existe ? bio (signature) ? */
export function parseTikTokProfileHtml(html: string, handle: string): { exists: boolean | null; bio: string | null } {
  const h = handle.toLowerCase();
  const re = new RegExp(`"uniqueId":"${h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`, "i");
  if (re.test(html)) {
    const m = html.match(/"signature":"((?:[^"\\]|\\.)*)"/);
    let bio: string | null = null;
    if (m) { try { bio = JSON.parse(`"${m[1]}"`); } catch { bio = m[1]; } }
    return { exists: true, bio };
  }
  if (/"statusCode":\s*10221|"statusCode":\s*10202|couldn't find this account|Couldn&#x27;t find this account/i.test(html)) return { exists: false, bio: null };
  // Page de profil chargée mais sans l'utilisateur : probablement libre ; page bloquée (captcha, vide) : inconnu.
  if (/"webapp.user-detail"/.test(html)) return { exists: false, bio: null };
  return { exists: null, bio: null };
}
