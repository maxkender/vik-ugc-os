import type { PublicDict } from "./types";
const fi: PublicDict = {
  common: { loading: "Ladataan…", save: "Tallenna", cancel: "Peruuta", logout: "Kirjaudu ulos", error: "Jokin meni pieleen", language: "Kieli" },
  landing: {
    badge: "Palkallinen sisällöntuottajaohjelma",
    title: "Työ: UGC-sisällöntuottaja mobiilisovellukselle",
    subtitle: "Kuvaat itse laadukkaita UGC-videoita puhelimellasi ja julkaiset ne TikTokissa ja Instagramissa sovelluksen mainostamiseksi (aluksi tekoälyopiskelusovellus). 1 video päivässä, maksu hyväksytystä videosta sekä katselukertabonus.",
    perVideo: "per video", bonus: "katselubonus", bonusDetail: "{{rpm}} / {{views}} katselukertaa",
    cta: "Hae nyt", how: "Näin se toimii",
    steps: [
      ["Hae 3 minuutissa", "Kerro itsestäsi ja kuvaa lyhyt esittelyvideo (ns. \"yap\")."],
      ["Allekirjoita sopimus verkossa", "Itsenäisen tekijän sopimus, allekirjoitettu yhdellä klikkauksella."],
      ["Kuvaa ja postaa 1 video päivässä", "Kuvaat itse laadukkaan UGC-videon puhelimellasi. Joka aamu saat: briefin, esimerkkivideon ja hookin."],
      ["Palkka joka viikko", "Per video + katselubonus, maksetaan viikoittain Ruulin kautta."],
    ],
    examples: "Esimerkkejä videoista, joita teet", faq: "Usein kysytyt kysymykset",
    faqs: [
      ["Tarvitsenko paljon seuraajia?", "Et. Meille on tärkeää, miten puhut kameralle, ei seuraajamäärä. Uusi tili käy hyvin."],
      ["Mitä tarvitsen?", "Älypuhelimen, hyvän valon, TikTok- tai Instagram-tilin ja noin 30–45 minuuttia päivässä."],
      ["Miten minulle maksetaan?", "Viikoittain Ruulin kautta (kansainväliset maksut pankkitilillesi). Työskentelet itsenäisenä tekijänä."],
      ["Kuka voi hakea?", "Kaikki vähintään 18-vuotiaat, jotka asuvat jossakin avoimista maistamme."],
    ],
    closed: "Haku ei ole vielä auki maassasi.", country: "Maa",
  },
  apply: {
    title: "Tekijähakemus", subtitle: "3 minuuttia. Luemme jokaisen hakemuksen itse.",
    identity: "Sinusta", firstName: "Etunimi", lastName: "Sukunimi", birthdate: "Syntymäaika", email: "Sähköposti", phone: "Puhelin (WhatsApp)",
    country: "Asuinmaa", languages: "Puhumasi kielet", languagesHint: "Pilkulla erotettuna, esim. suomi, englanti",
    experience: "Kokemus", ugcExperience: "Oletko tehnyt UGC:tä / sisältöä aiemmin? Kerro lyhyesti.",
    tiktok: "Linkki TikTok-profiiliisi", tiktokFollowers: "TikTok-seuraajat", instagram: "Linkki Instagram-profiiliisi", instagramFollowers: "Instagram-seuraajat",
    equipment: "Varusteet (puhelinmalli, rengasvalo, mikrofoni…)", availability: "Saatavuus (tuntia päivässä, aikavyöhyke)", motivation: "Miksi haluat mukaan?",
    yap: "Esittelyvideo (\"yap\")", yapHint: "30–90 sekuntia, pystykuva, puhu kameralle: kuka olet ja miksi sopisit täydellisesti. Enintään 200 Mt.",
    chooseVideo: "Valitse video", uploading: "Lähetetään… {{pct}} %", uploaded: "Video lähetetty ✓",
    adult: "Olen vähintään 18-vuotias", consent: "Hyväksyn, että {{brand}} käsittelee tietojani hakemukseni arviointia varten.",
    submit: "Lähetä hakemus", success: "Hakemus lähetetty! Tarkista sähköpostisi: lähetimme juuri vahvistuksen.",
    errors: { underage: "Sinun on oltava vähintään 18-vuotias.", already_applied: "Olet jo hakenut tällä sähköpostilla.", yap_video: "Lähetä esittelyvideosi.", country_closed: "Haku on suljettu tässä maassa.", generic: "Tarkista merkityt kentät." },
  },
  sign: {
    title: "Tekijäsopimuksesi", read: "Lue koko sopimus ennen allekirjoittamista.",
    typeName: "Kirjoita koko nimesi allekirjoittaaksesi", typeNameHint: "Pitää vastata nimeä: {{name}}", accept: "Olen lukenut sopimuksen ja hyväksyn sen.",
    warn: "Älä allekirjoita, jos et halua jatkaa.", button: "Allekirjoita sopimus",
    signed: "Sopimus allekirjoitettu {{date}}. Kiitos! Tunnukset tulevat sähköpostiisi.", download: "Lataa allekirjoitettu PDF",
    expired: "Linkki on vanhentunut. Ota yhteyttä, jos haluat yhä mukaan.", notFound: "Sopimusta ei löytynyt.",
    errors: { name_mismatch: "Nimi ei vastaa hakemusta.", not_accepted: "Rastita ruutu.", expired: "Sopimus on vanhentunut.", hash_mismatch: "Asiakirja on muuttunut, lataa sivu uudelleen." },
  },
};
export default fi;
