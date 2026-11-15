import type { PublicDict } from "./types";
const pl: PublicDict = {
  common: { loading: "Ładowanie…", save: "Zapisz", cancel: "Anuluj", logout: "Wyloguj się", error: "Coś poszło nie tak", language: "Język" },
  landing: {
    badge: "Płatny program dla twórców",
    title: "Zarabiaj na tworzeniu filmików. Zostań twórcą {{brand}}.",
    subtitle: "Publikuj 2 krótkie filmiki dziennie o aplikacjach, które uwielbiają studenci. Zarabiaj {{price}} za filmik plus bonus za wyświetlenia.",
    perVideo: "za filmik", bonus: "bonus za wyświetlenia", bonusDetail: "{{rpm}} za każde {{views}} wyświetleń",
    monthly: "do {{amount}}/miesiąc", monthlyHint: "2 filmiki dziennie, bez bonusu",
    cta: "Aplikuj teraz", how: "Jak to działa",
    steps: [
      ["Aplikuj w 3 minuty", "Opowiedz nam o sobie i nagraj krótkie wideo powitalne (tzw. „yap”)."],
      ["Podpisz umowę online", "Umowa niezależnego twórcy, podpisana jednym kliknięciem."],
      ["Publikuj 2 filmiki dziennie", "Każdego ranka dostajesz 2 briefy: filmik referencyjny, hook i proste instrukcje."],
      ["Wypłata co tydzień", "Za filmik + bonus za wyświetlenia, wypłacane co tydzień przez Ruul."],
    ],
    examples: "Przykłady filmików, które zrobisz", faq: "Najczęstsze pytania",
    faqs: [
      ["Czy potrzebuję wielu obserwujących?", "Nie. Liczy się to, jak mówisz do kamery, a nie liczba obserwujących. Nowe konto też się nada."],
      ["Czego potrzebuję?", "Smartfona, dobrego światła, konta na TikToku lub Instagramie i około 30–45 minut dziennie."],
      ["Jak dostaję wypłatę?", "Co tydzień przez Ruul (międzynarodowe przelewy na Twoje konto). Pracujesz jako niezależny twórca."],
      ["Kto może aplikować?", "Każdy, kto ma co najmniej 18 lat i mieszka w jednym z naszych otwartych krajów."],
    ],
    closed: "W Twoim kraju rekrutacja nie jest jeszcze otwarta.", country: "Kraj",
  },
  apply: {
    title: "Zgłoszenie twórcy", subtitle: "3 minuty. Każde zgłoszenie czytamy osobiście.",
    identity: "O Tobie", firstName: "Imię", lastName: "Nazwisko", birthdate: "Data urodzenia", email: "E-mail", phone: "Telefon (WhatsApp)",
    country: "Kraj zamieszkania", languages: "Języki, którymi mówisz", languagesHint: "Oddzielone przecinkami, np. polski, angielski",
    experience: "Doświadczenie", ugcExperience: "Robiłeś/aś już UGC / content? Opowiedz krótko.",
    tiktok: "Link do profilu TikTok", tiktokFollowers: "Obserwujący na TikToku", instagram: "Link do profilu Instagram", instagramFollowers: "Obserwujący na Instagramie",
    equipment: "Sprzęt (model telefonu, lampa pierścieniowa, mikrofon…)", availability: "Dostępność (godziny dziennie, strefa czasowa)", motivation: "Dlaczego chcesz do nas dołączyć?",
    yap: "Wideo powitalne („yap”)", yapHint: "30–90 sekund, pionowo, mówiąc do kamery: kim jesteś i dlaczego świetnie się nadajesz. Maks. 200 MB.",
    chooseVideo: "Wybierz wideo", uploading: "Przesyłanie… {{pct}}%", uploaded: "Wideo przesłane ✓",
    adult: "Mam co najmniej 18 lat", consent: "Zgadzam się, aby {{brand}} przetwarzało moje dane w celu rozpatrzenia zgłoszenia.",
    submit: "Wyślij zgłoszenie", success: "Zgłoszenie wysłane! Sprawdź skrzynkę: właśnie wysłaliśmy Ci potwierdzenie.",
    errors: { underage: "Musisz mieć co najmniej 18 lat.", already_applied: "Zgłoszenie z tym adresem e-mail już istnieje.", yap_video: "Prześlij swoje wideo powitalne.", country_closed: "W tym kraju rekrutacja jest zamknięta.", generic: "Sprawdź zaznaczone pola." },
  },
  sign: {
    title: "Twoja umowa twórcy", read: "Przeczytaj całą umowę przed podpisaniem.",
    typeName: "Wpisz pełne imię i nazwisko, aby podpisać", typeNameHint: "Musi się zgadzać z: {{name}}", accept: "Przeczytałem/am i akceptuję tę umowę.",
    warn: "Nie podpisuj, jeśli nie chcesz kontynuować.", button: "Podpisz umowę",
    signed: "Umowa podpisana {{date}}. Dziękujemy! Dane dostępu wyślemy e-mailem.", download: "Pobierz podpisany PDF",
    expired: "Ten link wygasł. Napisz do nas, jeśli nadal chcesz dołączyć.", notFound: "Nie znaleziono umowy.",
    errors: { name_mismatch: "Imię i nazwisko nie zgadzają się ze zgłoszeniem.", not_accepted: "Zaznacz pole wyboru.", expired: "Ta umowa wygasła.", hash_mismatch: "Dokument się zmienił, odśwież stronę." },
  },
};
export default pl;
