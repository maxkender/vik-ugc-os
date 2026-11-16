import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BookOpen, CheckCircle2, Clapperboard, Flame, Megaphone, Smartphone, XCircle } from "lucide-react";
import { guideText } from "@/i18n/guide";

/** Guide vidéo du posteur (16/11, Max), dans sa langue : format, contenu, démo, publication, validation, warm-up. */
export default function Guide() {
  const { i18n } = useTranslation();
  const G = guideText(i18n.resolvedLanguage);
  const g = G.guide;
  const List = ({ items }: { items: string[] }) => <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-foreground">{items.map((x) => <li key={x}>{x}</li>)}</ul>;
  const Card = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
    <section className="rounded-2xl border bg-white p-5 shadow-xs">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground"><span className="text-accent [&>svg]:h-4 [&>svg]:w-4">{icon}</span>{title}</h2>
      {children}
    </section>
  );
  return (
    <div className="space-y-5" data-testid="creator-guide">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-[-0.01em] text-foreground"><BookOpen className="h-5 w-5 text-accent" />{g.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.intro}</p>
      </header>
      <Card icon={<Flame />} title={G.warmup.title}>
        <p className="mt-2 text-[14px] leading-relaxed text-foreground">{G.warmup.why}</p>
        <p className="mt-3 text-[13px] font-semibold text-[#a52326]">{G.warmup.dontsTitle}</p>
        <List items={G.warmup.donts} />
        <Link to="/creator/account#warmup" className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline">{G.warmup.goToWarmup} →</Link>
      </Card>
      <Card icon={<Clapperboard />} title={g.formatTitle}><List items={g.format} /></Card>
      <Card icon={<Clapperboard />} title={g.contentTitle}>
        <List items={g.content} />
        <div className="mt-3 rounded-xl bg-tint-blue px-4 py-3"><p className="text-xs font-semibold text-[#0040d6]">{g.appTitle}</p><p className="mt-1 text-[14px] text-foreground">{g.appText}</p></div>
      </Card>
      <Card icon={<Smartphone />} title={g.demoTitle}><List items={g.demo} /></Card>
      <Card icon={<Megaphone />} title={g.publishTitle}><List items={g.publish} /></Card>
      <Card icon={<CheckCircle2 />} title={g.validationTitle}>
        <p className="mt-2 text-[14px] text-foreground">{g.validationIntro}</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[14px] text-foreground">{g.checks.map((x) => <li key={x}>{x}</li>)}</ol>
        <div className="mt-4 space-y-2">
          {g.examplesGood.map((x) => <p key={x} className="flex gap-2 rounded-xl bg-tint-green px-4 py-3 text-[13px] text-[#0b5c2e]"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{x}</p>)}
          <p className="flex gap-2 rounded-xl bg-tint-red px-4 py-3 text-[13px] text-[#a52326]"><XCircle className="mt-0.5 h-4 w-4 shrink-0" />{g.exampleBad}</p>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">{g.missedDay}</p>
      </Card>
    </div>
  );
}
