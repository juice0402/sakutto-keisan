import { parseNum, fmt } from '../lib/number.mjs';
import { seisou, minText, hoursValue, SEISOU_FIELDS } from '../lib/seisou.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur } from './ui.mjs';

// 清掃の作業時間：作業の速さ（1人1時間に掃除できる面積）は、作業のマスをえらぶと目安が入る。自分で入れてもよい。面積・人数・時間のうち2つから残りの1つを出す
// 面積は現場で決まっていることが多いので、面積が入っていれば人数か時間のどちらかを答えにする（あとからさわったほうを残す）。
// 面積を入れずに人数と時間を入れたときだけ、面積を答えにする
const typed = new Set(); // 自分で入れた欄（答えになった欄は外す）
let lastPH = 'people'; // 人数と時間のうち、あとからさわったほう
const INPUTS = ['speed', ...SEISOU_FIELDS].map((id) => $(id));
const val = (id) => parseNum($(id).value);
const currentSpeed = () => val('speed');
const MAX_STRIPS = 30; // 床を分けて見せる人数の上限
const CAP = { hours: 'かかる時間', people: '必要な人数', area: 'できる面積' };

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 床を人数で分けた絵（1人ずつの帯） */
function drawFloor(res) {
  const n = res ? Math.min(MAX_STRIPS, Math.ceil(res.people)) : 0;
  $('s-floor').innerHTML = Array.from({ length: n }, () => '<span class="floor-strip"></span>').join('');
  $('s-left').textContent = res ? `1人あたり ${fmt(res.perPerson, 1)}㎡` : '1人あたり';
  $('s-right').textContent = res ? `${fmt(res.people, 2)}人・${fmt(res.area, 1)}㎡` : '';
}

function emptyText() {
  if (currentSpeed() === null) return '作業をえらんでください';
  return '面積・人数・時間のうち2つを入れてください';
}

function answerField() {
  if (!typed.has('area')) return typed.has('people') && typed.has('hours') ? 'area' : null;
  if (!typed.has('people') && !typed.has('hours')) return null;
  if (typed.has('people') && typed.has('hours')) return lastPH === 'hours' ? 'people' : 'hours';
  return typed.has('people') ? 'hours' : 'people';
}

function update() {
  const out = answerField();
  if (out) typed.delete(out);
  const args = { area: val('area'), people: val('people'), hours: val('hours'), speed: currentSpeed() };
  document.querySelectorAll('.tile[data-speed]').forEach((t) => t.setAttribute('aria-pressed', String(Number(t.dataset.speed) === args.speed)));
  let res = { ok: false, empty: true };
  if (out) res = seisou({ ...args, out });
  else if (args.speed !== null && (Number.isNaN(args.speed) || args.speed <= 0)) res = seisou({ ...args, area: 1, people: 1, out: 'hours' }); // 速さだけまちがっているとき
  INPUTS.forEach((el) => {
    $(`f-${el.id}`).classList.toggle('has-error', res.field === el.id);
    $(`f-${el.id}`).classList.toggle('is-out', res.ok && el.id === out);
  });
  if (out) {
    if (!res.ok) $(out).value = '';
    else if (out === 'hours') $(out).value = hoursValue(res.minutes);
    else $(out).value = fmt(res[out], out === 'area' ? 0 : 2);
  }
  setNote(res.error || '', !!res.error);
  drawFloor(res.ok ? res : null);
  $('r-cap').textContent = CAP[out] || CAP.hours;
  if (!res.ok) {
    $('r-num').textContent = '？';
    $('r-foot').textContent = res.empty ? emptyText() : '';
    return;
  }
  const total = `のべ ${minText(Math.ceil(res.personHours * 60))}`;
  if (out === 'people') {
    $('r-num').textContent = `${fmt(res.people, 0)}人`;
    $('r-foot').textContent = `${fmt(res.people, 0)}人なら ${minText(res.minutes)}・${total}`;
  } else if (out === 'area') {
    $('r-num').textContent = `${fmt(res.area, 0)}㎡`;
    $('r-foot').textContent = total;
  } else {
    $('r-num').textContent = minText(res.minutes);
    $('r-foot').textContent = total;
  }
}

/* ---- 作業のマス：えらぶと、速さの欄に目安の数字を入れる ---- */
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-speed]');
  if (!t) return;
  $('speed').value = t.dataset.speed;
  update();
});

/* ---- 入力：面積・人数・時間は入れた欄を覚えて、残りの欄に答えを出す。答えの欄をさわったら、まるごと書きかえられるように選んでおく ---- */
numericOnly(INPUTS);
INPUTS.forEach((el) => {
  el.addEventListener('input', (e) => {
    // 自分で入れたときだけ覚える（離れたときの3桁区切りの整え直しでは、入れた順を変えない）
    if (e.isTrusted && el.id !== 'speed') {
      typed.add(el.id);
      if (el.id !== 'area') lastPH = el.id;
    }
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${el.id}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur([$('area')], true);
$('clear').addEventListener('click', () => {
  INPUTS.forEach((el) => { el.value = ''; });
  typed.clear();
  lastPH = 'people';
  update();
});
enterToNext(INPUTS);
update();
