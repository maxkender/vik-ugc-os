/** Variables {cle} dans un texte ; une variable inconnue reste telle quelle. */
export function fillTemplate(text: string, vars: Record<string, string | number | null | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (all, key) => {
    const v = vars[key];
    return v === null || v === undefined || v === "" ? all : String(v);
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export interface EmailContent {
  subject: string;
  body: string;                                  // paragraphes séparés par une ligne vide
  button?: { label: string; url: string } | null;
  brand?: string;
  /** URL absolue d'un logo PNG (les clients mail ne lisent pas le SVG). Sinon, le nom de marque en texte. */
  logoUrl?: string | null;
  footer?: string | null;
  /** Langue du destinataire : formule de fin traduite (repli anglais). */
  language?: string | null;
}

const SIGN_OFF: Record<string, (b: string) => string> = {
  en: (b) => `The ${b} team`, fr: (b) => `L'équipe ${b}`, es: (b) => `El equipo de ${b}`, de: (b) => `Dein ${b}-Team`, it: (b) => `Il team di ${b}`,
  pt: (b) => `Equipe ${b}`, nl: (b) => `Het ${b}-team`, pl: (b) => `Zespół ${b}`, ro: (b) => `Echipa ${b}`,
};
export const signOff = (brand: string, lang?: string | null) => (SIGN_OFF[(lang ?? "en").split("-")[0]] ?? SIGN_OFF.en)(brand);
/** **gras** → <strong> (après échappement HTML). */
const bold = (html: string) => html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

/** Email sobre, compatible clients mail (tables), même rendu que sophia-os. */
export function renderEmail(e: EmailContent): { html: string; text: string } {
  const paras = e.body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const brand = e.brand ?? "Vik Studios";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(e.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#00113E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;padding:28px 24px">
<tr><td style="padding-bottom:20px">${e.logoUrl ? `<img src="${escapeHtml(e.logoUrl)}" alt="${escapeHtml(brand)}" height="30" style="display:block;height:30px;width:auto;border:0">` : `<span style="font-size:20px;font-weight:700;color:#00113E">${escapeHtml(brand)}</span>`}</td></tr>
${paras.map((p) => `<tr><td style="font-size:15px;line-height:1.55;padding-bottom:12px">${bold(escapeHtml(p)).replace(/\n/g, "<br>")}</td></tr>`).join("\n")}
${e.button ? `<tr><td style="padding:8px 0 20px"><a href="${escapeHtml(e.button.url)}" style="display:inline-block;background:#004DFF;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:8px">${escapeHtml(e.button.label)}</a></td></tr>` : ""}
<tr><td style="font-size:15px;line-height:1.4">${escapeHtml(signOff(brand, e.language))}</td></tr>
${e.footer ? `<tr><td style="font-size:12px;line-height:1.5;color:#a1a1aa;padding-top:24px;border-top:1px solid #e4e4e7">${escapeHtml(e.footer)}</td></tr>` : ""}
</table></td></tr></table></body></html>`;
  const text = [...paras.map((p) => p.replace(/\*\*(.+?)\*\*/g, "$1")), ...(e.button ? [`${e.button.label}: ${e.button.url}`] : []), signOff(brand, e.language), ...(e.footer ? [e.footer] : [])].join("\n\n");
  return { html, text };
}
