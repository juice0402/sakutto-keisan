// 家電別の電気代のページの節「この型番の値段と、この冬の電気代」（#172。楽天市場の商品検索で、ビルドのときに取ってHTMLにする）
// データは scripts/fetch-kaden.mjs が置く .kaden/data.json（.gitignore。コミットしない・成果物に上げない）。ないとき・0件の型番は節を出さない
// 楽天の決まり：リンクの近くに「広告」、リンクは affiliateUrl のまま rel="sponsored"、クレジットは楽天の指定のHTMLのまま。商品画像は使わない
// 「おすすめ」「お得」「最安」「いちばん安い」は書かない（値段は「◯円台から」と、リンクの店の値段だけ）
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { section, esc } from './layout.mjs';
import { band } from './zukai.mjs';
import { DENKI_PRICE } from './data/denki.mjs';
import { fmt } from './lib/number.mjs';
import { kdPick, kdPriceText, kdDay, kdWinter, kdElec, kdBand, kdDaysText, KD_LINKS } from './lib/kaden.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const KADEN_FILE = join(ROOT, '.kaden', 'data.json');
export const KD_AD = '<p class="kd-ad">広告　楽天アフィリエイトを利用しています</p>';
// 楽天ウェブサービスのクレジット（楽天の指定のHTML。1文字も変えない）
const CREDIT = `<!-- Rakuten Web Services Attribution Snippet FROM HERE -->
<a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a>
<!-- Rakuten Web Services Attribution Snippet TO HERE -->`;

/** 取ったデータ。ない・こわれているときは null（節を出さずにビルドを通す） */
export function loadKaden(file = KADEN_FILE) {
  if (!existsSync(file)) return null;
  try {
    const d = JSON.parse(readFileSync(file, 'utf8'));
    return d && typeof d.models === 'object' && d.fetchedAt ? d : null;
  } catch {
    return null;
  }
}

/** 節の HTML。0件の型番・データがないときは '' */
export function kadenSection(u, data, now = new Date()) {
  if (!data || !u.model) return '';
  const items = kdPick(data.models?.[u.model], u.model);
  if (!items.length) return '';
  const body = items[0].price;
  const m = u.modes[0];
  const P = DENKI_PRICE.value;
  const { days } = kdWinter(now);
  const elec = kdElec(m.watt, u.hours, P, days);
  const b = kdBand(body, elec);
  const head = `${m.b} ${fmt(m.watt)}W・1日${u.hours}時間`;
  const links = items
    .slice(0, KD_LINKS)
    .map((it) => `<li><a class="kd-go" href="${esc(it.url)}" rel="sponsored noopener">楽天市場で見る</a> ${esc(it.shop)}・${fmt(it.price)}円</li>`)
    .join('');
  return section(
    'kakaku',
    'この型番の値段と、この冬の電気代',
    `<p>${esc(u.maker)} ${esc(u.model)}：楽天市場で${kdPriceText(body)}（${kdDay(data.fetchedAt)}時点）</p>
<div id="kd" data-body="${body}" data-watt="${m.watt}" data-hours="${u.hours}" data-price="${P}" data-b="${esc(m.b)}">${band({ head: `<span id="kd-head">${head}</span>`, parts: b.parts, ruler: [[0, '0'], [100, `約${fmt(b.total)}円`]], ans: b.ans, label: `本体の値段と、この冬の電気代をつないだ帯` })}</div>
<p class="note" id="kd-days">${kdDaysText(days)}</p>
<p>電気代は上の計算の入力で変わります。まだ入れていないときは、${head}・1kWh ${P}円で出しています。値段は送料をふくまないことがあり、店や日で変わります。</p>
${KD_AD}
<ul class="kd-list">${links}</ul>
<p class="kd-credit">${CREDIT}</p>`,
  );
}
