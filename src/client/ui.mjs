// ツールページ共通のブラウザ用部品（ビルドで各ツールのスクリプトにまとめられる）
import { parseNum, fmt, fix } from '../lib/number.mjs';

export const $ = (id) => document.getElementById(id);

/**
 * 数字だけ入る入力欄にする（数字・小数点・カンマ以外は入れたそばに消す。全角の数字は半角に）
 * 日本語入力の変換中は待って、確定したときに整える。カーソルの位置はそのまま
 */
export function numericOnly(inputs) {
  const clean = (el) => {
    const before = el.value;
    const caret = el.selectionStart ?? before.length;
    let dot = false;
    let out = '';
    let pos = 0;
    for (let i = 0; i < before.length; i++) {
      let c = before[i];
      if (/[０-９]/.test(c)) c = String.fromCharCode(c.charCodeAt(0) - 0xfee0);
      else if (c === '．' || c === '。') c = '.';
      else if (c === '，') c = ',';
      const ok = /[0-9,]/.test(c) || (c === '.' && !dot);
      if (c === '.' && ok) dot = true;
      if (ok) out += c;
      if (ok && i < caret) pos++;
    }
    if (out !== before) {
      el.value = out;
      try { el.setSelectionRange(pos, pos); } catch { /* フォーカスがないときは何もしない */ }
    }
  };
  inputs.forEach((el) => {
    el.setAttribute('maxlength', '16');
    el.addEventListener('input', (e) => { if (!e.isComposing) clean(el); }, true);
    el.addEventListener('compositionend', () => {
      clean(el);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

/** 入力欄から離れたら、全角を半角に・値段は3桁区切りに整える（数字として読めるときだけ） */
export function tidyOnBlur(inputs, comma) {
  inputs.forEach((el) => {
    el.addEventListener('blur', () => {
      const v = parseNum(el.value);
      if (v === null || Number.isNaN(v)) return;
      const next = comma ? fmt(v, 10) : String(fix(v));
      if (next !== el.value) {
        el.value = next;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  });
}

/** 結果のコピー。成功したらボタンの文字を一瞬「コピーしました」にする */
export async function copyText(text, btn) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
  }
  if (btn) {
    const label = btn.dataset.label || btn.innerHTML;
    btn.dataset.label = label;
    btn.textContent = ok ? 'コピーしました' : 'コピーできませんでした';
    setTimeout(() => { btn.innerHTML = label; }, 1500);
  }
}

/** Enter キーで次の入力欄へ（最後の欄ではキーボードを閉じる） */
export function enterToNext(inputs) {
  inputs.forEach((el) => {
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      const visible = inputs.filter((x) => x.offsetParent !== null);
      const next = visible[visible.indexOf(el) + 1];
      if (next) next.focus();
      else el.blur();
    });
  });
}

/** 数字ボタン（chips）。押すと入力欄に値を入れて input イベントを出す */
export function bindChips(root = document) {
  root.querySelectorAll('.chips').forEach((box) => {
    const input = document.getElementById(box.dataset.target);
    const sync = () => {
      box.querySelectorAll('.chip').forEach((c) => {
        c.setAttribute('aria-pressed', String(c.dataset.value === input.value.trim()));
      });
    };
    box.addEventListener('click', (e) => {
      const c = e.target.closest('.chip');
      if (!c) return;
      input.value = c.dataset.value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    input.addEventListener('input', sync);
    sync();
  });
}
