import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Camera, Check, CheckCircle2, Copy, HelpCircle, Instagram, RefreshCw, ShieldCheck, X, XCircle } from "lucide-react";
import { Button, Card, Spinner, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { bioFor, displayNameFor } from "@shared/handles.ts";

type Avail = "available" | "taken" | "unknown";
interface Suggestion { handle: string; tiktok: Avail; instagram: Avail }


function CopyButton({ text }: { text: string | null | undefined }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <Button size="sm" variant="secondary" className="shrink-0" onClick={async () => { try { await navigator.clipboard.writeText(text); } catch { /* ignore */ } setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {done ? t("account.copied") : t("account.copy")}
    </Button>
  );
}

export default function Account() {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<"suggest" | "save" | "verify" | null>(null);
  const [tiktok, setTiktok] = useState("");
  const [instagram, setInstagram] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["my-account", profile?.id],
    enabled: !!profile,
    queryFn: async () => {
      const { data: p } = await supabase.from("posters")
        .select("id, display_name, language, app_id, tiktok_handle, instagram_handle, handle_suggestions, handles_status, handles_report, handles_checked_at")
        .eq("id", profile!.id).maybeSingle();
      let app: any = null;
      if (p?.app_id) app = (await supabase.from("apps").select("*").eq("id", p.app_id).maybeSingle()).data;
      if (!app) app = (await supabase.from("apps").select("*").eq("active", true).order("created_at").limit(1).maybeSingle()).data;
      return { p, app };
    },
  });
  const p = data?.p as any;
  const app = data?.app as any;
  useEffect(() => {
    if (p) { setTiktok(p.tiktok_handle ?? ""); setInstagram(p.instagram_handle ?? ""); }
  }, [p?.id]);

  // Première visite : on propose tout de suite des handles.
  useEffect(() => {
    if (p && (p.handle_suggestions ?? []).length === 0 && p.handles_status === "none" && !busy) suggest();
  }, [p?.id]);

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!p) return <Card><p className="text-sm text-muted-foreground">{t("common.error")}</p></Card>;

  const full = (profile?.full_name ?? p.display_name ?? "").trim();
  const ctx = { app: app?.name ?? "Micabo", first: full.split(/\s+/)[0] || "creator", last: full.split(/\s+/).slice(1).join(" ") };
  const bio = bioFor(app?.bio_templates, i18n.resolvedLanguage ?? p.language, ctx);
  const displayName = displayNameFor(app?.display_name_pattern, ctx);
  const suggestions: Suggestion[] = p.handle_suggestions ?? [];
  const report = p.handles_report as Record<string, { handle: string | null; exists: boolean | null; bio_ok: boolean }> | null;
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-account"] });

  async function suggest() {
    setBusy("suggest");
    try { await callFn("handles", { action: "suggest" }); refresh(); }
    catch (e) { toast((e as Error).message, "danger"); }
    finally { setBusy(null); }
  }
  const save = async () => {
    setBusy("save");
    const { error } = await supabase.rpc("poster_submit_handles", { p_tiktok: tiktok, p_instagram: instagram });
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast(t("account.saved"), "success");
    refresh();
  };
  const verify = async () => {
    setBusy("verify");
    try { await callFn("handles", { action: "verify" }); refresh(); }
    catch (e) { toast((e as Error).message, "danger"); }
    finally { setBusy(null); }
  };

  const hasSuggestions = suggestions.length > 0;
  const step1Done = !!p.tiktok_handle || p.handles_status !== "none";
  const step3Done = p.handles_status === "verified";
  const statusCls: Record<string, string> = {
    none: "bg-[#f1f3f7] text-muted-foreground", proposed: "bg-tint-blue text-[#0040d6]", submitted: "bg-tint-yellow text-[#8a5a00]",
    verified: "bg-tint-green text-[#0b7a3c]", failed: "bg-tint-red text-[#c42a2d]",
  };

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-[-0.01em] text-foreground">{t("account.title")}</h1>
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusCls[p.handles_status] ?? statusCls.none}`}>{t(`account.status.${p.handles_status}`)}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("account.intro")}</p>
      </header>

      <Step n={1} done={step1Done} title={t("account.step1")} hint={t("account.step1Hint")}
        action={<Button size="sm" variant="secondary" onClick={suggest} loading={busy === "suggest"}><RefreshCw className="h-3.5 w-3.5" /> {t("account.regenerate")}</Button>}>
        {busy === "suggest" ? (
          <p className="flex items-center gap-2 rounded-xl bg-muted px-4 py-4 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> {t("account.generating")}</p>
        ) : !hasSuggestions ? (
          <p className="rounded-xl bg-muted px-4 py-4 text-sm text-muted-foreground">{t("account.noSuggestion")}</p>
        ) : (
          <div className="grid gap-2.5">
            {suggestions.map((s) => {
              const chosen = tiktok.replace(/^@/, "") === s.handle;
              return (
                <div key={s.handle} className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${chosen ? "border-[#cddcff] bg-accent-soft" : "border-border-strong bg-white hover:bg-muted"}`}>
                  <button className="min-w-0 flex-1 text-left" onClick={() => { setTiktok(s.handle); if (!instagram) setInstagram(s.handle); }}>
                    <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">@{s.handle}</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">{availPill("TikTok", s.tiktok)}{availPill("Instagram", s.instagram)}</p>
                  </button>
                  <CopyButton text={s.handle} />
                </div>
              );
            })}
          </div>
        )}
      </Step>

      <Step n={2} done={step3Done} title={t("account.step2")}>
        <div className="space-y-3">
          <Row label={t("account.displayName")} value={displayName} />
          <Row label={t("account.bio")} value={bio} hint={t("account.bioWarn", { app: ctx.app })} />
          {app?.link_in_bio && <Row label={t("account.linkInBio")} value={app.link_in_bio} />}
          {app?.profile_photo_tips && (
            <div className="flex gap-3 rounded-xl bg-tint-violet px-4 py-3">
              <Camera className="mt-0.5 h-4 w-4 shrink-0 text-vik-violet" />
              <div><p className="text-xs font-semibold text-[#7a32ef]">{t("account.photo")}</p><p className="mt-0.5 text-sm text-foreground">{app.profile_photo_tips}</p></div>
            </div>
          )}
        </div>
      </Step>

      <Step n={3} done={step3Done} title={t("account.step3")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <HandleInput icon={<TikTokIcon />} label={t("account.tiktok")} value={tiktok} onChange={setTiktok} />
          <HandleInput icon={<Instagram className="h-4 w-4" />} label={t("account.instagram")} value={instagram} onChange={setInstagram} />
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button size="lg" variant="secondary" className="h-11" onClick={save} loading={busy === "save"} disabled={!tiktok.trim()}>{t("account.save")}</Button>
          <Button size="lg" className="h-11" onClick={verify} loading={busy === "verify"} disabled={!p.tiktok_handle}><ShieldCheck className="h-4 w-4" /> {busy === "verify" ? t("account.checking") : t("account.verify")}</Button>
        </div>
        {report && (
          <div className="mt-4 grid gap-2">
            {(["tiktok", "instagram"] as const).map((pl) => <VerifyRow key={pl} platform={pl} r={report[pl]} app={ctx.app} />)}
          </div>
        )}
      </Step>
    </div>
  );

  function availPill(platform: string, a: Avail) {
    const cls = a === "available" ? "bg-tint-green text-[#0b7a3c]" : a === "taken" ? "bg-tint-red text-[#c42a2d]" : "bg-[#f1f3f7] text-muted-foreground";
    const Icon = a === "available" ? Check : a === "taken" ? X : HelpCircle;
    return <span key={platform} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}><Icon className="h-3 w-3" />{platform} · {t(`account.${a}`)}</span>;
  }
}

function VerifyRow({ platform, r, app }: { platform: "tiktok" | "instagram"; r?: { handle: string | null; exists: boolean | null; bio_ok: boolean }; app: string }) {
  const { t } = useTranslation();
  if (!r?.handle) return null;
  const ok = r.exists === true && r.bio_ok;
  const bad = r.exists === false || (r.exists === true && !r.bio_ok);
  return (
    <div className={`flex items-start gap-3 rounded-xl px-4 py-3 ${ok ? "bg-tint-green" : bad ? "bg-tint-red" : "bg-muted"}`}>
      {ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" /> : bad ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> : <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-subtle-foreground" />}
      <div className="min-w-0 text-sm">
        <p className="font-semibold text-foreground">{platform === "tiktok" ? "TikTok" : "Instagram"} · @{r.handle}</p>
        <p className="text-muted-foreground">
          {r.exists === true ? t("account.exists") : r.exists === false ? t("account.missing") : t("account.notChecked")}
          {r.exists && <> · {r.bio_ok ? t("account.bioOk") : t("account.bioMissing", { app })}</>}
        </p>
      </div>
    </div>
  );
}

function Step({ n, title, hint, done, action, children }: { n: number; title: string; hint?: string; done?: boolean; action?: React.ReactNode; children: React.ReactNode }) {
  const label = title.replace(/^\d+\.\s*/, "");
  return (
    <section className="rounded-2xl border bg-white p-5 shadow-xs sm:p-6">
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={`tabular inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? "bg-tint-green text-success" : "bg-accent-soft text-accent"}`}>
              {done ? <Check className="h-4 w-4" /> : n}
            </span>
            <h2 className="text-[15px] font-semibold text-foreground">{label}</h2>
          </div>
          {action}
        </div>
        {hint && <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground sm:ml-11">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function HandleInput({ icon, label, value, onChange }: { icon: React.ReactNode; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <span className="flex h-12 items-center gap-2 rounded-lg border border-border-strong bg-white px-3.5 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10">
        <span className="text-subtle-foreground">{icon}</span>
        <span className="text-subtle-foreground">@</span>
        <input value={value.replace(/^@/, "")} onChange={(e) => onChange(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle-foreground" placeholder="username" />
      </span>
    </label>
  );
}

function TikTokIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden><path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3s-1.88.09-3.24-1.48Z" /></svg>;
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex items-start justify-between gap-3 rounded-xl border border-border-strong bg-muted px-4 py-3">
        <p className="min-w-0 whitespace-pre-wrap break-words text-[14px] text-foreground">{value}</p>
        <CopyButton text={value} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-subtle-foreground">{hint}</p>}
    </div>
  );
}
