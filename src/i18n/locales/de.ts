import type { PublicDict } from "./types";
const de: PublicDict = {
  common: { loading: "Wird geladen…", save: "Speichern", cancel: "Abbrechen", logout: "Abmelden", error: "Etwas ist schiefgelaufen", language: "Sprache" },
  landing: {
    badge: "Bezahltes Creator-Programm",
    title: "Job: UGC Content Creator für eine mobile App",
    subtitle: "Filme deine eigenen hochwertigen UGC-Videos mit deinem Handy und poste sie auf TikTok und Instagram, um eine App zu bewerben (zunächst eine KI-Lern-App). 1 Video pro Tag, bezahlt pro validiertem Video plus ein Views-Bonus.",
    perVideo: "pro Video", bonus: "Views-Bonus", bonusDetail: "{{rpm}} pro {{views}} Views",
    cta: "Jetzt bewerben", how: "So funktioniert's",
    steps: [
      ["In 3 Minuten bewerben", "Erzähl uns von dir und nimm ein kurzes Vorstellungsvideo auf (ein „Yap“)."],
      ["Vertrag online unterschreiben", "Vertrag als selbstständige:r Creator, mit einem Klick unterschrieben."],
      ["Dreh und poste 1 Video pro Tag", "Du drehst dein eigenes, hochwertiges UGC-Video mit dem Handy. Jeden Morgen bekommst du: ein Briefing, ein Referenzvideo und einen Hook."],
      ["Jede Woche bezahlt werden", "Pro Video + Views-Bonus, wöchentlich über Ruul ausgezahlt."],
    ],
    examples: "Beispiele für deine Videos", faq: "Häufige Fragen",
    faqs: [
      ["Brauche ich viele Follower?", "Nein. Uns ist wichtig, wie du vor der Kamera sprichst, nicht deine Followerzahl. Ein neuer Account reicht."],
      ["Was brauche ich?", "Ein Smartphone, gutes Licht, einen TikTok- oder Instagram-Account und etwa 30–45 Minuten pro Tag."],
      ["Wie werde ich bezahlt?", "Wöchentlich über Ruul (internationale Auszahlung auf dein Bankkonto). Du arbeitest selbstständig."],
      ["Wer kann sich bewerben?", "Alle ab 18 Jahren, die in einem unserer offenen Länder wohnen."],
    ],
    closed: "In deinem Land sind Bewerbungen noch nicht geöffnet.", country: "Land",
  },
  apply: {
    title: "Creator-Bewerbung", subtitle: "3 Minuten. Wir prüfen jede Bewerbung persönlich.",
    identity: "Über dich", firstName: "Vorname", lastName: "Nachname", birthdate: "Geburtsdatum", email: "E-Mail", phone: "Telefon (WhatsApp)",
    country: "Wohnsitzland", languages: "Sprachen, die du sprichst", languagesHint: "Durch Komma getrennt, z. B. Deutsch, Englisch",
    experience: "Erfahrung", ugcExperience: "Hast du schon UGC / Content gemacht? Erzähl kurz davon.",
    tiktok: "Link zu deinem TikTok-Profil", tiktokFollowers: "TikTok-Follower", instagram: "Link zu deinem Instagram-Profil", instagramFollowers: "Instagram-Follower",
    equipment: "Ausrüstung (Handymodell, Ringlicht, Mikro…)", availability: "Verfügbarkeit (Stunden pro Tag, Zeitzone)", motivation: "Warum möchtest du mitmachen?",
    yap: "Vorstellungsvideo („Yap“)", yapHint: "30–90 Sekunden, hochkant, in die Kamera sprechen: wer du bist und warum du super passt. Max. 200 MB.",
    chooseVideo: "Video auswählen", uploading: "Wird hochgeladen… {{pct}} %", uploaded: "Video hochgeladen ✓",
    adult: "Ich bin mindestens 18 Jahre alt", consent: "Ich bin einverstanden, dass {{brand}} meine Daten zur Prüfung meiner Bewerbung verarbeitet.",
    submit: "Bewerbung absenden", success: "Bewerbung gesendet! Schau in dein Postfach: Wir haben dir gerade eine Bestätigung geschickt.",
    errors: { underage: "Du musst mindestens 18 Jahre alt sein.", already_applied: "Mit dieser E-Mail hast du dich bereits beworben.", yap_video: "Bitte lade dein Vorstellungsvideo hoch.", country_closed: "In diesem Land sind Bewerbungen geschlossen.", generic: "Bitte prüfe die markierten Felder." },
  },
  sign: {
    title: "Dein Creator-Vertrag", read: "Bitte lies den ganzen Vertrag, bevor du unterschreibst.",
    typeName: "Gib zum Unterschreiben deinen vollständigen Namen ein", typeNameHint: "Muss übereinstimmen mit: {{name}}", accept: "Ich habe diesen Vertrag gelesen und akzeptiere ihn.",
    warn: "Bitte unterschreibe nicht, wenn du nicht weitermachen möchtest.", button: "Vertrag unterschreiben",
    signed: "Vertrag unterschrieben am {{date}}. Danke! Deine Zugangsdaten kommen per E-Mail.", download: "Unterschriebenes PDF herunterladen",
    expired: "Dieser Link ist abgelaufen. Melde dich bei uns, wenn du noch mitmachen möchtest.", notFound: "Vertrag nicht gefunden.",
    errors: { name_mismatch: "Der Name stimmt nicht mit der Bewerbung überein.", not_accepted: "Bitte setze das Häkchen.", expired: "Dieser Vertrag ist abgelaufen.", hash_mismatch: "Das Dokument hat sich geändert, bitte lade die Seite neu." },
  },
};
export default de;
