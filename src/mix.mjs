// 希釈の計算カードの部品（希釈率の計算と、使いみち別のページ「めんつゆ・漂白剤・液体肥料」で使う）
// 動きは src/client/kishaku.js。ページごとのちがいは #calc の data-* で渡す

export const numInput = (id, placeholder, value = '') =>
  `<input id="${id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="${placeholder}"${value ? ` value="${value}"` : ''}>`;

// 量の欄（できあがり・原液・水）：わかっている欄に1つ入れると、ほかの2つに答えが出る
const amountField = (key, cls, label) =>
  `<div class="field mix-field ${cls}" id="f-${key}"><label for="v-${key}">${label}</label><div class="input">${numInput(`v-${key}`, '？')}<span class="unit">ml</span></div></div>`;

/**
 * 大きなマスの列。items：{ key: 'ratio' か 'target', value, big, small, long }
 * custom：最後のマス（自分で入れる）。{ id, pre, post, label }
 */
export const mixTiles = (labelId, items, custom, cls = 'tiles tiles-4') =>
  `<div class="${cls}" role="group" aria-labelledby="${labelId}">${items
    .map(
      (t) =>
        `<button type="button" class="tile${t.long ? ' tile-long' : ''}" data-${t.key}="${t.value}" aria-pressed="false"><b>${t.big}</b><small>${t.small}</small></button>`,
    )
    .join('')}<div class="tile tile-input" id="f-${custom.id}"><div class="tile-box">${custom.pre ? `<span>${custom.pre}</span>` : ''}<input id="${custom.id}" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" placeholder="?" aria-describedby="${labelId}">${custom.post ? `<span>${custom.post}</span>` : ''}</div><label for="${custom.id}">${custom.label}</label></div></div>`;

/** ボトルの絵と、できあがり・原液・水の欄。conc は原液の呼び名（つゆ・漂白剤など） */
export const mixStage = ({ conc = '原液', label = '？倍', hint = '', cls = '' } = {}) => `
  <div class="mix-stage${cls ? ` ${cls}` : ''}" role="group" aria-label="できあがり・${conc}・水の量（わかっている量を1つ入れる）">
    <div class="bottle" aria-hidden="true">
      <div class="bottle-cap"></div>
      <div class="bottle-neck"></div>
      <div class="bottle-body">
        <div class="liq liq-water" id="b-water"></div>
        <div class="liq liq-conc" id="b-conc"></div>
        <p class="bottle-label" id="b-label">${label}</p>
      </div>
    </div>
    <div class="mix-rows">
      ${amountField('total', 'is-total', 'できあがり')}
      ${amountField('conc', 'is-conc', conc)}
      ${amountField('water', 'is-water', '水')}
    </div>
    <p class="mix-foot" aria-live="polite"><span id="r-ratio">${hint}</span><span id="r-hints"></span><span class="sr-only" id="r-sr"></span></p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>`;
