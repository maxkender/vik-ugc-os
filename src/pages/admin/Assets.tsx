import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, FileAudio, FileType2, FolderOpen, Image as ImageIcon, Package, Trash2, Upload } from "lucide-react";
import { Button, Card, Empty, PageHeader, Select, Spinner, Tabs, useToast } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { useApps } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { cn, dateFr } from "@/lib/utils";
import { assetUrl, fmtSize, guessKind, KIND_LABEL, KINDS, type Asset, type AssetKind } from "./assets/assetKinds";

/** Bibliothèque d'assets pour les briefs : logos, captures de l'app, démos, sons, polices (bucket public brief-assets). */
export default function Assets() {
  const toast = useToast();
  const qc = useQueryClient();
  const { profile } = useAuth();
  const { data: apps } = useApps();
  const [app, setApp] = useState<string>("");
  const [kind, setKind] = useState<AssetKind | "all">("all");
  const [uploadKind, setUploadKind] = useState<AssetKind | "auto">("auto");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const assets = useQuery({
    queryKey: ["assets"],
    queryFn: async () => ((await supabase.from("assets").select("*").order("created_at", { ascending: false })).data ?? []) as Asset[],
  });
  const appName = (id: string | null) => ((apps ?? []) as any[]).find((a) => a.id === id)?.name ?? "Toutes les apps";
  const shown = useMemo(() => (assets.data ?? []).filter((a) => (!app || a.app_id === app) && (kind === "all" || a.kind === kind)), [assets.data, app, kind]);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assets.data ?? []) if (!app || a.app_id === app) m.set(a.kind, (m.get(a.kind) ?? 0) + 1);
    return m;
  }, [assets.data, app]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    try {
      for (const f of Array.from(files)) {
        if (f.size > 200 * 1024 * 1024) { toast(`${f.name} : 200 Mo maximum`, "danger"); continue; }
        const k = uploadKind === "auto" ? guessKind(f) : uploadKind;
        const slug = ((apps ?? []) as any[]).find((a) => a.id === app)?.slug ?? "general";
        const safe = f.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").slice(-80);
        const path = `${slug}/${k}/${crypto.randomUUID().slice(0, 8)}-${safe}`;
        const up = await supabase.storage.from("brief-assets").upload(path, f, { contentType: f.type || undefined, upsert: false });
        if (up.error) { toast(`${f.name} : ${up.error.message}`, "danger"); continue; }
        const { error } = await supabase.from("assets").insert({ app_id: app || null, kind: k, name: f.name, path, mime: f.type || null, size_bytes: f.size, created_by: profile?.id });
        if (error) { toast(error.message, "danger"); continue; }
        ok++;
      }
      if (ok) toast(`${ok} fichier(s) ajouté(s)`, "success");
      qc.invalidateQueries({ queryKey: ["assets"] });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const remove = async (a: Asset) => {
    if (!window.confirm(`Supprimer « ${a.name} » ? Il disparaîtra aussi des briefs qui l'utilisent.`)) return;
    await supabase.storage.from("brief-assets").remove([a.path]);
    await supabase.from("assets").delete().eq("id", a.id);
    qc.invalidateQueries({ queryKey: ["assets"] });
  };

  return (
    <div>
      <PageHeader title="Assets" description="Logos, captures d'écran, vidéos démo, sons et polices à joindre aux briefs. Les posteurs les téléchargent depuis leur espace." />
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted-foreground">App
            <Select className="mt-1 w-52" value={app} onChange={(e) => setApp(e.target.value)}>
              <option value="">Toutes les apps</option>
              {((apps ?? []) as any[]).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </label>
          <label className="text-xs text-muted-foreground">Type à l'upload
            <Select className="mt-1 w-48" value={uploadKind} onChange={(e) => setUploadKind(e.target.value as any)}>
              <option value="auto">Détecter automatiquement</option>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </Select>
          </label>
          <input ref={input} type="file" multiple className="hidden" onChange={(e) => upload(e.target.files)} data-testid="asset-input" />
          <Button onClick={() => input.current?.click()} loading={busy}><Upload className="h-4 w-4" /> Ajouter des fichiers</Button>
          <p className="text-xs text-subtle-foreground">Rangés dans {app ? appName(app) : "« Toutes les apps »"}. 200 Mo max par fichier.</p>
        </div>
      </Card>

      <div className="overflow-x-auto"><Tabs value={kind} onChange={(v) => setKind(v as any)} items={[
        { value: "all", label: `Tous (${[...counts.values()].reduce((a, b) => a + b, 0)})` },
        ...KINDS.map((k) => ({ value: k, label: `${KIND_LABEL[k]} (${counts.get(k) ?? 0})` })),
      ]} /></div>

      {assets.isLoading ? <div className="flex justify-center py-20"><Spinner /></div>
        : shown.length === 0 ? <div className="mt-6"><Empty title="Aucun asset" icon={<FolderOpen className="h-5 w-5" />}>Ajoute le logo, des captures de l'app et une vidéo démo : tu pourras les joindre à chaque brief.</Empty></div>
        : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((a) => <AssetCard key={a.id} a={a} app={appName(a.app_id)} onRemove={profile?.role === "admin" ? () => remove(a) : undefined} />)}
          </div>
        )}
    </div>
  );
}

export function AssetPreview({ a, className }: { a: Asset; className?: string }) {
  const url = assetUrl(a);
  const m = a.mime ?? "";
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden bg-[#f6f7fa]", className)}>
      {m.startsWith("image/") ? <img src={url} alt="" loading="lazy" className="h-full w-full object-contain" />
        : m.startsWith("video/") ? <video src={url} controls muted playsInline preload="metadata" className="h-full w-full object-contain" />
        : m.startsWith("audio/") ? <div className="flex w-full flex-col items-center gap-2 p-3"><FileAudio className="h-8 w-8 text-subtle-foreground" /><audio src={url} controls className="w-full" /></div>
        : a.kind === "font" ? <FileType2 className="h-10 w-10 text-subtle-foreground" />
        : a.kind === "logo" || a.kind === "screenshot" ? <ImageIcon className="h-10 w-10 text-subtle-foreground" />
        : <Package className="h-10 w-10 text-subtle-foreground" />}
    </div>
  );
}

function AssetCard({ a, app, onRemove }: { a: Asset; app: string; onRemove?: () => void }) {
  const toast = useToast();
  const url = assetUrl(a);
  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-xs">
      <AssetPreview a={a} className="aspect-square" />
      <div className="p-3">
        <p className="truncate text-[13px] font-medium text-foreground" title={a.name}>{a.name}</p>
        <p className="truncate text-[11px] text-subtle-foreground">{KIND_LABEL[a.kind]} · {app} · {fmtSize(a.size_bytes)} · {dateFr(a.created_at)}</p>
        <div className="mt-2 flex gap-1">
          <a href={`${url}?download=${encodeURIComponent(a.name)}`} className="flex-1"><Button size="sm" variant="secondary" className="w-full"><Download className="h-3.5 w-3.5" /> Télécharger</Button></a>
          <Button size="icon" variant="ghost" className="h-8 w-8" title="Copier le lien" onClick={() => { navigator.clipboard.writeText(url); toast("Lien copié", "success"); }}><Copy className="h-3.5 w-3.5" /></Button>
          {onRemove && <Button size="icon" variant="ghost" className="h-8 w-8 text-[#c42a2d]" title="Supprimer" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>}
        </div>
      </div>
    </div>
  );
}
