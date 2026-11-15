import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Wallet } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, IconTile, Spinner, useToast } from "@/components/ui";
import { formatMoney } from "@shared/zones.ts";
import { shortWeekLabel } from "@shared/dates.ts";
import { cn } from "@/lib/utils";
import { READ_ONLY_HINT, useCreatorIdentity, useMyPoster } from "./shared";

interface Line { kind: "video" | "bonus"; label: string; url: string | null; views_d7: number | null; amount: number; note?: string }
interface Payout { id: string; week_start: string; currency: string; videos_count: number; base_amount: number; bonus_amount: number; total: number; status: "pending" | "paid" | "void"; lines: Line[] }

const RUUL_CLS = {
  none: "bg-[#f1f3f7] text-muted-foreground", email_given: "bg-tint-yellow text-[#8a5a00]", added: "bg-tint-blue text-[#0040d6]",
  done: "bg-tint-green text-[#0b7a3c]", stopped: "bg-tint-red text-[#c42a2d]",
} as const;
/** Étape Ruul déjà franchie (0 à 4). */
const RUUL_PROGRESS = { none: 0, email_given: 1, added: 2, done: 4, stopped: 0 } as const;

export default function Payments() {
  const { t, i18n } = useTranslation();
  const me = useCreatorIdentity();
  const qc = useQueryClient();
  const toast = useToast();
  const poster = useMyPoster();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"save" | "done" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const lang = i18n.resolvedLanguage ?? "en";

  useEffect(() => { if (poster.data?.ruul_email) setEmail(poster.data.ruul_email); }, [poster.data?.ruul_email]);

  const payouts = useQuery({
    queryKey: ["my-payouts", me.id],
    enabled: !!me.id,
    queryFn: async () => ((await supabase.from("payouts").select("*").eq("poster_id", me.id!).neq("status", "void").order("week_start", { ascending: false })).data ?? []) as Payout[],
  });

  const update = async (kind: "save" | "done") => {
    if (me.readOnly) return;
    setBusy(kind);
    const { error } = await supabase.rpc("poster_update_self", kind === "save" ? { p_ruul_email: email.trim() } : { p_ruul_done: true });
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast(kind === "save" ? t("common.save") + " ✓" : t("creator.ruulStatus.done"), "success");
    qc.invalidateQueries({ queryKey: ["my-poster"] });
  };

  if (poster.isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  const status = poster.data?.ruul_status ?? "none";
  const steps = t("creator.ruulSteps", { returnObjects: true }) as unknown as string[];
  const progress = RUUL_PROGRESS[status];
  const list = payouts.data ?? [];
  const paidTotal = list.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.total), 0);
  const cur = list[0]?.currency ?? poster.data?.zones?.currency ?? "USD";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{t("creator.paymentsTitle")}</h1>

      <section className="rounded-2xl border bg-white p-5 shadow-xs sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <IconTile icon={<Wallet />} tint="violet" className="h-10 w-10 rounded-xl" />
            <h2 className="text-[15px] font-semibold text-foreground">{t("creator.ruulTitle")}</h2>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", RUUL_CLS[status])}>{t(`creator.ruulStatus.${status}`)}</span>
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => {
            const done = i < progress;
            return (
              <li key={i} className="flex gap-3">
                <span className={cn("tabular mt-px inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  done ? "bg-tint-green text-success" : i === progress ? "bg-accent text-white" : "bg-[#f1f3f7] text-subtle-foreground")}>
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className={cn("text-sm leading-relaxed", done ? "text-subtle-foreground" : "text-foreground")}>{s}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-5 rounded-xl border border-border-strong bg-muted p-3">
          <label className="mb-2 block px-1 text-xs font-medium text-muted-foreground">{t("creator.ruulEmail")}</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={status === "done"}
              className="h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-[15px] focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10 disabled:opacity-60" />
            <Button size="lg" variant="secondary" className="h-12 shrink-0" onClick={() => update("save")} loading={busy === "save"}
              title={me.readOnly ? READ_ONLY_HINT : undefined}
              disabled={me.readOnly || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim() === poster.data?.ruul_email || status === "done"}>{t("creator.ruulSave")}</Button>
          </div>
        </div>
        {status !== "done" && (
          <Button size="lg" className="mt-3 h-12 w-full" onClick={() => update("done")} loading={busy === "done"} disabled={me.readOnly || !(status === "added" || status === "email_given")} title={me.readOnly ? READ_ONLY_HINT : undefined}>
            <Check className="h-4 w-4" /> {t("creator.ruulDone")}
          </Button>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[13px] font-semibold text-muted-foreground">{t("creator.paymentsTitle")}</h2>
          {paidTotal > 0 && <span className="tabular text-[13px] text-muted-foreground">{t("creator.paid")} · <b className="text-foreground">{formatMoney(paidTotal, cur, lang)}</b></span>}
        </div>
        {payouts.isLoading ? <div className="flex justify-center py-8"><Spinner /></div> : list.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-border-strong bg-white px-6 py-12 text-center">
            <IconTile icon={<Wallet />} tint="green" className="mb-3 h-12 w-12 rounded-2xl" />
            <p className="max-w-xs text-sm text-muted-foreground">{t("creator.noPayouts")}</p>
          </div>
        ) : list.map((p) => (
          <article key={p.id} className="overflow-hidden rounded-2xl border bg-white shadow-xs">
            <button className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted" onClick={() => setOpen(open === p.id ? null : p.id)}>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">{t("creator.weekOf", { week: shortWeekLabel(p.week_start) })}</p>
                <p className="mt-0.5 text-xs text-subtle-foreground">{t("creator.videos", { n: p.videos_count })} · {t("creator.bonus")} {formatMoney(Number(p.bonus_amount), p.currency, lang)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <div className="text-right">
                  <p className="tabular text-[17px] font-semibold text-foreground">{formatMoney(Number(p.total), p.currency, lang)}</p>
                  <span className={cn("text-[11px] font-semibold", p.status === "paid" ? "text-success" : "text-[#b97800]")}>{p.status === "paid" ? t("creator.paid") : t("creator.pending")}</span>
                </div>
                <ChevronDown className={cn("h-4 w-4 text-subtle-foreground transition-transform", open === p.id && "rotate-180")} />
              </div>
            </button>
            {open === p.id && (
              <div className="border-t border-separator bg-white px-5 py-2">
                {(p.lines ?? []).map((l, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 border-b border-separator py-2.5 text-sm last:border-0">
                    <div className="min-w-0">
                      {l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="text-foreground hover:text-accent">{l.label}</a> : <span className="text-foreground">{l.label}</span>}
                      {l.kind === "bonus" && <span className="block text-xs text-subtle-foreground">{l.views_d7 !== null ? `${new Intl.NumberFormat(lang).format(l.views_d7)} views` : l.note}</span>}
                    </div>
                    <span className="tabular shrink-0 text-muted-foreground">{formatMoney(Number(l.amount), p.currency, lang)}</span>
                  </div>
                ))}
                <div className="flex justify-between py-3 text-sm font-semibold">
                  <span>{t("creator.total")}</span><span className="tabular">{formatMoney(Number(p.total), p.currency, lang)}</span>
                </div>
              </div>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}
