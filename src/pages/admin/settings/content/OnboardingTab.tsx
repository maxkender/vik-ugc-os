import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, History, Save } from "lucide-react";
import { Badge, Button, Card, Field, Input, Select, Spinner, Textarea, useToast } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { CreatorOnboarding, type OnboardingScreen } from "@/components/creator/CreatorOnboarding";

/** Réglages → Contenus & aperçus → Onboarding créateur : écrans de la 1re connexion, éditables et versionnés. */
export function OnboardingTab() {
  const toast = useToast();
  const qc = useQueryClient();
  const [lang, setLang] = useState("fr");
  const [preview, setPreview] = useState(false);
  const [edits, setEdits] = useState<Record<string, Partial<OnboardingScreen>>>({});
  const [slack, setSlack] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const langs = useQuery({ queryKey: ["onb-langs"], queryFn: async () => [...new Set(((await supabase.from("onboarding_screens").select("language")).data ?? []).map((r: any) => r.language))].sort() });
  const screens = useQuery({
    queryKey: ["onboarding-screens-admin", lang],
    queryFn: async () => ((await supabase.from("onboarding_screens").select("*").eq("language", lang).order("sort")).data ?? []) as OnboardingScreen[],
  });
  const versions = useQuery({
    queryKey: ["onboarding-versions", lang],
    queryFn: async () => ((await supabase.from("onboarding_screen_versions").select("key, created_at").eq("language", lang).order("created_at", { ascending: false }).limit(200)).data ?? []) as { key: string; created_at: string }[],
  });
  const community = useQuery({ queryKey: ["community-setting"], queryFn: async () => (await supabase.from("settings").select("value").eq("key", "community").maybeSingle()).data?.value as any });
  useEffect(() => { setSlack(community.data?.slack_url ?? ""); }, [community.data?.slack_url]);
  useEffect(() => setEdits({}), [lang]);

  const save = async (s: OnboardingScreen) => {
    const e = edits[s.key];
    if (!e) return;
    setBusy(s.key);
    const { error } = await supabase.from("onboarding_screens").update({ title: e.title ?? s.title, body: e.body ?? s.body, button_label: e.button_label ?? s.button_label }).eq("key", s.key).eq("language", lang);
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast("Écran enregistré (version précédente archivée)", "success");
    setEdits(({ [s.key]: _, ...rest }) => rest);
    qc.invalidateQueries({ queryKey: ["onboarding-screens-admin"] });
    qc.invalidateQueries({ queryKey: ["onboarding-screens"] });
    qc.invalidateQueries({ queryKey: ["onboarding-versions"] });
  };
  const saveSlack = async () => {
    setBusy("slack");
    const { error } = await supabase.from("settings").upsert({ key: "community", value: { ...(community.data ?? {}), slack_url: slack.trim() } });
    setBusy(null);
    if (error) return toast(error.message, "danger");
    toast("Lien Slack enregistré", "success");
    qc.invalidateQueries({ queryKey: ["community-setting"] });
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-end gap-4">
        <Field label="Langue">
          <Select value={lang} onChange={(e) => setLang(e.target.value)} className="w-40">
            {(langs.data ?? ["fr", "en", "es"]).map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </Select>
        </Field>
        <Field label="Lien Slack (écran « La communauté »)" className="min-w-[280px] flex-1">
          <Input value={slack} onChange={(e) => setSlack(e.target.value)} placeholder="https://join.slack.com/t/…" />
        </Field>
        <Button variant="secondary" onClick={saveSlack} loading={busy === "slack"} disabled={slack.trim() === (community.data?.slack_url ?? "")}><Save className="h-4 w-4" /> Enregistrer</Button>
        <Button onClick={() => setPreview(true)}><Eye className="h-4 w-4" /> Prévisualiser comme un posteur</Button>
      </Card>
      <p className="text-[13px] text-muted-foreground">Affiché une fois, à la 1re connexion du posteur, dans sa langue (repli anglais). Le dernier bouton mène à l'étape warm-up. Chaque enregistrement archive la version précédente.</p>
      {screens.isLoading ? <div className="flex justify-center py-10"><Spinner /></div> : (screens.data ?? []).map((s) => {
        const e = edits[s.key] ?? {};
        const nVersions = (versions.data ?? []).filter((v) => v.key === s.key).length;
        return (
          <Card key={s.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold text-muted-foreground">Écran {s.sort} · <code>{s.key}</code></p>
              {nVersions > 0 && <Badge><History className="h-3 w-3" /> {nVersions} version(s) archivée(s)</Badge>}
            </div>
            <Field label="Titre"><Input value={e.title ?? s.title} onChange={(ev) => setEdits({ ...edits, [s.key]: { ...e, title: ev.target.value } })} /></Field>
            <Field label="Texte"><Textarea rows={4} value={e.body ?? s.body} onChange={(ev) => setEdits({ ...edits, [s.key]: { ...e, body: ev.target.value } })} /></Field>
            {(s.button_label !== null || ["community", "ruul", "start"].includes(s.key)) && (
              <Field label="Bouton"><Input value={e.button_label ?? s.button_label ?? ""} onChange={(ev) => setEdits({ ...edits, [s.key]: { ...e, button_label: ev.target.value } })} /></Field>
            )}
            <div className="flex justify-end"><Button size="sm" onClick={() => save(s)} loading={busy === s.key} disabled={!edits[s.key]}><Save className="h-3.5 w-3.5" /> Enregistrer</Button></div>
          </Card>
        );
      })}
      {preview && <CreatorOnboarding lang={lang} preview onDone={() => setPreview(false)} onRuul={() => toast("Aperçu : mène au guide Ruul (Paiements)")} onClose={() => setPreview(false)} />}
    </div>
  );
}
