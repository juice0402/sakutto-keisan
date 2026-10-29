import { parseNum } from '../lib/number.mjs';
import { onestopPlan, furusatoDeadlines, ONESTOP_MAX, ONESTOP_CITIES_MAX } from '../lib/furusato-tetsuzuki.mjs';
import { weekdayOf } from '../lib/hizuke.mjs';
import { $, enterToNext, numericOnly, focusHints } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('onestop.png');

// ワンストップ特例の申請：寄付先の数・確定申告・マイナンバーカードから、寄付先に出す封筒の数と中身と期限
// 期限は見た人のブラウザの今日から（1月1日〜10日は前の年の寄付の申請）
let kakutei = false;
let card = true;
const now = new Date();
const DL = Object.fromEntries(furusatoDeadlines({ y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }).map((x) => [x.key, x]));
const jd = (d) => `${d.y}年${d.m}月${d.d}日（${weekdayOf(d)}）`;
const kakuteiSpan = `${DL.kakutei.from.m}月${DL.kakutei.from.d}日〜${DL.kakutei.date.m}月${DL.kakutei.date.d}日`;

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 寄付先ごとの封筒（10通まで描く。6通目からは使えない印） */
function drawEnvs(n, res) {
  if (!n || res.reason === 'kakutei') {
    $('os-envs').innerHTML = '';
    return;
  }
  const shown = Math.min(n, 10);
  $('os-envs').innerHTML =
    Array.from(
      { length: shown },
      (_, i) => `<span class="os-env${i >= ONESTOP_MAX ? ' is-over' : ''}"><svg viewBox="0 0 46 32"><rect x="1" y="1" width="44" height="30" rx="2"/><path d="M1.5 2 23 18 44.5 2"/>${i >= ONESTOP_MAX ? '<path d="M5 28 41 4"/>' : ''}</svg><i>${i + 1}</i></span>`,
    ).join('') +
    (n > shown ? `<span class="os-more">ほか${n - shown}</span>` : '');
}

function row(k, v, i) {
  $(`d-k-${i}`).textContent = k;
  $(`d-v-${i}`).textContent = v;
}

function update() {
  const cities = parseNum($('cities').value);
  const res = onestopPlan({ cities, kakutei, card });
  document.querySelectorAll('.tile[data-kakutei]').forEach((t) => t.setAttribute('aria-pressed', String((t.dataset.kakutei === '1') === kakutei)));
  document.querySelectorAll('.tile[data-card]').forEach((t) => t.setAttribute('aria-pressed', String((t.dataset.card === '1') === card)));
  $('f-cities').classList.toggle('has-error', res.field === 'cities');
  $('cities-minus').disabled = !(cities > 1);
  setNote(res.error || '', !!res.error);
  $('r-sum').classList.toggle('is-error', res.ok && !res.usable);
  if (!res.ok) {
    $('r-cap').textContent = '寄付先に出す';
    $('r-num').textContent = '？';
    $('r-unit').hidden = false;
    $('r-due').textContent = '';
    $('r-left').textContent = '';
    drawEnvs(0, {});
    row('封筒の中', '—', 0);
    row('出す先', '—', 1);
    $('r-foot').textContent = res.empty ? '寄付先の数を入れてください' : '';
    memo(null);
    return;
  }
  if (res.usable) {
    $('r-cap').textContent = '寄付先に出す';
    $('r-num').textContent = String(res.envelopes);
    $('r-unit').hidden = false;
    $('r-due').textContent = `${jd(DL.onestop.date)}必着`;
    $('r-left').textContent = DL.onestop.days > 0 ? `あと${DL.onestop.days}日` : '今日まで';
    row('封筒の中', `申請書（寄付ごとに1枚）、${res.copies.join('と')}`, 0);
    row('出す先', '寄付した自治体（1つに1通）', 1);
    $('r-foot').textContent = 'オンラインで出せる自治体もあります';
    memo({
      q: `寄付先${cities}つ`,
      a: `申請書${res.envelopes}通・${jd(DL.onestop.date)}必着`,
      img: () => imgCard({
        title: 'ワンストップ特例の申請',
        cap: '寄付先に出す',
        num: String(res.envelopes),
        unit: '通',
        sub: `${jd(DL.onestop.date)}必着`,
        fig: { kind: 'envs', n: res.cities, max: ONESTOP_MAX },
        rows: [['期限まで', $('r-left').textContent], ['出す先', '寄付した自治体']],
        notes: ['封筒の中：申請書（寄付ごとに1枚）', ...res.copies],
      }),
    });
  } else {
    $('r-cap').textContent = '特例は';
    $('r-num').textContent = '使えません';
    $('r-unit').hidden = true;
    $('r-due').textContent = res.reason === 'over' ? `寄付先が${ONESTOP_MAX + 1}つ以上` : '確定申告をする';
    $('r-left').textContent = `申告まであと${DL.kakutei.days}日`;
    row('かわりに', '確定申告に、その年の寄付をぜんぶ書く', 0);
    row('申告の期間', `${DL.kakutei.from.y}年${kakuteiSpan}`, 1);
    $('r-foot').textContent = res.reason === 'over' ? `${ONESTOP_MAX}つまでの分も使えなくなります` : '申請した分もふくめて申告します';
    memo({
      q: `寄付先${cities}つ${kakutei ? '・確定申告する' : ''}`,
      a: '特例は使えません（確定申告）',
      img: () => imgCard({
        title: 'ワンストップ特例の申請',
        cap: '特例は',
        num: '使えません',
        sub: $('r-due').textContent,
        fig: res.reason === 'over' ? { kind: 'envs', n: res.cities, max: ONESTOP_MAX } : null,
        rows: [['申告の期間', `${DL.kakutei.from.y}年${kakuteiSpan}`]],
        notes: ['確定申告に、その年の寄付をぜんぶ書きます'],
      }),
    });
  }
  drawEnvs(res.cities, res);
}

/* ---- 寄付先の数の －／＋（1つから） ---- */
function step(d) {
  const v = parseNum($('cities').value);
  const now = v === null || Number.isNaN(v) ? (d > 0 ? 0 : 2) : Math.round(v);
  $('cities').value = String(Math.min(ONESTOP_CITIES_MAX, Math.max(1, now + d)));
  update();
}
$('cities-minus').addEventListener('click', () => step(-1));
$('cities-plus').addEventListener('click', () => step(1));

document.querySelector('.tile[data-kakutei]').parentElement.addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-kakutei]');
  if (!t) return;
  kakutei = t.dataset.kakutei === '1';
  update();
});
document.querySelector('.tile[data-card]').parentElement.addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-card]');
  if (!t) return;
  card = t.dataset.card === '1';
  update();
});
numericOnly([$('cities')]);
$('cities').addEventListener('input', update);
enterToNext([$('cities')]); // 次はマスなので、キーボードを閉じる
focusHints(document.querySelector('.box-rows'));
$('clear').addEventListener('click', () => {
  $('cities').value = '';
  kakutei = false;
  card = true;
  update();
});
update();
