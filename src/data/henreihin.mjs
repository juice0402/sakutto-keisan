// ふるさと納税の返礼品のページ（第3弾。設計は claude/sakutto-tougou-plan.md・claude/furusato-spec.md）
// 楽天市場の商品検索APIで、ビルドのときに取ってHTMLにする。取ったデータはリポジトリ・ログ・成果物に残さない（楽天ウェブサービスの規約 第10条9号）
//
// ページを作るかどうかは、ビルドのときの HENREIHIN（scripts/henreihin-mode.mjs が決める）
//   off     … 作らない（手元・本番でキーが入る前）
//   fixture … 作り話の見本の商品（tests/fixtures/henreihin.json）で作る。noindex・「見本」の帯。PRのプレビューで見た目を確かめる用
//   api     … 楽天から取ったデータ（scripts/fetch-henreihin.mjs が .henreihin/data.json に置く）で作る。本番
// HENREIHIN_LIVE を true にすると、キーがあるときに api になり、トップ・サイトマップ・関連ツールにも出る
// （楽天のアプリの登録とキーが入って、scripts/check-henreihin.mjs で本物が取れるのを確かめてから true にする）

export const HENREIHIN_LIVE = false;

const env = globalThis.process?.env ?? {};
export const HENREIHIN_MODE = ['fixture', 'api'].includes(env.HENREIHIN) ? env.HENREIHIN : 'off';

// 楽天に聞くときの Referer（楽天のアプリの「許可されたWebサイト」と同じ）
export const RAKUTEN_SITE = 'https://sakutto-keisan.com';

// カテゴリ（最初はお米・肉・魚介・日用品。claude/sakutto-tougou-plan.md の決めごと）
// groups：1つのページの中の一覧。単位がちがうもの（トイレットペーパーのロールとティッシュの箱）は分ける
// keyword：楽天で探す言葉。genreId はキーが入った日に scripts/check-henreihin.mjs で確かめて入れる（それまでは null で言葉だけ）
// ng：楽天側で外してもらう言葉（6語まで）
export const HENREIHIN_CATS = [
  {
    slug: 'kome',
    name: 'お米',
    groups: [{ key: 'kome', name: 'お米', unit: 'kg', keyword: 'ふるさと納税 米', ng: '餅 せんべい 米粉 甘酒 酒', genreId: null }],
  },
  {
    slug: 'niku',
    name: '肉',
    groups: [{ key: 'niku', name: '肉', unit: 'kg', keyword: 'ふるさと納税 肉', ng: '食事券 ハンバーグ ウインナー ジャーキー', genreId: null }],
  },
  {
    slug: 'gyokai',
    name: '魚介',
    groups: [{ key: 'gyokai', name: '魚介', unit: 'kg', keyword: 'ふるさと納税 海鮮', ng: '食事券 だし ふりかけ 缶詰', genreId: null }],
  },
  {
    slug: 'nichiyouhin',
    name: '日用品',
    groups: [
      { key: 'toilet', name: 'トイレットペーパー', unit: 'ロール', keyword: 'ふるさと納税 トイレットペーパー', ng: 'ホルダー', genreId: null },
      { key: 'tissue', name: 'ティッシュペーパー', unit: '箱', keyword: 'ふるさと納税 ティッシュペーパー', ng: 'ケース カバー ウェット', genreId: null },
    ],
  },
];

// 1つの一覧に出す数と、楽天に聞くページ数（30件ずつ。レビューが多い順）
export const HENREIHIN_SHOW = 30;
export const HENREIHIN_PAGES = 3;
// 寄付額のマス（一覧をしぼる）
export const HENREIHIN_PRICE_TILES = [10000, 20000, 30000];
