import { tzRead } from '../lib/tsuzuki.mjs';

// つづけて使う（#163）：数字を URL の # で次の計算へ渡す・受けとる。この端末の中だけで、どこにも送らない

/** 受けとる側：ページのはじめに # を読み、合っていればすぐ消して値を返す（合わなければ何もしないで null） */
export function tzTake(spec) {
  const got = tzRead(location.hash, spec);
  if (!got) return null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* 何もしない */ }
  return got;
}

/** ページのスクリプトがぜんぶ動いてから入れる（付箋の動き notes.js があとから読まれるので） */
export function tzLater(fn) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

/** 欄に入れて、手で入れたときと同じ入力のイベントを起こす */
export function tzFill(el, text) {
  el.value = text;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * 送る側：「つづけて使う」の行を書きかえる。rows は { 行のid: { hash, text } | null }
 * null の行は理由の文（data-why）とリンクだけにもどす。数字は赤ペン（.tz-num）
 */
export function tzRows(rows) {
  for (const [id, row] of Object.entries(rows)) {
    const a = document.getElementById(id);
    if (!a) continue;
    const t = a.querySelector('.tz-t');
    a.href = a.dataset.base + (row ? row.hash : '');
    a.classList.toggle('is-num', !!row);
    t.textContent = row ? '' : a.dataset.why;
    for (const [s, num] of row ? row.text : []) {
      if (!num) {
        t.append(s);
        continue;
      }
      const el = document.createElement('span');
      el.className = 'tz-num';
      el.textContent = s;
      t.append(el);
    }
  }
}
