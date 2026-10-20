import { parseNum, fmt } from '../lib/number.mjs';
import { zangyo, zangyoWage, zangyoHoursText } from '../lib/zangyo.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

// 残業代の計算：時給は、月給・年間休日・1日の所定時間から出して点線の答えの欄に入れる。時給を自分で入れてもよい
// 月給と時給のうち、あとから入れたほうを使う（時給を入れたら、月給の欄は空にする）
let source = 'salary';
const DAY_IDS = ['salary', 'holidays', 'daily'];
const HOUR_IDS = ['over', 'night', 'holiday'];
const INPUTS = [...DAY_IDS, 'wage', ...HOUR_IDS].map((id) => $(id));
const val = (id) => parseNum($(id).value);

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 明細書のように、項目ごとの時間と金額 */
function drawSlip(res) {
  $('slip').innerHTML = res
    ? res.parts
        .map((p) => `<p class="slip-row"><span>${p.name}<small>${zangyoHoursText(p.hours)} × ${fmt(p.unit, 0)}円</small></span><b>${fmt(p.amount, 0)}円</b></p>`)
        .join('')
    : '';
}

/** 「20.30」のように小数2けたの時間は、20時間30分のつもりかもしれないので、何分で計算したかを出す */
function minutesHint() {
  for (const id of HOUR_IDS) {
    const m = $(id).value.match(/^\d+\.(\d\d)$/);
    if (m && Number(m[1]) < 60) return `${$(id).value}は${zangyoHoursText(val(id))}です。30分は0.5と入れます`;
  }
  return '';
}

function update() {
  let wageRes;
  let wage = null;
  if (source === 'wage') {
    wage = val('wage');
    wageRes = wage === null ? { ok: false, empty: true, missing: 'salary' } : { ok: true, wage };
  } else {
    wageRes = zangyoWage({ salary: val('salary'), holidays: val('holidays'), daily: val('daily') });
    $('wage').value = wageRes.ok ? fmt(wageRes.wage, 0) : '';
    if (wageRes.ok) wage = wageRes.wage;
  }
  let res = wageRes;
  if (wageRes.ok) res = zangyo({ wage, over: val('over'), night: val('night'), holiday: val('holiday') });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  $('f-wage').classList.toggle('is-out', source === 'salary' && wageRes.ok);
  setNote(res.error || minutesHint(), !!res.error);
  drawSlip(res.ok ? res : null);
  if (!res.ok) {
    $('r-num').textContent = '？';
    const empty = { salary: '月給か時給を入れてください', days: '年間休日と1日の所定時間を入れてください', hours: '残業の時間を入れてください' };
    $('r-foot').textContent = res.empty ? empty[res.missing] : '';
    return;
  }
  $('r-num').textContent = fmt(res.total, 0);
  $('r-foot').textContent = source === 'salary' ? `1か月の所定時間 ${fmt(wageRes.monthHours, 1)}時間で計算` : '';
}

/* ---- 入力：月給か時給の、あとから入れたほうを使う。答えの欄（時給）をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    // 自分で入れたときだけ切りかえる（離れたときの3桁区切りの整え直しでは、切りかえない）
    if (e.isTrusted && el.id === 'wage' && source !== 'wage') {
      source = 'wage';
      $('salary').value = '';
    } else if (e.isTrusted && el.id === 'salary') source = 'salary';
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${el.id}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur([$('salary'), $('wage')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  source = 'salary';
  update();
});
enterToNext(INPUTS.filter((el) => el.id !== 'wage'));
update();
