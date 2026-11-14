// contract — page publique de signature (lien /sign/<token>).
//   get  { token }                                   le contrat à relire (texte, empreinte, statut)
//   sign { token, typed_name, accepted, doc_hash }   signe : horodatage, IP, user-agent, hash ; PDF archivé ;
//                                                    compte posteur créé (Supabase Auth) ; emails « contrat signé » + « tes accès »
//   pdf  { token }                                   lien de téléchargement (URL signée 1 h) du PDF signé
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { appUrl, audit, HttpError, serve } from "../_shared/http.ts";
import { queueEmail } from "../_shared/outbox.ts";
import { canSign } from "../_shared/logic/contract.ts";

async function load(db: SupabaseClient, token: string) {
  if (!/^[0-9a-f]{48}$/.test(token)) throw new HttpError(404, "not_found");
  const { data } = await db.from("contracts").select("*, applications(id, first_name, last_name, email, locale, country, birthdate, status, poster_id)").eq("token", token).maybeSingle();
  if (!data) throw new HttpError(404, "not_found");
  return data;
}

/** Helvetica (WinAnsi) : on remplace les caractères non pris en charge. */
const ascii = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "?");

async function buildPdf(text: string, sig: { name: string; at: string; ip: string; ua: string; hash: string }): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595, H = 842, M = 56, size = 10, lh = 14;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const newPage = () => { page = pdf.addPage([W, H]); y = H - M; };
  const write = (line: string, f = font, s = size) => {
    if (y < M) newPage();
    page.drawText(ascii(line), { x: M, y, size: s, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= s === size ? lh : s + 6;
  };
  const wrap = (para: string, f = font, s = size) => {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (f.widthOfTextAtSize(ascii(test), s) > W - 2 * M) { write(line, f, s); line = w; } else line = test;
    }
    if (line) write(line, f, s);
  };
  for (const raw of text.split("\n")) {
    const l = raw.replace(/\*\*/g, "").replace(/^\*(.*)\*$/, "$1");
    if (/^# /.test(l)) wrap(l.slice(2), bold, 16);
    else if (/^## /.test(l)) { y -= 4; wrap(l.slice(3), bold, 12); }
    else if (/^---+$/.test(l)) y -= 6;
    else if (!l.trim()) y -= 6;
    else wrap(l.replace(/^- /, "• "));
  }
  y -= 12;
  wrap("Electronic signature", bold, 12);
  for (const l of [`Signed by: ${sig.name}`, `Date (UTC): ${sig.at}`, `IP address: ${sig.ip}`, `User agent: ${sig.ua}`, `Document SHA-256: ${sig.hash}`]) wrap(l);
  return await pdf.save();
}

async function createPoster(db: SupabaseClient, a: any) {
  if (a.poster_id) return a.poster_id as string;
  let uid: string | null = null;
  const { data: created, error } = await db.auth.admin.createUser({
    email: a.email, email_confirm: true,
    user_metadata: { full_name: `${a.first_name} ${a.last_name}` },
    app_metadata: { role: "poster" },
  });
  if (created?.user) uid = created.user.id;
  else {
    const { data: p } = await db.from("profiles").select("id").ilike("email", a.email).maybeSingle();
    if (!p) throw new Error(`auth: ${error?.message ?? "cannot create user"}`);
    uid = p.id;
  }
  const { data: country } = await db.from("countries").select("zone_code, language").eq("code", a.country).single();
  await db.from("profiles").update({ full_name: `${a.first_name} ${a.last_name}`, locale: a.locale ?? "en" }).eq("id", uid);
  await db.from("posters").upsert({
    id: uid, application_id: a.id, display_name: `${a.first_name} ${a.last_name.charAt(0)}.`, country: a.country,
    language: country?.language ?? a.locale, zone_code: country?.zone_code ?? null, status: "active",
    started_at: new Date().toISOString().slice(0, 10),
  }, { onConflict: "id" });
  // Dans le pool par défaut.
  const { data: pool } = await db.from("pools").select("id").eq("name", "Tous les posteurs actifs").maybeSingle();
  if (pool) await db.from("pool_members").upsert({ pool_id: pool.id, poster_id: uid }, { onConflict: "pool_id,poster_id" });
  return uid!;
}

serve(async (req, body, db) => {
  const token = String(body.token ?? "");
  switch (body.action) {
    case "get": {
      const k = await load(db, token);
      const a: any = k.applications;
      const expired = k.status === "sent" && new Date(k.expires_at) < new Date();
      return {
        ok: true, status: expired ? "expired" : k.status, body: k.body_rendered, doc_hash: k.doc_hash,
        expires_at: k.expires_at, signed_at: k.signed_at, first_name: a.first_name, last_name: a.last_name, locale: a.locale,
      };
    }
    case "sign": {
      const k = await load(db, token);
      const a: any = k.applications;
      const check = canSign(k, { typed_name: String(body.typed_name ?? ""), accepted: body.accepted === true, doc_hash: String(body.doc_hash ?? "") }, a);
      if (!check.ok) throw new HttpError(422, check.error!);
      const at = new Date().toISOString();
      const ip = (req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? "unknown").split(",")[0].trim();
      const ua = (req.headers.get("user-agent") ?? "unknown").slice(0, 400);
      const name = String(body.typed_name).trim().slice(0, 200);
      // Verrou : on ne signe qu'un contrat encore « sent ».
      const { data: locked } = await db.from("contracts").update({ status: "signed", signed_at: at, signed_name: name, signed_ip: ip, signed_user_agent: ua })
        .eq("id", k.id).eq("status", "sent").select("id").maybeSingle();
      if (!locked) throw new HttpError(409, "already_signed");
      const pdf = await buildPdf(k.body_rendered, { name, at, ip, ua, hash: k.doc_hash });
      const path = `${a.id}/${k.id}.pdf`;
      await db.storage.from("contracts").upload(path, pdf, { contentType: "application/pdf", upsert: true });
      await db.from("contracts").update({ pdf_path: path }).eq("id", k.id);
      const posterId = await createPoster(db, a);
      await db.from("applications").update({ status: "signed", poster_id: posterId }).eq("id", a.id);
      await queueEmail(db, { template: "contract_signed", to: a.email, language: a.locale, vars: { first_name: a.first_name }, buttonUrl: appUrl(`/sign/${token}`), relatedType: "contract", relatedId: k.id });
      await queueEmail(db, { template: "access", to: a.email, language: a.locale, vars: { first_name: a.first_name }, buttonUrl: appUrl(`/login?email=${encodeURIComponent(a.email)}`), relatedType: "poster", relatedId: posterId });
      await audit(db, null, "contract.signed", "contract", k.id, { ip, hash: k.doc_hash });
      return { ok: true, signed_at: at };
    }
    case "pdf": {
      const k = await load(db, token);
      if (k.status !== "signed" || !k.pdf_path) throw new HttpError(404, "not_signed");
      const { data } = await db.storage.from("contracts").createSignedUrl(k.pdf_path, 3600, { download: true });
      return { ok: true, url: data?.signedUrl };
    }
    default:
      throw new HttpError(400, "unknown action");
  }
});
