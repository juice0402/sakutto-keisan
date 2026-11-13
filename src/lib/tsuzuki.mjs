import { fmt } from './number.mjs';
import { kakePct, kakeText } from './kakeritsu.mjs';
import { WARIKAN_MAX_TOTAL } from './warikan.mjs';

// つづけて使う（#163・C-027 案A）：答えの数字を、次の計算のページへ URL の # で渡す（サーバーには送らない）
// 受けとる側は、決めた名前・数字だけ（整数9けたまで・小数2けたまで）・その欄の上限の中だけを使う。合わないものがあれば何もしない

export const TZ_NUM = /^\d{1,9}(\.\d{1,2})?$/;

// 受けとるページごとの欄と範囲（min より大きく max まで）
export const TZ_KAKERITSU = { jodai: [0, 999999999], rate: [0, 100] };
export const TZ_WARIKAN = { total: [0, WARIKAN_MAX_TOTAL] };

const tzOk = (v, [min, max]) => Number.isFinite(v) && TZ_NUM.test(String(v)) && v > min && v <= max;

/** 渡す数字から # の文字を作る（spec にない名前・合わない数字は入れない。1つもなければ空） */
export function tzHash(vals, spec) {
  const parts = Object.entries(vals).filter(([k, v]) => spec[k] && tzOk(v, spec[k])).map(([k, v]) => `${k}=${v}`);
  return parts.length ? `#${parts.join('&')}` : '';
}

/** # の文字を読む。決めた名前・数字だけで、どれも範囲の中ならその値。1つでも合わなければ null */
export function tzRead(hash, spec) {
  const s = String(hash || '').replace(/^#/, '');
  if (!s || s.length > 200) return null;
  const out = {};
  for (const part of s.split('&')) {
    const m = /^([a-z]+)=(.*)$/.exec(part);
    if (!m || !Object.prototype.hasOwnProperty.call(spec, m[1]) || Object.prototype.hasOwnProperty.call(out, m[1]) || !TZ_NUM.test(m[2])) return null;
    const v = Number(m[2]);
    if (!tzOk(v, spec[m[1]])) return null;
    out[m[1]] = v;
  }
  return out;
}

/** 0.01 きざみの整数（12.5 → 1250）。小数2けたをこえるものは null */
const hundredths = (x) => {
  const n = Math.round(x * 100);
  return Math.abs(n - x * 100) < 1e-6 ? n : null;
};

/**
 * 割引のあとに払う割合（％。小数第1位まで）。30％→70、30％のあと20％→56、10％のあと5％→85.5
 * 浮動小数のずれを出さないように、0.01％きざみの整数どうしをかける
 */
export function payPct(rate, rate2 = null) {
  const a = hundredths(100 - rate);
  if (a === null || a < 0 || a > 10000) return null;
  if (rate2 === null || rate2 === undefined) return Math.round(a / 10) / 10;
  const b = hundredths(100 - rate2);
  if (b === null || b < 0 || b > 10000) return null;
  return Math.round((a * b) / 100000) / 10; // a×b は 0.0001％きざみ → 0.1％きざみに四捨五入
}

/**
 * 割引計算の答えから、つづけて使う2つの行（掛け率・割り勘）。答えがないとき・2つくらべるときは null（理由の文のまま）
 * text は [文字, 数字か] の並び（数字は赤ペン）。hash は # の文字
 */
export function waribikiTsuzuki({ price, rate, rate2 = null, final, compare = false }) {
  if (compare || ![price, rate, final].every(Number.isFinite)) return { kakeritsu: null, warikan: null };
  let kakeritsu = null;
  if (tzOk(price, TZ_KAKERITSU.jodai)) {
    const pay = payPct(rate, rate2);
    const okRate = pay !== null && kakePct(pay) === pay && tzOk(pay, TZ_KAKERITSU.rate);
    kakeritsu = {
      hash: tzHash(okRate ? { jodai: price, rate: pay } : { jodai: price }, TZ_KAKERITSU),
      text: okRate
        ? [['で、'], [`${fmt(price)}円`, true], ['の'], [kakeText(pay), true], ['掛けを開く']]
        : [['で、'], [`${fmt(price)}円`, true], ['を上代にして開く']],
    };
  }
  const warikan = tzOk(final, TZ_WARIKAN.total)
    ? { hash: tzHash({ total: final }, TZ_WARIKAN), text: [['で、'], [`${fmt(final)}円`, true], ['を人数で分ける']] }
    : null;
  return { kakeritsu, warikan };
}
