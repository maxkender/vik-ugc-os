import type { PublicDict } from "./types";
import ar from "./ar"; import bg from "./bg"; import cs from "./cs"; import da from "./da"; import de from "./de";
import el from "./el"; import et from "./et"; import fi from "./fi"; import he from "./he"; import hr from "./hr";
import hu from "./hu"; import it from "./it"; import ja from "./ja"; import ko from "./ko"; import lt from "./lt";
import lv from "./lv"; import nl from "./nl"; import no from "./no"; import pl from "./pl"; import pt from "./pt";
import ro from "./ro"; import sk from "./sk"; import sl from "./sl"; import sr from "./sr"; import sv from "./sv";
import tr from "./tr"; import uk from "./uk";
import is from "./is"; import hy from "./hy"; import ka from "./ka"; import kk from "./kk"; import hi from "./hi";
import id from "./id"; import ms from "./ms"; import th from "./th"; import vi from "./vi";

/** Traductions des espaces publics (common/landing/apply/sign) ; le reste retombe sur l'anglais. */
export const LOCALES: Record<string, PublicDict> = {
  ar, bg, cs, da, de, el, et, fi, he, hr, hu, it, ja, ko, lt, lv, nl, no, pl, pt, ro, sk, sl, sr, sv, tr, uk,
  is, hy, ka, kk, hi, id, ms, th, vi,
};

/** Nom natif de chaque langue. */
export const LOCALE_LABELS: Record<string, string> = {
  ar: "العربية", bg: "Български", cs: "Čeština", da: "Dansk", de: "Deutsch", el: "Ελληνικά", et: "Eesti",
  fi: "Suomi", he: "עברית", hr: "Hrvatski", hu: "Magyar", it: "Italiano", ja: "日本語", ko: "한국어",
  lt: "Lietuvių", lv: "Latviešu", nl: "Nederlands", no: "Norsk", pl: "Polski", pt: "Português (Brasil)", ro: "Română",
  sk: "Slovenčina", sl: "Slovenščina", sr: "Srpski", sv: "Svenska", tr: "Türkçe", uk: "Українська",
  is: "Íslenska", hy: "Հայերեն", ka: "ქართული", kk: "Қазақ тілі", hi: "हिन्दी", id: "Bahasa Indonesia",
  ms: "Bahasa Melayu", th: "ไทย", vi: "Tiếng Việt",
};
