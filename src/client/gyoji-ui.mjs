// 家族の行事の5ページで共通のブラウザ用部品
import { weekdayOf, warekiOfYear, dayNum } from '../lib/hizuke.mjs';
import { $ } from './ui.mjs';

const today = new Date();
export const GY_TODAY = { y: today.getFullYear(), m: today.getMonth() + 1, d: today.getDate() };
export const GY_YEAR = GY_TODAY.y;
export const gyMd = (d) => `${d.m}月${d.d}日（${weekdayOf(d)}）`;
export const gyWa = (y) => warekiOfYear(y).text;
export const gyDaysFromToday = (d) => dayNum(d) - dayNum(GY_TODAY);

export function gyNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 日めくりカレンダー（.cal） */
export function gyCal(d) {
  $('c-ym').textContent = d ? `${d.y}年${d.m}月` : '—';
  $('c-d').textContent = d ? String(d.d) : '？';
  const w = d ? weekdayOf(d) : '';
  $('c-w').textContent = d ? `${w}曜日` : '';
  $('c-w').classList.toggle('is-sun', w === '日');
  $('c-w').classList.toggle('is-sat', w === '土');
}

/** 土日の2日（同じ月なら2つめは日だけ） */
export const gyWeekend = (list) =>
  list.length ? list.map((d, i) => (i && d.m === list[0].m ? `${d.d}日（${weekdayOf(d)}）` : gyMd(d))).join('・') : '—';

/** 付箋（男の子・女の子／男性・女性）。えらんだものに aria-pressed */
export function gySexPress(group, sex) {
  group.querySelectorAll('.seg-btn').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sex === sex)));
}
