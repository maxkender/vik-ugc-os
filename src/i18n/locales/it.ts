import type { PublicDict } from "./types";
const it: PublicDict = {
  common: { loading: "Caricamento…", save: "Salva", cancel: "Annulla", logout: "Esci", error: "Qualcosa è andato storto", language: "Lingua" },
  landing: {
    badge: "Programma creator retribuito",
    title: "Lavoro: creator di contenuti UGC per un'app mobile",
    subtitle: "Giri i tuoi video UGC di qualità con il telefono e li pubblichi su TikTok e Instagram per promuovere un'app (per iniziare, un'app di studio con IA). 1 video al giorno, pagato per ogni video validato più un bonus sulle visualizzazioni.",
    perVideo: "a video", bonus: "bonus visualizzazioni", bonusDetail: "{{rpm}} ogni {{views}} visualizzazioni",
    cta: "Candidati ora", how: "Come funziona",
    steps: [
      ["Candidati in 3 minuti", "Raccontaci di te e registra un breve video di presentazione (uno \"yap\")."],
      ["Firma il contratto online", "Contratto da creator indipendente, firmato in un clic."],
      ["Gira e pubblica 1 video al giorno", "Giri con il telefono il tuo video UGC di qualità. Ogni mattina ricevi: un brief, un video di riferimento e un hook."],
      ["Pagamento ogni settimana", "A video + bonus visualizzazioni, pagato ogni settimana tramite Ruul."],
    ],
    examples: "Esempi di video che farai", faq: "Domande frequenti",
    faqs: [
      ["Servono tanti follower?", "No. Ci interessa come parli in camera, non quanti follower hai. Va bene anche un account nuovo."],
      ["Cosa mi serve?", "Uno smartphone, una buona luce, un account TikTok o Instagram e circa 30–45 minuti al giorno."],
      ["Come vengo pagato/a?", "Ogni settimana tramite Ruul (pagamenti internazionali sul tuo conto). Lavori come collaboratore indipendente."],
      ["Chi può candidarsi?", "Chiunque abbia almeno 18 anni e viva in uno dei nostri paesi aperti."],
    ],
    closed: "Le candidature non sono ancora aperte nel tuo paese.", country: "Paese",
  },
  apply: {
    title: "Candidatura creator", subtitle: "3 minuti. Leggiamo ogni candidatura personalmente.",
    identity: "Su di te", firstName: "Nome", lastName: "Cognome", birthdate: "Data di nascita", email: "Email", phone: "Telefono (WhatsApp)",
    country: "Paese di residenza", languages: "Lingue che parli", languagesHint: "Separate da virgole, es. Italiano, Inglese",
    experience: "Esperienza", ugcExperience: "Hai già fatto UGC / contenuti? Raccontacelo in breve.",
    tiktok: "Link al tuo profilo TikTok", tiktokFollowers: "Follower TikTok", instagram: "Link al tuo profilo Instagram", instagramFollowers: "Follower Instagram",
    equipment: "Attrezzatura (modello di telefono, ring light, microfono…)", availability: "Disponibilità (ore al giorno, fuso orario)", motivation: "Perché vuoi unirti a noi?",
    yap: "Video di presentazione (\"yap\")", yapHint: "30–90 secondi, verticale, parlando in camera: chi sei e perché saresti perfetto/a. Max 200 MB.",
    chooseVideo: "Scegli un video", uploading: "Caricamento… {{pct}}%", uploaded: "Video caricato ✓",
    adult: "Ho almeno 18 anni", consent: "Accetto che {{brand}} tratti i miei dati per valutare la mia candidatura.",
    submit: "Invia la candidatura", success: "Candidatura inviata! Controlla la tua email: ti abbiamo appena mandato una conferma.",
    errors: { underage: "Devi avere almeno 18 anni.", already_applied: "Ti sei già candidato/a con questa email.", yap_video: "Carica il tuo video di presentazione.", country_closed: "Le candidature sono chiuse in questo paese.", generic: "Controlla i campi evidenziati." },
  },
  sign: {
    title: "Il tuo contratto da creator", read: "Leggi tutto il contratto prima di firmare.",
    typeName: "Scrivi il tuo nome completo per firmare", typeNameHint: "Deve corrispondere a: {{name}}", accept: "Ho letto e accetto questo contratto.",
    warn: "Non firmare se non vuoi continuare.", button: "Firma il contratto",
    signed: "Contratto firmato il {{date}}. Grazie! Controlla la tua email per gli accessi.", download: "Scarica il PDF firmato",
    expired: "Questo link è scaduto. Scrivici se vuoi ancora unirti a noi.", notFound: "Contratto non trovato.",
    errors: { name_mismatch: "Il nome non corrisponde alla candidatura.", not_accepted: "Spunta la casella.", expired: "Questo contratto è scaduto.", hash_mismatch: "Il documento è cambiato, ricarica la pagina." },
  },
};
export default it;
