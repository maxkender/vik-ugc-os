import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, AtSign } from "lucide-react";
import { Badge, Button, Card, Empty, Field, Input, Select } from "@/components/ui";
import { useApps } from "@/lib/hooks";
import { bioFor, displayNameFor, generateHandles } from "@shared/handles.ts";

const LANGS = ["en", "fr", "es", "de", "it", "pt"];

/** Aperçu des pseudos, noms affichés et bios générés pour chaque app ; l'édition se fait dans Réglages → Apps. */
export function BiosTab() {
  const { data: apps } = useApps();
  const [person, setPerson] = useState({ first: "Léa", last: "Martin", lang: "fr" });
  if (!apps?.length) return <Empty title="Aucune app" icon={<AtSign className="h-5 w-5" />}>Ajoute une app dans Réglages → Apps.</Empty>;
  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-end gap-3">
        <Field label="Prénom"><Input value={person.first} onChange={(e) => setPerson({ ...person, first: e.target.value })} /></Field>
        <Field label="Nom"><Input value={person.last} onChange={(e) => setPerson({ ...person, last: e.target.value })} /></Field>
        <Field label="Langue du posteur">
          <Select value={person.lang} onChange={(e) => setPerson({ ...person, lang: e.target.value })}>{LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</Select>
        </Field>
        <Link to="/admin/settings/apps" className="ml-auto"><Button variant="secondary">Modifier les modèles dans Apps <ArrowUpRight className="h-4 w-4" /></Button></Link>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {apps.filter((a: any) => a.active).map((a: any) => {
          const c = { app: a.name, first: person.first, last: person.last };
          const handles = generateHandles(a.handle_patterns ?? [], c, 6);
          const name = displayNameFor(a.display_name_pattern, c);
          const bio = bioFor(a.bio_templates, person.lang, c);
          const hasLang = !!a.bio_templates?.[person.lang];
          return (
            <Card key={a.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <p className="text-[15px] font-semibold">{a.name}</p>
                {!hasLang && <Badge tone="warning">Bio {person.lang.toUpperCase()} manquante (repli EN)</Badge>}
              </div>
              {/* Profil tel qu'il apparaîtra sur TikTok / Instagram */}
              <div className="flex gap-4 rounded-xl border border-separator bg-muted p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2f6bff] to-[#7a32ef] text-xl font-semibold text-white">{person.first.slice(0, 1).toUpperCase()}</div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{name}</p>
                  <p className="text-[13px] text-muted-foreground">@{handles[0] ?? "—"}</p>
                  <p className="mt-2 whitespace-pre-line text-[13px] text-foreground">{bio}</p>
                  {a.link_in_bio && <p className="mt-1 truncate text-[13px] font-medium text-[#0040d6]">{a.link_in_bio}</p>}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Pseudos proposés</p>
                <div className="flex flex-wrap gap-1.5">{handles.map((h) => <span key={h} className="rounded-md bg-[#f1f3f7] px-2 py-1 font-mono text-[12px] text-foreground">@{h}</span>)}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
