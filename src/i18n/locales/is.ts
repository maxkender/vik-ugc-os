import type { PublicDict } from "./types";
const is: PublicDict = {
  common: { loading: "Hleður…", save: "Vista", cancel: "Hætta við", logout: "Skrá út", error: "Eitthvað fór úrskeiðis", language: "Tungumál" },
  landing: {
    badge: "Launað verkefni fyrir efnishöfunda",
    title: "Starf: UGC efnisskapari fyrir snjallforrit",
    subtitle: "Þú tekur upp þín eigin vönduðu UGC myndbönd með símanum og birtir þau á TikTok og Instagram til að kynna app (fyrst um sinn námsapp með gervigreind). 1 myndband á dag, greitt fyrir hvert samþykkt myndband auk bónuss fyrir áhorf.",
    perVideo: "á myndband", bonus: "áhorfsbónus", bonusDetail: "{{rpm}} fyrir hver {{views}} áhorf",
    cta: "Sækja um", how: "Svona virkar þetta",
    steps: [
      ["Sæktu um á 3 mínútum", "Segðu okkur frá þér og taktu upp stutt kynningarmyndband (\"yap\")."],
      ["Skrifaðu undir samning á netinu", "Samningur sem sjálfstæður efnishöfundur, undirritaður með einum smelli."],
      ["Taktu upp og birtu 1 myndband á dag", "Þú tekur sjálf(ur) upp vandað UGC-myndband á símann þinn. Á hverjum morgni færðu: brief, viðmiðunarmyndband og hook."],
      ["Fáðu borgað vikulega", "Á myndband + áhorfsbónus, greitt vikulega í gegnum Ruul."],
    ],
    examples: "Dæmi um það sem þú býrð til", faq: "Algengar spurningar",
    faqs: [
      ["Þarf ég marga fylgjendur?", "Nei. Okkur er annt um hvernig þú talar í myndavélina, ekki fjölda fylgjenda. Nýr aðgangur dugar."],
      ["Hvað þarf ég?", "Snjallsíma, góða birtu, TikTok- eða Instagram-aðgang og um 30–45 mínútur á dag."],
      ["Hvernig fæ ég borgað?", "Vikulega í gegnum Ruul (alþjóðleg greiðsla inn á bankareikninginn þinn). Þú starfar sem verktaki."],
      ["Hverjir geta sótt um?", "Allir 18 ára og eldri sem búa í einu af löndunum sem eru opin."],
    ],
    closed: "Ekki er enn opið fyrir umsóknir í þínu landi.", country: "Land",
  },
  apply: {
    title: "Umsókn efnishöfundar", subtitle: "3 mínútur. Við förum persónulega yfir hverja umsókn.",
    identity: "Um þig", firstName: "Fornafn", lastName: "Eftirnafn", birthdate: "Fæðingardagur", email: "Netfang", phone: "Sími (WhatsApp)",
    country: "Búsetuland", languages: "Tungumál sem þú talar", languagesHint: "Aðskilin með kommu, t.d. íslenska, enska",
    experience: "Reynsla", ugcExperience: "Hefurðu gert UGC / efni áður? Segðu okkur í stuttu máli.",
    tiktok: "Hlekkur á TikTok-prófílinn þinn", tiktokFollowers: "Fylgjendur á TikTok", instagram: "Hlekkur á Instagram-prófílinn þinn", instagramFollowers: "Fylgjendur á Instagram",
    equipment: "Búnaður (gerð síma, hringljós, hljóðnemi…)", availability: "Tími til ráðstöfunar (klst. á dag, tímabelti)", motivation: "Af hverju viltu vera með?",
    yap: "Kynningarmyndband (\"yap\")", yapHint: "30–90 sekúndur, lóðrétt, talaðu í myndavélina: hver þú ert og af hverju þú myndir passa vel. Hám. 200 MB.",
    chooseVideo: "Velja myndband", uploading: "Hleð upp… {{pct}}%", uploaded: "Myndband komið inn ✓",
    adult: "Ég er 18 ára eða eldri", consent: "Ég samþykki að {{brand}} vinni úr gögnunum mínum til að fara yfir umsóknina.",
    submit: "Senda umsókn", success: "Umsókn send! Kíktu í pósthólfið: við vorum að senda þér staðfestingu.",
    errors: { underage: "Þú verður að vera 18 ára eða eldri.", already_applied: "Þú hefur þegar sótt um með þessu netfangi.", yap_video: "Hladdu upp kynningarmyndbandinu þínu.", country_closed: "Lokað er fyrir umsóknir í þessu landi.", generic: "Athugaðu merktu reitina." },
  },
  sign: {
    title: "Samningurinn þinn sem efnishöfundur", read: "Lestu allan samninginn áður en þú skrifar undir.",
    typeName: "Sláðu inn fullt nafn til að skrifa undir", typeNameHint: "Verður að passa við: {{name}}", accept: "Ég hef lesið og samþykki þennan samning.",
    warn: "Ekki skrifa undir ef þú vilt ekki halda áfram.", button: "Skrifa undir samning",
    signed: "Samningur undirritaður {{date}}. Takk! Aðgangsupplýsingar koma í tölvupósti.", download: "Sækja undirritað PDF",
    expired: "Þessi hlekkur er útrunninn. Hafðu samband ef þú vilt enn vera með.", notFound: "Samningur fannst ekki.",
    errors: { name_mismatch: "Nafnið passar ekki við umsóknina.", not_accepted: "Hakaðu í reitinn.", expired: "Þessi samningur er útrunninn.", hash_mismatch: "Skjalið hefur breyst, endurhlaðið síðuna." },
  },
};
export default is;
