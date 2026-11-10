// ふるさと納税の寄付メモ：記録のまとめ（残り・自治体の数・申請書）と、控えの文（ブラウザとテストの両方で使う。DOM と保存は触らない）
// 記録はこの端末のブラウザの中だけに保存する（src/client/furusato-memo.js）。ここは計算だけ
import { ONESTOP_MAX } from './furusato-tetsuzuki.mjs';

export const MEMO_MAX_ROWS = 30; // 1年に記録できる寄付の数
export const MEMO_NAME_MAX = 20; // 自治体の名前の長さ

/** 自治体の名前をくらべる形に（全角・半角、空白のちがいは同じとみなす） */
export const memoCityKey = (name) => String(name || '').normalize('NFKC').replace(/\s+/g, '');

/**
 * 1年分の寄付のまとめ
 * @param {{ name:string, amount:number|null, sent:boolean }[]} rows  名前も金額も空の行は数えない
 * @param {number|null} limit 上限の目安（なければ null）
 */
export function memoSummary(rows, limit) {
  const used = rows.filter((r) => memoCityKey(r.name) || (r.amount !== null && r.amount !== undefined));
  const bad = used.findIndex((r) => r.amount !== null && r.amount !== undefined && !(Number.isFinite(r.amount) && r.amount >= 0));
  const total = used.reduce((s, r) => s + (Number.isFinite(r.amount) && r.amount > 0 ? r.amount : 0), 0);
  const keys = [...new Set(used.map((r) => memoCityKey(r.name)).filter(Boolean))];
  const unsent = used.filter((r) => !r.sent).length;
  const hasLimit = Number.isFinite(limit) && limit > 0;
  return {
    count: used.length,
    total,
    cities: keys.length,
    over: keys.length > ONESTOP_MAX, // ワンストップ特例が使えない
    unsent,
    bad, // 金額がまちがっている行（-1 ならなし）
    limit: hasLimit ? limit : null,
    left: hasLimit ? limit - total : null, // マイナスならこえている
  };
}

/** 控えの文（コピーして、メモアプリなどに残す） */
export function memoText(year, rows, sum) {
  const yen = (x) => `${Math.round(x).toLocaleString('ja-JP')}円`;
  const lines = [`ふるさと納税 ${year}年の寄付`];
  rows
    .filter((r) => memoCityKey(r.name) || Number.isFinite(r.amount))
    .forEach((r, i) => lines.push(`${i + 1}. ${String(r.name || '').trim() || '（名前なし）'} ${Number.isFinite(r.amount) ? yen(r.amount) : '—'} 申請書${r.sent ? '済' : '未'}`));
  lines.push(`合計 ${yen(sum.total)}・自治体 ${sum.cities}`);
  if (sum.limit !== null) lines.push(`上限の目安 ${yen(sum.limit)}・${sum.left >= 0 ? `のこり ${yen(sum.left)}` : `${yen(-sum.left)} こえています`}`);
  return lines.join('\n');
}

/** 保存した記録を読む（形がちがうものは捨てる）。{ years: { '2026': { limit, rows } } } */
export function memoParse(json) {
  let data;
  try {
    data = JSON.parse(json);
  } catch {
    return { years: {} };
  }
  const years = {};
  const src = data && typeof data === 'object' && data.years && typeof data.years === 'object' ? data.years : {};
  for (const [y, v] of Object.entries(src)) {
    if (!/^\d{4}$/.test(y) || !v || typeof v !== 'object') continue;
    const rows = (Array.isArray(v.rows) ? v.rows : [])
      .slice(0, MEMO_MAX_ROWS)
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        name: typeof r.name === 'string' ? r.name.slice(0, MEMO_NAME_MAX) : '',
        amount: Number.isFinite(r.amount) && r.amount >= 0 ? r.amount : null,
        sent: r.sent === true,
      }));
    years[y] = { limit: Number.isFinite(v.limit) && v.limit > 0 ? v.limit : null, rows };
  }
  return { years };
}

/** 日本時間の今日 { y, m, d }（見た人の端末の時計から。ビルドの日ではない） */
export function jstDate(now) {
  const j = new Date(now.getTime() + 9 * 3600e3);
  return { y: j.getUTCFullYear(), m: j.getUTCMonth() + 1, d: j.getUTCDate() };
}

/** その年の寄付メモの残り（円）。メモがない・上限がない・残りが0以下なら null */
export function memoLeftOf(store, year) {
  const v = store && store.years ? store.years[year] : null;
  if (!v || !v.limit) return null;
  const { left } = memoSummary(v.rows, v.limit);
  return left > 0 ? left : null;
}

/** 11月1日〜12月31日だけ、今年の寄付の締め切り（12月31日）まであと何日か。ほかの日は null */
export function nenmatsuDaysLeft({ y, m, d }) {
  if (m < 11) return null;
  return Math.round((Date.UTC(y, 11, 31) - Date.UTC(y, m - 1, d)) / 864e5);
}

/** 寄付メモから返礼品のページへ渡す # （サーバーには送られない） */
export const nokoriHash = (left) => `#nokori=${Math.floor(left)}`;

/** 返礼品のページで # を読む（#nokori=23000）。ちがう形なら null */
export function readNokori(hash) {
  const m = /^#nokori=(\d{1,9})$/.exec(String(hash || ''));
  const n = m ? Number(m[1]) : 0;
  return n > 0 ? n : null;
}
