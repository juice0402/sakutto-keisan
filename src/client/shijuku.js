import { shijuku } from '../lib/gyoji.mjs';
import { $ } from './ui.mjs';
import { gyMd, gyNote, gyCal, gyWeekend, gyDaysFromToday } from './gyoji-ui.mjs';
import { weekdayOf } from '../lib/hizuke.mjs';
import { choiMemo, cmYmd } from './choimemo.mjs';
import { imgCal } from './share-img.mjs';

const memo = choiMemo('shijukunichi.png');

// 四十九日：亡くなった日から、初七日〜四十九日（7日ごと）と一周忌〜三十三回忌の日
// 「前の日から数える」（逮夜）を押すと、初七日〜四十九日を1日早く
let taiya = false;

function update() {
  const res = shijuku($('death').value, taiya);
  $('t-taiya').setAttribute('aria-pressed', String(taiya));
  $('f-death').classList.toggle('has-error', !!res.error);
  gyNote(res.error || '', !!res.error);
  if (!res.ok) {
    gyCal(null);
    $('r-say').textContent = '';
    $('r-rows').innerHTML = '';
    $('r-foot').textContent = res.empty ? '亡くなった日を入れてください' : '';
    memo(null);
    return;
  }
  gyCal(res.day49);
  const wk = res.weekends.before;
  $('r-say').textContent = wk.length ? `前の土日\n${wk.map((d, i) => (i && d.m === wk[0].m ? `${d.d}日` : `${d.m}月${d.d}日`)).join('・')}` : '';
  const row = (name, d, mark) =>
    `<tr${mark ? ' class="is-next"' : gyDaysFromToday(d) < 0 ? ' class="is-past"' : ''}><td class="rk-y"><b>${name}</b></td><td>${d.y}年${gyMd(d)}</td></tr>`;
  const d = res.day49;
  memo({
    q: `${cmYmd($('death').value)}に亡くなった`,
    a: `四十九日 ${d.y}年${gyMd(d)}`,
    img: () => imgCal({ start: `${cmYmd($('death').value)}から数えた四十九日${taiya ? '（前の日から）' : ''}`, ym: `${d.y}年${d.m}月`, d: String(d.d), w: `${weekdayOf(d)}曜日`, wColor: '', num: '49', unit: '日目' }),
  });
  $('r-rows').innerHTML = [...res.chuin.map((c, i) => row(c.name, c.date, i === 6)), ...res.nenki.map((n) => row(n.name, n.date, false))].join('');
  $('r-foot').textContent = '';
}

$('death').addEventListener('input', update);
$('death').addEventListener('change', update);
$('t-taiya').addEventListener('click', () => {
  taiya = !taiya;
  update();
});
$('clear').addEventListener('click', () => {
  $('death').value = '';
  taiya = false;
  update();
});
update();
