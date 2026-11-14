import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { supabase, callFn, publicUrl } from "@/lib/supabase";
import { useCountries, useZones } from "@/lib/hooks";
import { formatMoney } from "@shared/zones.ts";
import { Badge, Button, Card, Empty, Field, Input, PageHeader, Select, Spinner, useToast } from "@/components/ui";
import { flag } from "@/lib/utils";

const FORMATS: Record<string, [number, number]> = { "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920] };
type Lang = "en" | "es" | "fr";
const DEFAULTS: Record<Lang, { headline: string; subline: string; cta: string }> = {
  en: { headline: "Student? Get paid {{price}} per video", subline: "Post 2 short videos a day. Bonus on your views. Paid weekly.", cta: "Apply now" },
  es: { headline: "¿Estudiante? Gana {{price}} por vídeo", subline: "Publica 2 vídeos cortos al día. Bonus por visualizaciones. Pago semanal.", cta: "Postúlate" },
  fr: { headline: "Étudiant ? Gagne {{price}} par vidéo", subline: "Publie 2 vidéos courtes par jour. Bonus sur tes vues. Payé chaque semaine.", cta: "Je postule" },
};
const uiLang = (l: string | null | undefined): Lang => {
  const x = (l ?? "en").split("-")[0];
  return x === "es" || x === "fr" ? x : "en";
};

function cssVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

/** Rendu du template : fond (image IA ou dégradé), titre auto-ajusté, sous-titre, bouton CTA, signature. */
export async function renderCreative(cr: any): Promise<Blob> {
  const [W, H] = FORMATS[cr.format] ?? [1080, 1080];
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await document.fonts.ready;
  await Promise.all(["700 80px Inter", "500 40px Inter", "600 40px Inter"].map((f) => document.fonts.load(f).catch(() => null)));
  const accent = cssVar("--accent", "#5b4ce0");
  let drewBg = false;
  if (cr.background_path) {
    try {
      const img = await loadImage(publicUrl("creatives", cr.background_path)!);
      const s = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "rgba(0,0,0,0.55)");
      g.addColorStop(0.45, "rgba(0,0,0,0.1)");
      g.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      drewBg = true;
    } catch { /* fallback dégradé */ }
  }
  if (!drewBg) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, accent);
    g.addColorStop(1, "#111018");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    for (const [x, y, r] of [[W * 0.85, H * 0.15, W * 0.3], [W * 0.1, H * 0.9, W * 0.4], [W * 0.7, H * 0.75, W * 0.12]]) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  const pad = W * 0.08, maxW = W - 2 * pad;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 18;
  // titre : taille auto pour tenir dans 40 % de la hauteur
  let size = Math.round(W * 0.105);
  let lines: string[] = [];
  for (; size > 36; size -= 4) {
    ctx.font = `700 ${size}px Inter`;
    lines = wrap(ctx, cr.headline, maxW);
    if (lines.length * size * 1.12 <= H * 0.4) break;
  }
  let y = H * 0.12 + size;
  for (const l of lines) { ctx.fillText(l, pad, y); y += size * 1.12; }
  if (cr.subline) {
    const s = Math.round(size * 0.42);
    ctx.font = `500 ${s}px Inter`;
    y += s * 0.4;
    for (const l of wrap(ctx, cr.subline, maxW)) { ctx.fillText(l, pad, y); y += s * 1.3; }
  }
  ctx.shadowBlur = 0;
  // CTA
  if (cr.cta) {
    const s = Math.round(W * 0.045);
    ctx.font = `600 ${s}px Inter`;
    const tw = ctx.measureText(cr.cta).width;
    const bh = s * 2.1, bw = tw + s * 2.2, bx = pad, by = H - pad - bh - s * 1.5;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = "#111018";
    ctx.fillText(cr.cta, bx + s * 1.1, by + bh / 2 + s * 0.36);
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 ${Math.round(W * 0.028)}px Inter`;
  ctx.fillText("Vik Studios", pad, H - pad * 0.6);
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/png"));
}

async function renderAndUpload(cr: any) {
  const blob = await renderCreative(cr);
  const path = `rendered/${cr.id}.png`;
  const { error } = await supabase.storage.from("creatives").upload(path, blob, { contentType: "image/png", upsert: true });
  if (error) throw error;
  await supabase.from("recruitment_creatives").update({ image_path: path }).eq("id", cr.id);
}

export default function Creatives() {
  const qc = useQueryClient();
  const toast = useToast();
  const countries = useCountries();
  const zones = useZones();
  const [sel, setSel] = useState<string[]>([]);
  const [formats, setFormats] = useState<string[]>(["1:1", "4:5", "9:16"]);
  const [texts, setTexts] = useState(DEFAULTS);
  const [busy, setBusy] = useState<string | null>(null);
  const [fCountry, setFCountry] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [stamp, setStamp] = useState(Date.now());

  const list = useQuery({
    queryKey: ["creatives", fCountry, fStatus],
    queryFn: async () => {
      let q = supabase.from("recruitment_creatives").select("*").order("created_at", { ascending: false }).limit(300);
      if (fCountry) q = q.eq("country", fCountry);
      if (fStatus) q = q.eq("status", fStatus);
      return (await q).data ?? [];
    },
  });
  const refresh = () => { setStamp(Date.now()); qc.invalidateQueries({ queryKey: ["creatives"] }); };
  const openCountries = useMemo(() => (countries.data ?? []).filter((c: any) => c.open), [countries.data]);

  const priceFor = (code: string) => {
    const c = (countries.data ?? []).find((x: any) => x.code === code);
    const z = (zones.data ?? []).find((x: any) => x.code === c?.zone_code);
    return z ? formatMoney(Number(z.price_per_video), z.currency, uiLang(c?.language)) : "";
  };

  const generate = async () => {
    if (!sel.length || !formats.length) return toast("Choisis des pays et des formats", "danger");
    setBusy("gen");
    try {
      let n = 0;
      for (const code of sel) {
        const c = (countries.data ?? []).find((x: any) => x.code === code);
        const lang = uiLang(c?.language);
        const tx = texts[lang];
        const price = priceFor(code);
        for (const format of formats) {
          const row = { country: code, language: lang, format, headline: tx.headline.replace("{{price}}", price), subline: tx.subline.replace("{{price}}", price), cta: tx.cta, status: "draft" };
          const { data, error } = await supabase.from("recruitment_creatives").insert(row).select("*").single();
          if (error) throw error;
          await renderAndUpload(data);
          n++;
        }
      }
      toast(`${n} créas générées`, "success");
      refresh();
    } catch (e) {
      toast((e as Error).message, "danger");
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (cr: any, status: string) => {
    await supabase.from("recruitment_creatives").update({ status }).eq("id", cr.id);
    refresh();
  };
  const remove = async (cr: any) => {
    if (!window.confirm("Supprimer cette créa ?")) return;
    if (cr.image_path) await supabase.storage.from("creatives").remove([cr.image_path]);
    await supabase.from("recruitment_creatives").delete().eq("id", cr.id);
    refresh();
  };
  const rerender = async (cr: any) => {
    setBusy(cr.id);
    try { await renderAndUpload(cr); refresh(); } catch (e) { toast((e as Error).message, "danger"); } finally { setBusy(null); }
  };
  const aiBackground = async (cr: any) => {
    setBusy(cr.id);
    try {
      await callFn("creatives", { action: "background", creative_id: cr.id });
      for (let i = 0; i < 45; i++) {
        await new Promise((r) => setTimeout(r, 4000));
        const r = await callFn<any>("creatives", { action: "poll", creative_id: cr.id });
        if (r.status === "completed") {
          await renderAndUpload({ ...cr, background_path: r.background_path });
          toast("Fond IA appliqué", "success");
          refresh();
          return;
        }
        if (r.status === "failed") throw new Error("Génération échouée");
      }
      throw new Error("Délai dépassé");
    } catch (e) {
      const m = (e as Error).message;
      toast(/Pro plan|402|paid_plan/i.test(m) ? "Plan ElevenLabs Pro requis — fond dégradé utilisé" : m, "danger");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Créas de recrutement" description="Visuels statiques localisés par pays. Le texte est posé par template : toujours lisible et juste dans chaque langue." />
      <Card className="mb-8 space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={`Pays (${sel.length})`}>
            <div className="grid max-h-52 grid-cols-2 gap-1 overflow-y-auto rounded-md border p-2 text-sm">
              {openCountries.map((c: any) => (
                <label key={c.code} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-muted">
                  <input type="checkbox" checked={sel.includes(c.code)} onChange={(e) => setSel(e.target.checked ? [...sel, c.code] : sel.filter((x) => x !== c.code))} />
                  {flag(c.code)} {c.name} <span className="text-xs text-muted-foreground">{priceFor(c.code)}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="space-y-4">
            <Field label="Formats">
              <div className="flex gap-4 text-sm">
                {Object.entries(FORMATS).map(([f, [w, h]]) => (
                  <label key={f} className="flex items-center gap-2">
                    <input type="checkbox" checked={formats.includes(f)} onChange={(e) => setFormats(e.target.checked ? [...formats, f] : formats.filter((x) => x !== f))} />
                    {f} <span className="text-xs text-muted-foreground">{w}×{h}</span>
                  </label>
                ))}
              </div>
            </Field>
            <p className="text-xs text-muted-foreground">{"{{price}}"} est remplacé par le tarif de la zone du pays. Langue : espagnol / français selon le pays, sinon anglais.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.keys(DEFAULTS) as Lang[]).map((l) => (
            <div key={l} className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{l}</p>
              <Input value={texts[l].headline} onChange={(e) => setTexts({ ...texts, [l]: { ...texts[l], headline: e.target.value } })} />
              <Input value={texts[l].subline} onChange={(e) => setTexts({ ...texts, [l]: { ...texts[l], subline: e.target.value } })} />
              <Input value={texts[l].cta} onChange={(e) => setTexts({ ...texts, [l]: { ...texts[l], cta: e.target.value } })} />
            </div>
          ))}
        </div>
        <div className="flex justify-end"><Button loading={busy === "gen"} onClick={generate}><ImagePlus className="h-4 w-4" /> Générer {sel.length * formats.length || ""} créas</Button></div>
      </Card>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select className="w-48" value={fCountry} onChange={(e) => setFCountry(e.target.value)}>
          <option value="">Tous les pays</option>
          {openCountries.map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
        </Select>
        <Select className="w-44" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {["draft", "approved", "rejected", "sent_to_meta"].map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
      </div>
      {list.isLoading ? <Spinner /> : (list.data ?? []).length === 0 ? <Empty title="Aucune créa">Choisis des pays et génère.</Empty> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {(list.data ?? []).map((cr: any) => (
            <Card key={cr.id} className="overflow-hidden p-0">
              <div className="flex aspect-[4/5] items-center justify-center bg-muted">
                {cr.image_path ? <img src={`${publicUrl("creatives", cr.image_path)}?t=${stamp}`} className="max-h-full max-w-full object-contain" /> : <Spinner />}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span>{flag(cr.country)} {cr.country} · {cr.format} · {cr.language}</span>
                  <Badge tone={cr.status === "approved" ? "success" : cr.status === "rejected" ? "danger" : cr.status === "sent_to_meta" ? "accent" : "default"}>{cr.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Button size="icon" variant="ghost" title="Valider" onClick={() => setStatus(cr, "approved")}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Refuser" onClick={() => setStatus(cr, "rejected")}><X className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Fond IA (ElevenLabs)" loading={busy === cr.id} onClick={() => aiBackground(cr)}>{busy !== cr.id && <Sparkles className="h-4 w-4" />}</Button>
                  <Button size="icon" variant="ghost" title="Re-rendre" onClick={() => rerender(cr)}><RefreshCw className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Supprimer" onClick={() => remove(cr)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
