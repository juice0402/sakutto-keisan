// 洗濯洗剤の量の計算に使う数字（出典つき。10/28 にメーカーの公式のページで確かめた）
// マスに入れるのは、メーカーのページで「水量◯Lに◯g（mL）」を確かめた洗剤だけ。確かめられなかった洗剤（ボールド・さらさなど）は入れない
// water・amount：ボトルの表示の「水 water L に amount mL」（液体洗剤は 1g ≒ 1mL。花王・ライオンは「10g（約10ml）」のように両方を書いている）
// table：メーカーが水量ごとの表を出している洗剤だけ。表の水量に近いものの量を使う（花王「40Lなら45Lの目安」）
// cap：計量キャップ1杯の量（mL）。メーカーがキャップの目もりを出している洗剤だけ（ないときは「キャップ何杯」を出さない）
export const SENZAI_CHECKED = '2026-10-28';

export const SENZAI = [
  {
    id: 'attack',
    name: 'アタックZERO',
    maker: '花王',
    water: 30,
    amount: 10,
    table: [[30, 10], [45, 15], [55, 20], [65, 25], [75, 30]],
    cap: 30,
    url: 'https://www.kao.com/jp/qa/detail/28064/',
    src: '花王 製品Q&A',
  },
  {
    id: 'nanox',
    name: 'ナノックス ワン',
    maker: 'ライオン',
    water: 30,
    amount: 10,
    url: 'https://www.lion.co.jp/ja/products/589',
    src: 'ライオン NANOX one PRO',
  },
  {
    id: 'ariel',
    name: 'アリエールMiRAi',
    maker: 'P&G',
    water: 30,
    amount: 13,
    url: 'https://ariel.jp/ja-jp/shop/category/mirai/ariel-mirai-blue',
    src: 'P&G アリエールMiRAi',
  },
  {
    id: 'top',
    name: 'トップ クリアリキッド抗菌',
    short: 'トップ クリアリキッド',
    maker: 'ライオン',
    water: 30,
    amount: 30,
    url: 'https://www.lion.co.jp/ja/products/291',
    src: 'ライオン トップ クリアリキッド抗菌',
  },
];

// 水の量のマス（L）
export const SENZAI_WATER = [30, 45, 65];
