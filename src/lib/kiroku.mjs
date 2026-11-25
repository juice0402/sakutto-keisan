// お買い物マラソンの開催の記録（/point/kiroku/・#193）。終わった回の数え方と、表に出す数字。DOM は触らない
// ページ（src/pages/kiroku.mjs）と見張り（scripts/mihari.mjs の checkKiroku）の両方で使う
// start・end は日本時間の 'YYYY-MM-DDTHH:MM'（src/data/point.mjs の POINT_EVENTS）。end の時刻を過ぎたら「終わった回」

const msOf = (s) => Date.parse(`${/T\d\d:\d\d$/.test(s) ? `${s}:00` : s}+09:00`);

/** 終わった回だけ（データの順のまま） */
export const kirokuEnded = (events, nowMs) => events.filter((e) => msOf(e.end) < nowMs);

/** 終わった回の数と、そのうち上限が数字の回の数 */
export function kirokuCount(events, nowMs) {
  const ended = kirokuEnded(events, nowMs);
  return { ended: ended.length, withCap: ended.filter((e) => typeof e.cap === 'number').length };
}

/** 検索に出してよいだけ回がたまったか（終わった回6以上・上限が数字の回4以上。それまでは noindex） */
export const kirokuReady = (c) => c.ended >= 6 && c.withCap >= 4;

/** 期間の長さ。end の1:59 や 9:59 は、その分の終わりまでなので1分足す。{ hours, days, rest }（rest は日のあまりの時間） */
export function kirokuSpan(e) {
  const hours = Math.round((msOf(e.end) + 60000 - msOf(e.start)) / 3600000);
  return { hours, days: Math.floor(hours / 24), rest: hours % 24 };
}

// 日付の数字（年・月・日）
const ymd = (s) => [Number(s.slice(0, 4)), Number(s.slice(5, 7)), Number(s.slice(8, 10))];

/** 付与日が「終わった月の翌月15日」か */
export function grantIsNext15(e) {
  if (!e.grant) return null;
  const [y, m] = ymd(e.end);
  const [gy, gm, gd] = ymd(e.grant);
  return gd === 15 && gy * 12 + gm === y * 12 + m + 1;
}

/** 有効期限が「付与の翌月の末日」か */
export function expiresIsNextEnd(e) {
  if (!e.grant || !e.expires) return null;
  const [gy, gm] = ymd(e.grant);
  const [ey, em, ed] = ymd(e.expires);
  const last = new Date(Date.UTC(ey, em, 0)).getUTCDate();
  return ed === last && ey * 12 + em === gy * 12 + gm + 1;
}

/** 終わった回のまとめ：上限ごとの回の数（上限の順・わからない回は null の数）・いちばん長い回と短い回 */
export function kirokuStats(ended, caps) {
  const byCap = caps.map((cap) => ({ cap, n: ended.filter((e) => e.cap === cap).length }));
  const unknown = ended.filter((e) => typeof e.cap !== 'number').length;
  const spans = ended.map((e) => ({ e, ...kirokuSpan(e) }));
  const longest = spans.reduce((a, b) => (b.hours > a.hours ? b : a), spans[0] || null);
  const shortest = spans.reduce((a, b) => (b.hours < a.hours ? b : a), spans[0] || null);
  return { byCap, unknown, longest, shortest };
}
