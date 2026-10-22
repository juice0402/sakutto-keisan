import { parseNum, fmt } from '../lib/number.mjs';
import { memoSummary, memoText, memoParse, MEMO_MAX_ROWS } from '../lib/furusato-memo.mjs';
import { furusatoDeadlines, ONESTOP_MAX } from '../lib/furusato-tetsuzuki.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints, copyText } from './ui.mjs';

// 寄付メモ：上限の目安と、寄付した自治体・金額・申請書を出したか。記録はこの端末のブラウザの中（localStorage）だけに保存して、送らない
// 上限の目安の結果の「寄付メモ」から開くと、#limit=57000&y=2026 で上限が入る（# のうしろはサーバーに送られない）
// 保存できない端末（プライベートブラウズなど）でも、計算はそのまま使える
const KEY = 'sakutto-furusato-memo';
const FIRST = Number($('calc').dataset.first);
const IDX = Array.from({ length: MEMO_MAX_ROWS }, (_, i) => i);
const now = new Date();
const THIS_YEAR = now.getFullYear();
const DL = Object.fromEntries(furusatoDeadlines({ y: THIS_YEAR, m: now.getMonth() + 1, d: now.getDate() }).map((x) => [x.key, x]));
let canSave = true;
let saved = false; // この画面で保存したか（「保存しました」を出す）
const store = loadMemo();
let year = pickYear();
let wipeTimer = 0;

function loadMemo() {
  try {
    return memoParse(localStorage.getItem(KEY) || '{}');
  } catch {
    canSave = false;
    return { years: {} };
  }
}
function saveMemo() {
  if (!canSave) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
    saved = true;
  } catch {
    canSave = false;
  }
}

/** はじめに見せる年：今年。1月10日までで、前の年の記録があれば前の年（申請書の期限があるので） */
function pickYear() {
  const prev = store.years[THIS_YEAR - 1];
  return DL.onestop.forYear === THIS_YEAR - 1 && prev && prev.rows.length ? THIS_YEAR - 1 : THIS_YEAR;
}

/** 上限の目安のページから来たとき（#limit=…&y=…） */
function takeHash() {
  const m = /^#limit=(\d{1,9})(?:&y=(\d{4}))?$/.exec(location.hash);
  if (!m) return;
  const y = m[2] ? Number(m[2]) : THIS_YEAR;
  const cur = store.years[y] || { limit: null, rows: [] };
  store.years[y] = { ...cur, limit: Number(m[1]) };
  year = y;
  saveMemo();
  try { history.replaceState(null, '', location.pathname); } catch { /* 何もしない */ }
}

const val = (id) => parseNum($(id).value);
const shownRows = () => IDX.filter((i) => !$(`row-${i}`).hidden);
const readRows = () =>
  shownRows().map((i) => {
    const a = val(`amount-${i}`);
    return { name: $(`name-${i}`).value, amount: a, sent: $(`sent-${i}`).getAttribute('aria-pressed') === 'true' };
  });

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function setSent(i, on) {
  const b = $(`sent-${i}`);
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? '済' : '未';
}

/** 保存した年の記録を、欄に入れる */
function fill() {
  const data = store.years[year] || { limit: null, rows: [] };
  $('limit').value = data.limit ? fmt(data.limit) : '';
  const n = Math.min(MEMO_MAX_ROWS, Math.max(FIRST, data.rows.length));
  IDX.forEach((i) => {
    const r = data.rows[i];
    $(`row-${i}`).hidden = i >= n;
    $(`name-${i}`).value = r ? r.name : '';
    $(`amount-${i}`).value = r && r.amount !== null ? fmt(r.amount) : '';
    setSent(i, Boolean(r && r.sent));
  });
  drawYears();
  update();
}

/** 記録のある年が2つあるときだけ、年のえらび（新しい2つ） */
function drawYears() {
  const ys = [...new Set([...Object.keys(store.years).filter((y) => store.years[y].rows.length).map(Number), THIS_YEAR, year])].sort().slice(-2);
  const box = $('memo-years');
  box.hidden = ys.length < 2;
  box.innerHTML = ys.map((y) => `<button type="button" class="seg-btn" data-year="${y}" aria-pressed="${y === year}">${y}年</button>`).join('');
}

/** 上限の帯を、寄付ごとに分ける（こえた分は赤） */
function drawBar(rows, sum) {
  const bar = $('memo-bar');
  if (sum.limit === null || !sum.total) {
    bar.innerHTML = sum.limit === null ? '' : '<span class="mb-left" style="width:100%"></span>';
    return;
  }
  const span = Math.max(sum.limit, sum.total);
  const pct = (x) => `${(x / span) * 100}%`;
  const segs = rows
    .filter((r) => Number.isFinite(r.amount) && r.amount > 0)
    .map((r, k) => `<span class="mb-seg ${k % 2 ? 'is-odd' : 'is-even'}" style="width:${pct(r.amount)}">${r.amount / span >= 0.08 ? k + 1 : ''}</span>`)
    .join('');
  const left = sum.left > 0 ? `<span class="mb-left" style="width:${pct(sum.left)}"></span>` : '';
  const line = sum.left < 0 ? `<span class="mb-line" style="left:${pct(sum.limit)}"></span>` : '';
  bar.innerHTML = segs + left + line;
}

/** 自治体の5つのマス（6つ目からは赤） */
function drawBoxes(n) {
  const cells = Math.max(ONESTOP_MAX, Math.min(n, 10));
  $('memo-boxes').innerHTML = Array.from({ length: cells }, (_, i) => `<i class="${i < n ? (i >= ONESTOP_MAX ? 'is-over' : 'is-on') : ''}"></i>`).join('');
}

function unsentText(sum) {
  if (sum.over) return '使えません';
  if (!sum.unsent) return sum.count ? 'なし' : '—';
  if (year < DL.onestop.forYear) return `${sum.unsent}通・期限をすぎました`;
  return `${sum.unsent}通・あと${DL.onestop.days}日`;
}

function update(changed = false) {
  const limit = val('limit');
  const rows = readRows();
  const sum = memoSummary(rows, Number.isFinite(limit) ? limit : null);
  $('f-limit').classList.toggle('has-error', Number.isNaN(limit) || limit === 0);
  shownRows().forEach((i) => $(`f-amount-${i}`).classList.toggle('has-error', Number.isNaN(val(`amount-${i}`))));
  if (changed) {
    store.years[year] = { limit: sum.limit, rows: rows.filter((r) => r.name.trim() || r.amount !== null || r.sent) };
    saveMemo();
  }
  setNote(sum.over ? `${ONESTOP_MAX + 1}つ以上はワンストップ特例が使えません` : '', sum.over);
  $('r-year').textContent = `${year}年の寄付`;
  $('r-save').textContent = !canSave ? 'この端末には保存できません' : saved ? 'この端末に保存しました' : '';
  $('d-total').textContent = sum.count ? `${fmt(sum.total)}円` : '—';
  $('d-cities').textContent = sum.cities ? `${sum.cities}つ` : '—';
  $('d-unsent').textContent = unsentText(sum);
  drawBoxes(sum.cities);
  drawBar(rows, sum);
  $('copy').disabled = !sum.count;
  $('to-add').disabled = shownRows().length >= MEMO_MAX_ROWS;
  const over = sum.limit !== null && sum.left < 0;
  $('r-sum').classList.toggle('is-error', over);
  if (sum.limit !== null) {
    $('r-cap').textContent = over ? 'こえています' : 'のこり';
    $('r-num').textContent = fmt(Math.abs(sum.left));
  } else {
    $('r-cap').textContent = '寄付の合計';
    $('r-num').textContent = sum.count ? fmt(sum.total) : '？';
  }
  const due = sum.unsent && !sum.over && year === DL.onestop.forYear ? `申請書は${DL.onestop.date.m}月${DL.onestop.date.d}日必着です` : '';
  $('r-foot').textContent = sum.limit === null ? '上限を入れてください' : !sum.count ? '寄付した自治体と金額を入れてください' : due;
}

/* ---- 入力 ---- */
const NUMS = [$('limit'), ...IDX.map((i) => $(`amount-${i}`))];
const ORDER = [$('limit'), ...IDX.flatMap((i) => [$(`name-${i}`), $(`amount-${i}`)])];
numericOnly(NUMS);
tidyOnBlur(NUMS, true);
ORDER.forEach((el) => el.addEventListener('input', () => update(true)));
enterToNext(ORDER);
focusHints(document.querySelector('.box-rows'));
IDX.forEach((i) =>
  $(`sent-${i}`).addEventListener('click', () => {
    setSent(i, $(`sent-${i}`).getAttribute('aria-pressed') !== 'true');
    update(true);
  }),
);
$('memo-years').addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn[data-year]');
  if (!b) return;
  year = Number(b.dataset.year);
  fill();
});
$('to-add').addEventListener('click', () => {
  const i = IDX.find((k) => $(`row-${k}`).hidden);
  if (i === undefined) return;
  $(`row-${i}`).hidden = false;
  $(`name-${i}`).focus();
  update();
});
$('copy').addEventListener('click', async () => {
  const rows = readRows();
  const limit = val('limit');
  const ok = await copyText(memoText(year, rows, memoSummary(rows, Number.isFinite(limit) ? limit : null)));
  setNote(ok ? '控えをコピーしました' : 'コピーできませんでした', !ok);
});
// ぜんぶ消す：まちがえて消さないように、2回押したときだけ
$('wipe').addEventListener('click', () => {
  const b = $('wipe');
  if (b.getAttribute('aria-pressed') !== 'true') {
    b.setAttribute('aria-pressed', 'true');
    b.textContent = 'もう一度で消す';
    clearTimeout(wipeTimer);
    wipeTimer = setTimeout(() => {
      b.setAttribute('aria-pressed', 'false');
      b.textContent = 'ぜんぶ消す';
    }, 3000);
    return;
  }
  clearTimeout(wipeTimer);
  b.setAttribute('aria-pressed', 'false');
  b.textContent = 'ぜんぶ消す';
  delete store.years[year];
  saveMemo();
  fill();
  setNote(`${year}年の記録を消しました`);
});
takeHash();
fill();
