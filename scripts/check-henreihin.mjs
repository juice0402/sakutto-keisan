// 楽天のキーが入った日に1回：返礼品が楽天の商品検索で取れるかを確かめる（.github/workflows/henreihin-check.yml から手で動かす）
// 商品の名前や値段はログに出さない。出すのは件数・ふるさと納税の店（f＋自治体コード）の割合・多いジャンルID・量が読めた件数だけ
// ジャンルIDは楽天の分類の番号で、src/data/henreihin.mjs の genreId に入れると、ほかの物が混ざりにくくなる
import { HENREIHIN_CATS } from '../src/data/henreihin.mjs';
import { hrPrepare } from '../src/lib/henreihin.mjs';
import { rakutenKeys, searchPage, note } from './rakuten.mjs';

const keys = rakutenKeys();
if (!keys) {
  note('error', '返礼品の確認', '楽天のキーがありません（GitHub の Secrets に3つ）');
  process.exit(1);
}

let bad = 0;
for (const cat of HENREIHIN_CATS) {
  for (const g of cat.groups) {
    try {
      const r = await searchPage(keys, { keyword: g.keyword, ngKeyword: g.ng, genreId: g.genreId });
      const furusato = r.items.filter((x) => /^f\d{6}-/.test(x.shopCode));
      const genres = Object.entries(
        furusato.reduce((m, x) => ({ ...m, [x.genre]: (m[x.genre] || 0) + 1 }), {}),
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n]) => `${id}×${n}`)
        .join('・');
      const shown = hrPrepare(r.items, g.unit).length;
      const withImg = r.items.filter((x) => x.img.startsWith('https://thumbnail.image.rakuten.co.jp/')).length;
      note('notice', `返礼品の確認（${g.name}）`, `全部で${r.count}件・1ページ目${r.items.length}件のうち、ふるさと納税の店${furusato.length}件・量が読めた${shown}件・楽天の画像${withImg}件。多いジャンルID：${genres || 'なし'}`);
      if (!furusato.length) bad++;
    } catch (e) {
      note('error', `返礼品の確認（${g.name}）`, e.message);
      bad++;
    }
  }
}
process.exit(bad ? 1 : 0);
