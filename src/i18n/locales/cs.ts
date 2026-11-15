import type { PublicDict } from "./types";
const cs: PublicDict = {
  common: { loading: "Načítání…", save: "Uložit", cancel: "Zrušit", logout: "Odhlásit se", error: "Něco se pokazilo", language: "Jazyk" },
  landing: {
    badge: "Placený program pro tvůrce",
    title: "Vydělávej natáčením videí. Staň se tvůrcem {{brand}}.",
    subtitle: "Zveřejňuj 2 krátká videa denně o aplikacích, které studenti milují. Vydělej {{price}} za video plus bonus za zhlédnutí.",
    perVideo: "za video", bonus: "bonus za zhlédnutí", bonusDetail: "{{rpm}} za {{views}} zhlédnutí",
    monthly: "až {{amount}} měsíčně", monthlyHint: "2 videa denně, bez bonusu",
    cta: "Přihlásit se", how: "Jak to funguje",
    steps: [
      ["Přihlas se za 3 minuty", "Řekni nám něco o sobě a natoč krátké představovací video (tzv. „yap“)."],
      ["Podepiš smlouvu online", "Smlouva nezávislého tvůrce, podepsaná jedním kliknutím."],
      ["Zveřejňuj 2 videa denně", "Každé ráno dostaneš 2 briefy: referenční video, hook a jednoduché pokyny."],
      ["Výplata každý týden", "Za video + bonus za zhlédnutí, vypláceno každý týden přes Ruul."],
    ],
    examples: "Ukázky videí, která budeš točit", faq: "Časté dotazy",
    faqs: [
      ["Potřebuju hodně sledujících?", "Ne. Zajímá nás, jak mluvíš do kamery, ne počet sledujících. Stačí i nový účet."],
      ["Co potřebuju?", "Chytrý telefon, dobré světlo, účet na TikToku nebo Instagramu a zhruba 30–45 minut denně."],
      ["Jak dostanu zaplaceno?", "Každý týden přes Ruul (mezinárodní výplaty na tvůj bankovní účet). Pracuješ jako nezávislý tvůrce."],
      ["Kdo se může přihlásit?", "Kdokoli od 18 let, kdo žije v některé z našich otevřených zemí."],
    ],
    closed: "Ve tvé zemi zatím přihlášky nepřijímáme.", country: "Země",
  },
  apply: {
    title: "Přihláška tvůrce", subtitle: "3 minuty. Každou přihlášku čteme osobně.",
    identity: "O tobě", firstName: "Jméno", lastName: "Příjmení", birthdate: "Datum narození", email: "E-mail", phone: "Telefon (WhatsApp)",
    country: "Země bydliště", languages: "Jazyky, kterými mluvíš", languagesHint: "Oddělené čárkou, např. čeština, angličtina",
    experience: "Zkušenosti", ugcExperience: "Dělal/a jsi už UGC / obsah? Napiš krátce.",
    tiktok: "Odkaz na tvůj TikTok profil", tiktokFollowers: "Sledující na TikToku", instagram: "Odkaz na tvůj Instagram profil", instagramFollowers: "Sledující na Instagramu",
    equipment: "Vybavení (model telefonu, kruhové světlo, mikrofon…)", availability: "Dostupnost (hodiny denně, časové pásmo)", motivation: "Proč se k nám chceš přidat?",
    yap: "Představovací video („yap“)", yapHint: "30–90 sekund, na výšku, mluv do kamery: kdo jsi a proč bys byl/a skvělá volba. Max. 200 MB.",
    chooseVideo: "Vybrat video", uploading: "Nahrávání… {{pct}} %", uploaded: "Video nahráno ✓",
    adult: "Je mi 18 let nebo více", consent: "Souhlasím, aby {{brand}} zpracovávalo mé údaje za účelem posouzení přihlášky.",
    submit: "Odeslat přihlášku", success: "Přihláška odeslána! Zkontroluj e-mail: právě jsme ti poslali potvrzení.",
    errors: { underage: "Musí ti být alespoň 18 let.", already_applied: "S tímto e-mailem už přihláška existuje.", yap_video: "Nahraj své představovací video.", country_closed: "V této zemi jsou přihlášky uzavřené.", generic: "Zkontroluj označená pole." },
  },
  sign: {
    title: "Tvoje smlouva tvůrce", read: "Před podpisem si přečti celou smlouvu.",
    typeName: "Pro podpis napiš své celé jméno", typeNameHint: "Musí odpovídat: {{name}}", accept: "Smlouvu jsem si přečetl/a a souhlasím s ní.",
    warn: "Nepodepisuj, pokud nechceš pokračovat.", button: "Podepsat smlouvu",
    signed: "Smlouva podepsána {{date}}. Díky! Přístupy ti pošleme e-mailem.", download: "Stáhnout podepsané PDF",
    expired: "Platnost odkazu vypršela. Napiš nám, pokud se chceš stále přidat.", notFound: "Smlouva nenalezena.",
    errors: { name_mismatch: "Jméno neodpovídá přihlášce.", not_accepted: "Zaškrtni políčko.", expired: "Platnost smlouvy vypršela.", hash_mismatch: "Dokument se změnil, obnov stránku." },
  },
};
export default cs;
