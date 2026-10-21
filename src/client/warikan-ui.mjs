// 割り勘の2つのページで共通：レシートの券・合計とおつりの行・集める単位・案内・画像で送る
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

/* ---- 画像で送る：レシートの絵を、この端末の中で画像にする（サイトには送らない） ---- */
// spec：{ lines:[{ k, v, n }]（大きな額）, tickets:[{ amount, h }], rows:[[名前, 額]], notes:[1行ずつ] }
function receiptCanvas(spec) {
  const css = getComputedStyle(document.body);
  const color = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  const ink = color('--text', '#1c2f4a');
  const red = color('--red', '#c8323c');
  const muted = color('--muted', '#5a6779');
  const rule = color('--border', '#b4c1d2');
  const sheet = color('--sheet', '#f3f1ea');
  const font = (w, size) => `${w} ${size}px system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`;
  const W = 720;
  const X0 = 70;
  const X1 = W - 70;
  const big = spec.lines.length === 1;
  const lineH = big ? 110 : 96;
  const H = 70 + 80 + spec.lines.length * lineH + (spec.tickets.length ? 96 : 0) + spec.rows.length * 52 + spec.notes.length * 40 + 120;
  const c = document.createElement('canvas');
  c.width = W * 2;
  c.height = H * 2;
  const g = c.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#eef2f8';
  g.fillRect(0, 0, W, H);
  // 紙（下のはしはぎざぎざ）
  const bottom = H - 50;
  const teeth = 24;
  g.beginPath();
  g.moveTo(X0, 40);
  g.lineTo(X1, 40);
  g.lineTo(X1, bottom);
  for (let i = 1; i <= teeth; i++) {
    g.lineTo(X1 - ((i - 0.5) * (X1 - X0)) / teeth, bottom + 12);
    g.lineTo(X1 - (i * (X1 - X0)) / teeth, bottom);
  }
  g.closePath();
  g.fillStyle = sheet;
  g.fill();
  g.strokeStyle = rule;
  g.lineWidth = 2;
  g.stroke();
  const dash = (y) => {
    g.save();
    g.setLineDash([8, 6]);
    g.beginPath();
    g.moveTo(X0 + 24, y);
    g.lineTo(X1 - 24, y);
    g.stroke();
    g.restore();
  };
  let y = 40 + 62;
  g.textBaseline = 'alphabetic';
  g.textAlign = 'center';
  g.fillStyle = ink;
  g.font = font(800, 30);
  g.fillText('お 会 計', W / 2, y);
  y += 26;
  dash(y);
  // 大きな額
  for (const line of spec.lines) {
    y += big ? 96 : 70;
    g.textAlign = 'left';
    g.fillStyle = ink;
    g.font = font(800, big ? 34 : 28);
    g.fillText(line.k, X0 + 30, y);
    if (line.n) {
      g.fillStyle = muted;
      g.font = font(700, 20);
      g.fillText(line.n, X0 + 30, y + 28);
    }
    g.textAlign = 'right';
    g.fillStyle = red;
    g.font = font(800, big ? 34 : 26);
    g.fillText('円', X1 - 30, y);
    const yenW = g.measureText('円').width;
    g.font = font(800, big ? 84 : 54);
    g.fillText(line.v, X1 - 34 - yenW, y);
    y += big ? 14 : 26;
  }
  // 人数分の券
  if (spec.tickets.length) {
    const list = spec.tickets.slice(0, MAX_TICKETS);
    const gap = 8;
    const w = (X1 - X0 - 60 - gap * (list.length - 1)) / list.length;
    const base = y + 86;
    g.save();
    g.setLineDash([6, 5]);
    list.forEach((t, i) => {
      const h = t.h ? 30 + 44 * t.h : 64;
      const x = X0 + 30 + i * (w + gap);
      g.strokeRect(x, base - h, w, h);
      g.fillStyle = spec.tickets.length <= 6 ? ink : muted;
      g.textAlign = 'center';
      g.font = font(800, 20);
      g.fillText(spec.tickets.length <= 6 ? fmt(t.amount, 0) : String(i + 1), x + w / 2, base - h / 2 + 7);
    });
    g.restore();
    y = base + 10;
  }
  dash(y + 6);
  // 合計・集める・おつり
  for (const [k, v] of spec.rows) {
    y += 52;
    g.fillStyle = ink;
    g.textAlign = 'left';
    g.font = font(700, 24);
    g.fillText(k, X0 + 30, y);
    g.textAlign = 'right';
    g.font = font(800, 26);
    g.fillText(v, X1 - 30, y);
  }
  for (const note of spec.notes) {
    y += 40;
    g.textAlign = 'center';
    g.fillStyle = ink;
    g.font = font(700, 22);
    g.fillText(note, W / 2, y);
  }
  g.textAlign = 'center';
  g.fillStyle = muted;
  g.font = font(700, 20);
  g.fillText('サクッと計算　sakutto-keisan.com', W / 2, bottom - 24);
  return c;
}

/** 画像を作って、共有の画面（LINE など）に出す。共有できない端末では画像を保存する。'share' か 'save' を返す */
export function shareReceipt(spec, name) {
  // ボタンを押したその場で共有の画面を出せるように、画像は同じ流れの中で作る（待たない）
  const url = receiptCanvas(spec).toDataURL('image/png');
  const bin = atob(url.split(',')[1]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const file = new File([bytes], name, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] }).catch(() => { /* 閉じたときは何もしない */ });
    return 'share';
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  return 'save';
}
