// 残業代の2つのページ（時給から・月給から）で共通の部品：残業・深夜・休日の時間、明細、案内、クリアと Enter
import { parseNum, fmt } from '../lib/number.mjs';
import { zangyo, zangyoHoursText, zangyoUnit, ZANGYO_PARTS } from '../lib/zangyo.mjs';
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

/** 明細書の表：時間外・深夜割増・休日出勤（60時間をこえたら60時間超の行も）。入っていない行は「—」、単価は時給がわかれば出す */
function drawSlip(res, wage) {
  const has60 = res.ok && res.parts.some((x) => x.id === 'over60');
  $('slip').innerHTML = ZANGYO_PARTS.filter((p) => p.id !== 'over60' || has60)
    .map((p) => {
      const got = res.ok ? res.parts.find((x) => x.id === p.id) : null;
      if (got) return `<tr><td>${p.name}</td><td>${zangyoHoursText(got.hours)}</td><td>${fmt(got.unit, 0)}</td><td>${fmt(got.amount, 0)}</td></tr>`;
      const unit = wage > 0 ? fmt(zangyoUnit(wage, p.rate), 0) : '—';
      return `<tr class="is-zero"><td>${p.name}</td><td>—</td><td>${unit}</td><td>—</td></tr>`;
    })
    .join('');
}

/**
 * 時給から残業代を出して、明細書（大きな残業代・明細の表・うち割増の分）と案内を書く
 * wageRes：時給（{ ok, wage } か、まだ入れていない・まちがいの結果）　empty：まだ入れていないときの案内
 */
export function zangyoUpdate(wageRes, empty) {
  const res = wageRes.ok ? zangyo({ wage: wageRes.wage, over: numVal('over'), night: numVal('night'), holiday: numVal('holiday') }) : wageRes;
  document.querySelectorAll('#calc .box-field').forEach((f) => f.classList.toggle('has-error', f.id === `f-${res.field}`));
  const note = res.error || minutesHint();
  $('r-note').hidden = !note;
  $('r-note').textContent = note;
  $('r-note').classList.toggle('is-error', !!res.error);
  drawSlip(res, wageRes.ok && res.field !== 'wage' ? wageRes.wage : null);
  $('r-num').textContent = res.ok ? fmt(res.total, 0) : '？';
  $('r-foot').textContent = res.empty ? empty[res.missing] : '';
  $('r-extra').textContent = res.ok && res.extra > 0 ? `うち割増の分 ${fmt(res.extra, 0)}円` : '';
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
