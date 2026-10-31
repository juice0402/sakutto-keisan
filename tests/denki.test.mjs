import { test } from 'node:test';
import assert from 'node:assert/strict';
import { denki } from '../src/lib/denki.mjs';
import { DENKI_PRICE, DENKI_APPLIANCES, DENKI_USES } from '../src/data/denki.mjs';
import { fmt } from '../src/lib/number.mjs';

test('電気代：ページの計算例（単価31円・1か月30日）', () => {
  assert.equal(DENKI_PRICE.value, 31);
  const k = denki({ watt: 600, hours: 8, price: 31 });
  assert.deepEqual([k.hour, k.day, k.month, k.year, k.kwhMonth], [18.6, 148.8, 4464, 54312, 144]);
  const m = denki({ watt: 54, hours: 8, price: 31 });
  assert.equal(fmt(m.day, 1), '13.4');
  assert.equal(fmt(m.month, 0), '402');
  const h = denki({ watt: 1170, hours: 4, price: 31 });
  assert.equal(fmt(h.day, 0), '145');
  assert.equal(fmt(h.month, 0), '4,352');
  const d = denki({ watt: 1200, hours: 0.25, price: 31 });
  assert.deepEqual([d.hour, d.day, d.month], [37.2, 9.3, 279]);
  const t = denki({ watt: 150, hours: 4, price: 31 });
  assert.deepEqual([t.hour, t.day, t.month], [4.65, 18.6, 558]);
});

test('電気代：時間を入れる前は1時間だけ', () => {
  const r = denki({ watt: 600, hours: null, price: 31 });
  assert.equal(r.ok, true);
  assert.equal(r.hour, 18.6);
  assert.equal(r.month, null);
});

test('電気代：家電の表（1時間）と、マスは6つ', () => {
  const hour = (w) => fmt(denki({ watt: w, hours: 1, price: 31 }).hour, 1);
  assert.deepEqual(DENKI_APPLIANCES.map((a) => hour(a.watt)), ['18.6', '1.7', '22', '36.3', '37.2', '4.7', '46.5', '40.3', '43.4']);
  assert.equal(DENKI_APPLIANCES.filter((a) => a.tile).length, 6);
  assert.ok(DENKI_APPLIANCES.filter((a) => a.tile).every((a) => [...a.short].length <= 5));
});

test('電気代：まだ入れていない・まちがった入力', () => {
  assert.deepEqual(denki({ watt: null, hours: 8, price: 31 }), { ok: false, empty: true, missing: 'watt' });
  assert.deepEqual(denki({ watt: 600, hours: 8, price: null }), { ok: false, empty: true, missing: 'price' });
  assert.equal(denki({ watt: 0, hours: 8, price: 31 }).field, 'watt');
  assert.equal(denki({ watt: 30000, hours: 8, price: 31 }).field, 'watt');
  assert.equal(denki({ watt: 600, hours: 25, price: 31 }).field, 'hours');
  assert.equal(denki({ watt: 600, hours: NaN, price: 31 }).field, 'hours');
  assert.equal(denki({ watt: 600, hours: 8, price: 0 }).field, 'price');
  assert.equal(denki({ watt: 600, hours: 8, price: 500 }).field, 'price');
  assert.equal(denki({ watt: 600, hours: 0, price: 31 }).month, 0);
});

test('家電別の電気代：1時間の電気代がメーカーの表示と同じ（単価31円）', () => {
  const hour = (slug) => DENKI_USES.find((u) => u.slug === slug).modes.map((m) => fmt(denki({ watt: m.watt, hours: 1, price: 31 }).hour, 1));
  assert.deepEqual(hour('kotatsu'), ['5.6', '2.2', '18.6']); // 山善：強5.6円・弱2.2円
  assert.deepEqual(hour('denki-moufu'), ['1', '0.6', '1.7']); // パナソニック：強 約1.0円・目盛3 約0.6円
  assert.deepEqual(hour('hot-carpet'), ['14.6', '10.4', '22']); // パナソニック：高 約14.6円・中 約10.4円
  assert.deepEqual(hour('ceramic-heater'), ['36.3', '19.8']);
  assert.deepEqual(hour('oil-heater'), ['46.5', '27.9', '18.6']); // デロンギ：最大約47円・中約28円・弱約19円
});

test('家電別の電気代：表とよくある質問の1か月（1日の時間・30日）', () => {
  const month = (slug) => {
    const u = DENKI_USES.find((x) => x.slug === slug);
    return u.modes.map((m) => fmt(denki({ watt: m.watt, hours: u.hours, price: 31 }).month, 0));
  };
  assert.deepEqual(month('kotatsu'), ['1,339', '521', '4,464']);
  assert.deepEqual(month('denki-moufu'), ['238', '141', '402']);
  assert.deepEqual(month('hot-carpet'), ['3,504', '2,492', '5,282']);
  assert.deepEqual(month('ceramic-heater'), ['4,352', '2,381']);
  assert.deepEqual(month('oil-heater'), ['11,160', '6,696', '4,464']);
});

test('家電別の電気代の本文：しくみの例・メーカーの数字・使う場面の例・まちがえやすいところ・よくある質問（単価31円）', () => {
  const c = (watt, hours) => denki({ watt, hours, price: 31 });
  const r1 = (x) => Math.round(x * 10) / 10;
  const r0 = (x) => Math.round(x);
  // こたつ：山善 GKR-HDN802H（強180Wh・弱70Wh）と GKR-802H（強約160Wh・弱約80Wh）
  assert.equal(r1(c(70, 5).day), 10.9);
  assert.deepEqual([r1(c(180, 1).hour), r1(c(70, 1).hour), r1(c(160, 1).hour), r1(c(80, 1).hour)], [5.6, 2.2, 5, 2.5]);
  assert.deepEqual([r1(c(180, 6).day), r0(c(180, 6).month)], [33.5, 1004]);
  assert.deepEqual([r0(c(180, 8).month), r0(c(70, 8).month), r0(c(180, 8).month - c(70, 8).month)], [1339, 521, 818]);
  assert.deepEqual([r0(c(160, 8).month), r0(c(180, 8).month - c(160, 8).month)], [1190, 149]);
  assert.ok(c(600, 8).month > c(180, 8).month * 3); // 600Wで計算すると3倍をこえる
  assert.equal(r0(c(600, 8).month), 4464);
  assert.deepEqual([r0(c(180, 24).day), r0(c(70, 24).day)], [134, 52]); // つけっぱなし
  // 電気毛布：しき毛布 強約1.0円・目盛3約0.6円、かけしき毛布 強約1.7円・目盛3約1.0円（パナソニック）
  assert.equal(r1(0.6 * 6), 3.6);
  assert.equal(r1((1.0 * 40) / 60), 0.7); // 寝る40分前に強
  assert.equal(r0(0.6 * 8 * 120), 576); // 目盛3で120日
  assert.equal(r1(c(54, 4).day), 6.7); // ダニ対策（定格54W・4時間）
  assert.deepEqual([r1(c(54, 8).day), r1(1.0 * 8)], [13.4, 8]); // 定格54Wで出すと5円ほど高い
  assert.equal(Math.floor(c(54, 8).day - 8), 5);
  assert.deepEqual([r0(1.0 * 8 * 120), r0(1.7 * 8 * 120), r0((1.7 - 1.0) * 8 * 120)], [960, 1632, 672]);
  // ホットカーペット：1畳 高5.1円・中3.7円（120Wh）、2畳 高10.4円・中7.1円、3畳 高14.6円・中10.4円（パナソニック）
  assert.equal(r1(c(120, 1).hour), 3.7);
  assert.deepEqual([r1(5.1 - 3.7), r0((5.1 - 3.7) * 8 * 30)], [1.4, 336]);
  assert.equal(r0((10.4 - 7.1) * 8 * 30), 792);
  assert.equal(r1(10.4 * 2), 20.8);
  assert.equal(r0(c(710, 1).hour), 22); // 710Wで出すと中の2倍をこえる
  assert.ok(c(710, 1).hour > 10.4 * 2);
  assert.deepEqual([r1(10.4 / 2), r0((10.4 / 2) * 8 * 30)], [5.2, 1248]);
  // セラミックヒーター：DS-FS1200 強1,170W・弱640W（50Hz）、1,120W・615W（60Hz）、DS-FZS1200 ひとセンサーで936Wh
  assert.equal(r1(c(1170, 1).hour), 36.3);
  assert.equal(r1(c(640, 2).day), 39.7);
  assert.equal(r0(c(936, 1).hour), 29);
  assert.equal(r1(c(1170, 0.25).day), 9.1);
  assert.equal(r0(c(640, 3).month), 1786);
  assert.deepEqual([r0(c(936, 4).day), r0(c(1170, 4).day), r0(c(1170, 4).day - c(936, 4).day)], [116, 145, 29]);
  assert.equal(r1(c(470, 1).hour), 14.6);
  assert.ok(c(1170, 1).hour > c(470, 1).hour * 2);
  assert.deepEqual([r0(c(1170, 4).month), r0(c(1120, 4).month), r0(c(1170, 4).month - c(1120, 4).month)], [4352, 4166, 186]);
  assert.equal(r0(c(1170, 8).day), 290);
  assert.equal(Math.round((1 - 936 / 1170) * 10), 2); // 約2割少ない
  // オイルヒーター：デロンギ 1500Wタイプ 最大約47円・中約28円・弱約19円、1200Wタイプ 約37円・約22円・約16円
  assert.equal(r1(c(600, 3).day), 55.8);
  assert.equal(22 * 8 * 30, 5280);
  assert.deepEqual([r0(c(1500, 5).day), r0(c(1500, 8).day)], [233, 372]);
  assert.equal(r0(c(900, 1.5).day), 42);
  assert.deepEqual([47 - 37, (47 - 37) * 8], [10, 80]);
  assert.equal(r0(c(1500, 24).day), 1116);
});
