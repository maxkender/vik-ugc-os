import type { PublicDict } from "./types";
const ro: PublicDict = {
  common: { loading: "Se încarcă…", save: "Salvează", cancel: "Anulează", logout: "Deconectare", error: "Ceva n-a mers bine", language: "Limbă" },
  landing: {
    badge: "Program plătit pentru creatori",
    title: "Job: creator de conținut UGC pentru o aplicație mobilă",
    subtitle: "Îți filmezi singur/ă propriile videoclipuri UGC de calitate cu telefonul și le postezi pe TikTok și Instagram pentru a promova o aplicație (la început, o aplicație de studiu cu AI). 1 videoclip pe zi, plătit per videoclip validat, plus un bonus în funcție de vizualizări.",
    perVideo: "pe clip", bonus: "bonus de vizualizări", bonusDetail: "{{rpm}} la {{views}} vizualizări",
    cta: "Aplică acum", how: "Cum funcționează",
    steps: [
      ["Aplică în 3 minute", "Spune-ne câte ceva despre tine și filmează un scurt clip de prezentare (un „yap”)."],
      ["Semnează contractul online", "Contract de creator independent, semnat cu un singur click."],
      ["Filmează și postează 1 videoclip pe zi", "Filmezi singur, cu telefonul, un videoclip UGC de calitate. În fiecare dimineață primești: un brief, un videoclip de referință și un hook."],
      ["Plată în fiecare săptămână", "Pe clip + bonus de vizualizări, plătit săptămânal prin Ruul."],
    ],
    examples: "Exemple de clipuri pe care le vei face", faq: "Întrebări frecvente",
    faqs: [
      ["Am nevoie de mulți urmăritori?", "Nu. Contează cum vorbești în fața camerei, nu numărul de urmăritori. Merge și un cont nou."],
      ["De ce am nevoie?", "Un smartphone, lumină bună, un cont de TikTok sau Instagram și cam 30–45 de minute pe zi."],
      ["Cum sunt plătit?", "Săptămânal prin Ruul (plăți internaționale în contul tău bancar). Lucrezi ca creator independent."],
      ["Cine poate aplica?", "Oricine are cel puțin 18 ani și locuiește într-una dintre țările noastre deschise."],
    ],
    closed: "Înscrierile nu sunt încă deschise în țara ta.", country: "Țară",
  },
  apply: {
    title: "Aplicație de creator", subtitle: "3 minute. Citim personal fiecare aplicație.",
    identity: "Despre tine", firstName: "Prenume", lastName: "Nume", birthdate: "Data nașterii", email: "Email", phone: "Telefon (WhatsApp)",
    country: "Țara de reședință", languages: "Limbi pe care le vorbești", languagesHint: "Separate prin virgulă, ex. română, engleză",
    experience: "Experiență", ugcExperience: "Ai mai făcut UGC / conținut? Povestește-ne pe scurt.",
    tiktok: "Linkul profilului tău de TikTok", tiktokFollowers: "Urmăritori pe TikTok", instagram: "Linkul profilului tău de Instagram", instagramFollowers: "Urmăritori pe Instagram",
    equipment: "Echipament (model de telefon, ring light, microfon…)", availability: "Disponibilitate (ore pe zi, fus orar)", motivation: "De ce vrei să ni te alături?",
    yap: "Clip de prezentare („yap”)", yapHint: "30–90 de secunde, vertical, vorbește în cameră: cine ești și de ce ai fi perfect/ă. Maximum 200 MB.",
    chooseVideo: "Alege clipul", uploading: "Se încarcă… {{pct}}%", uploaded: "Clip încărcat ✓",
    adult: "Am cel puțin 18 ani", consent: "Sunt de acord ca {{brand}} să-mi prelucreze datele pentru evaluarea aplicației.",
    submit: "Trimite aplicația", success: "Aplicație trimisă! Verifică-ți emailul: tocmai ți-am trimis o confirmare.",
    errors: { underage: "Trebuie să ai cel puțin 18 ani.", already_applied: "Există deja o aplicație cu acest email.", yap_video: "Încarcă clipul tău de prezentare.", country_closed: "Înscrierile sunt închise în această țară.", generic: "Verifică câmpurile marcate." },
  },
  sign: {
    title: "Contractul tău de creator", read: "Citește tot contractul înainte să semnezi.",
    typeName: "Scrie-ți numele complet pentru a semna", typeNameHint: "Trebuie să corespundă cu: {{name}}", accept: "Am citit contractul și sunt de acord cu el.",
    warn: "Nu semna dacă nu vrei să continui.", button: "Semnează contractul",
    signed: "Contract semnat pe {{date}}. Mulțumim! Îți trimitem accesul pe email.", download: "Descarcă PDF-ul semnat",
    expired: "Linkul a expirat. Scrie-ne dacă vrei în continuare să ni te alături.", notFound: "Contractul nu a fost găsit.",
    errors: { name_mismatch: "Numele nu corespunde cu aplicația.", not_accepted: "Bifează căsuța.", expired: "Acest contract a expirat.", hash_mismatch: "Documentul s-a schimbat, reîncarcă pagina." },
  },
};
export default ro;
