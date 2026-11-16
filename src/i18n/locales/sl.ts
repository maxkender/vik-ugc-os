import type { PublicDict } from "./types";
const sl: PublicDict = {
  common: { loading: "Nalaganje…", save: "Shrani", cancel: "Prekliči", logout: "Odjava", error: "Prišlo je do napake", language: "Jezik" },
  landing: {
    badge: "Plačan program za ustvarjalce",
    title: "Delo: ustvarjalec/ustvarjalka UGC vsebin za mobilno aplikacijo",
    subtitle: "S telefonom posnameš lastne kakovostne UGC videe in jih objaviš na TikToku in Instagramu, da promoviraš aplikacijo (za začetek študijsko aplikacijo z umetno inteligenco). 1 video na dan, plačilo za vsak potrjen video plus bonus za oglede.",
    perVideo: "na video", bonus: "bonus za oglede", bonusDetail: "{{rpm}} na {{views}} ogledov",
    cta: "Prijavi se", how: "Kako deluje",
    steps: [
      ["Prijavi se v 3 minutah", "Povej nam kaj o sebi in posnemi kratek predstavitveni video (»yap«)."],
      ["Podpiši pogodbo na spletu", "Pogodba za samostojnega ustvarjalca, podpisana z enim klikom."],
      ["Posnemi in objavi 1 video na dan", "S telefonom sam posnameš kakovosten UGC video. Vsako jutro dobiš: brief, referenčni video in hook."],
      ["Plačilo vsak teden", "Na video + bonus za oglede, izplačano tedensko prek Ruula."],
    ],
    examples: "Primeri videov, ki jih boš ustvarjal/a", faq: "Pogosta vprašanja",
    faqs: [
      ["Ali potrebujem veliko sledilcev?", "Ne. Pomembno je, kako govoriš pred kamero, ne število sledilcev. Tudi nov račun je v redu."],
      ["Kaj potrebujem?", "Pametni telefon, dobro svetlobo, račun na TikToku ali Instagramu in približno 30–45 minut na dan."],
      ["Kako sem plačan/a?", "Vsak teden prek Ruula (mednarodna izplačila na tvoj bančni račun). Delaš kot samostojni ustvarjalec."],
      ["Kdo se lahko prijavi?", "Vsak, ki je star vsaj 18 let in živi v eni od naših odprtih držav."],
    ],
    closed: "V tvoji državi prijave še niso odprte.", country: "Država",
  },
  apply: {
    title: "Prijava ustvarjalca", subtitle: "3 minute. Vsako prijavo preberemo osebno.",
    identity: "O tebi", firstName: "Ime", lastName: "Priimek", birthdate: "Datum rojstva", email: "E-pošta", phone: "Telefon (WhatsApp)",
    country: "Država prebivališča", languages: "Jeziki, ki jih govoriš", languagesHint: "Ločeni z vejico, npr. slovenščina, angleščina",
    experience: "Izkušnje", ugcExperience: "Si že delal/a UGC / vsebine? Na kratko opiši.",
    tiktok: "Povezava do tvojega TikTok profila", tiktokFollowers: "Sledilci na TikToku", instagram: "Povezava do tvojega Instagram profila", instagramFollowers: "Sledilci na Instagramu",
    equipment: "Oprema (model telefona, obročna luč, mikrofon…)", availability: "Razpoložljivost (ur na dan, časovni pas)", motivation: "Zakaj se nam želiš pridružiti?",
    yap: "Predstavitveni video (»yap«)", yapHint: "30–90 sekund, navpično, govori v kamero: kdo si in zakaj bi bil/a odličen/a. Največ 200 MB.",
    chooseVideo: "Izberi video", uploading: "Nalaganje… {{pct}} %", uploaded: "Video naložen ✓",
    adult: "Star/a sem 18 let ali več", consent: "Strinjam se, da {{brand}} obdeluje moje podatke za presojo prijave.",
    submit: "Pošlji prijavo", success: "Prijava poslana! Preveri e-pošto: pravkar smo ti poslali potrditev.",
    errors: { underage: "Biti moraš star/a vsaj 18 let.", already_applied: "S tem e-naslovom si se že prijavil/a.", yap_video: "Naloži svoj predstavitveni video.", country_closed: "V tej državi so prijave zaprte.", generic: "Preveri označena polja." },
  },
  sign: {
    title: "Tvoja pogodba ustvarjalca", read: "Pred podpisom preberi celotno pogodbo.",
    typeName: "Za podpis vpiši svoje polno ime", typeNameHint: "Ujemati se mora z: {{name}}", accept: "Pogodbo sem prebral/a in se z njo strinjam.",
    warn: "Ne podpiši, če ne želiš nadaljevati.", button: "Podpiši pogodbo",
    signed: "Pogodba podpisana {{date}}. Hvala! Dostop ti pošljemo po e-pošti.", download: "Prenesi podpisani PDF",
    expired: "Ta povezava je potekla. Piši nam, če se še želiš pridružiti.", notFound: "Pogodbe ni mogoče najti.",
    errors: { name_mismatch: "Ime se ne ujema s prijavo.", not_accepted: "Označi polje.", expired: "Ta pogodba je potekla.", hash_mismatch: "Dokument se je spremenil, osveži stran." },
  },
};
export default sl;
