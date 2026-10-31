// サイト全体の設定。独自ドメインやサイト名を変えるときはここだけ直す。
export const SITE = {
  name: 'サクッと計算',
  alternateName: 'サクッとけいさん', // 検索結果のサイト名（構造化データの WebSite）の別の書き方
  url: 'https://sakutto-keisan.com', // 末尾の / なし
  startYear: 2026,
  // IndexNow（Bing・Yandex・Naver など）に公開したページを知らせるときの鍵。ビルドで /<鍵>.txt を置く（公開してよい値）
  indexnowKey: '267ca6c686146dbec62c311f4559fea0',
  // Google AdSense の運営者ID（ca-pub-から始まる。公開してよい値）。入れると全ページ（noindex と noAds のページはのぞく）に
  // AdSense のスクリプトを入れ、ビルドが /ads.txt を置く。空のあいだは何も入らない（10/22 統合の設計：計算・解説のページだけ）
  adsense: 'ca-pub-7891863499821813',
  // お問い合わせの Google フォームの URL（10/31 しょーくん。メールアドレスはサイトに出さない）。入れると /contact/ のページと、
  // フッター・このサイトについて・プライバシーポリシーのお問い合わせの文が出る。空のあいだは何も出ない
  // フォームは全サイト共通の1つ（連絡 C-020）。「どのサイトから」にサイト名が入った事前入力の URL をそのまま使う（短縮 URL は名前が入らない）
  contact: 'https://docs.google.com/forms/d/e/1FAIpQLSdAYN3cjrLkbbFywxHmCS7bqLFtDN0VmlO3NuTVPqKpaFj6Dg/viewform?usp=pp_url&entry.1872798598=%E3%82%B5%E3%82%AF%E3%83%83%E3%81%A8%E8%A8%88%E7%AE%97',
};

// ツールのカテゴリ（並び順もこの順）
// theme：そのカテゴリのツールページの見た目（ターゲットに合わせる。部品と操作はどのテーマも共通）
export const CATEGORIES = [
  { id: 'seikatsu', name: '生活・お買い物', theme: 'seikatsu' }, // 主婦・学生 → 明るく温かい
  { id: 'gyoji', name: '家族の行事', theme: 'seikatsu' }, // 10/27 七五三・厄年・長寿祝い・お食い初め・四十九日。生活と同じ方眼ノート
  { id: 'shigoto', name: 'お仕事・お金', theme: 'shigoto' }, // 会社員 → 明るく落ち着いた青
  { id: 'furusato', name: 'ふるさと納税', theme: 'shigoto' }, // 10/22 統合したコーナー。税金の書類なので、お仕事・お金と同じ紺の手帳
  { id: 'point', name: '楽天のポイント', theme: 'seikatsu' }, // 10/22 統合したコーナー。買い物の計算なので、生活と同じ方眼ノート
  { id: 'fx', name: 'FX', theme: 'fx' }, // トレーダー → ダーク
];
