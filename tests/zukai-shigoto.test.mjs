// 図解の式と帯の図（#83）：家族の行事・お仕事・FX のページの図の数字が、計算例と同じになっているか
import test from 'node:test';
import assert from 'node:assert/strict';
import { Z_GYOJI } from '../src/pages/gyoji.mjs';
import { Z_ZANGYO } from '../src/pages/zangyo.mjs';
import { Z_YUKYU } from '../src/pages/yukyu-fuyo.mjs';
import { Z_RIEKI } from '../src/pages/rieki-ritsu.mjs';
import { Z_LOAN } from '../src/pages/loan.mjs';
import { Z_KAKE } from '../src/pages/kakeritsu.mjs';
import { Z_GENSEN } from '../src/pages/gensen-choshu.mjs';
import { Z_SEISOU } from '../src/pages/seisou-jikan.mjs';
import { Z_MITSU } from '../src/pages/seisou-mitsumori.mjs';
import { Z_FX } from '../src/pages/fx.mjs';

test('家族の行事の図：数え年と満年齢・100日目・四十九日', () => {
  const g = Z_GYOJI;
  assert.equal(g.shichi.man3 - g.shichi.born, 3);
  assert.equal(g.shichi.kazoe3 - g.shichi.born + 1, 3);
  assert.equal(g.yaku.hon - g.yaku.born + 1, 42);
  assert.deepEqual([g.yaku.mae, g.yaku.ato], [g.yaku.hon - 1, g.yaku.hon + 1]);
  assert.equal(g.choju.kanreki - g.choju.born, 60);
  assert.equal(g.choju.kokiKazoe - g.choju.born + 1, 70);
  const d100 = new Date(Date.UTC(g.okui.y, 0, 1 + 99)); // 1月1日を1日目に数えた100日目
  assert.deepEqual({ m: g.okui.m, d: g.okui.d }, { m: d100.getUTCMonth() + 1, d: d100.getUTCDate() });
  assert.deepEqual({ m: g.shiju.m, d: g.shiju.d }, { m: 11, d: 18 }); // 10月1日を1日目に数えた49日目
});

test('残業代の図：時給1,200円・10時間と、月給30万円', () => {
  assert.deepEqual(Z_ZANGYO, { unit: 1500, total: 15000, wage: 1837, hours: '163.3', gTotal: 45920 });
});

test('有給休暇の図：2026年4月1日入社・週5日', () => {
  assert.deepEqual(Z_YUKYU.date, { y: 2026, m: 10, d: 1 });
  assert.equal(Z_YUKYU.days, 10);
  assert.equal(Z_YUKYU.nextDays, 11);
});

test('お仕事の図：利益率・ローン・掛け率・源泉・清掃', () => {
  assert.deepEqual(Z_RIEKI, { price: 1429, profit: 429, rate: '30' });
  assert.deepEqual(Z_LOAN, { monthly: 84686, total: '3,557', interest: '557' });
  assert.deepEqual(Z_KAKE, { gedai: 1287, profit: 693 });
  assert.deepEqual(Z_GENSEN, { gensen: 10210, net: 99790, billed: 110000 });
  assert.deepEqual(Z_SEISOU, { minutes: 180, perPerson: 300 });
  assert.equal(Z_MITSU.once, Z_MITSU.price * 300);
  assert.equal(Z_MITSU.month, Math.round((Z_MITSU.once * 260) / 12));
  assert.ok(Z_MITSU.labor < Z_MITSU.price);
});

test('FXの図：維持率・ロスカット・スワップ・通貨の量', () => {
  assert.deepEqual(Z_FX, { ijiNeed: 40000, iji: 250, qty: '6,666', cutNeed: 60000, room: 40000, cutPrice: 146, swap: 123, lotQty: 10000, lotNeed: 60000 });
});
