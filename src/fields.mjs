// 計算カードの入力欄の部品（FX・利益率で共通）

const num = (id, placeholder, value = '', hint = '') =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"${value ? ` value="${value}"` : ''}${hint ? ` data-hint="${hint}"` : ''}>`;

/**
 * 名前を欄の中に書いた入力欄（口座のお金・売値など）。会社で違う数字（ロスカットの基準）は value にはじめの値を入れる
 * hint：名前だけでは何を入れるか迷う欄の1行の説明。さわっている間だけ、入力の段の下に出す（src/client/ui.mjs の focusHints）
 */
export const boxField = (id, label, unit, placeholder, value = '', hint = '') =>
  `<div class="field box-field" id="f-${id}"><label for="${id}">${label}</label><div class="input">${num(id, placeholder, value, hint)}${unit ? `<span class="unit">${unit}</span>` : ''}</div></div>`;
