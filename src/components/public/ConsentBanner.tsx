import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getConsent, setConsent } from "@/lib/pixel";

/** Textes courts du bandeau (30 langues des pages publiques). */
const T: Record<string, [string, string, string]> = {
  en: ["We use Meta cookies to measure our ads and show this offer to more creators.", "Accept", "Decline"],
  fr: ["Nous utilisons les cookies de Meta pour mesurer nos publicités et montrer cette offre à plus de créateurs.", "Accepter", "Refuser"],
  es: ["Usamos cookies de Meta para medir nuestros anuncios y mostrar esta oferta a más creadores.", "Aceptar", "Rechazar"],
  de: ["Wir nutzen Meta-Cookies, um unsere Anzeigen zu messen und dieses Angebot mehr Creator:innen zu zeigen.", "Akzeptieren", "Ablehnen"],
  it: ["Usiamo i cookie di Meta per misurare i nostri annunci e mostrare questa offerta a più creator.", "Accetta", "Rifiuta"],
  pt: ["Usamos cookies da Meta para medir nossos anúncios e mostrar esta oferta a mais criadores.", "Aceitar", "Recusar"],
  nl: ["We gebruiken Meta-cookies om onze advertenties te meten en dit aanbod aan meer creators te tonen.", "Accepteren", "Weigeren"],
  pl: ["Używamy plików cookie Meta, aby mierzyć nasze reklamy i pokazywać tę ofertę większej liczbie twórców.", "Akceptuję", "Odrzucam"],
  sv: ["Vi använder Metas cookies för att mäta våra annonser och visa erbjudandet för fler kreatörer.", "Godkänn", "Avböj"],
  da: ["Vi bruger Metas cookies til at måle vores annoncer og vise tilbuddet til flere skabere.", "Accepter", "Afvis"],
  fi: ["Käytämme Metan evästeitä mainostemme mittaamiseen ja tarjouksen näyttämiseen useammille tekijöille.", "Hyväksy", "Hylkää"],
  no: ["Vi bruker Metas informasjonskapsler for å måle annonsene våre og vise tilbudet til flere skapere.", "Godta", "Avslå"],
  cs: ["Používáme cookies Meta k měření reklam a zobrazení nabídky více tvůrcům.", "Přijmout", "Odmítnout"],
  sk: ["Používame cookies Meta na meranie reklám a zobrazenie ponuky viacerým tvorcom.", "Prijať", "Odmietnuť"],
  hu: ["A Meta sütijeit használjuk hirdetéseink méréséhez és az ajánlat több alkotóhoz juttatásához.", "Elfogadom", "Elutasítom"],
  ro: ["Folosim cookie-uri Meta pentru a măsura reclamele și a arăta oferta mai multor creatori.", "Accept", "Refuz"],
  bg: ["Използваме бисквитки на Meta, за да измерваме рекламите си и да показваме офертата на повече създатели.", "Приемам", "Отказвам"],
  hr: ["Koristimo Meta kolačiće za mjerenje oglasa i prikaz ponude većem broju kreatora.", "Prihvaćam", "Odbijam"],
  sl: ["Uporabljamo piškotke Meta za merjenje oglasov in prikaz ponudbe več ustvarjalcem.", "Sprejmem", "Zavrnem"],
  el: ["Χρησιμοποιούμε cookies της Meta για να μετράμε τις διαφημίσεις μας και να δείχνουμε την προσφορά σε περισσότερους δημιουργούς.", "Αποδοχή", "Απόρριψη"],
  tr: ["Reklamlarımızı ölçmek ve bu teklifi daha fazla içerik üreticisine göstermek için Meta çerezlerini kullanıyoruz.", "Kabul et", "Reddet"],
  lt: ["Naudojame „Meta“ slapukus reklamai matuoti ir pasiūlymui rodyti daugiau kūrėjų.", "Sutinku", "Atsisakau"],
  lv: ["Mēs izmantojam Meta sīkdatnes, lai mērītu reklāmas un rādītu piedāvājumu vairāk satura veidotājiem.", "Piekrītu", "Noraidu"],
  et: ["Kasutame Meta küpsiseid reklaamide mõõtmiseks ja pakkumise näitamiseks rohkematele loojatele.", "Nõustun", "Keeldun"],
  ja: ["広告の効果測定と、より多くのクリエイターへの掲載のため、Meta の Cookie を使用します。", "同意する", "拒否する"],
  ko: ["광고 성과 측정과 더 많은 크리에이터에게 이 제안을 보여 주기 위해 Meta 쿠키를 사용합니다.", "동의", "거부"],
  ar: ["نستخدم ملفات تعريف الارتباط من Meta لقياس إعلاناتنا وعرض هذا العرض على مزيد من صناع المحتوى.", "موافقة", "رفض"],
  he: ["אנו משתמשים בעוגיות של Meta כדי למדוד את המודעות שלנו ולהציג את ההצעה ליותר יוצרים.", "אישור", "דחייה"],
  uk: ["Ми використовуємо файли cookie Meta, щоб вимірювати рекламу й показувати пропозицію більшій кількості авторів.", "Прийняти", "Відхилити"],
  sr: ["Користимо Meta колачиће за мерење огласа и приказ понуде већем броју креатора.", "Прихватам", "Одбијам"],
  is: ["Við notum vafrakökur frá Meta til að mæla auglýsingarnar okkar og sýna fleiri efnishöfundum þetta tilboð.", "Samþykkja", "Hafna"],
  hy: ["Մենք օգտագործում ենք Meta-ի cookie-ները՝ մեր գովազդները չափելու և այս առաջարկը ավելի շատ կրեատորների ցույց տալու համար։", "Ընդունել", "Մերժել"],
  ka: ["ვიყენებთ Meta-ს ქუქი-ფაილებს ჩვენი რეკლამების გასაზომად და ამ შეთავაზების მეტი კრეატორისთვის საჩვენებლად.", "მიღება", "უარყოფა"],
  kk: ["Жарнамаларымызды өлшеу және бұл ұсынысты көбірек креаторларға көрсету үшін Meta cookie файлдарын қолданамыз.", "Қабылдау", "Бас тарту"],
  hi: ["हम अपने विज्ञापनों को मापने और यह ऑफ़र ज़्यादा क्रिएटर्स तक पहुँचाने के लिए Meta कुकीज़ का इस्तेमाल करते हैं।", "स्वीकार करें", "अस्वीकार करें"],
  id: ["Kami menggunakan cookie Meta untuk mengukur iklan kami dan menampilkan penawaran ini ke lebih banyak kreator.", "Terima", "Tolak"],
  ms: ["Kami menggunakan kuki Meta untuk mengukur iklan kami dan menunjukkan tawaran ini kepada lebih ramai pencipta.", "Terima", "Tolak"],
  th: ["เราใช้คุกกี้ของ Meta เพื่อวัดผลโฆษณาและแสดงข้อเสนอนี้ให้ครีเอเตอร์มากขึ้น", "ยอมรับ", "ปฏิเสธ"],
  vi: ["Chúng tôi dùng cookie của Meta để đo lường quảng cáo và giới thiệu ưu đãi này đến nhiều creator hơn.", "Chấp nhận", "Từ chối"],
};

/** Bandeau de consentement publicitaire (RGPD) : le pixel ne se charge qu'après « Accepter ». */
export function ConsentBanner({ enabled }: { enabled: boolean }) {
  const { i18n } = useTranslation();
  const [consent, set] = useState(getConsent());
  useEffect(() => {
    const f = () => set(getConsent());
    window.addEventListener("vik-consent", f);
    return () => window.removeEventListener("vik-consent", f);
  }, []);
  if (!enabled || consent) return null;
  const [text, yes, no] = T[(i18n.resolvedLanguage ?? "en").slice(0, 2)] ?? T.en;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border bg-white p-4 shadow-[0_16px_40px_-12px_rgba(16,24,40,0.3)]" role="dialog" aria-label="Cookies" data-testid="consent-banner">
      <p className="text-[13px] leading-relaxed text-foreground">{text}</p>
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={() => setConsent("no")} className="h-9 rounded-lg border border-border-strong px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground">{no}</button>
        <button onClick={() => setConsent("yes")} className="h-9 rounded-lg bg-accent px-4 text-[13px] font-medium text-white">{yes}</button>
      </div>
    </div>
  );
}
