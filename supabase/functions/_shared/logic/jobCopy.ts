/**
 * Créas de recrutement au FORMAT OFFRE D'EMPLOI (règle du 16/11, politique Meta « Emploi » / revenus) :
 *   - titre de poste (« Trabajo: creador/a de contenido UGC », « Buscamos creadores/as… ») ;
 *   - rémunération du poste (« Pago: 2,50 US$ por video + bono por vistas ») ;
 *   - étiquette optionnelle (« Ideal para estudiantes », « Sin necesidad de seguidores ») ;
 *   - CTA « Postúlate ».
 * Interdit : « gagner de l'argent », « argent facile », « depuis chez soi », « revenus », montants mensuels ou totaux,
 * « jusqu'à X », flèches et billets, tout ce qui ressemble à du get-rich-quick / MLM, et les questions sur un attribut
 * personnel (« Étudiant ? »). Le détail (zone, RPM, J+7, conditions) reste sur la landing.
 * Traductions du build : à faire relire par un natif.
 */
import type { Hook } from "./creativeCopy.ts";

export interface JobPack { job: string; hiring: string; students: string; nofollow: string; pay: string; cta: string }

export const JOB_COPY: Record<string, JobPack> = {
  en: { job: "Job: UGC content creator", hiring: "We're hiring UGC content creators", students: "Ideal for students", nofollow: "No followers needed", pay: "Pay: {{price}} per video + views bonus", cta: "Apply" },
  fr: { job: "Job : créateur·rice de contenu UGC", hiring: "On recrute des créateur·rice·s de contenu UGC", students: "Idéal pour les étudiant·e·s", nofollow: "Pas besoin d'abonnés", pay: "Rémunération : {{price}} par vidéo + bonus aux vues", cta: "Postuler" },
  es: { job: "Trabajo: creador/a de contenido UGC", hiring: "Buscamos creadores/as de contenido UGC", students: "Ideal para estudiantes", nofollow: "Sin necesidad de seguidores", pay: "Pago: {{price}} por video + bono por vistas", cta: "Postúlate" },
  pt: { job: "Vaga: criador(a) de conteúdo UGC", hiring: "Procuramos criadores(as) de conteúdo UGC", students: "Ideal para estudantes", nofollow: "Sem necessidade de seguidores", pay: "Pagamento: {{price}} por vídeo + bónus por visualizações", cta: "Candidata-te" },
  de: { job: "Job: UGC-Content-Creator:in", hiring: "Wir suchen UGC-Content-Creator:innen", students: "Ideal für Studierende", nofollow: "Keine Follower nötig", pay: "Vergütung: {{price}} pro Video + Bonus nach Aufrufen", cta: "Jetzt bewerben" },
  it: { job: "Lavoro: content creator UGC", hiring: "Cerchiamo content creator UGC", students: "Ideale per studenti", nofollow: "Nessun follower richiesto", pay: "Compenso: {{price}} a video + bonus visualizzazioni", cta: "Candidati" },
  nl: { job: "Vacature: UGC-contentcreator", hiring: "We zoeken UGC-contentcreators", students: "Ideaal voor studenten", nofollow: "Geen volgers nodig", pay: "Vergoeding: {{price}} per video + bonus op weergaven", cta: "Solliciteer" },
  pl: { job: "Praca: twórca treści UGC", hiring: "Szukamy twórców treści UGC", students: "Idealne dla studentów", nofollow: "Obserwujący nie są potrzebni", pay: "Wynagrodzenie: {{price}} za film + premia za wyświetlenia", cta: "Aplikuj" },
  ro: { job: "Job: creator de conținut UGC", hiring: "Căutăm creatori de conținut UGC", students: "Ideal pentru studenți", nofollow: "Nu ai nevoie de urmăritori", pay: "Plată: {{price}} pe video + bonus pe vizualizări", cta: "Aplică" },
  cs: { job: "Práce: tvůrce obsahu UGC", hiring: "Hledáme tvůrce obsahu UGC", students: "Ideální pro studenty", nofollow: "Sledující nejsou potřeba", pay: "Odměna: {{price}} za video + bonus za zhlédnutí", cta: "Přihlas se" },
  sk: { job: "Práca: tvorca obsahu UGC", hiring: "Hľadáme tvorcov obsahu UGC", students: "Ideálne pre študentov", nofollow: "Sledovatelia nie sú potrební", pay: "Odmena: {{price}} za video + bonus za zhliadnutia", cta: "Prihlás sa" },
  hu: { job: "Állás: UGC-tartalomkészítő", hiring: "UGC-tartalomkészítőket keresünk", students: "Ideális diákoknak", nofollow: "Nem kellenek követők", pay: "Díjazás: {{price}} videónként + megtekintési bónusz", cta: "Jelentkezz" },
  el: { job: "Θέση: δημιουργός περιεχομένου UGC", hiring: "Αναζητούμε δημιουργούς περιεχομένου UGC", students: "Ιδανικό για φοιτητές", nofollow: "Δεν χρειάζονται followers", pay: "Αμοιβή: {{price}} ανά βίντεο + μπόνους προβολών", cta: "Κάνε αίτηση" },
  bg: { job: "Работа: създател на UGC съдържание", hiring: "Търсим създатели на UGC съдържание", students: "Идеално за студенти", nofollow: "Не са нужни последователи", pay: "Заплащане: {{price}} на видео + бонус за гледания", cta: "Кандидатствай" },
  hr: { job: "Posao: kreator UGC sadržaja", hiring: "Tražimo kreatore UGC sadržaja", students: "Idealno za studente", nofollow: "Pratitelji nisu potrebni", pay: "Plaćanje: {{price}} po videu + bonus za preglede", cta: "Prijavi se" },
  sl: { job: "Delo: ustvarjalec vsebin UGC", hiring: "Iščemo ustvarjalce vsebin UGC", students: "Idealno za študente", nofollow: "Sledilci niso potrebni", pay: "Plačilo: {{price}} na video + bonus za oglede", cta: "Prijavi se" },
  sr: { job: "Посао: креатор UGC садржаја", hiring: "Тражимо креаторе UGC садржаја", students: "Идеално за студенте", nofollow: "Пратиоци нису потребни", pay: "Плаћање: {{price}} по видеу + бонус за прегледе", cta: "Пријави се" },
  uk: { job: "Робота: автор UGC-контенту", hiring: "Шукаємо авторів UGC-контенту", students: "Ідеально для студентів", nofollow: "Підписники не потрібні", pay: "Оплата: {{price}} за відео + бонус за перегляди", cta: "Подати заявку" },
  tr: { job: "İş: UGC içerik üreticisi", hiring: "UGC içerik üreticileri arıyoruz", students: "Öğrenciler için ideal", nofollow: "Takipçi gerekmez", pay: "Ücret: video başına {{price}} + izlenme bonusu", cta: "Başvur" },
  ar: { job: "وظيفة: صانع/ة محتوى UGC", hiring: "نبحث عن صناع محتوى UGC", students: "مثالية للطلاب", nofollow: "لا حاجة إلى متابعين", pay: "الأجر: ‎{{price}}‎ لكل فيديو + مكافأة المشاهدات", cta: "قدّم الآن" },
  he: { job: "משרה: יוצר/ת תוכן UGC", hiring: "מחפשים יוצרי תוכן UGC", students: "מתאים לסטודנטים", nofollow: "אין צורך בעוקבים", pay: "תשלום: ‎{{price}}‎ לסרטון + בונוס צפיות", cta: "הגישו מועמדות" },
  ja: { job: "求人：UGCコンテンツクリエイター", hiring: "UGCコンテンツクリエイター募集", students: "学生に最適", nofollow: "フォロワー数不問", pay: "報酬：動画1本{{price}}＋再生数ボーナス", cta: "応募する" },
  ko: { job: "채용: UGC 콘텐츠 크리에이터", hiring: "UGC 콘텐츠 크리에이터 모집", students: "학생에게 딱 맞는 일", nofollow: "팔로워 필요 없음", pay: "보수: 영상당 {{price}} + 조회수 보너스", cta: "지원하기" },
  sv: { job: "Jobb: UGC-innehållsskapare", hiring: "Vi söker UGC-innehållsskapare", students: "Perfekt för studenter", nofollow: "Inga följare krävs", pay: "Ersättning: {{price}} per video + visningsbonus", cta: "Ansök" },
  no: { job: "Jobb: UGC-innholdsskaper", hiring: "Vi søker UGC-innholdsskapere", students: "Ideelt for studenter", nofollow: "Ingen følgere nødvendig", pay: "Betaling: {{price}} per video + visningsbonus", cta: "Søk nå" },
  da: { job: "Job: UGC-indholdsskaber", hiring: "Vi søger UGC-indholdsskabere", students: "Ideelt for studerende", nofollow: "Ingen følgere nødvendig", pay: "Betaling: {{price}} pr. video + visningsbonus", cta: "Ansøg" },
  fi: { job: "Työ: UGC-sisällöntuottaja", hiring: "Etsimme UGC-sisällöntuottajia", students: "Sopii opiskelijoille", nofollow: "Seuraajia ei tarvita", pay: "Palkkio: {{price}} / video + katselubonus", cta: "Hae" },
  et: { job: "Töö: UGC sisulooja", hiring: "Otsime UGC sisuloojaid", students: "Sobib tudengitele", nofollow: "Jälgijaid pole vaja", pay: "Tasu: {{price}} video eest + vaatamiste boonus", cta: "Kandideeri" },
  lv: { job: "Darbs: UGC satura veidotājs", hiring: "Meklējam UGC satura veidotājus", students: "Ideāli studentiem", nofollow: "Sekotāji nav vajadzīgi", pay: "Samaksa: {{price}} par video + bonuss par skatījumiem", cta: "Piesakies" },
  lt: { job: "Darbas: UGC turinio kūrėjas", hiring: "Ieškome UGC turinio kūrėjų", students: "Puikiai tinka studentams", nofollow: "Sekėjų nereikia", pay: "Atlygis: {{price}} už vaizdo įrašą + peržiūrų premija", cta: "Teik paraišką" },
};

/** Expressions interdites (get-rich-quick, revenus, montants mensuels, questions sur un attribut personnel). */
const BANNED_COMMON = [/[💰💸💵💶🤑➡→⇒]/u, /\$\$/, /\b\d+\s*[x×]\b/i];
export const BANNED_COPY: Record<string, RegExp[]> = {
  en: [/make money/i, /earn money/i, /easy money/i, /from home/i, /income/i, /up to/i, /per month|\/month|a month/i, /student\s*\?/i, /get rich/i, /passive/i],
  fr: [/gagne[rz]? de l'argent/i, /argent facile/i, /(depuis|de) chez (toi|soi|vous)/i, /revenus?/i, /jusqu'à/i, /par mois|\/mois/i, /étudiant[·.e]*\s*\?/i, /complément de revenu/i],
  es: [/gana(r)? dinero/i, /dinero fácil/i, /desde casa/i, /ingresos?/i, /hasta/i, /al mes|por mes|\/mes/i, /¿\s*estudiante/i, /hazte rico/i],
  pt: [/ganh(e|ar) dinheiro/i, /dinheiro fácil/i, /de casa/i, /rendimentos?|renda extra/i, /até/i, /por mês|\/mês/i, /estudante\s*\?/i],
  de: [/geld verdienen/i, /leichtes geld/i, /von zu hause/i, /einkommen/i, /bis zu/i, /pro monat|\/monat/i, /student:?in\s*\?/i],
  it: [/guadagna(re)? soldi/i, /soldi facili/i, /da casa/i, /reddito|entrate/i, /fino a/i, /al mese|\/mese/i, /studente\s*\?/i],
};

/** Violations des règles de rédaction (vide = conforme). Langues sans liste dédiée : règles communes + anglaises. */
export function copyViolations(text: string, lang: string): string[] {
  const l = (lang ?? "en").slice(0, 2);
  const rules = [...BANNED_COMMON, ...(BANNED_COPY[l] ?? []), ...(l === "en" ? [] : BANNED_COPY.en)];
  return rules.filter((r) => r.test(text)).map((r) => r.source);
}

/** Textes d'une créa au format offre d'emploi. */
export function jobCopy(lang: string | null | undefined, hook: Hook, price: string, country?: string | null) {
  const l = (lang ?? "en").split("-")[0];
  const known = JOB_COPY[l] ? l : "en";
  const p = JOB_COPY[known];
  const latam = known === "es" && !!country && country.toUpperCase() !== "ES";
  const fix = (s: string) => (latam ? s : s.replace(/ por video/g, " por vídeo"));
  return {
    lang: known,
    headline: hook === "earn" ? p.hiring : p.job,
    tag: hook === "student" ? p.students : hook === "nofollow" ? p.nofollow : null,
    pay: fix(p.pay.replace(/\{\{price\}\}/g, price)),
    cta: p.cta,
  };
}
