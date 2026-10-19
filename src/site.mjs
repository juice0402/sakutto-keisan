// サイト全体の設定。独自ドメインやサイト名を変えるときはここだけ直す。
export const SITE = {
  name: 'サクッと計算',
  url: 'https://sakutto-keisan.com', // 末尾の / なし
  description:
    '割引後の値段、100gあたりの単価、レシピの人数換算、希釈（薄め方）、FXの証拠金維持率やロスカットを計算できる無料のツール集です。スマホのブラウザで使えて、入力した数字は送信しません。',
  startYear: 2026,
  // IndexNow（Bing・Yandex・Naver など）に公開したページを知らせるときの鍵。ビルドで /<鍵>.txt を置く（公開してよい値）
  indexnowKey: '267ca6c686146dbec62c311f4559fea0',
};

// ツールのカテゴリ（並び順もこの順）
// theme：そのカテゴリのツールページの見た目（ターゲットに合わせる。部品と操作はどのテーマも共通）
export const CATEGORIES = [
  { id: 'seikatsu', name: '生活・お買い物', theme: 'seikatsu' }, // 主婦・学生 → 明るく温かい
  { id: 'shigoto', name: 'お仕事・お金', theme: 'shigoto' }, // 会社員 → 明るく落ち着いた青
  { id: 'fx', name: 'FX', theme: 'fx' }, // トレーダー → ダーク
];
