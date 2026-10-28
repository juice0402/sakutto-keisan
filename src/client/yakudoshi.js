import { parseNum } from '../lib/number.mjs';
import { yakudoshi, readYear } from '../lib/gyoji.mjs';
import { $, numericOnly, focusHints } from './ui.mjs';
import { GY_YEAR, gyWa, gyNote, gySexPress } from './gyoji-ui.mjs';
import { memoOnly } from './choimemo.mjs';

const memo = memoOnly();

// 厄年：生まれた年と男性・女性から、今年の数え年と、前厄・本厄・後厄の年
// 結果は、数え年の帯（厄年の3年をうすい赤、本厄を赤、今年に紺の線）と、厄年ごとの年の表
let sex = '';
const LINE_MIN = 15;
const LINE_MAX = 65;
const lx = (age) => 10 + ((Math.min(Math.max(age, LINE_MIN), LINE_MAX) - LINE_MIN) * 300) / (LINE_MAX - LINE_MIN);

function line(res) {
  const step = 300 / (LINE_MAX - LINE_MIN);
  const bands = res.list
    .map((y) => `<rect class="${y.some ? 'yk-some' : 'yk-band'}" x="${lx(y.age - 1) - step / 2}" y="12" width="${step * 3}" height="14"/><rect class="${y.some ? 'yk-some-hon' : 'yk-hon'}" x="${lx(y.age) - step / 2}" y="12" width="${step}" height="14"/>`)
    .join('');
  const ticks = [20, 30, 40, 50, 60].map((a) => `<line x1="${lx(a)}" y1="30" x2="${lx(a)}" y2="34"/><text x="${lx(a)}" y="44">${a}</text>`).join('');
  const k = res.kazoe;
  const now = k >= LINE_MIN && k <= LINE_MAX ? `<line class="yk-now" x1="${lx(k)}" y1="5" x2="${lx(k)}" y2="32"/><path class="yk-now-dot" d="M${lx(k) - 4} 3h8l-4 5z"/>` : '';
  return `<svg viewBox="0 0 320 46">${bands}<line x1="10" y1="30" x2="310" y2="30"/>${ticks}${now}</svg>`;
}

function update() {
  const raw = $('year').value.trim();
  const r = raw ? readYear(parseNum(raw)) : { empty: true };
  const typing = r.typing && raw.length < 4;
  $('f-year').classList.toggle('has-error', !!r.error && !typing);
  gySexPress($('f-sex'), sex);
  gyNote(r.error && !typing ? r.error : '', true);
  if (!r.year || !sex) {
    $('r-num').textContent = '？';
    $('r-num').parentElement.classList.remove('is-long');
    $('r-say').textContent = '';
    $('r-line').innerHTML = '';
    $('r-rows').innerHTML = '';
    $('r-foot').textContent = !r.year ? '生まれた年を入れてください' : '男性か女性をえらんでください';
    memo(null);
    return;
  }
  const res = yakudoshi(r.year, sex, GY_YEAR);
  const kind = res.now ? res.now.kind : '厄年ではありません';
  $('r-num').textContent = kind;
  memo({ q: `${r.year}年生まれ・${sex === 'male' ? '男性' : '女性'}`, a: res.now ? `${GY_YEAR}年は${kind}` : `${GY_YEAR}年は${kind}${res.next ? `（次の本厄は${res.next.hon}年）` : ''}` });
  $('r-num').parentElement.classList.toggle('is-long', !res.now);
  const extra = res.now && res.now.y.big ? '・大厄' : res.now && res.now.y.some ? '・一部の神社' : '';
  const next = !res.now && res.next ? `\n次の本厄は${res.next.hon}年・数え${res.next.age}歳` : '';
  $('r-say').textContent = res.kazoe >= 1 ? `数え${res.kazoe}歳${extra}（${gyWa(r.year)}生まれ）${next}` : `${gyWa(r.year)}生まれ`;
  $('r-line').innerHTML = line(res);
  const cell = (y) => `<td${y < GY_YEAR ? ' class="is-past-y"' : ''}>${y === GY_YEAR ? `<span class="gy-mark">${y}</span>` : y}</td>`;
  $('r-rows').innerHTML = res.list
    .map((y) => `<tr${res.now && res.now.y === y ? ' class="is-next"' : y.ato < GY_YEAR ? ' class="is-past"' : ''}><td class="rk-y"><b>数え${y.age}</b><small>${y.big ? '大厄' : y.some ? '一部' : ''}</small></td>${cell(y.mae)}${cell(y.hon)}${cell(y.ato)}</tr>`)
    .join('');
  $('r-foot').textContent = '';
}

numericOnly([$('year')]);
$('year').addEventListener('input', update);
$('year').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); $('year').blur(); }
});
$('f-sex').addEventListener('click', (e) => {
  const b = e.target.closest('.seg-btn[data-sex]');
  if (!b) return;
  sex = b.dataset.sex;
  update();
});
$('clear').addEventListener('click', () => {
  $('year').value = '';
  sex = '';
  update();
});
focusHints(document.querySelector('.box-rows'));
update();
