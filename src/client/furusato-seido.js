import { $ } from './ui.mjs';

// ふるさと納税の制度の変更点：えらんだ寄付の年に、変更ごとに「前から・この年・まだ」を出す
// はじめは見た人のブラウザの年（マスにない年なら、近いほうのマス）
const seidoTiles = [...document.querySelectorAll('.tile[data-y]')];
const seidoItems = [...document.querySelectorAll('.sd-item')];
const SEIDO_TAG = { old: '前から', now: 'この年', later: 'まだ' };

function showYear(y) {
  seidoTiles.forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.y) === y)));
  let n = 0;
  for (const li of seidoItems) {
    const from = Number(li.dataset.from);
    const k = from < y ? 'old' : from === y ? 'now' : 'later';
    if (k === 'now') n++;
    li.classList.toggle('is-now', k === 'now');
    li.classList.toggle('is-later', k === 'later');
    li.querySelector('.sd-tag').textContent = SEIDO_TAG[k];
  }
  $('r-cap').textContent = `${y}年の寄付で`;
  $('r-num').textContent = String(n);
  $('r-foot').textContent = `所得税は令和${y - 2018}年分・住民税は令和${y - 2017}年度`;
}

document.querySelector('.tiles-2').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-y]');
  if (t) showYear(Number(t.dataset.y));
});
const seidoYears = seidoTiles.map((t) => Number(t.dataset.y));
const thisYear = new Date().getFullYear();
showYear(Math.min(Math.max(thisYear, seidoYears[0]), seidoYears[seidoYears.length - 1]));
