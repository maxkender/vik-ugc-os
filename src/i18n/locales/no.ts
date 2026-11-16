import type { PublicDict } from "./types";
const no: PublicDict = {
  common: { loading: "Laster…", save: "Lagre", cancel: "Avbryt", logout: "Logg ut", error: "Noe gikk galt", language: "Språk" },
  landing: {
    badge: "Betalt creator-program",
    title: "Jobb: UGC-skaper for en mobilapp",
    subtitle: "Filmer dine egne UGC-videoer av høy kvalitet med telefonen, og legg dem ut på TikTok og Instagram for å promotere en app (en AI-studieapp til å begynne med). 1 video om dagen, betalt per godkjente video pluss en bonus for visninger.",
    perVideo: "per video", bonus: "visningsbonus", bonusDetail: "{{rpm}} per {{views}} visninger",
    cta: "Søk nå", how: "Slik fungerer det",
    steps: [
      ["Søk på 3 minutter", "Fortell oss om deg selv og spill inn en kort introvideo (en \"yap\")."],
      ["Signer kontrakten på nett", "Avtale som selvstendig creator, signert med ett klikk."],
      ["Filme og legg ut 1 video om dagen", "Du filmer din egen UGC-video av høy kvalitet med mobilen. Hver morgen får du: en brief, en referansevideo og en hook."],
      ["Få betalt hver uke", "Per video + visningsbonus, utbetalt hver uke via Ruul."],
    ],
    examples: "Eksempler på det du skal lage", faq: "Vanlige spørsmål",
    faqs: [
      ["Trenger jeg mange følgere?", "Nei. Vi bryr oss om hvordan du snakker til kamera, ikke antall følgere. En ny konto holder."],
      ["Hva trenger jeg?", "En smarttelefon, godt lys, en TikTok- eller Instagram-konto og rundt 30–45 minutter om dagen."],
      ["Hvordan får jeg betalt?", "Hver uke via Ruul (internasjonale utbetalinger til bankkontoen din). Du jobber som selvstendig."],
      ["Hvem kan søke?", "Alle som er 18 år eller eldre og bor i et av våre åpne land."],
    ],
    closed: "Søknader er ikke åpnet i landet ditt ennå.", country: "Land",
  },
  apply: {
    title: "Creator-søknad", subtitle: "3 minutter. Vi leser hver søknad selv.",
    identity: "Om deg", firstName: "Fornavn", lastName: "Etternavn", birthdate: "Fødselsdato", email: "E-post", phone: "Telefon (WhatsApp)",
    country: "Bostedsland", languages: "Språk du snakker", languagesHint: "Skilt med komma, f.eks. norsk, engelsk",
    experience: "Erfaring", ugcExperience: "Har du laget UGC / innhold før? Fortell kort.",
    tiktok: "Lenke til TikTok-profilen din", tiktokFollowers: "TikTok-følgere", instagram: "Lenke til Instagram-profilen din", instagramFollowers: "Instagram-følgere",
    equipment: "Utstyr (telefonmodell, ringlys, mikrofon…)", availability: "Tilgjengelighet (timer per dag, tidssone)", motivation: "Hvorfor vil du bli med?",
    yap: "Introvideo (\"yap\")", yapHint: "30–90 sekunder, vertikal, snakk til kamera: hvem du er og hvorfor du passer perfekt. Maks 200 MB.",
    chooseVideo: "Velg en video", uploading: "Laster opp… {{pct}} %", uploaded: "Video lastet opp ✓",
    adult: "Jeg er 18 år eller eldre", consent: "Jeg godtar at {{brand}} behandler dataene mine for å vurdere søknaden.",
    submit: "Send søknaden", success: "Søknaden er sendt! Sjekk innboksen: Vi har nettopp sendt deg en bekreftelse.",
    errors: { underage: "Du må være minst 18 år.", already_applied: "Du har allerede søkt med denne e-posten.", yap_video: "Last opp introvideoen din.", country_closed: "Søknader er stengt i dette landet.", generic: "Sjekk de markerte feltene." },
  },
  sign: {
    title: "Din creator-kontrakt", read: "Les hele kontrakten før du signerer.",
    typeName: "Skriv fullt navn for å signere", typeNameHint: "Må stemme med: {{name}}", accept: "Jeg har lest og godtar denne kontrakten.",
    warn: "Ikke signer hvis du ikke ønsker å fortsette.", button: "Signer kontrakten",
    signed: "Kontrakten ble signert {{date}}. Takk! Sjekk e-posten din for tilgang.", download: "Last ned signert PDF",
    expired: "Denne lenken har utløpt. Ta kontakt hvis du fortsatt vil være med.", notFound: "Fant ikke kontrakten.",
    errors: { name_mismatch: "Navnet stemmer ikke med søknaden.", not_accepted: "Kryss av i boksen.", expired: "Kontrakten har utløpt.", hash_mismatch: "Dokumentet er endret, last inn siden på nytt." },
  },
};
export default no;
