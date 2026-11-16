import type { PublicDict } from "./types";
const vi: PublicDict = {
  common: { loading: "Đang tải…", save: "Lưu", cancel: "Hủy", logout: "Đăng xuất", error: "Đã xảy ra lỗi", language: "Ngôn ngữ" },
  landing: {
    badge: "Chương trình creator có trả phí",
    title: "Làm video và được trả tiền. Trở thành creator của {{brand}}.",
    subtitle: "Đăng 2 video ngắn mỗi ngày về những ứng dụng sinh viên yêu thích. Nhận {{price}} mỗi video, cộng thêm thưởng theo lượt xem.",
    perVideo: "mỗi video", bonus: "thưởng lượt xem", bonusDetail: "{{rpm}} cho mỗi {{views}} lượt xem",
    monthly: "lên đến {{amount}}/tháng", monthlyHint: "2 video mỗi ngày, chưa tính thưởng lượt xem",
    cta: "Ứng tuyển ngay", how: "Cách hoạt động",
    steps: [
      ["Ứng tuyển trong 3 phút", "Kể cho chúng mình về bạn và quay một video giới thiệu ngắn (\"yap\")."],
      ["Ký hợp đồng online", "Hợp đồng creator tự do, ký chỉ với một cú nhấp."],
      ["Đăng 2 video mỗi ngày", "Mỗi sáng bạn nhận 2 brief: một video mẫu, một hook và hướng dẫn đơn giản."],
      ["Nhận tiền mỗi tuần", "Theo video + thưởng lượt xem, thanh toán hằng tuần qua Ruul."],
    ],
    examples: "Ví dụ về video bạn sẽ làm", faq: "Câu hỏi thường gặp",
    faqs: [
      ["Mình có cần nhiều follower không?", "Không. Điều quan trọng là cách bạn nói trước camera, không phải số follower. Tài khoản mới cũng được."],
      ["Mình cần những gì?", "Một chiếc điện thoại, ánh sáng tốt, tài khoản TikTok hoặc Instagram và khoảng 30–45 phút mỗi ngày."],
      ["Mình được trả tiền thế nào?", "Hằng tuần qua Ruul (chuyển khoản quốc tế về tài khoản ngân hàng của bạn). Bạn làm việc như một người làm tự do."],
      ["Ai có thể ứng tuyển?", "Bất kỳ ai từ 18 tuổi trở lên đang sống tại một trong các quốc gia đang mở."],
    ],
    closed: "Quốc gia của bạn chưa mở nhận đơn ứng tuyển.", country: "Quốc gia",
  },
  apply: {
    title: "Đơn ứng tuyển creator", subtitle: "3 phút. Chúng mình xem xét từng đơn một cách trực tiếp.",
    identity: "Về bạn", firstName: "Tên", lastName: "Họ", birthdate: "Ngày sinh", email: "Email", phone: "Điện thoại (WhatsApp)",
    country: "Quốc gia cư trú", languages: "Ngôn ngữ bạn nói được", languagesHint: "Cách nhau bằng dấu phẩy, vd. Tiếng Việt, Tiếng Anh",
    experience: "Kinh nghiệm", ugcExperience: "Bạn đã từng làm UGC / nội dung chưa? Kể ngắn gọn nhé.",
    tiktok: "Link hồ sơ TikTok của bạn", tiktokFollowers: "Follower TikTok", instagram: "Link hồ sơ Instagram của bạn", instagramFollowers: "Follower Instagram",
    equipment: "Thiết bị (mẫu điện thoại, đèn ring light, micro…)", availability: "Thời gian rảnh (số giờ mỗi ngày, múi giờ)", motivation: "Vì sao bạn muốn tham gia?",
    yap: "Video giới thiệu (\"yap\")", yapHint: "30–90 giây, quay dọc, nói trước camera: bạn là ai và vì sao bạn phù hợp. Tối đa 200 MB.",
    chooseVideo: "Chọn video", uploading: "Đang tải lên… {{pct}}%", uploaded: "Đã tải video lên ✓",
    adult: "Tôi từ 18 tuổi trở lên", consent: "Tôi đồng ý để {{brand}} xử lý dữ liệu của tôi nhằm xét duyệt đơn ứng tuyển.",
    submit: "Gửi đơn", success: "Đã gửi đơn! Kiểm tra email nhé: chúng mình vừa gửi xác nhận cho bạn.",
    errors: { underage: "Bạn phải từ 18 tuổi trở lên.", already_applied: "Bạn đã ứng tuyển bằng email này rồi.", yap_video: "Hãy tải lên video giới thiệu của bạn.", country_closed: "Quốc gia này đã đóng nhận đơn.", generic: "Vui lòng kiểm tra các ô được đánh dấu." },
  },
  sign: {
    title: "Hợp đồng creator của bạn", read: "Hãy đọc toàn bộ hợp đồng trước khi ký.",
    typeName: "Nhập họ tên đầy đủ để ký", typeNameHint: "Phải khớp với: {{name}}", accept: "Tôi đã đọc và đồng ý với hợp đồng này.",
    warn: "Đừng ký nếu bạn không muốn tiếp tục.", button: "Ký hợp đồng",
    signed: "Hợp đồng đã được ký ngày {{date}}. Cảm ơn bạn! Thông tin đăng nhập sẽ được gửi qua email.", download: "Tải PDF đã ký",
    expired: "Link này đã hết hạn. Liên hệ chúng mình nếu bạn vẫn muốn tham gia.", notFound: "Không tìm thấy hợp đồng.",
    errors: { name_mismatch: "Tên không khớp với đơn ứng tuyển.", not_accepted: "Vui lòng đánh dấu vào ô.", expired: "Hợp đồng này đã hết hạn.", hash_mismatch: "Tài liệu đã thay đổi, vui lòng tải lại trang." },
  },
};
export default vi;
