// 残業代の2つのページ（時給から・月給から）で共通の部品：残業・深夜・休日の時間、明細、案内、クリアと Enter
import { parseNum, fmt } from '../lib/number.mjs';
import { zangyo, zangyoHoursText } from '../lib/zangyo.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

export const ZANGYO_HOUR_IDS = ['over', 'night', 'holiday'];
export const numVal = (id) => parseNum($(id).value);

/** 「20.30」のように小数2けたの時間は、20時間30分のつもりかもしれないので、何分で計算したかを出す */
function minutesHint() {
  for (const id of ZANGYO_HOUR_IDS) {
    const m = $(id).value.match(/^\d+\.(\d\d)$/);
    if (m && Number(m[1]) < 60) return `${$(id).value}は${zangyoHoursText(numVal(id))}です。30分は0.5と入れます`;
  }
  return '';
}

/**
 * 時給から残業代を出して、大きな金額・明細書のような項目ごとの時間と金額・案内を書く
 * wageRes：時給（{ ok, wage } か、まだ入れていない・まちがいの結果）　empty：まだ入れていないときの案内
 */
export function zangyoUpdate(wageRes, empty) {
  const res = wageRes.ok ? zangyo({ wage: wageRes.wage, over: numVal('over'), night: numVal('night'), holiday: numVal('holiday') }) : wageRes;
  document.querySelectorAll('#calc .box-field').forEach((f) => f.classList.toggle('has-error', f.id === `f-${res.field}`));
  const note = res.error || minutesHint();
  $('r-note').hidden = !note;
  $('r-note').textContent = note;
  $('r-note').classList.toggle('is-error', !!res.error);
  $('slip').innerHTML = res.ok
    ? res.parts.map((p) => `<p class="slip-row"><span>${p.name}<small>${zangyoHoursText(p.hours)} × ${fmt(p.unit, 0)}円</small></span><b>${fmt(p.amount, 0)}円</b></p>`).join('')
    : '';
  $('r-num').textContent = res.ok ? fmt(res.total, 0) : '？';
  $('r-foot').textContent = res.empty ? empty[res.missing] : '';
  return res;
}

/** 入力したそばに計算。いちばん上の欄（時給か月給）は離れたら3桁区切りに。クリア・Enter で次の欄 */
export function zangyoSetup(inputs, update) {
  numericOnly(inputs);
  inputs.forEach((el) => el.addEventListener('input', update));
  tidyOnBlur([inputs[0]], true);
  $('clear').addEventListener('click', () => {
    inputs.forEach((el) => { el.value = ''; });
    update();
  });
  enterToNext(inputs);
  update();
}
