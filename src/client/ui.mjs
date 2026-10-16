// ツールページ共通のブラウザ用部品（ビルドで各ツールのスクリプトにまとめられる）
import { parseNum, fmt, fix } from '../lib/number.mjs';

export const $ = (id) => document.getElementById(id);

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
