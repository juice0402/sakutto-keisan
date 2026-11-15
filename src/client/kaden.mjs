import { fmt } from '../lib/number.mjs';
import { kdWinter, kdElec, kdBand, kdDaysText } from '../lib/kaden.mjs';

// 家電別の電気代のページの「この型番の値段と、この冬の電気代」の帯（#172）：計算カードの今の入力で、この冬の電気代の帯をのびちぢみさせる
// 入力がそろっていないときは、ページの強さ（強など）と使う時間で出す（data-*）
export function kdDraw(res, name) {
  const box = document.getElementById('kd');
  if (!box) return;
  const d = box.dataset;
  const use = !!(res && res.ok && res.hours !== null);
  const watt = use ? res.watt : Number(d.watt);
  const hours = use ? res.hours : Number(d.hours);
  const price = res && res.ok ? res.price : Number(d.price);
  const { days } = kdWinter(new Date());
  const b = kdBand(Number(d.body), kdElec(watt, hours, price, days));
  const parts = box.querySelectorAll('.fz2-bar > div');
  b.parts.forEach((p, i) => {
    parts[i].style.width = `${p.w}%`;
    const s = parts[i].querySelector('span');
    if (s) s.textContent = p.text;
    else if (p.text) parts[i].insertAdjacentHTML('beforeend', `<span>${p.text}</span>`);
  });
  const ruler = box.querySelectorAll('.fz2-ruler span');
  ruler[ruler.length - 1].textContent = `約${fmt(b.total)}円`;
  box.querySelector('.fz2-ans').innerHTML = b.ans;
  document.getElementById('kd-head').textContent = use ? `${name ? `${name} ` : ''}${fmt(watt, 1)}W・1日${fmt(hours, 2)}時間` : `${d.b} ${fmt(watt)}W・1日${fmt(hours)}時間`;
  document.getElementById('kd-days').textContent = kdDaysText(days);
}
