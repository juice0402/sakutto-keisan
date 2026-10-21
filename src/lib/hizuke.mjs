// 日付の共通部品（日数の計算・年齢の計算。ブラウザとテストの両方で使う）
// 日付は 'YYYY-MM-DD'（入力欄 type="date" の値）。計算は1970年1月1日からの日数（時差やサマータイムに左右されない）
// 和暦の元号の始まりの日・干支の並びは下の表。明治5年までの旧暦はあつかわないので、1873年1月1日（新暦の始まり）から

export const HIZUKE_MIN = '1873-01-01';
export const HIZUKE_MAX = '2200-12-31';
export const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
export const ERAS = [
  { name: '令和', start: '2019-05-01' },
  { name: '平成', start: '1989-01-08' },
  { name: '昭和', start: '1926-12-25' },
  { name: '大正', start: '1912-07-30' },
  { name: '明治', start: '1868-10-23' },
];
export const ETO = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ETO_YOMI = ['ね', 'うし', 'とら', 'う', 'たつ', 'み', 'うま', 'ひつじ', 'さる', 'とり', 'いぬ', 'い'];

/** 'YYYY-MM-DD' → { y, m, d }。正しい日付でなければ null */
export function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return { y, m: mo, d };
}

/** 1970年1月1日からの日数 */
export const dayNum = ({ y, m, d }) => Date.UTC(y, m - 1, d) / 86400000;

/** 日数 → { y, m, d } */
export function dateOfDay(n) {
  const t = new Date(n * 86400000);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** { y, m, d } → 'YYYY-MM-DD' */
export const ymdValue = ({ y, m, d }) => `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** 曜日（日・月…） */
export const weekdayOf = (date) => WEEKDAYS[((dayNum(date) % 7) + 11) % 7];

/** 和暦（{ era:'令和', year:8, text:'令和8年' }。元年は「元年」） */
export function warekiOf(date) {
  const v = ymdValue(date);
  const era = ERAS.find((e) => v >= e.start);
  if (!era) return null;
  const year = date.y - Number(era.start.slice(0, 4)) + 1;
  return { era: era.name, year, text: `${era.name}${year === 1 ? '元' : year}年` };
}

/** 西暦の年の和暦（その年の終わりの元号。1989年は平成元年、2019年は令和元年）。前の元号も1年にまたがるときは both に */
export function warekiOfYear(y) {
  const end = warekiOf({ y, m: 12, d: 31 });
  const start = warekiOf({ y, m: 1, d: 1 });
  return { text: end.text, before: start && start.era !== end.era ? start.text : null };
}

/** 干支（その年の。1月・2月生まれも、その年の干支にする） */
export const etoOf = (y) => {
  const i = (((y - 4) % 12) + 12) % 12;
  return { kanji: ETO[i], yomi: ETO_YOMI[i], index: i };
};
