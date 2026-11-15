import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, Copy, RefreshCw, ShieldCheck } from "lucide-react";
import { Badge, Button, Card, Field, Input, Spinner, useToast } from "@/components/ui";
import { callFn, supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { bioFor, displayNameFor } from "@shared/handles.ts";

type Avail = "available" | "taken" | "unknown";
interface Suggestion { handle: string; tiktok: Avail; instagram: Avail }

const STATUS_TONE: Record<string, any> = { none: "outline", proposed: "default", submitted: "warning", verified: "success", failed: "danger" };

function CopyButton({ text }: { text: string | null | undefined }) {
  const { t } = useTranslation();
  const [done, setDone] = useState(false);
  if (!text) return null;
  return (
    <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
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
  const avail = (a: Avail) => <Badge tone={a === "available" ? "success" : a === "taken" ? "danger" : "outline"}>{t(`account.${a}`)}</Badge>;
  const line = (platform: "tiktok" | "instagram") => {
    const r = report?.[platform];
    if (!r?.handle) return null;
    return (
      <p className="text-sm">
        <span className="font-medium">{platform === "tiktok" ? "TikTok" : "Instagram"} @{r.handle}</span>{" · "}
        {r.exists === true ? <span className="text-success">{t("account.exists")}</span> : r.exists === false ? <span className="text-danger">{t("account.missing")}</span> : <span className="text-muted-foreground">{t("account.notChecked")}</span>}
        {r.exists && <>{" · "}{r.bio_ok ? <span className="text-success">{t("account.bioOk")}</span> : <span className="text-danger">{t("account.bioMissing", { app: ctx.app })}</span>}</>}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("account.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{t("account.intro")}</p>
        </div>
        <Badge tone={STATUS_TONE[p.handles_status] ?? "outline"}>{t(`account.status.${p.handles_status}`)}</Badge>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">{t("account.step1")}</h2>
          <Button size="sm" variant="outline" onClick={suggest} loading={busy === "suggest"}><RefreshCw className="h-3.5 w-3.5" /> {t("account.regenerate")}</Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("account.step1Hint")}</p>
        {busy === "suggest" ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner className="h-4 w-4" /> {t("account.generating")}</p>
          : suggestions.length === 0 ? <p className="text-sm text-muted-foreground">{t("account.noSuggestion")}</p>
          : (
            <ul className="divide-y rounded-lg border">
              {suggestions.map((s) => (
                <li key={s.handle} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                  <span className="font-mono text-sm font-medium">@{s.handle}</span>
                  <span className="flex items-center gap-1.5 text-xs">TikTok {avail(s.tiktok)} Instagram {avail(s.instagram)} <CopyButton text={s.handle} /></span>
                </li>
              ))}
            </ul>
          )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">{t("account.step2")}</h2>
        <Row label={t("account.displayName")} value={displayName} />
        <Row label={t("account.bio")} value={bio} hint={t("account.bioWarn", { app: ctx.app })} />
        {app?.link_in_bio && <Row label={t("account.linkInBio")} value={app.link_in_bio} />}
        {app?.profile_photo_tips && <div><p className="text-xs font-medium uppercase text-muted-foreground">{t("account.photo")}</p><p className="mt-1 text-sm">{app.profile_photo_tips}</p></div>}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">{t("account.step3")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("account.tiktok")}><Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@" /></Field>
          <Field label={t("account.instagram")}><Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@" /></Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={save} loading={busy === "save"} disabled={!tiktok.trim()}>{t("account.save")}</Button>
          <Button onClick={verify} loading={busy === "verify"} disabled={!p.tiktok_handle}><ShieldCheck className="h-4 w-4" /> {busy === "verify" ? t("account.checking") : t("account.verify")}</Button>
        </div>
        {report && <div className="space-y-1 rounded-lg bg-muted p-3">{line("tiktok")}{line("instagram")}</div>}
      </Card>
    </div>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-start justify-between gap-3 rounded-lg border bg-card px-3 py-2">
        <p className="whitespace-pre-wrap text-sm">{value}</p>
        <CopyButton text={value} />
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
