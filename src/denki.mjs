// 電気代の計算カードの部品（電気代の計算と、家電別の電気代のページで共通）
// 動きは src/client/denki.js 1つで、ページごとのちがい（マス・家電の名前・まだ入れていないときの案内）は #calc の data-* で渡す
import { boxField } from './fields.mjs';
import { DENKI_PRICE } from './data/denki.mjs';
import { fmt } from './lib/number.mjs';
import { memoHtml } from './parts.mjs';
import { denki } from './lib/denki.mjs';
import { stair, band, zBox, zReceipt } from './zukai.mjs';

/**
 * 図解（#82）：電気代の絵の式。名前と消費電力 → 1日の時間と30日 → 1か月の電気代（お知らせの紙）。数字は tests/zukai-kurashi.test.mjs
 * 返すのは { stair, r }（r は計算の答え）
 */
export function denkiZukai(name, watt, hours) {
  const P = DENKI_PRICE.value;
  const r = denki({ watt, hours, price: P });
  const h = hours < 1 ? `${hours * 60}分` : `${hours}時間`;
  return {
    r,
    stair: stair(zBox(name, `${fmt(watt)}W`), { b: `×${h}×30日`, small: `1kWh ${P}円` }, zReceipt('1か月', `約${fmt(r.month, 0)}円`, true), ['1時間 ＝ 消費電力（W）÷ 1,000 × 単価', '1か月 ＝ 1時間 × 1日の時間 × 30日', `例：${fmt(watt)}Wの${name}を1日${h}、単価${P}円なら、${fmt(watt / 1000, 3)} × ${P} × ${hours} × 30 ＝ ${fmt(r.month, 0)}円。`], `1時間は約${fmt(r.hour, 1)}円・1日は <b class="fz-red">約${fmt(r.day, r.day < 100 ? 1 : 0)}円</b>`),
  };
}

/** 帯の図（#82）：強さごとの1か月の電気代を、いちばん高いものの長さでくらべる棒 */
export function denkiBars(name, modes, hours) {
  const P = DENKI_PRICE.value;
  const rows = modes.map((m) => ({ ...m, month: denki({ watt: m.watt, hours, price: P }).month }));
  const max = Math.max(...rows.map((m) => m.month));
  return rows
    .map((m, i) => band({ head: `${m.b} ${fmt(m.watt)}W・1か月 ${fmt(m.month, 0)}円`, parts: [{ w: Number(((m.month / max) * 100).toFixed(1)), text: '' }], ans: i === rows.length - 1 ? `${rows[0].b}で1日${hours}時間 → <b>1か月 約${fmt(rows[0].month, 0)}円</b>` : '', label: `${name}の${m.b}（${fmt(m.watt)}W）を1日${hours}時間使ったときの、1か月約${fmt(m.month, 0)}円の棒` }))
    .join('');
}

/** マスの下の小さな字：1時間の電気代の目安（単価は目安単価） */
export const hourYen = (watt) => `約${fmt((watt * DENKI_PRICE.value) / 1000, 1)}円/時`;

/**
 * 電気代の計算カード
 * @param {{tiles:Array<{b:string, small:string, watt:number}>, label:string, name?:string, empty:string, wattEx?:string, hoursEx?:string}} p
 *   tiles：マス（えらぶと消費電力の欄に watt が入る）　label：マスの組の読み上げの名前　name：家電の名前（結果の紙に出す）　empty：はじめの案内
 */
export function denkiCard({ tool, tiles, label, name = '', empty, wattEx = '600', hoursEx = '8' }) {
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
  ${memoHtml(tool)}
  <noscript><p class="tag-note is-error">このツールを使うには、JavaScriptを有効にしてください。</p></noscript>
</div>`;
}
