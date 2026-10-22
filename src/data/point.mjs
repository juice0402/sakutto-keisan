// お買い物マラソン・スーパーSALE の回ごとの数字（楽天市場の公式のページで確かめたものだけ。予想や、公開前の日程は入れない）
// 1回ごとに公式のURLと確かめた日（checked）がないと、テストで止まる（tests/point.test.mjs）
// start・end は日本時間。cap はショップ買いまわりの特典の上限（期間限定ポイント）。公式で確かめられないあいだは null（ページは上限のマスをえらんでもらう）
// 新しい回が公式に出たら、いちばん下に足す。終わった回は「前回」として残す（ページは end を過ぎたら見た人の画面で「終了」に切りかえる）

export const POINT_CAPS = [5000, 7000, 10000]; // 上限のマス（回によってこのどれか。楽天市場のガイドのページ）
export const POINT_MIN_YEN = 1000; // 1ショップの最低金額（税込）
export const POINT_MAX_SHOPS = 10; // 10ショップで10倍（通常1倍＋特典9倍）

const SCHEDULE = 'https://event.rakuten.co.jp/campaign/point-up/marathon/schedule/';

export const POINT_EVENTS = [
  { name: 'お買い物マラソン', start: '2026-10-04T20:00', end: '2026-10-09T01:59', cap: null, url: SCHEDULE, checked: '2026-10-22' },
  { name: 'お買い物マラソン', start: '2026-10-14T20:00', end: '2026-10-17T09:59', cap: null, url: SCHEDULE, checked: '2026-10-22' },
  { name: 'お買い物マラソン', start: '2026-10-24T20:00', end: '2026-10-27T09:59', cap: null, url: SCHEDULE, checked: '2026-10-22' },
];

// 計算の決まりの出典（ページの下に出す）
export const POINT_SOURCES = [
  { name: '楽天市場「お買い物マラソン ガイド＆買いまわりルール詳細」', url: 'https://event.rakuten.co.jp/campaign/point-up/marathon/guide/', checked: '2026-10-22', what: '1ショップの数え方・倍率・税抜・上限' },
  { name: '楽天市場「10月お買い物マラソンガイド」', url: SCHEDULE, checked: '2026-10-22', what: '10月の開催の期間' },
];
