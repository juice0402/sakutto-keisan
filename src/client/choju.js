import { parseNum } from '../lib/number.mjs';
import { choju, readYear } from '../lib/gyoji.mjs';
import { $, numericOnly } from './ui.mjs';
import { GY_YEAR, gyNote } from './gyoji-ui.mjs';

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
