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
