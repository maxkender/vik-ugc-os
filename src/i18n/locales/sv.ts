import type { PublicDict } from "./types";
const sv: PublicDict = {
  common: { loading: "Laddar…", save: "Spara", cancel: "Avbryt", logout: "Logga ut", error: "Något gick fel", language: "Språk" },
  landing: {
    badge: "Betalt creator-program",
    title: "Jobb: UGC-skapare för en mobilapp",
    subtitle: "Filma dina egna UGC-videor av hög kvalitet med mobilen och posta dem på TikTok och Instagram för att marknadsföra en app (en AI-studieapp till att börja med). 1 video om dagen, betalt per godkänd video plus en bonus för visningar.",
    perVideo: "per video", bonus: "visningsbonus", bonusDetail: "{{rpm}} per {{views}} visningar",
    cta: "Ansök nu", how: "Så funkar det",
    steps: [
      ["Ansök på 3 minuter", "Berätta om dig själv och spela in en kort introvideo (en \"yap\")."],
      ["Skriv under avtalet online", "Avtal som egenföretagande creator, signerat med ett klick."],
      ["Filma och posta 1 video om dagen", "Du filmar din egen UGC-video med hög kvalitet med mobilen. Varje morgon får du: en brief, en referensvideo och en hook."],
      ["Få betalt varje vecka", "Per video + visningsbonus, utbetalt varje vecka via Ruul."],
    ],
    examples: "Exempel på det du kommer att göra", faq: "Vanliga frågor",
    faqs: [
      ["Behöver jag många följare?", "Nej. Vi bryr oss om hur du pratar i kameran, inte antalet följare. Ett nytt konto funkar."],
      ["Vad behöver jag?", "En smartphone, bra ljus, ett TikTok- eller Instagram-konto och ungefär 30–45 minuter om dagen."],
      ["Hur får jag betalt?", "Varje vecka via Ruul (internationella utbetalningar till ditt bankkonto). Du arbetar som egenföretagare."],
      ["Vem kan ansöka?", "Alla som är 18 år eller äldre och bor i något av våra öppna länder."],
    ],
    closed: "Ansökningarna har inte öppnat i ditt land än.", country: "Land",
  },
  apply: {
    title: "Creator-ansökan", subtitle: "3 minuter. Vi läser varje ansökan personligen.",
    identity: "Om dig", firstName: "Förnamn", lastName: "Efternamn", birthdate: "Födelsedatum", email: "E-post", phone: "Telefon (WhatsApp)",
    country: "Bosättningsland", languages: "Språk du talar", languagesHint: "Separerade med kommatecken, t.ex. svenska, engelska",
    experience: "Erfarenhet", ugcExperience: "Har du gjort UGC / innehåll förut? Berätta kort.",
    tiktok: "Länk till din TikTok-profil", tiktokFollowers: "TikTok-följare", instagram: "Länk till din Instagram-profil", instagramFollowers: "Instagram-följare",
    equipment: "Utrustning (telefonmodell, ringlampa, mikrofon…)", availability: "Tillgänglighet (timmar per dag, tidszon)", motivation: "Varför vill du vara med?",
    yap: "Introvideo (\"yap\")", yapHint: "30–90 sekunder, stående, prata i kameran: vem du är och varför du är perfekt. Max 200 MB.",
    chooseVideo: "Välj en video", uploading: "Laddar upp… {{pct}} %", uploaded: "Video uppladdad ✓",
    adult: "Jag är 18 år eller äldre", consent: "Jag godkänner att {{brand}} behandlar mina uppgifter för att granska min ansökan.",
    submit: "Skicka ansökan", success: "Ansökan skickad! Kolla din inkorg: vi har precis skickat en bekräftelse.",
    errors: { underage: "Du måste vara minst 18 år.", already_applied: "Du har redan ansökt med den här e-postadressen.", yap_video: "Ladda upp din introvideo.", country_closed: "Ansökningarna är stängda i det här landet.", generic: "Kontrollera de markerade fälten." },
  },
  sign: {
    title: "Ditt creator-avtal", read: "Läs hela avtalet innan du skriver under.",
    typeName: "Skriv ditt fullständiga namn för att signera", typeNameHint: "Måste stämma med: {{name}}", accept: "Jag har läst och godkänner detta avtal.",
    warn: "Skriv inte under om du inte vill fortsätta.", button: "Skriv under avtalet",
    signed: "Avtalet signerades {{date}}. Tack! Kolla din e-post för inloggning.", download: "Ladda ner signerad PDF",
    expired: "Länken har gått ut. Hör av dig om du fortfarande vill vara med.", notFound: "Avtalet hittades inte.",
    errors: { name_mismatch: "Namnet stämmer inte med ansökan.", not_accepted: "Kryssa i rutan.", expired: "Avtalet har gått ut.", hash_mismatch: "Dokumentet har ändrats, ladda om sidan." },
  },
};
export default sv;
