import { okuizome } from '../lib/gyoji.mjs';
import { $ } from './ui.mjs';
import { gyMd, gyNote, gyCal, gyWeekend, gyDaysFromToday } from './gyoji-ui.mjs';

// お食い初め：生年月日から、生まれた日を1日目に数えた100日目（日めくり）と、前後の土日・120日目・生後100日
function update() {
  const res = okuizome($('birth').value);
  $('f-birth').classList.toggle('has-error', !!res.error);
  gyNote(res.error || '', !!res.error);
  if (!res.ok) {
    gyCal(null);
    $('r-say').textContent = '';
    ['d-before', 'd-after', 'd-120', 'd-100b'].forEach((id) => { $(id).textContent = '—'; });
    $('r-foot').textContent = res.empty ? '生年月日を入れてください' : '';
    return;
  }
  gyCal(res.d100);
  const left = gyDaysFromToday(res.d100);
  $('r-say').textContent = left > 0 ? `今日からあと${left}日` : left === 0 ? '今日です' : `${-left}日前でした`;
  $('d-before').textContent = gyWeekend(res.weekends.before);
  $('d-after').textContent = gyWeekend(res.weekends.after);
  $('d-120').textContent = gyMd(res.d120);
  $('d-100b').textContent = gyMd(res.d100b);
  $('r-foot').textContent = '';
}

$('birth').addEventListener('input', update);
$('birth').addEventListener('change', update);
$('clear').addEventListener('click', () => {
  $('birth').value = '';
  update();
});
update();
