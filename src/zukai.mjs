// 図解の部品（10/28 しょーくん「図解の式最高じゃん」「文じゃなくて図や絵で、誰でも理解できるを徹底」。#70）
//   絵の式 stair()：入れる数字の「もの」 → 赤ペンの矢印と計算 → 答えの「もの」を、階段（縦）に並べる。答えは赤
//   帯の図 band()：もとの量を1本の帯にして、答えの分かれ方を見せる。下に目もり、その下に答えの1行（答えに赤ペンの丸）
// 字と数字は HTML の文字で書く（画像に焼きこまない）。絵は figure にして、figcaption にいまの式を文で残す（検索のため）
import { esc } from './layout.mjs';

// 赤ペンの曲がった矢印（線のゆれは線の形に）
const ARROW = '<svg width="34" height="40" viewBox="0 0 34 40" aria-hidden="true"><path d="M6 3 C 8 18, 16 28, 28 34 M18 35 L29 35 L25 25" fill="none" stroke="#c8323c" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// もの：値札・レシート・日めくり・券・箱（label は小さな字、value は大きな字。ans で答えの赤）
const val = (value, ans) => (ans ? `<em>${value}</em>` : value);
export const zTag = (label, value, ans = false) => `<div class="fz-tag"><small>${esc(label)}</small>${val(value, ans)}</div>`;
export const zReceipt = (label, value, ans = false) => `<div class="fz-rc"><small>${esc(label)}</small>${val(value, ans)}</div>`;
export const zBox = (label, value, ans = false) => `<div class="fz-box"><small>${esc(label)}</small>${val(value, ans)}</div>`;
// calm：弔事（四十九日）の日めくり。紺の頭で、答えも赤ペンにせず大きな紺の字（#83）
export const zCal = (ym, d, w, ans = false, calm = false) => `<div class="${calm ? 'fz-cal fz-calm' : 'fz-cal'}"><span class="fz-ym">${esc(ym)}</span><b${ans && !calm ? ' class="fz-red"' : ''}>${d}</b><span>${esc(w)}</span></div>`;
export const zTks = (values) => `<div class="fz-tks">${values.map((v) => `<span class="fz-tk"><em>${v}</em></span>`).join('')}</div>`;
export const zTickets = (value, n) => zTks(Array.from({ length: n }, () => value));

// 絵の式。cap は figcaption に入れる式の文（いくつでも。1つ1行）
export const stair = (from, op, to, cap = [], note = '') => `<figure class="fzf"><div class="fz">${from}<div class="fz-op">${ARROW}<b>${op.b}</b>${op.small ? `<small>${esc(op.small)}</small>` : ''}</div>${to}</div>${note ? `<p class="fz-note">${note}</p>` : ''}${cap.length ? `<figcaption class="fz-cap">${cap.map((c) => `<span>${esc(c)}</span>`).join('')}</figcaption>` : ''}</figure>`;

// 帯の図。parts: [{ w: 幅の％, text, kind: 'pay'（うすい青）| 'off'（赤い斜線）| 'alt'（白） }]、
// ruler: [[位置の％, 字, 赤か]]、ans: 答えの1行の HTML（答えは <b>）、label: 絵を言葉で（aria-label）
let hatchN = 0;
const hatch = () => {
  hatchN += 1;
  const id = `fzh${hatchN}`;
  return `<svg aria-hidden="true" preserveAspectRatio="none"><defs><pattern id="${id}" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="9" stroke="#c8323c" stroke-width="2" opacity=".55"/></pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
};
export const band = ({ head = '', parts, ruler = [], ans = '', label = '' }) => `<figure class="fz2"${label ? ` role="img" aria-label="${esc(label)}"` : ''}>${head ? `<div class="fz2-row"><span>${head}</span></div>` : ''}<div class="fz2-bar">${parts
  .map((p) => `<div class="${{ pay: 'fz2-pay', off: 'fz2-off', alt: 'fz2-alt' }[p.kind || 'pay']}" style="width:${p.w}%">${p.kind === 'off' ? hatch() : ''}${p.text ? `<span>${p.text}</span>` : ''}</div>`)
  .join('')}</div>${ruler.length ? `<div class="fz2-ruler">${ruler.map(([x, t, red]) => `<span style="left:${x}%"${red ? ' class="fz-red"' : ''}>${t}</span>`).join('')}</div>` : ''}${ans ? `<p class="fz2-ans">${ans}</p>` : ''}</figure>`;

// 100マス（パーセント）：n マスを赤ペンでぬる。SVG だけの絵なので role="img" と aria-label に言葉で
export const hyakuMasu = (n, label) => {
  const s = 22;
  const cells = Array.from({ length: 100 }, (_, i) => {
    const x = (i % 10) * s + 1;
    const y = Math.floor(i / 10) * s + 1;
    return `<rect x="${x}" y="${y}" width="${s - 2}" height="${s - 2}"${i < n ? ' class="on"' : ''}/>`;
  }).join('');
  return `<svg class="fz-masu" viewBox="0 0 ${s * 10} ${s * 10}" role="img" aria-label="${esc(label)}">${cells}</svg>`;
};
