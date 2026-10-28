// 割り勘の2つのページで共通：レシートの券・合計とおつりの行・集める単位・案内（画像で送るは share-img.mjs の imgReceipt）
import { fmt } from '../lib/number.mjs';
import { $ } from './ui.mjs';

export const wkYen = (x) => `${fmt(x, 0)}円`;
const MAX_TICKETS = 12; // 券はここまで（多いときは最後の券に「+◯人」）

export function setWkNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 人数分の券。list：[{ amount, h }]（h は高さの割合。傾斜割り勘で、多く払う人の券ほど高く） */
export function drawTickets(list) {
  const shown = list.length > MAX_TICKETS ? list.slice(0, MAX_TICKETS - 1) : list;
  const words = list.length <= 6;
  // 6人までは券に額、それより多いときは何人目か
  const html = shown.map((t, i) => `<span class="rc-ticket"${t.h ? ` style="height:${Math.round(22 + 34 * t.h)}px"` : ''}>${words ? `<b>${fmt(t.amount, 0)}</b>` : i + 1}</span>`);
  if (list.length > MAX_TICKETS) html.push(`<span class="rc-ticket is-more">+${list.length - shown.length}人</span>`);
  $('rc-tickets').innerHTML = html.join('');
}

/** 合計・集める・おつりの行 */
export function drawRows(res) {
  $('rc-total').textContent = res ? wkYen(res.total) : '—';
  $('rc-collect-k').textContent = res ? `集める（${res.people}人分）` : '集める';
  $('rc-collect').textContent = res ? wkYen(res.collect) : '—';
  $('rc-change').textContent = res ? wkYen(res.change) : '—';
}

/** 集める単位（1円・10円・100円・1,000円）。えらんだ単位を返す関数 */
export function unitSeg(onChange) {
  let unit = 100;
  const btns = [...document.querySelectorAll('.seg-btn[data-unit]')];
  btns.forEach((b) =>
    b.addEventListener('click', () => {
      unit = Number(b.dataset.unit);
      btns.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      onChange();
    }),
  );
  return () => unit;
}
