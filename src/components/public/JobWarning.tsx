import { AlertTriangle } from "lucide-react";
import { landingJob } from "@/i18n/landingJob";

/** Encadré demandé par Max (16/11) : fin de landing + juste avant l'envoi du formulaire. */
export function JobWarning({ lang, className = "" }: { lang: string; className?: string }) {
  return (
    <div role="note" className={`flex items-start gap-3 rounded-2xl border-2 border-[#fe504f] bg-[#fff1f0] px-4 py-4 text-[#a52326] sm:px-5 ${className}`}>
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-bold leading-snug tracking-[0.01em]">{landingJob(lang).warning}</p>
    </div>
  );
}
