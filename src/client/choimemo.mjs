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
      q.append(name);
    }
    q.append(m.q);
    const a = document.createElement('b');
    a.textContent = m.a;
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

/**
 * 計算のページのちょいメモと画像で送る。返す関数に、いまの結果を渡す（答えが出ていないときは null）
 * entry：{ q：入れた数字の1行, a：答え, img：画像の canvas を作る関数 }
 */
export function choiMemo(file) {
  const bar = document.getElementById('cm-bar');
  const box = document.getElementById('cm');
  if (!bar || !box || !cmUsable()) return () => {};
  const add = document.getElementById('cm-add');
  const send = document.getElementById('cm-share');
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
  send.addEventListener('click', () => {
    if (!cur) return;
    if (imgShare(cur.img(), file) === 'save') cmFlash(send, '保存しました', '画像で送る');
  });
  return (entry) => {
    cur = entry || null;
    add.disabled = !cur;
    send.disabled = !cur;
  };
}
