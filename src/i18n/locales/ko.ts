import type { PublicDict } from "./types";
const ko: PublicDict = {
  common: { loading: "불러오는 중…", save: "저장", cancel: "취소", logout: "로그아웃", error: "문제가 발생했어요", language: "언어" },
  landing: {
    badge: "유급 크리에이터 프로그램",
    title: "영상 찍고 돈 벌기. {{brand}} 크리에이터가 되어 보세요.",
    subtitle: "학생들이 좋아하는 앱에 대한 짧은 영상을 하루 2개 올리세요. 영상당 {{price}}, 여기에 조회수 보너스까지.",
    perVideo: "영상당", bonus: "조회수 보너스", bonusDetail: "조회수 {{views}}회당 {{rpm}}",
    monthly: "월 최대 {{amount}}", monthlyHint: "하루 2개 기준, 보너스 제외",
    cta: "지원하기", how: "이렇게 진행돼요",
    steps: [
      ["3분이면 지원 완료", "간단한 자기소개와 짧은 소개 영상(“yap”)을 보내 주세요."],
      ["온라인으로 계약 서명", "프리랜서 크리에이터 계약, 클릭 한 번으로 서명."],
      ["하루 2개 영상 업로드", "매일 아침 브리프 2개 도착: 참고 영상, 훅, 간단한 가이드."],
      ["매주 정산", "영상당 금액 + 조회수 보너스를 Ruul을 통해 매주 지급해요."],
    ],
    examples: "이런 영상을 만들게 돼요", faq: "자주 묻는 질문",
    faqs: [
      ["팔로워가 많아야 하나요?", "아니요. 팔로워 수가 아니라 카메라 앞에서 말하는 방식이 중요해요. 새 계정도 괜찮아요."],
      ["무엇이 필요한가요?", "스마트폰, 밝은 조명, 틱톡 또는 인스타그램 계정, 그리고 하루 30–45분 정도의 시간."],
      ["어떻게 정산받나요?", "매주 Ruul을 통해 (본인 은행 계좌로 해외 송금). 프리랜서 크리에이터로 활동해요."],
      ["누가 지원할 수 있나요?", "모집 중인 국가에 거주하는 만 18세 이상이면 누구나."],
    ],
    closed: "아직 거주 국가에서는 모집하지 않아요.", country: "국가",
  },
  apply: {
    title: "크리에이터 지원서", subtitle: "3분이면 끝. 모든 지원서를 직접 읽어요.",
    identity: "기본 정보", firstName: "이름", lastName: "성", birthdate: "생년월일", email: "이메일", phone: "전화번호 (WhatsApp)",
    country: "거주 국가", languages: "사용 가능한 언어", languagesHint: "쉼표로 구분, 예: 한국어, 영어",
    experience: "경험", ugcExperience: "UGC나 콘텐츠 제작 경험이 있나요? 간단히 적어 주세요.",
    tiktok: "틱톡 프로필 링크", tiktokFollowers: "틱톡 팔로워 수", instagram: "인스타그램 프로필 링크", instagramFollowers: "인스타그램 팔로워 수",
    equipment: "장비 (휴대폰 모델, 링라이트, 마이크…)", availability: "가능 시간 (하루 시간, 시간대)", motivation: "함께하고 싶은 이유는?",
    yap: "소개 영상 (“yap”)", yapHint: "30–90초, 세로 화면, 카메라를 보며: 어떤 사람인지, 왜 잘 맞는지 말해 주세요. 최대 200MB.",
    chooseVideo: "영상 선택", uploading: "업로드 중… {{pct}}%", uploaded: "영상 업로드 완료 ✓",
    adult: "만 18세 이상입니다", consent: "{{brand}}이(가) 지원서 검토를 위해 내 정보를 처리하는 데 동의합니다.",
    submit: "지원서 제출", success: "지원 완료! 방금 확인 메일을 보냈으니 받은편지함을 확인해 주세요.",
    errors: { underage: "만 18세 이상이어야 해요.", already_applied: "이 이메일로 이미 지원했어요.", yap_video: "소개 영상을 업로드해 주세요.", country_closed: "이 국가는 모집이 마감되었어요.", generic: "표시된 항목을 확인해 주세요." },
  },
  sign: {
    title: "크리에이터 계약서", read: "서명하기 전에 계약서 전체를 읽어 주세요.",
    typeName: "서명하려면 전체 이름을 입력하세요", typeNameHint: "다음과 일치해야 해요: {{name}}", accept: "계약서를 읽었으며 동의합니다.",
    warn: "진행할 의사가 없다면 서명하지 마세요.", button: "계약서 서명",
    signed: "{{date}}에 서명 완료. 감사합니다! 접속 정보는 이메일로 보내 드릴게요.", download: "서명된 PDF 다운로드",
    expired: "이 링크는 만료되었어요. 아직 참여를 원하면 연락 주세요.", notFound: "계약서를 찾을 수 없어요.",
    errors: { name_mismatch: "이름이 지원서와 일치하지 않아요.", not_accepted: "체크박스를 선택해 주세요.", expired: "이 계약은 만료되었어요.", hash_mismatch: "문서가 변경되었어요. 페이지를 새로고침해 주세요." },
  },
};
export default ko;
