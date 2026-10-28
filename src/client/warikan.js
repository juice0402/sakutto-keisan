import { parseNum, fmt } from '../lib/number.mjs';
import { warikan, WARIKAN_MAX_PEOPLE } from '../lib/warikan.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';
import { wkYen, setWkNote, drawTickets, drawRows, unitSeg } from './warikan-ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgReceipt } from './share-img.mjs';

// 割り勘の計算：合計と人数から1人いくらか。結果はお会計のレシート（大きな1人の額・人数分の券・合計と集める額とおつり・端数を幹事が払うとき）
const val = (id) => parseNum($(id).value);
const EMPTY = { total: '合計を入れてください', people: '人数を入れてください' };
const INPUTS = ['total', 'people'].map((id) => $(id));
const memo = choiMemo('warikan.png');
const unit = unitSeg(update);

const hostText = (res) => (res.low > 0 && res.host !== res.low ? `ほかの人 ${wkYen(res.low)}・幹事 ${wkYen(res.host)}` : '');

function update() {
  const res = warikan({ total: val('total'), people: val('people'), unit: unit() });
  INPUTS.forEach((el) => $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id));
  setWkNote(res.error || '', !!res.error);
  $('people-minus').disabled = !(val('people') > 2);
  drawRows(res.ok ? res : null);
  memo(null);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? EMPTY[res.missing] : '';
    $('rc-host').hidden = true;
    drawTickets([]);
    return;
  }
  $('r-num').textContent = fmt(res.each, 0);
  $('r-foot').textContent = '';
  drawTickets(Array.from({ length: res.people }, () => ({ amount: res.each })));
  const host = hostText(res);
  $('rc-host').hidden = !host;
  $('rc-host-v').textContent = host;
  memo({
    q: `${wkYen(res.total)}を${res.people}人で`,
    a: `1人${wkYen(res.each)}`,
    img: () => imgReceipt({
      lines: [{ k: '1人', v: fmt(res.each, 0) }],
      tickets: Array.from({ length: res.people }, () => ({ amount: res.each })),
      rows: [['合計', wkYen(res.total)], [`集める（${res.people}人分）`, wkYen(res.collect)], ['おつり', wkYen(res.change)]],
      notes: host ? ['幹事が端数を払うなら', host] : [],
    }),
  });
}

/* ---- 人数の －／＋（2人から） ---- */
function step(d) {
  const v = val('people');
  const now = v === null || Number.isNaN(v) ? 3 - (d > 0 ? 2 : 0) : Math.round(v);
  $('people').value = String(Math.min(WARIKAN_MAX_PEOPLE, Math.max(2, now + d)));
  update();
}
$('people-minus').addEventListener('click', () => step(-1));
$('people-plus').addEventListener('click', () => step(1));

/* ---- 入力 ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => el.addEventListener('input', update));
tidyOnBlur([$('total')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  update();
});
enterToNext(INPUTS);
update();
