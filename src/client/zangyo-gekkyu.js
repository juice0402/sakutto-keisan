import { fmt } from '../lib/number.mjs';
import { zangyoWage } from '../lib/zangyo.mjs';
import { $ } from './ui.mjs';
import { zangyoUpdate, zangyoSetup, numVal, ZANGYO_HOUR_IDS } from './zangyo-ui.mjs';

// 月給の残業代の計算：月給・年間休日・1日の所定時間から時給を出して、残業・深夜・休日の時間から残業代
// 結果は大きな残業代と明細、1年を出勤と休日に分けた帯（年間休日で時給が変わるわけ）、1か月の所定時間と時給
const INPUTS = ['salary', 'holidays', 'daily', ...ZANGYO_HOUR_IDS].map((id) => $(id));
const EMPTY = { salary: '月給を入れてください', days: '年間休日と1日の所定時間を入れてください', hours: '残業の時間を入れてください' };

/** 1年（365日）を、出勤の日と休日に分けた帯 */
function drawYear() {
  const h = numVal('holidays');
  const ok = h !== null && h >= 0 && h < 365;
  $('y-work').style.width = ok ? `${((365 - h) / 365) * 100}%` : '0%';
  $('y-left').textContent = ok ? `出勤 ${fmt(365 - h, 1)}日` : '出勤';
  $('y-right').textContent = ok ? `休日 ${fmt(h, 1)}日` : '休日';
}

function update() {
  const w = zangyoWage({ salary: numVal('salary'), holidays: numVal('holidays'), daily: numVal('daily') });
  zangyoUpdate(w, EMPTY);
  drawYear();
  $('r-unit').textContent = w.ok ? `1か月 ${fmt(w.monthHours, 1)}時間・時給 ${fmt(w.wage, 0)}円` : '';
}

zangyoSetup(INPUTS, update);
