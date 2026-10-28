import { shichigosan } from '../lib/gyoji.mjs';
import { $ } from './ui.mjs';
import { GY_YEAR, gyWa, gyNote, gySexPress } from './gyoji-ui.mjs';
import { memoOnly, cmYmd } from './choimemo.mjs';

const memo = memoOnly();

// 七五三：子どもごとの生年月日と男の子・女の子から、数え年と満年齢の七五三の年を年ごとの表に
// きょうだいは「＋きょうだいを追加」で3人まで。全員がそろって祝える年に色をつけて、いちばん近い年を大きく
const NAMES = ['1人目', '2人目', '3人目'];
const sexes = ['', '', ''];
let count = 1;
const label = (p) => `${p.style === 'kazoe' ? '数え' : '満'}${p.age}歳`;

function update() {
  const kids = sexes.slice(0, count).map((sex, i) => ({ birth: $(`birth-${i}`).value, sex }));
  const res = shichigosan(kids, GY_YEAR);
  for (let i = 0; i < 3; i++) {
    $(`f-birth-${i}`).classList.toggle('has-error', res.field === `birth-${i}`);
    gySexPress($(`sex-${i}`), sexes[i]);
    $(`h-${i}`).hidden = i >= count;
  }
  $('h-0').textContent = count > 1 ? NAMES[0] : '年齢';
  $('r-cap').textContent = count > 1 ? 'いっしょにできる年' : '次の七五三';
  gyNote(res.error || '', !!res.error);
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-say').textContent = '';
    $('r-rows').innerHTML = '';
    const m = res.missing;
    const who = count > 1 && m ? `${NAMES[m.kid]}の` : '';
    $('r-foot').textContent = !m ? '' : m.what === 'birth' ? `${who}生年月日を入れてください` : who ? `${who}性別をえらんでください` : '男の子か女の子をえらんでください';
    memo(null);
    return;
  }
  $('r-rows').innerHTML = res.rows
    .map((r) => {
      const cls = [r.past ? 'is-past' : '', r === res.next ? 'is-next' : r.together ? 'is-together' : ''].filter(Boolean).join(' ');
      const cells = kids.map((_, i) => {
        const items = r.items.filter((p) => p.kid === i);
        return `<td>${items.map((p) => `${label(p)}${p.local ? '<small>地方</small>' : ''}`).join('・')}</td>`;
      });
      return `<tr${cls ? ` class="${cls}"` : ''}><td class="rk-y"><b>${r.year}</b><small>${gyWa(r.year)}</small></td>${cells.join('')}</tr>`;
    })
    .join('');
  if (res.next) {
    $('r-num').textContent = String(res.next.year);
    memo({ q: kids.map((k) => `${cmYmd(k.birth)}生まれ`).join('・'), a: `七五三 ${res.next.year}年（${res.next.items.map(label).join('・')}）` });
    $('r-say').textContent = count > 1
      ? res.next.items.map((p) => `${NAMES[p.kid]} ${label(p)}`).join('・')
      : `${gyWa(res.next.year)}・${res.next.items.map(label).join('・')}`;
    $('r-foot').textContent = '';
  } else {
    $('r-num').textContent = '—';
    memo(null);
    $('r-say').textContent = '';
    $('r-foot').textContent = count > 1 && !res.done ? '全員がいっしょにできる年はありません' : '七五三の年は過ぎています';
  }
}

for (let i = 0; i < 3; i++) {
  $(`birth-${i}`).addEventListener('input', update);
  $(`birth-${i}`).addEventListener('change', update);
  $(`sex-${i}`).addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn[data-sex]');
    if (!b) return;
    sexes[i] = b.dataset.sex;
    update();
  });
}
$('add-kid').addEventListener('click', () => {
  if (count >= 3) return;
  $(`kid-${count}`).hidden = false;
  count++;
  $('add-kid').hidden = count >= 3;
  update();
});
$('clear').addEventListener('click', () => {
  for (let i = 0; i < 3; i++) {
    $(`birth-${i}`).value = '';
    sexes[i] = '';
    if (i) $(`kid-${i}`).hidden = true;
  }
  count = 1;
  $('add-kid').hidden = false;
  update();
});
update();
