import type { PublicDict } from "./types";
const ms: PublicDict = {
  common: { loading: "Memuatkan…", save: "Simpan", cancel: "Batal", logout: "Log keluar", error: "Ada sesuatu yang tidak kena", language: "Bahasa" },
  landing: {
    badge: "Program pencipta berbayar",
    title: "Dibayar untuk buat video. Jadi pencipta {{brand}}.",
    subtitle: "Siarkan 2 video pendek sehari tentang aplikasi yang digemari pelajar. Dapat {{price}} setiap video serta bonus untuk tontonan anda.",
    perVideo: "setiap video", bonus: "bonus tontonan", bonusDetail: "{{rpm}} bagi setiap {{views}} tontonan",
    monthly: "sehingga {{amount}}/bulan", monthlyHint: "2 video sehari, tanpa bonus tontonan",
    cta: "Mohon sekarang", how: "Cara ia berfungsi",
    steps: [
      ["Mohon dalam 3 minit", "Ceritakan tentang diri anda dan rakam video pengenalan yang ringkas (\"yap\")."],
      ["Tandatangan kontrak dalam talian", "Kontrak pencipta bebas, ditandatangani dengan satu klik."],
      ["Siarkan 2 video sehari", "Setiap pagi anda terima 2 taklimat: video rujukan, hook dan arahan mudah."],
      ["Dibayar setiap minggu", "Setiap video + bonus tontonan, dibayar setiap minggu melalui Ruul."],
    ],
    examples: "Contoh video yang akan anda hasilkan", faq: "Soalan lazim",
    faqs: [
      ["Perlukah saya ramai pengikut?", "Tidak. Kami lebih peduli cara anda bercakap di depan kamera, bukan jumlah pengikut. Akaun baharu pun boleh."],
      ["Apa yang saya perlukan?", "Telefon pintar, pencahayaan yang baik, akaun TikTok atau Instagram dan kira-kira 30–45 minit sehari."],
      ["Bagaimana saya dibayar?", "Setiap minggu melalui Ruul (pembayaran antarabangsa ke akaun bank anda). Anda bekerja sebagai kontraktor bebas."],
      ["Siapa yang boleh memohon?", "Sesiapa sahaja berumur 18 tahun ke atas yang tinggal di salah satu negara yang dibuka."],
    ],
    closed: "Permohonan belum dibuka di negara anda.", country: "Negara",
  },
  apply: {
    title: "Permohonan pencipta", subtitle: "3 minit. Kami semak setiap permohonan sendiri.",
    identity: "Tentang anda", firstName: "Nama pertama", lastName: "Nama keluarga", birthdate: "Tarikh lahir", email: "E-mel", phone: "Telefon (WhatsApp)",
    country: "Negara tempat tinggal", languages: "Bahasa yang anda tuturkan", languagesHint: "Pisahkan dengan koma, cth. Melayu, Inggeris",
    experience: "Pengalaman", ugcExperience: "Pernah buat UGC / kandungan? Ceritakan secara ringkas.",
    tiktok: "Pautan profil TikTok anda", tiktokFollowers: "Pengikut TikTok", instagram: "Pautan profil Instagram anda", instagramFollowers: "Pengikut Instagram",
    equipment: "Peralatan (model telefon, ring light, mikrofon…)", availability: "Ketersediaan (jam sehari, zon waktu)", motivation: "Kenapa anda mahu sertai kami?",
    yap: "Video pengenalan (\"yap\")", yapHint: "30–90 saat, menegak, bercakap ke kamera: siapa anda dan kenapa anda sesuai. Maks. 200 MB.",
    chooseVideo: "Pilih video", uploading: "Memuat naik… {{pct}}%", uploaded: "Video dimuat naik ✓",
    adult: "Saya berumur 18 tahun atau lebih", consent: "Saya bersetuju {{brand}} memproses data saya untuk menyemak permohonan saya.",
    submit: "Hantar permohonan", success: "Permohonan dihantar! Semak e-mel anda: kami baru sahaja menghantar pengesahan.",
    errors: { underage: "Anda mesti berumur sekurang-kurangnya 18 tahun.", already_applied: "Anda sudah memohon dengan e-mel ini.", yap_video: "Sila muat naik video pengenalan anda.", country_closed: "Permohonan ditutup di negara ini.", generic: "Sila semak ruangan yang ditanda." },
  },
  sign: {
    title: "Kontrak pencipta anda", read: "Baca keseluruhan kontrak sebelum menandatangan.",
    typeName: "Taip nama penuh anda untuk menandatangan", typeNameHint: "Mesti sepadan dengan: {{name}}", accept: "Saya telah membaca dan menerima kontrak ini.",
    warn: "Jangan tandatangan jika anda tidak mahu teruskan.", button: "Tandatangan kontrak",
    signed: "Kontrak ditandatangani pada {{date}}. Terima kasih! Semak e-mel anda untuk butiran log masuk.", download: "Muat turun PDF yang ditandatangani",
    expired: "Pautan ini telah tamat tempoh. Hubungi kami jika anda masih mahu sertai.", notFound: "Kontrak tidak dijumpai.",
    errors: { name_mismatch: "Nama tidak sepadan dengan permohonan.", not_accepted: "Sila tandakan kotak.", expired: "Kontrak ini telah tamat tempoh.", hash_mismatch: "Dokumen telah berubah, sila muat semula halaman." },
  },
};
export default ms;
