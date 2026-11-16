// 家電別の電気代のページの型番の値段を、楽天市場の商品検索で取って .kaden/data.json に置く（GitHub Actions の公開の前に。#172）
// 鍵・API・呼ぶ間隔は返礼品と同じ（scripts/rakuten.mjs。同じ楽天のアプリ）。型番ごとに1回ずつ（5回）
// .kaden/ は .gitignore に入っていて、リポジトリにも成果物にも残さない（楽天ウェブサービスの規約 第10条9号）。ログには型番ごとの件数だけ
// キーがない・取れなかった日は、その型番の節を出さずにビルドを通す（止めない・見張りの issue にもしない）
import { mkdirSync, writeFileSync } from 'node:fs';
import { DENKI_USES } from '../src/data/denki.mjs';
import { kdPick } from '../src/lib/kaden.mjs';
import { rakutenKeys, searchPage, note } from './rakuten.mjs';

const keys = rakutenKeys();
if (!keys) {
  note('notice', '家電の値段', '楽天のキーがないので取りません（型番の値段の節は出ません）');
  process.exit(0);
}

const models = {};
const counts = [];
for (const u of DENKI_USES) {
  if (!u.model) continue;
  try {
    const r = await searchPage(keys, { keyword: u.model, sort: 'standard' });
    models[u.model] = r.items;
    counts.push(`${u.model} ${r.items.length}件→${kdPick(r.items, u.model).length}件`);
  } catch {
    counts.push(`${u.model} 取れなかった`);
  }
}

mkdirSync('.kaden', { recursive: true });
writeFileSync('.kaden/data.json', JSON.stringify({ fetchedAt: new Date().toISOString(), models }));
note('notice', '家電の値段', `楽天から取った件数→型番が合った件数：${counts.join('・')}`);
