// 返礼品のページのデータを楽天から取って .henreihin/data.json に置く（GitHub Actions の公開の前に。HENREIHIN=api のとき）
// .henreihin/ は .gitignore に入っていて、リポジトリにも成果物にも残さない。ランナーが終われば消える（楽天ウェブサービスの規約 第10条9号）
// ログと注意書きには件数だけ。量が読めた件数が少なすぎる一覧があれば止める（空っぽのページを公開しない。前の公開がそのまま残る）
import { mkdirSync, writeFileSync } from 'node:fs';
import { HENREIHIN_CATS, HENREIHIN_PAGES } from '../src/data/henreihin.mjs';
import { hrPrepare } from '../src/lib/henreihin.mjs';
import { rakutenKeys, searchPage, note } from './rakuten.mjs';

const MIN_SHOWN = 5; // 1つの一覧に、量が読めた返礼品がこれより少なければ止める

const keys = rakutenKeys();
if (!keys) {
  note('error', '返礼品', '楽天のキー（RAKUTEN_APPLICATION_ID・RAKUTEN_ACCESS_KEY・RAKUTEN_AFFILIATE_ID）がありません');
  process.exit(1);
}

const groups = {};
const counts = [];
let short = 0;
for (const cat of HENREIHIN_CATS) {
  for (const g of cat.groups) {
    const items = [];
    for (let page = 1; page <= HENREIHIN_PAGES; page++) {
      const r = await searchPage(keys, { keyword: g.keyword, page, ngKeyword: g.ng, genreId: g.genreId });
      items.push(...r.items);
      if (page >= r.pageCount) break;
    }
    groups[g.key] = items;
    const shown = hrPrepare(items, g.unit).length;
    counts.push(`${g.name} ${items.length}件→${shown}件`);
    if (shown < MIN_SHOWN) short++;
  }
}

mkdirSync('.henreihin', { recursive: true });
writeFileSync('.henreihin/data.json', JSON.stringify({ fetchedAt: new Date().toISOString(), groups }));
note(short ? 'error' : 'notice', '返礼品', `楽天から取った件数→量が読めた件数：${counts.join('・')}`);
if (short) {
  note('error', '返礼品', `量が読めた返礼品が${MIN_SHOWN}件より少ない一覧があるので、公開を止めます`);
  process.exit(1);
}
