import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Dialog, Field, Input, Select, Tabs, Textarea, useToast } from "@/components/ui";
import { callFn } from "@/lib/supabase";
import { useApps, useCountries, usePools, usePosters } from "@/lib/hooks";
import { flag } from "@/lib/utils";
import type { Video } from "./types";

/** « Assigner en brief » : depuis une vidéo de référence → brief + assignation à des posteurs ou à un pool. */
export function AssignBriefDialog({ video, open, onClose, origin = "library" }: { video: Video | null; open: boolean; onClose: () => void; origin?: "library" | "ad" | "manual" }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { data: apps } = useApps();
  const { data: countries } = useCountries();
  const { data: pools } = usePools();
  const { data: posters } = usePosters();
  const [mode, setMode] = useState<"posters" | "pool">("pool");
  const [title, setTitle] = useState("");
  const [hook, setHook] = useState("");
  const [instructions, setInstructions] = useState("");
  const [appId, setAppId] = useState("");
  const [language, setLanguage] = useState("");
  const [targets, setTargets] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [poolId, setPoolId] = useState("");
  const [quantity, setQuantity] = useState(5);
  const [due, setDue] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(video ? `${origin === "ad" ? "Recréer la pub" : "Format"} @${video.author_handle ?? video.ad_page_name ?? ""}` : "");
    setHook(video?.caption?.split("\n")[0]?.slice(0, 140) ?? "");
    setInstructions(origin === "ad"
      ? "Recréer cette pub en version organique, face caméra, avec ton propre style. Garde la structure (hook → problème → app → résultat), 20–35 s."
      : "Reproduis le format de la vidéo de référence (même structure et rythme), avec l'app à la place. 15–30 s, vertical, sous-titres.");
    setAppId(video?.app_id ?? apps?.[0]?.id ?? "");
    setLanguage(video?.language ?? "");
    setTargets([]);
    setSelected([]);
  }, [open, video?.id]);
  useEffect(() => { if (!poolId && pools?.[0]) setPoolId(pools[0].id); }, [pools]);

  const filteredPosters = useMemo(() => (posters ?? []).filter((p: any) => p.status === "active")
    .filter((p: any) => !targets.length || targets.includes(p.country))
    .filter((p: any) => !q || `${p.display_name} ${p.profiles?.email} ${p.country}`.toLowerCase().includes(q.toLowerCase())), [posters, targets, q]);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await callFn("briefs", {
        action: "create", title, hook, instructions, app_id: appId || null, video_id: video?.id ?? null, language: language || null,
        target_countries: targets, origin, due_date: due,
        ...(mode === "posters" ? { poster_ids: selected, quantity: selected.length } : { pool_id: poolId, quantity }),
      });
      if (video && !video.video_path) callFn("collect", { action: "store_video", video_id: video.id }).catch(() => {});
      toast(`Brief créé · ${res.assigned + (res.dispatched?.assigned ?? 0)} assignation(s)`, "success");
      qc.invalidateQueries({ queryKey: ["briefs"] });
      onClose();
    } catch (e) {
      toast((e as Error).message, "danger");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Assigner en brief" wide
      footer={<><Button variant="ghost" onClick={onClose}>Annuler</Button><Button onClick={submit} loading={busy} disabled={!title || (mode === "posters" ? selected.length === 0 : !poolId)}>Créer le brief</Button></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <Field label="Titre"><Input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Hook (première phrase)"><Input value={hook} onChange={(e) => setHook(e.target.value)} /></Field>
          <Field label="Consignes"><Textarea rows={5} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="App"><Select value={appId} onChange={(e) => setAppId(e.target.value)}>{(apps ?? []).map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}</Select></Field>
            <Field label="Langue"><Input placeholder="ex. fr, es (vide = toutes)" value={language} onChange={(e) => setLanguage(e.target.value)} /></Field>
          </div>
          <Field label="Échéance"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <div className="space-y-4">
          <Field label="Pays cibles" hint="Vide = tous les pays">
            <div className="flex max-h-32 flex-wrap gap-1 overflow-y-auto rounded-md border p-2">
              {(countries ?? []).filter((c: any) => c.open).map((c: any) => (
                <button key={c.code} type="button" onClick={() => setTargets((t) => t.includes(c.code) ? t.filter((x) => x !== c.code) : [...t, c.code])}
                  className={`rounded-full border px-2 py-0.5 text-xs ${targets.includes(c.code) ? "border-accent bg-accent/10 text-accent" : "text-muted-foreground"}`}>{flag(c.code)} {c.code}</button>
              ))}
            </div>
          </Field>
          <Tabs value={mode} onChange={setMode} items={[{ value: "pool", label: "Pool (répartition auto)" }, { value: "posters", label: "Posteurs choisis" }]} />
          {mode === "pool" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pool"><Select value={poolId} onChange={(e) => setPoolId(e.target.value)}>{(pools ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.pool_members?.length ?? 0})</option>)}</Select></Field>
              <Field label="Nombre de vidéos" hint="Réparties sur la file du jour (2/posteur/jour)"><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></Field>
            </div>
          ) : (
            <div className="space-y-2">
              <Input placeholder="Rechercher un posteur…" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border p-2">
                {filteredPosters.length === 0 && <p className="p-2 text-xs text-muted-foreground">Aucun posteur actif {targets.length ? "dans ces pays" : ""}.</p>}
                {filteredPosters.map((p: any) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted">
                    <input type="checkbox" checked={selected.includes(p.id)} onChange={() => setSelected((s) => s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id])} />
                    {flag(p.country)} {p.display_name} <span className="text-xs text-muted-foreground">{p.language}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{selected.length} sélectionné(s)</p>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}
