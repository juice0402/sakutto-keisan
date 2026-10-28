import { gakureki } from '../lib/gakureki.mjs';
import { $ } from './ui.mjs';
import { memoOnly, cmYmd } from './choimemo.mjs';

const memo = memoOnly();

// 入学・卒業年の計算：生年月日から、小学校の入学から大学の卒業まで。結果は履歴書の学歴の欄（年は赤ペン、和暦とその時の年齢を小さく）
// 結果の下の「浪人1年」「留年1年」「短大・専門」は、もう一度押すと元にもどる
const opt = { ronin: false, ryunen: false, tandai: false };
const BTN = { ronin: 't-ronin', ryunen: 't-ryunen', tandai: 't-tandai' };

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

function update() {
  const res = gakureki({ birth: $('birth').value, ronin: opt.ronin ? 1 : 0, ryunen: opt.ryunen ? 1 : 0, tandai: opt.tandai });
  $('f-birth').classList.toggle('has-error', res.field === 'birth');
  setNote(res.error || '', !!res.error);
  Object.entries(BTN).forEach(([k, id]) => $(id).setAttribute('aria-pressed', String(opt[k])));
  const last = opt.tandai ? '短大・専門' : '大学';
  for (let i = 0; i < 8; i++) {
    const r = res.ok ? res.rows[i] : null;
    $(`y-${i}`).textContent = r ? String(r.y) : '—';
    $(`w-${i}`).textContent = r ? r.wareki : '';
    $(`m-${i}`).textContent = r ? String(r.m) : '';
    $(`a-${i}`).textContent = r ? `${r.age}歳` : '';
    if (i >= 6) $(`s-${i}`).textContent = last;
  }
  if (!res.ok) {
    $('r-foot').textContent = res.empty ? '生年月日を入れてください' : '';
    memo(null);
    return;
  }
  memo({ q: `${cmYmd($('birth').value)}生まれ`, a: `小学校入学 ${res.rows[0].y}年${res.rows[0].m}月・${opt.tandai ? "短大・専門" : "大学"}卒業 ${res.rows[7].y}年${res.rows[7].m}月` });
  $('r-foot').textContent = res.early ? '早生まれ（前の年の生まれと同じ学年）' : '';
}

$('birth').addEventListener('input', update);
$('birth').addEventListener('change', update);
Object.entries(BTN).forEach(([k, id]) => {
  $(id).addEventListener('click', () => {
    opt[k] = !opt[k];
    update();
  });
});
$('clear').addEventListener('click', () => {
  $('birth').value = '';
  Object.keys(opt).forEach((k) => { opt[k] = false; });
  update();
});
update();
