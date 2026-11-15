import type { PublicDict } from "./types";
const ja: PublicDict = {
  common: { loading: "読み込み中…", save: "保存", cancel: "キャンセル", logout: "ログアウト", error: "エラーが発生しました", language: "言語" },
  landing: {
    badge: "報酬ありのクリエイタープログラム",
    title: "動画を撮って稼ごう。{{brand}}のクリエイターになろう。",
    subtitle: "学生に人気のアプリについて、1日2本のショート動画を投稿。1本あたり{{price}}、さらに再生数に応じたボーナスも。",
    perVideo: "1本あたり", bonus: "再生数ボーナス", bonusDetail: "{{views}}回再生ごとに{{rpm}}",
    monthly: "最大{{amount}}/月", monthlyHint: "1日2本、ボーナス抜き",
    cta: "応募する", how: "仕組み",
    steps: [
      ["3分で応募", "自己紹介と、短い自己紹介動画（「yap」）を送ってね。"],
      ["オンラインで契約", "フリーランスのクリエイター契約。ワンクリックで署名できます。"],
      ["1日2本投稿", "毎朝2つのブリーフが届きます：参考動画、フック、シンプルな指示。"],
      ["毎週お支払い", "1本ごとの報酬＋再生数ボーナスを、Ruul経由で毎週お支払い。"],
    ],
    examples: "あなたが作る動画の例", faq: "よくある質問",
    faqs: [
      ["フォロワーはたくさん必要？", "いいえ。大事なのはカメラの前での話し方で、フォロワー数ではありません。新しいアカウントでもOK。"],
      ["必要なものは？", "スマホ、明るい照明、TikTokまたはInstagramのアカウント、そして1日30〜45分ほどの時間。"],
      ["報酬の受け取り方は？", "毎週Ruul経由で（あなたの銀行口座への国際送金）。フリーランスのクリエイターとして働きます。"],
      ["誰が応募できる？", "対象国に住む18歳以上の方なら誰でも。"],
    ],
    closed: "あなたの国ではまだ募集していません。", country: "国",
  },
  apply: {
    title: "クリエイター応募フォーム", subtitle: "所要3分。すべての応募にきちんと目を通します。",
    identity: "あなたについて", firstName: "名", lastName: "姓", birthdate: "生年月日", email: "メールアドレス", phone: "電話番号（WhatsApp）",
    country: "居住国", languages: "話せる言語", languagesHint: "カンマ区切り（例：日本語, 英語）",
    experience: "経験", ugcExperience: "UGCやコンテンツ制作の経験はある？簡単に教えてね。",
    tiktok: "TikTokプロフィールのリンク", tiktokFollowers: "TikTokのフォロワー数", instagram: "Instagramプロフィールのリンク", instagramFollowers: "Instagramのフォロワー数",
    equipment: "機材（スマホの機種、リングライト、マイク…）", availability: "対応可能な時間（1日の時間数、タイムゾーン）", motivation: "参加したい理由は？",
    yap: "自己紹介動画（「yap」）", yapHint: "30〜90秒、縦向き、カメラに向かって：あなたは誰で、なぜぴったりなのか。最大200MB。",
    chooseVideo: "動画を選ぶ", uploading: "アップロード中… {{pct}}%", uploaded: "動画をアップロードしました ✓",
    adult: "18歳以上です", consent: "{{brand}}が応募審査のために私のデータを処理することに同意します。",
    submit: "応募を送信", success: "応募を受け付けました！確認メールを送ったので、受信箱をチェックしてね。",
    errors: { underage: "18歳以上である必要があります。", already_applied: "このメールアドレスではすでに応募済みです。", yap_video: "自己紹介動画をアップロードしてください。", country_closed: "この国での募集は終了しています。", generic: "ハイライトされた項目を確認してください。" },
  },
  sign: {
    title: "クリエイター契約書", read: "署名する前に契約書を最後まで読んでください。",
    typeName: "署名としてフルネームを入力", typeNameHint: "次と一致する必要があります：{{name}}", accept: "契約書を読み、同意します。",
    warn: "続ける意思がない場合は署名しないでください。", button: "契約に署名",
    signed: "{{date}}に署名済み。ありがとう！アクセス情報はメールで送ります。", download: "署名済みPDFをダウンロード",
    expired: "このリンクは有効期限切れです。参加を希望する場合はご連絡ください。", notFound: "契約書が見つかりません。",
    errors: { name_mismatch: "名前が応募内容と一致しません。", not_accepted: "チェックボックスにチェックを入れてください。", expired: "この契約は有効期限切れです。", hash_mismatch: "書類が変更されました。ページを再読み込みしてください。" },
  },
};
export default ja;
