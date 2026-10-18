// FX の計算カードの部品（証拠金維持率・追証・スワップで共通）
// むずかしい言葉は使わない：証拠金 → 口座のお金、必要証拠金 → 取引に必要なお金、ロット → 通貨の量

import { FX_QTY_TILES } from './lib/fx.mjs';

const num = (id, placeholder, value = '') =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"${value ? ` value="${value}"` : ''}>`;

/** 名前を欄の中に書いた入力欄（口座のお金・いまのレートなど）。会社で違う数字（ロスカットの基準）は value にはじめの値を入れる */
export const boxField = (id, label, unit, placeholder, value = '') =>
  `<div class="field box-field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${num(id, placeholder, value)}<span class="unit">${unit}</span></div></div>`;

/** 見出しとクリア */
export const fxHead = (labelId, label) =>
  `<div class="field-head calc-head"><p class="label" id="${labelId}">${label}</p><button type="button" class="clear-btn" id="clear">クリア</button></div>`;

/** 通貨の量のマス：1,000通貨・1万通貨・10万通貨・その他（万通貨） */
export const qtyTiles = (labelId) =>
  `<div class="tiles tiles-4" role="group" aria-labelledby="${labelId}">${FX_QTY_TILES.map(
    (v) =>
      `<button type="button" class="tile" data-qty="${v}" aria-pressed="false"><b>${v >= 10000 ? `${v / 10000}万` : v.toLocaleString('ja-JP')}</b><small>通貨</small></button>`,
  ).join('')}<div class="tile tile-input" id="f-qty"><div class="tile-box"><input id="qty" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="?" aria-describedby="${labelId}"><span>万</span></div><label for="qty">その他</label></div></div>`;

export const noteAndNoscript = `<p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>`;
