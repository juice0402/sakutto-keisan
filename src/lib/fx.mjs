import { fix, fmt } from './number.mjs';
import { POLICY_RATES, FX_SPOT } from '../data/fx-swap.mjs';

// FX の計算（証拠金維持率・ロスカット・スワップ。ブラウザとテストの両方で使う）
// 画面ではむずかしい言葉を使わない：証拠金 → 口座のお金、必要証拠金 → 取引に必要なお金、ロット → 通貨の量
// 日本の個人のFXはレバレッジが25倍まで。取引に必要なお金は、取引額（レート × 量）の4％

export const FX_MARGIN_RATE = 0.04;
export const FX_MAX_LEV = 25;
export const FX_QTY_TILES = [1000, 10000, 100000]; // 1,000通貨・1万通貨・10万通貨（その他は万通貨で入れる）

/**
 * 通貨ペア（円がつくものだけ。どれも「1通貨＝何円」なので計算は同じ）
 * cur：金利を見る通貨　unit：1通貨の呼び名（「1ドル150円」）　example：参考のレート（src/data/fx-swap.mjs。欄のうすい例とスワップの目安に使う）
 * 名前は、スマホの幅に入るように短い呼び方（ランド円＝南アフリカランド円・ペソ円＝メキシコペソ円・リラ円＝トルコリラ円）
 * ユーロドルのような円のつかない通貨ペアは、取引に必要なお金を円にするのにドル円のレートも要るので、いまは入れない
 */
export const FX_PAIRS = [
  { id: 'usdjpy', name: 'ドル円', cur: 'USD', unit: 'ドル', example: FX_SPOT.usdjpy },
  { id: 'eurjpy', name: 'ユーロ円', cur: 'EUR', unit: 'ユーロ', example: FX_SPOT.eurjpy },
  { id: 'gbpjpy', name: 'ポンド円', cur: 'GBP', unit: 'ポンド', example: FX_SPOT.gbpjpy },
  { id: 'audjpy', name: '豪ドル円', cur: 'AUD', unit: '豪ドル', example: FX_SPOT.audjpy },
  { id: 'nzdjpy', name: 'NZドル円', cur: 'NZD', unit: 'NZドル', example: FX_SPOT.nzdjpy },
  { id: 'cadjpy', name: 'カナダ円', cur: 'CAD', unit: 'カナダドル', example: FX_SPOT.cadjpy },
  { id: 'chfjpy', name: 'スイス円', cur: 'CHF', unit: 'フラン', example: FX_SPOT.chfjpy },
  { id: 'zarjpy', name: 'ランド円', cur: 'ZAR', unit: 'ランド', example: FX_SPOT.zarjpy },
  { id: 'mxnjpy', name: 'ペソ円', cur: 'MXN', unit: 'ペソ', example: FX_SPOT.mxnjpy },
  { id: 'tryjpy', name: 'リラ円', cur: 'TRY', unit: 'リラ', example: FX_SPOT.tryjpy },
];

/** レートの小数のけた：10円より低い通貨ペア（ランド円・ペソ円・リラ円）は0.001円まで、ほかは0.01円まで */
export const rateDigits = (rate) => (rate < 10 ? 3 : 2);

/** 取引に必要なお金（必要証拠金）＝ レート × 量 × 4％ */
export const fxNeed = (rate, qty) => fix(rate * qty * FX_MARGIN_RATE);

/** 維持率の書き方（0.1％単位で切り捨て。99.99％を100％と見せない） */
export const ratioText = (r) => `${fmt(Math.floor(fix(r * 10)) / 10, 1)}％`;

/** お金の書き方（1円未満は切り捨て） */
export const yenText = (x) => `${fmt(Math.floor(fix(x)), 0)}円`;

/**
 * ロスカットになるレートの書き方。いまのレートに近いほうへ丸める（買いなら切り上げ、売りなら切り捨て。実際より遠くに見せない）
 * digits：小数のけた（rateDigits で決める）
 */
export function cutPriceText(price, side, digits = 2) {
  const k = 10 ** digits;
  const p = side === 'sell' ? Math.floor(fix(price * k)) / k : Math.ceil(fix(price * k)) / k;
  return `${p.toFixed(digits)}円`;
}

function check({ money, qty, rate }) {
  if ([money, qty, rate].some((v) => v === null)) return { ok: false, empty: true };
  if (Number.isNaN(money) || money < 0) return { ok: false, error: '口座のお金は、0以上の数字で入れてください。', field: 'money' };
  if (Number.isNaN(qty) || qty < 1) return { ok: false, error: '通貨の量は、1通貨以上で入れてください。', field: 'qty' };
  if (Number.isNaN(rate) || rate <= 0) return { ok: false, error: 'レートは、0より大きい数字で入れてください。', field: 'rate' };
  return null;
}

/**
 * 証拠金維持率：口座のお金といまのレートに、レバレッジか通貨の量のどちらか（from）を入れて、もう片方と維持率を出す
 * @param {{money:number|null, rate:number|null, lev?:number|null, qty?:number|null, from?:'lev'|'qty'}} p
 *   from 'lev'：lev 倍で取引したときの通貨の量と維持率　from 'qty'：qty 通貨を取引したときのレバレッジと維持率
 * 維持率 ＝ 口座のお金 ÷ 取引に必要なお金 × 100（取引した直後。レバレッジ10倍なら 2,500 ÷ 10 ＝ 250％）
 */
export function fxRatio({ money, rate, lev = null, qty = null, from = 'lev' }) {
  const x = from === 'qty' ? qty : lev;
  if ([money, rate, x].some((v) => v === null)) return { ok: false, empty: true };
  if (Number.isNaN(money) || money <= 0) return { ok: false, error: '口座のお金は、0より大きい数字で入れてください。', field: 'money' };
  if (Number.isNaN(rate) || rate <= 0) return { ok: false, error: 'レートは、0より大きい数字で入れてください。', field: 'rate' };
  if (from === 'qty') {
    if (Number.isNaN(qty) || qty < 1) return { ok: false, error: '通貨の量は、1通貨以上で入れてください。', field: 'qty' };
  } else {
    if (Number.isNaN(lev) || lev <= 0) return { ok: false, error: 'レバレッジは、0より大きい数字で入れてください。', field: 'lev' };
    if (lev > FX_MAX_LEV) return { ok: false, error: '日本の個人のFXは、レバレッジ25倍までです。', field: 'lev' };
    if ((money * lev) / rate < 1) return { ok: false, error: 'このレバレッジだと、1通貨も買えません。', field: 'lev' };
  }
  const amount = fix(from === 'qty' ? rate * qty : money * lev); // 取引額
  const need = fix(amount * FX_MARGIN_RATE);
  return {
    ok: true,
    from,
    amount,
    qty: from === 'qty' ? qty : fix(amount / rate),
    lev: from === 'qty' ? fix(amount / money) : lev,
    need,
    ratio: fix((money / need) * 100),
    short: Math.max(0, fix(need - money)), // 取引に必要なお金に足りない分（レバレッジ25倍より大きいとき）
  };
}

/** 通貨の量の書き方（1通貨未満は切り捨て。レバレッジから出した量を、多く見せない） */
export const qtyText = (q) => fmt(Math.floor(fix(q)), 0);

/** レバレッジの書き方（0.01倍単位で切り上げ。低く見せない） */
export const levText = (l) => fmt(Math.ceil(fix(l * 100)) / 100, 2);

/**
 * ロスカットまでの余裕（ロスカットの計算）
 * @param {{money:number|null, qty:number|null, rate:number|null, cut?:number|null, side?:'buy'|'sell'}} p
 *   money：口座のお金（有効証拠金。含み損益こみ）　qty：通貨の量　rate：いまのレート（円）
 *   cut：ロスカットになる維持率（％。会社で違う）　side：買いか売りか
 * 取引に必要なお金をレートに合わせて計算し直す会社では、売りはレートが上がるほど必要なお金も増え、少し早くロスカットになる。
 * 見せる答えは早いほうにそろえる：買いはいまのレートの必要なお金のまま（下がると必要なお金は減るので、実際より早め）、
 * 売りは上がったレートで計算し直した必要なお金で出す
 */
export function fxPosition({ money, qty, rate, cut = 100, side = 'buy' }) {
  const bad = check({ money, qty, rate });
  if (bad) return bad;
  if (cut === null) return { ok: false, empty: true, missing: 'cut' }; // 基準の欄を打ち直している途中
  if (Number.isNaN(cut) || cut <= 0) return { ok: false, error: 'ロスカットの基準は、0より大きい数字で入れてください。', field: 'cut' };
  const need = fxNeed(rate, qty);
  const ratio = fix((money / need) * 100);
  const cutMoney = fix((need * cut) / 100); // ロスカットになるときの口座のお金（いまのレート）
  const buyRoom = fix(money - cutMoney); // 買い：あと何円の損まで（マイナスならもう基準より下）
  const buyPrice = fix(rate - buyRoom / qty);
  // 売り：損 qty×(p−rate) のあと、口座のお金が p の必要なお金×基準 になるレート p
  const sellPrice = fix((money / qty + rate) / (1 + (FX_MARGIN_RATE * cut) / 100));
  const sellRoom = fix(qty * (sellPrice - rate));
  const room = side === 'sell' ? sellRoom : buyRoom; // あと何円の損まで（えらんだほう）
  const price = side === 'sell' ? sellPrice : buyPrice; // ロスカットになるレート
  return { ok: true, side, need, ratio, cut, cutMoney, room, price, buyRoom, sellRoom, buyPrice, sellPrice, over: room < 0, edge: room === 0, never: side === 'buy' && buyPrice <= 0 };
}

/** 1日のスワップ（円）＝ 通貨の量 × レート × 金利の差（％）÷ 100 ÷ 365 */
export const swapPerDay = (qty, rate, diff) => fix((qty * rate * diff) / 100 / 365);

/**
 * スワップの目安：2つの国の政策金利の差から（実際の額は会社ごと・日ごとに違う）
 * 買い：その通貨の金利 − 円の金利（プラスならもらえる、マイナスなら払う）。売りはその反対
 * レートは参考のレート（FX_PAIRS の example）を使う
 */
export function fxSwapEstimate({ pair, side = 'buy', qty }) {
  if (qty === null) return { ok: false, empty: true };
  if (Number.isNaN(qty) || qty < 1) return { ok: false, error: '通貨の量は、1通貨以上で入れてください。', field: 'qty' };
  const p = FX_PAIRS.find((x) => x.id === pair) || FX_PAIRS[0];
  const diff = fix((POLICY_RATES[p.cur].rate - POLICY_RATES.JPY.rate) * (side === 'sell' ? -1 : 1)) || 0; // -0 にしない
  const day = swapPerDay(qty, p.example, diff);
  return { ok: true, pair: p, side, diff, rate: p.example, day, month: fix(day * 30), year: fix(day * 365) };
}

/** スワップの額の書き方（目安なので、10円より少ないときは0.1円、ほかは1円に四捨五入。マイナスはつけない） */
export function swapText(x) {
  const a = Math.abs(fix(x));
  return fmt(a < 10 ? Math.round(a * 10) / 10 : Math.round(a), 1);
}

/**
 * スワップのグラフの棒（たまっていく額）。期間を最大12本に分ける
 * 60日より長いときは月（30日）ごと、14日より長いときは週（7日）ごと、それより短いときは日ごと。最後の棒は期間の終わり
 */
export function swapBars(days, day) {
  const step = days > 60 ? 30 : days > 14 ? 7 : 1;
  const n = Math.min(12, Math.ceil(days / step));
  const size = days / n;
  return Array.from({ length: n }, (_, i) => {
    const d = i === n - 1 ? days : Math.round(size * (i + 1));
    return { day: d, value: fix(day * d) };
  });
}

/** 許せる損のマス（口座のお金の何％か） */
export const FX_LOT_PCTS = [1, 2, 3, 5];
export const FX_LOT_UNIT = 1000; // 通貨の量は1,000通貨単位（多くの会社の最小単位）

/** 口座のお金の pct ％（1円未満は切り捨て） */
export const fxLotLoss = (money, pct) => Math.floor(fix((money * pct) / 100));

/**
 * 通貨の量（ロット）：許せる損 ÷ 損切りの幅 を1,000通貨単位で切り捨て
 * @param {{money:number|null, loss:number|null, width:number|null, rate:number|null}} p
 *   money：口座のお金　loss：許せる損（円）　width：損切りの幅（円。150.00円で買って149.50円で損切りなら0.50）　rate：いまのレート
 * 取引に必要なお金（レート × 量 × 4％）が口座のお金より多いときは short に足りない分
 */
export function fxLot({ money, loss, width, rate }) {
  if ([money, loss, width, rate].some((v) => v === null)) return { ok: false, empty: true };
  if (Number.isNaN(money) || money <= 0) return { ok: false, error: '口座のお金は、0より大きい数字で入れてください。', field: 'money' };
  if (Number.isNaN(loss) || loss <= 0) return { ok: false, error: '許せる損は、0より大きい数字で入れてください。', field: 'loss' };
  if (loss > money) return { ok: false, error: '許せる損は、口座のお金より少なくしてください。', field: 'loss' };
  if (Number.isNaN(width) || width <= 0) return { ok: false, error: '損切りの幅は、0より大きい数字で入れてください。', field: 'width' };
  if (Number.isNaN(rate) || rate <= 0) return { ok: false, error: 'レートは、0より大きい数字で入れてください。', field: 'rate' };
  if (width >= rate) return { ok: false, error: '損切りの幅は、いまのレートより小さくしてください。', field: 'width' };
  const raw = fix(loss / width);
  const qty = Math.floor(fix(raw / FX_LOT_UNIT)) * FX_LOT_UNIT;
  const need = fxNeed(rate, qty);
  return {
    ok: true,
    raw,
    qty,
    lossAt: fix(qty * width), // その量で損切りになったときの損
    need,
    ratio: qty ? fix((money / need) * 100) : null,
    short: Math.max(0, fix(need - money)),
    stop: fix(rate - width), // 買いの損切りのレート
    under: qty < FX_LOT_UNIT, // 1,000通貨に届かない
  };
}
