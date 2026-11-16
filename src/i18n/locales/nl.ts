import type { PublicDict } from "./types";
const nl: PublicDict = {
  common: { loading: "Laden…", save: "Opslaan", cancel: "Annuleren", logout: "Uitloggen", error: "Er ging iets mis", language: "Taal" },
  landing: {
    badge: "Betaald creatorprogramma",
    title: "Job: UGC-contentmaker voor een mobiele app",
    subtitle: "Film zelf kwalitatieve UGC-video's met je telefoon en post ze op TikTok en Instagram om een app te promoten (om te beginnen een AI-studieapp). 1 video per dag, betaald per goedgekeurde video plus een bonus op basis van views.",
    perVideo: "per video", bonus: "viewsbonus", bonusDetail: "{{rpm}} per {{views}} views",
    cta: "Nu solliciteren", how: "Zo werkt het",
    steps: [
      ["Solliciteer in 3 minuten", "Vertel iets over jezelf en neem een korte introvideo op (een \"yap\")."],
      ["Teken je contract online", "Overeenkomst als zelfstandige creator, in één klik getekend."],
      ["Film en post 1 video per dag", "Je filmt zelf een kwalitatieve UGC-video met je telefoon. Elke ochtend krijg je: een brief, een referentievideo en een hook."],
      ["Elke week betaald", "Per video + viewsbonus, wekelijks uitbetaald via Ruul."],
    ],
    examples: "Voorbeelden van wat je maakt", faq: "Veelgestelde vragen",
    faqs: [
      ["Heb ik veel volgers nodig?", "Nee. Het gaat ons om hoe je voor de camera praat, niet om je aantal volgers. Een nieuw account is prima."],
      ["Wat heb ik nodig?", "Een smartphone, goed licht, een TikTok- of Instagram-account en zo'n 30–45 minuten per dag."],
      ["Hoe word ik betaald?", "Wekelijks via Ruul (internationale uitbetaling op je bankrekening). Je werkt als zelfstandige."],
      ["Wie kan solliciteren?", "Iedereen van 18 jaar of ouder die in een van onze open landen woont."],
    ],
    closed: "Aanmelden is in jouw land nog niet mogelijk.", country: "Land",
  },
  apply: {
    title: "Creator-sollicitatie", subtitle: "3 minuten. We bekijken elke sollicitatie persoonlijk.",
    identity: "Over jou", firstName: "Voornaam", lastName: "Achternaam", birthdate: "Geboortedatum", email: "E-mail", phone: "Telefoon (WhatsApp)",
    country: "Woonland", languages: "Talen die je spreekt", languagesHint: "Gescheiden door komma's, bijv. Nederlands, Engels",
    experience: "Ervaring", ugcExperience: "Heb je al eerder UGC / content gemaakt? Vertel het kort.",
    tiktok: "Link naar je TikTok-profiel", tiktokFollowers: "TikTok-volgers", instagram: "Link naar je Instagram-profiel", instagramFollowers: "Instagram-volgers",
    equipment: "Apparatuur (telefoonmodel, ringlamp, microfoon…)", availability: "Beschikbaarheid (uren per dag, tijdzone)", motivation: "Waarom wil je meedoen?",
    yap: "Introvideo (\"yap\")", yapHint: "30–90 seconden, verticaal, praten in de camera: wie je bent en waarom je perfect bent. Max. 200 MB.",
    chooseVideo: "Kies een video", uploading: "Uploaden… {{pct}}%", uploaded: "Video geüpload ✓",
    adult: "Ik ben 18 jaar of ouder", consent: "Ik ga ermee akkoord dat {{brand}} mijn gegevens verwerkt om mijn sollicitatie te beoordelen.",
    submit: "Sollicitatie versturen", success: "Sollicitatie verstuurd! Check je inbox: we hebben je net een bevestiging gestuurd.",
    errors: { underage: "Je moet 18 jaar of ouder zijn.", already_applied: "Je hebt al gesolliciteerd met dit e-mailadres.", yap_video: "Upload je introvideo.", country_closed: "Aanmelden is gesloten in dit land.", generic: "Controleer de gemarkeerde velden." },
  },
  sign: {
    title: "Je creatorcontract", read: "Lees het hele contract voordat je tekent.",
    typeName: "Typ je volledige naam om te tekenen", typeNameHint: "Moet overeenkomen met: {{name}}", accept: "Ik heb dit contract gelezen en ga ermee akkoord.",
    warn: "Teken niet als je niet verder wilt.", button: "Contract tekenen",
    signed: "Contract getekend op {{date}}. Bedankt! Je toegang komt per e-mail.", download: "Getekende pdf downloaden",
    expired: "Deze link is verlopen. Neem contact met ons op als je nog mee wilt doen.", notFound: "Contract niet gevonden.",
    errors: { name_mismatch: "De naam komt niet overeen met de sollicitatie.", not_accepted: "Vink het vakje aan.", expired: "Dit contract is verlopen.", hash_mismatch: "Het document is gewijzigd, laad de pagina opnieuw." },
  },
};
export default nl;
