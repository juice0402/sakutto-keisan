import { parseNum, fmt } from '../lib/number.mjs';
import { peopleRatio, haveRatio, scaleRecipe, rawAmount, parseRecipeText, cleanOcrText } from '../lib/recipe.mjs';
import { $, enterToNext, numericOnly, copyText } from './ui.mjs';
import { readImageText } from './ocr.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

const memo = choiMemo('recipe.png');
const IMG_ROWS = 10; // 画像に書く材料の行（それより多いときは「ほか◯つ」）

const MAX = 20;
const MAX_PLATES = 12; // お皿の絵はここまで（それより多いときは「＋◯」）
const NO_QTY = ['少々', '適量']; // 分量を入れない単位
const ROWS = Array.from({ length: MAX }, (_, i) => i + 1);
const firstUnit = {}; // クリアしたときに戻す単位（ページを開いたときの単位）
let shown = 5;
let matchOn = false;
let lastText = ''; // コピーする文字
let baseKey = ''; // 「どの材料に合わせる？」で自分でえらんだ行（えらんでいなければ、分量を入れた最初の材料）

const val = (id) => parseNum($(id).value);
const visibleRows = () => ROWS.slice(0, shown);
const escText = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const persons = (x) => `${fmt(x, 1)}人分`;

function readRows() {
  return visibleRows().map((n) => ({ name: $(`name-${n}`).value, amount: val(`amt-${n}`), unit: $(`unit-${n}`).value, n }));
}

/* ---- お皿の絵：元の人数のお皿＋ふえたお皿（色つき）／へったお皿（うすく） ---- */
const PLATE =
  '<circle cx="24" cy="24" r="22" class="pl-rim"/><circle cx="24" cy="24" r="16" class="pl-in"/><path class="pl-food" d="M11.5 28.5c0-7.6 5.6-12.5 12.5-12.5s12.5 4.9 12.5 12.5c0 1.2-.9 2-2 2h-21c-1.1 0-2-.8-2-2Z"/><path class="pl-sauce" d="M16 22.5c2.6 2 5.2-1.8 8 0s5.4-1.8 8 0"/>';
function drawPlates(from, to) {
  const a = Math.ceil(from - 1e-9);
  const b = Math.ceil(to - 1e-9);
  const total = Math.max(a, b);
  const shownPlates = Math.min(total, MAX_PLATES);
  let html = '';
  for (let i = 0; i < shownPlates; i++) {
    let cls = 'plate';
    if (i >= b) cls += ' is-off'; // へった分
    else if (i >= a) cls += ' is-new'; // ふえた分
    if (i === b - 1 && to % 1 > 1e-9) cls += ' is-part'; // 2.5人分の「0.5」
    html += `<svg class="${cls}" viewBox="0 0 48 48" style="animation-delay:${Math.min(i, 8) * 40}ms">${PLATE}</svg>`;
  }
  if (total > MAX_PLATES) html += `<span class="plates-more">＋${total - MAX_PLATES}</span>`;
  const box = $('plates');
  if (box.dataset.sig === html) return; // 同じ絵なら描き直さない（入力のたびにお皿が動かないように）
  box.dataset.sig = html;
  box.innerHTML = html;
}

/* ---- 手元の量に合わせる：どの材料に合わせるかの選択肢 ---- */
function refreshBase(rows) {
  const sel = $('base');
  const usable = rows.filter((r) => !NO_QTY.includes(r.unit) && r.amount !== null && !Number.isNaN(r.amount) && r.amount > 0);
  const opts = usable.map((r) => [String(r.n), `${r.name.trim() || `材料${r.n}`}（${rawAmount(r.amount, r.unit)}）`]);
  const sig = JSON.stringify(opts);
  if (sel.dataset.sig !== sig) {
    sel.innerHTML = opts.length
      ? opts.map(([v, t]) => `<option value="${v}">${escText(t)}</option>`).join('')
      : '<option value="">分量を入れた材料がありません</option>';
    sel.dataset.sig = sig;
  }
  if (opts.some(([v]) => v === baseKey)) sel.value = baseKey;
  else if (opts.length) sel.value = opts[0][0];
  sel.disabled = !opts.length;
  const base = usable.find((r) => String(r.n) === sel.value);
  $('have-unit').textContent = base ? base.unit : '';
  return base;
}

function setNote(text = '', error = false) {
  $('r-note').hidden = !text;
  $('r-note').textContent = text;
  $('r-note').classList.toggle('is-error', error);
}

/** 材料の行のすぐ下に、作る人数分の量を出す（list が null なら消す）。少々・適量は出さない */
function showRowOut(list) {
  const by = new Map((list || []).map((x) => [x.n, x]));
  ROWS.forEach((n) => {
    const x = by.get(n);
    const el = $(`out-${n}`);
    if (!x || x.error || NO_QTY.includes(x.unit)) { el.innerHTML = ''; return; }
    el.innerHTML = `→ ${x.approx ? '約' : ''}${escText(x.to)}${x.sub ? `<small>（${escText(x.sub)}）</small>` : ''}`;
  });
}

function showEmpty(title, msg, plates) {
  showRowOut(null);
  $('memo').classList.add('is-empty');
  $('memo-title').textContent = title;
  $('memo-list').innerHTML = '';
  $('memo-empty').hidden = false;
  $('memo-empty').textContent = msg;
  if (plates) drawPlates(plates[0], plates[1]);
  lastText = '';
  refreshCopy();
  memo(null);
}

function update() {
  const rows = readRows();
  const from = val('from');
  const base = refreshBase(rows);
  rows.forEach((r) => $(`f-amt-${r.n}`).classList.toggle('has-error', Number.isNaN(r.amount) || r.amount === 0));

  // 倍率：人数から／手元の量から
  let r;
  if (matchOn) {
    r = base ? haveRatio(base.amount, val('have')) : { ok: false, empty: true };
    $('f-have').classList.toggle('has-error', !!r.error && Number.isNaN(val('have')));
  } else {
    r = peopleRatio(from, val('to'));
  }
  const pr = peopleRatio(from, 1);
  ['from', 'to'].forEach((id) => $(`f-${id}`).classList.toggle('has-error', Number.isNaN(val(id)) || val(id) === 0));
  $('from-minus').disabled = !(from > 1);
  $('to-minus').disabled = !(val('to') > 1);

  if (!pr.ok || !r.ok) {
    $('ratio').innerHTML = '';
    const fromOk = pr.ok ? from : 2;
    if (matchOn) {
      showEmpty('手元の量に合わせた材料', base ? '手元にある量を入れてください' : '先に材料の分量を入れてください', [fromOk, fromOk]);
    } else {
      showEmpty('作る人数分の材料', '人数を入れると、材料の分量が出ます', [fromOk, fromOk]);
    }
    return setNote(pr.error || r.error || '', !!(pr.error || r.error));
  }

  const ratio = r.ratio;
  const to = from * ratio; // 作る人数（手元の量に合わせるときは計算で出る）
  const toText = Math.abs(to - Math.round(to * 10) / 10) > 1e-9 ? `約${persons(to)}` : persons(to);
  drawPlates(from, matchOn ? Math.max(0.5, Math.round(to * 2) / 2) : to);
  const approxRatio = Math.abs(ratio - Math.round(ratio * 100) / 100) > 1e-9;
  const ratioText = `${approxRatio ? '約' : ''}${fmt(ratio, 2)}`;
  $('ratio').innerHTML = `<span class="ratio-pp">${persons(from)} → ${toText}</span><span class="ratio-x">${approxRatio ? '約' : ''}<strong>${fmt(ratio, 2)}</strong>倍</span>`;

  const out = scaleRecipe(rows, ratio);
  const title = matchOn ? `手元の量に合わせた材料（${toText}）` : `${toText}の材料`;
  if (!out.length) {
    showEmpty(title, '材料を入れると、ここに出ます');
    return setNote('');
  }
  showRowOut(out);
  $('memo').classList.remove('is-empty');
  $('memo-title').textContent = title;
  $('memo-empty').hidden = true;
  $('memo-list').innerHTML = out
    .map((x) => {
      if (x.error) return `<li class="memo-row is-error"><span class="memo-name">${escText(x.name)}</span><span class="memo-amt">？</span></li>`;
      const approx = x.approx ? '<small class="memo-approx">約</small>' : '';
      const sub = x.sub ? `<small class="memo-sub">（${x.sub}）</small>` : '';
      return `<li class="memo-row"><span class="memo-name">${escText(x.name)}</span><span class="memo-amt">${approx}${escText(x.to)}${sub}</span></li>`;
    })
    .join('');

  const ok = out.filter((x) => !x.error);
  const lines = [];
  const bad = out.filter((x) => x.error).map((x) => `「${x.name}」`);
  if (bad.length) lines.push(`${bad.join('')}の分量は、0より大きい数字で入れてください。`);
  else if (ok.some((x) => x.approx)) lines.push('「約」は近い量に丸めた目安です。');
  setNote(lines.join(''), bad.length > 0);

  memo(ok.length ? {
    q: `${persons(from)}のレシピを${toText}に`,
    a: `${ok.slice(0, 3).map((x) => `${x.name} ${x.approx ? '約' : ''}${x.to}`).join('・')}${ok.length > 3 ? ' ほか' : ''}`,
    img: () => imgCard({
      title,
      cap: `${persons(from)}のレシピの`,
      num: ratioText,
      unit: '倍',
      rows: ok.slice(0, IMG_ROWS).map((x) => [x.name || '材料', `${x.approx ? '約' : ''}${x.to}`]),
      notes: [ok.length > IMG_ROWS ? `ほか${ok.length - IMG_ROWS}つ` : '', ok.some((x) => x.approx) ? '「約」は近い量に丸めた目安です' : ''].filter(Boolean),
    }),
  } : null);
  lastText = [`【${title}】（${persons(from)}のレシピの${ratioText}倍）`, ...ok.map((x) => `・${x.name}　${x.approx ? '約' : ''}${x.to}${x.sub ? `（${x.sub}）` : ''}`)].join('\n');
  refreshCopy();
}

/* ---- 人数の －／＋ ---- */
function step(id, d) {
  const v = val(id);
  const now = v === null || Number.isNaN(v) ? (id === 'to' ? val('from') || 2 : 2) : v;
  const next = d > 0 ? Math.min(99, Math.floor(now + 1e-9) + 1) : Math.max(1, Math.ceil(now - 1e-9) - 1);
  $(id).value = String(next);
  update();
}
['from', 'to'].forEach((id) => {
  $(`${id}-minus`).addEventListener('click', () => step(id, -1));
  $(`${id}-plus`).addEventListener('click', () => step(id, 1));
});

/* ---- 下の3つのボタン ---- */
function addRow() {
  if (shown >= MAX) return;
  shown += 1;
  $(`row-${shown}`).hidden = false;
  refreshAdd();
  update();
  $(`name-${shown}`).focus();
}
function refreshAdd() {
  const btn = $('to-add');
  btn.disabled = shown >= MAX;
  btn.querySelector('span').textContent = shown >= MAX ? `${MAX}個まで` : '＋材料を追加';
}
function toggleMatch() {
  matchOn = !matchOn;
  $('to-match').setAttribute('aria-pressed', String(matchOn));
  $('f-to').hidden = matchOn;
  $('match').hidden = !matchOn;
  update();
  if (!matchOn) return;
  const first = readRows().find((x) => x.amount === null && !NO_QTY.includes(x.unit));
  if ($('base').disabled && first) $(`amt-${first.n}`).focus();
  else $('have').focus();
}
function refreshCopy() {
  $('to-copy').disabled = !lastText;
}
let copyTimer = 0;
async function copyResult() {
  if (!lastText) return;
  const ok = await copyText(lastText);
  const label = $('to-copy').querySelector('span');
  label.textContent = ok ? 'コピー完了！' : 'コピーできず';
  clearTimeout(copyTimer);
  copyTimer = setTimeout(() => { label.textContent = '結果をコピー'; }, 1800);
}
$('to-add').addEventListener('click', addRow);
$('to-match').addEventListener('click', toggleMatch);
$('to-copy').addEventListener('click', copyResult);

/* ---- レシピの文字を貼り付けて入力（読み取りは端末の中だけ。どこにも送らない） ---- */
function showPasteMsg(text, error = false) {
  $('paste-msg').hidden = !text;
  $('paste-msg').textContent = text;
  $('paste-msg').classList.toggle('is-error', error);
}
/** 読み取った材料を start 行目から入れる。all：ほかの行は空にする（貼り付け欄から） */
function fillRows(parsed, start, all, quiet) {
  const items = parsed.rows.slice(0, MAX - start + 1);
  items.forEach((r, i) => {
    const n = start + i;
    if (r.name || all) $(`name-${n}`).value = r.name;
    $(`unit-${n}`).value = r.unit;
    syncUnit(n);
    $(`amt-${n}`).value = r.amount === null ? '' : String(r.amount);
  });
  const last = start + items.length - 1;
  if (all) {
    for (let n = last + 1; n <= MAX; n++) {
      $(`name-${n}`).value = '';
      $(`amt-${n}`).value = '';
      $(`unit-${n}`).value = firstUnit[n];
      syncUnit(n);
    }
  }
  shown = Math.max(all ? 5 : shown, last);
  ROWS.forEach((n) => { $(`row-${n}`).hidden = n > shown; });
  refreshAdd();
  if (parsed.people) $('from').value = String(parsed.people);
  baseKey = '';
  update();
  if (quiet) return;
  const msg = [`${items.length}個の材料を入れました${parsed.people ? `（${persons(parsed.people)}）` : ''}`];
  if (parsed.rows.length > items.length) msg.push(`${MAX}個をこえた${parsed.rows.length - items.length}個は入れていません`);
  if (parsed.skipped.length) msg.push(`読めなかった行：${parsed.skipped.slice(0, 3).join('、')}${parsed.skipped.length > 3 ? ' など' : ''}`);
  showPasteMsg(msg.join('\n'));
}
function togglePaste(open = $('paste').hidden) {
  $('paste').hidden = !open;
  $('to-paste').setAttribute('aria-pressed', String(open));
  if (!open) return;
  showPasteMsg('');
  // 開いたときは入力欄にフォーカスしない（キーボードで写真のボタンが隠れないように）
}
function pasteFromBox() {
  const text = $('paste-text').value;
  if (!text.trim()) return showPasteMsg('レシピの材料の文字を貼り付けてください。', true);
  const parsed = parseRecipeText(text);
  if (!parsed.rows.length) return showPasteMsg('材料と分量を読み取れませんでした。', true);
  fillRows(parsed, 1, true, false);
  $('paste-text').value = '';
  ocrStatus('', null);
  $('crop').hidden = true;
  togglePaste(false);
}
// 写真・スクショから読み取る（端末の中だけ）→ 読み取った文字を貼り付け欄に出して、直してから入れてもらう
// progress が null のとき（読み取りが終わったとき）は進み具合のバーを消す
function ocrStatus(text, progress, error = false) {
  $('ocr-status').hidden = !text;
  $('ocr-status').classList.toggle('is-error', error);
  $('ocr-status').classList.toggle('is-done', progress === null);
  $('ocr-text').textContent = text;
  $('ocr-fill').style.width = `${Math.round(Math.max(0, Math.min(1, progress || 0)) * 100)}%`;
}
// 写真をえらんだら、読み取る範囲をえらんでもらう（四すみの丸を動かす。最初は写真全体）
let photoFile = null;
let photoUrl = '';
let dragCorner = '';
const cropBox = { x0: 0, y0: 0, x1: 1, y1: 1 };
function drawCrop() {
  const b = $('crop-box').style;
  b.left = `${cropBox.x0 * 100}%`;
  b.top = `${cropBox.y0 * 100}%`;
  b.width = `${(cropBox.x1 - cropBox.x0) * 100}%`;
  b.height = `${(cropBox.y1 - cropBox.y0) * 100}%`;
}
function choosePhoto() {
  const file = $('photo').files && $('photo').files[0];
  $('photo').value = ''; // 同じ写真をもう一度えらべるように
  if (!file) return;
  photoFile = file;
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  $('crop-img').src = photoUrl;
  Object.assign(cropBox, { x0: 0, y0: 0, x1: 1, y1: 1 });
  drawCrop();
  $('crop').hidden = false;
  $('crop').scrollIntoView({ block: 'start' }); // 範囲をえらぶ画面を見えるところに
  $('photo-btn').querySelector('span').textContent = 'ほかの写真をえらぶ';
  showPasteMsg('');
  ocrStatus('', null);
}
$('crop-img').addEventListener('error', () => {
  if (!photoFile) return;
  $('crop').hidden = true;
  photoFile = null;
  ocrStatus('この写真は開けませんでした。', null, true);
});
document.querySelectorAll('.crop-h').forEach((h) => {
  h.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dragCorner = h.dataset.h;
    h.setPointerCapture(e.pointerId);
  });
  h.addEventListener('pointermove', (e) => {
    if (!dragCorner) return;
    const r = $('crop-img').getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const fy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const MIN = 0.08; // 小さくなりすぎないように
    if (dragCorner.includes('w')) cropBox.x0 = Math.min(fx, cropBox.x1 - MIN);
    if (dragCorner.includes('e')) cropBox.x1 = Math.max(fx, cropBox.x0 + MIN);
    if (dragCorner.includes('n')) cropBox.y0 = Math.min(fy, cropBox.y1 - MIN);
    if (dragCorner.includes('s')) cropBox.y1 = Math.max(fy, cropBox.y0 + MIN);
    drawCrop();
  });
  ['pointerup', 'pointercancel'].forEach((t) => h.addEventListener(t, () => { dragCorner = ''; }));
});
async function readPhoto() {
  const file = photoFile;
  if (!file) return;
  $('crop-go').disabled = true;
  $('photo').disabled = true;
  $('photo-btn').classList.add('is-busy');
  showPasteMsg('');
  ocrStatus('読み取りの準備中…', 0.02);
  try {
    const raw = await readImageText(
      file,
      (p, reading) => {
        ocrStatus(reading ? `文字を読み取り中… ${Math.round(p * 100)}%` : '読み取りの準備中…', p);
      },
      { ...cropBox },
    );
    const text = cleanOcrText(raw);
    $('paste-text').value = text;
    const found = parseRecipeText(text).rows.length;
    if (found) ocrStatus(`材料が${found}個見つかりました`, null);
    else ocrStatus('材料が見つかりませんでした。', null, true);
    $('paste-text').scrollIntoView({ block: 'center' });
  } catch {
    ocrStatus('読み取れませんでした。もう一度ためしてください。', null, true);
  } finally {
    $('crop-go').disabled = false;
    $('photo').disabled = false;
    $('photo-btn').classList.remove('is-busy');
  }
}
$('photo').addEventListener('change', choosePhoto);
$('crop-go').addEventListener('click', readPhoto);
$('to-paste').addEventListener('click', () => togglePaste());
$('paste-go').addEventListener('click', pasteFromBox);
$('paste-text').addEventListener('paste', () => setTimeout(pasteFromBox, 0)); // 貼り付けたらすぐ入れる
// 材料の欄に「鶏もも肉 300g」や何行ものレシピを貼ったときも、読み取って入れる（読めないときはふつうに貼る）
ROWS.forEach((n) =>
  [$(`name-${n}`), $(`amt-${n}`)].forEach((el) =>
    el.addEventListener('paste', (e) => {
      const text = e.clipboardData ? e.clipboardData.getData('text') : '';
      const parsed = parseRecipeText(text);
      if (!parsed.rows.length) return;
      e.preventDefault();
      const multi = /\n/.test(text.trim());
      fillRows(parsed, n, false, !multi && parsed.rows.length === 1);
    }),
  ),
);

/* ---- 入力 ---- */
const numInputs = [$('from'), $('to'), $('have'), ...ROWS.map((n) => $(`amt-${n}`))];
numericOnly(numInputs);
[...numInputs, ...ROWS.map((n) => $(`name-${n}`))].forEach((el) => el.addEventListener('input', update));
// 「少々」「適量」は分量を入れないので、分量の欄を使えなくする
function syncUnit(n) {
  const none = NO_QTY.includes($(`unit-${n}`).value);
  const amt = $(`amt-${n}`);
  amt.disabled = none;
  if (none) amt.value = '';
  amt.placeholder = none ? '－' : amt.dataset.ph;
}
ROWS.forEach((n) => {
  firstUnit[n] = $(`unit-${n}`).value;
  $(`amt-${n}`).dataset.ph = $(`amt-${n}`).placeholder;
  $(`unit-${n}`).addEventListener('change', () => {
    syncUnit(n);
    update();
  });
});
$('base').addEventListener('change', () => {
  baseKey = $('base').value;
  update();
});
$('clear').addEventListener('click', () => {
  ROWS.forEach((n) => {
    $(`name-${n}`).value = '';
    $(`amt-${n}`).value = '';
    $(`unit-${n}`).value = firstUnit[n];
    syncUnit(n);
  });
  $('have').value = '';
  baseKey = '';
  showPasteMsg('');
  update();
  $('name-1').focus();
});
enterToNext([$('from'), $('to'), $('have'), ...ROWS.flatMap((n) => [$(`name-${n}`), $(`amt-${n}`)])]);
// ページを戻ったときにブラウザが入力を残していても、単位と表示を合わせる
ROWS.forEach(syncUnit);
refreshAdd();
update();
