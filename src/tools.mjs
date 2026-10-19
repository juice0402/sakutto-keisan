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
    updated: '2026-10-17',
    related: ['tanka', 'percent', 'shohizei'],
  },
  {
    slug: 'tanka',
    name: '実質単価の比較',
    category: 'seikatsu',
    short: '100gあたりの値段で、どれがいちばん安いか',
    published: true,
    updated: '2026-10-17',
    related: ['waribiki', 'recipe', 'kishaku'],
  },
  {
    slug: 'recipe',
    name: 'レシピの人数換算',
    category: 'seikatsu',
    short: '2人分のレシピを3人分にするときの分量',
    published: true,
    updated: '2026-10-17',
    related: ['tanka', 'waribiki', 'kishaku'],
  },
  {
    slug: 'kishaku',
    name: '希釈率の計算',
    category: 'seikatsu',
    short: '原液と水を何mlずつ入れるか',
    published: true,
    updated: '2026-10-17',
    related: ['recipe', 'tanka', 'waribiki'],
  },
  // 希釈率の使いみち別（parent のページの下に並べる）
  {
    slug: 'mentsuyu',
    name: 'めんつゆの薄め方',
    category: 'seikatsu',
    parent: 'kishaku',
    short: '2倍・3倍・4倍濃縮のつゆと水の量',
    published: true,
    updated: '2026-10-17',
    related: ['kishaku', 'recipe', 'hyohakuzai', 'ekihi'],
  },
  {
    slug: 'hyohakuzai', // URL は公開したまま（名前は 10/18 に「塩素系漂白剤」から変えた）
    name: '次亜塩素酸ナトリウムの薄め方',
    ogTitle: '次亜塩素酸\nナトリウムの薄め方', // 共有画像の題は2行で（scripts/make-images.py）
    category: 'seikatsu',
    parent: 'kishaku',
    short: 'ハイターで0.02％・0.1％の消毒液を作る量',
    published: true,
    updated: '2026-10-18',
    related: ['kishaku', 'mentsuyu', 'ekihi', 'tanka'],
  },
  {
    slug: 'ekihi',
    name: '液体肥料の薄め方',
    category: 'seikatsu',
    parent: 'kishaku',
    short: '500倍・1000倍は水1Lに何mlか',
    published: true,
    updated: '2026-10-17',
    related: ['kishaku', 'hyohakuzai', 'mentsuyu', 'tanka'],
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
  // FX：むずかしい言葉を使わず、ロスカットは金額で（しょーくんの方針・10/18）
  {
    slug: 'fx-iji-ritsu',
    name: '証拠金維持率の計算',
    category: 'fx',
    short: 'レバレッジ何倍で、維持率は何％か',
    published: true,
    updated: '2026-10-19',
    related: ['fx-losscut', 'fx-swap'],
  },
  {
    slug: 'fx-losscut',
    name: 'ロスカットの計算',
    category: 'fx',
    short: 'ロスカットまで、あと何円の損か',
    published: true,
    updated: '2026-10-19',
    related: ['fx-iji-ritsu', 'fx-swap'],
  },
  {
    slug: 'fx-swap',
    name: 'スワップポイントの計算',
    category: 'fx',
    short: '1日にいくらもらえるか（目安）',
    published: true,
    updated: '2026-10-19',
    related: ['fx-iji-ritsu', 'fx-losscut'],
  },
];

export const publishedTools = () => TOOLS.filter((t) => t.published);
export const toolBySlug = (slug) => TOOLS.find((t) => t.slug === slug);
export const toolUrl = (t) => `/${t.slug}/`;
