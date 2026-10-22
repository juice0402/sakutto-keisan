// 電気代の計算カードの部品（電気代の計算と、家電別の電気代のページで共通）
// 動きは src/client/denki.js 1つで、ページごとのちがい（マス・家電の名前・まだ入れていないときの案内）は #calc の data-* で渡す
import { boxField } from './fields.mjs';
import { DENKI_PRICE } from './data/denki.mjs';
import { fmt } from './lib/number.mjs';

/** マスの下の小さな字：1時間の電気代の目安（単価は目安単価） */
export const hourYen = (watt) => `約${fmt((watt * DENKI_PRICE.value) / 1000, 1)}円/時`;

/**
 * 電気代の計算カード
 * @param {{tiles:Array<{b:string, small:string, watt:number}>, label:string, name?:string, empty:string, wattEx?:string, hoursEx?:string}} p
 *   tiles：マス（えらぶと消費電力の欄に watt が入る）　label：マスの組の読み上げの名前　name：家電の名前（結果の紙に出す）　empty：はじめの案内
 */
export function denkiCard({ tiles, label, name = '', empty, wattEx = '600', hoursEx = '8' }) {
  const P = String(DENKI_PRICE.value);
  return `<div class="calc" id="calc"${name ? ` data-name="${name}"` : ''} data-empty="${empty}">
  <div class="field" id="f-tiles"><div class="tiles${tiles.length === 2 ? ' tiles-2' : tiles.length === 4 ? ' tiles-4' : ''}" role="group" aria-label="${label}">${tiles
    .map((t) => `<button type="button" class="tile tile-word" data-watt="${t.watt}" aria-pressed="false"><b>${t.b}</b><small>${t.small}</small></button>`)
    .join('')}</div></div>
  <div class="box-rows">
    ${boxField('watt', '消費電力', 'W', wattEx, '', '家電のラベルや説明書の「消費電力」')}
    <div class="pair">${boxField('hours', '1日に使う時間', '時間', hoursEx)}${boxField('price', '1kWhの単価', '円', P, P, `電気料金の明細の単価。目安は${P}円`)}</div>
  </div>
  <div class="slip" aria-live="polite">
    <p class="slip-title"><span>電気代のお知らせ<small>目安</small></span><button type="button" class="clear-btn" id="clear">クリア</button></p>
    <div class="slip-meter" aria-hidden="true"><span>1か月の<br>使用量</span><span class="m-digits" id="m-digits"></span><span class="m-u">kWh</span></div>
    <p class="m-what" id="m-what"></p>
    <p class="slip-sum"><span class="slip-k" id="r-cap">1か月</span><span class="slip-v"><small>約</small><b id="r-num">？</b><small>円</small></span></p>
    <table class="slip-table"><thead><tr><th>1時間</th><th>1日</th><th>1年</th></tr></thead><tbody><tr><td id="d-hour">—</td><td id="d-day">—</td><td id="d-year">—</td></tr></tbody></table>
    <p class="slip-foot" id="r-foot">${empty}</p>
  </div>
  <p class="tag-note" id="r-note" hidden></p>
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>`;
}
