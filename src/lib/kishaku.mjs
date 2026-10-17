import { fix, fmt } from './number.mjs';
import { formatAmount } from './recipe.mjs';

// 希釈率（ブラウザとテストの両方で使う）
// 「◯倍に薄める」＝原液に水を足して、全体を原液の◯倍の量にする（10倍なら 原液1：水9）

export const DILUTE_TILES = [2, 3, 5, 10, 50, 100, 1000]; // 「その他」と合わせて4列×2段

/**
 * 原液と水の量（ml）を出す
 * @param {{ratio:number|null, amount:number|null, from?:'total'|'concentrate'|'water'}} p
 *   amount は from の量（作りたい量・原液の量・水の量）。ml で入れる
 */
export function dilute({ ratio, amount, from = 'total' }) {
  if (ratio === null || amount === null) return { ok: false, empty: true };
  if (Number.isNaN(ratio) || ratio < 1) return { ok: false, error: '何倍に薄めるかは、1以上の数字で入れてください。' };
  if (Number.isNaN(amount) || amount <= 0) return { ok: false, error: '量は0より大きい数字で入れてください。' };
  let c;
  let w;
  let t;
  if (from === 'concentrate') {
    c = amount;
    t = c * ratio;
    w = t - c;
  } else if (from === 'water') {
    if (ratio === 1) return { ok: false, error: '1倍（薄めない）のときは、水を入れません。' };
    w = amount;
    c = w / (ratio - 1);
    t = w + c;
  } else {
    t = amount;
    c = t / ratio;
    w = t - c;
  }
  return { ok: true, ratio, concentrate: fix(c), water: fix(w), total: fix(t) };
}

/** 濃度（%）から倍率を出す：原液の濃度 ÷ 作りたい濃度 */
export function ratioFromPercent(src, target) {
  if (src === null || target === null) return { ok: false, empty: true };
  if (Number.isNaN(src) || src <= 0 || src > 100) return { ok: false, error: '原液の濃度は、0より大きく100以下の数字で入れてください。', field: 'src' };
  if (Number.isNaN(target) || target <= 0) return { ok: false, error: '作りたい濃度は、0より大きい数字で入れてください。', field: 'target' };
  if (target > src) return { ok: false, error: '作りたい濃度は、原液の濃度より低くしてください（薄めると濃度は下がります）。', field: 'target' };
  return { ok: true, ratio: fix(src / target) };
}

/** 何対何（原液：水）から倍率を出す：（原液 ＋ 水）÷ 原液。1対3なら4倍 */
export function ratioFromParts(conc, water) {
  if (conc === null || water === null) return { ok: false, empty: true };
  if (Number.isNaN(conc) || conc <= 0) return { ok: false, error: '原液の割合は、0より大きい数字で入れてください。', field: 'pc' };
  if (Number.isNaN(water) || water < 0) return { ok: false, error: '水の割合は、0以上の数字で入れてください。', field: 'pw' };
  return { ok: true, ratio: fix((conc + water) / conc) };
}

/** 「原液1：水9」の水のぶん（倍率 − 1） */
export const waterPart = (ratio) => fmt(ratio - 1, 2);

/** 量（ml）の書き方。1,000ml からは L */
export function volumeText(ml) {
  if (Math.round(ml) >= 1000) return `${fmt(ml / 1000, 2)}L`;
  return formatAmount(ml, 'ml').text;
}

/** 量の欄に入れる数字（ml。単位は欄の右に書くので付けない）。10ml より少ないときは小数第1位まで */
export const mlValue = (ml) => formatAmount(ml, 'ml').text.replace(/ml$/, '');

/** 1,000ml からは L での量も添える（「＝1L」「約2L」） */
export function literText(ml) {
  if (Math.round(ml) < 1000) return '';
  const l = fmt(ml / 1000, 2);
  return `${Math.abs(Number(l.replace(/,/g, '')) - ml / 1000) > 1e-9 ? '約' : '＝'}${l}L`;
}

/** キャップで量るときの杯数（花王のハイターはキャップ1杯が約25ml）。0.1杯より少ないときは出さない */
export function capText(ml, capMl) {
  const cups = ml / capMl;
  if (cups < 0.1 - 1e-9) return '';
  return `約${fmt(cups, 1)}杯`;
}

/** 計量スプーンでの目安（小さじ¼〜大さじ3のとき）。大さじ1＝15ml・小さじ1＝5ml */
export function spoonText(ml) {
  if (ml < 1.25 - 1e-9 || ml > 45 + 1e-9) return '';
  const f = formatAmount(ml / 5, '小さじ');
  return `${f.approx ? '約' : ''}${f.text}`;
}
