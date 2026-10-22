// SPU のポイントの目安（楽天市場の公式のページの決まり。2026-10-23 確認）。ブラウザとテストの両方で使う。DOM は触らない
// 決まり：SPU は楽天市場の買い物の税抜の額にかかる（楽天カードの通常分だけ税込）。0.5倍は税抜200円で1ポイント、端数は切り捨て。上限はサービスごとに1か月
// 計算：税抜 ＝ 税込 × 10 ÷ 11（切り捨て）、ポイント ＝ 額 × 倍率 ÷ 100（切り捨て）を上限まで。実際は注文ごとに計算するので少しずれることがある（ページに「目安」と書く）
// 倍率は 0.5 きざみなので、10倍した整数で計算する（小数の誤差を出さない）
import { zeinukiOf } from './point.mjs';

export const SPU_TOTAL_MAX = 100000000; // 1億円まで

const tenth = (rate) => Math.round(rate * 10);
const spuFloor = (yen, rate) => Math.floor((yen * tenth(rate)) / 1000);

/** 倍率の部分（cap つき）が上限に届く買い物の額（税込）。上限がないときは null */
export function spuReach(rate, cap) {
  if (cap === null || cap === undefined) return null;
  const net = Math.ceil((cap * 1000) / tenth(rate)); // 税抜でこれだけあれば届く
  return Math.ceil((net * 11) / 10);
}

/** サービスの部分（楽天カードは通常分と特典分の2つ、ほかは1つ） */
export const spuParts = (item) => item.parts || [{ rate: item.rate, cap: item.cap }];

/** サービスの上限（上限のある部分）。上限がないサービスは null */
export const spuCapOf = (item) => spuParts(item).find((p) => p.cap !== null && p.cap !== undefined) || null;

/**
 * @param {{ total:number|null, picked:string[] }} p  total：その月の楽天市場の買い物（税込・送料のぞく）　picked：使っているサービスの id
 * @param {object[]} items  src/data/spu.mjs の SPU_ITEMS
 * @param {number} base  楽天会員の通常の倍率（1）
 */
export function spuPoints({ total, picked }, items, base = 1) {
  const chosen = items.filter((x) => picked.includes(x.id));
  const rate = (tenth(base) + chosen.reduce((s, x) => s + tenth(x.rate), 0)) / 10;
  if (total === null || total === undefined) return { ok: false, empty: true, missing: 'total', rate };
  if (Number.isNaN(total)) return { ok: false, error: '買い物の額は数字で入れてください。', field: 'total', rate };
  if (total <= 0) return { ok: false, error: '買い物の額は0より大きい数にしてください。', field: 'total', rate };
  if (total > SPU_TOTAL_MAX) return { ok: false, error: '買い物の額は1億円までにしてください。', field: 'total', rate };
  const net = zeinukiOf(total);
  const basePts = spuFloor(net, base);
  let lost = 0;
  const rows = chosen.map((x) => {
    let pts = 0;
    let full = false;
    for (const p of spuParts(x)) {
      const raw = spuFloor(p.taxIn ? Math.round(total) : net, p.rate);
      const has = p.cap !== null && p.cap !== undefined;
      const got = has ? Math.min(raw, p.cap) : raw;
      if (has && raw >= p.cap) full = true;
      lost += raw - got;
      pts += got;
    }
    const c = spuCapOf(x);
    return { id: x.id, name: x.name, rate: x.rate, pts, cap: c ? c.cap : null, reach: c ? spuReach(c.rate, c.cap) : null, full };
  });
  const points = basePts + rows.reduce((s, r) => s + r.pts, 0);
  // まだ上限に届いていないもので、いちばん早く届くもの
  const next = rows.filter((r) => r.reach && !r.full).sort((a, b) => a.reach - b.reach)[0] || null;
  return {
    ok: true,
    total,
    net,
    rate,
    base: basePts,
    rows,
    points,
    lost,
    full: rows.filter((r) => r.full),
    next,
    noCap: rows.filter((r) => r.cap === null), // 上限が公式で確かめられないもの（上限なしで計算している）
  };
}
