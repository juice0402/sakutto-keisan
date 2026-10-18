import { fix, fmt } from './number.mjs';

// FX の計算（証拠金維持率・追証・スワップ。ブラウザとテストの両方で使う）
// 画面ではむずかしい言葉を使わない：証拠金 → 口座のお金、必要証拠金 → 取引に必要なお金、ロット → 通貨の量
// 日本の個人のFXはレバレッジが25倍まで。取引に必要なお金は、取引額（レート × 量）の4％

export const FX_MARGIN_RATE = 0.04;
export const FX_QTY_TILES = [1000, 10000, 100000]; // 1,000通貨・1万通貨・10万通貨（その他は万通貨で入れる）

/** 取引に必要なお金（必要証拠金）＝ レート × 量 × 4％ */
export const fxNeed = (rate, qty) => fix(rate * qty * FX_MARGIN_RATE);

/** 量の書き方：10000 → 1万通貨、1000 → 1,000通貨、15000 → 1.5万通貨 */
export function qtyText(qty) {
  if (qty >= 10000) return `${fmt(qty / 10000, 4)}万通貨`;
  return `${fmt(qty, 0)}通貨`;
}

/** お金の書き方（1円未満は切り捨て） */
export const yenText = (x) => `${fmt(Math.floor(fix(x)), 0)}円`;

/**
 * ロスカットになるレートの書き方。0.01円単位で、いまのレートに近いほうへ丸める
 * （買いなら切り上げ、売りなら切り捨て。実際より遠くに見せない）
 */
export function cutPriceText(price, side) {
  const p = side === 'sell' ? Math.floor(fix(price * 100)) / 100 : Math.ceil(fix(price * 100)) / 100;
  return `${p.toFixed(2)}円`;
}

function check({ money, qty, rate }) {
  if ([money, qty, rate].some((v) => v === null)) return { ok: false, empty: true };
  if (Number.isNaN(money) || money < 0) return { ok: false, error: '口座のお金は、0以上の数字で入れてください。', field: 'money' };
  if (Number.isNaN(qty) || qty <= 0) return { ok: false, error: '通貨の量は、0より大きい数字で入れてください。', field: 'qty' };
  if (Number.isNaN(rate) || rate <= 0) return { ok: false, error: 'レートは、0より大きい数字で入れてください。', field: 'rate' };
  return null;
}

/**
 * 証拠金維持率とロスカットまでの余裕
 * @param {{money:number|null, qty:number|null, rate:number|null, cut?:number|null}} p
 *   money：口座のお金（有効証拠金。含み損益こみ）　qty：通貨の量　rate：いまのレート（円）
 *   cut：ロスカットになる維持率（％。会社で違う）
 */
export function fxPosition({ money, qty, rate, cut = 100 }) {
  const bad = check({ money, qty, rate });
  if (bad) return bad;
  if (cut === null || Number.isNaN(cut) || cut <= 0) return { ok: false, error: 'ロスカットの基準は、0より大きい数字で入れてください。', field: 'cut' };
  const need = fxNeed(rate, qty);
  const ratio = fix((money / need) * 100);
  const cutMoney = fix((need * cut) / 100); // ロスカットになるときの口座のお金
  const room = fix(money - cutMoney); // あと何円の損まで大丈夫か（マイナスならもうロスカットの水準）
  const move = fix(room / qty); // あと何円動くとロスカットか（1通貨あたり）。買いなら下がる、売りなら上がる
  const buyPrice = fix(rate - move);
  const sellPrice = fix(rate + move);
  return { ok: true, need, ratio, cut, cutMoney, room, move, buyPrice, sellPrice, over: room <= 0, never: buyPrice <= 0 };
}

/**
 * 追証：足りないお金
 *   維持率を level％ にもどすのに足りないお金（追証の目安）
 *   target を入れたとき：そのレートまで動いてもロスカットにならないために、あと入れるお金
 */
export function fxAddMoney({ money, qty, rate, level = 100, cut = 100, target = null }) {
  const bad = check({ money, qty, rate });
  if (bad) return bad;
  if (level === null || Number.isNaN(level) || level <= 0) return { ok: false, error: '追証の基準は、0より大きい数字で入れてください。', field: 'level' };
  const pos = fxPosition({ money, qty, rate, cut });
  if (!pos.ok) return pos;
  const levelMoney = fix((pos.need * level) / 100);
  const short = Math.max(0, fix(levelMoney - money)); // 維持率 level％ までに足りないお金
  const res = { ...pos, level, levelMoney, short };
  if (target === null) return res;
  if (Number.isNaN(target) || target <= 0) return { ok: false, error: '耐えたいレートは、0より大きい数字で入れてください。', field: 'target' };
  const loss = fix(qty * Math.abs(rate - target)); // そのレートまで動いたときの損（いまより下なら買い、上なら売りの損）
  const deposit = Math.max(0, fix(pos.cutMoney + loss - money)); // ロスカットにならないために入れるお金
  return { ...res, target, loss, deposit };
}

/** スワップの期間のマス（日数はカレンダーの日数。土日の分もつく） */
export const SWAP_PERIODS = [
  { days: 30, label: '1か月' },
  { days: 182, label: '半年' },
  { days: 365, label: '1年' },
];

/**
 * スワップ：持ち続けたときに受け取る（払う）お金
 * @param {{perDay:number|null, qty:number|null, days:number|null}} p
 *   perDay：1万通貨あたり1日のスワップ（円）。払うスワップも同じ計算なので、マイナスはつけずに入れる
 */
export function fxSwap({ perDay, qty, days }) {
  if ([perDay, qty, days].some((v) => v === null)) return { ok: false, empty: true };
  if (Number.isNaN(perDay) || perDay < 0) return { ok: false, error: 'スワップは、0以上の数字で入れてください。', field: 'swap' };
  if (Number.isNaN(qty) || qty <= 0) return { ok: false, error: '通貨の量は、0より大きい数字で入れてください。', field: 'qty' };
  if (Number.isNaN(days) || days <= 0 || !Number.isInteger(days)) return { ok: false, error: '日数は、1以上の整数で入れてください。', field: 'days' };
  const day = fix((perDay * qty) / 10000);
  return { ok: true, day, days, total: fix(day * days), month: fix(day * 30), year: fix(day * 365) };
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
