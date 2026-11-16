import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Ban, Check, CheckCircle2, Flame, ImagePlus, Instagram, Timer } from "lucide-react";
import { Button, Spinner, useToast } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { guideText, IG_NICHE_TAGS } from "@/i18n/guide";
import { READ_ONLY_HINT, useCreatorIdentity } from "./shared";

const PLATFORMS = ["tiktok", "instagram"] as const;
const CHECKS = ["follow", "scroll", "profile", "no_post"] as const;

interface WarmupPoster { id: string; warmup_status: "none" | "started" | "validated"; warmup_started_at: string | null; warmup_checks: Record<string, boolean> | null; warmup_proof_path: string | null }

export function useWarmup() {
  const me = useCreatorIdentity();
  return useQuery({
    queryKey: ["warmup", me.id],
    enabled: !!me.id,
    queryFn: async () => (await supabase.from("posters").select("id, warmup_status, warmup_started_at, warmup_checks, warmup_proof_path").eq("id", me.id!).maybeSingle()).data as WarmupPoster | null,
  });
}

function fmt(ms: number) {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

/**
 * Warm-up de 24 h (16/11, Max) : checklist par plateforme, minuteur, comptes de la niche (issus de la bibliothèque),
 * capture optionnelle, validation. Aucun brief tant que le warm-up n'est pas validé (gate côté serveur).
 */
export function WarmupStep({ hours = 24 }: { hours?: number }) {
  const { i18n } = useTranslation();
  const W = guideText(i18n.resolvedLanguage).warmup;
  const me = useCreatorIdentity();
  const toast = useToast();
  const qc = useQueryClient();
  const q = useWarmup();
  const p = q.data;
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { setChecks(p?.warmup_checks ?? {}); }, [p?.id, p?.warmup_status]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  const accounts = useQuery({
    queryKey: ["warmup-accounts", me.id],
    enabled: !!me.id,
    queryFn: async () => ((await supabase.rpc("poster_warmup_accounts", { p_limit: 15 })).data ?? []) as { platform: string; handle: string; url: string }[],
    staleTime: 3600_000,
  });

  if (q.isLoading) return <div className="flex justify-center py-6"><Spinner /></div>;
  if (!p) return null;
  const status = p.warmup_status;
  const endsAt = p.warmup_started_at ? new Date(p.warmup_started_at).getTime() + hours * 3_600_000 : null;
  const left = endsAt ? endsAt - now : null;
  const allChecked = PLATFORMS.every((pl) => CHECKS.every((c) => checks[`${pl}_${c}`]));
  const refresh = () => { qc.invalidateQueries({ queryKey: ["warmup"] }); qc.invalidateQueries({ queryKey: ["my-poster"] }); };
  const err = (m: string) => toast(m.includes("too_early") ? W.tooEarly : m.includes("incomplete") ? W.incomplete : m, "danger");

  const start = async () => {
    setBusy("start");
    const { error } = await supabase.rpc("poster_warmup_start");
    setBusy(null);
    if (error) return err(error.message);
    refresh();
  };
  const toggle = async (key: string, v: boolean) => {
    const next = { ...checks, [key]: v };
    setChecks(next);
    if (!me.readOnly) await supabase.rpc("poster_warmup_save", { p_checks: next, p_proof: null });
  };
  const upload = async (file: File) => {
    if (me.readOnly || !me.id) return;
    setBusy("proof");
    const path = `${me.id}/foryou-${Date.now()}.${(file.name.split(".").pop() || "jpg").toLowerCase()}`;
    const { error } = await supabase.storage.from("warmup-proofs").upload(path, file, { upsert: true, contentType: file.type || "image/jpeg" });
    if (!error) await supabase.rpc("poster_warmup_save", { p_checks: checks, p_proof: path });
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast(W.proofSaved, "success");
    refresh();
  };
  const validate = async () => {
    setBusy("validate");
    const { error } = await supabase.rpc("poster_warmup_validate");
    setBusy(null);
    if (error) return err(error.message);
    toast(W.validated, "success");
    refresh();
  };

  return (
    <section id="warmup" className="scroll-mt-20 rounded-2xl border bg-white p-5 shadow-xs sm:p-6" data-testid="warmup-step">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full", status === "validated" ? "bg-tint-green text-success" : "bg-tint-yellow text-[#c98a00]")}>
            {status === "validated" ? <Check className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
          </span>
          <h2 className="text-[15px] font-semibold text-foreground">{W.title}</h2>
        </div>
        {status === "started" && left !== null && (
          <span className={cn("tabular inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", left > 0 ? "bg-tint-blue text-[#0040d6]" : "bg-tint-green text-[#0b7a3c]")}>
            <Timer className="h-3.5 w-3.5" />{left > 0 ? W.remaining.replace("{{time}}", fmt(left)) : "24 h ✓"}
          </span>
        )}
      </div>

      {status === "validated" ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-tint-green px-4 py-3 text-sm text-[#0b7a3c]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{W.validated}</p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{W.intro}</p>
          <p className="mt-2 rounded-xl bg-muted px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">{W.why}</p>

          {status === "none" && (
            <div className="mt-4">
              <Button size="lg" className="h-12 w-full" onClick={start} loading={busy === "start"} disabled={me.readOnly} title={me.readOnly ? READ_ONLY_HINT : undefined}>
                <Flame className="h-4 w-4" /> {W.start}
              </Button>
              <p className="mt-2 text-xs text-subtle-foreground">{W.startHint}</p>
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {PLATFORMS.map((pl) => (
              <div key={pl} className="rounded-xl border border-border-strong p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">{pl === "instagram" ? <Instagram className="h-4 w-4" /> : <span className="text-base">♪</span>}{W.platforms[pl]}</p>
                <ul className="mt-3 space-y-2.5">
                  {CHECKS.map((c) => {
                    const key = `${pl}_${c}`;
                    return (
                      <li key={c}>
                        <label className={cn("flex items-start gap-2.5 text-[13px] leading-snug", status === "none" ? "text-subtle-foreground" : "text-foreground")}>
                          <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#004dff]" disabled={status === "none" || me.readOnly} checked={!!checks[key]} onChange={(e) => toggle(key, e.target.checked)} />
                          {W.checks[c]}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-foreground">{W.accountsTitle}</p>
            <p className="mt-1 text-xs text-muted-foreground">{W.accountsHint}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(accounts.data ?? []).filter((a) => a.platform === "tiktok").slice(0, 15).map((a) => (
                <a key={a.handle} href={a.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-border-strong bg-white px-3 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted">@{a.handle}</a>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{W.instagramHint}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {IG_NICHE_TAGS.map((tag) => (
                <a key={tag} href={`https://www.instagram.com/explore/tags/${tag}/`} target="_blank" rel="noopener noreferrer" className="rounded-full bg-tint-violet px-3 py-1.5 text-[13px] font-medium text-[#7a32ef]">#{tag}</a>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[#ffd2d0] bg-[#fff6f5] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#a52326]"><Ban className="h-4 w-4" />{W.dontsTitle}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-snug text-[#7a1d1f]">{W.donts.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>

          {status === "started" && (
            <div className="mt-5 space-y-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border-strong px-4 py-3">
                <ImagePlus className="h-5 w-5 shrink-0 text-subtle-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{W.proof}{p.warmup_proof_path ? " ✓" : ""}</span>
                  <span className="block text-xs text-muted-foreground">{W.proofHint}</span>
                </span>
                {busy === "proof" && <Spinner className="h-4 w-4" />}
                <input type="file" accept="image/*" className="hidden" disabled={me.readOnly} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
              <Button size="lg" className="h-12 w-full" onClick={validate} loading={busy === "validate"} disabled={me.readOnly || !allChecked || (left ?? 1) > 0} title={me.readOnly ? READ_ONLY_HINT : undefined}>
                <CheckCircle2 className="h-4 w-4" /> {W.validate}
              </Button>
              <p className="text-center text-xs text-subtle-foreground">{(left ?? 1) > 0 ? W.tooEarly : !allChecked ? W.incomplete : W.ready}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/** Bandeau « tes briefs commencent après le warm-up » (onglet Aujourd'hui). */
export function WarmupLock() {
  const { i18n } = useTranslation();
  const W = guideText(i18n.resolvedLanguage).warmup;
  const q = useWarmup();
  if (!q.data || q.data.warmup_status === "validated") return null;
  return (
    <Link to="/creator/account#warmup" className="mb-5 flex items-center gap-3 rounded-2xl border border-[#ffe2a8] bg-tint-yellow px-4 py-3.5" data-testid="warmup-lock">
      <Flame className="h-5 w-5 shrink-0 text-[#c98a00]" />
      <span className="min-w-0 flex-1 text-sm font-medium text-[#8a5a00]">{W.locked}</span>
      <span className="shrink-0 text-sm font-semibold text-[#8a5a00]">{W.goToWarmup} →</span>
    </Link>
  );
}
