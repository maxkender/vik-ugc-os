import { Fragment, useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Download, AlertTriangle, ChevronDown, Sparkles } from "lucide-react";
import { callFn } from "@/lib/supabase";
import { Button, Card, Field, Input, Spinner } from "@/components/ui";
import { uiLangForCountry } from "@/i18n";
import { LangSwitcher } from "./Landing";
import { Logo } from "@/components/brand/Logo";

interface ContractView {
  status: "sent" | "signed" | "expired" | "cancelled";
  body: string;
  doc_hash: string;
  expires_at: string;
  signed_at: string | null;
  first_name: string;
  last_name: string;
  locale: string;
  summary?: string | null;
  language?: string;
}

const FULL_LABEL: Record<string, string> = { en: "Read the full contract", fr: "Lire le contrat complet", es: "Leer el contrato completo" };

/** **gras** → <strong>, sans HTML brut. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    /^\*\*[^*]+\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part.replace(/^\*(.*)\*$/, "$1")}</Fragment>,
  );
}

/** Mini rendu Markdown sûr : titres #/##, listes -, ---, paragraphes. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push(<p key={blocks.length} className="my-3 leading-relaxed">{inline(para.join(" "))}</p>);
    if (list.length) blocks.push(<ul key={blocks.length} className="my-3 list-disc space-y-1 pl-6">{list.map((l, i) => <li key={i}>{inline(l)}</li>)}</ul>);
    para = [];
    list = [];
  };
  for (const raw of text.split("\n")) {
    const l = raw.trimEnd();
    if (/^# /.test(l)) { flush(); blocks.push(<h1 key={blocks.length} className="mb-4 text-2xl font-semibold">{inline(l.slice(2))}</h1>); }
    else if (/^## /.test(l)) { flush(); blocks.push(<h2 key={blocks.length} className="mb-2 mt-6 text-lg font-semibold">{inline(l.slice(3))}</h2>); }
    else if (/^---+$/.test(l)) { flush(); blocks.push(<hr key={blocks.length} className="my-6" />); }
    else if (/^- /.test(l)) { if (para.length) { const p = para; para = []; blocks.push(<p key={blocks.length} className="my-3">{inline(p.join(" "))}</p>); } list.push(l.slice(2)); }
    else if (!l.trim()) flush();
    else { if (list.length) flush(); para.push(l); }
  }
  flush();
  return <div className="text-sm">{blocks}</div>;
}

export default function Sign() {
  const { token = "" } = useParams();
  const { t, i18n } = useTranslation();
  const q = useQuery({ queryKey: ["contract", token], queryFn: () => callFn<ContractView>("contract", { action: "get", token }), retry: false });
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [showFull, setShowFull] = useState(false);

  useEffect(() => {
    if (q.data?.locale) i18n.changeLanguage(uiLangForCountry(q.data.locale));
  }, [q.data?.locale]);

  const sign = async () => {
    if (!q.data) return;
    setBusy(true);
    setError(null);
    try {
      const r = await callFn<{ signed_at: string }>("contract", { action: "sign", token, typed_name: name, accepted, doc_hash: q.data.doc_hash });
      setSignedAt(r.signed_at);
    } catch (e) {
      const code = (e as Error).message;
      const known = ["name_mismatch", "not_accepted", "expired", "hash_mismatch"];
      setError(known.includes(code) ? t(`sign.errors.${code}`) : code === "already_signed" ? t("sign.signed", { date: "" }) : t("common.error"));
      if (code === "already_signed") q.refetch();
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    const r = await callFn<{ url: string }>("contract", { action: "pdf", token });
    if (r.url) window.open(r.url, "_blank", "noopener");
  };

  const status = signedAt ? "signed" : q.data?.status;
  const date = (d: string | null | undefined) => (d ? new Date(d).toLocaleString(i18n.resolvedLanguage) : "");

  return (
    <div className="min-h-full bg-white">
      <header className="sticky top-0 z-30 border-b border-separator bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Logo className="h-[22px]" />
          <LangSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-8 sm:pt-12">
        {q.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : q.isError || !q.data ? (
          <Card className="p-10 text-center text-muted-foreground">{t("sign.notFound")}</Card>
        ) : status === "signed" ? (
          <Card className="space-y-5 rounded-3xl px-6 py-14 text-center">
            <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-tint-green text-success"><CheckCircle2 className="h-7 w-7" /></span>
            <p className="mx-auto max-w-md text-lg font-semibold text-foreground">{t("sign.signed", { date: date(signedAt ?? q.data.signed_at) })}</p>
            <Button variant="secondary" size="lg" onClick={download}><Download className="h-4 w-4" /> {t("sign.download")}</Button>
          </Card>
        ) : status !== "sent" ? (
          <Card className="p-10 text-center text-muted-foreground">{t("sign.expired")}</Card>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground sm:text-3xl">{t("sign.title")}</h1>
              <p className="mt-2 text-[15px] text-muted-foreground">{t("sign.read")}</p>
            </div>
            {q.data.summary ? (
              <>
                <div className="rounded-2xl border border-[#dbe5ff] bg-tint-blue p-6 sm:p-8">
                  <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-accent shadow-xs"><Sparkles className="h-4 w-4" /></span>
                  <Markdown text={q.data.summary} />
                </div>
                <Card className="overflow-hidden p-0">
                  <button type="button" onClick={() => setShowFull((v) => !v)} className="flex w-full items-center justify-between px-6 py-4 text-sm font-semibold text-foreground hover:bg-muted sm:px-8">
                    {FULL_LABEL[(i18n.resolvedLanguage ?? "en").split("-")[0]] ?? FULL_LABEL.en}
                    <ChevronDown className={`h-4 w-4 transition-transform ${showFull ? "rotate-180" : ""}`} />
                  </button>
                  {showFull && <div className="max-h-[60vh] overflow-y-auto border-t border-separator px-6 py-6 sm:px-8"><Markdown text={q.data.body.slice(q.data.summary.length).replace(/^\s*---\s*/, "")} /></div>}
                </Card>
              </>
            ) : (
              <Card className="max-h-[60vh] overflow-y-auto p-6 sm:p-8"><Markdown text={q.data.body} /></Card>
            )}
            <Card className="space-y-5 rounded-2xl">
              <div className="flex items-start gap-2.5 rounded-xl bg-tint-yellow px-4 py-3 text-sm text-[#7a4f00]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {t("sign.warn")}
              </div>
              <Field label={t("sign.typeName")} hint={t("sign.typeNameHint", { name: `${q.data.first_name} ${q.data.last_name}` })}>
                <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#004dff]" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> {t("sign.accept")}</label>
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button size="lg" className="h-12 w-full text-[15px]" onClick={sign} loading={busy} disabled={!accepted || name.trim().length < 3}>{t("sign.button")}</Button>
              <p className="break-all text-[11px] text-subtle-foreground">SHA-256 · {q.data.doc_hash}</p>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
