import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, Empty, Field, Input, Spinner, useToast } from "@/components/ui";
import { formatMoney } from "@shared/zones.ts";
import { shortWeekLabel } from "@shared/dates.ts";
import { useMyPoster } from "./shared";

interface Line { kind: "video" | "bonus"; label: string; url: string | null; views_d7: number | null; amount: number; note?: string }
interface Payout { id: string; week_start: string; currency: string; videos_count: number; base_amount: number; bonus_amount: number; total: number; status: "pending" | "paid" | "void"; lines: Line[] }

const RUUL_TONE = { none: "default", email_given: "warning", added: "accent", done: "success", stopped: "danger" } as const;

export default function Payments() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const qc = useQueryClient();
  const toast = useToast();
  const poster = useMyPoster();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<"save" | "done" | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const lang = i18n.resolvedLanguage ?? "en";

  useEffect(() => { if (poster.data?.ruul_email) setEmail(poster.data.ruul_email); }, [poster.data?.ruul_email]);

  const payouts = useQuery({
    queryKey: ["my-payouts", profile?.id],
    enabled: !!profile,
    queryFn: async () => ((await supabase.from("payouts").select("*").eq("poster_id", profile!.id).neq("status", "void").order("week_start", { ascending: false })).data ?? []) as Payout[],
  });

  const update = async (kind: "save" | "done") => {
    setBusy(kind);
    const { error } = await supabase.rpc("poster_update_self", kind === "save" ? { p_ruul_email: email.trim() } : { p_ruul_done: true });
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast(kind === "save" ? t("common.save") + " ✓" : t("creator.ruulStatus.done"), "success");
    qc.invalidateQueries({ queryKey: ["my-poster"] });
  };

  if (poster.isLoading) return <Spinner />;
  const status = poster.data?.ruul_status ?? "none";
  const steps = t("creator.ruulSteps", { returnObjects: true }) as unknown as string[];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{t("creator.paymentsTitle")}</h1>
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t("creator.ruulTitle")}</h2>
          <Badge tone={RUUL_TONE[status]}>{t(`creator.ruulStatus.${status}`)}</Badge>
        </div>
        <ol className="space-y-2 text-sm">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>{s}</li>
          ))}
        </ol>
        <Field label={t("creator.ruulEmail")}>
          <div className="flex gap-2">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={status === "done"} />
            <Button variant="outline" onClick={() => update("save")} loading={busy === "save"} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.trim() === poster.data?.ruul_email || status === "done"}>{t("creator.ruulSave")}</Button>
          </div>
        </Field>
        {status !== "done" && (
          <Button onClick={() => update("done")} loading={busy === "done"} disabled={!(status === "added" || status === "email_given")}>{t("creator.ruulDone")}</Button>
        )}
      </Card>

      <section className="space-y-3">
        {payouts.isLoading ? <Spinner /> : (payouts.data ?? []).length === 0 ? <Empty title={t("creator.noPayouts")} /> : (payouts.data ?? []).map((p) => (
          <Card key={p.id} className="p-0">
            <button className="flex w-full items-center justify-between gap-3 p-4 text-left" onClick={() => setOpen(open === p.id ? null : p.id)}>
              <div>
                <p className="font-medium">{t("creator.weekOf", { week: shortWeekLabel(p.week_start) })}</p>
                <p className="text-xs text-muted-foreground">{t("creator.videos", { n: p.videos_count })} · {t("creator.base")} {formatMoney(Number(p.base_amount), p.currency, lang)} · {t("creator.bonus")} {formatMoney(Number(p.bonus_amount), p.currency, lang)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatMoney(Number(p.total), p.currency, lang)}</span>
                <Badge tone={p.status === "paid" ? "success" : "warning"}>{p.status === "paid" ? t("creator.paid") : t("creator.pending")}</Badge>
                <ChevronDown className={`h-4 w-4 transition-transform ${open === p.id ? "rotate-180" : ""}`} />
              </div>
            </button>
            {open === p.id && (
              <div className="border-t px-4 py-3">
                <table className="w-full text-sm">
                  <tbody>
                    {(p.lines ?? []).map((l, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3">
                          {l.url ? <a href={l.url} target="_blank" rel="noreferrer" className="hover:underline">{l.label}</a> : l.label}
                          {l.kind === "bonus" && <span className="block text-xs text-muted-foreground">{l.views_d7 !== null ? `${new Intl.NumberFormat(lang).format(l.views_d7)} views` : l.note}</span>}
                        </td>
                        <td className="py-2 text-right tabular-nums">{formatMoney(Number(l.amount), p.currency, lang)}</td>
                      </tr>
                    ))}
                    <tr><td className="pt-2 font-semibold">{t("creator.total")}</td><td className="pt-2 text-right font-semibold tabular-nums">{formatMoney(Number(p.total), p.currency, lang)}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        ))}
      </section>
    </div>
  );
}
