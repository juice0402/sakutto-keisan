import { parseNum } from '../lib/number.mjs';
import { choju, readYear } from '../lib/gyoji.mjs';
import { $, numericOnly } from './ui.mjs';
import { GY_YEAR, gyNote } from './gyoji-ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('choju.png');

// 長寿祝い：生まれた年から、還暦〜皇寿の年を数え年と満年齢で。いちばん近いお祝いを大きく
function update() {
  const raw = $('year').value.trim();
  const r = raw ? readYear(parseNum(raw)) : { empty: true };
  const typing = r.typing && raw.length < 4;
  $('f-year').classList.toggle('has-error', !!r.error && !typing);
  gyNote(r.error && !typing ? r.error : '', true);
  if (!r.year) {
    $('r-num').textContent = '？';
    $('r-say').textContent = '';
    $('r-rows').innerHTML = '';
    $('r-foot').textContent = '生まれた年を入れてください';
    memo(null);
    return;
  }
  const res = choju(r.year, GY_YEAR);
  const n = res.next;
  $('r-num').textContent = n ? n.name : '—';
  $('r-say').textContent = !n ? '' : n.kazoeYear === n.manYear ? `${n.kazoeYear}年・満${n.man}歳` : `数え年なら${n.kazoeYear}年\n満年齢なら${n.manYear}年`;
  $('r-rows').innerHTML = res.list
    .map((c) => `<tr${c === n ? ' class="is-next"' : c.manYear < GY_YEAR ? ' class="is-past"' : ''}><td class="rk-y"><b>${c.name}</b><small>${c.kazoe}歳</small></td><td>${c.kazoeYear}年</td><td>${c.manYear}年</td></tr>`)
    .join('');
  $('r-foot').textContent = n ? '' : '長寿祝いの年は過ぎています';
  memo(n ? {
    q: `${r.year}年生まれ`,
    a: `${n.name} ${n.kazoeYear === n.manYear ? `${n.kazoeYear}年` : `数え年${n.kazoeYear}年・満年齢${n.manYear}年`}`,
    img: () => imgCard({
      title: '長寿祝い',
      cap: `${r.year}年生まれの次のお祝い`,
      num: n.name,
      sub: n.kazoeYear === n.manYear ? `${n.kazoeYear}年・満${n.man}歳` : `数え年なら${n.kazoeYear}年・満年齢なら${n.manYear}年`,
      rows: res.list.filter((c) => c.manYear >= GY_YEAR).slice(0, 5).map((c) => [`${c.name}（${c.kazoe}歳）`, c.kazoeYear === c.manYear ? `${c.kazoeYear}年` : `${c.kazoeYear}・${c.manYear}年`]),
      notes: ['年が2つの行は、数え年・満年齢の順', '数え年か満年齢かは、資料でちがいます'],
    }),
  } : null);
}

numericOnly([$('year')]);
$('year').addEventListener('input', update);
$('year').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('year').blur(); }
});
$('clear').addEventListener('click', () => {
  $('year').value = '';
  update();
});
update();
