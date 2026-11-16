import type { PublicDict } from "./types";
const id: PublicDict = {
  common: { loading: "Memuat…", save: "Simpan", cancel: "Batal", logout: "Keluar", error: "Terjadi kesalahan", language: "Bahasa" },
  landing: {
    badge: "Program kreator berbayar",
    title: "Dibayar untuk bikin video. Jadi kreator {{brand}}.",
    subtitle: "Posting 2 video pendek per hari tentang aplikasi yang disukai mahasiswa. Dapatkan {{price}} per video plus bonus dari jumlah view-mu.",
    perVideo: "per video", bonus: "bonus view", bonusDetail: "{{rpm}} per {{views}} view",
    monthly: "hingga {{amount}}/bulan", monthlyHint: "2 video per hari, belum termasuk bonus view",
    cta: "Daftar sekarang", how: "Cara kerjanya",
    steps: [
      ["Daftar dalam 3 menit", "Ceritakan tentang dirimu dan rekam video perkenalan singkat (\"yap\")."],
      ["Tanda tangani kontrak online", "Kontrak kreator independen, ditandatangani dengan satu klik."],
      ["Posting 2 video per hari", "Setiap pagi kamu dapat 2 brief: video referensi, hook, dan instruksi sederhana."],
      ["Dibayar setiap minggu", "Per video + bonus view, dibayar mingguan lewat Ruul."],
    ],
    examples: "Contoh video yang akan kamu buat", faq: "Pertanyaan umum",
    faqs: [
      ["Apakah aku perlu banyak followers?", "Tidak. Yang penting buat kami adalah caramu bicara di depan kamera, bukan jumlah followers. Akun baru juga oke."],
      ["Apa yang aku butuhkan?", "Smartphone, cahaya yang bagus, akun TikTok atau Instagram, dan sekitar 30–45 menit per hari."],
      ["Bagaimana aku dibayar?", "Setiap minggu lewat Ruul (transfer internasional ke rekening bankmu). Kamu bekerja sebagai pekerja lepas."],
      ["Siapa yang bisa mendaftar?", "Siapa saja yang berusia 18 tahun ke atas dan tinggal di salah satu negara yang sedang dibuka."],
    ],
    closed: "Pendaftaran belum dibuka di negaramu.", country: "Negara",
  },
  apply: {
    title: "Pendaftaran kreator", subtitle: "3 menit. Kami meninjau setiap pendaftaran secara langsung.",
    identity: "Tentang kamu", firstName: "Nama depan", lastName: "Nama belakang", birthdate: "Tanggal lahir", email: "Email", phone: "Telepon (WhatsApp)",
    country: "Negara tempat tinggal", languages: "Bahasa yang kamu kuasai", languagesHint: "Pisahkan dengan koma, mis. Indonesia, Inggris",
    experience: "Pengalaman", ugcExperience: "Pernah bikin UGC / konten? Ceritakan singkat saja.",
    tiktok: "Link profil TikTok-mu", tiktokFollowers: "Followers TikTok", instagram: "Link profil Instagram-mu", instagramFollowers: "Followers Instagram",
    equipment: "Perlengkapan (model HP, ring light, mikrofon…)", availability: "Ketersediaan (jam per hari, zona waktu)", motivation: "Kenapa kamu mau bergabung?",
    yap: "Video perkenalan (\"yap\")", yapHint: "30–90 detik, vertikal, bicara ke kamera: siapa kamu dan kenapa kamu cocok. Maks. 200 MB.",
    chooseVideo: "Pilih video", uploading: "Mengunggah… {{pct}}%", uploaded: "Video terunggah ✓",
    adult: "Aku berusia 18 tahun atau lebih", consent: "Aku setuju {{brand}} memproses dataku untuk meninjau pendaftaranku.",
    submit: "Kirim pendaftaran", success: "Pendaftaran terkirim! Cek email-mu: kami baru saja mengirim konfirmasi.",
    errors: { underage: "Kamu harus berusia minimal 18 tahun.", already_applied: "Kamu sudah mendaftar dengan email ini.", yap_video: "Unggah video perkenalanmu.", country_closed: "Pendaftaran di negara ini sedang ditutup.", generic: "Cek kolom yang ditandai." },
  },
  sign: {
    title: "Kontrak kreatormu", read: "Baca seluruh kontrak sebelum tanda tangan.",
    typeName: "Ketik nama lengkapmu untuk tanda tangan", typeNameHint: "Harus sama dengan: {{name}}", accept: "Aku sudah membaca dan menyetujui kontrak ini.",
    warn: "Jangan tanda tangan kalau kamu tidak ingin lanjut.", button: "Tanda tangani kontrak",
    signed: "Kontrak ditandatangani pada {{date}}. Terima kasih! Cek email-mu untuk info login.", download: "Unduh PDF yang sudah ditandatangani",
    expired: "Link ini sudah kedaluwarsa. Hubungi kami kalau kamu masih ingin bergabung.", notFound: "Kontrak tidak ditemukan.",
    errors: { name_mismatch: "Nama tidak sesuai dengan pendaftaran.", not_accepted: "Centang kotaknya.", expired: "Kontrak ini sudah kedaluwarsa.", hash_mismatch: "Dokumen telah berubah, muat ulang halaman." },
  },
};
export default id;
