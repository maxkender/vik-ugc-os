import type { PublicDict } from "./types";
const hu: PublicDict = {
  common: { loading: "Betöltés…", save: "Mentés", cancel: "Mégse", logout: "Kijelentkezés", error: "Valami hiba történt", language: "Nyelv" },
  landing: {
    badge: "Fizetett tartalomgyártó program",
    title: "Kapj fizetést a videóidért. Legyél {{brand}} alkotó.",
    subtitle: "Posztolj napi 2 rövid videót olyan appokról, amiket a diákok imádnak. Keress {{price}}-t videónként, plusz bónuszt a megtekintések után.",
    perVideo: "videónként", bonus: "megtekintési bónusz", bonusDetail: "{{rpm}} / {{views}} megtekintés",
    monthly: "akár {{amount}}/hó", monthlyHint: "napi 2 videó, bónusz nélkül",
    cta: "Jelentkezem", how: "Így működik",
    steps: [
      ["Jelentkezz 3 perc alatt", "Mesélj magadról, és vegyél fel egy rövid bemutatkozó videót (egy „yap”-et)."],
      ["Írd alá a szerződést online", "Független alkotói szerződés, egy kattintással aláírva."],
      ["Posztolj napi 2 videót", "Minden reggel 2 briefet kapsz: egy mintavideót, egy hookot és egyszerű utasításokat."],
      ["Heti kifizetés", "Videónként + megtekintési bónusz, hetente fizetve a Ruulon keresztül."],
    ],
    examples: "Példák arra, amit készíteni fogsz", faq: "Gyakori kérdések",
    faqs: [
      ["Kell sok követő?", "Nem. Az számít, hogyan beszélsz a kamerába, nem a követőid száma. Egy új fiók is megfelel."],
      ["Mire van szükségem?", "Egy okostelefonra, jó fényre, egy TikTok- vagy Instagram-fiókra és napi kb. 30–45 percre."],
      ["Hogyan kapok fizetést?", "Hetente a Ruulon keresztül (nemzetközi utalás a bankszámládra). Független alkotóként dolgozol."],
      ["Ki jelentkezhet?", "Bárki, aki betöltötte a 18. életévét, és valamelyik nyitott országunkban él."],
    ],
    closed: "A te országodban még nem nyílt meg a jelentkezés.", country: "Ország",
  },
  apply: {
    title: "Alkotói jelentkezés", subtitle: "3 perc. Minden jelentkezést személyesen nézünk át.",
    identity: "Rólad", firstName: "Keresztnév", lastName: "Vezetéknév", birthdate: "Születési dátum", email: "E-mail", phone: "Telefon (WhatsApp)",
    country: "Lakóhely szerinti ország", languages: "Beszélt nyelvek", languagesHint: "Vesszővel elválasztva, pl. magyar, angol",
    experience: "Tapasztalat", ugcExperience: "Csináltál már UGC-t / tartalmat? Írd le röviden.",
    tiktok: "TikTok-profilod linkje", tiktokFollowers: "TikTok-követők", instagram: "Instagram-profilod linkje", instagramFollowers: "Instagram-követők",
    equipment: "Felszerelés (telefon típusa, körfény, mikrofon…)", availability: "Elérhetőség (napi órák, időzóna)", motivation: "Miért szeretnél csatlakozni?",
    yap: "Bemutatkozó videó („yap”)", yapHint: "30–90 másodperc, álló formátum, a kamerába beszélve: ki vagy, és miért lennél tökéletes. Max. 200 MB.",
    chooseVideo: "Videó kiválasztása", uploading: "Feltöltés… {{pct}}%", uploaded: "Videó feltöltve ✓",
    adult: "Elmúltam 18 éves", consent: "Hozzájárulok, hogy a(z) {{brand}} a jelentkezésem elbírálásához kezelje az adataimat.",
    submit: "Jelentkezés elküldése", success: "Jelentkezés elküldve! Nézd meg a postafiókod: küldtünk egy visszaigazolást.",
    errors: { underage: "Legalább 18 évesnek kell lenned.", already_applied: "Ezzel az e-mail-címmel már jelentkeztél.", yap_video: "Töltsd fel a bemutatkozó videódat.", country_closed: "Ebben az országban lezárult a jelentkezés.", generic: "Ellenőrizd a megjelölt mezőket." },
  },
  sign: {
    title: "Alkotói szerződésed", read: "Aláírás előtt olvasd el a teljes szerződést.",
    typeName: "Az aláíráshoz írd be a teljes neved", typeNameHint: "Egyeznie kell ezzel: {{name}}", accept: "Elolvastam és elfogadom a szerződést.",
    warn: "Ne írd alá, ha nem szeretnéd folytatni.", button: "Szerződés aláírása",
    signed: "Szerződés aláírva: {{date}}. Köszönjük! A hozzáférést e-mailben küldjük.", download: "Aláírt PDF letöltése",
    expired: "Ez a link lejárt. Írj nekünk, ha még szeretnél csatlakozni.", notFound: "A szerződés nem található.",
    errors: { name_mismatch: "A név nem egyezik a jelentkezésben szereplővel.", not_accepted: "Pipáld ki a négyzetet.", expired: "A szerződés lejárt.", hash_mismatch: "A dokumentum megváltozott, töltsd újra az oldalt." },
  },
};
export default hu;
