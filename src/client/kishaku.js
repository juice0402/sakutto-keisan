import { parseNum, fmt } from '../lib/number.mjs';
import { dilute, ratioFromPercent, ratioFromParts, waterPart, volumeText, spoonText, capText, mlValue, literText } from '../lib/kishaku.mjs';
import { $, enterToNext, numericOnly, tidyOnBlur, focusHints } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgBottle } from './share-img.mjs';

// 希釈率の計算と、使いみち別のページ（めんつゆ・漂白剤・液体肥料）で共通。ページごとのちがいは #calc の data-*
//   data-how：薄め方を決めておく（times：何倍 / pct：濃度）。ないときは上の3つのタブでえらぶ
//   data-conc：原液の呼び名（つゆ・漂白剤）　data-empty：まだえらんでいないときの案内
//   data-label：ボトルのラベル（pct：濃度 / parts：1：3 / ないとき：10倍）
//   data-custom="water"：最後のマスに水の割合（1：？）を入れる
//   data-cap・data-cap-name：キャップで量るときの1杯の量（ml）と名前。data-spoon="0"：計量スプーンの目安を出さない
const C = $('calc').dataset;
const CONC = C.conc || '原液';
let how = C.how || 'times'; // 薄め方 times：何倍 / parts：何対何 / pct：何％
let basis = 'total'; // いま入れている量の欄 total：できあがり / conc：原液 / water：水（ほかの2つに答えを出す）
let tileVal = null; // えらんだマスの値（倍率か濃度。「その他」に入れたときは、そちらを使う）
const CUSTOM = document.querySelector('.tile-input input').id; // 最後のマス（自分で入れる）
const AMOUNTS = ['total', 'conc', 'water'];
const AMOUNT_NAME = { total: 'できあがり', conc: CONC, water: '水' };
const FROM = { total: 'total', conc: 'concentrate', water: 'water' };
const BOTTLE_FULL = 82; // ボトルの何％まで液を入れて見せるか
const val = (id) => parseNum($(id).value);
const memo = choiMemo('kishaku.png');
// 薄め方の欄（ページの上から順。Enter で次の欄へ進む順番になる）
const RATIO_IDS = [...document.querySelectorAll('#calc input')].map((el) => el.id).filter((id) => ['ratio', 'pc', 'pw', 'src', 'target'].includes(id));

function currentRatio() {
  const custom = val(CUSTOM);
  if (how === 'pct') return ratioFromPercent(val('src'), CUSTOM === 'target' ? custom ?? tileVal : val('target'));
  if (how === 'parts') return ratioFromParts(val('pc'), val('pw'));
  if (custom !== null) {
    if (C.custom === 'water') {
      const r = ratioFromParts(1, custom);
      return r.ok ? r : { ...r, field: CUSTOM };
    }
    if (Number.isNaN(custom) || custom < 1) return { ok: false, error: '何倍に薄めるかは、1以上の数字で入れてください。', field: CUSTOM };
    return { ok: true, ratio: custom };
  }
  return tileVal === null ? { ok: false, empty: true } : { ok: true, ratio: tileVal };
}

/** 「原液1：水9」。何対何で入れたときは、入れたままの割合（原液2：水3 など） */
function partsText(ratio) {
  return how === 'parts' ? `原液${fmt(val('pc'), 2)}：水${fmt(val('pw'), 2)}` : `${CONC}1：水${waterPart(ratio)}`;
}

/** ボトルのラベル：10倍・1：3・0.05％（せまいので3桁の区切りはつけない） */
function bottleLabel(ratio) {
  if (C.label === 'pct') return ratio ? `${fmt(val('src') / ratio, 3)}％` : '？％';
  if (C.label === 'parts') return ratio ? `1：${waterPart(ratio)}` : '1：？';
  return ratio ? `${fmt(ratio, 2).replace(/,/g, '')}倍` : '？倍';
}

/** ボトルの絵：下に原液（黄色）、上に水（水色）。原液がとても少なくても見えるように少しだけ高さをつける */
function drawBottle(r) {
  const conc = r && r.total > 0 ? Math.min(BOTTLE_FULL, Math.max((r.concentrate / r.total) * BOTTLE_FULL, r.concentrate > 0 ? 5 : 0)) : 0;
  $('b-conc').style.height = `${conc}%`;
  $('b-water').style.height = r ? `${Math.max(0, BOTTLE_FULL - conc)}%` : '0%';
  const label = bottleLabel(r && r.ratio);
  $('b-label').textContent = label;
  $('b-label').classList.toggle('is-long', label.length > 5); // 1000倍・0.025％ など
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/**
 * 入れていない2つの欄に答えを出す（res が null なら空にする）。ボトルの下には、原液をキャップや計量スプーンで量るときの目安を先に、
 * そのあと 1,000ml をこえる答えの L を添える（自分で入れた欄の L は出さない）
 */
function showAmounts(res) {
  const ml = res && { total: res.total, conc: res.concentrate, water: res.water };
  AMOUNTS.forEach((k) => {
    const out = k !== basis;
    $(`f-${k}`).classList.toggle('is-out', out && !!ml);
    if (out) $(`v-${k}`).value = ml ? mlValue(ml[k]) : '';
  });
  const hints = [];
  if (ml) {
    const cap = C.cap ? capText(ml.conc, Number(C.cap)) : '';
    const spoon = C.spoon !== '0' ? spoonText(ml.conc) : '';
    if (cap) hints.push(`${C.capName}で${cap}`);
    else if (spoon) hints.push(`${CONC}は計量スプーンで ${spoon}`);
    AMOUNTS.forEach((k) => {
      const liter = k === basis ? '' : literText(ml[k]);
      if (liter) hints.push(`${AMOUNT_NAME[k]}${liter.startsWith('約') ? ' ' : ''}${liter}`);
    });
  }
  $('r-hints').textContent = hints.join('・');
  $('r-sr').textContent = ml ? `${CONC}${volumeText(ml.conc)}、水${volumeText(ml.water)}、できあがり${volumeText(ml.total)}` : '';
}

function emptyHint() {
  if (how === 'pct' && CUSTOM === 'target' && val('src') === null) return `${CONC}の濃度を入れてください`;
  if (C.empty) return C.empty;
  return { times: '何倍に薄めるかをえらんでください', parts: '原液と水の割合を入れてください', pct: '原液の濃度と作りたい濃度を入れてください' }[how];
}

function update() {
  const rr = currentRatio();
  const amt = val(`v-${basis}`);
  // 入力まちがいの印・えらんでいるマス
  memo(null);
  RATIO_IDS.forEach((id) => $(`f-${id}`).classList.toggle('has-error', rr.field === id));
  AMOUNTS.forEach((k) => $(`f-${k}`).classList.toggle('has-error', k === basis && (Number.isNaN(amt) || amt === 0)));
  const custom = $(CUSTOM).value !== '';
  document.querySelectorAll('.tile[data-ratio], .tile[data-target]').forEach((t) => {
    t.setAttribute('aria-pressed', String(!custom && Number(t.dataset.ratio ?? t.dataset.target) === tileVal));
  });
  $(`f-${CUSTOM}`).classList.toggle('is-on', custom);

  if (!rr.ok) {
    drawBottle(null);
    showAmounts(null);
    $('r-ratio').textContent = emptyHint();
    return setNote(rr.error || '', !!rr.error);
  }
  $('r-ratio').textContent = `${fmt(rr.ratio, 2)}倍（${partsText(rr.ratio)}）`;
  const res = dilute({ ratio: rr.ratio, amount: amt, from: FROM[basis] });
  if (!res.ok) {
    drawBottle(dilute({ ratio: rr.ratio, amount: 1000 })); // 量がまだでも、原液と水の割合は見せる
    showAmounts(null);
    if (res.empty) $('r-hints').textContent = 'わかっている量を1つ入れてください';
    return setNote(res.empty ? '' : res.error, !res.empty);
  }
  drawBottle(res);
  showAmounts(res);
  const way = how === 'parts' || C.label === 'parts' ? `${partsText(rr.ratio)}で` : `${bottleLabel(rr.ratio)}に`;
  const v = { total: volumeText(res.total), conc: volumeText(res.concentrate), water: volumeText(res.water) };
  const ask = { total: `できあがり${v.total}を`, conc: `${CONC}${v.conc}を`, water: `水${v.water}で` }[basis];
  memo({
    q: `${ask}${way}`,
    a: AMOUNTS.filter((k) => k !== basis).map((k) => `${AMOUNT_NAME[k]}${v[k]}`).join('・'),
    img: () => imgBottle({
      label: bottleLabel(rr.ratio),
      share: res.total > 0 ? res.concentrate / res.total : 0,
      conc: v.conc,
      water: v.water,
      total: v.total,
      concName: CONC,
      ratio: $('r-ratio').textContent,
      concColor: document.querySelector('.is-tsuyu') ? '#a8692f' : '#f5bb55',
    }),
  });
  setNote(res.concentrate < 1.25 ? `${CONC}が少ないので、多めに作ると量りやすいです。` : '');
}

/* ---- 薄め方（3つのタブ。希釈率の計算のページだけ） ---- */
function setHow(next) {
  how = next;
  document.querySelectorAll('.seg-btn[data-how]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.how === how)));
  $('f-tiles').hidden = how !== 'times';
  $('parts-fields').hidden = how !== 'parts';
  $('pct-fields').hidden = how !== 'pct';
  update();
}
document.querySelectorAll('.seg-btn[data-how]').forEach((b) => b.addEventListener('click', () => setHow(b.dataset.how)));

/* ---- 入力 ---- */
function fitCustom() {
  $(CUSTOM).style.width = `${Math.max(1, $(CUSTOM).value.length) + 0.2}ch`;
}
document.querySelector('.tiles').addEventListener('click', (e) => {
  const t = e.target.closest('.tile[data-ratio], .tile[data-target]');
  if (!t) return;
  tileVal = Number(t.dataset.ratio ?? t.dataset.target);
  $(CUSTOM).value = '';
  fitCustom();
  update();
});
$(`f-${CUSTOM}`).addEventListener('click', () => $(CUSTOM).focus());
const ratioInputs = RATIO_IDS.map((id) => $(id));
const amountInputs = AMOUNTS.map((k) => $(`v-${k}`));
numericOnly([...ratioInputs, ...amountInputs]);
const srcBox = document.querySelector('.src-box');
if (srcBox) focusHints(srcBox); // 次亜塩素酸ナトリウム：漂白剤の濃度の1行の説明
ratioInputs.forEach((el) => el.addEventListener('input', update));
$(CUSTOM).addEventListener('input', fitCustom);
// 量の欄：入れた欄から、ほかの2つを出す。答えの出ている欄をさわったら、まるごと書きかえられるように選んでおく
AMOUNTS.forEach((k) => {
  const el = $(`v-${k}`);
  el.addEventListener('input', () => {
    basis = k;
    update();
  });
  el.addEventListener('focus', () => {
    if (!$(`f-${k}`).classList.contains('is-out')) return;
    setTimeout(() => {
      try { el.setSelectionRange(0, el.value.length); } catch { /* 選べないときは何もしない */ }
    }, 0);
  });
});
tidyOnBlur(amountInputs, true);
// クリア：はじめに入っていた値（漂白剤の濃度 6％ など）にもどす
$('clear').addEventListener('click', () => {
  [...ratioInputs, ...amountInputs].forEach((el) => { el.value = el.defaultValue; });
  tileVal = null;
  basis = 'total';
  fitCustom();
  update();
});
enterToNext([...ratioInputs, $('v-total')]);
enterToNext([$('v-conc')]);
enterToNext([$('v-water')]);
fitCustom();
update();
