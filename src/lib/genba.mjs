import { fix } from './number.mjs';
import { SEISOU_WORKS, minText } from './seisou.mjs';
import { mitsuMeyasu } from './mitsumori.mjs';
import { hyohakuAmount } from '../data/hyohakuzai.mjs';

// 現場手帳（ブラウザとテストの両方で使う）：場所ごとの面積と人数から時間割と作業計画書を作る
// 場所の時間 ＝ 面積 ÷（1人1時間の面積 × 人数）を1分単位で切り上げ（清掃の作業時間と同じ）。時間で入れる行は入れた分のまま
// 見積もりの目安 ＝ 面積 × ㎡単価（清掃の見積もりと同じ目安）を場所ごとに足して、1円未満を四捨五入。歩掛りのない行は入れない

/** 場所の種類：清掃の作業時間の4つ・自分で入れる場所（1人1時間の面積も入れる）・時間で入れる行（補充の見回り・休けいなど） */
export const GENBA_KINDS = [
  ...SEISOU_WORKS.map((w) => ({ id: w.id, name: w.name, kind: w.kind, speed: w.speed, buai: w.buai })),
  { id: 'own', name: '場所', kind: '自分で入れる', speed: null, buai: null },
  { id: 'time', name: '見回り', kind: '時間で入れる', speed: null, buai: null },
];
export const GENBA_SITES_MAX = 10; // 保存する現場の数
export const GENBA_ROWS_MAX = 12; // 1つの現場の行の数
export const GENBA_NAME_MAX = 12; // 場所の名前・現場の名前の字数
export const GENBA_TOILET_PCT = '0.02'; // トイレの消毒液の濃度（％）

const kindOf = (id) => GENBA_KINDS.find((k) => k.id === id);

/** 「8:00」「08:00」を0時からの分に。読めないときは NaN、空は null */
export function hmToMin(s) {
  const t = String(s ?? '').trim();
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** 分を「8:49」に（24時をこえたら翌日の時刻のまま） */
export function minToHm(min) {
  const d = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, '0')}`;
}

/** 行の時間（分）。入れていないときは null、まちがいは NaN */
export function rowMinutes(row, people) {
  const k = kindOf(row.kind);
  if (!k) return NaN;
  if (k.id === 'time') {
    if (row.min === null || row.min === undefined) return null;
    return row.min > 0 ? Math.ceil(fix(row.min)) : NaN;
  }
  const speed = k.id === 'own' ? row.speed : k.speed;
  if (row.area === null || row.area === undefined) return null;
  if (Number.isNaN(row.area) || row.area <= 0) return NaN;
  if (speed === null || speed === undefined) return null;
  if (Number.isNaN(speed) || speed <= 0 || people === null || Number.isNaN(people) || people <= 0) return NaN;
  return Math.ceil(fix((row.area / (speed * people)) * 60));
}

/**
 * 時間割と計画書
 * @param {{rows:{kind:string,name:string,area?:number|null,speed?:number|null,min?:number|null}[], people:number|null, start:number|null, end:number|null}} p
 *   start・end は0時からの分（hmToMin）。おわりがはじめより前なら翌日として数える
 * 返す items：入れた行ごとに { i, name, kind, area, minutes, from, to }（from・to ははじめの時刻があるときだけ）
 */
export function genbaPlan({ rows, people, start, end }) {
  const needPeople = rows.some((r) => r.kind !== 'time' && r.area !== null && r.area !== undefined);
  if (needPeople && people !== null && (Number.isNaN(people) || people <= 0)) return { ok: false, error: '人数は、0より大きい数字で入れてください。', field: 'people' };
  if (Number.isNaN(start)) return { ok: false, error: 'はじめの時刻を入れなおしてください。', field: 'start' };
  if (Number.isNaN(end)) return { ok: false, error: 'おわりの時刻を入れなおしてください。', field: 'end' };
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const k = kindOf(r.kind);
    if (k && k.id === 'own' && r.speed !== null && r.speed !== undefined && (Number.isNaN(r.speed) || r.speed <= 0)) {
      return { ok: false, error: '1人1時間の面積は、0より大きい数字で入れてください。', field: 'row', row: i };
    }
    if (r.kind !== 'time' && r.area !== null && r.area !== undefined && people === null) continue; // 人数を待つ
    const m = rowMinutes(r, people);
    if (m === null) continue;
    if (Number.isNaN(m)) return { ok: false, error: r.kind === 'time' ? '時間は、0より大きい数字で入れてください。' : '面積は、0より大きい数字で入れてください。', field: 'row', row: i };
    items.push({ i, name: r.name, kind: r.kind, area: r.kind === 'time' ? null : r.area, minutes: m });
  }
  if (!items.length) return { ok: false, empty: true };
  const total = items.reduce((s, x) => s + x.minutes, 0);
  let t = start;
  if (start !== null) {
    items.forEach((x) => {
      x.from = t;
      t += x.minutes;
      x.to = t;
    });
  }
  let span = null;
  if (start !== null && end !== null) span = end > start ? end - start : end + 1440 - start;
  return {
    ok: true,
    items,
    total,
    finish: start === null ? null : start + total,
    span,
    free: span === null ? null : span - total, // マイナスは、おわりをこえる分
  };
}

/** 場所の種類ごとの㎡単価の目安（清掃の見積もりと同じ。wage：清掃員の単価、keihi：経費の率） */
export function genbaPrices(wage, keihi) {
  const out = {};
  for (const k of GENBA_KINDS) if (k.buai) out[k.id] = mitsuMeyasu(k.buai, wage, keihi).price;
  return out;
}

/**
 * 見積もりの目安：歩掛りのある場所の 面積 × ㎡単価 を足して1円未満を四捨五入。1か月 ＝ 1回 × 1年の回数 ÷ 12
 * skipped：見積もりに入れなかった行（時間で入れる行・自分で入れる場所）があるか
 */
export function genbaEstimate(rows, prices, year) {
  let sum = 0;
  let used = 0;
  let skipped = false;
  for (const r of rows) {
    const has = r.kind === 'time' ? r.min !== null && r.min !== undefined : r.area !== null && r.area !== undefined;
    if (!has) continue;
    if (!(r.kind in prices)) { skipped = true; continue; }
    if (Number.isNaN(r.area) || r.area <= 0) continue;
    sum += r.area * prices[r.kind];
    used++;
  }
  if (!used) return { ok: false, skipped };
  const once = Math.round(fix(sum));
  return { ok: true, once, month: Math.round(fix((once * year) / 12)), year, skipped };
}

/** トイレの消毒液：6％の次亜塩素酸ナトリウムを0.02％にするとき、水 waterL（L）に入れる原液（ml） */
export function genbaToiletMl(waterL) {
  if (waterL === null || Number.isNaN(waterL) || waterL <= 0) return null;
  return hyohakuAmount(GENBA_TOILET_PCT, waterL * 1000);
}

/** 計画書の時間の1行（「49分」「1時間33分」） */
export const genbaMin = (m) => minText(m);

/** はじめの現場（場所は事務室・廊下・トイレ。数字は入れない） */
export const genbaBlank = (n) => ({
  name: `現場${n}`,
  rows: ['office', 'hall', 'toilet'].map((id) => ({ kind: id, name: kindOf(id).name, area: '', speed: '', min: '' })),
  people: '',
  start: '',
  end: '',
  year: 260,
  water: '5',
  printed: 0,
  first: '',
});

const gbEsc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const gbNum = (id, label, unit, ph, value) =>
  `<span class="gb-cell"><label for="${id}">${label}</label><input id="${id}" class="gb-num" type="text" inputmode="decimal" autocomplete="off" enterkeyhint="next" maxlength="16" placeholder="${ph}" value="${gbEsc(value)}"><span class="unit">${unit}</span></span>`;

/** 場所の1行（ページの最初の HTML とブラウザの両方で使う）。名前・面積は入れた文字のまま（エスケープする） */
export function genbaRowHtml(row, i) {
  const k = kindOf(row.kind) || kindOf('own');
  const ph = { office: '600', hall: '300', toilet: '40', wash: '100', own: '200' }[k.id] || '30';
  const nums = k.id === 'time'
    ? gbNum(`mn-${i}`, '時間', '分', '30', row.min)
    : `${k.id === 'own' ? gbNum(`sp-${i}`, '1人1時間', '㎡', '100', row.speed) : ''}${gbNum(`ar-${i}`, '面積', '㎡', ph, row.area)}`;
  return `<div class="field gb-row${k.id === 'own' ? ' is-own' : ''}" id="f-row-${i}" data-i="${i}"><div class="input"><span class="gb-nm"><input id="nm-${i}" class="gb-name" type="text" inputmode="text" autocomplete="off" enterkeyhint="next" maxlength="${GENBA_NAME_MAX}" value="${gbEsc(row.name)}"><label for="nm-${i}">${k.kind}</label></span>${nums}<button type="button" class="gb-del" data-del="${i}" aria-label="この行を消す">×</button></div></div>`;
}

/** 場所の種類をえらぶ並び（「＋場所を足す」を押すと出る） */
export const genbaKindsHtml = () =>
  GENBA_KINDS.map((k) => `<button type="button" class="gb-kind" data-kind="${k.id}">${k.id === 'own' ? '自分で入れる' : k.id === 'time' ? '時間で入れる' : k.name}</button>`).join('');
