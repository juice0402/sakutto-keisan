// FX の計算カードの部品（証拠金維持率・ロスカット・スワップで共通）
// むずかしい言葉は使わない：証拠金 → 口座のお金、必要証拠金 → 取引に必要なお金、ロット → 通貨の量

import { FX_QTY_TILES, FX_PAIRS } from './lib/fx.mjs';
import { memoHtml } from './parts.mjs';

/** いちばん上の1段の通貨ペア（円がつくもの）。ほかの欄と同じく、名前を欄の中に書く */
const pairSelect = () =>
  `<div class="box-field sel-field"><label for="pair">通貨ペア</label><select id="pair" class="big-select">${FX_PAIRS.map((p) => `<option value="${p.id}">${p.name}</option>`).join('')}</select></div>`;

/** いちばん上の1段：通貨ペア・買いか売りか・クリア（ロスカット） */
export const fxTop = () =>
  `<div class="fx-top">${pairSelect()}<div class="seg seg-2" role="group" aria-label="買いか売りか"><button type="button" class="seg-btn" data-side="buy" aria-pressed="true">買い</button><button type="button" class="seg-btn" data-side="sell" aria-pressed="false">売り</button></div></div>`;

/** いちばん上の1段：通貨ペア・クリア（証拠金維持率。買いでも売りでも維持率は同じ） */
export const fxTopPair = () => `<div class="fx-top fx-top-pair">${pairSelect()}</div>`;

/** 通貨の量のマス：1,000通貨・1万通貨・10万通貨・その他（万通貨） */
export const qtyTiles = (labelId) =>
  `<div class="tiles tiles-4" role="group" aria-labelledby="${labelId}">${FX_QTY_TILES.map(
    (v) =>
      `<button type="button" class="tile" data-qty="${v}" aria-pressed="false"><b>${v >= 10000 ? `${v / 10000}万` : v.toLocaleString('ja-JP')}</b><small>通貨</small></button>`,
  ).join('')}<div class="tile tile-input" id="f-qty"><div class="tile-box"><input id="qty" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="?" aria-describedby="${labelId}"><span>万</span></div><label for="qty">その他</label></div></div>`;

export const noteAndNoscript = (tool) => `<p class="tag-note" id="r-note" hidden></p>
  ${memoHtml(tool, false)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>`;
