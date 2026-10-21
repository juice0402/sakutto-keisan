import { fix } from './number.mjs';

// 時間の計算（ブラウザとテストの両方で使う）
// 行ごとの「◯時間◯分」を足して、合計を「◯時間◯分」と、小数の時間・分で出す
// 時間は小数でも入れられる（1.5時間＝1時間30分）。分は60をこえてもよい（90分＝1時間30分）。合計は1分未満を四捨五入

export const JIKAN_MAX_ROWS = 10;
export const JIKAN_MAX = 100000; // 1行の時間・分の上限

/**
 * @param {Array<{h:number|null, m:number|null}>} rows  h：時間　m：分
 * @returns minutes：合計の分　text：「12時間45分」　hours：小数の時間　used：入れた行の番号
 */
export function jikan(rows) {
  let total = 0;
  const used = [];
  for (let i = 0; i < rows.length; i++) {
    const { h, m } = rows[i];
    if (h === null && m === null) continue;
    for (const [v, k] of [[h, 'h'], [m, 'm']]) {
      if (v === null) continue;
      if (Number.isNaN(v) || v < 0) return { ok: false, error: '時間と分は、0以上の数字で入れてください。', field: `${k}-${i}` };
      if (v > JIKAN_MAX) return { ok: false, error: '時間や分が大きすぎます。', field: `${k}-${i}` };
    }
    total = fix(total + (h || 0) * 60 + (m || 0));
    used.push({ index: i, minutes: fix((h || 0) * 60 + (m || 0)) });
  }
  if (!used.length) return { ok: false, empty: true };
  const minutes = Math.round(total);
  return { ok: true, minutes, hours: fix(minutes / 60), text: jikanText(minutes), used };
}

/** 分を「◯時間◯分」に（24時間からは「◯日◯時間◯分」も days に） */
export function jikanText(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}分`;
  return m ? `${h.toLocaleString('ja-JP')}時間${m}分` : `${h.toLocaleString('ja-JP')}時間`;
}

/** 24時間からの言い方（1日3時間5分）。24時間より少なければ null */
export function jikanDays(minutes) {
  if (minutes < 1440) return null;
  const d = Math.floor(minutes / 1440);
  const rest = minutes % 1440;
  return `${d}日${rest ? jikanText(rest) : ''}`;
}
