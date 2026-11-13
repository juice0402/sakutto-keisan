import { KONDATE_KEY, KONDATE_RULES, KONDATE_DOW, KONDATE_BY_ID, kondateMonday, kondateDayIndex, kondateAddDays, kondateWeekDates, kondateFrom, kondateMakeWeek, kondateSwap, kondateShopping, kondateParse, kondateStringify, kondateWeekLabel, kondateBuyMemo, kondatePastWeeks } from '../lib/kondate.mjs';
import { $ } from './ui.mjs';
import { memoOnly } from './choimemo.mjs';

// 晩ごはんシミュレーター：曜日の決まり・冷蔵庫・苦手・週ごとの献立を、この端末の localStorage（sakutto-kondate）だけに残す（送らない）
// 保存は、押したりえらんだりしたときだけ（開いただけでは書かない）
const kcToday = new Date();
const kcThis = kondateMonday(kcToday);
const kcNextWeek = kondateAddDays(kcThis, 7);
const kcData = kcLoad();
const kcWhy = {}; // 週ごとの、料理が選べなかった理由（残さない）
const kcSetMemo = memoOnly();
const kcMemoOk = !$('cm-bar').hidden;
const kcMove = () => !matchMedia('(prefers-reduced-motion: reduce)').matches;
const KC_RULE_CLS = { 肉: 'r-niku', 魚: 'r-sakana', おまかせ: 'r-omakase', 作らない: 'r-off' };
let kcView = kcThis;

function kcLoad() {
  try {
    return kondateParse(localStorage.getItem(KONDATE_KEY));
  } catch {
    return kondateParse('');
  }
}
function kcSave() {
  try { localStorage.setItem(KONDATE_KEY, kondateStringify(kcData)); } catch { /* 保存できない端末では何もしない */ }
}
const kcWeek = () => kcData.weeks[kcView] || { dishes: Array(7).fill(null), locked: Array(7).fill(false) };
const kcFrom = () => kondateFrom(kcView, kcToday);
const kcArgs = () => ({ routine: kcData.routine, fridge: kcData.fridge, ng: kcData.ng, from: kcFrom(), rand: Math.random });

/** 1マスの中身 */
function kcCell(i, w, from, dates, have) {
  const past = i < from;
  const rule = kcData.routine[i];
  const x = w.dishes[i] ? KONDATE_BY_ID.get(w.dishes[i]) : null;
  const lock = Boolean(x && w.locked[i]);
  const cls = ['kb-cell', i === 5 ? 'is-sat' : '', i === 6 ? 'is-sun' : '', kcView === kcThis && i === kondateDayIndex(kcToday) ? 'is-today' : '', past ? 'is-past' : ''].filter(Boolean).join(' ');
  const rt = ['km-rt', KC_RULE_CLS[rule]].filter(Boolean).join(' ');
  const opts = KONDATE_RULES.map((r) => `<option${r === rule ? ' selected' : ''}>${r}</option>`).join('');
  let dish;
  if (rule === '作らない') dish = '<button type="button" class="kb-dish is-off" disabled><b>作らない</b></button>';
  else if (x) dish = `<button type="button" class="kb-dish" data-i="${i}"${past ? ' disabled' : ''}><b>${x.name}</b><small>${x.ings.map((g) => `<span class="nw">${have.has(g) ? `<mark>${g}</mark>` : g}</span>`).join('・<wbr>')}</small></button>`;
  else if (kcWhy[kcView]?.[i]) dish = `<p class="kb-why">${kcWhy[kcView][i]}</p>`;
  else dish = '<button type="button" class="kb-dish" disabled></button>';
  return `<div class="${cls}"><div class="kb-top"><button type="button" class="kb-dow" data-i="${i}" aria-pressed="${lock}"${!x || past ? ' disabled' : ''}><b class="d">${KONDATE_DOW[i]}</b><small>${dates[i]}</small></button><label class="${rt}"><span>${rule}</span><select data-i="${i}" aria-label="${KONDATE_DOW[i]}曜の決まり"${past ? ' disabled' : ''}>${opts}</select></label></div>${dish}</div>`;
}

/** 手帳を書き直す。write：書きこまれていく動きをつける日 */
function kcDraw(write = []) {
  const w = kcWeek();
  const from = kcFrom();
  const dates = kondateWeekDates(kcView);
  const have = new Set(kcData.fridge);
  const box = $('kb-week');
  const buyCell = box.querySelector('.kb-buy');
  box.querySelectorAll('.kb-cell:not(.kb-buy)').forEach((c) => c.remove());
  buyCell.insertAdjacentHTML('beforebegin', KONDATE_DOW.map((_, i) => kcCell(i, w, from, dates, have)).join(''));
  if (kcMove()) {
    write.forEach((day, k) => {
      const el = box.querySelectorAll('.kb-cell')[day].querySelector('.kb-dish');
      if (!el) return;
      el.style.setProperty('--d', `${(k * 0.32).toFixed(2)}s`);
      el.classList.add('is-write');
    });
  }
  $('kb-wk').textContent = kondateWeekLabel(kcView);
  // 買うもの（今週は今日から先の日だけ）
  const list = kondateShopping(w.dishes, kcData.fridge, from);
  const made = w.dishes.some((id, i) => id && i >= from);
  const buy = $('kb-buy');
  buy.textContent = '';
  if (list.length) {
    list.forEach((x, k) => {
      if (k) buy.append('・', document.createElement('wbr'));
      const s = document.createElement('span');
      s.className = 'nw';
      s.textContent = x.ing;
      buy.append(s);
    });
  } else buy.textContent = made ? 'ありません' : '「1週間をつくる」を押すと出ます';
  $('kb-buy-n').textContent = list.length ? `${list.length}つ` : '';
  if (kcMemoOk) $('cm-bar').hidden = !list.length;
  kcSetMemo(kondateBuyMemo(kcView, from, list));
  $('kb-turn').textContent = kcView === kcThis ? '来週の手帳へ' : '今週の手帳へ';
}

/** 冷蔵庫と苦手の印 */
function kcDrawIngs() {
  const fr = new Set(kcData.fridge);
  const ng = new Set(kcData.ng);
  $('km-fridge').querySelectorAll('.km-ing').forEach((b) => b.setAttribute('aria-pressed', String(fr.has(b.textContent))));
  $('km-ngl').querySelectorAll('.km-ing').forEach((b) => b.setAttribute('aria-pressed', String(ng.has(b.textContent))));
  $('km-ng-now').textContent = kcData.ng.length ? kcData.ng.join('・') : 'なし';
}

/** これまでの献立（今週より前。4週より前は details の中） */
function kcDrawPast() {
  const past = kondatePastWeeks(kcData.weeks, kcThis);
  $('km-past').hidden = !past.length;
  if (!past.length) return;
  $('km-past-n').textContent = `${past.length}週・${past.reduce((n, x) => n + x.count, 0)}品`;
  const row = (x) => `<p><span>${x.label}</span>${x.names.join('・')}</p>`;
  const more = past.slice(4);
  $('km-past-list').innerHTML = past.slice(0, 4).map(row).join('') + (more.length ? `<details><summary>もっと前の${more.length}週</summary>${more.map(row).join('')}</details>` : '');
}

function kcStore(res) {
  kcData.weeks[kcView] = { dishes: res.dishes, locked: res.locked };
  kcSave();
}

// 1週間をつくる：とめた日・過ぎた日・作らない日のほかを選ぶ
$('kb-make').addEventListener('click', () => {
  const res = kondateMakeWeek({ ...kcArgs(), week: kcData.weeks[kcView] || null });
  kcWhy[kcView] = res.reasons;
  kcStore(res);
  const from = kcFrom();
  kcDraw(res.dishes.map((id, i) => (id && i >= from && !res.locked[i] ? i : -1)).filter((i) => i >= 0));
});

$('kb-week').addEventListener('click', (e) => {
  const dow = e.target.closest('.kb-dow');
  const dish = e.target.closest('.kb-dish');
  const w = kcWeek();
  if (dow && !dow.disabled) {
    // 曜日を押すと、とめる（もう一度押すと外す）
    const i = Number(dow.dataset.i);
    if (!w.dishes[i]) return;
    const locked = w.locked.slice();
    locked[i] = !locked[i];
    kcStore({ dishes: w.dishes, locked });
    kcDraw();
  } else if (dish && !dish.disabled && dish.dataset.i) {
    // 料理を押すと、その日だけ入れかえ（とめた日は入れかえない）
    const i = Number(dish.dataset.i);
    const res = kondateSwap({ ...kcArgs(), week: w, day: i });
    if (!res.changed) return;
    kcStore(res);
    kcDraw([i]);
  }
});

// 付箋で決まりを変える：その日を新しい決まりで選び直す（とめていたら外す。作らないなら空に）
$('kb-week').addEventListener('change', (e) => {
  const sel = e.target.closest('select');
  if (!sel) return;
  const i = Number(sel.dataset.i);
  kcData.routine[i] = sel.value;
  const w = kcWeek();
  const dishes = w.dishes.slice();
  const locked = w.locked.slice();
  locked[i] = false;
  dishes[i] = null;
  if (kcWhy[kcView]) kcWhy[kcView][i] = null;
  let write = [];
  // まだ料理のない週は、決まりを覚えるだけ
  if (sel.value !== '作らない' && w.dishes.some(Boolean)) {
    const res = kondateMakeWeek({ ...kcArgs(), week: { dishes, locked: locked.map((l, j) => j !== i) } });
    dishes[i] = res.dishes[i];
    if (!kcWhy[kcView]) kcWhy[kcView] = Array(7).fill(null);
    kcWhy[kcView][i] = res.reasons[i];
    if (dishes[i]) write = [i];
  }
  if (w.dishes.some(Boolean) || kcData.weeks[kcView]) kcData.weeks[kcView] = { dishes, locked };
  kcSave();
  kcDraw(write);
});

// 来週の手帳へ／今週の手帳へ：ページをめくるように横へ
$('kb-turn').addEventListener('click', () => {
  const fwd = kcView === kcThis;
  kcView = fwd ? kcNextWeek : kcThis;
  kcDraw();
  const box = $('kb-week');
  if (!kcMove()) return;
  box.classList.remove('is-flip', 'is-flip-back');
  void box.offsetWidth;
  box.classList.add(fwd ? 'is-flip' : 'is-flip-back');
});

// 冷蔵庫にあるもの（押すと赤ペンの丸）・苦手なもの（押すと赤い線）
function kcToggle(list, name) {
  const at = list.indexOf(name);
  if (at >= 0) list.splice(at, 1);
  else list.push(name);
}
$('km-fridge').addEventListener('click', (e) => {
  const b = e.target.closest('.km-ing');
  if (!b) return;
  kcToggle(kcData.fridge, b.textContent);
  kcSave();
  kcDrawIngs();
  kcDraw();
});
$('km-ngl').addEventListener('click', (e) => {
  const b = e.target.closest('.km-ing');
  if (!b) return;
  kcToggle(kcData.ng, b.textContent);
  kcSave();
  kcDrawIngs();
});
$('km-fr-clear').addEventListener('click', () => {
  if (!kcData.fridge.length) return;
  kcData.fridge.length = 0;
  kcSave();
  kcDrawIngs();
  kcDraw();
});

kcDraw();
kcDrawIngs();
kcDrawPast();
