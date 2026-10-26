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
};

// ツールのカテゴリ（並び順もこの順）
// theme：そのカテゴリのツールページの見た目（ターゲットに合わせる。部品と操作はどのテーマも共通）
export const CATEGORIES = [
  { id: 'seikatsu', name: '生活・お買い物', theme: 'seikatsu' }, // 主婦・学生 → 明るく温かい
  { id: 'shigoto', name: 'お仕事・お金', theme: 'shigoto' }, // 会社員 → 明るく落ち着いた青
  { id: 'furusato', name: 'ふるさと納税', theme: 'shigoto' }, // 10/22 統合したコーナー。税金の書類なので、お仕事・お金と同じ紺の手帳
  { id: 'point', name: '楽天のポイント', theme: 'seikatsu' }, // 10/22 統合したコーナー。買い物の計算なので、生活と同じ方眼ノート
  { id: 'fx', name: 'FX', theme: 'fx' }, // トレーダー → ダーク
];
