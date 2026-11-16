/**
 * Résumé du contrat en langage simple, dans la langue du créateur (en, fr, es, de, it, pt ; sinon en).
 * Il est placé en tête du document signé. Le texte juridique complet reste en anglais (version de référence).
 */
export interface SummaryInput {
  price: string;          // « 5 $ » déjà formaté
  rpm: string;            // « 1 $ »
  rpmViews: string;       // « 1,000 »
  bonusCap?: string | null; // « 300 $ » : plafond du bonus par vidéo
  videosPerDay: number;
  zone: string;
  companyName: string;
}

type Lang = "en" | "fr" | "es" | "de" | "it" | "pt";
const L: Record<Lang, { title: string; lines: (i: SummaryInput) => string[]; note: string }> = {
  en: {
    title: "In plain words",
    lines: (i) => [
      `You get **${i.price} per validated video** (zone ${i.zone}).`,
      `You post **${i.videosPerDay === 1 ? "1 video per day" : `${i.videosPerDay} videos per day`}** on your own TikTok / Instagram account, following the briefs in your creator space.`,
      `**Views bonus:** ${i.rpm} per ${i.rpmViews} views, counted 7 days after posting (D+7)${i.bonusCap ? `, capped at ${i.bonusCap} per video` : ""}.`,
      `You are paid **every week through Ruul**.`,
      `**Your Ruul account is your responsibility:** you set it up (bank details, identity check) and handle Ruul fees and your taxes; ${i.companyName} pays by sending the amount through Ruul.`,
      `**No fixed duration:** the agreement runs until you or ${i.companyName} end it.`,
      `**You can stop at any time** by email. Validated videos are always paid.`,
      `You work as an **independent contractor** (not an employee) and declare your own income.`,
    ],
    note: "This summary helps you understand the agreement. The full agreement below is the binding version.",
  },
  fr: {
    title: "En clair",
    lines: (i) => [
      `Tu gagnes **${i.price} par vidéo validée** (zone ${i.zone}).`,
      `Tu publies **${i.videosPerDay === 1 ? "1 vidéo par jour" : `${i.videosPerDay} vidéos par jour`}** sur ton propre compte TikTok / Instagram, en suivant les briefs de ton espace.`,
      `**Bonus aux vues :** ${i.rpm} pour ${i.rpmViews} vues, comptées 7 jours après la publication (J+7)${i.bonusCap ? `, plafonné à ${i.bonusCap} par vidéo` : ""}.`,
      `Tu es payé·e **chaque semaine via Ruul**.`,
      `**Ton compte Ruul est sous ta responsabilité :** tu le configures (IBAN, vérification d'identité) et tu gères les frais Ruul et tes impôts ; ${i.companyName} paie en envoyant le montant via Ruul.`,
      `**Pas de durée fixe :** le contrat court jusqu'à ce que toi ou ${i.companyName} y mettiez fin.`,
      `**Tu peux arrêter à tout moment** par email. Les vidéos validées sont toujours payées.`,
      `Tu travailles en **indépendant·e** (pas salarié·e) et tu déclares toi-même tes revenus.`,
    ],
    note: "Ce résumé t'aide à comprendre le contrat. Le contrat complet ci-dessous (en anglais) fait foi.",
  },
  es: {
    title: "En pocas palabras",
    lines: (i) => [
      `Ganas **${i.price} por vídeo validado** (zona ${i.zone}).`,
      `Publicas **${i.videosPerDay === 1 ? "1 video al día" : `${i.videosPerDay} videos al día`}** en tu propia cuenta de TikTok / Instagram, siguiendo los briefs de tu espacio.`,
      `**Bonus por visualizaciones:** ${i.rpm} por cada ${i.rpmViews} visualizaciones, contadas 7 días después de publicar (D+7)${i.bonusCap ? `, con un tope de ${i.bonusCap} por video` : ""}.`,
      `Cobras **cada semana a través de Ruul**.`,
      `**Tu cuenta de Ruul es tu responsabilidad:** la configuras tú (cuenta bancaria, verificación de identidad) y te encargas de las comisiones de Ruul y de tus impuestos; ${i.companyName} paga enviando el importe por Ruul.`,
      `**Sin duración fija:** el contrato sigue hasta que tú o ${i.companyName} lo terminéis.`,
      `**Puedes dejarlo cuando quieras** por email. Los vídeos validados siempre se pagan.`,
      `Trabajas como **autónomo/a** (no como empleado/a) y declaras tus propios ingresos.`,
    ],
    note: "Este resumen te ayuda a entender el contrato. El contrato completo de abajo (en inglés) es el que vale.",
  },
  de: {
    title: "Kurz und klar",
    lines: (i) => [
      `Du bekommst **${i.price} pro freigegebenem Video** (Zone ${i.zone}).`,
      `Du postest **${i.videosPerDay === 1 ? "1 Video pro Tag" : `${i.videosPerDay} Videos pro Tag`}** auf deinem eigenen TikTok-/Instagram-Konto nach den Briefings in deinem Bereich.`,
      `**Views-Bonus:** ${i.rpm} pro ${i.rpmViews} Aufrufe, gezählt 7 Tage nach dem Posten (T+7)${i.bonusCap ? `, maximal ${i.bonusCap} pro Video` : ""}.`,
      `Du wirst **jede Woche über Ruul** bezahlt.`,
      `**Dein Ruul-Konto liegt in deiner Verantwortung:** Du richtest es ein (Bankdaten, Identitätsprüfung) und trägst Ruul-Gebühren und deine Steuern; ${i.companyName} zahlt, indem der Betrag über Ruul gesendet wird.`,
      `**Keine feste Laufzeit:** Die Vereinbarung gilt, bis du oder ${i.companyName} sie beendet.`,
      `**Du kannst jederzeit per E-Mail aufhören.** Freigegebene Videos werden immer bezahlt.`,
      `Du arbeitest **selbstständig** (nicht angestellt) und versteuerst dein Einkommen selbst.`,
    ],
    note: "Diese Zusammenfassung hilft beim Verständnis. Verbindlich ist der vollständige Vertrag unten (auf Englisch).",
  },
  it: {
    title: "In parole semplici",
    lines: (i) => [
      `Guadagni **${i.price} per ogni video approvato** (zona ${i.zone}).`,
      `Pubblichi **${i.videosPerDay} video al giorno** sul tuo account TikTok / Instagram, seguendo i brief del tuo spazio.`,
      `**Bonus visualizzazioni:** ${i.rpm} ogni ${i.rpmViews} visualizzazioni, contate 7 giorni dopo la pubblicazione (G+7)${i.bonusCap ? `, con un massimo di ${i.bonusCap} per video` : ""}.`,
      `Vieni pagato/a **ogni settimana tramite Ruul**.`,
      `**Il tuo account Ruul è sotto la tua responsabilità:** lo configuri tu (IBAN, verifica dell'identità) e gestisci le commissioni Ruul e le tue tasse; ${i.companyName} paga inviando l'importo tramite Ruul.`,
      `**Nessuna durata fissa:** l'accordo dura finché tu o ${i.companyName} non lo terminate.`,
      `**Puoi smettere quando vuoi** via email. I video approvati vengono sempre pagati.`,
      `Lavori come **collaboratore/trice indipendente** (non dipendente) e dichiari tu i tuoi redditi.`,
    ],
    note: "Questo riassunto ti aiuta a capire l'accordo. Fa fede il contratto completo qui sotto (in inglese).",
  },
  pt: {
    title: "Em poucas palavras",
    lines: (i) => [
      `Você ganha **${i.price} por vídeo validado** (zona ${i.zone}).`,
      `Você publica **${i.videosPerDay === 1 ? "1 vídeo por dia" : `${i.videosPerDay} vídeos por dia`}** na sua própria conta de TikTok / Instagram, seguindo os briefs do seu espaço.`,
      `**Bônus por visualizações:** ${i.rpm} a cada ${i.rpmViews} visualizações, contadas 7 dias após a publicação (D+7)${i.bonusCap ? `, com limite de ${i.bonusCap} por vídeo` : ""}.`,
      `Você recebe **toda semana via Ruul**.`,
      `**Sua conta Ruul é sua responsabilidade:** você a configura (dados bancários, verificação de identidade) e cuida das taxas da Ruul e dos seus impostos; ${i.companyName} paga enviando o valor pela Ruul.`,
      `**Sem duração fixa:** o contrato vale até você ou a ${i.companyName} encerrá-lo.`,
      `**Você pode parar quando quiser** por email. Vídeos validados são sempre pagos.`,
      `Você trabalha como **autônomo(a)** (não é funcionário) e declara sua própria renda.`,
    ],
    note: "Este resumo ajuda você a entender o contrato. O contrato completo abaixo (em inglês) é o que vale.",
  },
};

export function summaryLanguage(lang: string | null | undefined): Lang {
  const l = (lang ?? "en").split("-")[0].toLowerCase();
  return (l in L ? l : "en") as Lang;
}

/** Bloc Markdown du résumé (titre + puces + note). */
export function contractSummary(lang: string | null | undefined, i: SummaryInput): string {
  const d = L[summaryLanguage(lang)];
  return [`## ${d.title}`, "", ...d.lines(i).map((l) => `- ${l}`), "", `*${d.note}*`].join("\n");
}

/** Document complet : résumé (langue du créateur) + résumé anglais si différent + contrat complet (anglais). */
export function composeContract(lang: string | null | undefined, i: SummaryInput, fullContract: string): { body: string; summary: string; language: Lang } {
  const language = summaryLanguage(lang);
  const summary = contractSummary(language, i);
  const parts = [summary];
  if (language !== "en") parts.push("---", contractSummary("en", i));
  parts.push("---", fullContract.trim());
  return { body: parts.join("\n\n"), summary, language };
}
