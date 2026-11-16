import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { supabase, callFn, publicUrl } from "@/lib/supabase";
import { useCountries, useZones } from "@/lib/hooks";
import { formatMoney } from "@shared/zones.ts";
import { creativeCopy, CREATIVE_LANGS, HOOKS, RTL_LANGS, type Hook } from "@shared/creativeCopy.ts";
import { Badge, Button, Card, Empty, Field, PageHeader, Select, Spinner, useToast, Chip, Section } from "@/components/ui";
import { flag } from "@/lib/utils";

const FORMATS: Record<string, [number, number]> = { "1:1": [1080, 1080], "4:5": [1080, 1350], "9:16": [1080, 1920] };
const LANG_NAMES = new Intl.DisplayNames(["fr"], { type: "language" });
const langName = (l: string) => { try { return LANG_NAMES.of(l) ?? l; } catch { return l; } };

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
    g.addColorStop(1, "#00113E");
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
  const rtl = RTL_LANGS.has(String(cr.language ?? "").split("-")[0]);
  ctx.direction = rtl ? "rtl" : "ltr";
  ctx.textAlign = rtl ? "right" : "left";
  const tx = rtl ? W - pad : pad;
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 18;
  // titre : taille auto pour tenir dans 40 % de la hauteur (plus grand en 9:16 : lisible en story)
  const tall = H / W > 1.5;
  let size = Math.round(W * (tall ? 0.13 : 0.105));
  let lines: string[] = [];
  for (; size > 36; size -= 4) {
    ctx.font = `700 ${size}px Inter`;
    lines = wrap(ctx, cr.headline, maxW);
    if (lines.length * size * 1.12 <= H * 0.4) break;
  }
  let y = H * (tall ? 0.2 : 0.12) + size;
  for (const l of lines) { ctx.fillText(l, tx, y); y += size * 1.12; }
  // Bonus aux vues : pastille jaune très visible sous le titre.
  if (cr.bonus_line) {
    ctx.shadowBlur = 0;
    const bs = Math.round(W * (tall ? 0.05 : 0.043));
    ctx.font = `700 ${bs}px Inter`;
    const bl = wrap(ctx, cr.bonus_line, maxW - bs * 1.2);
    const bw = Math.min(maxW, Math.max(...bl.map((l) => ctx.measureText(l).width)) + bs * 1.2);
    const bh = bl.length * bs * 1.25 + bs * 0.7;
    const bx = rtl ? W - pad - bw : pad, by = y - size * 0.55;
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bs * 0.35);
    ctx.fill();
    ctx.fillStyle = "#00113E";
    let ly = by + bs * 0.35 + bs;
    for (const l of bl) { ctx.fillText(l, rtl ? bx + bw - bs * 0.6 : bx + bs * 0.6, ly); ly += bs * 1.25; }
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 18;
    y = by + bh + size * 0.7;
  }
  if (cr.subline) {
    const s = Math.round(size * (tall ? 0.4 : 0.42));
    ctx.font = `500 ${s}px Inter`;
    y += s * 0.4;
    for (const l of wrap(ctx, cr.subline, maxW)) { ctx.fillText(l, tx, y); y += s * 1.3; }
  }
  ctx.shadowBlur = 0;
  // CTA
  if (cr.cta) {
    const s = Math.round(W * (tall ? 0.055 : 0.045));
    ctx.font = `600 ${s}px Inter`;
    const tw = ctx.measureText(cr.cta).width;
    const bh = s * 2.1, bw = tw + s * 2.2, bx = rtl ? W - pad - bw : pad, by = H - pad - bh - s * 1.5;
    ctx.textAlign = "left";
    ctx.direction = "ltr";
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = "#00113E";
    ctx.direction = rtl ? "rtl" : "ltr";
    ctx.textAlign = "center";
    ctx.fillText(cr.cta, bx + bw / 2, by + bh / 2 + s * 0.36);
    ctx.textAlign = "left";
    ctx.direction = "ltr";
  }
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = `600 ${Math.round(W * 0.028)}px Inter`;
  ctx.textAlign = "left";
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
  const [hook, setHook] = useState<Hook>("student");
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [f, setF] = useState({ country: "", language: "", format: "", status: "" });
  const [stamp, setStamp] = useState(Date.now());

  const list = useQuery({
    queryKey: ["creatives", f],
    queryFn: async () => {
      let q = supabase.from("recruitment_creatives").select("*").order("created_at", { ascending: false }).limit(500);
      if (f.country) q = q.eq("country", f.country);
      if (f.language) q = q.eq("language", f.language);
      if (f.format) q = q.eq("format", f.format);
      if (f.status) q = q.eq("status", f.status);
      return (await q).data ?? [];
    },
  });
  const refresh = () => { setStamp(Date.now()); qc.invalidateQueries({ queryKey: ["creatives"] }); };
  const openCountries = useMemo(() => (countries.data ?? []).filter((c: any) => c.open), [countries.data]);
  const country = (code: string) => (countries.data ?? []).find((x: any) => x.code === code);
  const priceFor = (code: string) => {
    const c = country(code);
    const z = (zones.data ?? []).find((x: any) => x.code === c?.zone_code);
    return z ? formatMoney(Number(z.price_per_video), z.currency, c?.language ?? "en") : "";
  };
  /** Bonus aux vues de la zone (RPM pour 1 000 vues à J+7). */
  const bonusFor = (code: string) => {
    const c = country(code);
    const z = (zones.data ?? []).find((x: any) => x.code === c?.zone_code);
    return z && Number(z.rpm) > 0 ? formatMoney(Number(z.rpm), z.currency, c?.language ?? "en") : null;
  };
  const langOf = (code: string) => String(country(code)?.language ?? "en").split("-")[0];
  const selectZone = (zone: string) => setSel([...new Set([...sel, ...openCountries.filter((c: any) => c.zone_code === zone).map((c: any) => c.code)])]);
  const langsSelected = [...new Set(sel.map(langOf))];
  const total = sel.length * formats.length;
  const sample = sel[0] ? creativeCopy(langOf(sel[0]), hook, priceFor(sel[0]), { bonus: bonusFor(sel[0]), country: sel[0] }) : creativeCopy("fr", hook, "5 $", { bonus: "1 $" });

  const generate = async () => {
    if (!sel.length || !formats.length) return toast("Choisis des pays et des formats", "danger");
    if (total > 60 && !window.confirm(`Générer ${total} créas ? (rendu dans ton navigateur, ~1 s chacune)`)) return;
    setBusy("gen");
    setProgress({ done: 0, total });
    let n = 0;
    try {
      for (const code of sel) {
        const lang = langOf(code);
        const copy = creativeCopy(lang, hook, priceFor(code), { bonus: bonusFor(code), country: code });
        for (const format of formats) {
          const row = { country: code, language: copy.lang, format, headline: copy.headline, subline: copy.subline, cta: copy.cta, bonus_line: copy.bonus, status: "draft" };
          const { data, error } = await supabase.from("recruitment_creatives").insert(row).select("*").single();
          if (error) throw error;
          await renderAndUpload(data);
          n++;
          setProgress({ done: n, total });
        }
      }
      toast(`${n} créas générées`, "success");
    } catch (e) {
      toast(`${n} créas générées, puis erreur : ${(e as Error).message}`, "danger");
    } finally {
      setBusy(null);
      setProgress(null);
      refresh();
    }
  };

  const setStatus = async (cr: any, status: string) => {
    await supabase.from("recruitment_creatives").update({ status }).eq("id", cr.id);
    refresh();
  };
  const bulkApprove = async () => {
    const ids = (list.data ?? []).filter((c: any) => c.status === "draft" && c.image_path).map((c: any) => c.id);
    if (!ids.length) return toast("Aucun brouillon à valider dans cette sélection");
    if (!window.confirm(`Valider ${ids.length} créas (filtres actuels) ?`)) return;
    await supabase.from("recruitment_creatives").update({ status: "approved" }).in("id", ids);
    toast(`${ids.length} créas validées`, "success");
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
  const galleryLangs = [...new Set((list.data ?? []).map((c: any) => c.language).concat(f.language ? [f.language] : []))].sort();

  return (
    <div>
      <PageHeader title="Créas de recrutement" description={`Visuels statiques dans la langue de chaque pays (${CREATIVE_LANGS.length} langues). L'accroche est posée par template : toujours lisible et juste.`} />
      <Section className="mb-8" title="Générer en lot" description="1 · Choisis les pays (ou une zone) · 2 · une accroche et des formats · 3 · « Générer ». Le prix affiché est le tarif de la zone du pays."
        actions={<Button loading={busy === "gen"} onClick={generate} disabled={!total}><ImagePlus className="h-4 w-4" /> Générer {total || ""} créas</Button>}>
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <Field label={`1 · Pays (${sel.length}) · ${langsSelected.length} langue(s)`}>
            <div className="mb-3 flex flex-wrap gap-2">
              <Chip active={sel.length === openCountries.length && sel.length > 0} onClick={() => setSel(openCountries.map((c: any) => c.code))}>Tous</Chip>
              {["A", "B", "C"].map((z) => <Chip key={z} onClick={() => selectZone(z)}>+ Zone {z}</Chip>)}
              {sel.length > 0 && <Chip onClick={() => setSel([])}>Aucun</Chip>}
            </div>
            <div className="grid max-h-64 grid-cols-1 gap-0.5 overflow-y-auto rounded-xl border p-2 text-sm sm:grid-cols-2">
              {openCountries.map((c: any) => (
                <label key={c.code} className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted ${sel.includes(c.code) ? "bg-accent-soft" : ""}`}>
                  <input type="checkbox" className="accent-[#004dff]" checked={sel.includes(c.code)} onChange={(e) => setSel(e.target.checked ? [...sel, c.code] : sel.filter((x) => x !== c.code))} />
                  <span className="truncate">{flag(c.code)} {c.name}</span> <span className="ml-auto text-xs text-subtle-foreground">{c.language} · {priceFor(c.code)}</span>
                </label>
              ))}
            </div>
          </Field>
          <div className="space-y-5">
            <Field label="2 · Accroche">
              <Select value={hook} onChange={(e) => setHook(e.target.value as Hook)}>{HOOKS.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}</Select>
            </Field>
            <Field label="Formats">
              <div className="flex flex-wrap gap-2">
                {Object.entries(FORMATS).map(([fmt, [w, h]]) => (
                  <Chip key={fmt} active={formats.includes(fmt)} onClick={() => setFormats(formats.includes(fmt) ? formats.filter((x) => x !== fmt) : [...formats, fmt])}>
                    {fmt} <span className="text-[11px] opacity-70">{w}×{h}</span>
                  </Chip>
                ))}
              </div>
            </Field>
            <div className="rounded-xl border border-[#d8e3ff] bg-tint-blue p-4 text-sm">
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-subtle-foreground">Aperçu · {sel[0] ? `${flag(sel[0])} ${langName(langOf(sel[0]))}` : "fr"}</p>
              <p className="mt-1.5 text-[15px] font-semibold text-foreground">{sample.headline}</p>
              {sample.bonus && <span className="mt-1.5 inline-block rounded-md bg-[#ffd84d] px-2 py-0.5 text-xs font-bold text-[#00113E]">{sample.bonus}</span>}
              <p className="text-muted-foreground">{sample.subline}</p>
              <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">{sample.cta}</span>
            </div>
            <p className="text-xs text-subtle-foreground">Textes par langue dans <code>_shared/logic/creativeCopy.ts</code> : traductions du build, à faire relire par un natif avant gros budget.</p>
          </div>
        </div>
        {progress && (
          <div className="mt-6">
            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground"><span>Rendu et envoi…</span><span className="tabular">{progress.done} / {progress.total}</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          </div>
        )}
      </Section>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-[15px] font-semibold">Galerie</h2>
        {[["", "Tous"], ["draft", "Brouillons"], ["approved", "Validées"], ["rejected", "Refusées"], ["sent_to_meta", "Envoyées à Meta"]].map(([v, l]) => (
          <Chip key={v} active={f.status === v} onClick={() => setF({ ...f, status: v })}>{l}</Chip>
        ))}
        <Select className="h-8 py-0 w-40 rounded-full text-[13px]" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })} aria-label="Pays">
          <option value="">Tous les pays</option>
          {openCountries.map((c: any) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
        </Select>
        <Select className="h-8 py-0 w-48 rounded-full text-[13px]" value={f.language} onChange={(e) => setF({ ...f, language: e.target.value })} aria-label="Langue">
          <option value="">Toutes les langues</option>
          {(galleryLangs.length ? galleryLangs : CREATIVE_LANGS).map((l: string) => <option key={l} value={l}>{langName(l)}</option>)}
        </Select>
        <Select className="h-8 py-0 w-28 rounded-full text-[13px]" value={f.format} onChange={(e) => setF({ ...f, format: e.target.value })} aria-label="Format">
          <option value="">Formats</option>
          {Object.keys(FORMATS).map((x) => <option key={x} value={x}>{x}</option>)}
        </Select>
        <span className="text-xs text-subtle-foreground">{list.data?.length ?? 0} créa(s)</span>
        <Button size="sm" variant="secondary" className="ml-auto" onClick={bulkApprove}><Check className="h-3.5 w-3.5" /> Valider les brouillons affichés</Button>
      </div>
      {list.isLoading ? <Spinner /> : (list.data ?? []).length === 0 ? <Empty title="Aucune créa" icon={<ImagePlus className="h-5 w-5" />}>Choisis des pays (ou une zone), une accroche et des formats, puis « Générer ». Les créas validées peuvent ensuite être poussées vers Meta depuis Campagnes Meta.</Empty> : (
        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {(list.data ?? []).map((cr: any) => (
            <Card key={cr.id} className="group overflow-hidden p-0 transition-shadow hover:shadow-card">
              <div className="flex aspect-[4/5] items-center justify-center bg-[#f7f8fb] p-3">
                {cr.image_path ? <img src={`${publicUrl("creatives", cr.image_path)}?t=${stamp}`} className="max-h-full max-w-full rounded-lg object-contain shadow-xs" /> : <Spinner />}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-1 text-xs">
                  <span className="truncate text-muted-foreground">{flag(cr.country)} {cr.country} · {cr.format} · {cr.language}</span>
                  <Badge tone={cr.status === "approved" ? "success" : cr.status === "rejected" ? "danger" : cr.status === "sent_to_meta" ? "accent" : "default"}>{({ draft: "Brouillon", approved: "Validée", rejected: "Refusée", sent_to_meta: "Meta" } as Record<string, string>)[cr.status] ?? cr.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-0.5 border-t border-separator pt-2">
                  <Button size="icon" variant="ghost" title="Valider" onClick={() => setStatus(cr, "approved")}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Refuser" onClick={() => setStatus(cr, "rejected")}><X className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Fond IA (ElevenLabs, plan Pro)" loading={busy === cr.id} onClick={() => aiBackground(cr)}>{busy !== cr.id && <Sparkles className="h-4 w-4" />}</Button>
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
