import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ImagePlus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { supabase, callFn, publicUrl } from "@/lib/supabase";
import { useCountries, useZones } from "@/lib/hooks";
import { formatMoney } from "@shared/zones.ts";
import { CREATIVE_LANGS, HOOKS, RTL_LANGS, type Hook } from "@shared/creativeCopy.ts";
import { copyViolations, jobCopy } from "@shared/jobCopy.ts";
import { cardCopy } from "@shared/cardCopy.ts";
import { notesCopy } from "@shared/notesCopy.ts";
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
/**
 * Rendu d'une créa (canvas, dans le navigateur). Avec photo : visuel UGC plein cadre + dégradés de lisibilité,
 * logo Vik Studios, bloc texte ancré en bas. En 9:16, tout le texte reste dans les safe zones des stories / reels
 * (rien dans les 14 % du haut ni les 20 % du bas). Sans photo : fond dégradé de marque.
 */
/**
 * Style « carte offre d'emploi » (pub Serbie de Max) : fond jaune Vik, carte blanche arrondie, avatar « V »,
 * « Vik Studios · emploi », titre, 2 lignes, « postule ici 👇 », pied « Emploi · Pays ». Aucun montant.
 * En 9:16, la carte reste entre 14 % et 80 % de la hauteur (safe zones).
 */
async function renderCard(cr: any): Promise<Blob> {
  const [W, H] = FORMATS[cr.format] ?? [1080, 1080];
  const tall = H / W > 1.5;
  const card = cr.card ?? {};
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await document.fonts.ready;
  await Promise.all(["700 80px Inter", "500 40px Inter", "600 40px Inter"].map((f) => document.fonts.load(f).catch(() => null)));
  ctx.fillStyle = "#FFBB43";
  ctx.fillRect(0, 0, W, H);
  const rtl = RTL_LANGS.has(String(cr.language ?? "").split("-")[0]);
  const cw = W * (tall ? 0.88 : 0.84);
  const cx = (W - cw) / 2;
  const pad = cw * (tall ? 0.065 : 0.075);
  const inner = cw - 2 * pad;
  // 9:16 : tailles plus grandes pour remplir la zone utile (stories / reels lus en plein écran).
  const avatar = W * (tall ? 0.11 : 0.075);
  const metaS = Math.round(W * (tall ? 0.038 : 0.03));
  let lineS = Math.round(W * (tall ? 0.047 : 0.032));
  const ctaS = Math.round(W * (tall ? 0.054 : 0.036)), footS = Math.round(W * (tall ? 0.034 : 0.026));
  const maxCardH = tall ? H * 0.66 : H * 0.84;
  const measure = (titleS: number) => {
    ctx.font = `700 ${titleS}px Inter`;
    const tl = wrap(ctx, card.title ?? cr.headline ?? "", inner);
    ctx.font = `500 ${lineS}px Inter`;
    const ll = (card.lines ?? []).map((l: string) => wrap(ctx, l, inner));
    const h = pad + avatar + pad * 0.7 + tl.length * titleS * 1.15 + pad * 0.5
      + ll.reduce((n: number, x: string[]) => n + x.length * lineS * 1.35 + lineS * 0.6, 0)
      + ctaS * 1.6 + pad * 0.6 + footS * 2.4 + pad * 0.3;
    return { tl, ll, h };
  };
  // 9:16 : le titre reste au moins aussi grand qu'en 1:1 ; on réduit d'abord les lignes, puis le titre.
  let titleS = Math.round(W * (tall ? 0.085 : 0.062));
  let M = measure(titleS);
  const minLine = Math.round(W * (tall ? 0.038 : 0.032)), minTitle = Math.round(W * (tall ? 0.066 : 0.03));
  while (M.h > maxCardH && lineS > minLine) { lineS -= 1; M = measure(titleS); }
  while (M.h > maxCardH && titleS > minTitle) { titleS -= 2; M = measure(titleS); }
  while (M.h > maxCardH && titleS > 30) { titleS -= 2; lineS = Math.max(20, lineS - 1); M = measure(titleS); }
  const ch = M.h;
  const cy = tall ? H * 0.14 + (H * 0.66 - ch) / 2 : (H - ch) / 2;
  // carte
  ctx.shadowColor = "rgba(0,17,62,0.18)";
  ctx.shadowBlur = W * 0.04;
  ctx.shadowOffsetY = W * 0.01;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(cx, cy, cw, ch, W * 0.045);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.direction = rtl ? "rtl" : "ltr";
  const left = rtl ? cx + cw - pad : cx + pad;
  ctx.textAlign = rtl ? "right" : "left";
  // en-tête : avatar « V » + Vik Studios · emploi
  let y = cy + pad;
  const ax = rtl ? cx + cw - pad - avatar : cx + pad;
  ctx.fillStyle = "#00113E";
  ctx.beginPath();
  ctx.arc(ax + avatar / 2, y + avatar / 2, avatar / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FFBB43";
  ctx.font = `700 ${Math.round(avatar * 0.5)}px Inter`;
  ctx.textAlign = "center";
  ctx.fillText("V", ax + avatar / 2, y + avatar * 0.68);
  ctx.textAlign = rtl ? "right" : "left";
  const tx = rtl ? ax - avatar * 0.3 : ax + avatar * 1.3;
  ctx.fillStyle = "#0b1530";
  ctx.font = `700 ${metaS}px Inter`;
  ctx.fillText("Vik Studios", tx, y + avatar * 0.45);
  ctx.fillStyle = "#6b7280";
  ctx.font = `500 ${metaS}px Inter`;
  ctx.fillText(card.label ?? "", tx, y + avatar * 0.45 + metaS * 1.3);
  y += avatar + pad * 0.7;
  // titre
  ctx.fillStyle = "#0b1530";
  ctx.font = `700 ${titleS}px Inter`;
  for (const l of M.tl) { y += titleS; ctx.fillText(l, left, y); y += titleS * 0.15; }
  y += pad * 0.5;
  // lignes
  ctx.fillStyle = "#374151";
  ctx.font = `500 ${lineS}px Inter`;
  for (const para of M.ll) { for (const l of para) { y += lineS; ctx.fillText(l, left, y); y += lineS * 0.35; } y += lineS * 0.6; }
  // appel
  ctx.fillStyle = "#0b1530";
  ctx.font = `700 ${ctaS}px Inter`;
  y += ctaS * 1.1;
  ctx.fillText(card.cta ?? cr.cta ?? "", left, y);
  y += ctaS * 0.5 + pad * 0.6;
  // pied
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx + pad, y);
  ctx.lineTo(cx + cw - pad, y);
  ctx.stroke();
  ctx.fillStyle = "#6b7280";
  ctx.font = `600 ${footS}px Inter`;
  ctx.fillText(card.footer ?? "", left, y + footS * 1.7);
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/png"));
}

/** Coupe aussi les langues sans espaces (japonais, thaï…) : un « mot » trop long est coupé caractère par caractère. */
function wrapAny(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const l of wrap(ctx, text, maxW)) {
    if (ctx.measureText(l).width <= maxW) { out.push(l); continue; }
    let cur = "";
    for (const ch of Array.from(l)) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
    if (cur) out.push(cur);
  }
  return out;
}

/**
 * Style « Notes iPhone » (16/11) : fond blanc, « < Notes » et « ⋯ » orange iOS (#E8A400), date grise centrée,
 * titre gras, sous-titre, 4 lignes avec flèches orange, appel final. Grandes polices, peu de vide.
 * En 9:16, le texte reste entre 14 % et 80 % de la hauteur (safe zones).
 */
async function renderNotes(cr: any): Promise<Blob> {
  const [W, H] = FORMATS[cr.format] ?? [1080, 1080];
  const tall = H / W > 1.5;
  const n = cr.card ?? {};
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await document.fonts.ready;
  await Promise.all(["700 80px Inter", "500 40px Inter", "600 40px Inter"].map((f) => document.fonts.load(f).catch(() => null)));
  const ORANGE = "#E8A400";
  const rtl = RTL_LANGS.has(String(cr.language ?? "").split("-")[0]);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  ctx.direction = rtl ? "rtl" : "ltr";
  const padX = W * 0.07;
  const inner = W - 2 * padX;
  const top = tall ? H * 0.14 : H * 0.05;
  const bottom = tall ? H * 0.8 : H * 0.96;
  const headS = Math.round(W * (tall ? 0.056 : 0.05));
  const dateS = Math.round(W * (tall ? 0.034 : 0.03));
  const fit = (titleS: number) => {
    const subS = Math.round(titleS * 0.66), lineS = Math.round(titleS * 0.66), ctaS = Math.round(titleS * 0.68);
    ctx.font = `700 ${titleS}px Inter`;
    const tl = wrapAny(ctx, n.title ?? "", inner);
    ctx.font = `500 ${subS}px Inter`;
    const sl = wrapAny(ctx, n.subtitle ?? "", inner);
    ctx.font = `500 ${lineS}px Inter`;
    const arrowW = lineS * 1.5;
    const ll = (n.lines ?? []).map((l: string) => wrapAny(ctx, l, inner - arrowW));
    ctx.font = `700 ${ctaS}px Inter`;
    const cl = wrapAny(ctx, n.cta ?? "", inner);
    const h = headS * 1.6 + dateS * 2.6 + tl.length * titleS * 1.18 + titleS * 0.35 + sl.length * subS * 1.3 + subS * 0.9
      + ll.reduce((a: number, x: string[]) => a + x.length * lineS * 1.3 + lineS * 0.55, 0) + ctaS * 0.6 + cl.length * ctaS * 1.3;
    return { subS, lineS, ctaS, arrowW, tl, sl, ll, cl, h };
  };
  // On part grand et on réduit jusqu'à remplir la zone utile : grandes polices, peu de vide.
  let titleS = Math.round(W * (tall ? 0.15 : 0.1));
  let F = fit(titleS);
  while (F.h > (bottom - top) * 0.97 && titleS > 30) { titleS -= 2; F = fit(titleS); }
  // Centre verticalement le bloc dans la zone utile (peu de vide au-dessus et en dessous).
  let y = top + Math.max(0, (bottom - top - F.h) / 2) * (tall ? 1 : 0.5);
  const xL = rtl ? W - padX : padX;
  const xR = rtl ? padX : W - padX;
  // En-tête : « < Notes » … « ⋯ »
  ctx.fillStyle = ORANGE;
  ctx.textAlign = rtl ? "right" : "left";
  ctx.font = `600 ${headS}px Inter`;
  const chevron = rtl ? "›" : "‹";
  ctx.font = `400 ${Math.round(headS * 1.5)}px Inter`;
  ctx.fillText(chevron, xL, y + headS * 1.05);
  const chevW = ctx.measureText(chevron).width + headS * 0.35;
  ctx.font = `500 ${headS}px Inter`;
  ctx.fillText(n.app ?? "Notes", rtl ? xL - chevW : xL + chevW, y + headS);
  // « ⋯ » dans un cercle fin
  const r = headS * 0.75;
  const cxDots = rtl ? xR + r : xR - r;
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = Math.max(3, W * 0.0035);
  ctx.beginPath();
  ctx.arc(cxDots, y + headS * 0.62, r, 0, Math.PI * 2);
  ctx.stroke();
  for (const dx of [-r * 0.42, 0, r * 0.42]) { ctx.beginPath(); ctx.arc(cxDots + dx, y + headS * 0.62, r * 0.11, 0, Math.PI * 2); ctx.fill(); }
  y += headS * 1.6;
  // Date grise centrée
  ctx.fillStyle = "#8e8e93";
  ctx.font = `500 ${dateS}px Inter`;
  ctx.textAlign = "center";
  y += dateS * 1.5;
  ctx.fillText(n.date ?? "", W / 2, y);
  y += dateS * 1.1;
  ctx.textAlign = rtl ? "right" : "left";
  // Titre
  ctx.fillStyle = "#000000";
  ctx.font = `700 ${titleS}px Inter`;
  for (const l of F.tl) { y += titleS; ctx.fillText(l, xL, y); y += titleS * 0.18; }
  y += titleS * 0.35;
  // Sous-titre
  ctx.fillStyle = "#1c1c1e";
  ctx.font = `500 ${F.subS}px Inter`;
  for (const l of F.sl) { y += F.subS; ctx.fillText(l, xL, y); y += F.subS * 0.3; }
  y += F.subS * 0.9;
  // Lignes avec flèches orange
  for (const para of F.ll) {
    ctx.font = `700 ${F.lineS}px Inter`;
    ctx.fillStyle = ORANGE;
    ctx.fillText(rtl ? "←" : "→", xL, y + F.lineS);
    ctx.font = `500 ${F.lineS}px Inter`;
    ctx.fillStyle = "#000000";
    for (const l of para) { y += F.lineS; ctx.fillText(l, rtl ? xL - F.arrowW : xL + F.arrowW, y); y += F.lineS * 0.3; }
    y += F.lineS * 0.55;
  }
  // Appel
  y += F.ctaS * 0.6;
  ctx.fillStyle = "#000000";
  ctx.font = `700 ${F.ctaS}px Inter`;
  for (const l of F.cl) { y += F.ctaS; ctx.fillText(l, xL, y); y += F.ctaS * 0.3; }
  return await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/png"));
}

export async function renderCreative(cr: any): Promise<Blob> {
  if (cr.style === "card") return renderCard(cr);
  if (cr.style === "notes") return renderNotes(cr);
  const [W, H] = FORMATS[cr.format] ?? [1080, 1080];
  const tall = H / W > 1.5;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  await document.fonts.ready;
  await Promise.all(["700 80px Inter", "500 40px Inter", "600 40px Inter"].map((f) => document.fonts.load(f).catch(() => null)));
  const accent = cssVar("--accent", "#5b4ce0");
  let photo = false;
  if (cr.background_path) {
    try {
      const img = await loadImage(publicUrl("creatives", cr.background_path)!);
      const sc = Math.max(W / img.width, H / img.height);
      ctx.drawImage(img, (W - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc);
      photo = true;
    } catch { /* repli dégradé */ }
  }
  if (photo) {
    // Lisibilité : bandeau sombre en haut (logo) et dégradé fort sous le texte.
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.3);
    top.addColorStop(0, "rgba(0,10,40,0.55)");
    top.addColorStop(1, "rgba(0,10,40,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, W, H * 0.3);
    const bottom = ctx.createLinearGradient(0, H * (tall ? 0.38 : 0.3), 0, H);
    bottom.addColorStop(0, "rgba(0,10,40,0)");
    bottom.addColorStop(0.35, "rgba(0,10,40,0.62)");
    bottom.addColorStop(1, "rgba(0,10,40,0.9)");
    ctx.fillStyle = bottom;
    ctx.fillRect(0, H * (tall ? 0.38 : 0.3), W, H);
  } else {
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
  const pad = W * 0.07, maxW = W - 2 * pad;
  const rtl = RTL_LANGS.has(String(cr.language ?? "").split("-")[0]);
  // Logo (blanc) en haut à gauche, dans la safe zone.
  const logoY = tall ? H * 0.145 : pad * 0.9;
  try {
    const logo = await loadImage("/brand/vik-studios-logo-white.svg");
    const lw = W * (tall ? 0.34 : 0.3), lh = (logo.height / logo.width) * lw;
    ctx.drawImage(logo, rtl ? W - pad - lw : pad, logoY, lw, lh);
  } catch {
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 ${Math.round(W * 0.04)}px Inter`;
    ctx.fillText("Vik Studios", pad, logoY + W * 0.04);
  }

  // Bloc texte ancré en bas : titre, bonus, estimation mensuelle (ou sous-titre), CTA, mention.
  const bottomLimit = tall ? H * 0.8 : H - pad * 0.7;
  const topLimit = tall ? H * 0.4 : H * 0.3;
  const ctaS = Math.round(W * (tall ? 0.05 : 0.042));
  const noteS = Math.round(W * (tall ? 0.024 : 0.022));
  const bonusS = Math.round(W * (tall ? 0.046 : 0.04));
  const monthS = Math.round(W * (tall ? 0.04 : 0.035));
  const second = cr.monthly_line ?? null;
  const tagS = Math.round(W * (tall ? 0.036 : 0.032));
  const tag: string | null = cr.monthly_line ? null : cr.subline ?? null; // étiquette (« Ideal para estudiantes »)
  ctx.textAlign = rtl ? "right" : "left";
  ctx.direction = rtl ? "rtl" : "ltr";
  const tx = rtl ? W - pad : pad;
  const lay = (size: number) => {
    ctx.font = `700 ${size}px Inter`;
    const hl = wrap(ctx, cr.headline, maxW);
    ctx.font = `700 ${bonusS}px Inter`;
    const bl = cr.bonus_line ? wrap(ctx, cr.bonus_line, maxW - bonusS * 1.2) : [];
    ctx.font = `600 ${monthS}px Inter`;
    const ml = second ? wrap(ctx, second, maxW) : [];
    ctx.font = `500 ${noteS}px Inter`;
    const nl = cr.disclaimer ? wrap(ctx, cr.disclaimer, maxW) : [];
    const h = (tag ? tagS * 2.1 + tagS * 0.8 : 0) + hl.length * size * 1.1 + (bl.length ? bl.length * bonusS * 1.25 + bonusS * 0.7 + size * 0.35 : 0)
      + (ml.length ? ml.length * monthS * 1.3 + monthS * 0.5 : 0) + ctaS * 2.1 + ctaS * 0.9 + (nl.length ? nl.length * noteS * 1.35 + noteS * 0.6 : 0);
    return { hl, bl, ml, nl, h };
  };
  let size = Math.round(W * (tall ? 0.1 : 0.085));
  let L = lay(size);
  // Réduit aussi quand une ligne déborde (mot long : « UGC-Content-Creator:in »).
  const overflow = (sz: number, lines: string[]) => { ctx.font = `700 ${sz}px Inter`; return lines.some((l) => ctx.measureText(l).width > maxW); };
  while (size > 40 && (L.h > bottomLimit - topLimit || overflow(size, L.hl))) { size -= 4; L = lay(size); }
  let y = bottomLimit - L.h;
  if (tag) {
    ctx.font = `700 ${tagS}px Inter`;
    const tw0 = ctx.measureText(tag).width, th = tagS * 2.1, tw = tw0 + tagS * 1.6, tx0 = rtl ? W - pad - tw : pad;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.roundRect(tx0, y, tw, th, th / 2);
    ctx.fill();
    ctx.fillStyle = "#0040d6";
    ctx.textAlign = "center";
    ctx.fillText(tag, tx0 + tw / 2, y + th / 2 + tagS * 0.36);
    ctx.textAlign = rtl ? "right" : "left";
    y += th + tagS * 0.8;
  }
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 16;
  ctx.font = `700 ${size}px Inter`;
  for (const l of L.hl) { y += size; ctx.fillText(l, tx, y); y += size * 0.1; }
  ctx.shadowBlur = 0;
  if (L.bl.length) {
    y += size * 0.35;
    ctx.font = `700 ${bonusS}px Inter`;
    const bw = Math.min(maxW, Math.max(...L.bl.map((l) => ctx.measureText(l).width)) + bonusS * 1.2);
    const bh = L.bl.length * bonusS * 1.25 + bonusS * 0.7;
    const bx = rtl ? W - pad - bw : pad;
    ctx.fillStyle = "#ffd84d";
    ctx.beginPath();
    ctx.roundRect(bx, y, bw, bh, bonusS * 0.35);
    ctx.fill();
    ctx.fillStyle = "#00113E";
    let ly = y + bonusS * 0.35 + bonusS * 0.95;
    for (const l of L.bl) { ctx.fillText(l, rtl ? bx + bw - bonusS * 0.6 : bx + bonusS * 0.6, ly); ly += bonusS * 1.25; }
    y += bh;
  }
  if (L.ml.length) {
    y += monthS * 0.5;
    ctx.fillStyle = "#ffffff";
    ctx.shadowBlur = 12;
    ctx.font = `600 ${monthS}px Inter`;
    for (const l of L.ml) { y += monthS; ctx.fillText(l, tx, y); y += monthS * 0.3; }
    ctx.shadowBlur = 0;
  }
  // CTA
  y += ctaS * 0.9;
  ctx.font = `700 ${ctaS}px Inter`;
  const tw = ctx.measureText(cr.cta ?? "").width;
  const bh = ctaS * 2.1, bw = tw + ctaS * 2.2, bx = rtl ? W - pad - bw : pad;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(bx, y, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "#00113E";
  ctx.textAlign = "center";
  ctx.fillText(cr.cta ?? "", bx + bw / 2, y + bh / 2 + ctaS * 0.36);
  ctx.textAlign = rtl ? "right" : "left";
  y += bh;
  if (L.nl.length) {
    y += noteS * 0.6;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `500 ${noteS}px Inter`;
    for (const l of L.nl) { y += noteS; ctx.fillText(l, tx, y); y += noteS * 0.35; }
  }
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
  const [style, setStyle] = useState<"card" | "notes" | "photo" | "text">("card");
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
  const langOf = (code: string) => String(country(code)?.language ?? "en").split("-")[0];
  const selectZone = (zone: string) => setSel([...new Set([...sel, ...openCountries.filter((c: any) => c.zone_code === zone).map((c: any) => c.code)])]);
  const langsSelected = [...new Set(sel.map(langOf))];
  const total = sel.length * formats.length;
  const sample = sel[0] ? jobCopy(langOf(sel[0]), hook, priceFor(sel[0]), sel[0]) : jobCopy("fr", hook, "10 $");
  const sampleIssues = copyViolations([sample.headline, sample.tag, sample.pay, sample.cta].filter(Boolean).join(" · "), sample.lang);

  const generate = async () => {
    if (!sel.length || !formats.length) return toast("Choisis des pays et des formats", "danger");
    if (total > 60 && !window.confirm(`Générer ${total} créas ? (rendu dans ton navigateur, ~1 s chacune)`)) return;
    setBusy("gen");
    setProgress({ done: 0, total });
    let n = 0;
    try {
      for (const code of sel) {
        const lang = langOf(code);
        // Format offre d'emploi (règle Meta du 16/11) : titre de poste, rémunération, étiquette ; ni revenus ni montants mensuels.
        const copy = jobCopy(lang, hook, priceFor(code), code);
        for (const format of formats) {
          const card = cardCopy(lang, hook, code);
          const notes = notesCopy(lang);
          const row: Record<string, unknown> = style === "notes"
            ? { country: code, language: notes.lang, format, style, hook, status: "draft", headline: notes.title, subline: notes.subtitle, cta: notes.cta, bonus_line: null,
                monthly_line: null, disclaimer: null, card: { app: notes.app, date: notes.date, title: notes.title, subtitle: notes.subtitle, lines: notes.lines, cta: notes.cta }, ad_text: card.primary }
            : style === "card"
            ? { country: code, language: card.lang, format, style, hook, status: "draft", headline: copy.headline, subline: null, cta: copy.cta, bonus_line: null,
                monthly_line: null, disclaimer: null, card: { label: card.label, title: card.title, lines: card.lines, cta: card.cta, footer: card.footer }, ad_text: card.primary }
            : { country: code, language: copy.lang, format, style, hook, status: "draft", headline: copy.headline, subline: copy.tag, cta: copy.cta, bonus_line: copy.pay,
                monthly_line: null, disclaimer: null, ad_text: card.primary };
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
  /** Rend (ou re-rend) tous les brouillons affichés : utile après un changement de tarif ou de texte. */
  const bulkRender = async () => {
    const rows = (list.data ?? []).filter((c: any) => c.status === "draft");
    if (!rows.length) return toast("Aucun brouillon dans cette sélection");
    setBusy("render");
    setProgress({ done: 0, total: rows.length });
    let n = 0;
    try {
      for (const cr of rows) { await renderAndUpload(cr); n++; setProgress({ done: n, total: rows.length }); }
      toast(`${n} créas rendues`, "success");
    } catch (e) { toast(`${n} rendues, puis erreur : ${(e as Error).message}`, "danger"); } finally { setBusy(null); setProgress(null); refresh(); }
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
      const first = await callFn<any>("creatives", { action: "background", creative_id: cr.id });
      if (first.status === "completed") { // fal : synchrone
        await renderAndUpload({ ...cr, background_path: first.background_path });
        toast("Visuel IA appliqué", "success");
        refresh();
        return;
      }
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
            <Field label="Style">
              <div className="flex flex-wrap gap-2">
                {([["card", "Carte offre d'emploi"], ["notes", "Notes iPhone"], ["photo", "Photo UGC (visuel IA ensuite)"], ["text", "Texte simple"]] as const).map(([v, l]) => (
                  <Chip key={v} active={style === v} onClick={() => setStyle(v)}>{l}</Chip>
                ))}
              </div>
            </Field>
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
              {sample.tag && <span className="mt-1.5 inline-block rounded-full border border-[#cddcff] bg-white px-2 py-0.5 text-[11px] font-semibold text-[#0040d6]">{sample.tag}</span>}
              <p className="mt-1.5 text-[15px] font-semibold text-foreground">{sample.headline}</p>
              <span className="mt-1.5 inline-block rounded-md bg-[#ffd84d] px-2 py-0.5 text-xs font-bold text-[#00113E]">{sample.pay}</span>
              <span className="mt-2 inline-block rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">{sample.cta}</span>
            </div>
            {sampleIssues.length > 0 && <p className="rounded-lg bg-tint-red px-3 py-2 text-xs text-[#c42a2d]">⚠ Formulation interdite détectée ({sampleIssues.join(", ")}) : à corriger avant d'envoyer à Meta.</p>}
            <p className="text-xs text-subtle-foreground"><b>Règles Meta (offre d'emploi)</b> : titre de poste + rémunération (« Pago: X por video + bono por vistas »). Interdit : « gagner de l'argent », « argent facile », « depuis chez soi », « revenus », montants mensuels, « jusqu'à », 💸, questions sur un attribut personnel (« Étudiant ? »). Le détail reste sur la landing.</p>
            <p className="text-xs text-subtle-foreground">Textes par langue dans <code>_shared/logic/jobCopy.ts</code> : traductions du build, à faire relire par un natif avant gros budget.</p>
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
        <Button size="sm" variant="secondary" className="ml-auto" loading={busy === "render"} onClick={bulkRender}><RefreshCw className="h-3.5 w-3.5" /> Rendre les brouillons affichés</Button>
        <Button size="sm" variant="secondary" onClick={bulkApprove}><Check className="h-3.5 w-3.5" /> Valider les brouillons affichés</Button>
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
                  {copyViolations([cr.headline, cr.subline, cr.bonus_line, cr.monthly_line, cr.disclaimer, cr.cta, cr.ad_text, cr.card?.title, ...(cr.card?.lines ?? [])].filter(Boolean).join(" · "), cr.language ?? "en").length > 0 && <Badge tone="danger">⚠ texte non conforme</Badge>}
                </div>
                <div className="flex flex-wrap gap-0.5 border-t border-separator pt-2">
                  <Button size="icon" variant="ghost" title="Valider" onClick={() => setStatus(cr, "approved")}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Refuser" onClick={() => setStatus(cr, "rejected")}><X className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" title="Visuel IA réaliste (fal)" loading={busy === cr.id} onClick={() => aiBackground(cr)}>{busy !== cr.id && <Sparkles className="h-4 w-4" />}</Button>
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
