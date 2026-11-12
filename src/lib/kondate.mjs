// 晩ごはんシミュレーター：1週間の組み方・1日の入れかえ・買うもの・端末に残すデータの読み書き（DOM と保存は触らない）
// ランダムは引数 rand（0以上1未満を返す関数）で受けとる。テストでは決まった値を渡す
import { KONDATE_ING, KONDATE_DISHES } from '../data/kondate.mjs';

export const KONDATE_KEY = 'sakutto-kondate'; // localStorage の名前（どこにも送らない）
export const KONDATE_KINDS = ['肉', '魚', '麺', '丼', 'カレー', '鍋', 'ほか'];
export const KONDATE_RULES = ['おまかせ', '肉', '魚', '麺', '丼', 'カレー', '鍋', '作らない']; // 曜日ごとの決まり
export const KONDATE_DOW = ['月', '火', '水', '木', '金', '土', '日'];
export const KONDATE_WEEKS_MAX = 52; // 残す週の数（古い週から消す）

export const KONDATE_ING_LIST = KONDATE_ING.flatMap((g) => g.items);
export const KONDATE_BY_ID = new Map(KONDATE_DISHES.map((x) => [x.id, x]));

const kondatePad = (n) => String(n).padStart(2, '0');

/** その日の週の月曜の日付 'YYYY-MM-DD'（ブラウザの日付で） */
export function kondateMonday(date) {
  const m = new Date(date.getFullYear(), date.getMonth(), date.getDate() - kondateDayIndex(date));
  return `${m.getFullYear()}-${kondatePad(m.getMonth() + 1)}-${kondatePad(m.getDate())}`;
}

/** 曜日の番号（月0〜日6） */
export const kondateDayIndex = (date) => (date.getDay() + 6) % 7;

/** 'YYYY-MM-DD' に n 日足した日付 */
export function kondateAddDays(key, n) {
  const [y, m, dd] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd + n));
  return `${t.getUTCFullYear()}-${kondatePad(t.getUTCMonth() + 1)}-${kondatePad(t.getUTCDate())}`;
}

/** 週の7日の日付（'11/9' の形） */
export const kondateWeekDates = (monday) =>
  Array.from({ length: 7 }, (_, i) => {
    const [, m, dd] = kondateAddDays(monday, i).split('-').map(Number);
    return `${m}/${dd}`;
  });

/** 作り直してよい最初の日（今週は今日の曜日、来週からは0、過ぎた週は7＝作り直さない） */
export function kondateFrom(monday, today) {
  const cur = kondateMonday(today);
  if (monday > cur) return 0;
  if (monday < cur) return 7;
  return kondateDayIndex(today);
}

/** その決まりの候補（苦手の食材を1つでも使う料理はのぞく） */
export function kondateCandidates(rule, ng = []) {
  if (rule === '作らない' || !KONDATE_RULES.includes(rule)) return [];
  const no = new Set(ng);
  return KONDATE_DISHES.filter((x) => (rule === 'おまかせ' || x.kind === rule) && !x.ings.some((i) => no.has(i)));
}

/** 候補から1品（冷蔵庫に丸のある食材を使うものがあれば、その中から） */
function kondatePick(list, fridge, rand) {
  const have = new Set(fridge);
  const pref = list.filter((x) => x.ings.some((i) => have.has(i)));
  const from = pref.length ? pref : list;
  const r = Number(rand());
  const k = Math.min(from.length - 1, Math.max(0, Math.floor((Number.isFinite(r) ? r : 0) * from.length)));
  return from[k];
}

const kondateEmptyWeek = () => ({ dishes: Array(7).fill(null), locked: Array(7).fill(false) });

/**
 * 1週間をつくる。from より前の日・とめた日はそのまま。同じ料理は1週間に1回まで（そのままの日の料理も数える）
 * @returns {{ dishes:(string|null)[], locked:boolean[], reasons:(string|null)[] }} reasons は空にした理由（作らない日は null）
 */
export function kondateMakeWeek({ routine, fridge = [], ng = [], week = null, from = 0, rand }) {
  const base = week || kondateEmptyWeek();
  const dishes = base.dishes.slice();
  const locked = base.locked.slice();
  const reasons = Array(7).fill(null);
  const keep = (i) => i < from || locked[i];
  const used = new Set(dishes.filter((id, i) => id && keep(i)));
  for (let i = 0; i < 7; i++) {
    if (keep(i)) continue;
    dishes[i] = null;
    const rule = routine[i];
    if (rule === '作らない') continue;
    const all = kondateCandidates(rule, ng);
    const list = all.filter((x) => !used.has(x.id));
    if (!list.length) {
      reasons[i] = all.length ? 'ほかの日と重ならない料理がありません' : '苦手が多くて合う料理がありません';
      continue;
    }
    const pick = kondatePick(list, fridge, rand);
    dishes[i] = pick.id;
    used.add(pick.id);
  }
  return { dishes, locked, reasons };
}

/**
 * 1日だけ入れかえ。同じ決まりのほかの候補（今の料理と、ほかの日の料理はのぞく）から選び直す
 * とめた日・from より前の日・ほかの候補がない日は変えない
 * @returns {{ dishes:(string|null)[], locked:boolean[], changed:boolean }}
 */
export function kondateSwap({ routine, fridge = [], ng = [], week, day, from = 0, rand }) {
  const dishes = week.dishes.slice();
  const locked = week.locked.slice();
  if (day < from || day > 6 || locked[day]) return { dishes, locked, changed: false };
  const used = new Set(dishes.filter(Boolean));
  const list = kondateCandidates(routine[day], ng).filter((x) => !used.has(x.id));
  if (!list.length) return { dishes, locked, changed: false };
  dishes[day] = kondatePick(list, fridge, rand).id;
  return { dishes, locked, changed: true };
}

/**
 * 買うもの：from の日から日曜までの料理の食材のうち、冷蔵庫に丸のないもの。先に使う日の順
 * @returns {{ ing:string, days:number[], label:string }[]} label は使う曜日（'火・木・日'）
 */
export function kondateShopping(dishes, fridge = [], from = 0) {
  const have = new Set(fridge);
  const map = new Map();
  for (let i = Math.max(0, from); i < 7; i++) {
    const x = KONDATE_BY_ID.get(dishes[i]);
    if (!x) continue;
    for (const ing of x.ings) {
      if (have.has(ing)) continue;
      if (!map.has(ing)) map.set(ing, []);
      const days = map.get(ing);
      if (days[days.length - 1] !== i) days.push(i);
    }
  }
  const order = (ing) => KONDATE_ING_LIST.indexOf(ing);
  return [...map]
    .sort((a, b) => a[1][0] - b[1][0] || order(a[0]) - order(b[0]))
    .map(([ing, days]) => ({ ing, days, label: days.map((i) => KONDATE_DOW[i]).join('・') }));
}

/** はじめのデータ（決まりは全部おまかせ、冷蔵庫と苦手は空） */
export const kondateInitial = () => ({ v: 1, routine: Array(7).fill('おまかせ'), fridge: [], ng: [], weeks: {} });

/** 古い週から消して KONDATE_WEEKS_MAX までにする */
export function kondateTrim(weeks) {
  const keys = Object.keys(weeks).sort().slice(-KONDATE_WEEKS_MAX);
  return Object.fromEntries(keys.map((k) => [k, weeks[k]]));
}

/** 残したデータを読む（こわれた JSON・古い形・知らない id でも止まらない） */
export function kondateParse(json) {
  const out = kondateInitial();
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    return out;
  }
  if (!data || typeof data !== 'object' || data.v !== 1) return out;
  if (Array.isArray(data.routine) && data.routine.length === 7) {
    out.routine = data.routine.map((r) => (KONDATE_RULES.includes(r) ? r : 'おまかせ'));
  }
  const ings = (a) => (Array.isArray(a) ? [...new Set(a.filter((i) => KONDATE_ING_LIST.includes(i)))] : []);
  out.fridge = ings(data.fridge);
  out.ng = ings(data.ng);
  const src = data.weeks && typeof data.weeks === 'object' && !Array.isArray(data.weeks) ? data.weeks : {};
  const weeks = {};
  for (const [k, w] of Object.entries(src)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !w || typeof w !== 'object') continue;
    const ds = Array.isArray(w.dishes) ? w.dishes : [];
    const ls = Array.isArray(w.locked) ? w.locked : [];
    weeks[k] = {
      dishes: Array.from({ length: 7 }, (_, i) => (KONDATE_BY_ID.has(ds[i]) ? ds[i] : null)),
      locked: Array.from({ length: 7 }, (_, i) => ls[i] === true),
    };
  }
  out.weeks = kondateTrim(weeks);
  return out;
}

/** 残す文字列（週は KONDATE_WEEKS_MAX まで） */
export const kondateStringify = (state) =>
  JSON.stringify({ v: 1, routine: state.routine, fridge: state.fridge, ng: state.ng, weeks: kondateTrim(state.weeks) });

/** 決まった乱数（ページの例・テスト用） */
export function kondateRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ページの本文の「例」に使う週（決まりと冷蔵庫と決まった乱数） */
export const KONDATE_EXAMPLE = {
  routine: ['肉', '魚', '麺', 'おまかせ', '丼', '作らない', 'カレー'],
  fridge: ['豚こま', 'キャベツ', '玉ねぎ', '卵'],
  ng: [],
  seed: 20261109,
};

export const kondateExampleWeek = () =>
  kondateMakeWeek({ ...KONDATE_EXAMPLE, rand: kondateRand(KONDATE_EXAMPLE.seed) });
