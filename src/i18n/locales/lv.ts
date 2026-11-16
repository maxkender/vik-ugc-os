import type { PublicDict } from "./types";
const lv: PublicDict = {
  common: { loading: "Ielādē…", save: "Saglabāt", cancel: "Atcelt", logout: "Iziet", error: "Kaut kas nogāja greizi", language: "Valoda" },
  landing: {
    badge: "Apmaksāta satura veidotāju programma",
    title: "Darbs: UGC satura veidotājs/-a mobilajai lietotnei",
    subtitle: "Filmē pats/pati savus kvalitatīvos UGC video ar telefonu un publicē tos TikTok un Instagram, lai popularizētu lietotni (sākumā – mākslīgā intelekta mācību lietotni). 1 video dienā, apmaksa par katru apstiprināto video plus bonuss par skatījumiem.",
    perVideo: "par video", bonus: "skatījumu bonuss", bonusDetail: "{{rpm}} par {{views}} skatījumiem",
    cta: "Pieteikties", how: "Kā tas notiek",
    steps: [
      ["Piesakies 3 minūtēs", "Pastāsti mums par sevi un ieraksti īsu iepazīšanās video (“yap”)."],
      ["Paraksti līgumu tiešsaistē", "Neatkarīga satura veidotāja līgums, parakstāms ar vienu klikšķi."],
      ["Nofilmē un publicē 1 video dienā", "Ar telefonu pats nofilmē kvalitatīvu UGC video. Katru rītu saņem: brīfu, atsauces video un hooku."],
      ["Izmaksa katru nedēļu", "Par video + skatījumu bonuss, izmaksāts katru nedēļu caur Ruul."],
    ],
    examples: "Piemēri video, ko veidosi", faq: "Biežākie jautājumi",
    faqs: [
      ["Vai man vajag daudz sekotāju?", "Nē. Mums svarīgi, kā tu runā kamerā, nevis sekotāju skaits. Der arī jauns konts."],
      ["Kas man vajadzīgs?", "Viedtālrunis, labs apgaismojums, TikTok vai Instagram konts un aptuveni 30–45 minūtes dienā."],
      ["Kā es saņemu samaksu?", "Katru nedēļu caur Ruul (starptautiski maksājumi uz tavu bankas kontu). Tu strādā kā neatkarīgs satura veidotājs."],
      ["Kas var pieteikties?", "Ikviens no 18 gadu vecuma, kas dzīvo kādā no mūsu atvērtajām valstīm."],
    ],
    closed: "Tavā valstī pieteikšanās vēl nav atvērta.", country: "Valsts",
  },
  apply: {
    title: "Satura veidotāja pieteikums", subtitle: "3 minūtes. Katru pieteikumu izlasām paši.",
    identity: "Par tevi", firstName: "Vārds", lastName: "Uzvārds", birthdate: "Dzimšanas datums", email: "E-pasts", phone: "Tālrunis (WhatsApp)",
    country: "Dzīvesvietas valsts", languages: "Valodas, kurās runā", languagesHint: "Atdalītas ar komatu, piem., latviešu, angļu",
    experience: "Pieredze", ugcExperience: "Vai esi jau veidojis/-usi UGC / saturu? Pastāsti īsi.",
    tiktok: "Saite uz tavu TikTok profilu", tiktokFollowers: "TikTok sekotāji", instagram: "Saite uz tavu Instagram profilu", instagramFollowers: "Instagram sekotāji",
    equipment: "Aprīkojums (telefona modelis, gredzenlampa, mikrofons…)", availability: "Pieejamība (stundas dienā, laika josla)", motivation: "Kāpēc vēlies pievienoties?",
    yap: "Iepazīšanās video (“yap”)", yapHint: "30–90 sekundes, vertikāli, runā kamerā: kas tu esi un kāpēc būtu lieliska izvēle. Līdz 200 MB.",
    chooseVideo: "Izvēlēties video", uploading: "Augšupielādē… {{pct}}%", uploaded: "Video augšupielādēts ✓",
    adult: "Man ir 18 gadi vai vairāk", consent: "Piekrītu, ka {{brand}} apstrādā manus datus pieteikuma izvērtēšanai.",
    submit: "Nosūtīt pieteikumu", success: "Pieteikums nosūtīts! Pārbaudi e-pastu: tikko nosūtījām apstiprinājumu.",
    errors: { underage: "Tev jābūt vismaz 18 gadus vecam/-ai.", already_applied: "Ar šo e-pastu pieteikums jau ir iesniegts.", yap_video: "Augšupielādē savu iepazīšanās video.", country_closed: "Šajā valstī pieteikšanās ir slēgta.", generic: "Pārbaudi atzīmētos laukus." },
  },
  sign: {
    title: "Tavs satura veidotāja līgums", read: "Pirms parakstīšanas izlasi visu līgumu.",
    typeName: "Lai parakstītu, ieraksti savu pilno vārdu", typeNameHint: "Jāsakrīt ar: {{name}}", accept: "Esmu izlasījis/-usi līgumu un tam piekrītu.",
    warn: "Neparaksti, ja nevēlies turpināt.", button: "Parakstīt līgumu",
    signed: "Līgums parakstīts {{date}}. Paldies! Piekļuvi nosūtīsim e-pastā.", download: "Lejupielādēt parakstīto PDF",
    expired: "Šī saite ir novecojusi. Raksti mums, ja joprojām vēlies pievienoties.", notFound: "Līgums nav atrasts.",
    errors: { name_mismatch: "Vārds nesakrīt ar pieteikumu.", not_accepted: "Atzīmē rūtiņu.", expired: "Šim līgumam ir beidzies termiņš.", hash_mismatch: "Dokuments ir mainījies, atsvaidzini lapu." },
  },
};
export default lv;
