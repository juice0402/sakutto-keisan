import { furusatoDeadlines } from '../lib/furusato-tetsuzuki.mjs';
import { weekdayOf } from '../lib/hizuke.mjs';
import { $ } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('shimekiri.png');

// ふるさと納税の締め切り：今日（見た人のブラウザの日付）から、年内の寄付と、申請書か確定申告の期限まであと何日か
// 2つの日めくりのうち、近いほうの日数をいちばん大きく
let how = 'onestop';
const now = new Date();
const TODAY = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
const DL = Object.fromEntries(furusatoDeadlines(TODAY).map((x) => [x.key, x]));
const jd = (d) => `${d.y}年${d.m}月${d.d}日（${weekdayOf(d)}）`;
const WHAT = { kifu: '年内の寄付', onestop: '申請書の必着', kakutei: '確定申告の終わり' };
const CAP = { kifu: '年内の寄付まで', onestop: '申請書の期限まで', kakutei: '確定申告の終わりまで' };

function drawCal(i, x) {
  const w = weekdayOf(x.date);
  $(`c-what-${i}`).textContent = WHAT[x.key];
  $(`c-ym-${i}`).textContent = `${x.date.y}年${x.date.m}月`;
  $(`c-d-${i}`).textContent = String(x.date.d);
  $(`c-w-${i}`).textContent = `${w}曜日`;
  $(`c-w-${i}`).className = `cal-w${w === '日' ? ' is-sun' : w === '土' ? ' is-sat' : ''}`;
  $(`c-left-${i}`).textContent = x.days > 0 ? `あと${x.days}日` : '今日まで';
}

function update() {
  document.querySelectorAll('.tile[data-how]').forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.how === how)));
  const shown = [DL.kifu, DL[how]];
  shown.forEach((x, i) => drawCal(i, x));
  const near = shown.reduce((a, b) => (b.days < a.days ? b : a));
  $('r-cap').textContent = CAP[near.key];
  $('r-num').textContent = String(near.days);
  memo({
    q: how === 'onestop' ? 'ワンストップ特例' : '確定申告',
    a: `${CAP[near.key]}あと${near.days}日（${jd(near.date)}）`,
    img: () => imgCard({
      title: 'ふるさと納税の締め切り',
      cap: `${CAP[near.key]}あと`,
      num: String(near.days),
      unit: '日',
      sub: `今日 ${jd(TODAY)}`,
      fig: { kind: 'cals', cals: shown.map((x) => ({ what: WHAT[x.key], ym: `${x.date.y}年${x.date.m}月`, d: x.date.d, w: weekdayOf(x.date), left: x.days > 0 ? `あと${x.days}日` : '今日まで', red: x === near })) },
      rows: [[$('d-k-0').textContent, $('d-v-0').textContent.replace(/（.）/, '')], [$('d-k-1').textContent, $('d-v-1').textContent]],
    }),
  });
  $('r-today').textContent = `今日 ${jd(TODAY)}`;
  $('d-k-0').textContent = `${DL.kifu.forYear}年の寄付`;
  $('d-v-0').textContent = `${DL.kifu.date.m}月${DL.kifu.date.d}日（${weekdayOf(DL.kifu.date)}）までに入金`;
  const x = DL[how];
  const other = x.forYear !== DL.kifu.forYear ? `${x.forYear}年分の` : ''; // 1月は前の年の寄付の手続き
  if (how === 'onestop') {
    $('d-k-1').textContent = `${other}申請書`;
    $('d-v-1').textContent = `${jd(x.date)}必着`;
    $('r-foot').textContent = '寄付先の自治体に届いていることが必要です';
  } else {
    $('d-k-1').textContent = `${other}確定申告`;
    $('d-v-1').textContent = `${x.from.y}年${x.from.m}月${x.from.d}日〜${x.date.m}月${x.date.d}日（${weekdayOf(x.date)}）`;
    $('r-foot').textContent = x.open ? '' : `申告は${x.from.m}月${x.from.d}日からです`;
  }
}

document.querySelector('.tiles-2').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-how]');
  if (!t) return;
  how = t.dataset.how;
  update();
});
update();
