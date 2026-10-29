// ちょいメモ：結果の下の「メモする」で、その計算の1行（入れた数字 → 答え）と日時を、この端末のブラウザ（localStorage）に保存する。どこにも送らない
// 「画像で送る」も同じ段（share-img.mjs で絵を描く）。保存できない端末（プライベートモードなど）では、ボタンの段とちょいメモを出さない
import { imgShare } from './share-img.mjs';

const CM_KEY = 'sakutto-choimemo';
const CM_MAX = 30; // ぜんぶで30枚まで（古いものから消える）
const CM_TOOL_SHOW = 4; // 計算のページに出す枚数

/** 保存できる端末か（読み書きはすべて try/catch） */
export function cmUsable() {
  try {
    const k = `${CM_KEY}-t`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

/** 保存したメモ（新しい順）。形のおかしいものは捨てる */
function cmLoad() {
  try {
    const list = JSON.parse(localStorage.getItem(CM_KEY) || '[]');
    if (!Array.isArray(list)) return [];
    return list.filter((m) => m && typeof m.t === 'string' && typeof m.q === 'string' && typeof m.a === 'string' && typeof m.d === 'number');
  } catch {
    return [];
  }
}

function cmStore(list) {
  try {
    localStorage.setItem(CM_KEY, JSON.stringify(list.slice(0, CM_MAX)));
    return true;
  } catch {
    return false;
  }
}

/** 日時「10/28 12:10」 */
function cmWhen(ms) {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 付箋の字は言葉のまん中で改行しない（CSS の keep-all）。改行してよいのは、数字や漢字のあとの「の・を・で・に」などと「・」「、」のあとだけ
const CM_BREAK = /([^ぁ-ゟ\s])(から|まで|より|には|では|との|への|の|を|で|に|は|と|が|へ|も)|[・、]/g;

/** text を el に入れる。改行してよい所に <wbr>（文字はそのまま入れるので HTML にならない） */
function cmWrap(el, text) {
  let at = 0;
  for (const m of text.matchAll(CM_BREAK)) {
    const end = m.index + m[0].length;
    if (end >= text.length) break;
    el.append(text.slice(at, end), document.createElement('wbr'));
    at = end;
  }
  el.append(text.slice(at));
}

/** 付箋を並べる。tool があればそのツールのメモだけ、なければ全ツールのメモ（1行の頭にツールの短い名前） */
export function cmDraw(box, tool, max) {
  const list = cmLoad().filter((m) => !tool || m.t === tool).slice(0, max);
  box.hidden = !list.length;
  const ul = box.querySelector('ul');
  ul.textContent = '';
  for (const m of list) {
    const li = document.createElement('li');
    const when = document.createElement('small');
    when.textContent = cmWhen(m.d);
    const q = document.createElement('span');
    if (!tool && m.n) {
      const name = document.createElement('i');
      name.textContent = m.n;
      q.append(name, document.createElement('wbr'));
    }
    cmWrap(q, m.q);
    const a = document.createElement('b');
    cmWrap(a, m.a);
    const x = document.createElement('button');
    x.type = 'button';
    x.className = 'x';
    x.textContent = '消す';
    x.addEventListener('click', () => {
      cmStore(cmLoad().filter((o) => o.d !== m.d));
      cmDraw(box, tool, max);
    });
    li.append(when, q, a, x);
    ul.append(li);
  }
}

/** 一時的にボタンの文字をかえる（2秒） */
function cmFlash(btn, text, back) {
  btn.textContent = text;
  clearTimeout(btn.cmTimer);
  btn.cmTimer = setTimeout(() => { btn.textContent = back; }, 2000);
}

/** 「メモする」の段とちょいメモを動かす（choiMemo と memoOnly で共通）。返すのは { tool, set(entry), cur() } */
function cmBar(bar, box) {
  const add = document.getElementById('cm-add');
  const tool = bar.dataset.tool;
  let cur = null;
  bar.hidden = false;
  cmDraw(box, tool, CM_TOOL_SHOW);
  add.addEventListener('click', () => {
    if (!cur) return;
    const list = cmLoad();
    const top = list.find((m) => m.t === tool);
    if (!top || top.q !== cur.q || top.a !== cur.a) {
      const d = Math.max(Date.now(), ...list.map((m) => m.d + 1));
      cmStore([{ t: tool, n: bar.dataset.name, q: cur.q, a: cur.a, d }, ...list]);
      cmDraw(box, tool, CM_TOOL_SHOW);
    }
    cmFlash(add, 'メモしました', 'メモする');
  });
  return {
    set: (entry) => {
      cur = entry || null;
      add.disabled = !cur;
    },
    cur: () => cur,
  };
}

/** 「メモする」だけのページ（画像で送るなし）。返す関数に { q, a } か null を渡す */
export function memoOnly() {
  const bar = document.getElementById('cm-bar');
  const box = document.getElementById('cm-list');
  if (!bar || !box || !cmUsable()) return () => {};
  return cmBar(bar, box).set;
}

/**
 * 計算のページのちょいメモと画像で送る。返す関数に、いまの結果を渡す（答えが出ていないときは null）
 * entry：{ q：入れた数字の1行, a：答え, img：画像の canvas を作る関数 }
 */
export function choiMemo(file) {
  const bar = document.getElementById('cm-bar');
  const box = document.getElementById('cm-list');
  if (!bar || !box || !cmUsable()) return () => {};
  const send = document.getElementById('cm-share');
  const m = cmBar(bar, box);
  send.addEventListener('click', () => {
    const cur = m.cur();
    if (!cur) return;
    if (imgShare(cur.img(), file) === 'save') cmFlash(send, '保存しました', '画像で送る');
  });
  return (entry) => {
    m.set(entry);
    send.disabled = !entry;
  };
}

/** 日付の欄の値（2026-10-29）を「2026年10月29日」に */
export const cmYmd = (v) => String(v).replace(/^(\d+)-0?(\d+)-0?(\d+)$/, '$1年$2月$3日');
