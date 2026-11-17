import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { CheckCircle2, Upload } from "lucide-react";
import { ANON_KEY, SUPABASE_URL, callFn } from "@/lib/supabase";
import type { LandingJob } from "@/i18n/landingJob";
import { yapFileCheck, yapLinkProvider } from "@shared/yapVideo.ts";

/**
 * Vidéo de présentation : fichier (upload résumable, formats iPhone acceptés par extension) OU lien de secours.
 * Utilisé par la page /apply/video/<token> (candidature envoyée sans vidéo).
 */
export function YapUpload({ lj, country, labels, onChange }: {
  lj: LandingJob; country: string | null; labels: { choose: string; uploaded: string; uploading: (pct: number) => string };
  onChange: (v: { path: string | null; url: string | null }) => void;
}) {
  const [path, setPath] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [url, setUrl] = useState("");
  const ref = useRef<tus.Upload | null>(null);
  const linkOk = !!url.trim() && !!yapLinkProvider(url);
  const log = (file: File, err: string) => callFn("apply", { action: "upload_failure", size: file.size, mime: file.type, ext: (file.name.split(".").pop() ?? "").slice(0, 12), error: err, country }).catch(() => {});

  const upload = (file: File) => {
    setError(null); setPath(null); onChange({ path: null, url: linkOk ? url.trim() : null });
    const check = yapFileCheck(file.name, file.type, file.size);
    if (!check.ok) { setError(check.reason === "size" ? lj.yapSizeError : lj.yapTypeError); setShowLink(true); log(file, `client_${check.reason}`); return; }
    const objectName = `pending/${crypto.randomUUID()}.${check.ext}`;
    ref.current?.abort();
    const up = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`, retryDelays: [0, 3000, 5000, 10000, 20000],
      headers: { authorization: `Bearer ${ANON_KEY}`, apikey: ANON_KEY, "x-upsert": "false" }, uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      metadata: { bucketName: "yap-videos", objectName, contentType: check.contentType, cacheControl: "3600" }, chunkSize: 6 * 1024 * 1024,
      onError: (e) => { setProgress(null); setError(lj.yapUploadFailed); setShowLink(true); log(file, String(e?.message ?? e).slice(0, 300)); },
      onProgress: (sent, total) => setProgress(Math.round((sent / total) * 100)),
      onSuccess: () => { setProgress(100); setPath(objectName); onChange({ path: objectName, url: null }); },
    });
    ref.current = up;
    setProgress(0);
    up.findPreviousUploads().then((prev) => { if (prev.length) up.resumeFromPreviousUpload(prev[0]); up.start(); });
  };

  return (
    <div className="space-y-3">
      <label className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center ${path ? "border-[#bfe8cd] bg-tint-green" : "border-border-strong bg-muted hover:border-[#cddcff] hover:bg-accent-soft"}`}>
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white ${path ? "text-success" : "text-accent shadow-xs"}`}>{path ? <CheckCircle2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</span>
        <span className="text-sm font-semibold text-foreground">{path ? labels.uploaded : labels.choose}</span>
        <span className="text-xs text-subtle-foreground">MP4 · MOV · ≤ 200 MB</span>
        <input type="file" accept="video/*,.mov,.mp4,.m4v,.hevc,.qt" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </label>
      {progress !== null && !path && (
        <div><div className="h-1.5 overflow-hidden rounded-full bg-[#f1f3f7]"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="mt-1 text-xs text-muted-foreground">{labels.uploading(progress)}</p></div>
      )}
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      {!path && (
        <div className="rounded-xl border border-border-strong bg-white p-3" data-testid="yap-link">
          {!showLink ? <button type="button" className="text-sm font-medium text-accent hover:underline" onClick={() => setShowLink(true)}>{lj.yapLinkToggle} →</button> : (
            <>
              <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="yap-url">{lj.yapLinkLabel}</label>
              <input id="yap-url" type="url" inputMode="url" value={url} placeholder="https://youtube.com/…"
                onChange={(e) => { setUrl(e.target.value); const ok = !!yapLinkProvider(e.target.value); onChange({ path: null, url: ok ? e.target.value.trim() : null }); }}
                className="h-12 w-full rounded-lg border border-border-strong bg-white px-3.5 text-[15px] focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10" />
              <p className={`mt-1.5 text-xs ${url.trim() && !linkOk ? "text-danger" : linkOk ? "text-success" : "text-subtle-foreground"}`}>{url.trim() && !linkOk ? lj.yapLinkInvalid : linkOk ? lj.yapLinkOk : lj.yapLinkHint}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
