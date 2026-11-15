import type { PublicDict } from "./types";
const tr: PublicDict = {
  common: { loading: "Yükleniyor…", save: "Kaydet", cancel: "İptal", logout: "Çıkış yap", error: "Bir şeyler ters gitti", language: "Dil" },
  landing: {
    badge: "Ücretli içerik üretici programı",
    title: "Video çekerek para kazan. {{brand}} içerik üreticisi ol.",
    subtitle: "Öğrencilerin sevdiği uygulamalar hakkında günde 2 kısa video paylaş. Video başına {{price}}, üstüne izlenme bonusu kazan.",
    perVideo: "video başına", bonus: "izlenme bonusu", bonusDetail: "{{views}} izlenme başına {{rpm}}",
    monthly: "ayda {{amount}}'a kadar", monthlyHint: "günde 2 video, bonus hariç",
    cta: "Başvur", how: "Nasıl çalışır",
    steps: [
      ["3 dakikada başvur", "Bize kendinden bahset ve kısa bir tanıtım videosu (\"yap\") çek."],
      ["Sözleşmeyi online imzala", "Bağımsız içerik üretici sözleşmesi, tek tıkla imzalanır."],
      ["Günde 2 video paylaş", "Her sabah 2 brief alırsın: referans video, hook ve basit talimatlar."],
      ["Her hafta ödeme", "Video başına + izlenme bonusu, Ruul üzerinden haftalık ödenir."],
    ],
    examples: "Çekeceğin videolardan örnekler", faq: "Sık sorulan sorular",
    faqs: [
      ["Çok takipçim olması gerekiyor mu?", "Hayır. Önemli olan kamerada nasıl konuştuğun, takipçi sayın değil. Yeni bir hesap da olur."],
      ["Neye ihtiyacım var?", "Bir akıllı telefon, iyi ışık, TikTok ya da Instagram hesabı ve günde yaklaşık 30–45 dakika."],
      ["Nasıl ödeme alırım?", "Her hafta Ruul üzerinden (banka hesabına uluslararası ödeme). Bağımsız içerik üretici olarak çalışırsın."],
      ["Kimler başvurabilir?", "Açık ülkelerimizden birinde yaşayan 18 yaş ve üzeri herkes."],
    ],
    closed: "Ülkende başvurular henüz açılmadı.", country: "Ülke",
  },
  apply: {
    title: "İçerik üretici başvurusu", subtitle: "3 dakika. Her başvuruyu bizzat okuyoruz.",
    identity: "Hakkında", firstName: "Ad", lastName: "Soyad", birthdate: "Doğum tarihi", email: "E-posta", phone: "Telefon (WhatsApp)",
    country: "Yaşadığın ülke", languages: "Konuştuğun diller", languagesHint: "Virgülle ayır, ör. Türkçe, İngilizce",
    experience: "Deneyim", ugcExperience: "Daha önce UGC / içerik ürettin mi? Kısaca anlat.",
    tiktok: "TikTok profil linkin", tiktokFollowers: "TikTok takipçileri", instagram: "Instagram profil linkin", instagramFollowers: "Instagram takipçileri",
    equipment: "Ekipman (telefon modeli, halka ışık, mikrofon…)", availability: "Müsaitlik (günlük saat, saat dilimi)", motivation: "Neden bize katılmak istiyorsun?",
    yap: "Tanıtım videosu (\"yap\")", yapHint: "30–90 saniye, dikey, kameraya konuş: kimsin ve neden harika olursun. En fazla 200 MB.",
    chooseVideo: "Video seç", uploading: "Yükleniyor… %{{pct}}", uploaded: "Video yüklendi ✓",
    adult: "18 yaşında veya daha büyüğüm", consent: "{{brand}}'in başvurumu değerlendirmek için verilerimi işlemesini kabul ediyorum.",
    submit: "Başvuruyu gönder", success: "Başvuru gönderildi! E-postanı kontrol et: sana bir onay gönderdik.",
    errors: { underage: "En az 18 yaşında olmalısın.", already_applied: "Bu e-posta ile zaten başvuru yapılmış.", yap_video: "Lütfen tanıtım videonu yükle.", country_closed: "Bu ülkede başvurular kapalı.", generic: "İşaretli alanları kontrol et." },
  },
  sign: {
    title: "İçerik üretici sözleşmen", read: "İmzalamadan önce sözleşmenin tamamını oku.",
    typeName: "İmzalamak için tam adını yaz", typeNameHint: "Şununla eşleşmeli: {{name}}", accept: "Sözleşmeyi okudum ve kabul ediyorum.",
    warn: "Devam etmek istemiyorsan imzalama.", button: "Sözleşmeyi imzala",
    signed: "Sözleşme {{date}} tarihinde imzalandı. Teşekkürler! Erişim bilgilerini e-postayla göndereceğiz.", download: "İmzalı PDF'i indir",
    expired: "Bu linkin süresi doldu. Hâlâ katılmak istiyorsan bize yaz.", notFound: "Sözleşme bulunamadı.",
    errors: { name_mismatch: "İsim başvuruyla eşleşmiyor.", not_accepted: "Kutuyu işaretle.", expired: "Bu sözleşmenin süresi doldu.", hash_mismatch: "Belge değişti, sayfayı yenile." },
  },
};
export default tr;
