import { parseNum, fmt } from '../lib/number.mjs';
import { genbaPlan, genbaPrices, genbaEstimate, genbaToiletMl, genbaRowHtml, genbaBlank, hmToMin, minToHm, GENBA_KINDS, GENBA_SITES_MAX, GENBA_ROWS_MAX, GENBA_NAME_MAX } from '../lib/genba.mjs';
import { minText } from '../lib/seisou.mjs';
import { volumeText } from '../lib/kishaku.mjs';
import { ROUMU_TANKA, SEISOU_KEIHI } from '../data/seisou-tanka.mjs';
import { $, numericOnly } from './ui.mjs';
import { choiMemo } from './choimemo.mjs';
import { imgCard } from './share-img.mjs';

// 現場手帳：現場（場所と面積・人数・はじめとおわり）から時間割と作業計画書。現場はこの端末の localStorage だけに10件まで（送らない）
// 保存は、自分で入れたりえらんだりしたときだけ（開いただけでは書かない）
const gbMemo = choiMemo('genba.png');
const GB_KEY = 'sakutto-genba';
const GB_PRICES = genbaPrices(ROUMU_TANKA.average, SEISOU_KEIHI);
const GB_SCALE_H = 170; // 時間割の帯の高さの目安（px）
const gbBook = gbLoad();
const gbSite = () => gbBook.sites[gbBook.cur];

/** 保存した現場を読む（形がちがうものは直す。読めないときは、はじめの現場） */
function gbLoad() {
  try {
    const v = JSON.parse(localStorage.getItem(GB_KEY) || 'null');
    if (v && Array.isArray(v.sites) && v.sites.length) {
      const sites = v.sites.slice(0, GENBA_SITES_MAX).map((s, i) => gbClean(s, i + 1));
      return { cur: Math.min(Math.max(0, Number(v.cur) || 0), sites.length - 1), sites };
    }
  } catch { /* 読めないときは、はじめから */ }
  return { cur: 0, sites: [genbaBlank(1)] };
}
function gbClean(s, n) {
  const b = genbaBlank(n);
  const str = (x, max = 16) => (typeof x === 'string' ? x.slice(0, max) : '');
  const rows = Array.isArray(s.rows) ? s.rows.filter((r) => r && GENBA_KINDS.some((k) => k.id === r.kind)).slice(0, GENBA_ROWS_MAX) : b.rows;
  return {
    name: str(s.name, GENBA_NAME_MAX) || b.name,
    rows: rows.map((r) => ({ kind: r.kind, name: str(r.name, GENBA_NAME_MAX), area: str(r.area), speed: str(r.speed), min: str(r.min) })),
    people: str(s.people),
    start: str(s.start, 5),
    end: str(s.end, 5),
    year: [260, 52, 24, 12].includes(s.year) ? s.year : 260,
    water: str(s.water, 5),
    printed: Number.isInteger(s.printed) && s.printed > 0 ? s.printed : 0,
    first: str(s.first, 10),
  };
}
function gbSave() {
  try { localStorage.setItem(GB_KEY, JSON.stringify(gbBook)); } catch { /* 保存できない端末では何もしない */ }
}

const gbH = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/* ---- 現場の名前の並び：えらんでいる現場は名前を書きかえられる欄（下線）、ほかは押すとその現場へ ---- */
function gbDrawSites() {
  const box = $('gb-sites');
  const input = $('site-name');
  const label = box.querySelector('label');
  box.querySelectorAll('.gb-site').forEach((b) => b.remove());
  gbBook.sites.forEach((s, i) => {
    if (i === gbBook.cur) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gb-site';
    b.dataset.site = String(i);
    b.textContent = s.name;
    box.insertBefore(b, i < gbBook.cur ? label : $('gb-add-site'));
  });
  input.value = gbSite().name;
  $('gb-add-site').hidden = gbBook.sites.length >= GENBA_SITES_MAX;
}

/* ---- 場所の行 ---- */
function gbDrawRows() {
  const rows = gbSite().rows;
  $('gb-rows').innerHTML = rows.map(genbaRowHtml).join('');
  numericOnly([...$('gb-rows').querySelectorAll('.gb-num')]);
  $('gb-add').hidden = rows.length >= GENBA_ROWS_MAX;
  $('gb-kinds').hidden = true;
}

function gbFill() {
  const s = gbSite();
  $('people').value = s.people;
  $('start').value = s.start;
  $('end').value = s.end;
  $('water').value = s.water;
  gbDrawSites();
  gbDrawRows();
  gbUpdate();
}

const gbRowsNum = () => gbSite().rows.map((r) => ({ kind: r.kind, name: r.name, area: parseNum(r.area), speed: parseNum(r.speed), min: parseNum(r.min) }));

/** 答えの下の案内：まだ入れていない欄のうち、いちばん上の欄 */
function gbGuide(rows, people, start, end) {
  if (!rows.length) return '場所を足してください';
  const filled = rows.filter((r) => (r.kind === 'time' ? r.min !== null : r.area !== null));
  if (!filled.length) return `${rows[0].name || '場所'}の${rows[0].kind === 'time' ? '時間' : '面積'}を入れてください`;
  const own = filled.find((r) => r.kind === 'own' && r.speed === null);
  if (own) return '1人1時間の面積を入れてください';
  if (filled.some((r) => r.kind !== 'time') && people === null) return '人数を入れてください';
  if (start === null) return 'はじめの時刻を入れてください';
  if (end === null) return 'おわりの時刻を入れてください';
  return '';
}

/** 時間割の帯（高さは分に比例。色は付箋の3色を順に）。おわりをこえるときは、おわりの線を帯の中に引く */
function gbBands(res, end) {
  if (!res.ok) return '';
  const span = res.span || 0;
  const scale = Math.min(1.2, Math.max(0.35, GB_SCALE_H / Math.max(res.total, span, 1)));
  const tone = ['tt-c1', 'tt-c2', 'tt-c3'];
  let html = res.items.map((x, n) => {
    const h = Math.max(30, Math.round(x.minutes * scale));
    let line = '';
    if (res.free !== null && res.free < 0 && x.from !== undefined) {
      const endAbs = x.from <= end ? end : end + 1440;
      if (endAbs > x.from && endAbs <= x.to) line = `<i class="tt-end" style="top:${(((endAbs - x.from) / x.minutes) * 100).toFixed(1)}%"><span>${minToHm(end)}</span></i>`;
    }
    return `<div class="tt-row"><span class="tt-time">${x.from === undefined ? '' : minToHm(x.from)}</span><div class="tt-band ${tone[n % 3]}" style="height:${h}px"><span class="tt-name">${gbH(x.name || '場所')}</span><span class="tt-min">${minText(x.minutes)}</span>${line}</div></div>`;
  }).join('');
  const freeH = res.free > 0 ? Math.max(40, Math.round(res.free * scale)) : 40;
  const freeText = res.free === null ? '' : res.free >= 0 ? `空き ${minText(res.free)}` : '';
  html += `<div class="tt-row"><span class="tt-time">${res.finish === null ? '' : minToHm(res.finish)}</span><div class="tt-free" style="height:${freeH}px"><span>${freeText}</span><button type="button" class="gb-add tt-add" id="gb-add2">＋場所を足す</button></div></div>`;
  if (res.free !== null && res.free >= 0) html += `<div class="tt-row tt-last"><span class="tt-time">${minToHm(end)}</span></div>`;
  return html;
}

function gbUpdate() {
  const s = gbSite();
  const rows = gbRowsNum();
  const people = parseNum(s.people);
  const start = hmToMin(s.start);
  const end = hmToMin(s.end);
  const res = genbaPlan({ rows, people, start, end });
  // まちがい
  document.querySelectorAll('#calc .has-error').forEach((el) => el.classList.remove('has-error'));
  if (res.field === 'row') $(`f-row-${res.row}`)?.classList.add('has-error');
  else if (res.field) $(`f-${res.field}`)?.classList.add('has-error');
  $('r-note').hidden = !res.error;
  $('r-note').textContent = res.error || '';
  $('r-note').classList.toggle('is-error', !!res.error);
  // 時間割
  $('tt-bands').innerHTML = gbBands(res, end);
  $('tt-total').textContent = res.ok ? `かかる ${minText(res.total)}` : 'かかる ？';
  const over = res.ok && res.free !== null && res.free < 0;
  $('tt-free').textContent = !res.ok || res.free === null ? '' : over ? `${minText(-res.free)}こえます` : `空き ${minText(res.free)}`;
  $('tt-free').classList.toggle('is-over', over);
  const guide = res.error ? '' : gbGuide(rows, people, start, end);
  $('r-foot').textContent = guide;
  $('r-foot').hidden = !guide;
  // 作業計画書
  $('d-site').textContent = s.name;
  const cond = [people && people > 0 ? `${fmt(people)}人` : '', start !== null && !Number.isNaN(start) ? `${minToHm(start)}〜${end !== null && !Number.isNaN(end) ? minToHm(end) : ''}` : ''].filter(Boolean).join('・');
  $('d-cond').textContent = cond;
  $('r-num').textContent = res.ok ? minText(res.total) : '？';
  $('d-rows').innerHTML = res.ok
    ? res.items.map((x) => `<tr><td>${x.from === undefined ? '—' : minToHm(x.from)}</td><td>${gbH(x.name || '場所')}</td><td>${x.area === null ? '—' : `${fmt(x.area)}㎡`}</td><td>${minText(x.minutes)}</td></tr>`).join('')
    : '<tr><td>—</td><td>—</td><td>—</td><td>—</td></tr>';
  $('d-free').textContent = !res.ok || res.free === null ? '' : over ? `${minText(-res.free)}こえます` : `空き ${minText(res.free)}`;
  $('d-free').classList.toggle('is-over', over);
  $('d-end').textContent = res.ok && res.finish !== null ? `おわり ${minToHm(res.finish)}` : '';
  // トイレの消毒液（トイレの行があるときだけ）
  $('d-toilet').hidden = !s.rows.some((r) => r.kind === 'toilet');
  const ml = genbaToiletMl(parseNum(s.water));
  $('d-ml').textContent = ml === null ? '？' : volumeText(ml);
  // 見積もりの目安
  const est = genbaEstimate(rows, GB_PRICES, s.year);
  $('e-once').textContent = est.ok ? `${fmt(est.once)}円` : '—';
  $('e-month').textContent = est.ok ? `${fmt(est.month)}円` : '—';
  $('e-skip').hidden = !est.skipped;
  document.querySelectorAll('#gb-kai [data-year]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.year) === s.year)));
  gbDrawCount();
  gbMemo(res.ok ? {
    q: `${s.name}${people ? ` ${fmt(people)}人` : ''}`,
    a: minText(res.total),
    img: () => imgCard({
      title: '作業計画書',
      cap: `${s.name} かかる時間`,
      num: minText(res.total),
      sub: res.finish !== null ? `${minToHm(start)}〜${minToHm(res.finish)}${res.free !== null ? (over ? `・${minText(-res.free)}こえます` : `・空き ${minText(res.free)}`) : ''}` : '',
      rows: res.items.slice(0, 8).map((x) => [`${x.from === undefined ? '' : `${minToHm(x.from)} `}${x.name || '場所'}`, minText(x.minutes)]),
      notes: est.ok ? [`見積もりの目安 1回 ${fmt(est.once)}円`] : [],
    }),
  } : null);
}

/* ---- 計画書の枚数（印刷・画像で送るを押した数。この現場の記録） ---- */
function gbDrawCount() {
  const s = gbSite();
  const p = $('gb-count');
  p.hidden = !s.printed;
  if (s.printed) p.textContent = `この現場の計画書は${s.printed}枚です。はじめは${s.first.replace(/^\d+-0?(\d+)-0?(\d+)$/, '$1月$2日')}。`;
}
function gbCountUp() {
  const s = gbSite();
  if (!$('r-num').textContent || $('r-num').textContent === '？') return;
  s.printed += 1;
  if (!s.first) {
    const d = new Date();
    s.first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  gbSave();
  gbDrawCount();
}

/* ---- 入力 ---- */
const GB_FIELD = { nm: 'name', ar: 'area', sp: 'speed', mn: 'min' };
$('gb-rows').addEventListener('input', (e) => {
  const m = e.target.id.match(/^(nm|ar|sp|mn)-(\d+)$/);
  if (!m) return;
  gbSite().rows[Number(m[2])][GB_FIELD[m[1]]] = e.target.value;
  gbSave();
  gbUpdate();
});
[['people', 'people'], ['start', 'start'], ['end', 'end'], ['water', 'water']].forEach(([id, key]) => {
  $(id).addEventListener('input', () => {
    gbSite()[key] = $(id).value;
    gbSave();
    gbUpdate();
  });
});
numericOnly([$('people'), $('water')]);
$('site-name').addEventListener('input', () => {
  gbSite().name = $('site-name').value;
  $('d-site').textContent = $('site-name').value;
  gbSave();
});
$('site-name').addEventListener('blur', () => {
  if (!$('site-name').value.trim()) {
    gbSite().name = `現場${gbBook.cur + 1}`;
    $('site-name').value = gbSite().name;
    gbSave();
    gbUpdate();
  }
});

/* ---- 現場をえらぶ・足す ---- */
$('gb-sites').addEventListener('click', (e) => {
  const b = e.target.closest('.gb-site');
  if (!b) return;
  gbBook.cur = Number(b.dataset.site);
  gbSave();
  gbFill();
});
$('gb-add-site').addEventListener('click', () => {
  if (gbBook.sites.length >= GENBA_SITES_MAX) return;
  gbBook.sites.push(genbaBlank(gbBook.sites.length + 1));
  gbBook.cur = gbBook.sites.length - 1;
  gbSave();
  gbFill();
  $('site-name').focus();
  $('site-name').select();
});

/* ---- 場所を足す・消す ---- */
function gbOpenKinds() {
  const k = $('gb-kinds');
  k.hidden = !k.hidden;
  if (!k.hidden) k.querySelector('button').focus({ preventScroll: true });
  if (!k.hidden) k.scrollIntoView({ block: 'nearest' });
}
$('gb-add').addEventListener('click', gbOpenKinds);
$('tt-bands').addEventListener('click', (e) => { if (e.target.closest('#gb-add2')) { $('gb-kinds').hidden = true; gbOpenKinds(); } });
$('gb-kinds').addEventListener('click', (e) => {
  const b = e.target.closest('[data-kind]');
  if (!b) return;
  const k = GENBA_KINDS.find((x) => x.id === b.dataset.kind);
  const rows = gbSite().rows;
  if (rows.length >= GENBA_ROWS_MAX) return;
  rows.push({ kind: k.id, name: k.name, area: '', speed: '', min: '' });
  gbSave();
  gbDrawRows();
  gbUpdate();
  const i = rows.length - 1;
  ($(`sp-${i}`) || $(`ar-${i}`) || $(`mn-${i}`)).focus();
});
$('gb-rows').addEventListener('click', (e) => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  gbSite().rows.splice(Number(b.dataset.del), 1);
  gbSave();
  gbDrawRows();
  gbUpdate();
});

/* ---- 回数・クリア・印刷・画像で送る ---- */
$('gb-kai').addEventListener('click', (e) => {
  const b = e.target.closest('[data-year]');
  if (!b) return;
  gbSite().year = Number(b.dataset.year);
  gbSave();
  gbUpdate();
});
const gbIsBlank = (s) => !s.people && !s.start && !s.end && s.rows.every((r) => !r.area && !r.speed && !r.min);
$('clear').addEventListener('click', () => {
  const s = gbSite();
  if (gbIsBlank(s) && gbBook.sites.length > 1) {
    // 空の現場でもう一度押すと、その現場を消す
    gbBook.sites.splice(gbBook.cur, 1);
    gbBook.cur = Math.max(0, gbBook.cur - 1);
  } else {
    const b = genbaBlank(gbBook.cur + 1);
    gbBook.sites[gbBook.cur] = { ...b, name: s.name, year: s.year, water: s.water, printed: s.printed, first: s.first };
  }
  gbSave();
  gbFill();
});
$('gb-print').addEventListener('click', () => {
  gbCountUp();
  window.print();
});
$('cm-share')?.addEventListener('click', gbCountUp);

/* ---- Enter：名前 → その行の数字、数字 → 次の行の数字 → 人数 → はじめ → おわり ---- */
$('calc').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || e.isComposing || e.target.tagName !== 'INPUT') return;
  e.preventDefault();
  const el = e.target;
  let next = null;
  if (el.classList.contains('gb-name')) next = el.closest('.gb-row').querySelector('.gb-num');
  else if (el.id === 'site-name') next = $('gb-rows').querySelector('.gb-num');
  else {
    const order = [...$('gb-rows').querySelectorAll('.gb-num'), $('people'), $('start'), $('end')];
    const at = order.indexOf(el);
    if (at >= 0) next = order[at + 1] || null;
  }
  if (next) next.focus();
  else el.blur();
});

gbFill();
