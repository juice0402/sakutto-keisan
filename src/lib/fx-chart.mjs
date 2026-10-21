import { fix } from './number.mjs';

// FX の結果のチャートの形（ブラウザとテストの両方で使う。DOM なし）
// 座標は SVG の 0〜100（左上が 0,0）。レートの動きは本物ではなく、いまのレートに向かう決まった形の線（ロスカットのラインとの近さを見せるため）

// レートの線の形：右はし（いま）が 0。プラスはロスカットのラインから遠いほう
const WALK = [0.55, 0.7, 0.42, 0.62, 0.9, 0.74, 0.5, 0.66, 0.36, 0.2, 0.44, 0.6, 0.3, 0.12, 0.3, 0.06, -0.14, 0.1, 0.26, -0.04, -0.3, -0.1, 0.16, -0.2, -0.45, -0.24, -0.04, -0.34, -0.14, 0];
const FAR = 0.08; // いまのレートから8％はなれていれば、いちばん遠く描く
const AMP = 14; // 線のゆれ幅

/**
 * ロスカットのチャート
 * @param {{rate:number, price:number, never?:boolean}} p  rate：いまのレート　price：ロスカットになるレート　never：0円まで下がってもロスカットにならない
 * @returns {{cutAbove:boolean, nowY:number, cutY:number|null, line:string, endX:number}}
 *   cutAbove：ロスカットのラインがいまより上（売り。買いでもう基準より下のときも）
 */
export function cutChartShape({ rate, price, never = false }) {
  const cutAbove = !never && price > rate;
  const dist = never ? FAR : Math.abs(price - rate) / rate;
  const gap = Math.max(0.24, Math.min(1, dist / FAR)) * 50; // 近くても、2つのレートの札が重ならないだけはなす
  const nowY = cutAbove ? 66 : 34;
  const cutY = never ? null : fix(cutAbove ? nowY - gap : nowY + gap);
  const dir = cutAbove ? 1 : -1; // 線がロスカットのラインから遠ざかる向き（y がふえる＝下）
  const toward = Math.min(1, (gap * 0.75) / (0.45 * AMP)); // ラインに近づく向きは、ラインをこえないように小さく
  const endX = 70;
  const line = WALK.map((w, i) => {
    const x = fix(2 + (i / (WALK.length - 1)) * (endX - 2));
    const y = fix(nowY + dir * (w >= 0 ? w : w * toward) * AMP);
    return `${i ? 'L' : 'M'}${x} ${y}`;
  }).join('');
  return { cutAbove, nowY, cutY, line, endX };
}

/**
 * スワップのチャート：1年でたまる（払う）額を、月ごとの階段の線で
 * @param {Array<{day:number, value:number}>} bars  swapBars(365, 1日の額) の棒（12本）
 * @param {boolean} pay  払うとき（線は左上から右下へ）
 * @returns {{line:string, area:string, points:Array<{x:number, y:number}>}}
 */
export function swapChartShape(bars, pay = false) {
  const top = 14;
  const bottom = 86;
  const max = bars.length ? bars.at(-1).value : 0;
  const y = (v) => fix(pay ? top + (max > 0 ? (v / max) * (bottom - top) : 0) : bottom - (max > 0 ? (v / max) * (bottom - top) : 0));
  const start = pay ? top : bottom;
  const points = bars.map((b) => ({ x: fix(2 + (b.day / 365) * 94), y: y(b.value) })); // 右はしの点が切れないように 2〜96
  const line = points.reduce((d, p) => `${d}H${p.x}V${p.y}`, `M2 ${start}`);
  return { line, area: `${line}V${start}H2Z`, points };
}
