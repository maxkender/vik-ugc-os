import type { PublicDict } from "./types";
const sk: PublicDict = {
  common: { loading: "Načítava sa…", save: "Uložiť", cancel: "Zrušiť", logout: "Odhlásiť sa", error: "Niečo sa pokazilo", language: "Jazyk" },
  landing: {
    badge: "Platený program pre tvorcov",
    title: "Zarábaj natáčaním videí. Staň sa tvorcom {{brand}}.",
    subtitle: "Zverejňuj 2 krátke videá denne o aplikáciách, ktoré študenti milujú. Zarob {{price}} za video plus bonus za pozretia.",
    perVideo: "za video", bonus: "bonus za pozretia", bonusDetail: "{{rpm}} za {{views}} pozretí",
    monthly: "až {{amount}} mesačne", monthlyHint: "2 videá denne, bez bonusu",
    cta: "Prihlásiť sa", how: "Ako to funguje",
    steps: [
      ["Prihlás sa za 3 minúty", "Povedz nám niečo o sebe a natoč krátke predstavovacie video (tzv. „yap“)."],
      ["Podpíš zmluvu online", "Zmluva nezávislého tvorcu, podpísaná jedným kliknutím."],
      ["Zverejňuj 2 videá denne", "Každé ráno dostaneš 2 briefy: referenčné video, hook a jednoduché pokyny."],
      ["Výplata každý týždeň", "Za video + bonus za pozretia, vyplácané každý týždeň cez Ruul."],
    ],
    examples: "Ukážky videí, ktoré budeš točiť", faq: "Časté otázky",
    faqs: [
      ["Potrebujem veľa sledovateľov?", "Nie. Zaujíma nás, ako hovoríš do kamery, nie počet sledovateľov. Stačí aj nový účet."],
      ["Čo potrebujem?", "Smartfón, dobré svetlo, účet na TikToku alebo Instagrame a približne 30–45 minút denne."],
      ["Ako dostanem zaplatené?", "Každý týždeň cez Ruul (medzinárodné výplaty na tvoj bankový účet). Pracuješ ako nezávislý tvorca."],
      ["Kto sa môže prihlásiť?", "Ktokoľvek od 18 rokov, kto žije v niektorej z našich otvorených krajín."],
    ],
    closed: "Vo tvojej krajine zatiaľ prihlášky neprijímame.", country: "Krajina",
  },
  apply: {
    title: "Prihláška tvorcu", subtitle: "3 minúty. Každú prihlášku čítame osobne.",
    identity: "O tebe", firstName: "Meno", lastName: "Priezvisko", birthdate: "Dátum narodenia", email: "E-mail", phone: "Telefón (WhatsApp)",
    country: "Krajina bydliska", languages: "Jazyky, ktorými hovoríš", languagesHint: "Oddelené čiarkou, napr. slovenčina, angličtina",
    experience: "Skúsenosti", ugcExperience: "Robil/a si už UGC / obsah? Napíš stručne.",
    tiktok: "Odkaz na tvoj TikTok profil", tiktokFollowers: "Sledovatelia na TikToku", instagram: "Odkaz na tvoj Instagram profil", instagramFollowers: "Sledovatelia na Instagrame",
    equipment: "Vybavenie (model telefónu, kruhové svetlo, mikrofón…)", availability: "Dostupnosť (hodiny denne, časové pásmo)", motivation: "Prečo sa k nám chceš pridať?",
    yap: "Predstavovacie video („yap“)", yapHint: "30–90 sekúnd, na výšku, hovor do kamery: kto si a prečo by si bol/a skvelá voľba. Max. 200 MB.",
    chooseVideo: "Vybrať video", uploading: "Nahráva sa… {{pct}} %", uploaded: "Video nahrané ✓",
    adult: "Mám 18 rokov alebo viac", consent: "Súhlasím, aby {{brand}} spracúvalo moje údaje na posúdenie prihlášky.",
    submit: "Odoslať prihlášku", success: "Prihláška odoslaná! Skontroluj e-mail: práve sme ti poslali potvrdenie.",
    errors: { underage: "Musíš mať aspoň 18 rokov.", already_applied: "S týmto e-mailom už prihláška existuje.", yap_video: "Nahraj svoje predstavovacie video.", country_closed: "V tejto krajine sú prihlášky uzavreté.", generic: "Skontroluj označené polia." },
  },
  sign: {
    title: "Tvoja zmluva tvorcu", read: "Pred podpisom si prečítaj celú zmluvu.",
    typeName: "Na podpis napíš svoje celé meno", typeNameHint: "Musí sa zhodovať s: {{name}}", accept: "Zmluvu som si prečítal/a a súhlasím s ňou.",
    warn: "Nepodpisuj, ak nechceš pokračovať.", button: "Podpísať zmluvu",
    signed: "Zmluva podpísaná {{date}}. Ďakujeme! Prístupy ti pošleme e-mailom.", download: "Stiahnuť podpísané PDF",
    expired: "Platnosť odkazu vypršala. Napíš nám, ak sa chceš stále pridať.", notFound: "Zmluva sa nenašla.",
    errors: { name_mismatch: "Meno sa nezhoduje s prihláškou.", not_accepted: "Zaškrtni políčko.", expired: "Platnosť zmluvy vypršala.", hash_mismatch: "Dokument sa zmenil, obnov stránku." },
  },
};
export default sk;
