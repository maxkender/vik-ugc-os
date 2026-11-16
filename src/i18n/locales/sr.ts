import type { PublicDict } from "./types";
// Srpski (latinica, kao što je uobičajeno na društvenim mrežama).
const sr: PublicDict = {
  common: { loading: "Učitavanje…", save: "Sačuvaj", cancel: "Otkaži", logout: "Odjavi se", error: "Nešto nije u redu", language: "Jezik" },
  landing: {
    badge: "Plaćeni program za kreatore",
    title: "Posao: UGC kreator sadržaja za mobilnu aplikaciju",
    subtitle: "Snimaš sopstvene kvalitetne UGC video-snimke telefonom i objavljuješ ih na TikTok-u i Instagramu da promovišeš aplikaciju (za početak, AI aplikaciju za učenje). 1 video dnevno, plaća se po odobrenom videu plus bonus na preglede.",
    perVideo: "po videu", bonus: "bonus za preglede", bonusDetail: "{{rpm}} na {{views}} pregleda",
    cta: "Prijavi se", how: "Kako funkcioniše",
    steps: [
      ["Prijavi se za 3 minuta", "Reci nam nešto o sebi i snimi kratak video predstavljanja (tzv. „yap”)."],
      ["Potpiši ugovor onlajn", "Ugovor za samostalnog kreatora, potpisan jednim klikom."],
      ["Snimi i objavi 1 video dnevno", "Sam snimaš kvalitetan UGC video svojim telefonom. Svako jutro dobiješ: brif, referentni video i hook."],
      ["Isplata svake nedelje", "Po videu + bonus za preglede, isplaćuje se nedeljno preko Ruula."],
    ],
    examples: "Primeri videa koje ćeš praviti", faq: "Česta pitanja",
    faqs: [
      ["Da li mi treba mnogo pratilaca?", "Ne. Bitno nam je kako pričaš pred kamerom, a ne broj pratilaca. I nov nalog je dovoljan."],
      ["Šta mi je potrebno?", "Pametni telefon, dobro svetlo, TikTok ili Instagram nalog i oko 30–45 minuta dnevno."],
      ["Kako dobijam isplatu?", "Svake nedelje preko Ruula (međunarodne isplate na tvoj bankovni račun). Radiš kao samostalni kreator."],
      ["Ko može da se prijavi?", "Svako ko ima najmanje 18 godina i živi u nekoj od naših otvorenih zemalja."],
    ],
    closed: "Prijave u tvojoj zemlji još nisu otvorene.", country: "Zemlja",
  },
  apply: {
    title: "Prijava za kreatore", subtitle: "3 minuta. Svaku prijavu čitamo lično.",
    identity: "O tebi", firstName: "Ime", lastName: "Prezime", birthdate: "Datum rođenja", email: "Imejl", phone: "Telefon (WhatsApp)",
    country: "Zemlja prebivališta", languages: "Jezici koje govoriš", languagesHint: "Odvojeni zarezom, npr. srpski, engleski",
    experience: "Iskustvo", ugcExperience: "Da li si već radio/la UGC / sadržaj? Ukratko opiši.",
    tiktok: "Link do tvog TikTok profila", tiktokFollowers: "Pratioci na TikToku", instagram: "Link do tvog Instagram profila", instagramFollowers: "Pratioci na Instagramu",
    equipment: "Oprema (model telefona, ring svetlo, mikrofon…)", availability: "Dostupnost (sati dnevno, vremenska zona)", motivation: "Zašto želiš da nam se pridružiš?",
    yap: "Video predstavljanja („yap”)", yapHint: "30–90 sekundi, vertikalno, pričaj u kameru: ko si i zašto bi bio/la odličan izbor. Najviše 200 MB.",
    chooseVideo: "Izaberi video", uploading: "Otpremanje… {{pct}} %", uploaded: "Video otpremljen ✓",
    adult: "Imam 18 ili više godina", consent: "Saglasan/na sam da {{brand}} obrađuje moje podatke radi procene prijave.",
    submit: "Pošalji prijavu", success: "Prijava poslata! Proveri imejl: upravo smo ti poslali potvrdu.",
    errors: { underage: "Moraš imati najmanje 18 godina.", already_applied: "Sa ovim imejlom si se već prijavio/la.", yap_video: "Otpremi svoj video predstavljanja.", country_closed: "Prijave su u ovoj zemlji zatvorene.", generic: "Proveri označena polja." },
  },
  sign: {
    title: "Tvoj ugovor kreatora", read: "Pre potpisivanja pročitaj ceo ugovor.",
    typeName: "Za potpis upiši svoje puno ime", typeNameHint: "Mora da se poklapa sa: {{name}}", accept: "Pročitao/la sam ugovor i prihvatam ga.",
    warn: "Ne potpisuj ako ne želiš da nastaviš.", button: "Potpiši ugovor",
    signed: "Ugovor potpisan {{date}}. Hvala! Pristup ti šaljemo imejlom.", download: "Preuzmi potpisani PDF",
    expired: "Ovaj link je istekao. Javi nam se ako i dalje želiš da nam se pridružiš.", notFound: "Ugovor nije pronađen.",
    errors: { name_mismatch: "Ime se ne poklapa sa prijavom.", not_accepted: "Označi polje.", expired: "Ovaj ugovor je istekao.", hash_mismatch: "Dokument se promenio, osveži stranicu." },
  },
};
export default sr;
