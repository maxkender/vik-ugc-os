/**
 * Textes des créas statiques de recrutement, par langue (une par pays couvert).
 * {{price}} = tarif par vidéo de la zone du pays. Hooks :
 *   student : « Étudiant ? Gagne X par vidéo »
 *   earn    : « Gagne X par vidéo TikTok »
 *   nofollow: « Pas besoin d'abonnés » (EN/FR/ES seulement ; repli sur student ailleurs)
 * Traductions faites pendant le build : à faire relire par un natif avant de dépenser gros.
 */
export type Hook = "student" | "earn" | "nofollow";
export interface CreativeCopy {
  headline: string;
  subline: string;
  cta: string;
}

type Lang = Record<"student" | "earn", CreativeCopy> & { nofollow?: CreativeCopy };

export const CREATIVE_COPY: Record<string, Lang> = {
  en: {
    student: { headline: "Student? Get paid {{price}} per video", subline: "Post 2 short videos a day about study apps. Paid every week.", cta: "Apply now" },
    earn: { headline: "Make {{price}} per TikTok video", subline: "Become a paid creator. Simple briefs every morning.", cta: "Join us" },
    nofollow: { headline: "No followers needed. {{price}} per video.", subline: "Film 2 short videos a day from your phone.", cta: "Apply in 3 min" },
  },
  fr: {
    student: { headline: "Étudiant·e ? Gagne {{price}} par vidéo", subline: "Publie 2 vidéos courtes par jour sur des apps d'étude. Payé chaque semaine.", cta: "Je postule" },
    earn: { headline: "Gagne {{price}} par vidéo TikTok", subline: "Deviens créateur·rice rémunéré·e. Des briefs simples chaque matin.", cta: "Rejoins-nous" },
    nofollow: { headline: "Pas besoin d'abonnés. {{price}} par vidéo.", subline: "Filme 2 vidéos courtes par jour avec ton téléphone.", cta: "Postule en 3 min" },
  },
  es: {
    student: { headline: "¿Estudiante? Gana {{price}} por vídeo", subline: "Publica 2 vídeos cortos al día sobre apps de estudio. Pagos semanales.", cta: "Postúlate" },
    earn: { headline: "Gana {{price}} por vídeo de TikTok", subline: "Hazte creador/a remunerado/a. Briefs sencillos cada mañana.", cta: "Únete" },
    nofollow: { headline: "Sin necesidad de seguidores. {{price}} por vídeo.", subline: "Graba 2 vídeos cortos al día con tu móvil.", cta: "Postúlate en 3 min" },
  },
  de: {
    student: { headline: "Student:in? Verdiene {{price}} pro Video", subline: "Poste 2 kurze Videos am Tag über Lern-Apps. Wöchentliche Auszahlung.", cta: "Jetzt bewerben" },
    earn: { headline: "Verdiene {{price}} pro TikTok-Video", subline: "Werde bezahlte:r Creator:in. Einfache Briefings jeden Morgen.", cta: "Mitmachen" },
  },
  it: {
    student: { headline: "Studente? Guadagna {{price}} a video", subline: "Pubblica 2 video brevi al giorno su app per studiare. Pagamenti settimanali.", cta: "Candidati ora" },
    earn: { headline: "Guadagna {{price}} per ogni video TikTok", subline: "Diventa creator retribuito. Brief semplici ogni mattina.", cta: "Unisciti" },
  },
  pt: {
    student: { headline: "Estudante? Ganha {{price}} por vídeo", subline: "Publica 2 vídeos curtos por dia sobre apps de estudo. Pagamento semanal.", cta: "Candidata-te" },
    earn: { headline: "Ganha {{price}} por vídeo no TikTok", subline: "Torna-te criador(a) pago(a). Briefs simples todas as manhãs.", cta: "Junta-te a nós" },
  },
  nl: {
    student: { headline: "Student? Verdien {{price}} per video", subline: "Post 2 korte video's per dag over studie-apps. Wekelijks uitbetaald.", cta: "Solliciteer nu" },
    earn: { headline: "Verdien {{price}} per TikTok-video", subline: "Word betaalde creator. Elke ochtend simpele briefings.", cta: "Doe mee" },
  },
  pl: {
    student: { headline: "Student? Zarabiaj {{price}} za film", subline: "Publikuj 2 krótkie filmy dziennie o aplikacjach do nauki. Wypłaty co tydzień.", cta: "Aplikuj teraz" },
    earn: { headline: "Zarabiaj {{price}} za film na TikToku", subline: "Zostań płatnym twórcą. Proste briefy każdego ranka.", cta: "Dołącz" },
  },
  ro: {
    student: { headline: "Student? Câștigă {{price}} pe video", subline: "Postează 2 videoclipuri scurte pe zi despre aplicații de studiu. Plată săptămânală.", cta: "Aplică acum" },
    earn: { headline: "Câștigă {{price}} pe fiecare video TikTok", subline: "Devino creator plătit. Brief-uri simple în fiecare dimineață.", cta: "Alătură-te" },
  },
  cs: {
    student: { headline: "Student? Vydělej {{price}} za video", subline: "Zveřejňuj 2 krátká videa denně o aplikacích na učení. Výplata každý týden.", cta: "Přihlas se" },
    earn: { headline: "Vydělej {{price}} za každé video na TikToku", subline: "Staň se placeným tvůrcem. Jednoduchá zadání každé ráno.", cta: "Přidej se" },
  },
  sk: {
    student: { headline: "Študent? Zarob {{price}} za video", subline: "Zverejňuj 2 krátke videá denne o aplikáciách na učenie. Výplata každý týždeň.", cta: "Prihlás sa" },
    earn: { headline: "Zarob {{price}} za každé video na TikToku", subline: "Staň sa plateným tvorcom. Jednoduché zadania každé ráno.", cta: "Pridaj sa" },
  },
  hu: {
    student: { headline: "Diák vagy? Keress {{price}}-t videónként", subline: "Posztolj napi 2 rövid videót tanulós appokról. Heti kifizetés.", cta: "Jelentkezz" },
    earn: { headline: "Keress {{price}}-t minden TikTok-videóval", subline: "Legyél fizetett tartalomgyártó. Egyszerű briefek minden reggel.", cta: "Csatlakozz" },
  },
  el: {
    student: { headline: "Φοιτητής; Κέρδισε {{price}} ανά βίντεο", subline: "Ανέβασε 2 σύντομα βίντεο την ημέρα για εφαρμογές μελέτης. Πληρωμή κάθε εβδομάδα.", cta: "Κάνε αίτηση" },
    earn: { headline: "Κέρδισε {{price}} για κάθε βίντεο στο TikTok", subline: "Γίνε αμειβόμενος δημιουργός. Απλές οδηγίες κάθε πρωί.", cta: "Έλα μαζί μας" },
  },
  bg: {
    student: { headline: "Студент? Печели {{price}} на видео", subline: "Публикувай 2 кратки видеа на ден за приложения за учене. Плащане всяка седмица.", cta: "Кандидатствай" },
    earn: { headline: "Печели {{price}} за всяко видео в TikTok", subline: "Стани платен създател. Лесни задачи всяка сутрин.", cta: "Присъедини се" },
  },
  hr: {
    student: { headline: "Student? Zaradi {{price}} po videu", subline: "Objavljuj 2 kratka videa dnevno o aplikacijama za učenje. Isplata svaki tjedan.", cta: "Prijavi se" },
    earn: { headline: "Zaradi {{price}} po TikTok videu", subline: "Postani plaćeni kreator. Jednostavne upute svako jutro.", cta: "Pridruži se" },
  },
  sl: {
    student: { headline: "Študent? Zasluži {{price}} na video", subline: "Objavi 2 kratka videa na dan o aplikacijah za učenje. Plačilo vsak teden.", cta: "Prijavi se" },
    earn: { headline: "Zasluži {{price}} za vsak TikTok video", subline: "Postani plačan ustvarjalec. Preprosta navodila vsako jutro.", cta: "Pridruži se" },
  },
  sr: {
    student: { headline: "Student? Zaradi {{price}} po videu", subline: "Objavljuj 2 kratka videa dnevno o aplikacijama za učenje. Isplata svake nedelje.", cta: "Prijavi se" },
    earn: { headline: "Zaradi {{price}} po TikTok videu", subline: "Postani plaćeni kreator. Jednostavna uputstva svako jutro.", cta: "Pridruži se" },
  },
  uk: {
    student: { headline: "Студент? Заробляй {{price}} за відео", subline: "Публікуй 2 короткі відео на день про застосунки для навчання. Виплати щотижня.", cta: "Подати заявку" },
    earn: { headline: "Заробляй {{price}} за кожне відео в TikTok", subline: "Стань оплачуваним автором. Прості завдання щоранку.", cta: "Приєднуйся" },
  },
  tr: {
    student: { headline: "Öğrenci misin? Video başına {{price}} kazan", subline: "Ders çalışma uygulamaları hakkında günde 2 kısa video paylaş. Haftalık ödeme.", cta: "Hemen başvur" },
    earn: { headline: "TikTok videosu başına {{price}} kazan", subline: "Ücretli içerik üreticisi ol. Her sabah basit brifler.", cta: "Bize katıl" },
  },
  ar: {
    student: { headline: "طالب؟ اربح {{price}} عن كل فيديو", subline: "انشر فيديوهين قصيرين يوميًا عن تطبيقات الدراسة. دفع أسبوعي.", cta: "قدّم الآن" },
    earn: { headline: "اربح {{price}} عن كل فيديو على تيك توك", subline: "كن صانع محتوى مدفوع الأجر. تعليمات بسيطة كل صباح.", cta: "انضم إلينا" },
  },
  he: {
    student: { headline: "סטודנט? הרוויחו {{price}} לכל סרטון", subline: "פרסמו 2 סרטונים קצרים ביום על אפליקציות לימוד. תשלום שבועי.", cta: "הגישו מועמדות" },
    earn: { headline: "הרוויחו {{price}} לכל סרטון טיקטוק", subline: "הפכו ליוצרי תוכן בתשלום. תדריכים פשוטים כל בוקר.", cta: "הצטרפו" },
  },
  ja: {
    student: { headline: "学生さん？動画1本{{price}}の報酬", subline: "勉強アプリの短い動画を1日2本投稿。報酬は毎週お支払い。", cta: "今すぐ応募" },
    earn: { headline: "TikTok動画1本で{{price}}", subline: "報酬ありのクリエイターに。毎朝シンプルな指示が届きます。", cta: "参加する" },
  },
  ko: {
    student: { headline: "학생이신가요? 영상 1개당 {{price}}", subline: "공부 앱에 관한 짧은 영상을 하루 2개 올리세요. 매주 지급.", cta: "지금 지원하기" },
    earn: { headline: "틱톡 영상 1개당 {{price}} 수익", subline: "유료 크리에이터가 되어 보세요. 매일 아침 간단한 브리프.", cta: "함께하기" },
  },
  sv: {
    student: { headline: "Student? Tjäna {{price}} per video", subline: "Lägg upp 2 korta videor om dagen om plugg-appar. Utbetalning varje vecka.", cta: "Ansök nu" },
    earn: { headline: "Tjäna {{price}} per TikTok-video", subline: "Bli betald kreatör. Enkla instruktioner varje morgon.", cta: "Gå med" },
  },
  no: {
    student: { headline: "Student? Tjen {{price}} per video", subline: "Legg ut 2 korte videoer om dagen om studieapper. Utbetaling hver uke.", cta: "Søk nå" },
    earn: { headline: "Tjen {{price}} per TikTok-video", subline: "Bli betalt innholdsskaper. Enkle oppdrag hver morgen.", cta: "Bli med" },
  },
  da: {
    student: { headline: "Studerende? Tjen {{price}} pr. video", subline: "Læg 2 korte videoer op om dagen om studie-apps. Udbetaling hver uge.", cta: "Ansøg nu" },
    earn: { headline: "Tjen {{price}} pr. TikTok-video", subline: "Bliv betalt creator. Enkle opgaver hver morgen.", cta: "Vær med" },
  },
  fi: {
    student: { headline: "Opiskelija? Tienaa {{price}} per video", subline: "Julkaise 2 lyhyttä videota päivässä opiskelusovelluksista. Maksu joka viikko.", cta: "Hae nyt" },
    earn: { headline: "Tienaa {{price}} jokaisesta TikTok-videosta", subline: "Ryhdy palkalliseksi sisällöntuottajaksi. Selkeät ohjeet joka aamu.", cta: "Liity mukaan" },
  },
  et: {
    student: { headline: "Tudeng? Teeni {{price}} video eest", subline: "Postita päevas 2 lühivideot õppimisäppidest. Väljamakse iga nädal.", cta: "Kandideeri" },
    earn: { headline: "Teeni {{price}} iga TikToki video eest", subline: "Hakka tasustatud sisuloojaks. Lihtsad juhised igal hommikul.", cta: "Liitu" },
  },
  lv: {
    student: { headline: "Students? Nopelni {{price}} par video", subline: "Publicē 2 īsus video dienā par mācību lietotnēm. Izmaksa katru nedēļu.", cta: "Piesakies" },
    earn: { headline: "Nopelni {{price}} par katru TikTok video", subline: "Kļūsti par apmaksātu satura veidotāju. Vienkārši uzdevumi katru rītu.", cta: "Pievienojies" },
  },
  lt: {
    student: { headline: "Studentas? Uždirbk {{price}} už vaizdo įrašą", subline: "Kelk 2 trumpus vaizdo įrašus per dieną apie mokymosi programėles. Mokama kas savaitę.", cta: "Teik paraišką" },
    earn: { headline: "Uždirbk {{price}} už kiekvieną TikTok įrašą", subline: "Tapk apmokamu turinio kūrėju. Paprastos užduotys kiekvieną rytą.", cta: "Prisijunk" },
  },
};

export const CREATIVE_LANGS = Object.keys(CREATIVE_COPY);
export const HOOKS: Array<{ value: Hook; label: string }> = [
  { value: "student", label: "Étudiant ? Gagne X par vidéo" },
  { value: "earn", label: "Gagne X par vidéo TikTok" },
  { value: "nofollow", label: "Pas besoin d'abonnés (EN/FR/ES, sinon « Étudiant »)" },
];

/** Texte d'une créa pour une langue et un hook, prix inséré. Repli : langue → anglais, hook → student. */
/** Ligne « bonus aux vues » mise en avant sur la créa ({{bonus}} = RPM de la zone, pour 1 000 vues à J+7). */
export const BONUS_COPY: Record<string, string> = {
  en: "+{{bonus}} bonus per 1,000 views", fr: "+{{bonus}} de bonus pour 1 000 vues", es: "+{{bonus}} de bono por cada 1.000 vistas",
  de: "+{{bonus}} Bonus pro 1.000 Aufrufe", it: "+{{bonus}} di bonus ogni 1.000 visualizzazioni", pt: "+{{bonus}} de bónus por cada 1.000 visualizações",
  nl: "+{{bonus}} bonus per 1.000 weergaven", pl: "+{{bonus}} premii za każde 1000 wyświetleń", ro: "+{{bonus}} bonus la fiecare 1.000 de vizualizări",
  cs: "+{{bonus}} bonus za každých 1 000 zhlédnutí", sk: "+{{bonus}} bonus za každých 1 000 zhliadnutí", hu: "+{{bonus}} bónusz minden 1000 megtekintés után",
  el: "+{{bonus}} μπόνους ανά 1.000 προβολές", bg: "+{{bonus}} бонус на всеки 1000 гледания", hr: "+{{bonus}} bonusa na svakih 1.000 pregleda",
  sl: "+{{bonus}} bonusa na vsakih 1.000 ogledov", sr: "+{{bonus}} бонуса на сваких 1.000 прегледа", uk: "+{{bonus}} бонусу за кожні 1000 переглядів",
  tr: "Her 1.000 izlenmeye +{{bonus}} bonus", ar: "‎+{{bonus}} مكافأة لكل 1000 مشاهدة", he: "‎+{{bonus}} בונוס לכל 1,000 צפיות",
  ja: "1,000回再生ごとに+{{bonus}}のボーナス", ko: "조회수 1,000회당 +{{bonus}} 보너스", sv: "+{{bonus}} bonus per 1 000 visningar",
  no: "+{{bonus}} bonus per 1 000 visninger", da: "+{{bonus}} bonus pr. 1.000 visninger", fi: "+{{bonus}} bonus jokaisesta 1 000 katselusta",
  et: "+{{bonus}} boonus iga 1000 vaatamise eest", lv: "+{{bonus}} bonuss par katriem 1000 skatījumiem", lt: "+{{bonus}} premija už kas 1 000 peržiūrų",
};

/** Espagnol d'Amérique latine : « video », « celular » (l'espagnol d'Espagne dit « vídeo », « móvil »). */
const LATAM = new Set(["MX", "CO", "AR", "PE", "CL", "EC", "VE", "GT", "BO", "DO", "HN", "PY", "SV", "NI", "CR", "PA", "UY", "PR", "CU", "US"]);
function localize(text: string, lang: string, country?: string | null): string {
  if (lang !== "es" || !country || !LATAM.has(country.toUpperCase())) return text;
  return text.replace(/vídeo/g, "video").replace(/Vídeo/g, "Video").replace(/móvil/g, "celular");
}

/**
 * Estimation mensuelle (jamais une promesse : « hasta », « estimación », « no garantizados » ; Meta refuse les revenus garantis).
 * {{monthly}} = tarif × vidéos/jour × 30. La note de bas de créa explique le calcul.
 */
export const MONTHLY_COPY: Record<string, { line: string; note: string }> = {
  es: { line: "Hasta ~{{monthly}}/mes* + bono según tus vistas", note: "*Estimación con {{perDay}} videos al día durante 30 días. Ingresos no garantizados." },
  en: { line: "Up to ~{{monthly}}/month* + bonus based on your views", note: "*Estimate with {{perDay}} videos a day for 30 days. Earnings not guaranteed." },
  fr: { line: "Jusqu'à ~{{monthly}}/mois* + bonus selon tes vues", note: "*Estimation avec {{perDay}} vidéos par jour pendant 30 jours. Revenus non garantis." },
  pt: { line: "Até ~{{monthly}}/mês* + bónus conforme as tuas visualizações", note: "*Estimativa com {{perDay}} vídeos por dia durante 30 dias. Ganhos não garantidos." },
  de: { line: "Bis zu ~{{monthly}}/Monat* + Bonus je nach Aufrufen", note: "*Schätzung bei {{perDay}} Videos pro Tag über 30 Tage. Keine garantierten Einnahmen." },
  it: { line: "Fino a ~{{monthly}}/mese* + bonus in base alle visualizzazioni", note: "*Stima con {{perDay}} video al giorno per 30 giorni. Guadagni non garantiti." },
};

export function creativeCopy(
  lang: string | null | undefined, hook: Hook, price: string,
  opts: { bonus?: string | null; country?: string | null; monthly?: string | null; perDay?: number } = {},
): CreativeCopy & { lang: string; bonus: string | null; monthly: string | null; disclaimer: string | null } {
  const l = (lang ?? "en").split("-")[0];
  const known = CREATIVE_COPY[l] ? l : "en";
  const pack = CREATIVE_COPY[known];
  const c = pack[hook] ?? pack.student;
  const fill = (s: string) => localize(s.replace(/\{\{price\}\}/g, price), known, opts.country);
  const bonus = opts.bonus ? (BONUS_COPY[known] ?? BONUS_COPY.en).replace(/\{\{bonus\}\}/g, opts.bonus) : null;
  const m = opts.monthly ? MONTHLY_COPY[known] : null;
  const monthly = m ? localize(m.line.replace(/\{\{monthly\}\}/g, opts.monthly!), known, opts.country) : null;
  const disclaimer = m ? localize(m.note.replace(/\{\{perDay\}\}/g, String(opts.perDay ?? 2)), known, opts.country) : null;
  return { headline: fill(c.headline), subline: fill(c.subline), cta: fill(c.cta), lang: known, bonus, monthly, disclaimer };
}

/** Langues écrites de droite à gauche (alignement du texte sur le canvas). */
export const RTL_LANGS = new Set(["ar", "he"]);
