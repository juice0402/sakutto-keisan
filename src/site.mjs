// サイト全体の設定。独自ドメインやサイト名を変えるときはここだけ直す。
export const SITE = {
  name: 'サクッと計算',
  url: 'https://sakutto-keisan.com', // 末尾の / なし
  description:
    '割引・単価・FXの証拠金など、よく使う計算をひとつにまとめた無料の計算ツール集。スマホで片手でサクッと使えます。入力した数字は送信しません。',
  startYear: 2026,
};

// ツールのカテゴリ（並び順もこの順）
// theme：そのカテゴリのツールページの見た目（ターゲットに合わせる。部品と操作はどのテーマも共通）
export const CATEGORIES = [
  { id: 'seikatsu', name: '生活・お買い物', theme: 'seikatsu' }, // 主婦・学生 → 明るく温かい
  { id: 'shigoto', name: 'お仕事・お金', theme: 'shigoto' }, // 会社員 → 明るく落ち着いた青
  { id: 'fx', name: 'FX', theme: 'fx' }, // トレーダー → ダーク
];
