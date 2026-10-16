// ツールの一覧。トップページ・関連ツール・sitemap はここから作る。
// published: false のツールは、トップの「これから増えるツール」に名前だけ出る（リンクなし・ページなし）。
// icon は 24×24 の線のアイコン（SVG の中身）。

export const TOOLS = [
  {
    slug: 'waribiki',
    name: '割引計算',
    category: 'seikatsu',
    short: '何％オフ・何割引きの値段がすぐわかる',
    published: true,
    updated: '2026-10-16',
    related: ['tanka', 'percent', 'shohizei'],
    icon: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9-9-9Z"/><circle cx="7.5" cy="7.5" r="1.5"/><path d="m9.5 16.5 5-5"/>',
  },
  {
    slug: 'tanka',
    name: '実質単価（どっちが得？）',
    category: 'seikatsu',
    short: '100gあたりの値段で、どっちが得かくらべる',
    published: true,
    updated: '2026-10-16',
    related: ['waribiki', 'recipe', 'kishaku'],
    icon: '<path d="M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0Zm14 0-3 7a3 3 0 0 0 6 0Z"/>',
  },
  {
    slug: 'recipe',
    name: 'レシピの人数換算',
    category: 'seikatsu',
    short: '材料の分量を人数に合わせて計算',
    published: false,
    icon: '<path d="M4 11h16a8 8 0 0 1-16 0ZM8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5"/>',
  },
  {
    slug: 'kishaku',
    name: '希釈率',
    category: 'seikatsu',
    short: '何倍に薄めるか・原液と水の量',
    published: false,
    icon: '<path d="M8 3h8M9 3v6l-5 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-5-9V3M6 15h12"/>',
  },
  {
    slug: 'yukyu',
    name: '有給休暇の換算額',
    category: 'shigoto',
    short: '有給1日あたりの金額を計算',
    published: false,
    icon: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  },
  {
    slug: 'shakai-hoken',
    name: '社会保険料',
    category: 'shigoto',
    short: '健康保険・厚生年金・雇用保険の目安',
    published: false,
    icon: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6Z"/><path d="M9 12h6M12 9v6"/>',
  },
  {
    slug: 'fx-iji-ritsu',
    name: '証拠金維持率',
    category: 'fx',
    short: 'いまの維持率とロスカットまでの値幅',
    published: false,
    icon: '<path d="M4 20a8 8 0 1 1 16 0"/><path d="m12 20 4-6"/>',
  },
  {
    slug: 'fx-oisho',
    name: '追証の金額',
    category: 'fx',
    short: '追加で入れるお金の目安',
    published: false,
    icon: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M12 9.5v6M9 12.5h6"/>',
  },
  {
    slug: 'fx-swap',
    name: 'スワップポイント',
    category: 'fx',
    short: '持ち続けたときの受け取り額',
    published: false,
    icon: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  },
];

export const publishedTools = () => TOOLS.filter((t) => t.published);
export const toolBySlug = (slug) => TOOLS.find((t) => t.slug === slug);
export const toolUrl = (t) => `/${t.slug}/`;
