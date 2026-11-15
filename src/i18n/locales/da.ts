import type { PublicDict } from "./types";
const da: PublicDict = {
  common: { loading: "Indlæser…", save: "Gem", cancel: "Annuller", logout: "Log ud", error: "Noget gik galt", language: "Sprog" },
  landing: {
    badge: "Betalt creator-program",
    title: "Få penge for at lave videoer. Bliv {{brand}}-creator.",
    subtitle: "Læg 2 korte videoer op om dagen om apps, som studerende elsker. Tjen {{price}} pr. video plus en bonus for dine visninger.",
    perVideo: "pr. video", bonus: "visningsbonus", bonusDetail: "{{rpm}} pr. {{views}} visninger",
    monthly: "op til {{amount}}/måned", monthlyHint: "2 videoer om dagen, uden visningsbonus",
    cta: "Ansøg nu", how: "Sådan fungerer det",
    steps: [
      ["Ansøg på 3 minutter", "Fortæl os om dig selv, og optag en kort introvideo (en \"yap\")."],
      ["Underskriv kontrakten online", "Aftale som selvstændig creator, underskrevet med ét klik."],
      ["Læg 2 videoer op om dagen", "Hver morgen får du 2 briefs: en referencevideo, et hook og enkle instruktioner."],
      ["Få løn hver uge", "Pr. video + visningsbonus, udbetalt hver uge via Ruul."],
    ],
    examples: "Eksempler på det, du skal lave", faq: "Ofte stillede spørgsmål",
    faqs: [
      ["Skal jeg have mange følgere?", "Nej. Vi går op i, hvordan du taler til kameraet, ikke antallet af følgere. En ny konto er fin."],
      ["Hvad skal jeg bruge?", "En smartphone, godt lys, en TikTok- eller Instagram-konto og omkring 30–45 minutter om dagen."],
      ["Hvordan får jeg betaling?", "Hver uge via Ruul (internationale udbetalinger til din bankkonto). Du arbejder som selvstændig."],
      ["Hvem kan ansøge?", "Alle på 18 år eller derover, der bor i et af vores åbne lande."],
    ],
    closed: "Der er endnu ikke åbent for ansøgninger i dit land.", country: "Land",
  },
  apply: {
    title: "Creator-ansøgning", subtitle: "3 minutter. Vi læser hver ansøgning personligt.",
    identity: "Om dig", firstName: "Fornavn", lastName: "Efternavn", birthdate: "Fødselsdato", email: "E-mail", phone: "Telefon (WhatsApp)",
    country: "Bopælsland", languages: "Sprog, du taler", languagesHint: "Adskilt med komma, fx dansk, engelsk",
    experience: "Erfaring", ugcExperience: "Har du lavet UGC / content før? Fortæl kort om det.",
    tiktok: "Link til din TikTok-profil", tiktokFollowers: "TikTok-følgere", instagram: "Link til din Instagram-profil", instagramFollowers: "Instagram-følgere",
    equipment: "Udstyr (telefonmodel, ringlys, mikrofon…)", availability: "Tilgængelighed (timer om dagen, tidszone)", motivation: "Hvorfor vil du være med?",
    yap: "Introvideo (\"yap\")", yapHint: "30–90 sekunder, lodret, tal til kameraet: hvem du er, og hvorfor du er perfekt. Maks. 200 MB.",
    chooseVideo: "Vælg en video", uploading: "Uploader… {{pct}} %", uploaded: "Video uploadet ✓",
    adult: "Jeg er 18 år eller ældre", consent: "Jeg accepterer, at {{brand}} behandler mine data for at vurdere min ansøgning.",
    submit: "Send ansøgning", success: "Ansøgning sendt! Tjek din indbakke: Vi har lige sendt dig en bekræftelse.",
    errors: { underage: "Du skal være mindst 18 år.", already_applied: "Du har allerede ansøgt med denne e-mail.", yap_video: "Upload din introvideo.", country_closed: "Der er lukket for ansøgninger i dette land.", generic: "Tjek de markerede felter." },
  },
  sign: {
    title: "Din creator-kontrakt", read: "Læs hele kontrakten, før du skriver under.",
    typeName: "Skriv dit fulde navn for at underskrive", typeNameHint: "Skal matche: {{name}}", accept: "Jeg har læst og accepterer denne kontrakt.",
    warn: "Skriv ikke under, hvis du ikke vil fortsætte.", button: "Underskriv kontrakten",
    signed: "Kontrakt underskrevet den {{date}}. Tak! Tjek din e-mail for adgang.", download: "Download den underskrevne PDF",
    expired: "Linket er udløbet. Kontakt os, hvis du stadig vil være med.", notFound: "Kontrakten blev ikke fundet.",
    errors: { name_mismatch: "Navnet matcher ikke ansøgningen.", not_accepted: "Sæt flueben i feltet.", expired: "Kontrakten er udløbet.", hash_mismatch: "Dokumentet er ændret, genindlæs siden." },
  },
};
export default da;
