// サイト全体の設定。独自ドメインやサイト名を変えるときはここだけ直す。
export const SITE = {
  name: 'サクッと計算',
  url: 'https://sakutto-keisan.com', // 末尾の / なし
  description:
    '割引・単価・FXの証拠金など、よく使う計算をひとつにまとめた無料の計算ツール集。スマホで片手でサクッと使えます。入力した数字は送信しません。',
  themeColor: '#E8590C',
  startYear: 2026,
};

// ツールのカテゴリ（並び順もこの順）
export const CATEGORIES = [
  { id: 'seikatsu', name: '生活・お買い物' },
  { id: 'shigoto', name: 'お仕事・お金' },
  { id: 'fx', name: 'FX' },
];
