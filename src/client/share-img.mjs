// 画像で送る：結果の絵を、この端末の中で画像（PNG）にする（どこにも送らない）
// 絵はコードで描く（Canva の写真は使わない。保存できる画像に Canva の素材を入れない決まり）
// どの画像も同じ大きさの横幅（720 × 2倍）・同じ背景・紙の色 --sheet・紺のインク・答えは赤・いちばん下にサイト名とドメイン
import { fmt } from '../lib/number.mjs';

const IMG_W = 720;
const IMG_X0 = 70;
const IMG_X1 = IMG_W - 70;
const IMG_MAX_TICKETS = 12;

/** 色（ページの CSS の値。読めないときは方眼ノートの色） */
function imgColors() {
  const css = getComputedStyle(document.body);
  const color = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    ink: color('--text', '#1c2f4a'),
    red: color('--red', '#c8323c'),
    muted: color('--muted', '#5a6779'),
    rule: color('--border', '#b4c1d2'),
    sheet: color('--sheet', '#f3f1ea'),
  };
}

const imgFont = (w, size) => `${w} ${size}px system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`;

/** 幅に入るように字を小さくして書く（切れないように） */
function imgText(g, text, x, y, { w = 800, size = 24, max = IMG_X1 - IMG_X0 - 40, align = 'left', color } = {}) {
  let s = size;
  g.font = imgFont(w, s);
  while (s > 10 && g.measureText(text).width > max) {
    s -= 1;
    g.font = imgFont(w, s);
  }
  if (color) g.fillStyle = color;
  g.textAlign = align;
  g.fillText(text, x, y);
  return g.measureText(text).width;
}

/**
 * 紙を1枚しいた画像の台。H は画像の高さ。teeth：下のはしをぎざぎざに（レシート）
 * paint(g, c, top, bottom) で中身を描く
 */
function imgPaper(H, paint, teeth = false) {
  const c = imgColors();
  const cv = document.createElement('canvas');
  cv.width = IMG_W * 2;
  cv.height = H * 2;
  const g = cv.getContext('2d');
  g.scale(2, 2);
  g.fillStyle = '#eef2f8';
  g.fillRect(0, 0, IMG_W, H);
  const bottom = H - 50;
  g.beginPath();
  g.moveTo(IMG_X0, 40);
  g.lineTo(IMG_X1, 40);
  g.lineTo(IMG_X1, bottom);
  if (teeth) {
    const n = 24;
    for (let i = 1; i <= n; i++) {
      g.lineTo(IMG_X1 - ((i - 0.5) * (IMG_X1 - IMG_X0)) / n, bottom + 12);
      g.lineTo(IMG_X1 - (i * (IMG_X1 - IMG_X0)) / n, bottom);
    }
  } else {
    g.lineTo(IMG_X0, bottom);
  }
  g.closePath();
  g.fillStyle = c.sheet;
  g.fill();
  g.strokeStyle = c.rule;
  g.lineWidth = 2;
  g.stroke();
  g.textBaseline = 'alphabetic';
  paint(g, c, 40, bottom);
  g.textAlign = 'center';
  g.fillStyle = c.muted;
  g.font = imgFont(700, 20);
  g.fillText('サクッと計算　sakutto-keisan.com', IMG_W / 2, bottom - 24);
  return cv;
}

/** 点線の区切り */
function imgDash(g, y, x0 = IMG_X0 + 24, x1 = IMG_X1 - 24) {
  g.save();
  g.setLineDash([8, 6]);
  g.beginPath();
  g.moveTo(x0, y);
  g.lineTo(x1, y);
  g.stroke();
  g.restore();
}

/** 大きな赤い数字と単位を右か中央にそろえて書く。返すのは数字の左はし */
function imgBigNum(g, c, num, unit, x, y, { size = 84, unitSize = 34, align = 'right', max = IMG_X1 - IMG_X0 - 60 } = {}) {
  g.fillStyle = c.red;
  g.font = imgFont(800, unitSize);
  const uw = unit ? g.measureText(unit).width + 6 : 0;
  let s = size;
  g.font = imgFont(800, s);
  while (s > 20 && g.measureText(num).width + uw > max) {
    s -= 2;
    g.font = imgFont(800, s);
  }
  const nw = g.measureText(num).width;
  const left = align === 'right' ? x - nw - uw : x - (nw + uw) / 2;
  g.textAlign = 'left';
  g.fillText(num, left, y);
  if (unit) {
    g.font = imgFont(800, unitSize);
    g.fillText(unit, left + nw + 6, y);
  }
  return left;
}

/** 表の行（左に名前・右に値） */
function imgRow(g, c, k, v, y) {
  g.fillStyle = c.ink;
  imgText(g, k, IMG_X0 + 30, y, { w: 700, size: 24, max: 300 });
  imgText(g, v, IMG_X1 - 30, y, { w: 800, size: 26, max: 260, align: 'right' });
}

/**
 * お会計のレシート（割り勘・消費税）
 * spec：{ title, lines:[{ k, v, n }]（大きな額）, tickets:[{ amount, h }], rows:[[名前, 額]], notes:[1行ずつ] }
 */
export function imgReceipt(spec) {
  const big = spec.lines.length === 1;
  const lineH = big ? 110 : 96;
  const tickets = spec.tickets || [];
  const H = 70 + 80 + spec.lines.length * lineH + (tickets.length ? 96 : 0) + spec.rows.length * 52 + spec.notes.length * 40 + 120;
  return imgPaper(H, (g, c, top) => {
    let y = top + 62;
    g.textAlign = 'center';
    g.fillStyle = c.ink;
    g.font = imgFont(800, 30);
    g.fillText(spec.title || 'お 会 計', IMG_W / 2, y);
    y += 26;
    g.strokeStyle = c.rule;
    imgDash(g, y);
    for (const line of spec.lines) {
      y += big ? 96 : 70;
      g.fillStyle = c.ink;
      const kw = imgText(g, line.k, IMG_X0 + 30, y, { w: 800, size: big ? 34 : 28, max: 200 });
      if (line.n) {
        g.fillStyle = c.muted;
        imgText(g, line.n, IMG_X0 + 30, y + 28, { w: 700, size: 20, max: 200 });
      }
      imgBigNum(g, c, line.v, '円', IMG_X1 - 30, y, { size: big ? 84 : 54, unitSize: big ? 34 : 26, max: IMG_X1 - IMG_X0 - 90 - kw });
      y += big ? 14 : 26;
    }
    if (tickets.length) {
      const list = tickets.slice(0, IMG_MAX_TICKETS);
      const gap = 8;
      const w = (IMG_X1 - IMG_X0 - 60 - gap * (list.length - 1)) / list.length;
      const base = y + 86;
      g.save();
      g.setLineDash([6, 5]);
      g.strokeStyle = c.rule;
      list.forEach((t, i) => {
        const h = t.h ? 30 + 44 * t.h : 64;
        const x = IMG_X0 + 30 + i * (w + gap);
        g.strokeRect(x, base - h, w, h);
        g.fillStyle = tickets.length <= 6 ? c.ink : c.muted;
        imgText(g, tickets.length <= 6 ? fmt(t.amount, 0) : String(i + 1), x + w / 2, base - h / 2 + 7, { size: 20, max: w - 8, align: 'center' });
      });
      g.restore();
      y = base + 10;
    }
    g.strokeStyle = c.rule;
    imgDash(g, y + 6);
    for (const [k, v] of spec.rows) {
      y += 52;
      imgRow(g, c, k, v, y);
    }
    for (const note of spec.notes) {
      y += 40;
      g.fillStyle = c.ink;
      imgText(g, note, IMG_W / 2, y, { w: 700, size: 22, align: 'center' });
    }
  }, true);
}

/** 割引：値札（元の値段に取り消し線・大きな割引後の値段・赤い丸の「○％OFF」シール） */
export function imgTag({ was, price, rate, save, conv }) {
  return imgPaper(640, (g, c, top) => {
    const x0 = IMG_X0 + 50;
    const x1 = IMG_X1 - 50;
    const y0 = top + 70;
    const y1 = y0 + 400;
    // 値札（左の角を落として、ひもの穴）
    g.beginPath();
    g.moveTo(x0 + 40, y0);
    g.lineTo(x1, y0);
    g.lineTo(x1, y1);
    g.lineTo(x0 + 40, y1);
    g.lineTo(x0, y1 - 40);
    g.lineTo(x0, y0 + 40);
    g.closePath();
    g.fillStyle = '#fff';
    g.fill();
    g.strokeStyle = c.ink;
    g.lineWidth = 3;
    g.stroke();
    g.beginPath();
    g.arc(x0 + 34, (y0 + y1) / 2, 11, 0, Math.PI * 2);
    g.lineWidth = 2;
    g.stroke();
    g.beginPath();
    g.moveTo(x0 + 26, (y0 + y1) / 2 - 6);
    g.quadraticCurveTo(x0 - 30, y0 - 10, x0 - 20, y0 - 30);
    g.stroke();
    // 元の値段（取り消し線）
    const cx = (x0 + 60 + x1) / 2;
    g.fillStyle = c.muted;
    g.font = imgFont(700, 28);
    const lw = g.measureText('元の値段 ').width;
    const pw = g.measureText(was).width;
    const sx0 = cx - 30 - (lw + pw) / 2;
    g.textAlign = 'left';
    g.fillText('元の値段 ', sx0, y0 + 80);
    g.fillText(was, sx0 + lw, y0 + 80);
    g.strokeStyle = c.muted;
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(sx0 + lw - 4, y0 + 70);
    g.lineTo(sx0 + lw + pw + 4, y0 + 70);
    g.stroke();
    // 大きな割引後の値段
    imgBigNum(g, c, price, '円', cx, y0 + 230, { size: 110, unitSize: 40, align: 'center', max: x1 - x0 - 110 });
    g.fillStyle = c.ink;
    imgText(g, save, cx, y0 + 300, { w: 800, size: 30, max: x1 - x0 - 110, align: 'center' });
    if (conv) {
      g.fillStyle = c.muted;
      imgText(g, conv, cx, y0 + 350, { w: 700, size: 24, max: x1 - x0 - 110, align: 'center' });
    }
    // 赤い丸のシール
    if (rate) {
      const sx = x1 - 20;
      const sy = y0 + 10;
      g.beginPath();
      g.arc(sx, sy, 66, 0, Math.PI * 2);
      g.fillStyle = c.red;
      g.fill();
      g.fillStyle = '#fff';
      imgText(g, rate, sx, sy + 4, { w: 800, size: 38, max: 112, align: 'center' });
      imgText(g, 'OFF', sx, sy + 38, { w: 800, size: 24, max: 100, align: 'center' });
    }
  });
}

/** パーセント：方眼の100マス（割合の分を赤でぬる）と、大きな答え、「200の15％は30」の1行 */
export function imgGrid({ cap, num, unit, pct, say }) {
  return imgPaper(800, (g, c, top) => {
    g.fillStyle = c.ink;
    imgText(g, cap, IMG_W / 2, top + 60, { w: 700, size: 26, align: 'center' });
    imgBigNum(g, c, num, unit, IMG_W / 2, top + 150, { size: 90, unitSize: 40, align: 'center' });
    const size = 340;
    const cell = size / 10;
    const gx = (IMG_W - size) / 2;
    const gy = top + 190;
    const p = Math.min(100, Math.max(0, pct));
    g.fillStyle = c.red;
    g.globalAlpha = 0.85;
    for (let i = 0; i < 100; i++) {
      const fill = Math.min(1, Math.max(0, p - i));
      if (fill <= 0) break;
      g.fillRect(gx + (i % 10) * cell, gy + Math.floor(i / 10) * cell, cell * fill, cell);
    }
    g.globalAlpha = 1;
    g.strokeStyle = c.rule;
    g.lineWidth = 1.5;
    for (let i = 0; i <= 10; i++) {
      g.beginPath();
      g.moveTo(gx + i * cell, gy);
      g.lineTo(gx + i * cell, gy + size);
      g.moveTo(gx, gy + i * cell);
      g.lineTo(gx + size, gy + i * cell);
      g.stroke();
    }
    g.strokeStyle = c.ink;
    g.lineWidth = 2;
    g.strokeRect(gx, gy, size, size);
    g.fillStyle = c.ink;
    imgText(g, say, IMG_W / 2, gy + size + 56, { w: 800, size: 28, align: 'center' });
  });
}

/** 日数：日めくり（おわりの日）と大きな「◯日後」 */
export function imgCal({ start, ym, d, w, wColor, num, unit }) {
  return imgPaper(800, (g, c, top) => {
    g.fillStyle = c.ink;
    imgText(g, start, IMG_W / 2, top + 60, { w: 700, size: 26, align: 'center' });
    imgBigNum(g, c, num, unit, IMG_W / 2, top + 150, { size: 84, unitSize: 36, align: 'center' });
    const cw = 300;
    const cx0 = (IMG_W - cw) / 2;
    const cy0 = top + 200;
    const ch = 360;
    g.fillStyle = '#fff';
    g.fillRect(cx0, cy0, cw, ch);
    g.strokeStyle = c.ink;
    g.lineWidth = 3;
    g.strokeRect(cx0, cy0, cw, ch);
    g.fillStyle = c.ink;
    g.fillRect(cx0, cy0, cw, 64);
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(cx0 + 40 + i * 44, cy0 + 14, 5, 0, Math.PI * 2);
      g.fillStyle = '#fff';
      g.fill();
    }
    g.fillStyle = '#fff';
    imgText(g, ym, IMG_W / 2, cy0 + 52, { w: 800, size: 26, max: cw - 30, align: 'center' });
    g.fillStyle = wColor === 'sun' ? c.red : wColor === 'sat' ? '#2b62b8' : c.ink;
    imgText(g, d, IMG_W / 2, cy0 + 240, { w: 800, size: 160, max: cw - 30, align: 'center' });
    imgText(g, w, IMG_W / 2, cy0 + 318, { w: 800, size: 34, max: cw - 30, align: 'center' });
  });
}

/** 年齢：干支の輪（生まれ年の干支に赤い丸）と大きな満年齢 */
export function imgEto({ names, index, kanji, age, say }) {
  return imgPaper(820, (g, c, top) => {
    const cx = IMG_W / 2;
    const cy = top + 220;
    const r = 150;
    g.strokeStyle = c.rule;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    names.forEach((name, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      g.beginPath();
      g.arc(x, y, 28, 0, Math.PI * 2);
      g.fillStyle = c.sheet;
      g.fill();
      if (i === index) {
        g.strokeStyle = c.red;
        g.lineWidth = 4;
        g.stroke();
      }
      g.fillStyle = i === index ? c.red : c.ink;
      imgText(g, name, x, y + 11, { w: 800, size: 30, max: 50, align: 'center' });
    });
    g.fillStyle = c.ink;
    imgText(g, kanji, cx, cy + 34, { w: 800, size: 96, max: 200, align: 'center' });
    g.fillStyle = c.ink;
    imgText(g, '満年齢', cx, cy + r + 90, { w: 700, size: 26, align: 'center' });
    imgBigNum(g, c, age, '歳', cx, cy + r + 190, { size: 96, unitSize: 40, align: 'center' });
    g.fillStyle = c.ink;
    imgText(g, say, cx, cy + r + 250, { w: 700, size: 26, align: 'center' });
  });
}

/** 時間の計算：時間の帯（行ごとに色を分け、1時間ごとの目もり）と大きな合計。segs：[{ m：分, n：行の番号 }] */
export function imgBar({ text, segs, span, step, max }) {
  return imgPaper(560, (g, c, top) => {
    g.fillStyle = c.ink;
    imgText(g, '合計', IMG_W / 2, top + 60, { w: 700, size: 26, align: 'center' });
    imgBigNum(g, c, text, '', IMG_W / 2, top + 160, { size: 84, align: 'center' });
    const x0 = IMG_X0 + 40;
    const x1 = IMG_X1 - 40;
    const y0 = top + 220;
    const h = 64;
    let x = x0;
    segs.forEach((sg, k) => {
      const w = ((x1 - x0) * sg.m) / span;
      g.fillStyle = k % 2 ? '#d98a90' : c.red;
      g.fillRect(x, y0, w, h);
      if (sg.m >= span / 12) {
        g.fillStyle = '#fff';
        imgText(g, String(sg.n), x + w / 2, y0 + h / 2 + 9, { size: 24, max: w - 6, align: 'center' });
      }
      x += w;
    });
    g.strokeStyle = c.ink;
    g.lineWidth = 1.5;
    const n = span / 60 / step;
    for (let i = 1; i < n; i++) {
      const tx = x0 + ((x1 - x0) * i) / n;
      g.beginPath();
      g.moveTo(tx, y0 + (i % (step === 1 && span > 360 ? 6 : 1) ? h * 0.6 : h * 0.3));
      g.lineTo(tx, y0 + h);
      g.stroke();
    }
    g.lineWidth = 2;
    g.strokeRect(x0, y0, x1 - x0, h);
    g.fillStyle = c.muted;
    imgText(g, '0', x0, y0 + h + 34, { w: 700, size: 22, align: 'left' });
    imgText(g, max, x1, y0 + h + 34, { w: 700, size: 22, align: 'right' });
  });
}

/** 実質単価：いちばんおトクの値札と、安い順の順位と棒 */
export function imgRank({ head, price, sub, rows }) {
  const H = 560 + rows.length * 64;
  return imgPaper(H, (g, c, top) => {
    const x0 = IMG_X0 + 50;
    const x1 = IMG_X1 - 50;
    const y0 = top + 40;
    g.fillStyle = '#fff';
    g.fillRect(x0, y0, x1 - x0, 300);
    g.strokeStyle = c.ink;
    g.lineWidth = 3;
    g.strokeRect(x0, y0, x1 - x0, 300);
    g.fillStyle = c.ink;
    imgText(g, head, IMG_W / 2, y0 + 60, { w: 800, size: 28, max: x1 - x0 - 40, align: 'center' });
    imgBigNum(g, c, price, '円', IMG_W / 2, y0 + 190, { size: 100, unitSize: 40, align: 'center', max: x1 - x0 - 40 });
    g.fillStyle = c.muted;
    imgText(g, sub, IMG_W / 2, y0 + 250, { w: 700, size: 24, max: x1 - x0 - 40, align: 'center' });
    let y = y0 + 300 + 70;
    const bx0 = IMG_X0 + 150;
    const bx1 = IMG_X1 - 170;
    const maxPer = Math.max(...rows.map((r) => r.per));
    rows.forEach((r) => {
      g.fillStyle = r.best ? c.red : c.ink;
      imgText(g, `${r.no}位 ${r.k}`, IMG_X0 + 30, y, { w: 800, size: 26, max: 110 });
      g.fillStyle = r.best ? c.red : c.rule;
      g.fillRect(bx0, y - 24, Math.max(6, ((bx1 - bx0) * r.per) / maxPer), 26);
      g.fillStyle = r.best ? c.red : c.ink;
      imgText(g, r.v, IMG_X1 - 30, y, { w: 800, size: 24, max: 150, align: 'right' });
      y += 64;
    });
  });
}

/** 希釈率：ボトル（下に原液・上に水）と、できあがり・原液・水の量。share は原液の割合、conc・water・total は書く字 */
export function imgBottle({ label, share, conc, water, total, concName, ratio, concColor }) {
  return imgPaper(790, (g, c, top) => {
    const bx = IMG_X0 + 70;
    const bw = 190;
    const by = top + 180;
    const bh = 380;
    // キャップと首
    g.fillStyle = c.ink;
    g.fillRect(bx + bw / 2 - 34, top + 70, 68, 50);
    g.strokeStyle = c.ink;
    g.lineWidth = 3;
    g.strokeRect(bx + bw / 2 - 26, top + 120, 52, 60);
    // 中身（原液がとても少なくても見えるように少しだけ高さをつける）
    const full = bh * 0.82;
    const ch = Math.min(full, Math.max(full * share, share > 0 ? 18 : 0));
    g.fillStyle = '#cfe6f7';
    g.fillRect(bx, by + bh - full, bw, full - ch);
    g.fillStyle = concColor;
    g.fillRect(bx, by + bh - ch, bw, ch);
    g.strokeRect(bx, by, bw, bh);
    // ラベル
    g.fillStyle = '#fff';
    g.fillRect(bx + 20, by + 70, bw - 40, 80);
    g.strokeStyle = c.ink;
    g.lineWidth = 2;
    g.strokeRect(bx + 20, by + 70, bw - 40, 80);
    g.fillStyle = c.ink;
    imgText(g, label, bx + bw / 2, by + 124, { w: 800, size: 36, max: bw - 56, align: 'center' });
    // 量
    const tx = bx + bw + 50;
    const rows = [['できあがり', total], [concName, conc], ['水', water]];
    rows.forEach(([k, v], i) => {
      const y = top + 200 + i * 120;
      g.fillStyle = c.ink;
      imgText(g, k, tx, y, { w: 700, size: 26, max: IMG_X1 - tx - 30 });
      imgBigNum(g, c, v, '', IMG_X1 - 30, y + 62, { size: 56, max: IMG_X1 - tx - 30 });
    });
    g.fillStyle = c.ink;
    imgText(g, ratio, IMG_W / 2, by + bh + 50, { w: 700, size: 24, align: 'center' });
  });
}

/** 画像を作って、共有の画面（LINE など）に出す。共有できない端末では画像を保存する。'share' か 'save' を返す */
export function imgShare(canvas, name) {
  // ボタンを押したその場で共有の画面を出せるように、画像は同じ流れの中で作る（待たない）
  const url = canvas.toDataURL('image/png');
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
