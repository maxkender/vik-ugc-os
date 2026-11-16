import type { PublicDict } from "./types";
const lt: PublicDict = {
  common: { loading: "Įkeliama…", save: "Išsaugoti", cancel: "Atšaukti", logout: "Atsijungti", error: "Kažkas nepavyko", language: "Kalba" },
  landing: {
    badge: "Apmokama kūrėjų programa",
    title: "Darbas: UGC turinio kūrėjas (-a) mobiliajai programėlei",
    subtitle: "Filmuok savo kokybiškus UGC vaizdo įrašus telefonu ir skelbk juos TikTok bei Instagram, kad reklamuotum programėlę (pradžiai – dirbtinio intelekto mokymosi programėlę). 1 vaizdo įrašas per dieną, mokama už kiekvieną patvirtintą vaizdo įrašą plius priedas už peržiūras.",
    perVideo: "už įrašą", bonus: "peržiūrų premija", bonusDetail: "{{rpm}} už {{views}} peržiūrų",
    cta: "Teikti paraišką", how: "Kaip tai veikia",
    steps: [
      ["Pateik paraišką per 3 minutes", "Papasakok apie save ir nufilmuok trumpą prisistatymo vaizdo įrašą („yap“)."],
      ["Pasirašyk sutartį internetu", "Savarankiško kūrėjo sutartis, pasirašoma vienu paspaudimu."],
      ["Nufilmuok ir paskelbk 1 vaizdo įrašą per dieną", "Savo telefonu pats nufilmuoji kokybišką UGC vaizdo įrašą. Kiekvieną rytą gauni: brifą, pavyzdinį vaizdo įrašą ir hook'ą."],
      ["Išmokos kas savaitę", "Už įrašą + peržiūrų premija, mokama kas savaitę per Ruul."],
    ],
    examples: "Įrašų, kuriuos kursi, pavyzdžiai", faq: "DUK",
    faqs: [
      ["Ar reikia daug sekėjų?", "Ne. Mums svarbu, kaip kalbi prieš kamerą, o ne sekėjų skaičius. Tinka ir nauja paskyra."],
      ["Ko man reikia?", "Išmaniojo telefono, gero apšvietimo, TikTok ar Instagram paskyros ir maždaug 30–45 minučių per dieną."],
      ["Kaip man mokama?", "Kas savaitę per Ruul (tarptautiniai pervedimai į tavo banko sąskaitą). Dirbi kaip savarankiškas kūrėjas."],
      ["Kas gali teikti paraišką?", "Visi, kuriems 18 ar daugiau metų ir kurie gyvena vienoje iš mūsų atvirų šalių."],
    ],
    closed: "Tavo šalyje paraiškų dar nepriimame.", country: "Šalis",
  },
  apply: {
    title: "Kūrėjo paraiška", subtitle: "3 minutės. Kiekvieną paraišką perskaitome patys.",
    identity: "Apie tave", firstName: "Vardas", lastName: "Pavardė", birthdate: "Gimimo data", email: "El. paštas", phone: "Telefonas (WhatsApp)",
    country: "Gyvenamoji šalis", languages: "Kalbos, kuriomis kalbi", languagesHint: "Atskirtos kableliais, pvz., lietuvių, anglų",
    experience: "Patirtis", ugcExperience: "Ar jau kūrei UGC / turinį? Trumpai papasakok.",
    tiktok: "Nuoroda į tavo TikTok profilį", tiktokFollowers: "TikTok sekėjai", instagram: "Nuoroda į tavo Instagram profilį", instagramFollowers: "Instagram sekėjai",
    equipment: "Įranga (telefono modelis, žiedinė lempa, mikrofonas…)", availability: "Prieinamumas (valandos per dieną, laiko juosta)", motivation: "Kodėl nori prisijungti?",
    yap: "Prisistatymo vaizdo įrašas („yap“)", yapHint: "30–90 sekundžių, vertikaliai, kalbėk į kamerą: kas tu ir kodėl puikiai tiktum. Iki 200 MB.",
    chooseVideo: "Pasirinkti įrašą", uploading: "Įkeliama… {{pct}} %", uploaded: "Įrašas įkeltas ✓",
    adult: "Man yra 18 ar daugiau metų", consent: "Sutinku, kad {{brand}} tvarkytų mano duomenis paraiškai įvertinti.",
    submit: "Siųsti paraišką", success: "Paraiška išsiųsta! Patikrink el. paštą: ką tik išsiuntėme patvirtinimą.",
    errors: { underage: "Tau turi būti bent 18 metų.", already_applied: "Su šiuo el. paštu paraiška jau pateikta.", yap_video: "Įkelk savo prisistatymo įrašą.", country_closed: "Šioje šalyje paraiškos nebepriimamos.", generic: "Patikrink pažymėtus laukus." },
  },
  sign: {
    title: "Tavo kūrėjo sutartis", read: "Prieš pasirašydamas perskaityk visą sutartį.",
    typeName: "Norėdamas pasirašyti, įrašyk savo vardą ir pavardę", typeNameHint: "Turi sutapti su: {{name}}", accept: "Perskaičiau sutartį ir su ja sutinku.",
    warn: "Nepasirašyk, jei nenori tęsti.", button: "Pasirašyti sutartį",
    signed: "Sutartis pasirašyta {{date}}. Ačiū! Prieigą atsiųsime el. paštu.", download: "Atsisiųsti pasirašytą PDF",
    expired: "Ši nuoroda nebegalioja. Parašyk mums, jei vis dar nori prisijungti.", notFound: "Sutartis nerasta.",
    errors: { name_mismatch: "Vardas nesutampa su paraiška.", not_accepted: "Pažymėk langelį.", expired: "Ši sutartis nebegalioja.", hash_mismatch: "Dokumentas pasikeitė, atnaujink puslapį." },
  },
};
export default lt;
