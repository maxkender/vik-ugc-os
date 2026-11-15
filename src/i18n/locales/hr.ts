import type { PublicDict } from "./types";
const hr: PublicDict = {
  common: { loading: "Učitavanje…", save: "Spremi", cancel: "Odustani", logout: "Odjava", error: "Nešto je pošlo po zlu", language: "Jezik" },
  landing: {
    badge: "Plaćeni program za kreatore",
    title: "Zarađuj snimanjem videa. Postani {{brand}} kreator.",
    subtitle: "Objavljuj 2 kratka videa dnevno o aplikacijama koje studenti obožavaju. Zaradi {{price}} po videu, plus bonus za preglede.",
    perVideo: "po videu", bonus: "bonus za preglede", bonusDetail: "{{rpm}} za {{views}} pregleda",
    monthly: "do {{amount}}/mjesečno", monthlyHint: "2 videa dnevno, bez bonusa",
    cta: "Prijavi se", how: "Kako funkcionira",
    steps: [
      ["Prijavi se za 3 minute", "Reci nam nešto o sebi i snimi kratki video predstavljanja (tzv. „yap”)."],
      ["Potpiši ugovor online", "Ugovor za samostalnog kreatora, potpisan jednim klikom."],
      ["Objavljuj 2 videa dnevno", "Svako jutro dobivaš 2 briefa: referentni video, hook i jednostavne upute."],
      ["Isplata svaki tjedan", "Po videu + bonus za preglede, isplaćuje se tjedno putem Ruula."],
    ],
    examples: "Primjeri videa koje ćeš raditi", faq: "Česta pitanja",
    faqs: [
      ["Trebam li puno pratitelja?", "Ne. Važno nam je kako pričaš pred kamerom, a ne broj pratitelja. I novi račun je dovoljan."],
      ["Što mi treba?", "Pametni telefon, dobro svjetlo, TikTok ili Instagram račun i oko 30–45 minuta dnevno."],
      ["Kako dobivam isplatu?", "Svaki tjedan putem Ruula (međunarodne isplate na tvoj bankovni račun). Radiš kao samostalni kreator."],
      ["Tko se može prijaviti?", "Svi s navršenih 18 godina koji žive u nekoj od naših otvorenih zemalja."],
    ],
    closed: "Prijave u tvojoj zemlji još nisu otvorene.", country: "Zemlja",
  },
  apply: {
    title: "Prijava za kreatore", subtitle: "3 minute. Svaku prijavu čitamo osobno.",
    identity: "O tebi", firstName: "Ime", lastName: "Prezime", birthdate: "Datum rođenja", email: "E-mail", phone: "Telefon (WhatsApp)",
    country: "Zemlja prebivališta", languages: "Jezici koje govoriš", languagesHint: "Odvojeni zarezom, npr. hrvatski, engleski",
    experience: "Iskustvo", ugcExperience: "Jesi li već radio/la UGC / sadržaj? Ukratko opiši.",
    tiktok: "Poveznica na tvoj TikTok profil", tiktokFollowers: "Pratitelji na TikToku", instagram: "Poveznica na tvoj Instagram profil", instagramFollowers: "Pratitelji na Instagramu",
    equipment: "Oprema (model mobitela, ring svjetlo, mikrofon…)", availability: "Dostupnost (sati dnevno, vremenska zona)", motivation: "Zašto nam se želiš pridružiti?",
    yap: "Video predstavljanja („yap”)", yapHint: "30–90 sekundi, okomito, pričaj u kameru: tko si i zašto bi bio/la super. Najviše 200 MB.",
    chooseVideo: "Odaberi video", uploading: "Učitavanje… {{pct}} %", uploaded: "Video učitan ✓",
    adult: "Imam 18 ili više godina", consent: "Pristajem da {{brand}} obrađuje moje podatke radi procjene prijave.",
    submit: "Pošalji prijavu", success: "Prijava poslana! Provjeri e-mail: upravo smo ti poslali potvrdu.",
    errors: { underage: "Moraš imati najmanje 18 godina.", already_applied: "S ovim e-mailom već si se prijavio/la.", yap_video: "Učitaj svoj video predstavljanja.", country_closed: "Prijave su u ovoj zemlji zatvorene.", generic: "Provjeri označena polja." },
  },
  sign: {
    title: "Tvoj ugovor kreatora", read: "Prije potpisivanja pročitaj cijeli ugovor.",
    typeName: "Za potpis upiši svoje puno ime", typeNameHint: "Mora odgovarati: {{name}}", accept: "Pročitao/la sam ugovor i prihvaćam ga.",
    warn: "Ne potpisuj ako ne želiš nastaviti.", button: "Potpiši ugovor",
    signed: "Ugovor potpisan {{date}}. Hvala! Pristup ti šaljemo e-mailom.", download: "Preuzmi potpisani PDF",
    expired: "Ova poveznica je istekla. Javi nam se ako se i dalje želiš pridružiti.", notFound: "Ugovor nije pronađen.",
    errors: { name_mismatch: "Ime ne odgovara prijavi.", not_accepted: "Označi kućicu.", expired: "Ovaj ugovor je istekao.", hash_mismatch: "Dokument se promijenio, osvježi stranicu." },
  },
};
export default hr;
