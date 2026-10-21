import { parseNum, fmt } from '../lib/number.mjs';
import { warikanKeisha, WARIKAN_GROUPS } from '../lib/warikan.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { wkYen, setWkNote, drawTickets, drawRows, unitSeg, shareReceipt } from './warikan-ui.mjs';

// 傾斜割り勘の計算：多め・ふつう・少なめの人数と、ふつうの人の何倍を払うか。結果はお会計のレシート（グループごとの1人の額・人数分の券は払う額の高さ）
const val = (id) => parseNum($(id).value);
const INPUTS = [...document.querySelectorAll('#calc input')]; // 上から順（合計・人数と何倍）
const unit = unitSeg(update);
let last = null;

function emptyText(res) {
  if (res.missing === 'total') return '合計を入れてください';
  if (res.missing === 'rate') return `${WARIKAN_GROUPS[res.index].name}の何倍を入れてください`;
  if (res.missing === 'more') {
    // 1人しか入っていないとき：まだ空の、いちばん上のグループ
    const i = WARIKAN_GROUPS.findIndex((g, n) => val(`people-${n}`) === null);
    if (i >= 0) return `${WARIKAN_GROUPS[i].name}の人数を入れてください`;
  }
  return '人数を入れてください';
}

function update() {
  const groups = WARIKAN_GROUPS.map((g, i) => ({ people: val(`people-${i}`), rate: val(`rate-${i}`) }));
  const res = warikanKeisha({ total: val('total'), groups, unit: unit() });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  setWkNote(res.error || '', !!res.error);
  $('share').disabled = !res.ok;
  last = res.ok ? res : null;
  drawRows(last);
  WARIKAN_GROUPS.forEach((g, i) => {
    const row = res.ok ? res.rows.find((r) => r.index === i) : null;
    $(`rc-v-${i}`).textContent = row ? fmt(row.each, 0) : res.ok ? '—' : '？';
    $(`rc-n-${i}`).textContent = row ? `× ${row.people}人` : '';
    $(`rc-g-${i}`).classList.toggle('is-off', res.ok && !row);
  });
  if (!res.ok) {
    $('r-foot').textContent = res.empty ? emptyText(res) : '';
    drawTickets([]);
    return;
  }
  $('r-foot').textContent = '';
  const max = Math.max(...res.rows.map((r) => r.each));
  drawTickets(res.rows.flatMap((r) => Array.from({ length: r.people }, () => ({ amount: r.each, h: r.each / max }))));
}

/* ---- 画像で送る ---- */
$('share').addEventListener('click', () => {
  if (!last) return;
  const max = Math.max(...last.rows.map((r) => r.each));
  const how = shareReceipt(
    {
      lines: last.rows.map((r) => ({ k: WARIKAN_GROUPS[r.index].name, v: fmt(r.each, 0), n: `× ${r.people}人` })),
      tickets: last.rows.flatMap((r) => Array.from({ length: r.people }, () => ({ amount: r.each, h: r.each / max }))),
      rows: [['合計', wkYen(last.total)], [`集める（${last.people}人分）`, wkYen(last.collect)], ['おつり', wkYen(last.change)]],
      notes: [],
    },
    'warikan.png',
  );
  if (how === 'save') setWkNote('画像を保存しました');
});

/* ---- 入力 ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
tidyOnBlur([$('total')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = el.defaultValue; }); // 何倍は、はじめの値にもどす
  update();
});
// Enter は合計 → 人数の欄へ（何倍は、はじめの値が入っているので、とばす）
enterToNext(INPUTS.filter((el) => !el.id.startsWith('rate-')));
enterToNext(INPUTS.filter((el) => el.id.startsWith('rate-')));
focusHints(document.querySelector('.box-rows'));
update();
