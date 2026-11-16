import type { PublicDict } from "./types";
const et: PublicDict = {
  common: { loading: "Laadimine…", save: "Salvesta", cancel: "Tühista", logout: "Logi välja", error: "Midagi läks valesti", language: "Keel" },
  landing: {
    badge: "Tasustatud loojaprogramm",
    title: "Töö: UGC-sisuloojaks mobiilirakendusele",
    subtitle: "Filmi telefoniga oma kvaliteetseid UGC-videoid ja postita need TikTokis ja Instagramis, et reklaamida rakendust (alustuseks tehisintellektil põhinev õpirakendus). 1 video päevas, tasu valideeritud video eest pluss vaatamiste boonus.",
    perVideo: "video kohta", bonus: "vaatamiste boonus", bonusDetail: "{{rpm}} iga {{views}} vaatamise eest",
    cta: "Kandideeri", how: "Kuidas see töötab",
    steps: [
      ["Kandideeri 3 minutiga", "Räägi meile endast ja salvesta lühike tutvustusvideo (nn „yap“)."],
      ["Allkirjasta leping veebis", "Iseseisva looja leping, allkirjastatud ühe klikiga."],
      ["Filmi ja postita 1 video päevas", "Filmid oma telefoniga ise kvaliteetse UGC-video. Igal hommikul saad: briifi, võrdlusvideo ja hooki."],
      ["Väljamakse iga nädal", "Video eest + vaatamiste boonus, makstakse iga nädal Ruuli kaudu."],
    ],
    examples: "Näiteid videotest, mida teed", faq: "KKK",
    faqs: [
      ["Kas mul on vaja palju jälgijaid?", "Ei. Meile loeb, kuidas sa kaamerale räägid, mitte jälgijate arv. Ka uus konto sobib."],
      ["Mida mul vaja on?", "Nutitelefoni, head valgust, TikToki või Instagrami kontot ja umbes 30–45 minutit päevas."],
      ["Kuidas ma raha saan?", "Iga nädal Ruuli kaudu (rahvusvahelised maksed sinu pangakontole). Töötad iseseisva loojana."],
      ["Kes saavad kandideerida?", "Kõik vähemalt 18-aastased, kes elavad mõnes meie avatud riigis."],
    ],
    closed: "Sinu riigis pole kandideerimine veel avatud.", country: "Riik",
  },
  apply: {
    title: "Looja avaldus", subtitle: "3 minutit. Loeme iga avalduse ise läbi.",
    identity: "Sinust", firstName: "Eesnimi", lastName: "Perekonnanimi", birthdate: "Sünnikuupäev", email: "E-post", phone: "Telefon (WhatsApp)",
    country: "Elukohariik", languages: "Keeled, mida räägid", languagesHint: "Komadega eraldatud, nt eesti, inglise",
    experience: "Kogemus", ugcExperience: "Kas oled varem UGC-d / sisu teinud? Kirjelda lühidalt.",
    tiktok: "Sinu TikToki profiili link", tiktokFollowers: "TikToki jälgijad", instagram: "Sinu Instagrami profiili link", instagramFollowers: "Instagrami jälgijad",
    equipment: "Varustus (telefoni mudel, rõngasvalgus, mikrofon…)", availability: "Saadavus (tunde päevas, ajavöönd)", motivation: "Miks tahad meiega liituda?",
    yap: "Tutvustusvideo („yap“)", yapHint: "30–90 sekundit, püstformaadis, räägi kaamerasse: kes sa oled ja miks sobiksid. Kuni 200 MB.",
    chooseVideo: "Vali video", uploading: "Üleslaadimine… {{pct}}%", uploaded: "Video üles laaditud ✓",
    adult: "Olen vähemalt 18-aastane", consent: "Nõustun, et {{brand}} töötleb minu andmeid avalduse hindamiseks.",
    submit: "Saada avaldus", success: "Avaldus saadetud! Vaata oma postkasti: saatsime sulle kinnituse.",
    errors: { underage: "Pead olema vähemalt 18-aastane.", already_applied: "Selle e-postiga on juba avaldus esitatud.", yap_video: "Laadi üles oma tutvustusvideo.", country_closed: "Selles riigis on kandideerimine suletud.", generic: "Kontrolli märgitud välju." },
  },
  sign: {
    title: "Sinu looja leping", read: "Loe enne allkirjastamist kogu leping läbi.",
    typeName: "Allkirjastamiseks sisesta oma täisnimi", typeNameHint: "Peab ühtima: {{name}}", accept: "Olen lepingu läbi lugenud ja nõustun sellega.",
    warn: "Ära allkirjasta, kui sa ei soovi jätkata.", button: "Allkirjasta leping",
    signed: "Leping allkirjastatud {{date}}. Aitäh! Saadame ligipääsu e-postiga.", download: "Laadi alla allkirjastatud PDF",
    expired: "See link on aegunud. Kirjuta meile, kui soovid ikka liituda.", notFound: "Lepingut ei leitud.",
    errors: { name_mismatch: "Nimi ei ühti avaldusega.", not_accepted: "Märgi ruut.", expired: "See leping on aegunud.", hash_mismatch: "Dokument on muutunud, värskenda lehte." },
  },
};
export default et;
