// ツールの一覧。トップページ・関連ツール・sitemap はここから作る。
// published: false のツールは、トップの「これから増えるツール」に名前だけ出る（リンクなし・ページなし）。
// short は一覧に出る説明（ふつうの言葉で、何がわかるか）。

export const TOOLS = [
  {
    slug: 'waribiki',
    name: '割引計算',
    category: 'seikatsu',
    short: '割引後の値段と、いくら安くなるか',
    published: true,
    updated: '2026-10-16',
    related: ['tanka', 'percent', 'shohizei'],
  },
  {
    slug: 'tanka',
    name: '実質単価の比較',
    category: 'seikatsu',
    short: '100gあたりの値段で、どれがいちばん安いか',
    published: true,
    updated: '2026-10-16',
    related: ['waribiki', 'recipe', 'kishaku'],
  },
  {
    slug: 'recipe',
    name: 'レシピの人数換算',
    category: 'seikatsu',
    short: '2人分のレシピを3人分にするときの分量',
    published: true,
    updated: '2026-10-16',
    related: ['tanka', 'waribiki', 'kishaku'],
  },
  {
    slug: 'kishaku',
    name: '希釈率の計算',
    category: 'seikatsu',
    short: '原液と水を何mlずつ入れるか',
    published: true,
    updated: '2026-10-16',
    related: ['recipe', 'tanka', 'waribiki'],
  },
  {
    slug: 'yukyu',
    name: '有給休暇の換算額',
    category: 'shigoto',
    short: '有給1日あたりの金額を計算',
    published: false,
  },
  {
    slug: 'shakai-hoken',
    name: '社会保険料',
    category: 'shigoto',
    short: '健康保険・厚生年金・雇用保険の目安',
    published: false,
  },
  {
    slug: 'fx-iji-ritsu',
    name: '証拠金維持率',
    category: 'fx',
    short: 'いまの維持率とロスカットまでの値幅',
    published: false,
  },
  {
    slug: 'fx-oisho',
    name: '追証の金額',
    category: 'fx',
    short: '追加で入れるお金の目安',
    published: false,
  },
  {
    slug: 'fx-swap',
    name: 'スワップポイント',
    category: 'fx',
    short: '持ち続けたときの受け取り額',
    published: false,
  },
];

export const publishedTools = () => TOOLS.filter((t) => t.published);
export const toolBySlug = (slug) => TOOLS.find((t) => t.slug === slug);
export const toolUrl = (t) => `/${t.slug}/`;
