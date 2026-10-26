// 印刷用の早見表の HTML を JSON で出す（scripts/make-prints.py が読んで PDF にする）
// 引数は年（なければ今年と来年）。年が入らない早見表（消毒液）は1つだけ
import { PRINTS, THIS_YEAR, printFile, printHtml } from '../src/prints.mjs';

const years = process.argv.slice(2).map(Number).filter(Boolean);
const list = [];
for (const [kind, p] of Object.entries(PRINTS)) {
  for (const year of p.yearly ? (years.length ? years : [THIS_YEAR, THIS_YEAR + 1]) : [THIS_YEAR]) {
    list.push({ kind, year: p.yearly ? year : null, file: printFile(kind, year), html: printHtml(kind, year) });
  }
}
process.stdout.write(JSON.stringify({ thisYear: THIS_YEAR, list }));
