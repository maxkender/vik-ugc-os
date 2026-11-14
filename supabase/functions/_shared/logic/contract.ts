/**
 * Contrats : rendu d'un modèle Markdown avec {{variables}}, empreinte SHA-256
 * du texte exact présenté au signataire, et vérification de signature.
 */
export function renderContract(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (all, key) => {
    const v = vars[key];
    return v === null || v === undefined ? all : String(v);
  });
}

export function missingVariables(rendered: string): string[] {
  return [...new Set([...rendered.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]))];
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Le nom tapé doit correspondre au nom du candidat (casse, accents et espaces ignorés). */
export function signatureNameMatches(typed: string, firstName: string, lastName: string): boolean {
  const n = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  const t = n(typed);
  return t.length > 0 && (t === n(`${firstName}${lastName}`) || t === n(`${lastName}${firstName}`));
}

export interface SignatureCheck {
  ok: boolean;
  error?: "expired" | "already_signed" | "not_accepted" | "name_mismatch" | "hash_mismatch";
}

export function canSign(
  c: { status: string; expires_at: string; doc_hash: string },
  input: { typed_name: string; accepted: boolean; doc_hash: string },
  candidate: { first_name: string; last_name: string },
  now = new Date(),
): SignatureCheck {
  if (c.status === "signed") return { ok: false, error: "already_signed" };
  if (c.status !== "sent" || new Date(c.expires_at).getTime() < now.getTime()) return { ok: false, error: "expired" };
  if (!input.accepted) return { ok: false, error: "not_accepted" };
  if (input.doc_hash !== c.doc_hash) return { ok: false, error: "hash_mismatch" };
  if (!signatureNameMatches(input.typed_name, candidate.first_name, candidate.last_name)) return { ok: false, error: "name_mismatch" };
  return { ok: true };
}
